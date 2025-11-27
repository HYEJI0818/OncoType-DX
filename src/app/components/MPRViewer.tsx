'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from '@/contexts/EnhancedTranslationContext';
// NiiVue는 동적으로 로드하여 SSR 문제 방지
// import { Niivue, SHOW_RENDER } from '@niivue/niivue';

// 🎚️ 슬라이더 CSS 스타일 (Brain3DView와 동일)
const sliderStyle = `
  .mpr-slice-slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ffffff;
    border: 2px solid #3b82f6;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  
  .mpr-slice-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ffffff;
    border: 2px solid #3b82f6;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
`;

// NiiVue 타입 정의 (동적 로딩용)
interface NiiVueVolume {
  id: string;
  opacity: number;
  colormapInvert?: boolean;
  cal_min?: number;
  cal_max?: number;
  global_min?: number;
  global_max?: number;
  dims?: number[];
  [key: string]: unknown;
}

interface NiiVueScene {
  crosshairPos?: number[] | unknown;
  volScaleMultiplier?: number;
  [key: string]: unknown;
}

interface NiiVueOpts {
  show3Dcrosshair: boolean;
  crosshairColor: number[];
  crosshairWidth: number;
  crosshairGap: number;
  multiplanarShowRender: number;
  isOrientCube: boolean;
  multiplanarForceRender: boolean;
  isSliceMM: boolean;
  isColorbar: boolean;
  [key: string]: unknown;
}

interface NiiVueInstance {
  volumes: NiiVueVolume[];
  scene?: NiiVueScene;
  opts: NiiVueOpts;
  attachToCanvas: (canvas: HTMLCanvasElement) => Promise<void>;
  colormaps: () => string[];
  loadVolumes: (volumes: unknown[]) => Promise<void>;
  loadFromFile: (file: File) => Promise<void>;
  setSliceType: (type: number) => void;
  setColormap: (id: string, colormap: string) => void;
  setGamma: (gamma: number) => void;
  setSliceMM: (enabled: boolean) => void;
  updateGLVolume: () => void;
  drawScene: () => void;
  setRenderAzimuthElevation: (azimuth: number, elevation: number) => void;
  setClipPlane: (planes: unknown[]) => void;
  setLayout?: (layout: number) => void; // 레이아웃 설정 함수 추가
  [key: string]: unknown;
}

interface NiftiHeader {
  dims: number[];
  pixDims: number[];
  affine?: number[][];
  [key: string]: unknown;
}

interface MPRViewerProps {
  imageUrl?: string;
  niftiHeader?: NiftiHeader;
  niftiImage?: ArrayBuffer;
  originalNiftiUrl?: string;
  overlayNiftiUrl?: string; // segmentation 오버레이 파일 URL
  tumorOverlayUrl?: string | null; // tumor 오버레이 파일 URL 추가
  patientId?: number; // 환자 ID 추가
  // slice 제거 - MPR 뷰어가 독립적으로 관리
  onClose?: () => void;
}

export default function MPRViewer({ 
  niftiHeader, 
  niftiImage, 
  originalNiftiUrl, 
  overlayNiftiUrl,
  tumorOverlayUrl: initialTumorOverlayUrl,
  patientId,
  onClose 
}: MPRViewerProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nvRef = useRef<NiiVueInstance | null>(null);
  
  // 각 뷰어 인스턴스를 고유하게 식별하기 위한 ID
  const viewerId = useRef(`mpr-${Math.random().toString(36).substr(2, 9)}`).current; // Niivue 타입을 동적으로 처리
  
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableColormaps, setAvailableColormaps] = useState<string[]>([]);
  const [currentColormap, setCurrentColormap] = useState('gray');
  const [isColormapInverted, setIsColormapInverted] = useState(false);
  const [gamma, setGamma] = useState(1.0);
  // const [isColorbarVisible, setIsColorbarVisible] = useState(true);
  const [isWorkingMode, setIsWorkingMode] = useState(false); // 작업중 모드 상태
  const [workingSlicePos, setWorkingSlicePos] = useState(0.5); // 작업중 모드 슬라이스 위치
  
  // 슬라이스 평면 모드 상태
  const [slicePlaneMode, setSlicePlaneMode] = useState<'orthogonal' | 'oblique'>('orthogonal'); // 직교 vs 자유 단면
  // const [activeSlicePlane, setActiveSlicePlane] = useState<'axial' | 'coronal' | 'sagittal'>('axial'); // 활성 단면
  // const [isSlicePlaneVisible, setIsSlicePlaneVisible] = useState(true); // 슬라이스 평면 표시 여부
  
  
  // 오버레이 관련 상태
  const [hasOverlay, setHasOverlay] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);
  const [overlayColormap, setOverlayColormap] = useState('red');
  
  // 종양 자동 슬라이스 이동 관련 상태
  const [tumorSliceData, setTumorSliceData] = useState<{
    axial: number[] | null;
    coronal: number[] | null;
    sagittal: number[] | null;
  }>({ axial: null, coronal: null, sagittal: null });
  const [bestTumorSlices, setBestTumorSlices] = useState<{
    axial: number | null;
    coronal: number | null;
    sagittal: number | null;
  }>({ axial: null, coronal: null, sagittal: null });
  
  // Segmentation 파일 관련 상태 (Brain3DView와 동일)
  const [segmentationFiles, setSegmentationFiles] = useState<Array<{id: number, file_name: string, file_path: string, public_url?: string}>>([]);
  const [selectedSegFile, setSelectedSegFile] = useState<string | null>(null);
  const [showSegSelector, setShowSegSelector] = useState(false);

  // TUMOR 파일 업로드 관련 상태 (NIfTISliceViewer와 동일) - 초기값으로 전달받은 값 사용
  const [tumorOverlayUrl, setTumorOverlayUrl] = useState<string | null>(initialTumorOverlayUrl || null);

  
  // 작업중 모드 3패널용 refs
  // const workingAxialCanvasRef = useRef<HTMLCanvasElement>(null);
  const workingCoronalCanvasRef = useRef<HTMLCanvasElement>(null);
  // const workingSagittalCanvasRef = useRef<HTMLCanvasElement>(null);
  // const workingAxialNvRef = useRef<any | null>(null);
  const workingCoronalNvRef = useRef<NiiVueInstance | null>(null); // Niivue 타입을 동적으로 처리
  // const workingSagittalNvRef = useRef<any | null>(null);
  
  // 그리기 도구 상태
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingTool, setDrawingTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [drawingColor, setDrawingColor] = useState<'red' | 'yellow' | 'green' | 'blue'>('red');
  const [currentSliceType, setCurrentSliceType] = useState<number | null>(null);
  const [eraserSize, setEraserSize] = useState(15); // 지우개 크기 (5-50)
  const [penSize, setPenSize] = useState(3); // 펜 크기 (1-10)
  const [highlighterSize, setHighlighterSize] = useState(12); // 형광펜 크기 (5-25)
  const [highlighterOpacity, setHighlighterOpacity] = useState(0.1); // 형광펜 투명도 (0.1-1.0) - 10% 초기값
  
  // 🎚️ Axial/Coronal/Sagittal 슬라이스 위치 상태 (메인 뷰어처럼)
  const [axialSlicePos, setAxialSlicePos] = useState(0.5); // Axial 슬라이스 위치 (0-1)
  const [coronalSlicePos, setCoronalSlicePos] = useState(0.5); // Coronal 슬라이스 위치 (0-1)  
  const [sagittalSlicePos, setSagittalSlicePos] = useState(0.5); // Sagittal 슬라이스 위치 (0-1)
  const [isSliderDragging, setIsSliderDragging] = useState(false); // 슬라이더 드래그 상태
  
  // Overlay Canvas 관련 상태
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{x: number, y: number} | null>(null);
  
  // 저장 상태
  const [isSaving, setIsSaving] = useState(false);

  // MPRViewer용 종양 데이터 분석 함수 (모든 평면 동시 분석, 개선된 버전)
  const analyzeTumorDataMPR = async (nv: NiiVueInstance, overlayVolume: { hdr?: unknown; img?: unknown; header?: unknown; data?: unknown; dims?: unknown } | null) => {
    try {
      console.log('🔍 MPRViewer 종양 데이터 분석 시작 (개선된 버전)...');
      
      if (!overlayVolume) {
        console.log('❌ 오버레이 볼륨이 없습니다.');
        return;
      }

      // 다양한 볼륨 데이터 구조 지원
      let header, imageData;
      
      if (overlayVolume.hdr && overlayVolume.img) {
        header = overlayVolume.hdr;
        imageData = overlayVolume.img;
      } else if (overlayVolume.header && overlayVolume.data) {
        header = overlayVolume.header;
        imageData = overlayVolume.data;
      } else if (overlayVolume.dims && overlayVolume.data) {
        header = { dims: overlayVolume.dims };
        imageData = overlayVolume.data;
      } else {
        console.log('❌ 지원되지 않는 볼륨 데이터 구조:', Object.keys(overlayVolume));
        return;
      }

      if (!header || !imageData) {
        console.log('❌ 헤더 또는 이미지 데이터가 없습니다.');
        return;
      }

      console.log('MPR 볼륨 데이터 구조:', {
        headerKeys: Object.keys(header as any),
        imageDataType: typeof imageData,
        imageDataLength: (imageData as any).length || (imageData as any).byteLength,
        dims: (header as any).dims
      });

      // 볼륨 차원 정보 - 다양한 형식 지원
      let dims = (header as any).dims;
      if (!dims && (header as any).dimensions) {
        dims = (header as any).dimensions;
      }
      if (!dims) {
        console.log('❌ 볼륨 차원 정보를 찾을 수 없습니다.');
        return;
      }

      // 차원 정보 정규화
      let nx, ny, nz;
      if (dims.length === 3) {
        [nx, ny, nz] = dims;
      } else if (dims.length === 4) {
        [, nx, ny, nz] = dims; // 첫 번째 차원 무시
      } else if (dims.length > 4) {
        // 마지막 3개 차원 사용
        nx = dims[dims.length - 3];
        ny = dims[dims.length - 2];
        nz = dims[dims.length - 1];
      } else {
        console.log('❌ 지원되지 않는 차원 구조:', dims);
        return;
      }
      
      console.log('MPR 정규화된 볼륨 차원:', { nx, ny, nz, totalVoxels: nx * ny * nz });

      // 이미지 데이터 타입 확인 및 변환
      let pixelArray;
      if (imageData instanceof ArrayBuffer) {
        pixelArray = new Float32Array(imageData);
      } else if (imageData instanceof Uint8Array || imageData instanceof Uint16Array || imageData instanceof Float32Array) {
        pixelArray = imageData;
      } else if (Array.isArray(imageData)) {
        pixelArray = imageData;
      } else {
        console.log('❌ 지원되지 않는 이미지 데이터 타입:', typeof imageData);
        return;
      }

      console.log('MPR 픽셀 배열 정보:', {
        type: pixelArray.constructor.name,
        length: pixelArray.length,
        expectedLength: nx * ny * nz
      });

      // 각 평면별로 분석
      const planes = [
        { name: 'axial', sliceCount: nz, getIndex: (slice: number, x: number, y: number) => slice * nx * ny + y * nx + x },
        { name: 'coronal', sliceCount: ny, getIndex: (slice: number, x: number, z: number) => z * nx * ny + slice * nx + x },
        { name: 'sagittal', sliceCount: nx, getIndex: (slice: number, y: number, z: number) => z * nx * ny + y * nx + slice }
      ];

      const newTumorSliceData: {
        axial: number[] | null;
        coronal: number[] | null;
        sagittal: number[] | null;
      } = { axial: null, coronal: null, sagittal: null };
      const newBestTumorSlices: {
        axial: number | null;
        coronal: number | null;
        sagittal: number | null;
      } = { axial: null, coronal: null, sagittal: null };

      for (const plane of planes) {
        console.log(`${plane.name} 평면에서 ${plane.sliceCount}개 슬라이스 분석 중...`);

        const sliceTumorCounts: number[] = [];
        let totalTumorPixels = 0;
        
        for (let slice = 0; slice < plane.sliceCount; slice++) {
          let tumorPixels = 0;
          
          // 해당 슬라이스의 모든 픽셀 검사
          const maxI = plane.name === 'sagittal' ? ny : nx;
          const maxJ = plane.name === 'axial' ? ny : nz;
          
          for (let i = 0; i < maxI; i++) {
            for (let j = 0; j < maxJ; j++) {
              const pixelIndex = plane.getIndex(slice, i, j);
              
              // 배열 범위 확인 및 종양 픽셀 검사
              if (pixelIndex >= 0 && pixelIndex < pixelArray.length) {
                const pixelValue = pixelArray[pixelIndex];
                // 다양한 임계값으로 종양 픽셀 검사
                if (pixelValue && !isNaN(pixelValue) && pixelValue > 0.1) {
                  tumorPixels++;
                  totalTumorPixels++;
                }
              }
            }
          }
          
          sliceTumorCounts.push(tumorPixels);
        }

        console.log(`${plane.name} 슬라이스별 종양 픽셀 수:`, sliceTumorCounts);
        console.log(`${plane.name} 총 종양 픽셀 수:`, totalTumorPixels);

        // 종양이 전혀 없는 경우 더 관대한 임계값으로 재시도
        if (totalTumorPixels === 0) {
          console.log(`⚠️ ${plane.name} 평면에서 종양 픽셀이 발견되지 않았습니다. 다른 임계값으로 재시도...`);
          
          for (let slice = 0; slice < plane.sliceCount; slice++) {
            let tumorPixels = 0;
            
            const maxI = plane.name === 'sagittal' ? ny : nx;
            const maxJ = plane.name === 'axial' ? ny : nz;
            
            for (let i = 0; i < maxI; i++) {
              for (let j = 0; j < maxJ; j++) {
                const pixelIndex = plane.getIndex(slice, i, j);
                
                if (pixelIndex >= 0 && pixelIndex < pixelArray.length) {
                  const pixelValue = pixelArray[pixelIndex];
                  // 더 관대한 임계값 (0보다 큰 모든 값)
                  if (pixelValue && !isNaN(pixelValue) && pixelValue > 0) {
                    tumorPixels++;
                  }
                }
              }
            }
            
            sliceTumorCounts[slice] = tumorPixels;
          }
          
          console.log(`${plane.name} 재시도 후 슬라이스별 종양 픽셀 수:`, sliceTumorCounts);
        }

        // 가장 많은 종양 픽셀을 가진 슬라이스 찾기
        const maxTumorPixels = Math.max(...sliceTumorCounts);
        const bestSlice = sliceTumorCounts.indexOf(maxTumorPixels);
        
        console.log(`✅ ${plane.name} 최적 슬라이스: ${bestSlice} (종양 픽셀: ${maxTumorPixels}개)`);

        (newTumorSliceData as any)[plane.name] = sliceTumorCounts;
        (newBestTumorSlices as any)[plane.name] = bestSlice;

        // 자동으로 최적 슬라이스로 이동 (종양이 있는 경우에만)
        if (maxTumorPixels > 0 && nv && nv.scene) {
          console.log(`🎯 ${plane.name} 슬라이스 ${bestSlice}로 자동 이동...`);
          
          // 슬라이스 위치를 0-1 범위로 정규화
          const normalizedPosition = bestSlice / Math.max(1, plane.sliceCount - 1);
          
          // NiiVue의 슬라이스 위치 설정
          if (nv.scene.crosshairPos && Array.isArray(nv.scene.crosshairPos)) {
            const newPos = [...nv.scene.crosshairPos];
            
            switch (plane.name) {
              case 'axial':
                newPos[2] = normalizedPosition; // Z축
                setAxialSlicePos(normalizedPosition);
                break;
              case 'coronal':
                newPos[1] = normalizedPosition; // Y축
                setCoronalSlicePos(normalizedPosition);
                break;
              case 'sagittal':
                newPos[0] = normalizedPosition; // X축
                setSagittalSlicePos(normalizedPosition);
                break;
            }
            
            nv.scene.crosshairPos = newPos;
          }
        } else if (maxTumorPixels === 0) {
          console.log(`⚠️ ${plane.name} 평면에서 종양이 발견되지 않아 자동 이동하지 않습니다.`);
        }
      }

      // 상태 업데이트
      setTumorSliceData(newTumorSliceData);
      setBestTumorSlices(newBestTumorSlices);

      // 화면 업데이트
      nv.updateGLVolume();
      console.log('✅ MPRViewer 종양 분석 및 자동 이동 완료');

    } catch (error) {
      console.error('❌ MPRViewer 종양 데이터 분석 실패:', error);
      console.error('스택 트레이스:', (error as Error).stack);
    }
  };


  // NiiVue 초기화 - 배포 환경 최적화
  useEffect(() => {
    // 배포 환경에서 안전한 초기화
    const initializeNiiVue = async () => {
      if (typeof window === 'undefined' || !canvasRef.current) {
        console.log('⚠️ 브라우저 환경이 아니거나 캔버스가 없음');
        return;
      }

      try {
        console.log('🚀 NiiVue 초기화 시작 (배포 환경 최적화)');
        
        // 강화된 WebGL 컨텍스트 초기화 및 vec4 오류 방지
        const canvas = canvasRef.current!;
        
        // WebGL 컨텍스트 생성 및 검증
        const gl = canvas.getContext('webgl2', { 
          preserveDrawingBuffer: true,
          antialias: true,
          alpha: false
        }) || canvas.getContext('webgl', {
          preserveDrawingBuffer: true,
          antialias: true,
          alpha: false
        });
        
        if (!gl) {
          throw new Error('WebGL을 지원하지 않는 브라우저입니다.');
        }
        
        // WebGL 확장 기능 강제 로드 (vec4 오류 방지)
        const extensions = [
          'OES_texture_float',
          'OES_texture_float_linear',
          'WEBGL_color_buffer_float',
          'EXT_color_buffer_float'
        ];
        
        extensions.forEach(ext => {
          try {
            gl.getExtension(ext);
          } catch (e) {
            console.warn(`WebGL 확장 ${ext} 로드 실패:`, e);
          }
        });
        
        // 짧은 지연으로 WebGL 컨텍스트 안정화
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 동적 import로 NiiVue 로드 (배포 환경에서 안전)
        const niivueModule = await import('@niivue/niivue');
        const { Niivue, SHOW_RENDER } = niivueModule;
        
        // vec4 오류 방지를 위한 안전한 NiiVue 인스턴스 생성
        const nv = new Niivue({
          // 🎯 Brain3DView와 완전 동일한 설정으로 최대 부드러움 구현
          show3Dcrosshair: false, // 3D 크로스헤어 비활성화 (순수 3D 뷰)
          sliceType: 4, // 3D 모드
          multiplanarShowRender: 0, // 슬라이스 완전 비활성화 (순수 3D)
          
          // vec4 오류 방지를 위한 추가 설정
          loadingText: '', // 로딩 텍스트 비활성화
          isNearestInterpolation: false, // 부드러운 보간
          meshThicknessOn2D: 0, // 메시 두께 최소화
          
          // 기본 설정
          logLevel: 'error',
          backColor: [0, 0, 0, 1],
          isColorbar: false,
          isRuler: false, // 🎯 Brain3DView와 동일 - 룰러 비활성화
          isOrientCube: true, // 방향 큐브 표시
          
          // 🚀 초부드러운 3D 모드 설정 (십자선 완전 제거)
          dragMode: 1, // 3D 회전/확대축소 모드
          isSliceMM: false, // 슬라이스 평면 비표시
          multiplanarForceRender: false, // 강제 렌더링 비활성화
          crosshairWidth: 0, // 십자선 두께 0
          crosshairColor: [0, 0, 0, 0], // 십자선 완전 투명
          
          // 🎯 고성능 3D 렌더링 최적화
          isAntiAlias: true, // 안티앨리어싱으로 부드러운 렌더링
          dragAndDropEnabled: false, // 드래그앤드롭 비활성화로 성능 향상
          fontSizeScaling: 0.8, // 폰트 크기 최적화
          
          // 전체 뇌가 보이도록 초기 설정
          isResizeCanvas: true,
          
          // 🚀 극한의 부드러움을 위한 고급 성능 최적화
          
          // 🎯 렌더링 성능 극대화
          drawingEnabled: false, // 드로잉 완전 비활성화
          multiplanarPadPixels: 0, // 패딩 최소화
          multiplanarLayout: 0, // 기본 레이아웃
          
          // 🎮 마우스 반응성 극대화
          
          // 🔥 GPU 가속 최적화
        });
        nvRef.current = nv as unknown as NiiVueInstance;
        
        // 캔버스 연결 전 추가 안전 검사
        if (canvasRef.current && canvasRef.current.parentElement) {
          await nv.attachToCanvas(canvasRef.current);
          
          // WebGL 컨텍스트 안정성 확인
          if (!nv.gl || nv.gl.isContextLost()) {
            throw new Error('WebGL 컨텍스트가 손실되었습니다.');
          }
        } else {
          console.warn('⚠️ MPR 뷰어 캔버스가 DOM에 연결되지 않음');
          return;
        }
        
        // Overlay Canvas 방식 사용으로 NiiVue 드로잉 컬러맵 설정 불필요
        console.log('✅ Overlay Canvas 드로잉 방식 사용');
        
        // 컬러맵 목록 가져오기 - 배포 환경에서 안전하게
        try {
          const colormaps = nv.colormaps();
          setAvailableColormaps(colormaps);
          console.log('✅ 컬러맵 로드 완료:', colormaps.length, '개');
        } catch (e) {
          console.warn('⚠️ 컬러맵 로드 실패 (무시):', e);
          setAvailableColormaps(['gray', 'red', 'blue']); // 기본값
        }
        
        console.log('🎉 NiiVue 초기화 완료 (배포 환경)');
        
        // 초기화 완료 후 데이터 로드 시도 - 배포 환경 안정화
        setTimeout(() => {
          if (originalNiftiUrl) {
            console.log('📂 초기화 후 originalNiftiUrl 로드 시도:', originalNiftiUrl);
            loadFromOriginalUrl();
          } else if (niftiImage && niftiHeader) {
            console.log('📂 초기화 후 기존 데이터 로드 시도');
            loadExistingNiftiData();
          }
        }, 200); // 500ms에서 200ms로 단축 - 더 빠른 로딩
        
      } catch (error) {
        console.error('❌ NiiVue 초기화 실패:', error);
        // 배포 환경에서 실패해도 앱이 중단되지 않도록
      }
    };

    // 초기화 실행
    initializeNiiVue();

    return () => {
      // 모든 Niivue 인스턴스 정리
      cleanupNiivueInstances();
      nvRef.current = null;
    };
  }, []);


  // 원본 NIfTI URL이 있을 때 자동 로드
  useEffect(() => {
    const loadData = async () => {
      if (originalNiftiUrl && nvRef.current) {
        await loadFromOriginalUrl();
      } else if (niftiImage && niftiHeader && nvRef.current) {
        await loadExistingNiftiData();
      }
    };
    loadData();
  }, [originalNiftiUrl, niftiImage, niftiHeader]);

  // 오버레이 URL이 변경될 때 오버레이 로드
  useEffect(() => {
    if (overlayNiftiUrl && nvRef.current && nvRef.current.volumes.length > 0) {
      loadOverlay();
    }
  }, [overlayNiftiUrl]);

  // 환자 ID가 변경될 때 segmentation 파일 목록 가져오기
  useEffect(() => {
    if (patientId) {
      fetchSegmentationFiles(patientId);
    }
  }, [patientId]);

  // 초기 오버레이 URL이 있으면 자동으로 선택된 상태로 설정
  useEffect(() => {
    if (overlayNiftiUrl && !selectedSegFile) {
      setSelectedSegFile(overlayNiftiUrl);
    }
  }, [overlayNiftiUrl, segmentationFiles]);

  // 선택된 segmentation 파일이 변경될 때 오버레이 로드
  useEffect(() => {
    if (selectedSegFile && nvRef.current && nvRef.current.volumes.length > 0) {
      loadSegmentationOverlay(selectedSegFile);
    } else if (!selectedSegFile && hasOverlay) {
      removeOverlay();
    }
    
  }, [selectedSegFile]);

  // Segmentation 파일 목록 가져오기
  const fetchSegmentationFiles = async (patientId: number) => {
    try {
      // Next.js API Routes 사용 (상대 경로)
      const response = await fetch(`/api/users/${patientId}/files`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // CORS 및 네트워크 오류 방지
        mode: 'cors',
        cache: 'no-cache',
      });
      
      if (response.ok) {
        const files = await response.json();
        
        // seg.nii 또는 seg.nii.gz 파일만 필터링
        const segFiles = files.filter((file: { file_name: string }) => 
          file.file_name.includes('seg.nii') || 
          file.file_name.includes('segmentation')
        );
        
        setSegmentationFiles(segFiles);
        console.log('✅ MPRViewer Segmentation 파일 목록 로드 성공:', segFiles);
      } else {
        console.warn('⚠️ Segmentation 파일 목록 응답 오류:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ MPRViewer Segmentation 파일 목록 가져오기 실패 (네트워크 오류 무시):', error);
      // 네트워크 오류는 무시하고 계속 진행
      setSegmentationFiles([]);
    }
  };

  // Segmentation 오버레이 로딩 함수
  const loadSegmentationOverlay = async (segUrl: string) => {
    if (!nvRef.current || !originalNiftiUrl) return;
    
    try {
      console.log('MPRViewer 오버레이 로딩 시작:', segUrl);
      
      // 기본 뇌 이미지와 segmentation을 함께 로드
      const volumeList = [
        { 
          url: originalNiftiUrl,
          name: 'brain.nii',
          colormap: 'gray'
        },
        {
          url: segUrl,
          name: 'segmentation.nii',
          colormap: overlayColormap
        }
      ];
      
      await nvRef.current.loadVolumes(volumeList);
      
      // 볼륨 설정
      if (nvRef.current.volumes.length >= 2) {
        // 기본 뇌 이미지 설정
        const brain = nvRef.current.volumes[0];
        brain.opacity = 1.0;
        nvRef.current.setColormap(brain.id, 'gray');
        
        // 오버레이 설정
        const overlay = nvRef.current.volumes[1];
        overlay.opacity = overlayOpacity;
        nvRef.current.setColormap(overlay.id, overlayColormap);
        
        // segmentation 파일의 특성에 맞게 설정
        overlay.cal_min = 0.5; // 0은 배경이므로 0.5부터 표시
        overlay.cal_max = 4.0;  // 일반적인 segmentation 최대값
        
        nvRef.current.updateGLVolume();
        setHasOverlay(true);
        
        console.log('MPRViewer 오버레이 로딩 성공 - 뇌:', brain, '오버레이:', overlay);
        
        // 🎯 종양 데이터 분석 및 자동 슬라이스 이동
        console.log('🔍 MPRViewer 종양 분석 시작...');
        await analyzeTumorDataMPR(nvRef.current, overlay);
      }
      
      
      // 현재 뷰 모드 유지 (3D로 강제 전환하지 않음)
      nvRef.current.setSliceType(currentSliceType || 0);
      
      safeDrawScene(nvRef.current);
      
    } catch (error) {
      console.error('MPRViewer 오버레이 로딩 실패:', error);
      setHasOverlay(false);
    }
  };

  const loadFromOriginalUrl = async () => {
    console.log('🔄 MPRViewer loadFromOriginalUrl 시작');
    console.log('📋 nvRef.current:', !!nvRef.current);
    console.log('📋 originalNiftiUrl:', originalNiftiUrl);
    
    if (!nvRef.current || !originalNiftiUrl) {
      console.warn('⚠️ MPRViewer: nvRef 또는 originalNiftiUrl이 없음');
      return;
    }
    
    try {
      console.log('🚀 MPRViewer: 로딩 시작');
      setIsLoading(true);
      
      // 캔버스 크기 확인 및 설정
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          canvasRef.current.width = rect.width;
          canvasRef.current.height = rect.height;
        }
      }
      
      const volumeList = [{ 
        url: originalNiftiUrl,
        name: 'brain.nii',
        colormap: 'gray'
      }];
      
      // 초기 오버레이 URL이 있으면 함께 로드
      if (overlayNiftiUrl) {
        volumeList.push({
          url: overlayNiftiUrl,
          name: 'segmentation.nii',
          colormap: overlayColormap
        });
      }
      
      await nvRef.current.loadVolumes(volumeList);
      
      // 볼륨이 실제로 로드되었는지 확인
      if (nvRef.current.volumes && nvRef.current.volumes.length > 0) {
        nvRef.current.setSliceType(4); // 3D 뷰로 시작
        
        // 🎚️ 슬라이스 위치 초기화 - 데이터 로드 시
        if (nvRef.current.scene && nvRef.current.scene.crosshairPos) {
          const crosshairPos = nvRef.current.scene.crosshairPos as number[];
          setAxialSlicePos(crosshairPos[2] || 0.5);
          setCoronalSlicePos(crosshairPos[1] || 0.5);
          setSagittalSlicePos(crosshairPos[0] || 0.5);
        } else {
          setAxialSlicePos(0.5);
          setCoronalSlicePos(0.5);
          setSagittalSlicePos(0.5);
        }
        
        // 컬러맵 설정
        nvRef.current.setColormap(nvRef.current.volumes[0].id, currentColormap);
        
        // 3D 모드 초기 설정 - 십자선 완전 제거 (처음부터)
        nvRef.current.opts.show3Dcrosshair = false; // 십자선 완전 비활성화
        nvRef.current.opts.multiplanarShowRender = 0; // 슬라이스 완전 비활성화
        nvRef.current.opts.isOrientCube = true; // 방향 큐브는 유지
        nvRef.current.opts.dragMode = 1; // 3D 회전/확대축소 활성화
        
        // 3D 렌더링을 위한 볼륨 설정
        const volume = nvRef.current.volumes[0];
        volume.opacity = 0.8; // 3D에서 내부 구조가 보이도록 약간 투명하게
        
        // 3D 렌더링을 위한 볼륨 범위 최적화
        if (volume.cal_min !== undefined && volume.cal_max !== undefined) {
          const range = volume.cal_max - volume.cal_min;
          volume.cal_min = volume.cal_min + range * 0.1; // 하위 10% 제거
          volume.cal_max = volume.cal_max - range * 0.1; // 상위 10% 제거
        }
        
        nvRef.current.updateGLVolume();
      }
      
      safeDrawScene(nvRef.current);
      
      const dummyFile = new File([new ArrayBuffer(0)], 'brain.nii', { type: 'application/octet-stream' });
      setFile(dummyFile);
      
      console.log('✅ MPR 뷰어: 원본 NIfTI URL 로드 성공:', originalNiftiUrl);
      console.log('📊 로드된 볼륨 수:', nvRef.current.volumes?.length || 0);
      
      
    } catch (error) {
      console.error('❌ MPR 뷰어: 원본 NIfTI URL 로드 실패:', error instanceof Error ? error.message : String(error));
      if (niftiImage && niftiHeader) {
        loadExistingNiftiData();
      }
    } finally {
      console.log('🏁 MPRViewer: 로딩 완료, isLoading = false');
      setIsLoading(false);
      
      // 🔥 초기 tumor 오버레이가 있으면 로드 (원본 뇌 로드 완료 후)
      if (initialTumorOverlayUrl && nvRef.current && nvRef.current.volumes && nvRef.current.volumes.length > 0) {
        console.log('🔥 MPRViewer: 원본 뇌 로드 완료 후 초기 tumor 오버레이 로드 시작');
        setTimeout(() => {
          loadTumorOverlay(initialTumorOverlayUrl);
        }, 500); // 짧은 지연으로 안정성 확보
      }
    }
  };

  const loadExistingNiftiData = async () => {
    if (!nvRef.current || !niftiImage || !niftiHeader) return;
    
    try {
      setIsLoading(true);
      
      // 캔버스 크기 확인 및 설정
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          canvasRef.current.width = rect.width;
          canvasRef.current.height = rect.height;
        }
      }
      
      const blob = new Blob([niftiImage], { type: 'application/octet-stream' });
      const file = new File([blob], 'brain.nii', { type: 'application/octet-stream' });
      
      await nvRef.current.loadFromFile(file);
      
      // 볼륨이 실제로 로드되었는지 확인
      if (nvRef.current.volumes && nvRef.current.volumes.length > 0) {
        nvRef.current.setSliceType(4); // 3D 뷰로 시작
        
        // 🎚️ 슬라이스 위치 초기화 - 기존 데이터 로드 시
        if (nvRef.current.scene && nvRef.current.scene.crosshairPos) {
          const crosshairPos = nvRef.current.scene.crosshairPos as number[];
          setAxialSlicePos(crosshairPos[2] || 0.5);
          setCoronalSlicePos(crosshairPos[1] || 0.5);
          setSagittalSlicePos(crosshairPos[0] || 0.5);
        } else {
          setAxialSlicePos(0.5);
          setCoronalSlicePos(0.5);
          setSagittalSlicePos(0.5);
        }
        
        // 컬러맵 설정
        nvRef.current.setColormap(nvRef.current.volumes[0].id, currentColormap);
        
        // 3D 모드 초기 설정 - 십자선 완전 제거 (처음부터)
        nvRef.current.opts.show3Dcrosshair = false; // 십자선 완전 비활성화
        nvRef.current.opts.multiplanarShowRender = 0; // 슬라이스 완전 비활성화
        nvRef.current.opts.isOrientCube = true; // 방향 큐브는 유지
        nvRef.current.opts.dragMode = 1; // 3D 회전/확대축소 활성화
        
        // 3D 렌더링을 위한 볼륨 설정
        const volume = nvRef.current.volumes[0];
        volume.opacity = 0.8; // 3D에서 내부 구조가 보이도록 약간 투명하게
        
        // 3D 렌더링을 위한 볼륨 범위 최적화
        if (volume.cal_min !== undefined && volume.cal_max !== undefined) {
          const range = volume.cal_max - volume.cal_min;
          volume.cal_min = volume.cal_min + range * 0.1; // 하위 10% 제거
          volume.cal_max = volume.cal_max - range * 0.1; // 상위 10% 제거
        }
        
        nvRef.current.updateGLVolume();
      }
      
      safeDrawScene(nvRef.current);
      setFile(file);
      
    } catch (error) {
      console.warn('MPR 뷰어: 기존 NIfTI 데이터 로드 실패:', error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  // 오버레이 로딩 함수
  const loadOverlay = async () => {
    if (!nvRef.current || !overlayNiftiUrl) return;
    
    try {
      console.log('오버레이 로딩 시작:', overlayNiftiUrl);
      
      // 기존 오버레이가 있으면 제거 (첫 번째 볼륨은 기본 이미지이므로 보존)
      if (nvRef.current.volumes.length > 1) {
        // 두 번째 볼륨부터 제거
        nvRef.current.volumes = nvRef.current.volumes.slice(0, 1);
      }
      
      // 오버레이 볼륨 추가 - loadVolumes 사용
      const overlayVolumeList = [{
        url: overlayNiftiUrl,
        name: 'segmentation.nii',
        colormap: overlayColormap
      }];
      
      await nvRef.current.loadVolumes(overlayVolumeList);
      
      // 오버레이 볼륨이 로드되었는지 확인
      if (nvRef.current.volumes.length > 1) {
        const overlay = nvRef.current.volumes[1];
        
        // 오버레이 설정
        overlay.opacity = overlayOpacity;
        nvRef.current.setColormap(overlay.id, overlayColormap);
        
        // segmentation 파일의 특성에 맞게 설정
        overlay.cal_min = 0.5; // 0은 배경이므로 0.5부터 표시
        overlay.cal_max = 4.0;  // 일반적인 segmentation 최대값
        
        nvRef.current.updateGLVolume();
        setHasOverlay(true);
        
        console.log('오버레이 로딩 성공:', overlay);
      }
      
      safeDrawScene(nvRef.current);
      
    } catch (error) {
      console.error('오버레이 로딩 실패:', error);
      setHasOverlay(false);
    }
  };

  // 오버레이 제거 함수
  const removeOverlay = () => {
    if (nvRef.current && nvRef.current.volumes.length > 1) {
      // 첫 번째 볼륨(기본 이미지)만 남기고 제거
      nvRef.current.volumes = nvRef.current.volumes.slice(0, 1);
      nvRef.current.updateGLVolume();
      safeDrawScene(nvRef.current);
      setHasOverlay(false);
      console.log('오버레이 제거 완료');
    }
  };

  // 🎚️ 슬라이스 위치 업데이트 함수 - 각 뷰 모드별 독립적 작동
  const updateSlicePosition = (sliceType: number, position: number) => {
    if (!nvRef.current || !nvRef.current.scene) {
      console.warn('🎚️ nvRef 또는 scene이 없어서 슬라이스 위치 업데이트 불가');
      return;
    }
    
    // 🔒 현재 뷰 모드와 일치하는 슬라이스만 업데이트 (독립적 작동)
    if (currentSliceType !== sliceType) {
      console.log(`🔒 독립 모드: ${sliceType === 0 ? 'Axial' : sliceType === 1 ? 'Coronal' : 'Sagittal'} 슬라이스 위치만 상태 업데이트 (십자선 영향 없음)`);
      
      // 상태만 업데이트하고 십자선은 건드리지 않음
      if (sliceType === 0) { // Axial
        setAxialSlicePos(position);
      } else if (sliceType === 1) { // Coronal
        setCoronalSlicePos(position);
      } else if (sliceType === 2) { // Sagittal
        setSagittalSlicePos(position);
      }
      
      // 현재 뷰만 다시 그리기 (십자선 위치는 변경하지 않음)
      safeDrawScene(nvRef.current);
      return;
    }
    
    // crosshairPos가 없으면 초기화
    if (!nvRef.current.scene.crosshairPos) {
      nvRef.current.scene.crosshairPos = [0.5, 0.5, 0.5];
    }
    
    const crosshairPos = nvRef.current.scene.crosshairPos as number[];
    
    // 🎚️ 현재 활성 뷰 모드에서만 십자선 위치 업데이트
    if (sliceType === 0) { // Axial (Z축)
      crosshairPos[2] = position;
      setAxialSlicePos(position);
    } else if (sliceType === 1) { // Coronal (Y축)
      crosshairPos[1] = position;
      setCoronalSlicePos(position);
    } else if (sliceType === 2) { // Sagittal (X축)
      crosshairPos[0] = position;
      setSagittalSlicePos(position);
    }
    
    nvRef.current.scene.crosshairPos = crosshairPos;
        safeDrawScene(nvRef.current);
    
    console.log(`🎚️ 독립 모드: ${sliceType === 0 ? 'Axial' : sliceType === 1 ? 'Coronal' : 'Sagittal'} 슬라이스 위치: ${(position * 100).toFixed(1)}%`);
  };

  // 컬러맵 변경
  const handleColormapChange = (colormap: string) => {
    if (nvRef.current && nvRef.current.volumes.length > 0) {
      setCurrentColormap(colormap);
      nvRef.current.setColormap(nvRef.current.volumes[0].id, colormap);
      // 내장 컬러바 비활성화 유지
      nvRef.current.opts.isColorbar = false;
      safeDrawScene(nvRef.current);
    }
  };

  // 컬러맵 반전
  const toggleColormapInvert = () => {
    if (nvRef.current && nvRef.current.volumes.length > 0) {
      const volume = nvRef.current.volumes[0];
      volume.colormapInvert = !volume.colormapInvert;
      setIsColormapInverted(volume.colormapInvert);
      // 내장 컬러바 비활성화 유지
      nvRef.current.opts.isColorbar = false;
      nvRef.current.updateGLVolume();
      safeDrawScene(nvRef.current);
    }
  };

  // 감마 조정
  const handleGammaChange = (newGamma: number) => {
    if (nvRef.current) {
      setGamma(newGamma);
      nvRef.current.setGamma(newGamma);
      // 내장 컬러바 숨기고 우리 컬러바만 사용
      nvRef.current.opts.isColorbar = false;
      safeDrawScene(nvRef.current);
    }
  };

  // 컬러바 토글 (우리 컬러바는 항상 표시, NiiVue 내장 컬러바만 토글)
  // const toggleColorbar = () => {
  //   if (nvRef.current) {
  //     nvRef.current.opts.isColorbar = !nvRef.current.opts.isColorbar;
  //     setIsColorbarVisible(nvRef.current.opts.isColorbar);
  //     nvRef.current.drawScene();
  //   }
  // };

  // 감마 값에 따른 컬러바 그라데이션 생성
  const getGammaCorrectedGradient = (colormap: string, gamma: number, inverted: boolean = false) => {
    const applyGamma = (value: number) => Math.pow(value, 1 / gamma);
    
    let baseGradient = '';
    
    switch (colormap) {
      case 'gray':
        const grayStops = [];
        for (let i = 0; i <= 10; i++) {
          const normalizedValue = i / 10;
          const gammaCorrected = applyGamma(normalizedValue);
          const grayValue = Math.round(gammaCorrected * 255);
          const position = inverted ? (100 - i * 10) : (i * 10);
          grayStops.push(`rgb(${grayValue}, ${grayValue}, ${grayValue}) ${position}%`);
        }
        baseGradient = `linear-gradient(to right, ${grayStops.join(', ')})`;
        break;
        
      case 'hot':
        const hotStops = [];
        for (let i = 0; i <= 10; i++) {
          const normalizedValue = i / 10;
          const gammaCorrected = applyGamma(normalizedValue);
          let r, g, b;
          
          if (gammaCorrected < 0.33) {
            r = Math.round(gammaCorrected * 3 * 255);
            g = 0;
            b = 0;
          } else if (gammaCorrected < 0.66) {
            r = 255;
            g = Math.round((gammaCorrected - 0.33) * 3 * 255);
            b = 0;
          } else {
            r = 255;
            g = 255;
            b = Math.round((gammaCorrected - 0.66) * 3 * 255);
          }
          
          const position = inverted ? (100 - i * 10) : (i * 10);
          hotStops.push(`rgb(${r}, ${g}, ${b}) ${position}%`);
        }
        baseGradient = `linear-gradient(to right, ${hotStops.join(', ')})`;
        break;
        
      case 'cool':
        const coolStops = [];
        for (let i = 0; i <= 10; i++) {
          const normalizedValue = i / 10;
          const gammaCorrected = applyGamma(normalizedValue);
          const r = Math.round((1 - gammaCorrected) * 255);
          const g = Math.round(gammaCorrected * 255);
          const b = 255;
          const position = inverted ? (100 - i * 10) : (i * 10);
          coolStops.push(`rgb(${r}, ${g}, ${b}) ${position}%`);
        }
        baseGradient = `linear-gradient(to right, ${coolStops.join(', ')})`;
        break;
        
      case 'jet':
        const jetStops = [];
        for (let i = 0; i <= 10; i++) {
          const normalizedValue = i / 10;
          const gammaCorrected = applyGamma(normalizedValue);
          let r, g, b;
          
          if (gammaCorrected < 0.125) {
            r = 0;
            g = 0;
            b = Math.round(0.5 + gammaCorrected * 4) * 255;
          } else if (gammaCorrected < 0.375) {
            r = 0;
            g = Math.round((gammaCorrected - 0.125) * 4 * 255);
            b = 255;
          } else if (gammaCorrected < 0.625) {
            r = Math.round((gammaCorrected - 0.375) * 4 * 255);
            g = 255;
            b = Math.round((0.625 - gammaCorrected) * 4 * 255);
          } else if (gammaCorrected < 0.875) {
            r = 255;
            g = Math.round((0.875 - gammaCorrected) * 4 * 255);
            b = 0;
          } else {
            r = Math.round((1.125 - gammaCorrected) * 4 * 255);
            g = 0;
            b = 0;
          }
          
          const position = inverted ? (100 - i * 10) : (i * 10);
          jetStops.push(`rgb(${r}, ${g}, ${b}) ${position}%`);
        }
        baseGradient = `linear-gradient(to right, ${jetStops.join(', ')})`;
        break;
        
      default:
        // 기본값은 gray
        baseGradient = inverted 
          ? 'linear-gradient(to right, #ffffff, #000000)'
          : 'linear-gradient(to right, #000000, #ffffff)';
    }
    
    return baseGradient;
  };

  // 오버레이 투명도 조절
  const handleOverlayOpacityChange = (newOpacity: number) => {
    setOverlayOpacity(newOpacity);
    if (nvRef.current && nvRef.current.volumes.length > 1) {
      nvRef.current.volumes[1].opacity = newOpacity;
      nvRef.current.updateGLVolume();
      safeDrawScene(nvRef.current);
    }
  };

  // 오버레이 컬러맵 변경
  const handleOverlayColormapChange = (colormap: string) => {
    setOverlayColormap(colormap);
    if (nvRef.current && nvRef.current.volumes.length > 1) {
      nvRef.current.setColormap(nvRef.current.volumes[1].id, colormap);
      safeDrawScene(nvRef.current);
    }
  };

  // 메인 뷰어 완전 재초기화 함수 (현재 미사용)
  /*
  const reinitializeMainViewer = async () => {
    if (!canvasRef.current) return false;
    
    try {
      console.log('메인 뷰어 완전 재초기화 시작...');
      
      // 기존 인스턴스 완전 제거
      nvRef.current = null;
      
      // 새로운 Niivue 인스턴스 생성 (동적 로딩)
      const niivueModule = await import('@niivue/niivue');
      const { Niivue } = niivueModule;
      
      const nv = new Niivue({
        show3Dcrosshair: true,
        backColor: [0, 0, 0, 1],
        crosshairColor: [1.0, 0.0, 0.0, 1.0], // 빨간색 RGBA
        crosshairWidth: 2, // 배포 환경에서 더 두껍게
        crosshairGap: 2,
        isColorbar: false,
        multiplanarShowRender: 0, // 기본값은 슬라이스만
      });
      
      nvRef.current = nv as unknown as NiiVueInstance;
      
      // 캔버스 연결 전 추가 안전 검사
      if (canvasRef.current && canvasRef.current.parentElement) {
        await nv.attachToCanvas(canvasRef.current);
        
        // WebGL 컨텍스트 안정성 확인
        if (!nv.gl || nv.gl.isContextLost()) {
          throw new Error('WebGL 컨텍스트가 손실되었습니다.');
        }
      } else {
        console.warn('⚠️ MPR 뷰어 (재초기화) 캔버스가 DOM에 연결되지 않음');
        return;
      }
      
      // 기존 데이터 다시 로드
      if (originalNiftiUrl) {
        await loadFromOriginalUrl();
      } else if (niftiImage && niftiHeader) {
        await loadExistingNiftiData();
      }
      
      console.log('메인 뷰어 재초기화 완료');
      return true;
    } catch (error) {
      console.error('메인 뷰어 재초기화 실패:', error);
      return false;
    }
  };
  */

  // Niivue 인스턴스 정리 함수 (메인 뷰어는 건드리지 않음)
  const cleanupNiivueInstances = () => {
    // 작업중 모드 뷰어만 정리 (메인 뷰어는 보존)
    if (workingCoronalNvRef.current) {
      try {
        // Niivue 인스턴스 정리 - 볼륨 제거 및 캔버스 분리
        if (workingCoronalNvRef.current.volumes) {
          workingCoronalNvRef.current.volumes = [];
        }
        // 캔버스에서 이벤트 리스너 제거를 위해 새로운 인스턴스로 교체
        workingCoronalNvRef.current = null;
        console.log('🧹 작업중 모드 뷰어 정리 완료');
      } catch (e) {
        console.warn('Coronal viewer cleanup warning:', e);
        workingCoronalNvRef.current = null;
      }
    }
  };

  // 안전한 drawScene 호출 헬퍼 함수
  const safeDrawScene = (nvInstance?: NiiVueInstance | null, context?: string) => {
    try {
      const nv = nvInstance || nvRef.current;
      if (nv && nv.volumes && nv.volumes.length > 0) {
        nv.drawScene();
      } else {
        console.warn(`⚠️ drawScene 건너뜀 - NiiVue 상태 불완전 ${context ? `(${context})` : ''}`);
      }
    } catch (error) {
      console.warn(`⚠️ drawScene 오류 ${context ? `(${context})` : ''}:`, error);
    }
  };

  // Overlay Canvas 크기 동기화 (정확한 버전)
  const syncOverlayCanvasSize = () => {
    if (!overlayCanvasRef.current || !canvasRef.current) return;
    
    const mainCanvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    
    // 정확한 크기 가져오기
    const rect = mainCanvas.getBoundingClientRect();
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Canvas 내부 해상도 설정 (고해상도 디스플레이 대응)
    overlayCanvas.width = rect.width * devicePixelRatio;
    overlayCanvas.height = rect.height * devicePixelRatio;
    
    // CSS 크기 설정
    overlayCanvas.style.width = `${rect.width}px`;
    overlayCanvas.style.height = `${rect.height}px`;
    
    // Canvas context 스케일 조정
    const ctx = overlayCanvas.getContext('2d');
    if (ctx) {
      ctx.scale(devicePixelRatio, devicePixelRatio);
    }
    
    console.log('🔄 강제 Canvas 크기 동기화:', {
      width: rect.width,
      height: rect.height,
      devicePixelRatio
    });
  };

  // 그리기 도구 활성화/비활성화 (Overlay Canvas 방식)
  const toggleDrawingMode = () => {
    const newDrawingMode = !isDrawingMode;
    setIsDrawingMode(newDrawingMode);
    
    if (newDrawingMode) {
      // 그리기 모드 활성화 시 강제로 Canvas 크기 동기화
      setTimeout(() => {
        syncOverlayCanvasSize();
      }, 100);
      console.log('✏️ Overlay Canvas 그리기 모드 활성화:', drawingTool, drawingColor);
    } else {
      console.log('✏️ 그리기 모드 비활성화');
    }
  };

  // 그리기 도구 변경 (Overlay Canvas 방식)
  const changeDrawingTool = (tool: 'pen' | 'highlighter' | 'eraser') => {
    setDrawingTool(tool);
    console.log('🎨 그리기 도구 변경:', tool);
  };

  // 그리기 색상 변경 (Overlay Canvas 방식)
  const changeDrawingColor = (color: 'red' | 'yellow' | 'green' | 'blue') => {
    setDrawingColor(color);
    console.log('🎨 그리기 색상 변경:', color);
  };

  // 그리기 지우기 (Overlay Canvas 방식)
  const clearDrawing = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!overlayCanvasRef.current) return;
    
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      console.log('🧹 Overlay Canvas 그리기 모두 지우기 완료');
    }
  };


  // 📷 화면 직접 캡처 (html2canvas 사용)
  const captureScreenDirectly = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    console.log('=== 화면 직접 캡처 시작 ===');
    
    if (!patientId) {
      alert('환자 ID가 없습니다.');
      return;
    }
    
    try {
      setIsSaving(true);
      
      // html2canvas 동적 import
      const html2canvas = (await import('html2canvas')).default;
      
      // 🎯 WebGL 캔버스 직접 찾기 및 캡처
      const webglCanvases = [...document.querySelectorAll('canvas')];
      console.log('📷 발견된 캔버스들:', webglCanvases.length);
      
      let capturedCanvas: HTMLCanvasElement | null = null;
      
      // 방법 1: NiiVue 캔버스에서 직접 캡처 시도
      if (nvRef.current?.canvas) {
        console.log('🎯 방법 1: NiiVue 캔버스 직접 캡처');
        const niivueCanvas = nvRef.current.canvas as HTMLCanvasElement;
        
        // NiiVue 강제 렌더링
        for (let i = 0; i < 3; i++) {
          await new Promise(resolve => requestAnimationFrame(resolve));
          safeDrawScene(nvRef.current);
        }
        
        // 캔버스 내용 확인
        const testDataURL = niivueCanvas.toDataURL('image/png', 1.0);
        if (testDataURL.length > 1000) {
          capturedCanvas = niivueCanvas;
          console.log('✅ NiiVue 캔버스에서 직접 캡처 성공');
        } else {
          console.log('⚠️ NiiVue 캔버스가 비어있음');
        }
      }
      
      // 방법 2: 모든 WebGL 캔버스 검사
      if (!capturedCanvas) {
        console.log('🎯 방법 2: 모든 WebGL 캔버스 검사');
        for (const canvas of webglCanvases) {
          const webglCanvas = canvas as HTMLCanvasElement;
          try {
            const testDataURL = webglCanvas.toDataURL('image/png', 1.0);
            if (testDataURL.length > 1000) {
              capturedCanvas = webglCanvas;
              console.log('✅ WebGL 캔버스 발견:', webglCanvas);
              break;
            }
          } catch (e) {
            console.log('⚠️ 캔버스 접근 실패:', e);
          }
        }
      }
      
      // 방법 3: html2canvas 백업 (WebGL 제외하고 UI만)
      let canvas: HTMLCanvasElement;
      if (capturedCanvas) {
        console.log('🎨 WebGL 캔버스 복사 시작');
        canvas = document.createElement('canvas');
        canvas.width = capturedCanvas.width;
        canvas.height = capturedCanvas.height;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(capturedCanvas, 0, 0);
        }
      } else {
        console.log('🎯 방법 3: html2canvas 백업 (UI 캡처)');
        const viewerContainer = document.querySelector('[data-testid="mpr-viewer"]') || 
                              document.body;
        
        canvas = await html2canvas(viewerContainer as HTMLElement, {
          backgroundColor: '#000000',
          scale: 1,
          logging: false,
          useCORS: true,
          allowTaint: true,
          foreignObjectRendering: true,
          ignoreElements: (element) => {
            return element.tagName === 'BUTTON';
          }
        });
      }
      
      console.log('✅ html2canvas 캡처 완료:', {
        width: canvas.width,
        height: canvas.height
      });
      
      // 드로잉 오버레이 추가
      if (overlayCanvasRef.current) {
        const overlayCanvas = overlayCanvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (ctx && overlayCanvas.width > 0 && overlayCanvas.height > 0) {
          // 오버레이 캔버스를 메인 캔버스 위에 그리기
          ctx.drawImage(overlayCanvas, 0, 0, canvas.width, canvas.height);
          console.log('✅ 드로잉 오버레이 추가 완료');
        }
      }
      
      // PNG로 변환
      const dataURL = canvas.toDataURL('image/png', 1.0);
      
      if (dataURL.length < 1000) {
        throw new Error('캡처된 이미지가 비어있습니다.');
      }
      
      // 파일명 생성
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const fileName = `screen_capture_${timestamp}.png`;
      
      console.log('💾 화면 캡처 완료:', {
        fileName,
        size: dataURL.length
      });
      
      // 1. 로컬 다운로드
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 2. 서버 업로드
      try {
        const response = await fetch(dataURL);
        const blob = await response.blob();
        
        const formData = new FormData();
        const file = new File([blob], fileName, { type: 'image/png' });
        formData.append('file', file);
        
        const uploadResponse = await fetch(`/api/users/upload-drawing-local/${patientId}`, {
          method: 'POST',
          body: formData,
        });
        
        if (uploadResponse.ok) {
          const result = await uploadResponse.json();
          console.log('✅ 서버 업로드 성공:', result);
          alert(t.fileSaved);
          
          // 페이지 새로고침 제거 - 사용자가 계속 작업할 수 있도록
          console.log('✅ 저장 완료 - 페이지 유지');
        } else {
          console.warn('⚠️ 서버 업로드 실패, 로컬 저장만 완료');
          alert(t.fileSavedLocally);
        }
      } catch (uploadError) {
        console.warn('⚠️ 서버 업로드 오류:', uploadError);
        alert(t.fileSavedLocally);
      }
      
    } catch (error) {
      console.error('❌ 화면 캡처 실패:', error);
      alert('화면 캡처에 실패했습니다: ' + error);
    } finally {
      setIsSaving(false);
    }
  };

  // 원본 뇌 이미지만 다시 로드하는 함수 (오버레이 제거용)
  const reloadOriginalBrain = async () => {
    if (!originalNiftiUrl || !nvRef.current) {
      console.log('MPRViewer: 원본 NIfTI URL이 없거나 nvRef가 없어서 뇌 이미지 재로드를 건너뜁니다');
      return;
    }
    
    try {
      console.log('🔄 MPRViewer: 원본 뇌 이미지만 재로드 시작');
      setIsLoading(true);
      
      // 기본 뇌 이미지만 로드 (오버레이 없이)
      const volumeList = [{ 
        url: originalNiftiUrl,
        name: 'brain.nii',
        colormap: 'gray'
      }];
      
      await nvRef.current.loadVolumes(volumeList);
      
      if (nvRef.current.volumes && nvRef.current.volumes.length > 0) {
        // 현재 뷰 모드 유지
        nvRef.current.setSliceType(currentSliceType || 0);
        
        // 볼륨 설정
        nvRef.current.volumes[0].opacity = 1.0;
        nvRef.current.updateGLVolume();
        
        safeDrawScene(nvRef.current);
        setHasOverlay(false);
        
        console.log('✅ MPRViewer: 원본 뇌 이미지 재로드 완료');
      }
      
    } catch (error) {
      console.error('❌ MPRViewer: 원본 뇌 이미지 재로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // TUMOR 파일 업로드/제거 토글 핸들러 함수들 (NIfTISliceViewer와 동일)
  const handleTumorUpload = () => {
    // 이미 tumor 오버레이가 있으면 제거
    if (tumorOverlayUrl) {
      console.log('MPRViewer: Tumor 오버레이 제거 중...');
      setTumorOverlayUrl(null);
      
      // 오버레이 제거 후 원본 뇌 이미지만 다시 로드
      reloadOriginalBrain();
      
      console.log('✅ MPRViewer: Tumor 오버레이 제거 완료');
    } else {
      // tumor 오버레이가 없으면 자동으로 seg.nii.gz 파일 로드
      loadTumorFromSegFile();
    }
  };

  // UUID 폴더 안의 seg.nii.gz 파일을 자동으로 로드하는 함수 (Flask 서버 비활성화)
  const loadTumorFromSegFile = async () => {
    try {
      const sessionId = localStorage.getItem('currentSessionId');
      if (!sessionId) {
        console.log('📝 Flask 서버 비활성화 - MPRViewer seg 파일 로드 건너뜀');
        return;
      }

      console.log('📝 Flask 서버 비활성화 - MPRViewer seg 파일 로드 기능 사용 안함');
      
      // Flask 서버가 비활성화되어 있으므로 seg 파일 로드하지 않음
      
    } catch (error) {
      console.log('📝 Flask 서버 비활성화 - MPRViewer Tumor 로드 기능 사용 안함');
    }
  };

  // tumorOverlayUrl이 변경될 때 Tumor 오버레이 로드/제거 (분석 페이지와 동일)
  useEffect(() => {
    console.log('🔥 MPRViewer: tumorOverlayUrl 변경됨:', tumorOverlayUrl);
    console.log('🔥 MPRViewer: nvRef.current:', !!nvRef.current);
    console.log('🔥 MPRViewer: volumes.length:', nvRef.current?.volumes?.length || 0);
    console.log('🔥 MPRViewer: originalNiftiUrl:', originalNiftiUrl);
    
    // 더 엄격한 null 체크
    if (nvRef.current && nvRef.current.volumes && nvRef.current.volumes.length > 0) {
      if (tumorOverlayUrl) {
        console.log('🔥 MPRViewer: loadTumorOverlay 호출');
        loadTumorOverlay(tumorOverlayUrl);
      } else {
        console.log('🔥 MPRViewer: tumorOverlayUrl이 null이므로 오버레이 제거');
        // tumorOverlayUrl이 null이면 오버레이 제거하고 기본 뇌만 표시
        reloadOriginalBrain();
      }
    } else {
      console.log('🔥 MPRViewer: 조건 미충족 - nvRef 또는 volumes 없음');
    }
  }, [tumorOverlayUrl, originalNiftiUrl]);

  // 초기화 시 전달받은 tumorOverlayUrl 로드는 loadFromOriginalUrl 완료 후에 처리됨

  // 파일 업로드 관련 코드 제거 - 이제 자동으로 seg.nii.gz 파일을 로드함

  // Tumor 오버레이를 NiiVue에 로드하는 함수
  const loadTumorOverlay = useCallback(async (overlayUrl: string) => {
    if (!nvRef.current || !originalNiftiUrl) {
      console.log('NiiVue 인스턴스 또는 원본 NIfTI URL이 없습니다.');
      return;
    }
    
    try {
      console.log('MPRViewer에서 Tumor 오버레이 로딩 시작:', overlayUrl);
      
      // 기존 오버레이가 있으면 제거 (첫 번째 볼륨은 기본 이미지이므로 보존)
      if (nvRef.current.volumes.length > 1) {
        nvRef.current.volumes = nvRef.current.volumes.slice(0, 1);
      }
      
      // 기본 뇌 이미지와 tumor segmentation을 함께 로드
      const volumeList = [
        { 
          url: originalNiftiUrl,
          name: 'brain.nii',
          colormap: 'gray'
        },
        {
          url: overlayUrl,
          name: 'tumor-segmentation.nii',
          colormap: 'green' // 녹색으로 표시하여 기존 segmentation과 구분
        }
      ];
      
      await nvRef.current.loadVolumes(volumeList);
      
      // 볼륨 설정
      if (nvRef.current.volumes.length >= 2) {
        // 기본 뇌 이미지 설정
        const brain = nvRef.current.volumes[0];
        brain.opacity = 1.0;
        nvRef.current.setColormap(brain.id, 'gray');
        
        // Tumor 오버레이 설정
        const tumorOverlay = nvRef.current.volumes[1];
        tumorOverlay.opacity = 0.7;
        nvRef.current.setColormap(tumorOverlay.id, 'green');
        
        // segmentation 파일의 특성에 맞게 설정
        tumorOverlay.cal_min = 0.5; // 0은 배경이므로 0.5부터 표시
        tumorOverlay.cal_max = 4.0;  // 일반적인 segmentation 최대값
        
        nvRef.current.updateGLVolume();
        setHasOverlay(true);
        
        console.log('MPRViewer Tumor 오버레이 로딩 성공');
      }
      
      nvRef.current.drawScene();
      
    } catch (error) {
      console.error('MPRViewer Tumor 오버레이 로딩 실패:', error);
      setHasOverlay(false);
    }
  }, [originalNiftiUrl]);

  // Overlay Canvas 그리기 이벤트 핸들러들
  const getDrawingStyle = () => {
    const colorMap = {
      red: '#FF0000',
      yellow: '#FFFF00', 
      green: '#00FF00',
      blue: '#0000FF'
    };
    
    const baseColor = colorMap[drawingColor];
    
    if (drawingTool === 'pen') {
      return {
        strokeStyle: baseColor,
        globalAlpha: 1.0,
        lineWidth: penSize, // 조절 가능한 펜 크기
        lineCap: 'round' as CanvasLineCap,
        lineJoin: 'round' as CanvasLineJoin
      };
    } else if (drawingTool === 'highlighter') {
      return {
        strokeStyle: baseColor,
        globalAlpha: highlighterOpacity, // 조절 가능한 형광펜 투명도
        lineWidth: highlighterSize, // 조절 가능한 형광펜 크기
        lineCap: 'round' as CanvasLineCap,
        lineJoin: 'round' as CanvasLineJoin
      };
    } else { // eraser
      return {
        strokeStyle: '#000000', // 지우개는 색상 무관
        globalAlpha: 1.0,
        lineWidth: eraserSize, // 조절 가능한 지우개 크기
        lineCap: 'round' as CanvasLineCap,
        lineJoin: 'round' as CanvasLineJoin
      };
    }
  };

  const getMousePosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!overlayCanvasRef.current) return { x: 0, y: 0 };
    
    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const scaleX = overlayCanvasRef.current.width / rect.width;
    const scaleY = overlayCanvasRef.current.height / rect.height;
    
    // 정확한 마우스 좌표 계산 (고해상도 디스플레이 대응)
    const x = (e.clientX - rect.left) * scaleX / (window.devicePixelRatio || 1);
    const y = (e.clientY - rect.top) * scaleY / (window.devicePixelRatio || 1);
    
    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode || !overlayCanvasRef.current) return;
    
    e.preventDefault();
    setIsDrawing(true);
    
    const { x, y } = getMousePosition(e);
    setLastPoint({ x, y });
    
    const ctx = overlayCanvasRef.current.getContext('2d');
    if (ctx) {
      const style = getDrawingStyle();
      Object.assign(ctx, style);
      ctx.beginPath();
      ctx.moveTo(x, y);
      
      console.log('🎨 그리기 시작:', { x, y, tool: drawingTool, color: drawingColor });
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawingMode || !overlayCanvasRef.current || !lastPoint) return;
    
    e.preventDefault();
    const { x, y } = getMousePosition(e);
    
    const ctx = overlayCanvasRef.current.getContext('2d');
    if (ctx) {
      if (drawingTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = eraserSize; // 조절 가능한 지우개 크기 사용
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
    
    setLastPoint({ x, y });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPoint(null);
  };

  // 뷰 모드 변경 - 간단하고 안전한 방식 - useCallback으로 최적화
  const setViewMode = useCallback(async (mode: number) => {
    console.log(`🔄 뷰 모드 변경 시작: ${mode}, 현재 slicePlaneMode: ${slicePlaneMode}`);
    setIsLoading(true);
    setIsWorkingMode(false); // 작업중 모드 해제
    
    // 3D 모드(mode 4)에서만 그리기 모드 비활성화, 다른 모드에서는 그리기 모드 유지
    if (isDrawingMode && mode === 4) {
      setIsDrawingMode(false);
      console.log('🔄 3D 모드 전환: 그리기 모드 비활성화');
    }
    
    // 작업중 모드 뷰어만 정리
    cleanupNiivueInstances();
    
    // Oblique 모드에서 나올 때 설정 리셋
    if (slicePlaneMode === 'oblique') {
      console.log('🔄 Oblique → 일반 모드 전환 - 리셋');
      setSlicePlaneMode('orthogonal');
      
      if (nvRef.current) {
        try {
          // Oblique 모드 설정 리셋
          nvRef.current.setSliceMM(false); // 슬라이스 평면 숨김
          nvRef.current.opts.crosshairColor = [1.0, 0.0, 0.0, 1.0]; // 빨간색 복원
          nvRef.current.opts.crosshairWidth = 1; // 얇은 십자선으로 통일
          nvRef.current.opts.crosshairGap = 2; // 십자선 간격 복원
          nvRef.current.opts.multiplanarShowRender = 0; // 슬라이스 렌더링 비활성화
          nvRef.current.opts.multiplanarForceRender = false; // 강제 렌더링 비활성화
          nvRef.current.opts.isSliceMM = false; // 슬라이스 mm 표시 비활성화
          nvRef.current.setClipPlane([]); // 클리핑 평면 제거
          
          console.log('🔄 Oblique 설정 리셋 완료 - 빨간색 십자선 복원');
        } catch (e) {
          console.warn('Oblique 설정 리셋 오류:', e);
        }
      }
    }
    
    // 메인 뷰어가 있으면 모드 설정
    if (nvRef.current) {
      try {
        // NiiVue 인스턴스 상태 확인
        if (!nvRef.current.volumes || nvRef.current.volumes.length === 0) {
          console.warn('⚠️ NiiVue 볼륨이 없습니다. 데이터 재로드 시도...');
          if (originalNiftiUrl) {
            await loadFromOriginalUrl();
          }
          setIsLoading(false);
          return;
        }
        
        nvRef.current.setSliceType(mode);
        setCurrentSliceType(mode); // 현재 슬라이스 타입 업데이트
        
        // 🔒 독립 모드: 각 뷰의 슬라이스 위치를 독립적으로 유지
        if (mode === 0 || mode === 1 || mode === 2) {
          // 각 뷰별로 독립적인 슬라이스 위치 유지 (십자선과 분리)
          // 슬라이스 상태는 이미 각각 저장되어 있으므로 별도 초기화 불필요
          console.log(`🔒 독립 모드 ${mode}: 기존 슬라이스 위치 유지 - Axial:${(axialSlicePos*100).toFixed(0)}%, Coronal:${(coronalSlicePos*100).toFixed(0)}%, Sagittal:${(sagittalSlicePos*100).toFixed(0)}%`);
        }
        
        if (mode === 0 || mode === 1 || mode === 2) {
          // Axial, Coronal, Sagittal 모드 - 순수 2D 슬라이스 뷰 (원래 설정 유지)
          nvRef.current.opts.multiplanarShowRender = 0; // 3D 렌더링 비활성화
          nvRef.current.opts.show3Dcrosshair = false; // 십자선 비활성화 (원래대로)
          nvRef.current.opts.isOrientCube = false; // 방향 큐브 숨김 (2D 뷰)
          nvRef.current.opts.multiplanarForceRender = false;
          nvRef.current.opts.isSliceMM = false;
          
          // 십자선 완전 제거 설정 (깔끔한 2D 뷰)
          nvRef.current.opts.crosshairWidth = 0; // 십자선 두께를 0으로 설정
          nvRef.current.opts.crosshairGap = 0; // 십자선 간격을 0으로 설정
          nvRef.current.opts.crosshairColor = [0, 0, 0, 0]; // 십자선 색상을 완전 투명으로 설정
          nvRef.current.opts.show3Dcrosshair = false; // 3D 십자선도 완전 비활성화
          
          // 마우스 조작 설정 (슬라이스 이동 및 확대/축소만)
          nvRef.current.opts.dragMode = 1; // 마우스 드래그로 팬/줌 가능
          
          // 🔒 독립 모드: 각 뷰의 저장된 슬라이스 위치 적용
          if (nvRef.current.scene) {
            if (!nvRef.current.scene.crosshairPos) {
              nvRef.current.scene.crosshairPos = [0.5, 0.5, 0.5];
            }
            
            const crosshairPos = nvRef.current.scene.crosshairPos as number[];
            
            // 현재 뷰 모드에 해당하는 슬라이스 위치만 적용
            if (mode === 0) { // Axial 뷰
              crosshairPos[2] = axialSlicePos; // Z축만 업데이트
              console.log(`🔒 Axial 뷰 독립 모드: 저장된 슬라이스 위치 ${(axialSlicePos*100).toFixed(0)}% 적용`);
            } else if (mode === 1) { // Coronal 뷰
              crosshairPos[1] = coronalSlicePos; // Y축만 업데이트
              console.log(`🔒 Coronal 뷰 독립 모드: 저장된 슬라이스 위치 ${(coronalSlicePos*100).toFixed(0)}% 적용`);
            } else if (mode === 2) { // Sagittal 뷰
              crosshairPos[0] = sagittalSlicePos; // X축만 업데이트
              console.log(`🔒 Sagittal 뷰 독립 모드: 저장된 슬라이스 위치 ${(sagittalSlicePos*100).toFixed(0)}% 적용`);
            }
            
            nvRef.current.scene.crosshairPos = crosshairPos;
          }
          
          // 그리기 기능을 위한 2D 최적화
          if (nvRef.current.volumes && nvRef.current.volumes.length > 0) {
            nvRef.current.volumes[0].opacity = 1.0; // 완전 불투명
            nvRef.current.updateGLVolume();
          }
          
        } else if (mode === 3) {
          // 🔒 MPR+3D 모드 - 십자선 클릭 상호작용 활성화
          nvRef.current.opts.multiplanarShowRender = 2; // SHOW_RENDER.ALWAYS - 3D 렌더링 항상 표시
          nvRef.current.opts.show3Dcrosshair = true;
          nvRef.current.opts.isOrientCube = true;
          
          // 십자선 색상을 빨간색으로 명시적 설정
          nvRef.current.opts.crosshairColor = [1.0, 0.0, 0.0, 1.0]; // 빨간색 RGBA
          nvRef.current.opts.crosshairWidth = 1; // 얇은 십자선으로 변경
          nvRef.current.opts.crosshairGap = 2;
          
          // 🎯 MPR 십자선 클릭 상호작용 활성화
          nvRef.current.opts.dragMode = 0; // 기본 드래그 모드 (십자선 이동 가능)
          nvRef.current.opts.multiplanarForceRender = true; // 강제 멀티플래너 렌더링
          nvRef.current.opts.isSliceMM = true; // 슬라이스 mm 표시로 십자선 상호작용 활성화
          
          // 🔒 MPR+3D 모드 전용 독립적인 십자선 위치 설정 (다른 뷰와 완전 분리)
          if (nvRef.current.scene) {
            // MPR+3D 모드만의 고정된 십자선 위치 (중앙)
            const mprCrosshairPos = [0.5, 0.5, 0.5]; // 항상 중앙에 고정
            nvRef.current.scene.crosshairPos = mprCrosshairPos;
            console.log('🔒 MPR+3D 독립 모드: 십자선을 중앙 위치로 고정 (다른 뷰와 완전 분리)');
          }
          
          // 볼륨 설정 - MPR+3D 모드 최적화
          if (nvRef.current.volumes && nvRef.current.volumes.length > 0) {
            const volume = nvRef.current.volumes[0];
            volume.opacity = 1.0;
            
            // MPR+3D 모드에서 볼륨 렌더링 범위 최적화 (화면이 까매지는 것 방지)
            if (volume.cal_min !== undefined && volume.cal_max !== undefined) {
              const range = volume.cal_max - volume.cal_min;
              volume.cal_min = volume.cal_min + range * 0.05; // 하위 5% 제거
              volume.cal_max = volume.cal_max - range * 0.05; // 상위 5% 제거
              console.log('🔧 MPR+3D: 볼륨 렌더링 범위 최적화:', { min: volume.cal_min, max: volume.cal_max });
            }
            
            nvRef.current.updateGLVolume();
          }
          
        } else if (mode === 4) {
          // 3D 모드 - 초고속 부드러운 조작을 위한 최적화 설정
          nvRef.current.opts.show3Dcrosshair = false; // 3D 크로스헤어 비활성화 (순수 3D 뷰)
          nvRef.current.opts.multiplanarShowRender = 0; // 슬라이스 완전 비활성화 (순수 3D)
          nvRef.current.opts.isOrientCube = true; // 방향 큐브 표시
          nvRef.current.opts.dragMode = 1; // 3D 회전/확대축소 모드
          nvRef.current.opts.isSliceMM = false; // 슬라이스 평면 비표시
          nvRef.current.opts.multiplanarForceRender = false; // 강제 렌더링 비활성화
          nvRef.current.opts.crosshairWidth = 0; // 십자선 두께 0
          nvRef.current.opts.crosshairColor = [0, 0, 0, 0]; // 십자선 완전 투명
          
          // 🔥 극한의 부드러움을 위한 고급 성능 최적화
          nvRef.current.opts.meshThicknessOn2D = 0; // 2D 메시 두께 최소화
          nvRef.current.opts.isAntiAlias = true; // 안티앨리어싱 활성화 (부드러운 렌더링)
          nvRef.current.opts.dragAndDropEnabled = false; // 드래그앤드롭 비활성화로 성능 향상
          nvRef.current.opts.fontSizeScaling = 0.8; // 폰트 크기 최적화
          
          // 🎮 마우스 반응성 극대화 (버터처럼 부드러운 조작)
          nvRef.current.opts.isNearestInterpolation = false; // 부드러운 보간
          nvRef.current.opts.drawingEnabled = false; // 드로잉 완전 비활성화
          
          // 🔥 Gimbal Lock 방지를 위한 고급 설정
          nvRef.current.opts.isRadiological = false; // 방사선학적 방향 제한 해제
          nvRef.current.opts.isOrientCube = true; // 방향 큐브로 방향 확인
          nvRef.current.opts.isRuler = false; // 룰러 비활성화로 성능 향상
          
          // 🎯 무제한 자유 회전 - Brain3DView와 동일하게 초기 각도만 설정
          nvRef.current.setRenderAzimuthElevation(45, -10);
          
          // 🔥 완전한 360도 무제한 회전을 위한 고급 설정
          if (nvRef.current.scene) {
            // 회전 범위 제한 완전 해제 - 무제한 회전
            nvRef.current.scene.renderAzimuth = 45; // 초기값만 설정
            nvRef.current.scene.renderElevation = -10; // 초기값만 설정
            
            // 🎯 모든 회전 제한 완전 해제
            nvRef.current.scene.elevationMin = -360; // 완전 무제한 (-180° → -360°)
            nvRef.current.scene.elevationMax = 360;  // 완전 무제한 (180° → 360°)
            nvRef.current.scene.azimuthMin = -360;   // 방위각도 무제한
            nvRef.current.scene.azimuthMax = 360;    // 방위각도 무제한
            
            // 🚀 회전 연속성 보장을 위한 추가 설정
            nvRef.current.scene.crosshairPos = [0.5, 0.5, 0.5]; // 중심점 고정
            nvRef.current.scene.volScaleMultiplier = 1.0; // 스케일 고정
          }
          
          // 🎮 회전 엔진 최적화 - 끊김 없는 연속 회전
          nvRef.current.opts.isRadiological = false; // 방사선학적 제한 해제
          nvRef.current.opts.isOrientCube = true; // 방향 표시 유지
          nvRef.current.opts.multiplanarForceRender = false; // 강제 렌더링 비활성화
          nvRef.current.opts.isSliceMM = false; // 슬라이스 mm 표시 비활성화
          
          
          // 클리핑 평면 완전 제거 (순수한 3D 뷰)
          nvRef.current.setClipPlane([]);
          
          // 볼륨 전체가 보이도록 설정
          if (nvRef.current.scene) {
            nvRef.current.scene.volScaleMultiplier = 1.0; // 기본 스케일
          }
          
          // 볼륨 설정 - Brain3DView와 동일
          if (nvRef.current.volumes && nvRef.current.volumes.length > 0 && nvRef.current.volumes[0]) {
            nvRef.current.volumes[0].opacity = 1.0;
            nvRef.current.updateGLVolume();
          }
          
          console.log('✅ 3D 모드 설정 완료 (Brain3DView와 동일) - 360도 회전 가능');
        }
        
        // 즉시 그리기
        safeDrawScene(nvRef.current);
        
        // 🔥 TUMOR 오버레이가 있으면 뷰 모드 변경 후 재로드
        if (tumorOverlayUrl) {
          console.log(`🔥 뷰 모드 ${mode} 전환 후 TUMOR 오버레이 재로드:`, tumorOverlayUrl);
          await loadTumorOverlay(tumorOverlayUrl);
        }
        
        setIsLoading(false);
        console.log(`✅ 뷰 모드 ${mode} 전환 완료`);
        
      } catch (error) {
        console.error('뷰 모드 설정 오류:', error);
        setIsLoading(false);
      }
    } else {
      console.warn('nvRef.current가 없습니다');
      setIsLoading(false);
    }
  }, [slicePlaneMode, isDrawingMode, cleanupNiivueInstances, tumorOverlayUrl, loadTumorOverlay]);















  // Click-to-Segment 기능 제거됨 - 불필요한 기능이므로 삭제


  // 현재 슬라이스 위치 상태 (현재 미사용)
  // const [currentSlices, setCurrentSlices] = useState<{ axial: number; coronal: number; sagittal: number }>({ axial: 0.5, coronal: 0.5, sagittal: 0.5 });

  // 페이지 변경 시 드로잉 초기화 useEffect
  useEffect(() => {
    // 슬라이스 위치가 변경될 때마다 드로잉 오버레이 클리어
    if (overlayCanvasRef.current) {
      const canvas = overlayCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        console.log('🧹 페이지 변경으로 인한 드로잉 초기화:', {
          axial: axialSlicePos,
          coronal: coronalSlicePos,
          sagittal: sagittalSlicePos,
          currentSliceType
        });
      }
    }
  }, [axialSlicePos, coronalSlicePos, sagittalSlicePos, currentSliceType]);

  // Overlay Canvas 크기 동기화 useEffect
  useEffect(() => {
    const syncCanvasSize = () => {
      if (overlayCanvasRef.current && canvasRef.current) {
        const mainCanvas = canvasRef.current;
        const overlayCanvas = overlayCanvasRef.current;
        
        // 정확한 크기 가져오기
        const rect = mainCanvas.getBoundingClientRect();
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // Canvas 내부 해상도 설정 (고해상도 디스플레이 대응)
        overlayCanvas.width = rect.width * devicePixelRatio;
        overlayCanvas.height = rect.height * devicePixelRatio;
        
        // CSS 크기 설정
        overlayCanvas.style.width = `${rect.width}px`;
        overlayCanvas.style.height = `${rect.height}px`;
        
        // Canvas context 스케일 조정
        const ctx = overlayCanvas.getContext('2d');
        if (ctx) {
          ctx.scale(devicePixelRatio, devicePixelRatio);
        }
        
        console.log('📐 Canvas 크기 동기화:', {
          width: rect.width,
          height: rect.height,
          devicePixelRatio,
          canvasWidth: overlayCanvas.width,
          canvasHeight: overlayCanvas.height
        });
      }
    };

    // 초기 동기화 (약간의 지연을 두어 DOM이 완전히 렌더링된 후 실행)
    setTimeout(syncCanvasSize, 100);

    // 리사이즈 이벤트 리스너
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(syncCanvasSize, 50); // 리사이즈 후 약간의 지연
    });
    
    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [file, isDrawingMode]); // file과 drawingMode 변경 시마다 재동기화

  // MPR 뷰어에서 슬라이스 위치 변경 감지 (3D 모드 제외)
  useEffect(() => {
    // 🚀 3D 모드일 때는 Brain3DView처럼 마우스 이벤트 리스너 등록하지 않음
    if (currentSliceType === 4) {
      console.log('🎯 3D 모드: 마우스 이벤트 리스너 등록 건너뜀 (Brain3DView와 동일)');
      return;
    }
    
    if (nvRef.current && nvRef.current.volumes && nvRef.current.volumes.length > 0) {
      const updateSlicePositions = () => {
        const scene = nvRef.current?.scene;
        if (scene && scene.crosshairPos) {
          const crosshairPos = scene.crosshairPos as number[];
          
          // 🔒 독립 모드: MPR+3D에서는 십자선 상호작용 활성화
          if (currentSliceType === 3) {
            // MPR+3D 모드에서는 십자선 상호작용을 허용하고 실시간 업데이트
            const axialPos = crosshairPos[2] || 0.5;
            const coronalPos = crosshairPos[1] || 0.5;
            const sagittalPos = crosshairPos[0] || 0.5;
            
            // 모든 슬라이스 위치 실시간 업데이트 (MPR 동기화)
            setAxialSlicePos(axialPos);
            setCoronalSlicePos(coronalPos);
            setSagittalSlicePos(sagittalPos);
            
            // 안전한 drawScene 호출
            safeDrawScene(nvRef.current, 'MPR 동기화');
            
            console.log('🎯 MPR+3D 십자선 상호작용:', {
              axial: (axialPos * 100).toFixed(1) + '%',
              coronal: (coronalPos * 100).toFixed(1) + '%',
              sagittal: (sagittalPos * 100).toFixed(1) + '%'
            });
            return; // MPR 전용 처리 완료
          }
          
          // 🔒 개별 뷰(Axial, Coronal, Sagittal)에서만 해당 뷰의 슬라이스 상태 업데이트
          if (currentSliceType === 0) { // Axial 뷰에서만
            const axialPos = crosshairPos[2] || 0.5;
            setAxialSlicePos(axialPos);
            console.log('🔒 Axial 독립 모드: Axial 슬라이스만 업데이트');
          } else if (currentSliceType === 1) { // Coronal 뷰에서만
            const coronalPos = crosshairPos[1] || 0.5;
            setCoronalSlicePos(coronalPos);
            console.log('🔒 Coronal 독립 모드: Coronal 슬라이스만 업데이트');
          } else if (currentSliceType === 2) { // Sagittal 뷰에서만
            const sagittalPos = crosshairPos[0] || 0.5;
            setSagittalSlicePos(sagittalPos);
            console.log('🔒 Sagittal 독립 모드: Sagittal 슬라이스만 업데이트');
          }
        }
      };

      // 3D 모드가 아닐 때만 마우스 이벤트 리스너 등록
      const canvas = canvasRef.current;
      if (canvas) {
        const animationFrameId: number | null = null;
        
        // 십자선 위치 업데이트 함수 (경계 제한 제거)
        const updateCrosshair = () => {
          updateSlicePositions();
        };
        
        // 마우스 이동 중 업데이트를 위한 안정적인 스로틀링 (배포 환경 최적화)
        let lastUpdateTime = 0;
        const throttledUpdate = () => {
          const now = performance.now();
          if (now - lastUpdateTime > 50) { // 20fps 제한 (50ms) - 배포 환경에서 안정적
            lastUpdateTime = now;
            updateCrosshair();
          }
        };
        
        // 휠 이벤트 즉시 처리 (스로틀링 없음 + vec4/vec410 에러 방지)
        const immediateWheelHandler = (e: WheelEvent) => {
          try {
            e.preventDefault();
            e.stopPropagation();
            
            // NiiVue 인스턴스 상태 검증 (vec4/vec410 에러 방지)
            if (!nvRef.current) {
              console.warn('⚠️ MPR 뷰어 NiiVue 인스턴스가 준비되지 않음 - 휠 이벤트 무시');
              return;
            }
            
            // WebGL 컨텍스트 상태 확인
            const canvas = nvRef.current.canvas as HTMLCanvasElement;
            if (canvas) {
              const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
              if (gl && gl.isContextLost()) {
                console.warn('⚠️ MPR 뷰어 WebGL 컨텍스트 손실 - 휠 이벤트 무시');
                return;
              }
            }
            
            updateCrosshair(); // 휠 이벤트는 즉시 처리
          } catch (wheelError) {
            console.error('❌ MPR 뷰어 휠 이벤트 처리 에러:', wheelError);
            // vec4/vec410 관련 에러인지 확인
            if (wheelError instanceof Error && wheelError.message && (wheelError.message.includes('vec4') || wheelError.message.includes('410'))) {
              console.warn('🔧 vec4/vec410 에러 감지 - MPR 뷰어 이벤트 무시');
            }
          }
        };
        
        canvas.addEventListener('mouseup', updateSlicePositions);
        canvas.addEventListener('wheel', immediateWheelHandler, { passive: false });
        canvas.addEventListener('click', updateSlicePositions);
        
        // MPR+3D 모드에서는 더 민감한 마우스 이벤트 처리
        if (currentSliceType === 3) {
          // 🎯 MPR+3D 모드: 각 뷰별 드래그 상호작용 처리
          let isDragging = false;
          let dragStartView = '';
          
          const handleMPRMouseDown = (e: MouseEvent) => {
            isDragging = true;
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            
            // 드래그 시작 뷰 감지
            if (x < 0.5 && y < 0.5) {
              dragStartView = 'Axial';
            } else if (x >= 0.5 && y < 0.5) {
              dragStartView = 'Coronal';
            } else if (x < 0.5 && y >= 0.5) {
              dragStartView = 'Sagittal';
            } else {
              dragStartView = '3D';
            }
            
            console.log('🎯 MPR 드래그 시작:', dragStartView);
            updateSlicePositions();
          };
          
          const handleMPRMouseMove = (e: MouseEvent) => {
            if (isDragging && nvRef.current && nvRef.current.scene && nvRef.current.scene.crosshairPos) {
              const rect = canvas.getBoundingClientRect();
              const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
              
              const crosshairPos = [...(nvRef.current.scene.crosshairPos as number[])]; // 복사본 생성
              
              // 좌표 배열 검증
              if (crosshairPos.length < 3) {
                console.warn('⚠️ 드래그 중 잘못된 십자선 좌표:', crosshairPos);
                return;
              }
              
              // 드래그 중인 뷰에 따라 십자선 업데이트 (범위 검증 포함)
              if (dragStartView === 'Axial' && x < 0.5 && y < 0.5) {
                // Axial 뷰 드래그: 마우스 X → 뇌 X축, 마우스 Y → 뇌 Y축 (뒤집힘)
                crosshairPos[0] = Math.max(0, Math.min(1, x * 2)); // X축 (Left-Right)
                crosshairPos[1] = Math.max(0, Math.min(1, 1.0 - (y * 2))); // Y축 (Posterior-Anterior, 뒤집힘)
              } else if (dragStartView === 'Coronal' && x >= 0.5 && y < 0.5) {
                // Coronal 뷰 드래그: 마우스 X → 뇌 X축, 마우스 Y → 뇌 Z축 (뒤집힘)
                crosshairPos[0] = Math.max(0, Math.min(1, (x - 0.5) * 2)); // X축 (Left-Right)
                crosshairPos[2] = Math.max(0, Math.min(1, 1.0 - (y * 2))); // Z축 (Inferior-Superior, 뒤집힘)
              } else if (dragStartView === 'Sagittal' && x < 0.5 && y >= 0.5) {
                // Sagittal 뷰 드래그: 마우스 X → 뇌 Y축, 마우스 Y → 뇌 Z축 (뒤집힘)
                crosshairPos[1] = Math.max(0, Math.min(1, x * 2)); // Y축 (Posterior-Anterior)
                crosshairPos[2] = Math.max(0, Math.min(1, 1.0 - ((y - 0.5) * 2))); // Z축 (Inferior-Superior, 뒤집힘)
              }
              
              // 최종 좌표 검증
              const validatedPos = crosshairPos.map(coord => Math.max(0, Math.min(1, coord)));
              nvRef.current.scene.crosshairPos = validatedPos;
              
              // 슬라이스 상태 동기화 (범위 검증 포함)
              setAxialSlicePos(Math.max(0, Math.min(1, validatedPos[2])));
              setCoronalSlicePos(Math.max(0, Math.min(1, validatedPos[1])));
              setSagittalSlicePos(Math.max(0, Math.min(1, validatedPos[0])));
              
              safeDrawScene(nvRef.current);
            } else {
              updateSlicePositions();
            }
          };
          
          const handleMPRMouseUp = () => {
            isDragging = false;
            dragStartView = '';
            updateSlicePositions();
          };
          
          canvas.addEventListener('mousedown', handleMPRMouseDown, { passive: true });
          canvas.addEventListener('mousemove', handleMPRMouseMove, { passive: true });
          canvas.addEventListener('mouseup', handleMPRMouseUp, { passive: true });
          
          console.log('🎯 MPR+3D 모드: 각 뷰별 드래그 상호작용 이벤트 등록');
        } else {
          // 다른 모드: 일반적인 스로틀링된 업데이트
          canvas.addEventListener('mousemove', throttledUpdate, { passive: true });
          canvas.addEventListener('mousedown', throttledUpdate, { passive: true });
        }
        
        // MPR+3D 모드에서는 더 빠른 업데이트, 다른 모드에서는 일반적인 업데이트
        const updateInterval = currentSliceType === 3 ? 16 : 50; // MPR+3D는 16ms(60fps), 다른 모드는 50ms
        const interval = setInterval(() => {
          updateSlicePositions();
        }, updateInterval);
        
        return () => {
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
          }
          canvas.removeEventListener('mouseup', updateSlicePositions);
          canvas.removeEventListener('wheel', immediateWheelHandler);
          canvas.removeEventListener('click', updateSlicePositions);
          
          // MPR+3D 모드와 다른 모드에 따른 이벤트 리스너 정리
          if (currentSliceType === 3) {
            // MPR+3D 모드의 커스텀 핸들러들 정리
            // 실제 핸들러 함수들은 클로저 내부에 있어서 자동으로 정리됨
            console.log('🎯 MPR+3D 모드 이벤트 리스너 정리');
          } else {
            canvas.removeEventListener('mousemove', throttledUpdate);
            canvas.removeEventListener('mousedown', throttledUpdate);
          }
          
          clearInterval(interval);
        };
      }
    }
  }, [nvRef.current, currentSliceType]);

  // 🔥 3D 모드와 Oblique 모드 완전한 360도 회전을 위한 고급 마우스 이벤트 리스너
  useEffect(() => {
    // 3D 모드 또는 Oblique 모드일 때 전역 마우스 이벤트 리스너 등록
    if ((currentSliceType === 4 || slicePlaneMode === 'oblique') && nvRef.current && canvasRef.current) {
      let isMouseDown = false;
      let lastMouseX = 0;
      let lastMouseY = 0;
      
      const handleGlobalMouseDown = (e: MouseEvent) => {
        isMouseDown = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        if (nvRef.current) {
          safeDrawScene(nvRef.current);
        }
      };
      
      const handleGlobalMouseMove = (e: MouseEvent) => {
        // 연속적인 렌더링으로 끊김 없는 회전 보장
        if (nvRef.current) {
          // 마우스 이동량 계산으로 부드러운 회전
          const deltaX = e.clientX - lastMouseX;
          const deltaY = e.clientY - lastMouseY;
          
          // 작은 움직임도 감지하여 연속성 보장
          if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
            safeDrawScene(nvRef.current);
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
          }
        }
      };
      
      const handleGlobalMouseUp = () => {
        isMouseDown = false;
        // 드래그 상태 완전 리셋 + 휠 기능 안정화
        if (nvRef.current) {
          safeDrawScene(nvRef.current);
          // 회전 상태 안정화 + 휠 이벤트 상태 리셋
          setTimeout(() => {
            if (nvRef.current) {
              safeDrawScene(nvRef.current);
              // 🔥 마우스 업 후 휠 기능이 계속 작동하도록 상태 안정화
              console.log('🖱️ 마우스 업: 휠 기능 상태 안정화 완료');
            }
          }, 16); // 60fps 기준 한 프레임 후 안정화
        }
      };
      
      // 🎯 완전한 360도 회전을 위한 전역 이벤트 리스너
      document.addEventListener('mousedown', handleGlobalMouseDown, { passive: true });
      document.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
      document.addEventListener('mouseup', handleGlobalMouseUp, { passive: true });
      
      // 마우스가 브라우저 밖으로 나가도 드래그 상태 유지
      document.addEventListener('mouseleave', handleGlobalMouseUp, { passive: true });
      
      const modeText = slicePlaneMode === 'oblique' ? 'Oblique' : '3D';
      console.log(`🔥 ${modeText} 모드: 완전한 360도 회전 이벤트 리스너 등록`);
      
      return () => {
        document.removeEventListener('mousedown', handleGlobalMouseDown);
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('mouseleave', handleGlobalMouseUp);
        console.log(`🔥 ${modeText} 모드: 360도 회전 이벤트 리스너 제거`);
      };
    }
  }, [currentSliceType, slicePlaneMode, nvRef.current]);

  // 작업중 모드 Coronal 패널 초기화 (현재 미사용)
  /*
  const initWorkingModeViewers = async () => {
    if (!originalNiftiUrl && !niftiImage) return;

    // Coronal 뷰어 초기화 (중앙) - 동적 로딩
    if (workingCoronalCanvasRef.current) {
      const niivueModule = await import('@niivue/niivue');
      const { Niivue } = niivueModule;
      
      const coronalNv = new Niivue({
        show3Dcrosshair: true,
        logLevel: 'error',
        dragMode: 1,
        multiplanarPadPixels: 0,
        isRuler: false,
        isOrientCube: false,
        backColor: [0, 0, 0, 1],
        isColorbar: false,
        // 십자선 설정 - 배포 환경에서 강화된 설정
        crosshairColor: [1.0, 0.0, 0.0, 1.0], // 빨간색 RGBA
        crosshairWidth: 1, // 얇은 십자선으로 통일
        crosshairGap: 2,
      });
      
      workingCoronalNvRef.current = coronalNv as unknown as NiiVueInstance;
      
      // 캔버스 연결 전 추가 안전 검사
      if (workingCoronalCanvasRef.current && workingCoronalCanvasRef.current.parentElement) {
        await coronalNv.attachToCanvas(workingCoronalCanvasRef.current);
        
        // WebGL 컨텍스트 안정성 확인
        if (!coronalNv.gl || coronalNv.gl.isContextLost()) {
          throw new Error('WebGL 컨텍스트가 손실되었습니다.');
        }
      } else {
        console.warn('⚠️ 작업 모드 Coronal 뷰어 캔버스가 DOM에 연결되지 않음');
        return;
      }
      
      // 데이터 로드
      if (originalNiftiUrl) {
        const volumeList = [{ 
          url: originalNiftiUrl,
          name: 'brain.nii',
          colormap: currentColormap
        }];
        await coronalNv.loadVolumes(volumeList);
      } else if (niftiImage) {
        const blob = new Blob([niftiImage], { type: 'application/octet-stream' });
        const file = new File([blob], 'brain.nii', { type: 'application/octet-stream' });
        await coronalNv.loadFromFile(file);
      }
      
      // 볼륨이 로드되었는지 확인 후 설정
      if (coronalNv.volumes && coronalNv.volumes.length > 0) {
        // 컬러맵 설정
        coronalNv.setColormap(coronalNv.volumes[0].id, currentColormap);
        
        // Coronal 방향 3D + 클리핑 설정 (Y축) - 정면에서 보는 시점
        coronalNv.setSliceType(4); // 3D 렌더 모드
        coronalNv.setRenderAzimuthElevation(0, 0); // 정면에서 보는 각도 (Coronal 뷰)
        
        // 3D 볼륨과 슬라이스를 함께 표시
        coronalNv.opts.multiplanarShowRender = 2; // SHOW_RENDER.ALWAYS
        coronalNv.opts.show3Dcrosshair = true;
        
        // 뇌 중앙 위치로 초기 슬라이스 설정
        const coronalCenterPos = 0.5; // 50% 위치 (뇌 중앙 부근)
        setCoronalSlicePos(coronalCenterPos);
        
        // 볼륨 렌더링 최적화 - 약간 투명하게 해서 슬라이스가 보이도록
        coronalNv.volumes[0].opacity = 0.7;
        coronalNv.updateGLVolume();
        
        // 초기 클리핑 평면 설정 (뇌 중앙에서 시작)
        setTimeout(() => {
          const coronalClipPlane = [0, 1, 0, coronalCenterPos - 0.5]; // Y축 클리핑
          coronalNv.setClipPlane(coronalClipPlane);
          safeDrawScene(coronalNv, 'Coronal 패널');
          console.log('🟢 Coronal 패널: Y축 방향, 뇌 중앙 위치 (50%) 설정 완료');
        }, 100);
        
        safeDrawScene(coronalNv, 'Coronal 패널 초기화');
      }
    }
  };
  */

  // Oblique 모드 - 보라색 슬라이스 평면 기능 (잘 작동했던 버전 그대로)
  const setView3DSliceWithClipping = useCallback(async () => {
    console.log('🔥🔥🔥 Oblique 모드 활성화!');
    setIsLoading(true);
    
    // 기존 인스턴스들 정리
    cleanupNiivueInstances();
    
    setIsWorkingMode(false); // 작업중 모드는 비활성화 (Coronal 패널 안 보이게)
    setSlicePlaneMode('oblique'); // Oblique 모드로 설정
    setCurrentSliceType(4); // Oblique 모드는 3D 기반이므로 4로 설정
    
    // Oblique 모드에서는 그리기 모드 비활성화 (마우스 인터랙션 방해 방지)
    if (isDrawingMode) {
      setIsDrawingMode(false);
      console.log('🔥 Oblique 모드: 그리기 모드 자동 비활성화');
    }
    
    // Oblique 모드 직접 초기화
    if (nvRef.current) {
      try {
        console.log('🔥 Oblique 모드 직접 설정 시작');
        
        // 3D 렌더링 + 슬라이스 평면 모드
        nvRef.current.setSliceType(4); // 3D 렌더 모드
        nvRef.current.opts.multiplanarShowRender = 2; // ALWAYS - 3D와 슬라이스 모두 표시
        
        // 슬라이스 텍스처 렌더링 강제 활성화 - 핵심!
        nvRef.current.opts.isSliceMM = true; // 슬라이스 mm 표시
        nvRef.current.opts.multiplanarForceRender = true; // 강제 멀티플래너 렌더링
        nvRef.current.opts.sliceType = 4; // 슬라이스 타입 강제 설정
        
        // 보라색 슬라이스 평면 활성화
        nvRef.current.setSliceMM(true); // 슬라이스 평면 표시
        nvRef.current.opts.show3Dcrosshair = true; // 3D 크로스헤어 표시
        
        // 보라색 크로스헤어 및 슬라이스 평면 색상
        if (nvRef.current.opts) {
          nvRef.current.opts.crosshairColor = [0.8, 0.2, 0.8, 1.0]; // 보라색
          nvRef.current.opts.sliceType = 4; // 3D 슬라이스 타입
        }
        
        // 🔥 Oblique 모드 - 3D 모드와 동일한 360도 무제한 회전 적용
        nvRef.current.opts.dragMode = 1; // 슬라이스 평면 드래그 가능
        
        // 🎯 완전한 360도 무제한 회전을 위한 고급 설정 (3D 모드와 동일)
        if (nvRef.current.scene) {
          // 회전 범위 제한 완전 해제 - 무제한 회전
          nvRef.current.scene.renderAzimuth = 45; // 초기값만 설정
          nvRef.current.scene.renderElevation = -10; // 초기값만 설정
          
          // 🎯 모든 회전 제한 완전 해제
          nvRef.current.scene.elevationMin = -360; // 완전 무제한 (-180° → -360°)
          nvRef.current.scene.elevationMax = 360;  // 완전 무제한 (180° → 360°)
          nvRef.current.scene.azimuthMin = -360;   // 방위각도 무제한
          nvRef.current.scene.azimuthMax = 360;    // 방위각도 무제한
          
          // 🚀 회전 연속성 보장을 위한 추가 설정
          nvRef.current.scene.crosshairPos = [0.5, 0.5, 0.5]; // 중심점 고정
          nvRef.current.scene.volScaleMultiplier = 1.0; // 스케일 고정
        }
        
        // 🎮 회전 엔진 최적화 - 끊김 없는 연속 회전 (3D 모드와 동일)
        nvRef.current.opts.isRadiological = false; // 방사선학적 제한 해제
        nvRef.current.opts.multiplanarForceRender = true; // Oblique 모드는 강제 렌더링 필요
        nvRef.current.opts.isSliceMM = true; // 슬라이스 mm 표시 유지
        
        // 🔥 극한의 부드러움을 위한 고급 성능 최적화 (3D 모드와 동일)
        nvRef.current.opts.meshThicknessOn2D = 0; // 2D 메시 두께 최소화
        nvRef.current.opts.isAntiAlias = true; // 안티앨리어싱 활성화 (부드러운 렌더링)
        nvRef.current.opts.dragAndDropEnabled = false; // 드래그앤드롭 비활성화로 성능 향상
        nvRef.current.opts.fontSizeScaling = 0.8; // 폰트 크기 최적화
        
        // 🎮 마우스 반응성 극대화 (버터처럼 부드러운 조작)
        nvRef.current.opts.isNearestInterpolation = false; // 부드러운 보간
        nvRef.current.opts.drawingEnabled = false; // 드로잉 완전 비활성화
        
        // 슬라이스 텍스처 렌더링을 위한 핵심 설정
        nvRef.current.opts.multiplanarLayout = 0; // 기본 레이아웃
        nvRef.current.opts.multiplanarPadPixels = 0; // 패딩 없음
        nvRef.current.opts.isOrientCube = true; // 방향 큐브 표시
        
        // 슬라이스에 실제 뇌 이미지가 표시되도록 강제 설정
        nvRef.current.opts.meshThicknessOn2D = 0.0; // 2D 메시 두께
        nvRef.current.opts.isColorbar = false; // 컬러바 비활성화
        
        // 클리핑 평면 설정 (보라색 슬라이스 평면 표시)
        if (nvRef.current.volumes && nvRef.current.volumes.length > 0) {
          const volume = nvRef.current.volumes[0];
          if (volume) {
            // 3D 모드와 동일한 볼륨 렌더링 설정 - 밝게 보이도록
            volume.opacity = 0.8; // 3D 모드와 동일한 투명도
            
            // 3D 모드와 동일한 볼륨 범위 최적화 (밝게 보이도록)
            if (volume.cal_min !== undefined && volume.cal_max !== undefined) {
              const range = volume.cal_max - volume.cal_min;
              volume.cal_min = volume.cal_min + range * 0.1; // 하위 10% 제거
              volume.cal_max = volume.cal_max - range * 0.1; // 상위 10% 제거
            }
            
            nvRef.current.updateGLVolume();
          }
          
          // 초기 클리핑 평면 위치 설정 (뇌 중앙) - 4개 값으로 수정
          nvRef.current.setClipPlane([0, 0, 1, -0.1]); // Z축 클리핑 평면
          
          console.log('🔥 볼륨 설정 및 클리핑 평면 적용 - 슬라이스 텍스처 활성화');
        }
        
        safeDrawScene(nvRef.current);
        
        // 🔥 TUMOR 오버레이가 있으면 Oblique 모드 설정 후 재로드
        if (tumorOverlayUrl) {
          console.log('🔥 Oblique 모드 설정 후 TUMOR 오버레이 재로드:', tumorOverlayUrl);
          await loadTumorOverlay(tumorOverlayUrl);
        }
        
        setIsLoading(false);
        console.log('🔥 Oblique 모드 설정 완료!');
      } catch (error) {
        console.error('🔥 Oblique 모드 설정 오류:', error);
        setIsLoading(false);
      }
    } else {
      console.error('🔥 nvRef.current가 없습니다!');
      setIsLoading(false);
    }
  }, [isDrawingMode, cleanupNiivueInstances, tumorOverlayUrl, loadTumorOverlay]);





  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: sliderStyle }} />
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* 컨트롤 패널 - 오버레이 형태로 개선 */}
      <div className="bg-gray-800 bg-opacity-95 p-2 flex flex-wrap items-center justify-between gap-3 text-sm border-b border-gray-600">
        <div className="flex flex-wrap items-center gap-3">
        {/* 뷰 모드 버튼 */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setViewMode(4)}
            className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 font-bold"
          >
            3D
          </button>
          <button
            onClick={async () => {
              console.log('🔥🔥🔥 Oblique 버튼 클릭됨!');
              await setView3DSliceWithClipping();
            }}
            className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 font-bold"
            style={{ zIndex: 9999 }}
            title="보라색 슬라이스 평면 모드 - 3D 뇌에서 임의 단면 보기"
          >
Oblique
          </button>
          <button
            onClick={() => setViewMode(3)}
            className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            MPR+3D
          </button>
          <button
            onClick={() => setViewMode(0)}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Axial
          </button>
          <button
            onClick={() => setViewMode(1)}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Coronal
          </button>
          <button
            onClick={() => setViewMode(2)}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sagittal
          </button>
        </div>

        {/* 그리기 도구 - MPR+3D, Axial, Coronal, Sagittal 뷰에서만 표시 (순수 3D 모드와 Oblique 모드 제외) */}
        {(currentSliceType === 3 || currentSliceType === 0 || currentSliceType === 1 || currentSliceType === 2) && slicePlaneMode !== 'oblique' && (
          <div className="flex items-center gap-2 border-l border-gray-600 pl-3">
            {/* 그리기 모드 토글 */}
            <button
              onClick={toggleDrawingMode}
              className={`px-2 py-1 text-xs rounded font-medium ${
                isDrawingMode 
                  ? 'bg-green-600 text-white animate-pulse' 
                  : 'bg-gray-600 text-white hover:bg-gray-500'
              }`}
              title="그리기 모드 활성화/비활성화"
            >
              ✏️ {isDrawingMode ? 'ON' : 'OFF'}
            </button>

            {/* 그리기 도구가 활성화된 경우에만 도구들 표시 */}
            {isDrawingMode && (
              <>
                {/* 도구 선택 */}
                <div className="flex gap-1">
                  <button
                    onClick={() => changeDrawingTool('pen')}
                    className={`px-2 py-1 text-xs rounded ${
                      drawingTool === 'pen' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-600 text-white hover:bg-gray-500'
                    }`}
                    title={t.pen}
                  >
                    {t.pen}
                  </button>
                  <button
                    onClick={() => changeDrawingTool('highlighter')}
                    className={`px-2 py-1 text-xs rounded ${
                      drawingTool === 'highlighter' 
                        ? 'bg-yellow-500 text-black font-bold' 
                        : 'bg-gray-600 text-white hover:bg-yellow-400 hover:text-black'
                    }`}
                    title={t.highlighter}
                  >
                    {t.highlighter}
                  </button>
                  <button
                    onClick={() => changeDrawingTool('eraser')}
                    className={`px-2 py-1 text-xs rounded ${
                      drawingTool === 'eraser' 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-600 text-white hover:bg-gray-500'
                    }`}
                    title={t.eraser}
                  >
                    {t.eraser}
                  </button>
                </div>

                {/* 색상 선택 (지우개가 아닐 때만) */}
                {drawingTool !== 'eraser' && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => changeDrawingColor('red')}
                      className={`w-6 h-6 rounded border-2 ${
                        drawingColor === 'red' 
                          ? 'border-white bg-red-500' 
                          : 'border-gray-400 bg-red-500 hover:border-white'
                      }`}
                      title="빨간색"
                    />
                    <button
                      onClick={() => changeDrawingColor('yellow')}
                      className={`w-6 h-6 rounded border-2 ${
                        drawingColor === 'yellow' 
                          ? 'border-white bg-yellow-500' 
                          : 'border-gray-400 bg-yellow-500 hover:border-white'
                      }`}
                      title="노란색"
                    />
                    <button
                      onClick={() => changeDrawingColor('green')}
                      className={`w-6 h-6 rounded border-2 ${
                        drawingColor === 'green' 
                          ? 'border-white bg-green-500' 
                          : 'border-gray-400 bg-green-500 hover:border-white'
                      }`}
                      title="초록색"
                    />
                    <button
                      onClick={() => changeDrawingColor('blue')}
                      className={`w-6 h-6 rounded border-2 ${
                        drawingColor === 'blue' 
                          ? 'border-white bg-blue-500' 
                          : 'border-gray-400 bg-blue-500 hover:border-white'
                      }`}
                      title="파란색"
                    />
                  </div>
                )}

                {/* 펜 크기 조절 (펜일 때만) */}
                {drawingTool === 'pen' && (
                  <div className="flex items-center gap-2 border-l border-gray-600 pl-2">
                    <span className="text-white text-xs">{t.brushSize}:</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={penSize}
                      onChange={(e) => setPenSize(parseInt(e.target.value))}
                      className="w-16 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((penSize - 1) / 9) * 100}%, #374151 ${((penSize - 1) / 9) * 100}%, #374151 100%)`,
                      }}
                      title={`펜 크기: ${penSize}px`}
                    />
                    <span className="text-white text-xs font-mono bg-gray-700 px-1 rounded min-w-[1.5rem] text-center">
                      {penSize}
                    </span>
                  </div>
                )}

                {/* 형광펜 크기 및 투명도 조절 (형광펜일 때만) */}
                {drawingTool === 'highlighter' && (
                  <div className="flex items-center gap-4 border-l border-gray-600 pl-2">
                    {/* 크기 조절 */}
                    <div className="flex items-center gap-2">
                      <span className="text-white text-xs">{t.brushSize}:</span>
                      <input
                        type="range"
                        min="5"
                        max="25"
                        value={highlighterSize}
                        onChange={(e) => setHighlighterSize(parseInt(e.target.value))}
                        className="w-16 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #eab308 0%, #eab308 ${((highlighterSize - 5) / 20) * 100}%, #374151 ${((highlighterSize - 5) / 20) * 100}%, #374151 100%)`,
                        }}
                        title={`형광펜 크기: ${highlighterSize}px`}
                      />
                      <span className="text-white text-xs font-mono bg-gray-700 px-1 rounded min-w-[1.5rem] text-center">
                        {highlighterSize}
                      </span>
                    </div>
                    
                    {/* 투명도 조절 */}
                    <div className="flex items-center gap-2">
                      <span className="text-white text-xs">{t.opacity}:</span>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                        value={highlighterOpacity}
                        onChange={(e) => setHighlighterOpacity(parseFloat(e.target.value))}
                        className="w-16 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #fbbf24 0%, #fbbf24 ${((highlighterOpacity - 0.1) / (1.0 - 0.1)) * 100}%, #374151 ${((highlighterOpacity - 0.1) / (1.0 - 0.1)) * 100}%, #374151 100%)`,
                        }}
                        title={`${t.highlighter} ${t.opacity}: ${Math.round(highlighterOpacity * 100)}% (100%가 가장 진함)`}
                      />
                      <span className="text-white text-xs font-mono bg-gray-700 px-1 rounded min-w-[2rem] text-center">
                        {Math.round(highlighterOpacity * 100)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* 지우개 크기 조절 및 사용법 안내 (지우개일 때만) */}
                {drawingTool === 'eraser' && (
                  <div className="flex items-center gap-4 border-l border-gray-600 pl-2">
                    {/* 크기 조절 */}
                    <div className="flex items-center gap-2">
                      <span className="text-white text-xs">{t.brushSize}:</span>
                      <input
                        type="range"
                        min="5"
                        max="50"
                        value={eraserSize}
                        onChange={(e) => setEraserSize(parseInt(e.target.value))}
                        className="w-16 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${((eraserSize - 5) / 45) * 100}%, #374151 ${((eraserSize - 5) / 45) * 100}%, #374151 100%)`,
                        }}
                        title={`지우개 크기: ${eraserSize}px`}
                      />
                      <span className="text-white text-xs font-mono bg-gray-700 px-1 rounded min-w-[2rem] text-center">
                        {eraserSize}
                      </span>
                    </div>
                    
                    {/* 사용법 안내 */}
                    <div className="text-yellow-300 text-xs bg-yellow-900/30 px-2 py-1 rounded border border-yellow-600/50">
                      💡 마우스로 지울 부분을 드래그하세요 (부분 지우기)
                    </div>
                  </div>
                )}

                {/* 모든 드로잉 지우기 버튼 - 확인 대화상자 추가 */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // 확인 대화상자 추가
                    if (window.confirm(t.clearAllConfirm)) {
                      clearDrawing(e);
                    }
                  }}
                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 border border-red-500"
                  title="⚠️ 주의: 현재 화면의 모든 드로잉을 완전히 지웁니다 (되돌릴 수 없음)"
                >
                  {t.clearAll}
                </button>

                {/* 화면 캡처 버튼 */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    captureScreenDirectly(e);
                  }}
                  disabled={isSaving}
                  className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                    isSaving 
                      ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                  title="뇌 영상과 드로잉을 캡처하여 저장"
                >
                  {isSaving ? (
                    <>
                      <div className="inline-block animate-spin w-3 h-3 border border-white border-t-transparent rounded-full mr-1"></div>
                      캡처중...
                    </>
                  ) : (
                    t.save
                  )}
                </button>

              </>
            )}
          </div>
        )}


        {/* TUMOR 버튼을 뷰 모드 버튼 바로 옆으로 이동 */}
        {segmentationFiles.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-white text-xs">MRI file</span>
            <div className="relative">
              <button
                onClick={() => {
                  // TUMOR 버튼 클릭 시 현재 뷰에서 바로 segmentation 선택기 토글 (3D로 이동하지 않음)
                  setShowSegSelector(!showSegSelector);
                }}
                className={`px-2 py-1 text-xs rounded ${
                  selectedSegFile 
                    ? 'bg-orange-600 hover:bg-orange-700 animate-pulse' 
                    : 'bg-gray-600 hover:bg-gray-700'
                } text-white`}
                title={selectedSegFile ? "종양 오버레이 활성화됨" : "종양 오버레이 선택"}
              >
                {selectedSegFile ? 'TUMOR ON' : 'TUMOR'}
              </button>
              
              {/* Segmentation 파일 선택 드롭다운 */}
              {showSegSelector && (
                <div className="absolute top-full left-0 mt-1 bg-gray-700 rounded shadow-lg z-10 min-w-48">
                  <div className="p-2">
                    <div className="text-white text-xs mb-2">Segmentation 파일:</div>
                    {segmentationFiles.map((segFile) => (
                      <button
                        key={segFile.id}
                        onClick={() => {
                          setSelectedSegFile(segFile.public_url || null);
                          setShowSegSelector(false);
                          console.log('MPRViewer Segmentation 파일 선택됨:', segFile.file_name);
                        }}
                        className={`block w-full text-left px-2 py-1 text-xs rounded mb-1 ${
                          selectedSegFile === segFile.public_url
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                        }`}
                      >
                        {segFile.file_name}
                      </button>
                    ))}
                    {selectedSegFile && (
                      <button
                        onClick={() => {
                          setSelectedSegFile(null);
                          setShowSegSelector(false);
                        }}
                        className="block w-full text-left px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-700 text-white mt-2"
                      >
                        ✕ 오버레이 제거
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 컬러맵 선택 */}
        <div className="flex items-center gap-1">
          <label className="text-white text-xs">{t.colormap}:</label>
          <select
            value={currentColormap}
            onChange={(e) => handleColormapChange(e.target.value)}
            className="bg-gray-600 text-white px-1 py-1 rounded text-xs"
          >
            {availableColormaps.map((colormap) => (
              <option key={colormap} value={colormap}>
                {colormap}
              </option>
            ))}
          </select>
          <button
            onClick={toggleColormapInvert}
            className={`px-1 py-1 rounded text-xs ${
              isColormapInverted 
                ? 'bg-orange-600 text-white' 
                : 'bg-gray-600 text-white hover:bg-gray-500'
            }`}
          >
            Reverse
          </button>
          <button
            onClick={handleTumorUpload}
            className={`px-1 py-1 rounded text-xs ${
              tumorOverlayUrl 
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
{tumorOverlayUrl ? 'TUMOR ON' : 'TUMOR'}
          </button>
        </div>
        </div>

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="text-white hover:text-red-400 text-xl px-2"
        >
          ✕
        </button>
      </div>

      {/* 메인 뷰어 영역 */}
      <div className="flex-1 relative bg-black">
        
        {!file && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-400 text-center">
              <div className="text-xl">No MRI data</div>
              <div className="text-xl">Upload NIfTI file</div>
            </div>
          </div>
        )}
        
        {/* 작업중 모드 */}
        {isWorkingMode ? (
          slicePlaneMode === 'orthogonal' ? (
            /* 직교 모드 - Coronal 패널만 */
            <div className="h-full">
              {/* Coronal 뷰 - 보라색 슬라이스 (Y축) */}
              <div className="bg-gray-900 rounded flex flex-col h-full">
                <div className="text-center text-green-400 text-xs py-1 bg-gray-800 rounded-t flex items-center justify-center gap-2">
                  <span>🔧 Coronal (앞↔뒤)</span>
                  <span className="text-green-300 font-mono bg-green-900 px-1 rounded text-xs">
                    {(coronalSlicePos * 100).toFixed(0)}%
                  </span>
                </div>
                <canvas 
                  ref={workingCoronalCanvasRef} 
                  className="flex-1 w-full"
                  onWheel={(e) => {
                    try {
                      // NiiVue 인스턴스 상태 검증 (vec4/vec410 에러 방지)
                      if (!workingCoronalNvRef.current) {
                        console.warn('⚠️ 작업용 Coronal NiiVue 인스턴스가 준비되지 않음 - 휠 이벤트 무시');
                        return;
                      }
                      
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // WebGL 컨텍스트 상태 확인
                      const canvas = workingCoronalNvRef.current.canvas as HTMLCanvasElement;
                      if (canvas) {
                        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                        if (gl && gl.isContextLost()) {
                          console.warn('⚠️ 작업용 Coronal WebGL 컨텍스트 손실 - 휠 이벤트 무시');
                          return;
                        }
                      }
                      
                      const delta = e.deltaY > 0 ? 0.05 : -0.05; // 더 빠른 슬라이스 이동
                      const newPos = Math.max(0.01, Math.min(0.99, coronalSlicePos + delta));
                      setCoronalSlicePos(newPos);
                      
                      // Coronal 방향 클리핑 (Y축 - 앞↔뒤)
                      const clipPlane = [0, 1, 0, newPos - 0.5];
                      workingCoronalNvRef.current.setClipPlane(clipPlane);
                      
                      // 부드러운 화면 업데이트 (에러 처리 포함)
                      requestAnimationFrame(() => {
                        try {
                          if (workingCoronalNvRef.current) {
                            safeDrawScene(workingCoronalNvRef.current, 'Working Coronal');
                          }
                        } catch (drawError) {
                          console.error('❌ 작업용 Coronal 렌더링 에러:', drawError);
                          if (drawError instanceof Error && drawError.message && (drawError.message.includes('vec4') || drawError.message.includes('410'))) {
                            console.warn('🔧 vec4/vec410 에러 감지 - 작업용 Coronal 렌더링 건너뜀');
                          }
                        }
                      });
                    } catch (wheelError) {
                      console.error('❌ 작업용 Coronal 휠 이벤트 처리 에러:', wheelError);
                      if (wheelError instanceof Error && wheelError.message && (wheelError.message.includes('vec4') || wheelError.message.includes('410'))) {
                        console.warn('🔧 vec4/vec410 에러 감지 - 작업용 Coronal 휠 이벤트 무시');
                      }
                    }
                  }}
                />
              </div>
          </div>
          ) : (
            /* 자유 단면 모드 - 3D 뷰에서 보라색 슬라이스 평면 조작 */
            <div className="h-full bg-gray-900 rounded flex flex-col">
              <div className="text-center text-purple-400 text-xs py-1 bg-gray-800 rounded-t flex items-center justify-center gap-2">
                <span>🎯 자유 단면 모드</span>
                <span className="text-purple-300 font-mono bg-purple-900 px-1 rounded text-xs">
                  3D 조작 가능
                </span>
              </div>
              <canvas
                ref={canvasRef}
                id={viewerId}
                className="flex-1 w-full"
                onWheel={(e) => {
                  try {
                    // NiiVue 인스턴스 상태 검증 (vec4/vec410 에러 방지)
                    if (!nvRef.current) {
                      console.warn('⚠️ Oblique 모드 NiiVue 인스턴스가 준비되지 않음 - 휠 이벤트 무시');
                      return;
                    }
                    
                    // 🎮 Oblique 모드 - 마우스 휠로 보라색 슬라이스 평면 조작
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // WebGL 컨텍스트 상태 확인
                    const canvas = nvRef.current.canvas as HTMLCanvasElement;
                    if (canvas) {
                      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                      if (gl && gl.isContextLost()) {
                        console.warn('⚠️ Oblique 모드 WebGL 컨텍스트 손실 - 휠 이벤트 무시');
                        return;
                      }
                    }
                    
                    // 휠 방향에 따른 슬라이스 이동
                    const delta = e.deltaY > 0 ? 0.15 : -0.15; // 🔥 더욱 빠른 슬라이스 이동
                    
                    // 현재 십자선 위치 가져오기
                    if (nvRef.current.scene && nvRef.current.scene.crosshairPos) {
                      const crosshairPos = nvRef.current.scene.crosshairPos as number[];
                      
                      // Z축(Axial) 방향으로 슬라이스 이동 - 보라색 평면 조작
                      const currentZ = crosshairPos[2] || 0.5;
                    const newZ = Math.max(0.01, Math.min(0.99, currentZ + delta));
                    
                    // 새로운 십자선 위치 설정
                    crosshairPos[2] = newZ;
                    nvRef.current.scene.crosshairPos = crosshairPos;
                    
                    // 🔮 보라색 슬라이스 평면 업데이트 (부드러운 애니메이션 + 에러 처리)
                    requestAnimationFrame(() => {
                      try {
                        if (nvRef.current) {
                          safeDrawScene(nvRef.current);
                        }
                      } catch (drawError) {
                        console.error('❌ Oblique 모드 렌더링 에러:', drawError);
                        if (drawError instanceof Error && drawError.message && (drawError.message.includes('vec4') || drawError.message.includes('410'))) {
                          console.warn('🔧 vec4/vec410 에러 감지 - Oblique 모드 렌더링 건너뜀');
                        }
                      }
                    });
                    
                    // 성능 최적화를 위해 디버그 로그 제거
                  }
                } catch (wheelError) {
                  console.error('❌ Oblique 모드 휠 이벤트 처리 에러:', wheelError);
                  if (wheelError instanceof Error && wheelError.message && (wheelError.message.includes('vec4') || wheelError.message.includes('410'))) {
                    console.warn('🔧 vec4/vec410 에러 감지 - Oblique 모드 휠 이벤트 무시');
                  }
                }
              }}
              />
              <div className="text-center text-purple-300 text-xs py-1 bg-gray-800 rounded-b">
                🔮 마우스 휠: 보라색 슬라이스 이동 | 드래그: 360도 무제한 회전 | 클릭: 슬라이스 평면 조작
              </div>
            </div>
          )
        ) : (
          /* 기본 단일 캔버스 + Overlay Canvas */
          <div className="relative w-full h-full">
            <canvas
              ref={canvasRef}
              id={`${viewerId}-main`}
              className="w-full h-full cursor-crosshair"
              style={{ touchAction: 'none' }}
              onClick={(e) => {
                // 🎯 MPR+3D 모드에서 십자선 클릭 상호작용 처리
                if (currentSliceType === 3 && nvRef.current) {
                  // 마우스 클릭 좌표를 NiiVue 좌표계로 변환
                  const canvas = canvasRef.current;
                  if (canvas) {
                    const rect = canvas.getBoundingClientRect();
                    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
                    
                    // 🎯 MPR+3D 모드에서 4분할 화면의 각 영역 감지
                    let clickedView = '';
                    let viewX = 0, viewY = 0;
                    
                    if (x < 0.5 && y < 0.5) {
                      // 좌상단: Axial 뷰
                      clickedView = 'Axial';
                      viewX = Math.max(0, Math.min(1, x * 2)); // 0-0.5 → 0-1, 범위 검증
                      viewY = Math.max(0, Math.min(1, y * 2)); // 0-0.5 → 0-1, 범위 검증
                    } else if (x >= 0.5 && y < 0.5) {
                      // 우상단: Coronal 뷰  
                      clickedView = 'Coronal';
                      viewX = Math.max(0, Math.min(1, (x - 0.5) * 2)); // 0.5-1 → 0-1, 범위 검증
                      viewY = Math.max(0, Math.min(1, y * 2)); // 0-0.5 → 0-1, 범위 검증
                    } else if (x < 0.5 && y >= 0.5) {
                      // 좌하단: Sagittal 뷰
                      clickedView = 'Sagittal';
                      viewX = Math.max(0, Math.min(1, x * 2)); // 0-0.5 → 0-1, 범위 검증
                      viewY = Math.max(0, Math.min(1, (y - 0.5) * 2)); // 0.5-1 → 0-1, 범위 검증
                    } else {
                      // 우하단: 3D 뷰 - 십자선 업데이트 하지 않음
                      clickedView = '3D';
                      console.log('🎯 3D 뷰 클릭 - 십자선 업데이트 건너뜀');
                      return; // 3D 뷰 클릭 시 십자선 업데이트 방지
                    }
                    
                    console.log('🎯 MPR+3D 십자선 클릭:', { 
                      view: clickedView,
                      globalX: x.toFixed(3), 
                      globalY: y.toFixed(3),
                      viewX: viewX.toFixed(3),
                      viewY: viewY.toFixed(3)
                    });
                    
                    // 🎯 각 뷰별 십자선 위치 업데이트 (NiiVue 표준 좌표계 적용)
                    if (nvRef.current.scene && nvRef.current.scene.crosshairPos) {
                      const crosshairPos = [...(nvRef.current.scene.crosshairPos as number[])]; // 복사본 생성
                      
                      // 기존 좌표 검증
                      if (crosshairPos.length < 3) {
                        console.warn('⚠️ 잘못된 십자선 좌표 배열:', crosshairPos);
                        return;
                      }
                      
                      // NiiVue MPR 표준 좌표계에 맞게 매핑 (범위 검증 포함)
                      if (clickedView === 'Axial') {
                        // Axial 뷰 (Z축 슬라이스): 마우스 X → 뇌 X축, 마우스 Y → 뇌 Y축 (뒤집힘)
                        const newX = Math.max(0, Math.min(1, viewX));
                        const newY = Math.max(0, Math.min(1, 1.0 - viewY));
                        crosshairPos[0] = newX; // X축 (Left-Right)
                        crosshairPos[1] = newY; // Y축 (Posterior-Anterior, 뒤집힘)
                        console.log('🎯 Axial 뷰 클릭: X=' + (newX*100).toFixed(1) + '%, Y=' + (newY*100).toFixed(1) + '%');
                      } else if (clickedView === 'Coronal') {
                        // Coronal 뷰 (Y축 슬라이스): 마우스 X → 뇌 X축, 마우스 Y → 뇌 Z축 (뒤집힘)
                        const newX = Math.max(0, Math.min(1, viewX));
                        const newZ = Math.max(0, Math.min(1, 1.0 - viewY));
                        crosshairPos[0] = newX; // X축 (Left-Right)
                        crosshairPos[2] = newZ; // Z축 (Inferior-Superior, 뒤집힘)
                        console.log('🎯 Coronal 뷰 클릭: X=' + (newX*100).toFixed(1) + '%, Z=' + (newZ*100).toFixed(1) + '%');
                      } else if (clickedView === 'Sagittal') {
                        // Sagittal 뷰 (X축 슬라이스): 마우스 X → 뇌 Y축, 마우스 Y → 뇌 Z축 (뒤집힘)
                        const newY = Math.max(0, Math.min(1, viewX));
                        const newZ = Math.max(0, Math.min(1, 1.0 - viewY));
                        crosshairPos[1] = newY; // Y축 (Posterior-Anterior)
                        crosshairPos[2] = newZ; // Z축 (Inferior-Superior, 뒤집힘)
                        console.log('🎯 Sagittal 뷰 클릭: Y=' + (newY*100).toFixed(1) + '%, Z=' + (newZ*100).toFixed(1) + '%');
                      }
                      
                      // 최종 좌표 검증
                      const validatedPos = crosshairPos.map(coord => Math.max(0, Math.min(1, coord)));
                      
                      // 업데이트된 십자선 위치 적용
                      nvRef.current.scene.crosshairPos = validatedPos;
                      
                      // 슬라이스 상태도 동기화 (범위 검증 포함)
                      setAxialSlicePos(Math.max(0, Math.min(1, validatedPos[2])));
                      setCoronalSlicePos(Math.max(0, Math.min(1, validatedPos[1])));
                      setSagittalSlicePos(Math.max(0, Math.min(1, validatedPos[0])));
                      
                      // 단일 drawScene 호출
                      safeDrawScene(nvRef.current);
                    }
                  }
                }
                
                // 🔥 마우스 클릭 후 상태 안정화 (단일 호출로 최적화)
                console.log('🖱️ 마우스 클릭 처리 완료');
              }}
              onWheel={(e) => {
                try {
                  // 🎚️ 마우스 휠로 슬라이스바 조작 - 부드럽고 직관적 (vec4/vec410 에러 방지)
                  if (!nvRef.current) {
                    console.warn('⚠️ 메인 캔버스 NiiVue 인스턴스가 준비되지 않음 - 휠 이벤트 무시');
                    return;
                  }
                  
                  // 모든 휠 이벤트에서 기본 동작 차단 (브라우저 스크롤 방지)
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // WebGL 컨텍스트 상태 확인
                  const canvas = nvRef.current.canvas as HTMLCanvasElement;
                  if (canvas) {
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    if (gl && gl.isContextLost()) {
                      console.warn('⚠️ 메인 캔버스 WebGL 컨텍스트 손실 - 휠 이벤트 무시');
                      return;
                    }
                  }
                
                // 성능 최적화를 위해 디버그 로그 제거
                
                // 🚀 3D 모드일 때는 Brain3DView처럼 완전히 NiiVue에게 맡김
                if (currentSliceType === 4) {
                  // 3D 모드에서는 NiiVue 기본 동작만 허용하되 이벤트는 차단
                  return;
                }
                
                // 🔧 작업중 모드일 때 클리핑 방식 슬라이스 조작 (Brain3DView 방식)
                if (isWorkingMode) {
                  // 이미 위에서 preventDefault 처리됨
                  
                  const delta = e.deltaY > 0 ? 0.12 : -0.12; // 더 빠른 클리핑 이동
                  const newPos = Math.max(0.01, Math.min(0.99, workingSlicePos + delta));
                  setWorkingSlicePos(newPos);
                  
                  // Brain3DView와 동일한 클리핑 방식 (Coronal 방향)
                  const clipPlane = [0, 1, 0, newPos - 0.5]; // Y축 클리핑 (앞뒤로 자르기)
                  nvRef.current.setClipPlane(clipPlane);
                  
                  // 부드러운 화면 업데이트
                  requestAnimationFrame(() => {
                    if (nvRef.current) {
                      safeDrawScene(nvRef.current);
                    }
                  });
                  
                }
                // 🎚️ Axial, Coronal, Sagittal 뷰에서 마우스 휠로 슬라이스 + 슬라이스바 동시 이동
                else if (currentSliceType === 0 || currentSliceType === 1 || currentSliceType === 2 || currentSliceType === null) {
                  // currentSliceType이 null인 경우 자동으로 Axial(0)로 처리
                  let effectiveSliceType = currentSliceType;
                  if (effectiveSliceType === null) {
                    effectiveSliceType = 0; // Axial로 기본 설정
                    console.log('🎯 기본 슬라이스 타입을 Axial(0)로 설정');
                  }
                  // 🎚️ 마우스 휠로 슬라이스와 슬라이스바 모두 부드럽고 빠르게 이동
                  const wheelSensitivity = 0.15; // 휠 민감도 대폭 증가 (0.08 -> 0.15)
                  const delta = e.deltaY > 0 ? wheelSensitivity : -wheelSensitivity;
                  
                  let currentPos = 0.5;
                  let newPos = 0.5;
                  
                  // 현재 슬라이스 위치 가져오기 및 새 위치 계산
                  if (effectiveSliceType === 0) { // Axial
                    currentPos = axialSlicePos;
                    newPos = Math.max(0, Math.min(1, currentPos + delta));
                  } else if (effectiveSliceType === 1) { // Coronal
                    currentPos = coronalSlicePos;
                    newPos = Math.max(0, Math.min(1, currentPos + delta));
                  } else if (effectiveSliceType === 2) { // Sagittal
                    currentPos = sagittalSlicePos;
                    newPos = Math.max(0, Math.min(1, currentPos + delta));
                  }
                  
                  // 위치가 실제로 변경된 경우에만 업데이트
                  if (newPos !== currentPos && nvRef.current && nvRef.current.scene && nvRef.current.scene.crosshairPos) {
                    const crosshairPos = [...(nvRef.current.scene.crosshairPos as number[])]; // 복사본 생성
                    
                    // 좌표 배열 검증
                    if (crosshairPos.length < 3) {
                      console.warn('⚠️ 휠 이벤트 중 잘못된 십자선 좌표:', crosshairPos);
                      return;
                    }
                    
                    // 🎯 슬라이스 이미지와 슬라이스바 UI 동시 업데이트 (범위 검증 포함)
                    const validatedPos = Math.max(0, Math.min(1, newPos));
                    
                    if (effectiveSliceType === 0) { // Axial
                      crosshairPos[2] = validatedPos; // NiiVue 십자선 위치 업데이트
                      setAxialSlicePos(validatedPos); // 슬라이스바 UI 업데이트
                    } else if (effectiveSliceType === 1) { // Coronal
                      crosshairPos[1] = validatedPos; // NiiVue 십자선 위치 업데이트
                      setCoronalSlicePos(validatedPos); // 슬라이스바 UI 업데이트
                    } else if (effectiveSliceType === 2) { // Sagittal
                      crosshairPos[0] = validatedPos; // NiiVue 십자선 위치 업데이트
                      setSagittalSlicePos(validatedPos); // 슬라이스바 UI 업데이트
                    }
                    
                    // 최종 좌표 검증 후 NiiVue 장면 업데이트 (부드러운 애니메이션)
                    const finalValidatedPos = crosshairPos.map(coord => Math.max(0, Math.min(1, coord)));
                    nvRef.current.scene.crosshairPos = finalValidatedPos;
                    
                    requestAnimationFrame(() => {
                      if (nvRef.current) {
                        safeDrawScene(nvRef.current);
                      }
                    });
                  }
                }
                // MPR+3D 모드에서 마우스 휠 = 슬라이스 이동 (NiiVue 기본 MPR 방식)
                else if (currentSliceType === 3) {
                  // MPR+3D 모드에서는 NiiVue의 기본 동작을 허용하되 상호작용 강화
                  // preventDefault를 하지 않아서 NiiVue 자체의 MPR 동작이 작동
                  
                  // 십자선 위치 업데이트 강제 실행
                  setTimeout(() => {
                    if (nvRef.current && nvRef.current.scene && nvRef.current.scene.crosshairPos) {
                      const crosshairPos = nvRef.current.scene.crosshairPos as number[];
                      console.log('🎡 MPR+3D 십자선 위치 업데이트:', {
                        x: (crosshairPos[0] * 100).toFixed(1) + '%',
                        y: (crosshairPos[1] * 100).toFixed(1) + '%', 
                        z: (crosshairPos[2] * 100).toFixed(1) + '%'
                      });
                      safeDrawScene(nvRef.current);
                    }
                  }, 50); // 휠 이벤트 후 십자선 위치 업데이트
                  
                  console.log('🎡 MPR+3D 뷰: NiiVue 기본 MPR 동작 (십자선 이동 시 슬라이스 동기화, 휠로 슬라이스 이동)');
                }
                // Oblique 모드에서도 기본 NiiVue 동작 허용 (확대/축소)
                else {
                  console.log('🎡 Oblique 뷰: 마우스 휠 확대/축소');
                }
              } catch (wheelError) {
                console.error('❌ 메인 캔버스 휠 이벤트 처리 에러:', wheelError);
                // vec4/vec410 관련 에러인지 확인
                if (wheelError instanceof Error && wheelError.message && (wheelError.message.includes('vec4') || wheelError.message.includes('410'))) {
                  console.warn('🔧 vec4/vec410 에러 감지 - 메인 캔버스 휠 이벤트 무시');
                }
              }
            }}
            />
            
            {/* Overlay Canvas for Drawing - 그리기 모드일 때만 활성화 */}
            {isDrawingMode && slicePlaneMode !== 'oblique' && currentSliceType !== 4 ? (
              <canvas
                ref={overlayCanvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-auto"
                style={{ 
                  zIndex: 10,
                  cursor: drawingTool === 'eraser' ? 'crosshair' : 'crosshair'
                }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            ) : (
              <canvas
                ref={overlayCanvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ 
                  zIndex: -10,
                  display: 'none' // 완전히 숨김으로 마우스 이벤트 차단 방지
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* NilVue 스타일 하단 컨트롤 바 */}
      <div className="bg-black border-t border-gray-700">
        {/* 메인 컬러바 영역 */}
        <div className="flex items-center justify-center py-2 px-4 bg-gray-900">
          {/* 왼쪽 컬러바 (기본 이미지용) */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-2xl">
              {/* 컬러바 그라데이션 */}
              <div className="relative h-8 mb-2">
                <div 
                  className="w-full h-full rounded border border-gray-600"
                  style={{
                    background: getGammaCorrectedGradient(currentColormap, gamma, isColormapInverted)
                  }}
                />
                {/* 컬러바 눈금 */}
                <div className="absolute -bottom-4 left-0 text-xs text-gray-400">0</div>
                <div className="absolute -bottom-4 left-1/4 text-xs text-gray-400">25</div>
                <div className="absolute -bottom-4 left-1/2 text-xs text-gray-400">50</div>
                <div className="absolute -bottom-4 left-3/4 text-xs text-gray-400">75</div>
                <div className="absolute -bottom-4 right-0 text-xs text-gray-400">100</div>
              </div>
            </div>
          </div>
          
          {/* 오른쪽 오버레이 컬러바 (오버레이가 있을 때만) */}
          {(hasOverlay || selectedSegFile) && (
            <div className="flex-1 flex items-center justify-center ml-8">
              <div className="w-full max-w-md">
                <div className="relative h-8 mb-2">
                  <div 
                    className="w-full h-full rounded border border-gray-600"
                    style={{
                      background: overlayColormap === 'red'
                        ? 'linear-gradient(to right, transparent, #ff0000, #ff8080)'
                        : overlayColormap === 'blue'
                        ? 'linear-gradient(to right, transparent, #0000ff, #8080ff)'
                        : overlayColormap === 'green'
                        ? 'linear-gradient(to right, transparent, #00ff00, #80ff80)'
                        : overlayColormap === 'yellow'
                        ? 'linear-gradient(to right, transparent, #ffff00, #ffff80)'
                        : overlayColormap === 'hot'
                        ? 'linear-gradient(to right, transparent, #ff0000, #ffff00, #ffffff)'
                        : 'linear-gradient(to right, transparent, #ff0000, #ff8080)'
                    }}
                  />
                  {/* 오버레이 컬러바 눈금 */}
                  <div className="absolute -bottom-4 left-0 text-xs text-gray-400">0</div>
                  <div className="absolute -bottom-4 right-0 text-xs text-gray-400">3</div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* 컨트롤 슬라이더 영역 */}
        <div className="bg-gray-800 px-4 py-3 border-t border-gray-700">
          <div className="flex items-center justify-center gap-8">
            {/* 컬러맵 선택 */}
            <div className="flex items-center gap-2">
              <label className="text-white text-sm font-medium">{t.colormap}:</label>
              <select
                value={currentColormap}
                onChange={(e) => handleColormapChange(e.target.value)}
                className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 text-sm focus:border-blue-500 focus:outline-none"
              >
                {availableColormaps.map((colormap) => (
                  <option key={colormap} value={colormap}>
                    {colormap}
                  </option>
                ))}
              </select>
            </div>

            {/* 감마 조정 */}
            <div className="flex items-center gap-2">
              <label className="text-white text-sm font-medium">{t.gamma}:</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={gamma}
                  onChange={(e) => handleGammaChange(parseFloat(e.target.value))}
                  className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((gamma - 0.1) / 2.9) * 100}%, #374151 ${((gamma - 0.1) / 2.9) * 100}%, #374151 100%)`,
                    WebkitAppearance: 'none',
                    outline: 'none'
                  }}
                />
                <span className="text-white text-sm font-mono bg-gray-700 px-2 py-1 rounded min-w-[3rem] text-center">
                  {gamma.toFixed(1)}
                </span>
              </div>
            </div>

            {/* 🎚️ 슬라이스 조정 (감마바 옆에 배치) */}
            {(currentSliceType === 0 || currentSliceType === 1 || currentSliceType === 2) && (
              <div className="flex items-center gap-2">
                <label className="text-blue-400 text-sm font-medium">
                  {currentSliceType === 0 ? 'Axial' : currentSliceType === 1 ? 'Coronal' : 'Sagittal'}:
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={currentSliceType === 0 ? axialSlicePos : currentSliceType === 1 ? coronalSlicePos : sagittalSlicePos}
                  onChange={(e) => {
                    const newPos = parseFloat(e.target.value);
                    updateSlicePosition(currentSliceType, newPos);
                  }}
                  className="mpr-slice-slider w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentSliceType === 0 ? axialSlicePos : currentSliceType === 1 ? coronalSlicePos : sagittalSlicePos) * 100}%, #4b5563 ${(currentSliceType === 0 ? axialSlicePos : currentSliceType === 1 ? coronalSlicePos : sagittalSlicePos) * 100}%, #4b5563 100%)`,
                    WebkitAppearance: 'none',
                    outline: 'none'
                  }}
                />
              </div>
            )}

            {/* 오버레이 컨트롤 (오버레이가 있을 때만) */}
            {(hasOverlay || selectedSegFile) && (
              <div className="flex items-center gap-4 border-l border-gray-600 pl-4">
                {/* 오버레이 투명도 */}
                <div className="flex items-center gap-2">
                  <label className="text-orange-400 text-sm font-medium">{t.opacity}:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.1"
                      value={overlayOpacity}
                      onChange={(e) => handleOverlayOpacityChange(parseFloat(e.target.value))}
                      className="overlay-slider w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #f97316 0%, #f97316 ${overlayOpacity * 100}%, #374151 ${overlayOpacity * 100}%, #374151 100%)`,
                        WebkitAppearance: 'none',
                        outline: 'none'
                      }}
                    />
                    <span className="text-orange-400 text-sm font-mono bg-gray-700 px-2 py-1 rounded min-w-[2.5rem] text-center">
                      {overlayOpacity.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* 오버레이 컬러맵 */}
                <div className="flex items-center gap-2">
                  <label className="text-orange-400 text-sm font-medium">{t.color}:</label>
                  <select
                    value={overlayColormap}
                    onChange={(e) => handleOverlayColormapChange(e.target.value)}
                    className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 text-sm focus:border-orange-500 focus:outline-none"
                  >
                    <option value="red">{t.red}</option>
                    <option value="blue">{t.blue}</option>
                    <option value="green">{t.green}</option>
                    <option value="yellow">{t.yellow}</option>
                    <option value="hot">{t.hot}</option>
                    <option value="cool">{t.cool}</option>
                    <option value="jet">{t.jet}</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
        

      </div>
      
      {/* 숨겨진 TUMOR 파일 입력 */}
      {/* 파일 입력 제거 - 이제 자동으로 seg.nii.gz 파일을 로드함 */}
    </div>
    </>
  );
}

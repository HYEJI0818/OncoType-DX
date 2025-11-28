'use client';

import { useEffect, useRef, useState, useId, useCallback } from 'react';
// import { Niivue } from '@niivue/niivue'; // 동적 import로 변경

// NiiVue 타입 정의 (동적 import를 위한)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NiivueInstance = any;

// 슬라이더 CSS 스타일 (Breast3DView와 동일)
const sliderStyle = `
  .niivue-slice-slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ffffff;
    border: 2px solid #3b82f6;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  
  .niivue-slice-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ffffff;
    border: 2px solid #3b82f6;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
`;

interface NiftiHeader {
  dims: number[];
  pixDims: number[];
  affine?: number[][];
  [key: string]: unknown;
}

interface NiiVueSliceViewerProps {
  fileUrl?: string;
  title: string;
  className?: string;
  niftiHeader?: NiftiHeader;
  niftiImage?: ArrayBuffer;
  plane?: 'axial' | 'coronal' | 'sagittal';
  // slice 제거 - 각 뷰어가 독립적으로 관리
  patientId?: number;
  originalNiftiUrl?: string;
  globalSelectedSegFile?: string | null;
  tumorOverlayUrl?: string | null; // Tumor 오버레이 URL 추가
  maxSlice?: number; // 최대 슬라이스 수 제한
}

export default function NiiVueSliceViewer({ 
  fileUrl, 
  title, 
  className = '',
  niftiHeader,
  niftiImage,
  plane = 'axial',
  // slice 제거 - 각 뷰어가 독립적으로 관리
  patientId,
  originalNiftiUrl,
  globalSelectedSegFile,
  tumorOverlayUrl,
  maxSlice
}: NiiVueSliceViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nvRef = useRef<NiivueInstance | null>(null);
  
  // 각 뷰어 인스턴스를 고유하게 식별하기 위한 ID (hydration 안전)
  const uniqueId = useId();
  const viewerId = `niivue-${plane}-${uniqueId.replace(/:/g, '-')}`;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  
  // 슬라이스 관련 상태
  const [currentSlice, setCurrentSlice] = useState(0);
  const [maxSlices, setMaxSlices] = useState(0);
  
  // Zoom 기능을 위한 상태 (Breast3DView와 완전히 동일)
  const [zoomLevel, setZoomLevel] = useState(50); // 50%로 시작
  const [isZoomDragging, setIsZoomDragging] = useState(false);
  
  // Segmentation 데이터 상태
  const [hasOverlay, setHasOverlay] = useState(false);
  
  // 종양 자동 슬라이스 이동 관련 상태
  const [tumorSliceData, setTumorSliceData] = useState<number[] | null>(null); // 각 슬라이스별 종양 픽셀 수
  const [bestTumorSlice, setBestTumorSlice] = useState<number | null>(null); // 종양이 가장 많은 슬라이스

  // 슬라이스 변경 핸들러 (성능 최적화 및 부드러운 애니메이션)
  const handleSliceChange = useCallback((newSlice: number) => {
    if (!nvRef.current || maxSlices === 0) return;
    
    const clampedSlice = Math.max(0, Math.min(maxSlices - 1, newSlice));
    if (clampedSlice === currentSlice) return; // 동일한 슬라이스면 처리하지 않음
    
    setCurrentSlice(clampedSlice);
    
    // 부드러운 슬라이스 전환을 위한 requestAnimationFrame 사용
    requestAnimationFrame(() => {
      if (!nvRef.current) return;
      
      // NiiVue에서 슬라이스 위치 설정 (0-1 범위로 정규화)
      const slicePos = clampedSlice / (maxSlices - 1);
      
      // 각 plane에 따라 적절한 축으로 슬라이스 설정
      if (nvRef.current.scene && nvRef.current.scene.crosshairPos) {
        const pos = [...nvRef.current.scene.crosshairPos];
        
        switch (plane) {
          case 'axial':
            pos[2] = slicePos; // Z축
            break;
          case 'coronal':
            pos[1] = slicePos; // Y축
            break;
          case 'sagittal':
            pos[0] = slicePos; // X축
            break;
        }
        
        nvRef.current.scene.crosshairPos = pos;
        nvRef.current.drawScene();
      }
    });
  }, [plane, currentSlice, maxSlices]);

  // 확대/축소 핸들러 (useEffect보다 먼저 선언)
  const handleZoomChange = useCallback((newZoom: number) => {
    console.log(`🎯 ${plane} handleZoomChange 호출:`, {
      이전줌: zoomLevel,
      새줌: newZoom,
      nvRef존재: !!nvRef.current,
      canvas존재: !!canvasRef.current
    });
    
    setZoomLevel(newZoom);
    
    if (nvRef.current && canvasRef.current) {
      // 10-100을 0.2-1.5 범위로 변환 (50%일 때 약 0.85x)
      const scale = 0.2 + ((newZoom - 10) / 90) * 1.3;
      
      try {
        // CSS transform을 사용한 줌 (가장 확실한 방법)
        const canvas = canvasRef.current;
        canvas.style.transform = `scale(${scale})`;
        canvas.style.transformOrigin = 'center center';
        
        console.log(`✅ ${plane} CSS 줌 적용: ${newZoom}% (scale: ${scale.toFixed(2)})`);
        
        // NiiVue 내부 줌도 시도 (선택사항)
        if (nvRef.current) {
          try {
            if (nvRef.current.scene) {
              nvRef.current.scene.volScaleMultiplier = scale;
            }
            nvRef.current.drawScene();
            console.log(`✅ ${plane} NiiVue 줌도 적용됨`);
          } catch (niiVueError) {
            console.warn(`⚠️ ${plane} NiiVue 줌 실패 (CSS는 성공):`, niiVueError);
          }
        }
      } catch (error) {
        console.error(`❌ ${plane} 줌 적용 오류:`, error);
      }
    } else {
      console.warn(`⚠️ ${plane} 줌 적용 불가: nvRef=${!!nvRef.current}, canvas=${!!canvasRef.current}`);
    }
  }, [plane, zoomLevel]);

  // 마우스 휠 이벤트 리스너 (passive 문제 해결)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      try {
        // 항상 기본 동작 차단 (브라우저 스크롤 방지)
        e.preventDefault();
        e.stopPropagation();
        
        // NiiVue 인스턴스 상태 검증 (vec4/vec410 에러 방지)
        if (!nvRef.current || maxSlices === 0) {
          console.warn('⚠️ NiiVue 슬라이스 뷰어가 준비되지 않음 - 휠 이벤트 무시');
          return;
        }
        
        // WebGL 컨텍스트 상태 확인
        const canvas = nvRef.current.canvas as HTMLCanvasElement;
        if (canvas) {
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (gl && gl.isContextLost()) {
            console.warn('⚠️ WebGL 컨텍스트 손실 - 휠 이벤트 무시');
            return;
          }
        }
        
        // 🎯 Ctrl+마우스 휠 또는 Shift+마우스 휠: 줌 기능
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
          
          const zoomSensitivity = 5; // 줌 민감도
          const delta = e.deltaY > 0 ? -zoomSensitivity : zoomSensitivity;
          const newZoom = Math.max(10, Math.min(100, zoomLevel + delta));
          
          if (newZoom !== zoomLevel) {
            handleZoomChange(newZoom);
          }
          return;
        }
        
        // 🎚️ 일반 마우스 휠: 슬라이스 변경
        
        const wheelSensitivity = 3; // 휠 민감도 증가 (1 -> 3 슬라이스 단위)
        const delta = e.deltaY > 0 ? wheelSensitivity : -wheelSensitivity;
        
        const newSlice = Math.max(0, Math.min(maxSlices - 1, currentSlice + delta));
        
        // 슬라이스가 실제로 변경된 경우에만 업데이트
        if (newSlice !== currentSlice) {
          handleSliceChange(newSlice);
        }
      } catch (wheelError) {
        console.error('❌ NiiVue 슬라이스 뷰어 휠 이벤트 처리 에러:', wheelError);
        // vec4/vec410 관련 에러인지 확인
        if (wheelError instanceof Error && wheelError.message && (wheelError.message.includes('vec4') || wheelError.message.includes('410'))) {
          console.warn('🔧 vec4/vec410 에러 감지 - 슬라이스 뷰어 이벤트 무시');
        }
      }
    };

    // passive: false로 이벤트 리스너 등록
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [plane, zoomLevel, currentSlice, maxSlices, handleZoomChange, handleSliceChange]);

  // 종양 데이터 분석하여 가장 좋은 슬라이스 찾기 (개선된 버전)
  const analyzeTumorData = async (nv: NiivueInstance, overlayVolume: { hdr?: unknown; img?: unknown; header?: unknown; data?: unknown; dims?: unknown } | null) => {
    try {
      console.log('🔍 종양 데이터 분석 시작 (개선된 버전)...');
      
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

      console.log('볼륨 데이터 구조:', {
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
      
      console.log('정규화된 볼륨 차원:', { nx, ny, nz, plane, totalVoxels: nx * ny * nz });

      // 이미지 데이터 타입 확인 및 변환
      let pixelArray;
      if (imageData instanceof ArrayBuffer) {
        // Float32Array로 변환 시도
        pixelArray = new Float32Array(imageData);
      } else if (imageData instanceof Uint8Array || imageData instanceof Uint16Array || imageData instanceof Float32Array) {
        pixelArray = imageData;
      } else if (Array.isArray(imageData)) {
        pixelArray = imageData;
      } else {
        console.log('❌ 지원되지 않는 이미지 데이터 타입:', typeof imageData);
        return;
      }

      console.log('픽셀 배열 정보:', {
        type: pixelArray.constructor.name,
        length: pixelArray.length,
        expectedLength: nx * ny * nz
      });

      // 평면에 따라 슬라이스 방향 결정
      let sliceCount: number;
      let getSliceIndex: (slice: number, x: number, y: number) => number;
      
      switch (plane) {
        case 'axial':
          sliceCount = nz;
          getSliceIndex = (z: number, x: number, y: number) => z * nx * ny + y * nx + x;
          break;
        case 'coronal':
          sliceCount = ny;
          getSliceIndex = (y: number, x: number, z: number) => z * nx * ny + y * nx + x;
          break;
        case 'sagittal':
          sliceCount = nx;
          getSliceIndex = (x: number, y: number, z: number) => z * nx * ny + y * nx + x;
          break;
        default:
          console.log('❌ 지원하지 않는 평면:', plane);
          return;
      }

      // 개발 환경에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.log(`${plane} 평면에서 ${sliceCount}개 슬라이스 분석 중...`);
      }

      // 각 슬라이스별 종양 픽셀 수 계산
      const sliceTumorCounts: number[] = [];
      let totalTumorPixels = 0;
      
      for (let slice = 0; slice < sliceCount; slice++) {
        let tumorPixels = 0;
        
        // 해당 슬라이스의 모든 픽셀 검사
        const maxI = plane === 'axial' ? nx : plane === 'coronal' ? nx : ny;
        const maxJ = plane === 'axial' ? ny : plane === 'coronal' ? nz : nz;
        
        for (let i = 0; i < maxI; i++) {
          for (let j = 0; j < maxJ; j++) {
            let pixelIndex: number;
            
            switch (plane) {
              case 'axial':
                pixelIndex = getSliceIndex(slice, i, j);
                break;
              case 'coronal':
                pixelIndex = getSliceIndex(slice, i, j);
                break;
              case 'sagittal':
                pixelIndex = getSliceIndex(slice, j, i);
                break;
              default:
                continue;
            }
            
            // 배열 범위 확인 및 종양 픽셀 검사
            if (pixelIndex >= 0 && pixelIndex < pixelArray.length) {
              const pixelValue = pixelArray[pixelIndex];
              // 다양한 임계값으로 종양 픽셀 검사 (0이 아닌 값, NaN이 아닌 값)
              if (pixelValue && !isNaN(pixelValue) && pixelValue > 0.1) {
                tumorPixels++;
                totalTumorPixels++;
              }
            }
          }
        }
        
        sliceTumorCounts.push(tumorPixels);
      }

      // 개발 환경에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.log('슬라이스별 종양 픽셀 수:', sliceTumorCounts);
        console.log('총 종양 픽셀 수:', totalTumorPixels);
      }

      // 종양이 전혀 없는 경우 처리
      if (totalTumorPixels === 0) {
        console.log('⚠️ 종양 픽셀이 발견되지 않았습니다. 다른 임계값으로 재시도...');
        
        // 더 낮은 임계값으로 재시도
        for (let slice = 0; slice < sliceCount; slice++) {
          let tumorPixels = 0;
          
          const maxI = plane === 'axial' ? nx : plane === 'coronal' ? nx : ny;
          const maxJ = plane === 'axial' ? ny : plane === 'coronal' ? nz : nz;
          
          for (let i = 0; i < maxI; i++) {
            for (let j = 0; j < maxJ; j++) {
              let pixelIndex: number;
              
              switch (plane) {
                case 'axial':
                  pixelIndex = getSliceIndex(slice, i, j);
                  break;
                case 'coronal':
                  pixelIndex = getSliceIndex(slice, i, j);
                  break;
                case 'sagittal':
                  pixelIndex = getSliceIndex(slice, j, i);
                  break;
                default:
                  continue;
              }
              
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
        
        // 개발 환경에서만 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.log('재시도 후 슬라이스별 종양 픽셀 수:', sliceTumorCounts);
        }
      }

      // 가장 많은 종양 픽셀을 가진 슬라이스 찾기
      const maxTumorPixels = Math.max(...sliceTumorCounts);
      const bestSlice = sliceTumorCounts.indexOf(maxTumorPixels);
      
      // 개발 환경에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ 최적 슬라이스: ${bestSlice} (종양 픽셀: ${maxTumorPixels}개)`);
      }

      // 상태 업데이트
      setTumorSliceData(sliceTumorCounts);
      setBestTumorSlice(bestSlice);

      // 자동으로 최적 슬라이스로 이동 (종양이 있는 경우에만)
      if (maxTumorPixels > 0 && nv && nv.scene) {
        // 개발 환경에서만 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.log(`🎯 슬라이스 ${bestSlice}로 자동 이동...`);
        }
        
        // 슬라이스 위치를 0-1 범위로 정규화
        const normalizedPosition = bestSlice / Math.max(1, sliceCount - 1);
        
        // NiiVue의 슬라이스 위치 설정
        if (nv.scene.crosshairPos && Array.isArray(nv.scene.crosshairPos)) {
          const newPos = [...nv.scene.crosshairPos];
          
          switch (plane) {
            case 'axial':
              newPos[2] = normalizedPosition; // Z축
              break;
            case 'coronal':
              newPos[1] = normalizedPosition; // Y축
              break;
            case 'sagittal':
              newPos[0] = normalizedPosition; // X축
              break;
          }
          
          nv.scene.crosshairPos = newPos;
          setCurrentSlice(bestSlice);
          
          // 화면 업데이트
          nv.updateGLVolume();
          
          // 개발 환경에서만 로그 출력
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ 슬라이스 이동 완료: ${bestSlice} (정규화 위치: ${normalizedPosition})`);
          }
        }
      } else if (maxTumorPixels === 0 && process.env.NODE_ENV === 'development') {
        console.log('⚠️ 종양이 발견되지 않아 자동 이동하지 않습니다.');
      }

    } catch (error) {
      console.error('❌ 종양 데이터 분석 실패:', error);
      console.error('스택 트레이스:', (error as Error).stack);
    }
  };

  // NiiVue 초기화
  useEffect(() => {
    if (typeof window !== 'undefined' && canvasRef.current) {
      const initNiivue = async () => {
        try {
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
        
        const niivueModule = await import('@niivue/niivue');
        const { Niivue } = niivueModule;
          // vec4 오류 방지를 위한 안전한 NiiVue 인스턴스 생성
          const nv = new Niivue({
            // 2D 슬라이스 뷰 설정 (십자선 완전 제거)
            show3Dcrosshair: false, // 2D에서는 크로스헤어 비활성화
            logLevel: 'error', // vec4 오류 방지를 위해 error로 변경
            backColor: [0, 0, 0, 1],
            isColorbar: false,
            isRuler: false,
            isOrientCube: false, // 2D에서는 방향 큐브 비활성화
            
            // vec4 오류 방지를 위한 추가 설정
            loadingText: '', // 로딩 텍스트 비활성화
            isNearestInterpolation: false, // 부드러운 보간
            meshThicknessOn2D: 0, // 2D 메시 두께 최소화
            
            // 십자선 완전 제거를 위한 추가 설정
            crosshairWidth: 0, // 십자선 두께를 0으로 설정
            crosshairGap: 0, // 십자선 간격을 0으로 설정
            crosshairColor: [0, 0, 0, 0], // 십자선 색상을 완전 투명으로 설정
            
            // 2D 슬라이스 모드 설정
            dragMode: 1, // 슬라이스 이동 모드
            multiplanarShowRender: 0, // 3D 렌더링 비활성화
            isSliceMM: true, // 방향 라벨 항상 표시
            
            // 마우스 휠 관련 설정 (부드러운 슬라이스 변경) - 올바른 매핑 적용
            sliceType: plane === 'axial' ? 0 : plane === 'coronal' ? 1 : 2, // ✅ 확정 매핑: Axial=0, Coronal=1, Sagittal=2
            
            // 🏥 표준 방사선학적 관례 사용 (의학적 표준)
            isRadiologicalConvention: true, // 방사선학적 관례 사용 (표준)
            
            // 줌 관련 설정 추가
            isResizeCanvas: true,
          });
          
          nvRef.current = nv;
          
          // 캔버스 연결 전 추가 안전 검사
          if (canvasRef.current && canvasRef.current.parentElement) {
            await nv.attachToCanvas(canvasRef.current);
            
            // WebGL 컨텍스트 안정성 확인
            if (!nv.gl || nv.gl.isContextLost()) {
              throw new Error('WebGL 컨텍스트가 손실되었습니다.');
            }
          } else {
            console.warn(`⚠️ ${plane} 뷰어 캔버스가 DOM에 연결되지 않음`);
            return;
          }
          
          // 평면별 슬라이스 타입 명시적 설정 - 해부학적 방향 확실히 고정
          // 테스트 매핑 적용
          let sliceType = 0;
          switch (plane) {
            case 'axial': sliceType = 0; break;    // ✅ 확정: Axial = 0
            case 'coronal': sliceType = 1; break;  // 추정: Coronal = 1  
            case 'sagittal': sliceType = 2; break; // 추정: Sagittal = 2
          }
          
          // 개발 환경에서만 로그 출력
          if (process.env.NODE_ENV === 'development') {
            console.log(`🎯 ${plane} 뷰어 (초기화): 슬라이스 타입 ${sliceType}으로 강제 설정`);
          }
          
          // 슬라이스 타입 여러 번 적용 (확실히 고정)
          nv.setSliceType(sliceType);
          nv.opts.sliceType = sliceType; // 옵션으로도 설정
          
          // 방향 고정 완료
          
          // 개발 환경에서만 로그 출력
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ ${plane} 뷰어 (초기화): 해부학적 방향 고정 완료 (sliceType: ${sliceType})`);
          }
          
          // 초기화 시에도 즉시 화면 업데이트
          nv.updateGLVolume();
          nv.drawScene();
          
        } catch (error) {
          console.error('NiiVue 초기화 실패:', error);
        }
      };
      
      initNiivue();
    }

    return () => {
      nvRef.current = null;
    };
  }, []);

  // 데이터 로드 - 최적화된 버전
  useEffect(() => {
    const loadData = async () => {
      try {
        if (originalNiftiUrl && nvRef.current) {
          await loadFromOriginalUrl();
        } else if (niftiImage && nvRef.current) {
          await loadFromBuffer();
        } else if (nvRef.current) {
          // originalNiftiUrl과 niftiImage가 모두 없으면 볼륨 제거 (초기화)
          nvRef.current.volumes = [];
          // drawScene 호출을 debounce하여 깜빡임 방지
          const timeoutId = setTimeout(() => {
            if (nvRef.current && nvRef.current.volumes.length === 0) {
              try {
                nvRef.current.drawScene();
              } catch (error) {
                console.warn('NiiVueSliceViewer: drawScene 오류 (볼륨 없음):', error);
              }
            }
          }, 100);
          
          setFile(null);
          setMaxSlices(0);
          setCurrentSlice(0);
          
          return () => clearTimeout(timeoutId);
        }
      } catch (error) {
        console.error('NiiVueSliceViewer: 데이터 로드 오류:', error);
      }
    };
    loadData();
  }, [originalNiftiUrl, niftiImage, loadFromOriginalUrl, loadFromBuffer]);

  // 슬라이스 타입 설정 (plane에 따라) - 최적화된 버전
  useEffect(() => {
    if (nvRef.current && file) {
      let sliceType = 0; // 기본값: axial
      
      switch (plane) {
        case 'axial':
          sliceType = 0;
          break;
        case 'coronal':
          sliceType = 1;
          break;
        case 'sagittal':
          sliceType = 2;
          break;
      }
      
      // 상태 변경을 배치 처리하여 깜빡임 방지
      const updateViewer = () => {
        if (nvRef.current) {
          nvRef.current.setSliceType(sliceType);
          nvRef.current.drawScene();
          
          // 슬라이스 정보 업데이트
          updateSliceInfo();
        }
      };
      
      // 즉시 업데이트
      updateViewer();
      
      // 파일 로드 시 자동으로 50% 줌 적용 (debounced)
      const zoomTimeoutId = setTimeout(() => {
        handleZoomChange(50);
      }, 150);
      
      return () => clearTimeout(zoomTimeoutId);
    }
  }, [plane, file]);

  // 외부 slice prop 제거됨 - 각 뷰어가 독립적으로 관리
  // useEffect 제거

  // 원본 NIfTI URL에서 로드
  const loadFromOriginalUrl = useCallback(async () => {
    if (!nvRef.current || !originalNiftiUrl) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // 기본 뇌 이미지 로드
      const volumeList = [{ 
        url: originalNiftiUrl,
        name: 'breast.nii',
        colormap: 'gray'
      }];
      
      await nvRef.current.loadVolumes(volumeList);
      
      if (nvRef.current.volumes && nvRef.current.volumes.length > 0) {
        // 슬라이스 타입 설정 - 해부학적 방향 확실히 고정
        let sliceType = 0;
        switch (plane) {
          case 'axial': sliceType = 0; break;    // ✅ 확정: Axial = 0
          case 'coronal': sliceType = 1; break;  // 추정: Coronal = 1  
          case 'sagittal': sliceType = 2; break; // 추정: Sagittal = 2
        }
        
        // 개발 환경에서만 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.log(`🎯 ${plane} 뷰어 (URL 로드): 슬라이스 타입 ${sliceType}으로 강제 설정`);
        }
        
        try {
          // 슬라이스 타입 여러 번 적용 (확실히 고정)
          nvRef.current.setSliceType(sliceType);
          nvRef.current.opts.sliceType = sliceType; // 옵션으로도 설정
          nvRef.current.opts.multiplanarShowRender = 0; // 3D 렌더링 비활성화
          
          // 방향 고정 완료
          
          // 개발 환경에서만 로그 출력
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ ${plane} 뷰어 (URL 로드): 해부학적 방향 고정 완료 (sliceType: ${sliceType})`);
          }
          
          // 즉시 화면 업데이트 (방향 즉시 반영)
          nvRef.current.updateGLVolume();
          nvRef.current.drawScene();
          
          // 십자선 완전 제거 (슬라이스 타입 설정 후에도 확실히 적용)
          nvRef.current.opts.show3Dcrosshair = false;
          nvRef.current.opts.crosshairWidth = 0;
          nvRef.current.opts.crosshairColor = [0, 0, 0, 0];
          
          // 볼륨 설정 - 안전한 접근
          if (nvRef.current.volumes[0]) {
            nvRef.current.volumes[0].opacity = 1.0;
            nvRef.current.updateGLVolume();
          }
          
          // 전역 segmentation 파일이 있으면 오버레이 추가
          if (globalSelectedSegFile) {
            await loadSegmentationOverlay();
          }
          
          // Tumor 오버레이가 있으면 추가
          if (tumorOverlayUrl) {
            // 개발 환경에서만 로그 출력
            if (process.env.NODE_ENV === 'development') {
              console.log(`🔥 ${plane} NiiVueSliceViewer: 초기화 시 tumorOverlayUrl 발견, 로드 시도`);
            }
            await loadTumorOverlay();
          }
          
          nvRef.current.drawScene();
          updateSliceInfo();
        } catch (drawError) {
          console.warn('NiiVueSliceViewer: 렌더링 오류:', drawError);
        }
        
        // 파일 로드 완료 후 50% 줌 적용
        setTimeout(() => {
          handleZoomChange(50);
        }, 200);
      }
      
      setFile(new File([new ArrayBuffer(0)], 'breast.nii'));
      
    } catch (error) {
      console.error('NiiVue 슬라이스 뷰어 로드 실패:', error);
      setError('파일 로드 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [originalNiftiUrl, plane, globalSelectedSegFile, tumorOverlayUrl]);

  // ArrayBuffer에서 로드
  const loadFromBuffer = useCallback(async () => {
    if (!nvRef.current || !niftiImage) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // 개발 환경에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.log('NiiVueSliceViewer: ArrayBuffer에서 로드 시작', {
          niftiImageType: typeof niftiImage,
          niftiImageLength: niftiImage.byteLength,
          isArrayBuffer: niftiImage instanceof ArrayBuffer
        });
      }
      
      // ArrayBuffer 유효성 검사
      if (!niftiImage || niftiImage.byteLength === 0) {
        throw new Error('빈 NIfTI 데이터입니다.');
      }
      
      // 이미 파싱된 이미지 데이터인 경우 직접 사용
      // (NIfTISliceViewer에서 nifti.readImage()로 파싱된 데이터)
      console.log('이미 파싱된 NIfTI 이미지 데이터 사용');
      
      let processBuffer = niftiImage;
      
      // ArrayBuffer가 아닌 경우 변환
      if (!(niftiImage instanceof ArrayBuffer)) {
        if ((niftiImage as any) instanceof Uint8Array) {
          const typedArray = niftiImage as Uint8Array;
          processBuffer = typedArray.buffer.slice(typedArray.byteOffset, typedArray.byteOffset + typedArray.byteLength) as ArrayBuffer;
        } else if ((niftiImage as any) instanceof Float32Array) {
          const typedArray = niftiImage as Float32Array;
          processBuffer = typedArray.buffer.slice(typedArray.byteOffset, typedArray.byteOffset + typedArray.byteLength) as ArrayBuffer;
        } else {
          throw new Error('지원되지 않는 데이터 형식입니다.');
        }
      }
      
      console.log('파싱된 이미지 데이터 정보:', {
        type: processBuffer.constructor.name,
        byteLength: processBuffer.byteLength
      });
      
      // 파싱된 이미지 데이터를 NiiVue가 이해할 수 있는 형태로 변환
      if (niftiHeader) {
        // 개발 환경에서만 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.log('헤더 정보와 함께 NiiVue 볼륨 생성');
        }
        
        // NiiVue의 NVImage 형태로 볼륨 생성
        const nvImage = {
          hdr: niftiHeader,
          img: processBuffer,
          name: 'breast.nii',
          id: 0,
          colormap: 'gray',
          opacity: 1.0,
          visible: true
        };
        
        // 볼륨을 NiiVue에 추가
        nvRef.current.volumes = [nvImage];
        
        // NiiVue 내부 상태 업데이트
        nvRef.current.updateGLVolume();
        nvRef.current.drawScene();
        
        // 개발 환경에서만 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.log('NiiVue 볼륨 생성 완료:', nvRef.current.volumes.length);
        }
        
      } else {
        console.log('헤더가 없어서 Blob으로 파일 생성 시도');
        
        // 헤더가 없는 경우 Blob으로 파일 생성 시도
        const blob = new Blob([processBuffer], { type: 'application/octet-stream' });
        const file = new File([blob], 'breast.nii');
        
        await nvRef.current.loadFromFile(file);
      }
      
      if (nvRef.current.volumes && nvRef.current.volumes.length > 0) {
        // 슬라이스 타입 설정 - 해부학적 방향 확실히 고정
        let sliceType = 0;
        switch (plane) {
          case 'axial': sliceType = 0; break;    // ✅ 확정: Axial = 0
          case 'coronal': sliceType = 1; break;  // 추정: Coronal = 1  
          case 'sagittal': sliceType = 2; break; // 추정: Sagittal = 2
        }
        
        // 개발 환경에서만 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.log(`🎯 ${plane} 뷰어 (Buffer 로드): 슬라이스 타입 ${sliceType}으로 강제 설정`);
        }
        
        // 슬라이스 타입 여러 번 적용 (확실히 고정)
        nvRef.current.setSliceType(sliceType);
        nvRef.current.opts.sliceType = sliceType; // 옵션으로도 설정
        nvRef.current.opts.multiplanarShowRender = 0; // 3D 렌더링 비활성화
        
        // 방향 고정 완료
        
        // 개발 환경에서만 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ ${plane} 뷰어 (Buffer 로드): 해부학적 방향 고정 완료 (sliceType: ${sliceType})`);
        }
        
        // 즉시 화면 업데이트 (방향 즉시 반영)
        nvRef.current.updateGLVolume();
        nvRef.current.drawScene();
        
        // 십자선 완전 제거 (ArrayBuffer 로드 후에도 확실히 적용)
        nvRef.current.opts.show3Dcrosshair = false;
        nvRef.current.opts.crosshairWidth = 0;
        nvRef.current.opts.crosshairColor = [0, 0, 0, 0];
        
        // 볼륨 설정
        nvRef.current.volumes[0].opacity = 1.0;
        nvRef.current.updateGLVolume();
        
          nvRef.current.drawScene();
          updateSliceInfo();
          
          // 즉시 방향 설정 (지연 없이)
          forceOrientationReset();
          
          // 파일 로드 완료 후 50% 줌 적용
          setTimeout(() => {
            handleZoomChange(50);
          }, 200);
      }
      
      setFile(file);
      
    } catch (error) {
      console.error('NiiVue 슬라이스 뷰어 로드 실패:', error);
      setError('파일 로드 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [niftiImage, niftiHeader, plane]);

  // Segmentation 오버레이 로딩 함수
  const loadSegmentationOverlay = useCallback(async () => {
    if (!nvRef.current || !globalSelectedSegFile || globalSelectedSegFile.trim() === '' || nvRef.current.volumes.length === 0) {
      return;
    }
    
    try {
      // 개발 환경에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.log('NiiVue 슬라이스 뷰어에서 오버레이 로딩 시작:', globalSelectedSegFile);
      }
      
      // URL 유효성 추가 검증
      if (!originalNiftiUrl || originalNiftiUrl.trim() === '') {
        console.log('원본 NIfTI URL이 없어서 오버레이 로딩을 건너뜁니다');
        return;
      }
      
      // 기존 오버레이가 있으면 제거 (첫 번째 볼륨은 기본 이미지이므로 보존)
      if (nvRef.current.volumes.length > 1) {
        nvRef.current.volumes = nvRef.current.volumes.slice(0, 1);
      }
      
      // 기본 뇌 이미지와 segmentation을 함께 로드
      const volumeList = [
        { 
          url: originalNiftiUrl,
          name: 'breast.nii',
          colormap: 'gray'
        },
        {
          url: globalSelectedSegFile,
          name: 'segmentation.nii',
          colormap: 'red'
        }
      ];
      
      await nvRef.current.loadVolumes(volumeList);
      
      // 볼륨 설정
      if (nvRef.current.volumes.length >= 2) {
        // 기본 뇌 이미지 설정
        const breast = nvRef.current.volumes[0];
        breast.opacity = 1.0;
        nvRef.current.setColormap(breast.id, 'gray');
        
        // 오버레이 설정
        const overlay = nvRef.current.volumes[1];
        overlay.opacity = 0.7;
        nvRef.current.setColormap(overlay.id, 'red');
        
        // segmentation 파일의 특성에 맞게 설정
        overlay.cal_min = 0.5; // 0은 배경이므로 0.5부터 표시
        overlay.cal_max = 4.0;  // 일반적인 segmentation 최대값
        
        nvRef.current.updateGLVolume();
        setHasOverlay(true);
        
        // 개발 환경에서만 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.log('NiiVue 슬라이스 뷰어 오버레이 로딩 성공');
          console.log('🔍 종양 분석 시작...');
        }
        
        // 🎯 종양 데이터 분석 및 자동 슬라이스 이동
        await analyzeTumorData(nvRef.current, overlay);
      }
      
      // 슬라이스 타입 재적용 - 해부학적 방향 확실히 고정
      let sliceType = 0;
      switch (plane) {
        case 'axial': sliceType = 0; break;    // Axial - 수평 단면 (위아래)
        case 'coronal': sliceType = 1; break;  // Coronal - 관상 단면 (앞뒤)  
        case 'sagittal': sliceType = 2; break; // Sagittal - 시상 단면 (좌우)
      }
      
      // 개발 환경에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎯 ${plane} 뷰어: 슬라이스 타입 ${sliceType}으로 강제 설정`);
      }
      
      // 슬라이스 타입 여러 번 적용 (확실히 고정)
      nvRef.current.setSliceType(sliceType);
      nvRef.current.opts.sliceType = sliceType; // 옵션으로도 설정
      nvRef.current.opts.multiplanarShowRender = 0; // 3D 렌더링 비활성화
      
      // 방향 고정 완료
      
      // 개발 환경에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ ${plane} 뷰어: 해부학적 방향 고정 완료 (sliceType: ${sliceType})`);
      }
      
      // 즉시 화면 업데이트 (방향 즉시 반영)
      nvRef.current.updateGLVolume();
      nvRef.current.drawScene();
      
      // 십자선 완전 제거 (오버레이 로딩 후에도 확실히 적용)
      nvRef.current.opts.show3Dcrosshair = false;
      nvRef.current.opts.crosshairWidth = 0;
      nvRef.current.opts.crosshairColor = [0, 0, 0, 0];
      
      nvRef.current.drawScene();
      
      // 오버레이 로딩 후 즉시 방향 설정
      forceOrientationReset();
      
    } catch (error) {
      console.error('NiiVue 슬라이스 뷰어 오버레이 로딩 실패:', error);
    }
  }, [globalSelectedSegFile, originalNiftiUrl, plane]);

  // Tumor 오버레이 로딩 함수
  const loadTumorOverlay = useCallback(async () => {
    if (!nvRef.current || !tumorOverlayUrl || tumorOverlayUrl.trim() === '' || nvRef.current.volumes.length === 0) {
      return;
    }
    
    try {
      // 개발 환경에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.log('NiiVue 슬라이스 뷰어에서 Tumor 오버레이 로딩 시작:', tumorOverlayUrl);
      }
      
      // URL 유효성 추가 검증
      if (!originalNiftiUrl || originalNiftiUrl.trim() === '') {
        console.log('원본 NIfTI URL이 없어서 Tumor 오버레이 로딩을 건너뜁니다');
        return;
      }
      
      // 기존 오버레이가 있으면 제거 (첫 번째 볼륨은 기본 이미지이므로 보존)
      if (nvRef.current.volumes.length > 1) {
        nvRef.current.volumes = nvRef.current.volumes.slice(0, 1);
      }
      
      // 기본 뇌 이미지와 tumor segmentation을 함께 로드
      const volumeList = [
        { 
          url: originalNiftiUrl,
          name: 'breast.nii',
          colormap: 'gray'
        },
        {
          url: tumorOverlayUrl,
          name: 'tumor-segmentation.nii',
          colormap: 'green' // 녹색으로 표시하여 기존 segmentation과 구분
        }
      ];
      
      await nvRef.current.loadVolumes(volumeList);
      
      // 볼륨 설정
      if (nvRef.current.volumes.length >= 2) {
        // 기본 뇌 이미지 설정
        const breast = nvRef.current.volumes[0];
        breast.opacity = 1.0;
        nvRef.current.setColormap(breast.id, 'gray');
        
        // Tumor 오버레이 설정
        const tumorOverlay = nvRef.current.volumes[1];
        tumorOverlay.opacity = 0.7;
        nvRef.current.setColormap(tumorOverlay.id, 'green');
        
        // segmentation 파일의 특성에 맞게 설정
        tumorOverlay.cal_min = 0.5; // 0은 배경이므로 0.5부터 표시
        tumorOverlay.cal_max = 4.0;  // 일반적인 segmentation 최대값
        
        nvRef.current.updateGLVolume();
        setHasOverlay(true);
        
        // 개발 환경에서만 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.log('NiiVue 슬라이스 뷰어 Tumor 오버레이 로딩 성공');
          console.log('🔍 Tumor 종양 분석 시작...');
        }
        
        // 🔍 종양 분석 시작...
        await analyzeTumorData(nvRef.current, tumorOverlay);
      }
      
      // 슬라이스 타입 재적용 - 해부학적 방향 확실히 고정
      let sliceType = 0;
      switch (plane) {
        case 'axial': sliceType = 0; break;    // Axial - 수평 단면 (위아래)
        case 'coronal': sliceType = 1; break;  // Coronal - 관상 단면 (앞뒤)  
        case 'sagittal': sliceType = 2; break; // Sagittal - 시상 단면 (좌우)
      }
      
      // 개발 환경에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎯 ${plane} 뷰어 (Tumor 오버레이): 슬라이스 타입 ${sliceType}으로 강제 설정`);
      }
      
      // 슬라이스 타입 여러 번 적용 (확실히 고정)
      nvRef.current.setSliceType(sliceType);
      nvRef.current.opts.sliceType = sliceType; // 옵션으로도 설정
      nvRef.current.opts.multiplanarShowRender = 0; // 3D 렌더링 비활성화
      
      // 추가 방향 고정 설정
      nvRef.current.opts.isRadiological = false; // 신경학적 방향 (L=L, R=R)
      
      // 개발 환경에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ ${plane} 뷰어 (Tumor 오버레이): 해부학적 방향 고정 완료 (sliceType: ${sliceType})`);
      }
      
      // 십자선 완전 제거 (Tumor 오버레이 로드 후에도 확실히 적용)
      nvRef.current.opts.show3Dcrosshair = false;
      nvRef.current.opts.crosshairWidth = 0;
      nvRef.current.opts.crosshairColor = [0, 0, 0, 0];
      
      nvRef.current.updateGLVolume();
      nvRef.current.drawScene();
      
    } catch (error) {
      console.error('NiiVue 슬라이스 뷰어 Tumor 오버레이 로딩 실패:', error);
      setHasOverlay(false);
    }
  }, [tumorOverlayUrl, originalNiftiUrl, plane]);

  // globalSelectedSegFile이 변경될 때 오버레이 업데이트
  useEffect(() => {
    if (nvRef.current && nvRef.current.volumes.length > 0) {
      if (globalSelectedSegFile) {
        loadSegmentationOverlay();
      } else {
        // 오버레이 제거 - 기본 뇌 이미지만 다시 로드
        const reloadBreastOnly = async () => {
          if (!originalNiftiUrl || originalNiftiUrl.trim() === '') {
            return;
          }
          
          const volumeList = [{ 
            url: originalNiftiUrl,
            name: 'breast.nii',
            colormap: 'gray'
          }];
          
          await nvRef.current!.loadVolumes(volumeList);
          
          if (nvRef.current!.volumes.length > 0) {
            // 슬라이스 타입 재적용 - 해부학적 방향 확실히 고정
            let sliceType = 0;
            switch (plane) {
              case 'axial': sliceType = 0; break;    // Axial - 수평 단면 (위아래)
              case 'coronal': sliceType = 1; break;  // Coronal - 관상 단면 (앞뒤)  
              case 'sagittal': sliceType = 2; break; // Sagittal - 시상 단면 (좌우)
            }
            
            // 개발 환경에서만 로그 출력
            if (process.env.NODE_ENV === 'development') {
              console.log(`🎯 ${plane} 뷰어 (오버레이 제거): 슬라이스 타입 ${sliceType}으로 강제 설정`);
            }
            
            // 슬라이스 타입 여러 번 적용 (확실히 고정)
            nvRef.current!.setSliceType(sliceType);
            nvRef.current!.opts.sliceType = sliceType; // 옵션으로도 설정
            nvRef.current!.opts.multiplanarShowRender = 0;
            
            // 추가 방향 고정 설정
            nvRef.current!.opts.isRadiological = false; // 신경학적 방향 (L=L, R=R)
            
            // 개발 환경에서만 로그 출력
            if (process.env.NODE_ENV === 'development') {
              console.log(`✅ ${plane} 뷰어 (오버레이 제거): 해부학적 방향 고정 완료 (sliceType: ${sliceType})`);
            }
            
            // 십자선 완전 제거 (오버레이 제거 후에도 확실히 적용)
            nvRef.current!.opts.show3Dcrosshair = false;
            nvRef.current!.opts.crosshairWidth = 0;
            nvRef.current!.opts.crosshairColor = [0, 0, 0, 0];
            
            if (nvRef.current!.volumes && nvRef.current!.volumes.length > 0) {
              nvRef.current!.volumes[0].opacity = 1.0;
              nvRef.current!.updateGLVolume();
            }
            
            nvRef.current!.drawScene();
            setHasOverlay(false);
          }
        };
        
        reloadBreastOnly();
      }
    }
  }, [globalSelectedSegFile, originalNiftiUrl, plane, loadSegmentationOverlay]);

  // Tumor 오버레이 URL이 변경될 때 오버레이 로드/제거
  useEffect(() => {
    // 개발 환경에서만 로그 출력
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔥 ${plane} NiiVueSliceViewer: tumorOverlayUrl 변경됨:`, tumorOverlayUrl);
    }
    
    // 더 엄격한 null 체크
    if (nvRef.current && nvRef.current.volumes && nvRef.current.volumes.length > 0) {
      if (tumorOverlayUrl) {
        loadTumorOverlay();
      } else {
        // tumorOverlayUrl이 null이면 오버레이 제거하고 기본 뇌만 표시
        if (originalNiftiUrl && originalNiftiUrl.trim() !== '') {
          loadFromOriginalUrl();
        }
      }
    }
  }, [tumorOverlayUrl, originalNiftiUrl, plane, loadTumorOverlay, loadFromOriginalUrl]);

  // 강제 방향 재설정 함수 (내부 사용용)
  const forceOrientationReset = useCallback(() => {
    if (!nvRef.current) return;
    
    // 올바른 슬라이스 타입 적용
    let correctSliceType = 0;
    switch (plane) {
      case 'axial': correctSliceType = 0; break;
      case 'coronal': correctSliceType = 1; break;
      case 'sagittal': correctSliceType = 2; break;
    }
    
    // 여러 번 강제 적용
    for (let i = 0; i < 3; i++) {
      nvRef.current.setSliceType(correctSliceType);
      nvRef.current.opts.sliceType = correctSliceType;
    }
    
    // 추가 방향 설정
    nvRef.current.opts.multiplanarShowRender = 0;
    
    // 화면 강제 업데이트
    nvRef.current.updateGLVolume();
    nvRef.current.drawScene();
  }, [plane]);

  // 슬라이스 정보 업데이트
  const updateSliceInfo = useCallback(() => {
    try {
      if (nvRef.current && nvRef.current.volumes && nvRef.current.volumes.length > 0) {
        const volume = nvRef.current.volumes[0];
        if (volume && volume.hdr && volume.hdr.dims) {
        const dims = volume.hdr.dims;
        let maxSlicesForPlane = 0;
        
        switch (plane) {
          case 'axial':
            maxSlicesForPlane = dims[3] || 1; // Z축
            break;
          case 'coronal':
            maxSlicesForPlane = dims[2] || 1; // Y축
            break;
          case 'sagittal':
            maxSlicesForPlane = dims[1] || 1; // X축
            break;
        }
        
        // maxSlice prop이 있으면 해당 값으로 제한
        if (maxSlice && maxSlice < maxSlicesForPlane) {
          maxSlicesForPlane = maxSlice;
          // 개발 환경에서만 로그 출력
          if (process.env.NODE_ENV === 'development') {
            console.log(`🎯 ${plane} 슬라이스 제한: ${maxSlice}까지`);
          }
        }
        
        setMaxSlices(maxSlicesForPlane);
        setCurrentSlice(Math.floor(maxSlicesForPlane / 2)); // 중간 슬라이스부터 시작
        }
      }
    } catch (error) {
      console.warn('NiiVueSliceViewer: updateSliceInfo 오류:', error);
    }
  }, [plane, maxSlice]);


  // 줌 슬라이더 드래그 핸들러들 (Breast3DView와 완전히 동일)
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleZoomMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsZoomDragging(true);
    updateZoomFromMousePosition(e);
  };

  const handleZoomMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomDragging) return;
    e.preventDefault();
    e.stopPropagation();
    updateZoomFromMousePosition(e);
  };

  const handleZoomMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsZoomDragging(false);
  };

  const handleZoomMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    // 마우스가 슬라이더를 벗어나도 드래그 중이면 계속 유지
    if (!isZoomDragging) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const updateZoomFromMousePosition = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    const ratio = Math.max(0, Math.min(1, 1 - (y / height))); // 위쪽이 최대줌
    const newZoom = Math.round(10 + (100 - 10) * ratio); // 10-100% 범위, 정수로 반올림
    
    console.log(`🎚️ ${plane} 슬라이더 드래그:`, {
      y위치: y,
      높이: height,
      비율: ratio,
      계산된줌: newZoom,
      현재줌: zoomLevel
    });
    
    handleZoomChange(newZoom);
  };

  // 전역 마우스 이벤트 (드래그 중일 때) - Breast3DView와 완전히 동일
  useEffect(() => {
    if (!isZoomDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;
      const ratio = Math.max(0, Math.min(1, 1 - (y / height)));
      const newZoom = Math.round(10 + (100 - 10) * ratio); // 정수로 반올림
      handleZoomChange(newZoom);
    };

    const handleGlobalMouseUp = () => {
      setIsZoomDragging(false);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isZoomDragging]);

  // 더블클릭 리셋 핸들러
  const handleDoubleClick = () => {
    if (nvRef.current && canvasRef.current) {
      // 줌 레벨 리셋
      setZoomLevel(50);
      
      // CSS transform 리셋 (50%에 해당하는 scale 값)
      const canvas = canvasRef.current;
      const resetScale = 0.2 + ((50 - 10) / 90) * 1.3; // 50%일 때 scale 계산
      canvas.style.transform = `scale(${resetScale})`;
      canvas.style.transformOrigin = 'center center';
      
      // NiiVue 내부 설정도 리셋
      if (nvRef.current.scene) {
        nvRef.current.scene.volScaleMultiplier = resetScale;
      }
      
      nvRef.current.drawScene();
      console.log(`줌 리셋: 50% (scale: ${resetScale})`);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: sliderStyle }} />
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        {/* 헤더 */}
        <div className="text-white text-base font-medium mb-3 text-center">{title}</div>

        {/* 뷰어 */}
        <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '1' }}>
          {/* 빈 상태 또는 데이터 표시 */}
          {!file && !isLoading && (
            <div className="absolute inset-0 p-4 overflow-y-auto">
              {/* OncoType DX 예측 결과 */}
              {title === "OncoType DX 예측 결과" && (
                <div className="text-white space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-yellow-400 mb-2">42점</div>
                    <div className="text-lg text-yellow-300 mb-4">(중간위험군)</div>
                    <div className="text-xs text-gray-300 mb-2">
                      저위험 ≤25 | 중간 26-50 | 고위험 ≥51
                    </div>
                    <div className="text-sm text-blue-400">신뢰도: 87%</div>
                  </div>
                </div>
              )}
              
              {/* Patient Information */}
              {title === "Patient information" && (
                <div className="text-white space-y-4 h-full flex flex-col">
                  <div className="space-y-2 text-sm">
                    <div>• 환자: 홍길순 (F / 48세)</div>
                    <div>• 환자번호: 20241120-001</div>
                    <div>• 촬영일자: 2024-11-15</div>
                    <div>• MRI 장비: Siemens 3T</div>
                  </div>
                  
                  <div className="mt-auto space-y-2">
                    <button className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors">
                      파일 업로드
                    </button>
                    <button className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors">
                      분석 시작
                    </button>
                    <button className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors">
                      리포트 출력
                    </button>
                  </div>
                </div>
              )}
              
              {/* Radiomics Features */}
              {title === "Radiomics Feature" && (
                <div className="text-white space-y-3 h-full flex flex-col">
                  <div className="text-sm font-medium mb-2">Radiomics 피처 (Top 5)</div>
                  
                  <div className="space-y-2 text-xs flex-1">
                    <div className="flex justify-between items-center">
                      <span>1. 조영증강 불균일도</span>
                      <div className="text-right">
                        <div className="text-red-400 font-bold">0.78</div>
                        <div className="text-gray-400 text-[10px]">(정상: 0.45-0.65)</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>2. 종양 경계 불규칙성</span>
                      <div className="text-right">
                        <div className="text-red-400 font-bold">1.92</div>
                        <div className="text-gray-400 text-[10px]">(정상: 1.20-1.50)</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>3. 종양 이질성</span>
                      <div className="text-right">
                        <div className="text-red-400 font-bold">2.34</div>
                        <div className="text-gray-400 text-[10px]">(정상: 1.80-2.10)</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>4. 종양 크기</span>
                      <div className="text-right">
                        <div className="text-red-400 font-bold">3.2 cm³</div>
                        <div className="text-gray-400 text-[10px]">(기준: &lt;2.0)</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>5. 관류 패턴 변이</span>
                      <div className="text-right">
                        <div className="text-red-400 font-bold">0.65</div>
                        <div className="text-gray-400 text-[10px]">(정상: 0.40-0.55)</div>
                      </div>
                    </div>
                  </div>
                  
                  <button className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors mt-auto">
                    전체 feature 보기 →
                  </button>
                </div>
              )}
              
              {/* 기본 상태 (3D 등) */}
              {title !== "OncoType DX 예측 결과" && title !== "Patient information" && title !== "Radiomics Feature" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-gray-400 text-sm text-center">
                    <div>No MRI data</div>
                    <div>Upload NIfTI file</div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* 로딩 상태 */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="text-white text-sm">
                <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                NIfTI 파일 로딩 중...
              </div>
            </div>
          )}
          
          {/* 에러 상태 */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-50">
              <div className="text-white text-sm text-center px-4">
                <div className="text-red-400 mb-2">⚠️ 오류</div>
                <div>{error}</div>
              </div>
            </div>
          )}
          
          {/* NiiVue 캔버스 */}
          <canvas
            ref={canvasRef}
            id={viewerId}
            className="w-full h-full cursor-crosshair"
            style={{ touchAction: 'none' }}
            onDoubleClick={handleDoubleClick}
          />
          
          

          {/* 방향 라벨 (plane에 따라 다르게 표시) */}
          {file && (
            <>
              <div className="absolute left-2 transform -translate-y-1/2 text-white text-sm bg-black bg-opacity-50 px-1 rounded z-10" style={{ top: '46%' }}>
                [{plane === 'axial' ? 'R' : plane === 'coronal' ? 'R' : 'F'}]
              </div>
              <div className="absolute right-4 transform -translate-y-1/2 text-white text-sm bg-black bg-opacity-50 px-1 rounded z-10" style={{ top: '47%' }}>
                [{plane === 'axial' ? 'L' : plane === 'coronal' ? 'L' : 'B'}]
              </div>
            </>
          )}

          {/* 오른쪽 세로 줌 컨트롤 (3D 뷰어와 완전히 동일) */}
          {file && (
            <div className="absolute right-1 top-4 bottom-4 w-4 flex flex-col items-center">
              {/* 줌 레벨 표시 */}
              <div className="text-white text-xs mb-1 bg-black bg-opacity-70 px-1 rounded">
                {zoomLevel}%
              </div>
              
              {/* 줌 슬라이더 */}
              <div 
                ref={sliderRef}
                className="flex-1 w-3 bg-gray-700 rounded-full cursor-pointer relative select-none"
                onMouseDown={handleZoomMouseDown}
                onMouseMove={handleZoomMouseMove}
                onMouseUp={handleZoomMouseUp}
                onMouseLeave={handleZoomMouseLeave}
              >
                <div 
                  className={`w-full bg-blue-400 rounded-full absolute bottom-0 ${
                    isZoomDragging ? '' : 'transition-all duration-200 ease-out'
                  }`}
                  style={{ 
                    height: `${((zoomLevel - 10) / (100 - 10)) * 100}%`
                  }}
                ></div>
                <div 
                  className={`w-4 h-2 bg-blue-500 rounded-full absolute -left-0.5 transform -translate-y-1/2 border border-white shadow-sm hover:scale-110 ${
                    isZoomDragging ? 'scale-110' : 'transition-all duration-200 ease-out'
                  }`}
                  style={{ 
                    top: `${100 - ((zoomLevel - 10) / (100 - 10)) * 100}%`
                  }}
                ></div>
              </div>
              
              {/* 줌 리셋 버튼 */}
              <button
                onClick={() => handleZoomChange(50)}
                className="text-white text-xs mt-1 bg-black bg-opacity-70 px-1 rounded hover:bg-opacity-90"
                title="줌 리셋 (50%)"
              >
                1:1
              </button>
            </div>
          )}

          {/* 하단 슬라이스 컨트롤 (간소화) */}
          {file && maxSlices > 1 && (
            <div className="absolute bottom-2 left-2 right-8 text-white text-xs bg-black bg-opacity-70 px-2 py-1 rounded">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handleSliceChange(currentSlice - 1)}
                  disabled={currentSlice === 0}
                  className="px-2 py-1 bg-green-600 rounded disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  ←
                </button>
                <span>Slice {currentSlice + 1}/{maxSlices}</span>
                <button
                  onClick={() => handleSliceChange(currentSlice + 1)}
                  disabled={currentSlice === maxSlices - 1}
                  className="px-2 py-1 bg-green-600 rounded disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </div>
              <div className="mt-1">
                <input
                  type="range"
                  min="0"
                  max={maxSlices - 1}
                  value={currentSlice}
                  onChange={(e) => handleSliceChange(parseInt(e.target.value))}
                  className="w-full h-3 bg-gray-600 rounded-lg cursor-pointer niivue-slice-slider"
                  style={{
                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${(currentSlice / (maxSlices - 1)) * 100}%, #4b5563 ${(currentSlice / (maxSlices - 1)) * 100}%, #4b5563 100%)`,
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

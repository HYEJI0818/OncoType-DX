'use client';

import { useEffect, useRef, useState, useId, useCallback } from 'react';
import { useTranslation } from '@/contexts/EnhancedTranslationContext';
// import { Niivue } from '@niivue/niivue'; // 동적 import로 변경
import MPRViewer from './MPRViewer';

// NiiVue 타입 정의 (동적 import를 위한)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NiivueInstance = any;

// 슬라이더 CSS 스타일은 globals.css에 정의됨

interface NiftiHeader {
  dims: number[];
  pixDims: number[];
  affine?: number[][];
  [key: string]: unknown;
}

interface Breast3DViewProps {
  imageUrl?: string;
  niftiHeader?: NiftiHeader;
  niftiImage?: ArrayBuffer;
  originalNiftiUrl?: string;
  patientId?: number; // 환자 ID 추가
  // slice 제거 - 각 뷰어가 독립적으로 관리
  globalSelectedSegFile?: string | null; // 전역 segmentation 파일
  onFullscreenClick?: () => void; // 전체화면 버튼 클릭 핸들러 추가
  tumorOverlayUrl?: string | null; // Tumor 오버레이 URL 추가
}

export default function Breast3DView({ imageUrl, niftiHeader, niftiImage, originalNiftiUrl, patientId, globalSelectedSegFile, onFullscreenClick, tumorOverlayUrl }: Breast3DViewProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nvRef = useRef<NiivueInstance | null>(null);
  
  // 각 뷰어 인스턴스를 고유하게 식별하기 위한 ID (hydration 안전)
  const uniqueId = useId();
  const viewerId = `breast3d-${uniqueId.replace(/:/g, '-')}`;
  const [isLoading, setIsLoading] = useState(false);
  const [showMPRViewer, setShowMPRViewer] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [zoomLevel, setZoomLevel] = useState(50); // 확대/축소 레벨 (0-100) - 50% 크기
  
  // 드래그 기능을 위한 상태
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  
  // 더 이상 개별 segmentation 상태 필요 없음 (전역 상태 사용)

  // 확대/축소 핸들러 (useCallback으로 최적화)
  const handleZoomChange = useCallback((newZoom: number) => {
    console.log(`🎯 3D handleZoomChange 호출:`, {
      이전줌: zoomLevel,
      새줌: newZoom,
      nvRef존재: !!nvRef.current
    });
    
    setZoomLevel(newZoom);
    
    if (nvRef.current) {
      // 0-100을 0.2-1.5 범위로 변환 (50%일 때 약 0.85x)
      const scale = 0.2 + (newZoom / 100) * 1.3;
      nvRef.current.scene.volScaleMultiplier = scale;
      nvRef.current.drawScene();
      
      console.log(`✅ 3D 줌 적용 완료: ${newZoom}% (scale: ${scale.toFixed(2)})`);
    } else {
      console.warn(`⚠️ 3D 줌 적용 불가: nvRef 없음`);
    }
  }, [zoomLevel]);

  // 마우스 휠 이벤트 리스너 (passive 문제 해결 + vec4 에러 방지)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      try {
        // 🎯 3D 뷰어는 슬라이스가 없으므로 모든 휠 이벤트를 줌으로 처리
        e.preventDefault();
        e.stopPropagation();
        
        // NiiVue 인스턴스 상태 검증 (vec4 에러 방지)
        if (!nvRef.current || !nvRef.current.scene) {
          console.warn('⚠️ NiiVue 인스턴스가 준비되지 않음 - 휠 이벤트 무시');
          return;
        }
        
        const zoomSensitivity = 5; // 줌 민감도 (3D는 좀 더 크게)
        const delta = e.deltaY > 0 ? -zoomSensitivity : zoomSensitivity;
        
        // 함수형 업데이트를 사용하여 최신 상태 보장
        setZoomLevel(prevZoom => {
          const newZoom = Math.max(10, Math.min(100, prevZoom + delta));
          
          if (newZoom !== prevZoom) {
            // 부드러운 줌을 위한 requestAnimationFrame 사용 + 에러 처리
            requestAnimationFrame(() => {
              try {
                if (nvRef.current && nvRef.current.scene) {
                  const scale = 0.2 + (newZoom / 100) * 1.3;
                  nvRef.current.scene.volScaleMultiplier = scale;
                  
                  // drawScene 호출 전 WebGL 컨텍스트 상태 확인
                  const canvas = nvRef.current.canvas as HTMLCanvasElement;
                  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                  if (gl && !gl.isContextLost()) {
                    nvRef.current.drawScene();
                  } else {
                    console.warn('⚠️ WebGL 컨텍스트 손실 - drawScene 건너뜀');
                  }
                }
              } catch (drawError) {
                console.error('❌ 3D 뷰 렌더링 에러:', drawError);
                // vec4 관련 에러 특별 처리
                if (drawError instanceof Error && drawError.message && drawError.message.includes('vec4')) {
                  console.warn('🔧 vec4 에러 감지 - NiiVue 재초기화 필요할 수 있음');
                }
              }
            });
          }
          
          return newZoom;
        });
      } catch (wheelError) {
        console.error('❌ 마우스 휠 이벤트 처리 에러:', wheelError);
        // vec4 관련 에러인지 확인
        if (wheelError instanceof Error && wheelError.message && (wheelError.message.includes('vec4') || wheelError.message.includes('410'))) {
          console.warn('🔧 vec4/vec410 에러 감지 - 이벤트 무시');
        }
      }
    };

    // passive: false로 이벤트 리스너 등록
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [zoomLevel, handleZoomChange]);

  // NiiVue 초기화 - 순수 3D 모드 (최적화된 버전)
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
          // vec4/vec410 오류 방지를 위한 강화된 안전한 NiiVue 인스턴스 생성
          const nv = new Niivue({
            // 순수한 3D 모드 설정 (십자선 없는 깔끔한 3D 뷰)
            show3Dcrosshair: false, // 3D 크로스헤어 비활성화 (순수 3D 뷰)
            sliceType: 4, // 3D 모드
            multiplanarShowRender: 0, // 슬라이스 완전 비활성화 (순수 3D)
            
            // vec4/vec410 오류 방지를 위한 강화된 설정
            loadingText: '', // 로딩 텍스트 비활성화
            isNearestInterpolation: false, // 부드러운 보간
            meshThicknessOn2D: 0, // 메시 두께 최소화
            
            // WebGL 안정성을 위한 추가 설정
            dragMode: 1, // 3D 회전/확대축소 모드 (vec4 에러 방지)
            isOrientCube: true, // 방향 큐브 표시 (안전한 기본 기능)
            isSliceMM: false, // 슬라이스 평면 비표시
            
            // 기본 설정
            logLevel: 'error',
            backColor: [0, 0, 0, 1],
            isColorbar: false,
            isRuler: false,
            multiplanarForceRender: false, // 강제 렌더링 비활성화
            crosshairWidth: 0, // 십자선 두께 0
            crosshairColor: [0, 0, 0, 0], // 십자선 완전 투명
            
            // 🎯 고성능 3D 렌더링 최적화
            isAntiAlias: true, // 안티앨리어싱으로 부드러운 렌더링
            dragAndDropEnabled: false, // 드래그앤드롭 비활성화로 성능 향상
            fontSizeScaling: 0.8, // 폰트 크기 최적화
            
            // 전체 뇌가 보이도록 초기 설정
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
            
            // vec4/vec410 에러 방지를 위한 추가 안전장치
            try {
              // WebGL 셰이더 프로그램 상태 확인
              const gl = nv.gl;
              if (gl) {
                // 기본 셰이더 변수들이 제대로 정의되었는지 확인
                console.log('🔧 WebGL 컨텍스트 상태 확인 완료');
                
                // NiiVue 내부 상태 안정화를 위한 짧은 대기
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // 초기 렌더링 시도 (vec4 에러가 발생할 수 있는 지점)
                if (nv.drawScene) {
                  nv.drawScene();
                  console.log('✅ 초기 3D 렌더링 성공');
                }
              }
            } catch (shaderError) {
              console.warn('⚠️ WebGL 셰이더 초기화 경고:', shaderError);
              // vec4 관련 에러인 경우 특별 처리
              if (shaderError instanceof Error && shaderError.message && (shaderError.message.includes('vec4') || shaderError.message.includes('410'))) {
                console.warn('🔧 vec4/vec410 셰이더 에러 감지 - 안전 모드로 계속 진행');
              }
            }
          } else {
            console.warn('⚠️ 3D 뷰어 캔버스가 DOM에 연결되지 않음');
            return;
          }
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

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        if (originalNiftiUrl && nvRef.current) {
          await load3DBrain();
        } else if (niftiImage && nvRef.current) {
          await loadFromBuffer();
        } else if (nvRef.current) {
          // originalNiftiUrl과 niftiImage가 모두 없으면 볼륨 제거 (초기화)
          nvRef.current.volumes = [];
          // drawScene 호출 전에 volumes가 비어있는지 확인
          if (nvRef.current.volumes.length === 0) {
            try {
              nvRef.current.drawScene();
            } catch (error) {
              console.warn('Brain3DView: drawScene 오류 (볼륨 없음):', error);
            }
          }
        }
      } catch (error) {
        console.error('Brain3DView: 데이터 로드 오류:', error);
      }
    };
    loadData();
  }, [originalNiftiUrl, niftiImage]);

  // 더 이상 개별 segmentation 파일 목록 가져오기 필요 없음



  // 3D 뇌 로드 함수
  const load3DBrain = async () => {
    if (!nvRef.current || !originalNiftiUrl) return;
    
    try {
      setIsLoading(true);
      
      // 기본 뇌 이미지 로드
      const volumeList = [{ 
        url: originalNiftiUrl,
        name: 'brain.nii',
        colormap: 'gray'
      }];
      
      await nvRef.current.loadVolumes(volumeList);
      
      if (nvRef.current.volumes && nvRef.current.volumes.length > 0) {
        try {
          // 순수한 3D 모드 설정 (MPRViewer와 동일)
          nvRef.current.setSliceType(4); // 3D 렌더 모드
          nvRef.current.opts.multiplanarShowRender = 0; // 슬라이스 완전 비활성화
          nvRef.current.opts.show3Dcrosshair = true; // 3D 크로스헤어 표시
          nvRef.current.opts.isOrientCube = true; // 방향 큐브 표시
          nvRef.current.opts.multiplanarForceRender = false; // 강제 렌더링 비활성화
          nvRef.current.opts.isSliceMM = false; // 슬라이스 mm 표시 비활성화
          
          // 3D 뷰 각도 설정
          nvRef.current.setRenderAzimuthElevation(45, -10);
          
          // 클리핑 평면 완전 제거 (순수한 3D 뷰)
          nvRef.current.setClipPlane([]);
          
          // 볼륨 전체가 보이도록 설정
          if (nvRef.current.scene) {
            nvRef.current.scene.volScaleMultiplier = 1.0; // 기본 스케일
          }
          
          // 볼륨 설정 - 안전한 접근
          if (nvRef.current.volumes && nvRef.current.volumes.length > 0 && nvRef.current.volumes[0]) {
            nvRef.current.volumes[0].opacity = 1.0;
            nvRef.current.updateGLVolume();
          }
        } catch (renderError) {
          console.warn('Brain3DView: 3D 렌더링 설정 오류:', renderError);
        }
        
        // 전역 segmentation 파일이 있으면 오버레이 추가
        if (globalSelectedSegFile) {
          await loadSegmentationOverlay();
        }
        
        // Tumor 오버레이가 있으면 추가
        if (tumorOverlayUrl) {
          console.log('🔥 Brain3DView: 초기화 시 tumorOverlayUrl 발견, 로드 시도');
          await loadTumorOverlay();
        }
        
        nvRef.current.drawScene();
      }
      
      setFile(new File([new ArrayBuffer(0)], 'brain.nii'));
      
    } catch (error) {
      console.error('3D 뇌 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ArrayBuffer에서 로드
  const loadFromBuffer = async () => {
    if (!nvRef.current || !niftiImage) return;
    
    try {
      setIsLoading(true);
      
      const blob = new Blob([niftiImage], { type: 'application/octet-stream' });
      const file = new File([blob], 'brain.nii');
      
      await nvRef.current.loadFromFile(file);
      
      if (nvRef.current.volumes && nvRef.current.volumes.length > 0) {
        // 순수한 3D 모드 설정 (MPRViewer와 동일)
        nvRef.current.setSliceType(4); // 3D 렌더 모드
        nvRef.current.opts.multiplanarShowRender = 0; // 슬라이스 완전 비활성화
        nvRef.current.opts.show3Dcrosshair = true; // 3D 크로스헤어 표시
        nvRef.current.opts.isOrientCube = true; // 방향 큐브 표시
        nvRef.current.opts.multiplanarForceRender = false; // 강제 렌더링 비활성화
        nvRef.current.opts.isSliceMM = false; // 슬라이스 mm 표시 비활성화
        
        // 3D 뷰 각도 설정
        nvRef.current.setRenderAzimuthElevation(45, -10);
        
        // 클리핑 평면 완전 제거 (순수한 3D 뷰)
        nvRef.current.setClipPlane([]);
        
        // 볼륨 전체가 보이도록 설정
        nvRef.current.scene.volScaleMultiplier = 1.0; // 기본 스케일
        
        if (nvRef.current.volumes && nvRef.current.volumes.length > 0) {
          nvRef.current.volumes[0].opacity = 1.0;
          nvRef.current.updateGLVolume();
        }
        
        nvRef.current.drawScene();
      }
      
      setFile(file);
      
    } catch (error) {
      console.error('3D 뇌 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Segmentation 오버레이 로딩 함수
  const loadSegmentationOverlay = async () => {
    if (!nvRef.current || !globalSelectedSegFile || globalSelectedSegFile.trim() === '' || nvRef.current.volumes.length === 0) {
      console.log('3D 뷰 오버레이 로딩 건너뜀:', { 
        nvRef: !!nvRef.current, 
        globalSelectedSegFile, 
        volumesLength: nvRef.current?.volumes?.length 
      });
      return;
    }
    
    try {
      console.log('3D 뷰에서 오버레이 로딩 시작:', globalSelectedSegFile);
      
      // URL 유효성 추가 검증
      if (!originalNiftiUrl || originalNiftiUrl.trim() === '') {
        console.log('3D 뷰: 원본 NIfTI URL이 없어서 오버레이 로딩을 건너뜁니다');
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
          name: 'brain.nii',
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
        const brain = nvRef.current.volumes[0];
        brain.opacity = 1.0;
        nvRef.current.setColormap(brain.id, 'gray');
        
        // 오버레이 설정
        const overlay = nvRef.current.volumes[1];
        overlay.opacity = 0.7;
        nvRef.current.setColormap(overlay.id, 'red');
        
        // segmentation 파일의 특성에 맞게 설정
        overlay.cal_min = 0.5; // 0은 배경이므로 0.5부터 표시
        overlay.cal_max = 4.0;  // 일반적인 segmentation 최대값
        
        nvRef.current.updateGLVolume();
        
        console.log('3D 뷰 오버레이 로딩 성공 - 뇌:', brain, '오버레이:', overlay);
      }
      
      // 순수한 3D 모드 설정 재적용 (MPRViewer와 동일)
      nvRef.current.setSliceType(4); // 3D 렌더 모드
      nvRef.current.opts.multiplanarShowRender = 0; // 슬라이스 완전 비활성화
      nvRef.current.opts.show3Dcrosshair = true; // 3D 크로스헤어 표시
      nvRef.current.opts.isOrientCube = true; // 방향 큐브 표시
      nvRef.current.opts.multiplanarForceRender = false; // 강제 렌더링 비활성화
      nvRef.current.opts.isSliceMM = false; // 슬라이스 mm 표시 비활성화
      
      // 3D 뷰 각도 설정
      nvRef.current.setRenderAzimuthElevation(45, -10);
      
      // 클리핑 평면 완전 제거 (순수한 3D 뷰)
      nvRef.current.setClipPlane([]);
      
      nvRef.current.scene.volScaleMultiplier = 1.0;
      
      nvRef.current.drawScene();
      
    } catch (error) {
      console.error('3D 뷰 오버레이 로딩 실패:', error);
    }
  };

  // Tumor 오버레이 로딩 함수
  const loadTumorOverlay = async () => {
    if (!nvRef.current || !tumorOverlayUrl || !originalNiftiUrl) {
      console.log('Brain3DView: Tumor 오버레이 로딩 조건 미충족');
      return;
    }
    
    try {
      console.log('Brain3DView: Tumor 오버레이 로딩 시작:', tumorOverlayUrl);
      
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
          url: tumorOverlayUrl,
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
        
        console.log('Brain3DView Tumor 오버레이 로딩 성공 - 뇌:', brain, '오버레이:', tumorOverlay);
      }
      
      // 순수한 3D 모드 설정 재적용
      nvRef.current.opts.multiplanarShowRender = 1; // 3D 렌더링 활성화
      nvRef.current.opts.show3Dcrosshair = false;
      nvRef.current.opts.crosshairWidth = 0;
      nvRef.current.opts.crosshairColor = [0, 0, 0, 0];
      
      nvRef.current.updateGLVolume();
      nvRef.current.drawScene();
      
    } catch (error) {
      console.error('Brain3DView Tumor 오버레이 로딩 실패:', error);
    }
  };

  // 기본 뇌 이미지만 다시 로드하는 함수 (오버레이 제거용)
  const reloadBrainOnly = async () => {
    if (!originalNiftiUrl || originalNiftiUrl.trim() === '' || !nvRef.current) {
      console.log('3D 뷰: 원본 NIfTI URL이 없거나 nvRef가 없어서 뇌 이미지 재로드를 건너뜁니다');
      return;
    }
    
    const volumeList = [{ 
      url: originalNiftiUrl,
      name: 'brain.nii',
      colormap: 'gray'
    }];
    
    await nvRef.current.loadVolumes(volumeList);
    
    if (nvRef.current.volumes.length > 0) {
      // 순수한 3D 모드 설정 재적용 (MPRViewer와 동일)
      nvRef.current.setSliceType(4); // 3D 렌더 모드
      nvRef.current.opts.multiplanarShowRender = 0; // 슬라이스 완전 비활성화
      nvRef.current.opts.show3Dcrosshair = true; // 3D 크로스헤어 표시
      nvRef.current.opts.isOrientCube = true; // 방향 큐브 표시
      nvRef.current.opts.multiplanarForceRender = false; // 강제 렌더링 비활성화
      nvRef.current.opts.isSliceMM = false; // 슬라이스 mm 표시 비활성화
      
      // 3D 뷰 각도 설정
      nvRef.current.setRenderAzimuthElevation(45, 15);
      
      // 클리핑 평면 완전 제거 (순수한 3D 뷰)
      nvRef.current.setClipPlane([]);
      
      nvRef.current.scene.volScaleMultiplier = 1.0;
      
      if (nvRef.current.volumes && nvRef.current.volumes.length > 0) {
        nvRef.current.volumes[0].opacity = 1.0;
        nvRef.current.updateGLVolume();
      }
      
      nvRef.current.drawScene();
    }
  };

  // globalSelectedSegFile이 변경될 때 오버레이 업데이트
  useEffect(() => {
    if (nvRef.current && nvRef.current.volumes.length > 0) {
      if (globalSelectedSegFile) {
        loadSegmentationOverlay();
      } else {
        // 오버레이 제거 - 기본 뇌 이미지만 다시 로드
        reloadBrainOnly();
      }
    }
  }, [globalSelectedSegFile, originalNiftiUrl]);

  // tumorOverlayUrl이 변경될 때 Tumor 오버레이 로드/제거
  useEffect(() => {
    console.log('🔥 Brain3DView: tumorOverlayUrl 변경됨:', tumorOverlayUrl);
    console.log('🔥 Brain3DView: nvRef.current:', !!nvRef.current);
    console.log('🔥 Brain3DView: volumes.length:', nvRef.current?.volumes?.length || 0);
    console.log('🔥 Brain3DView: originalNiftiUrl:', originalNiftiUrl);
    
    // 더 엄격한 null 체크
    if (nvRef.current && nvRef.current.volumes && nvRef.current.volumes.length > 0) {
      if (tumorOverlayUrl) {
        console.log('🔥 Brain3DView: loadTumorOverlay 호출');
        loadTumorOverlay();
      } else {
        console.log('🔥 Brain3DView: tumorOverlayUrl이 null이므로 오버레이 제거');
        // tumorOverlayUrl이 null이면 오버레이 제거하고 기본 뇌만 표시
        reloadBrainOnly();
      }
    } else {
      console.log('🔥 Brain3DView: 조건 미충족 - nvRef 또는 volumes 없음');
    }
  }, [tumorOverlayUrl, originalNiftiUrl]);


  // 드래그 핸들러들
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    updateZoomFromMousePosition(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    updateZoomFromMousePosition(e);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    // 마우스가 슬라이더를 벗어나도 드래그 중이면 계속 유지
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const updateZoomFromMousePosition = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    const ratio = Math.max(0, Math.min(1, 1 - (y / height))); // 위쪽이 최대줌
    const newZoom = Math.round(10 + (100 - 10) * ratio); // 10-100% 범위
    handleZoomChange(newZoom);
  };

  // 전역 마우스 이벤트 (드래그 중일 때)
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;
      const ratio = Math.max(0, Math.min(1, 1 - (y / height)));
      const newZoom = Math.round(10 + (100 - 10) * ratio);
      handleZoomChange(newZoom);
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging]);

  // 더블클릭 리셋 핸들러
  const handleDoubleClick = () => {
    if (nvRef.current) {
      // 카메라 각도 리셋
      nvRef.current.setRenderAzimuthElevation(45, -10);
      // 줌 레벨 리셋
      setZoomLevel(50);
      nvRef.current.scene.volScaleMultiplier = 1.0;
      // 클리핑 평면 완전 제거 (순수한 3D 뷰)
      nvRef.current.setClipPlane([]);
      nvRef.current.drawScene();
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
        {/* 헤더 */}
        <div className="relative mb-3">
          <h3 className="text-white text-base font-medium text-center">{t.breast3dView}</h3>
        </div>

      {/* 3D 뷰어 - 더 작고 둥근 디자인 */}
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '1' }}>
        {/* 로딩 상태 - 제거됨 */}
        
        {/* 빈 상태 */}
        {!file && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-400 text-sm text-center">

              <div>No MRI data</div>
              <div>Upload NIfTI file</div>
            </div>
          </div>
        )}
        
        {/* 3D 캔버스 */}
        <canvas
          ref={canvasRef}
          id={viewerId}
          className="w-full h-full cursor-crosshair"
          style={{ touchAction: 'none' }}
          onDoubleClick={handleDoubleClick}
        />
        
        

        {/* R L 방향 라벨 (다른 뷰어와 완전히 동일한 위치) */}
        {file && (
          <>
            <div className="absolute left-2 transform -translate-y-1/2 text-white text-sm bg-black bg-opacity-50 px-1 rounded z-10" style={{ top: '46%' }}>
              [R]
            </div>
             <div className="absolute right-4 transform -translate-y-1/2 text-white text-sm bg-black bg-opacity-50 px-1 rounded z-10" style={{ top: '47%' }}>
                [L]
              </div>
          </>
        )}

        {/* 오른쪽 세로 줌 컨트롤 */}
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
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              <div 
                className={`w-full bg-blue-400 rounded-full absolute bottom-0 ${
                  isDragging ? '' : 'transition-all duration-200 ease-out'
                }`}
                style={{ 
                  height: `${((zoomLevel - 10) / (100 - 10)) * 100}%`
                }}
              ></div>
              <div 
                className={`w-4 h-2 bg-blue-500 rounded-full absolute -left-0.5 transform -translate-y-1/2 border border-white shadow-sm hover:scale-110 ${
                  isDragging ? 'scale-110' : 'transition-all duration-200 ease-out'
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
      </div>



      {/* 전체화면 모달 */}
      {showMPRViewer && (
        <MPRViewer
          imageUrl={imageUrl}
          niftiHeader={niftiHeader}
          niftiImage={niftiImage}
          originalNiftiUrl={originalNiftiUrl}
          overlayNiftiUrl={globalSelectedSegFile || undefined}
          patientId={patientId}
          // slice 제거 - MPR 뷰어가 독립적으로 관리
          onClose={() => setShowMPRViewer(false)}
        />
      )}
    </div>
  );
}
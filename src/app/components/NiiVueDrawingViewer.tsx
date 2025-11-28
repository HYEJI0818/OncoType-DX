'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/contexts/EnhancedTranslationContext';
// import { Niivue, NVImage } from '@niivue/niivue'; // 동적 import로 변경

// NiiVue 타입 정의 (동적 import를 위한)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NiivueInstance = any;

interface NiiVueDrawingViewerProps {
  fileUrl?: string;
  title: string;
  className?: string;
  patientId?: number;
  originalNiftiUrl?: string;
}

export default function NiiVueDrawingViewer({ 
  fileUrl, 
  title, 
  className = '',
  patientId,
  originalNiftiUrl
}: NiiVueDrawingViewerProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const niivueRef = useRef<NiivueInstance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDrawingEnabled, setIsDrawingEnabled] = useState(false);
  const [penValue, setPenValue] = useState(1);
  const [drawOpacity, setDrawOpacity] = useState(0.7);
  const [isFilledPen, setIsFilledPen] = useState(false);
  const [clickToSegment, setClickToSegment] = useState(false);
  const [segmentIs2D, setSegmentIs2D] = useState(true);
  const [currentColormap, setCurrentColormap] = useState('gray');

  // 드로잉 컬러맵 정의
  const drawingColormap = {
    R: [0, 255, 0, 0, 255, 255, 0],     // Red values
    G: [0, 0, 255, 0, 255, 0, 255],     // Green values  
    B: [0, 0, 0, 255, 0, 255, 255],     // Blue values
    labels: ["Background", "Red", "Green", "Blue", "Magenta", "Yellow", "Cyan"]
  };

  // NiiVue 초기화
  useEffect(() => {
    if (!canvasRef.current) return;

    const initNiiVue = async () => {
      try {
        console.log('=== NiiVue 드로잉 뷰어 초기화 ===');
        
        // WebGL 컨텍스트 사전 확인
        const canvas = canvasRef.current!;
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) {
          throw new Error('WebGL을 지원하지 않는 브라우저입니다.');
        }
        
        // 동적 import로 NiiVue 로드
        const niivueModule = await import('@niivue/niivue');
        const { Niivue } = niivueModule;
        
        // 드로잉 전용 NiiVue 설정 - 항상 드로잉 모드
        const nv = new Niivue({
          backColor: [0, 0, 0, 1],
          show3Dcrosshair: true,
          dragAndDropEnabled: false,
          drawingEnabled: true, // 항상 드로잉 활성화
          isColorbar: false,
          textHeight: 0.05,
          crosshairColor: [1, 0, 0, 1],
          multiplanarLayout: 0, // 메인 뷰어와 동일한 레이아웃
          multiplanarPadPixels: 4, // 패딩 고정
        });

        console.log('NiiVue 인스턴스 생성 완료');
        
        // 캔버스 연결 전 추가 안전 검사
        if (canvasRef.current && canvasRef.current.parentElement) {
          await nv.attachToCanvas(canvasRef.current);
          
          // WebGL 컨텍스트 안정성 확인
          if (!nv.gl || nv.gl.isContextLost()) {
            throw new Error('WebGL 컨텍스트가 손실되었습니다.');
          }
          console.log('캔버스 연결 완료');
        } else {
          console.warn('⚠️ 드로잉 뷰어 캔버스가 DOM에 연결되지 않음');
          return;
        }
        
        niivueRef.current = nv;
        
        // 파일 로드
        if (fileUrl) {
          console.log('파일 로드 시작:', fileUrl);
          await loadNiftiFile(nv, fileUrl);
        }

        // 프로덕션 환경을 위한 안정적인 드로잉 설정
        const setupDrawing = () => {
          console.log('=== 드로잉 설정 적용 (시도 중) ===');
          
          if (!nv || !canvasRef.current) {
            console.log('NiiVue 또는 캔버스가 준비되지 않음, 재시도...');
            setTimeout(setupDrawing, 500);
            return;
          }
          
          try {
            // 볼륨이 로드될 때까지 대기
            if (fileUrl && (!nv.volumes || nv.volumes.length === 0)) {
              console.log('볼륨 로드 대기 중...');
              setTimeout(setupDrawing, 500);
              return;
            }
            
            console.log('드로잉 설정 시작...');
            
            // 드로잉 활성화 - 여러 번 시도
            for (let i = 0; i < 3; i++) {
              try {
                nv.setDrawingEnabled(true);
                console.log(`✓ 드로잉 활성화 (시도 ${i + 1})`);
                break;
              } catch (e) {
                console.log(`드로잉 활성화 실패 (시도 ${i + 1}):`, e);
                if (i === 2) throw e;
              }
            }
            
            // 펜 설정
            nv.setPenValue(1, false);
            console.log('✓ 펜 값 설정: 1');
            
            // 드로잉 투명도 설정 (뇌 영상이 보이도록 반투명)
            nv.setDrawOpacity(0.7);
            console.log('✓ 드로잉 투명도 설정: 0.7');
            
            // 드로잉 컬러맵 설정
            try {
              // NiiVue는 컬러맵을 문자열로 받습니다
              nv.setDrawColormap('red');
              console.log('✓ 드로잉 컬러맵 설정');
            } catch (e) {
              console.log('드로잉 컬러맵 설정 실패 (무시):', e);
            }
            
            // 레이아웃 설정 재확인 (드로잉 활성화 시에도 올바른 해부학적 방향 유지)
            nv.opts.multiplanarLayout = 0; // 메인 뷰어와 동일한 레이아웃
            nv.opts.multiplanarPadPixels = 4; // 패딩 고정
            console.log('✓ 드로잉 모드에서 해부학적 방향 재확인');
            
            // 상태 업데이트
            setIsDrawingEnabled(true);
            setPenValue(1);
            setIsFilledPen(false);
            setDrawOpacity(0.7);
            
            console.log('=== 드로잉 설정 완료 ===');
            
            // 성공 확인
            console.log('NiiVue 상태:', {
              volumes: nv.volumes?.length || 0,
              canvas: !!canvasRef.current,
              setupComplete: true
            });
            
          } catch (error) {
            console.error('❌ 드로잉 설정 실패:', error);
            setError('드로잉 설정 실패: ' + error);
            
            // 실패 시 재시도
            console.log('5초 후 재시도...');
            setTimeout(setupDrawing, 5000);
          }
        };
        
        // 초기 설정 시작
        setTimeout(setupDrawing, 1000);

        // 리사이즈 핸들러
        const handleResize = () => {
          if (nv) {
            nv.resizeListener();
          }
        };

        window.addEventListener('resize', handleResize);
        
        // 초기 리사이즈
        setTimeout(() => {
          if (nv) {
            nv.resizeListener();
          }
        }, 200);
        
      } catch (err) {
        console.error('NiiVue 초기화 실패:', err);
        setError('뷰어 초기화 실패: ' + err);
      }
    };

    initNiiVue();

    return () => {
      if (niivueRef.current) {
        window.removeEventListener('resize', () => {});
        niivueRef.current = null;
      }
    };
  }, [fileUrl]);

  // 위치 변경 핸들러
  const handleLocationChange = (data: unknown) => {
    // 위치 변경 시 필요한 로직 추가
    console.log('Location changed:', data);
  };

  // NIfTI 파일 로드
  const loadNiftiFile = async (nv: NiivueInstance, url: string) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('=== NIfTI 파일 로드 시작 ===', url);
      
      const volume = {
        url: url,
        colormap: currentColormap,
        opacity: 1.0,
        cal_min: 0,
        cal_max: 0  // 자동 스케일링
      };

      await nv.loadVolumes([volume]);
      console.log('✅ 볼륨 로드 완료');
      
      // 볼륨이 제대로 로드되었는지 확인
      if (nv.volumes && nv.volumes.length > 0) {
        const vol = nv.volumes[0];
        console.log('볼륨 정보:', {
          dims: vol.hdr?.dims,
          cal_min: vol.cal_min,
          cal_max: vol.cal_max,
          robust_min: vol.robust_min,
          robust_max: vol.robust_max
        });
        
        // 볼륨 표시 설정 강제 적용
        nv.setOpacity(0, 1.0); // 첫 번째 볼륨의 투명도를 1.0으로 설정
        
        // 컬러맵 다시 적용
        nv.setColormap(0, currentColormap);
        
        // 밝기/대비 자동 조정
        if (vol.cal_min === vol.cal_max) {
          // cal_min/max가 같으면 robust 값 사용
          if (vol.robust_min !== undefined && vol.robust_max !== undefined) {
            nv.setScale(0, vol.robust_min, vol.robust_max);
            console.log('✅ Robust 스케일 적용:', vol.robust_min, vol.robust_max);
          }
        }
      }
      
      // 멀티플래너 뷰 설정
      nv.setSliceType(nv.sliceTypeMultiplanar);
      console.log('✅ 멀티플래너 뷰 설정 완료');
      
      // 레이아웃 설정 강제 적용 (올바른 해부학적 방향으로)
      nv.opts.multiplanarLayout = 0; // 메인 뷰어와 동일한 레이아웃
      nv.opts.multiplanarPadPixels = 4; // 패딩 고정
      
      console.log('✅ 멀티플래너 레이아웃 및 해부학적 방향 설정 완료');
      
      // 화면 새로고침
      nv.updateGLVolume();
      console.log('✅ GL 볼륨 업데이트 완료');
      
    } catch (err) {
      console.error('❌ NIfTI 파일 로드 오류:', err);
      setError(err instanceof Error ? err.message : '파일 로드 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 파일 URL 변경 시 재로드
  useEffect(() => {
    if (niivueRef.current && fileUrl) {
      loadNiftiFile(niivueRef.current, fileUrl);
    }
  }, [fileUrl, currentColormap]);

  // 드로잉 모드 토글
  const toggleDrawing = () => {
    if (!niivueRef.current) {
      console.log('❌ NiiVue 인스턴스가 없습니다');
      alert('NiiVue가 초기화되지 않았습니다. 페이지를 새로고침해주세요.');
      return;
    }
    
    const nv = niivueRef.current;
    const newDrawingState = !isDrawingEnabled;
    
    console.log('=== 드로잉 모드 토글 ===');
    console.log('현재 상태:', isDrawingEnabled ? 'ON' : 'OFF');
    console.log('새로운 상태:', newDrawingState ? 'ON' : 'OFF');
    
    try {
      // 드로잉 상태 변경
      nv.setDrawingEnabled(newDrawingState);
      console.log('✓ setDrawingEnabled 호출 완료');
      
      if (newDrawingState) {
        // 드로잉 활성화 시 모든 설정 다시 적용
        console.log('드로잉 활성화 - 설정 적용 중...');
        
        // 펜 설정
        nv.setPenValue(penValue, isFilledPen);
        console.log('✓ 펜 값:', penValue, '채우기:', isFilledPen);
        
        // 투명도 설정
        nv.setDrawOpacity(drawOpacity);
        console.log('✓ 투명도:', drawOpacity);
        
        // 추가 설정 시도
        try {
          nv.setDrawColormap('red');
          console.log('✓ 컬러맵 설정');
        } catch (e) {
          console.log('컬러맵 설정 실패 (무시)');
        }
        
        console.log('🎨 드로잉 모드 활성화 완료!');
        alert('드로잉 모드가 활성화되었습니다. 이제 마우스로 그려보세요!');
        
      } else {
        console.log('👁️ 뷰어 모드로 전환');
      }
      
      setIsDrawingEnabled(newDrawingState);
      
    } catch (error) {
      console.error('❌ 드로잉 모드 토글 실패:', error);
      alert('드로잉 모드 전환에 실패했습니다: ' + error);
    }
  };

  // 펜 값 변경
  const handlePenValueChange = (value: number) => {
    console.log('=== 펜 값 변경 ===');
    console.log('새로운 펜 값:', value);
    console.log('현재 드로잉 상태:', isDrawingEnabled);
    
    setPenValue(value);
    
    if (niivueRef.current) {
      try {
        // 드로잉이 비활성화되어 있다면 자동 활성화
        if (!isDrawingEnabled) {
          console.log('드로잉 자동 활성화');
          niivueRef.current.setDrawingEnabled(true);
          setIsDrawingEnabled(true);
        }
        
        niivueRef.current.setPenValue(value, isFilledPen);
        console.log('✓ 펜 값 적용 완료:', value, '채우기:', isFilledPen);
        
        // 성공 메시지
        if (value === 0) {
          console.log('🧹 지우개 모드 (펜 값 0)');
        } else {
          console.log('🖊️ 그리기 모드 (펜 값', value + ')');
        }
        
      } catch (error) {
        console.error('❌ 펜 값 설정 실패:', error);
        alert('펜 설정에 실패했습니다: ' + error);
      }
    } else {
      console.log('❌ NiiVue 인스턴스가 없습니다');
    }
  };

  // 펜 모드 변경 (일반/채우기)
  const togglePenMode = () => {
    const newFilledState = !isFilledPen;
    console.log('펜 모드 변경:', newFilledState ? '채우기' : '펜');
    setIsFilledPen(newFilledState);
    
    if (niivueRef.current) {
      try {
        niivueRef.current.setPenValue(penValue, newFilledState);
        console.log('펜 모드 적용 완료:', newFilledState ? '채우기' : '펜');
      } catch (error) {
        console.error('펜 모드 설정 오류:', error);
      }
    }
  };

  // 드로잉 투명도 변경
  const handleOpacityChange = (opacity: number) => {
    setDrawOpacity(opacity);
    if (niivueRef.current) {
      niivueRef.current.setDrawOpacity(opacity);
    }
  };

  // 실행 취소
  const handleUndo = () => {
    if (niivueRef.current) {
      niivueRef.current.drawUndo();
    }
  };

  // 드로잉 지우기
  const handleClearDrawing = () => {
    if (niivueRef.current) {
      // 모든 드로잉을 지우는 방법
      niivueRef.current.setDrawingEnabled(false);
      niivueRef.current.setDrawingEnabled(true);
      niivueRef.current.setPenValue(penValue, isFilledPen);
    }
  };

  // Grow Cut 세그멘테이션 실행
  const handleGrowCut = () => {
    if (niivueRef.current) {
      niivueRef.current.drawGrowCut();
    }
  };

  // 뇌 영상과 드로잉이 합쳐진 PNG 저장 (개선된 방식)
  const handleSaveSegmentation = async () => {
    if (!niivueRef.current || !patientId) {
      alert('환자 정보가 없거나 뷰어가 초기화되지 않았습니다.');
      return;
    }

    const nv = niivueRef.current;
    
    try {
      console.log('=== 뇌 영상 + 드로잉 PNG 저장 시작 (개선된 방식) ===');
      
      // 로딩 상태 표시
      setIsLoading(true);
      
      // 🔍 저장 전 상태 체크
      console.log('저장 전 NiiVue 상태 체크:', {
        volumes: nv.volumes?.length || 0,
        drawBitmap: nv.drawBitmap?.length || 0,
        drawingEnabled: nv.opts?.isDrawingEnabled,
        canvas: !!nv.canvas
      });
      
      // 🎯 뇌 영상 가시성 강제 확인 및 복원
      if (nv.volumes && nv.volumes.length > 0) {
        const vol = nv.volumes[0];
        console.log('볼륨 상태 체크:', {
          opacity: vol.opacity,
          colormap: vol.colormap,
          visible: vol.opacity > 0
        });
        
        // 투명도가 0이면 강제로 1.0으로 설정
        if (vol.opacity <= 0) {
          console.log('⚠️ 볼륨 투명도가 0입니다. 1.0으로 복원...');
          nv.setOpacity(0, 1.0);
        }
        
        // 컬러맵 재적용
        nv.setColormap(0, currentColormap);
        console.log('✓ 컬러맵 재적용:', currentColormap);
      }
      
      // 🚀 여러 번의 강제 렌더링으로 안정성 확보
      console.log('🎬 다중 렌더링 시작...');
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        nv.drawScene();
        console.log(`✓ 렌더링 ${i + 1}/3 완료`);
      }
      
      // 🎯 캔버스 확인
      const canvas = nv.canvas;
      if (!canvas) {
        throw new Error('NiiVue 캔버스를 찾을 수 없습니다.');
      }
      
      console.log('📸 캔버스 정보:', {
        width: canvas.width,
        height: canvas.height,
        type: canvas.constructor.name
      });
      
      // 🔧 WebGL 컨텍스트 설정 확인 (preserveDrawingBuffer)
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
      if (gl) {
        console.log('WebGL 컨텍스트 정보:', {
          preserveDrawingBuffer: gl.getContextAttributes()?.preserveDrawingBuffer
        });
      }
      
      // 💾 캡처 시도 (여러 방법으로 시도)
      let blob: Blob;
      
      try {
        // 방법 1: toBlob (권장)
        console.log('📷 방법 1: toBlob 시도...');
        blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((result: Blob | null) => {
            if (result && result.size > 1000) { // 최소 1KB 이상이어야 유효한 이미지
              resolve(result);
            } else {
              reject(new Error(`toBlob 실패 또는 빈 이미지 (크기: ${result?.size || 0})`));
            }
          }, 'image/png', 1.0);
        });
        console.log('✅ toBlob 성공');
        
      } catch (blobError) {
        console.warn('⚠️ toBlob 실패, toDataURL 시도...', blobError);
        
        // 방법 2: toDataURL 백업
        const dataURL = canvas.toDataURL('image/png', 1.0);
        if (dataURL.length < 1000) {
          throw new Error(`캔버스가 비어있습니다 (DataURL 길이: ${dataURL.length})`);
        }
        
        // DataURL을 Blob으로 변환
        const response = await fetch(dataURL);
        blob = await response.blob();
        console.log('✅ toDataURL 백업 성공');
      }
      
      // 파일명 생성
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `breast_drawing_patient_${patientId}_${timestamp}.png`;
      
      console.log('💾 PNG 생성 완료:', {
        filename,
        size: blob.size,
        type: blob.type
      });
      
      // 크기 검증
      if (blob.size < 1000) {
        throw new Error(`생성된 이미지가 너무 작습니다 (${blob.size} bytes). 뇌 영상이 제대로 렌더링되지 않았을 수 있습니다.`);
      }
      
      // 서버로 업로드
      await uploadPngToServer(blob, filename);
      
    } catch (error) {
      console.error('❌ PNG 저장 오류:', error);
      alert('저장 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    } finally {
      setIsLoading(false);
    }
  };

  // PNG 파일을 서버로 업로드하는 함수
  const uploadPngToServer = async (blob: Blob, filename: string) => {
    try {
      console.log('📤 PNG 서버 업로드 시작:', filename);
      
      const formData = new FormData();
      const file = new File([blob], filename, { type: 'image/png' });
      formData.append('file', file);

      // 로컬 API 엔드포인트 사용 (MPRViewer와 동일한 방식)
      const response = await fetch(`/api/users/upload-drawing-local/${patientId}`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ PNG 업로드 성공:', result);
        
        // 성공 메시지
        alert(`뇌 영상과 드로잉이 성공적으로 저장되었습니다!\n파일명: ${filename}`);
        
        // 페이지 새로고침으로 Drawing file 목록 업데이트
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        
      } else {
        const errorData = await response.json();
        console.error('❌ PNG 업로드 실패:', errorData);
        throw new Error(errorData.error || 'PNG 업로드에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ PNG 서버 업로드 오류:', error);
      alert(`PNG 업로드에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  // 컬러맵 변경
  const handleColormapChange = (colormap: string) => {
    setCurrentColormap(colormap);
    
    // 즉시 NiiVue에 적용
    if (niivueRef.current && niivueRef.current.volumes.length > 0) {
      try {
        niivueRef.current.setColormap(0, colormap);
        niivueRef.current.setOpacity(0, 1.0); // 투명도 다시 확인
        console.log('✅ 컬러맵 변경 적용:', colormap);
      } catch (error) {
        console.error('컬러맵 변경 오류:', error);
      }
    }
  };

  // Click-to-Segment 토글
  const toggleClickToSegment = () => {
    setClickToSegment(!clickToSegment);
  };

  // 2D/3D 세그멘테이션 토글
  const toggleSegmentDimension = () => {
    setSegmentIs2D(!segmentIs2D);
  };

  // 레이아웃 테스트 (해부학적 방향 맞추기)
  const testLayout = () => {
    if (!niivueRef.current) {
      alert('NiiVue가 초기화되지 않았습니다.');
      return;
    }

    const nv = niivueRef.current;
    console.log('=== 레이아웃 테스트 ===');

    // 현재 레이아웃 확인
    const currentLayout = nv.opts.multiplanarLayout;
    console.log('현재 레이아웃:', currentLayout);

    // 다음 레이아웃으로 변경 (0, 1, 2, 3 순환)
    const nextLayout = (currentLayout + 1) % 4;
    nv.opts.multiplanarLayout = nextLayout;
    
    console.log('새 레이아웃:', nextLayout);
    alert(`레이아웃 ${nextLayout}로 변경했습니다.\n0: 메인뷰어와 동일, 1: 변형1, 2: 변형2, 3: 변형3`);

    // 화면 업데이트
    nv.updateGLVolume();
  };

  // 캔버스 디버그 정보 출력 (지피티 제안)
  const debugCanvases = () => {
    console.log('=== 캔버스 디버그 정보 ===');
    
    const canvases = [...document.querySelectorAll('canvas')];
    console.table(
      canvases.map((c, i) => ({
        idx: i,
        id: c.id || '(no id)',
        width: c.width,
        height: c.height,
        zIndex: getComputedStyle(c).zIndex,
        className: c.className || '(no class)',
        isNiivueCanvas: c === niivueRef.current?.canvas
      }))
    );
    
    if (niivueRef.current?.canvas) {
      console.log('✓ NiiVue 캔버스 확인됨:', niivueRef.current.canvas);
      
      // 🔍 NiiVue 상태 상세 디버깅
      const nv = niivueRef.current;
      console.log('=== NiiVue 상태 디버깅 ===');
      console.log('볼륨 개수:', nv.volumes?.length || 0);
      console.log('드로잉 비트맵:', nv.drawBitmap?.length || 0);
      console.log('드로잉 활성화:', nv.opts?.isDrawingEnabled);
      
      if (nv.volumes && nv.volumes.length > 0) {
        const vol = nv.volumes[0];
        console.log('첫 번째 볼륨 상태:', {
          opacity: vol.opacity,
          colormap: vol.colormap,
          cal_min: vol.cal_min,
          cal_max: vol.cal_max,
          visible: vol.opacity > 0
        });
      }
      
      // 🎯 캔버스 내용 미리보기 테스트
      try {
        const testDataURL = nv.canvas.toDataURL('image/png', 1.0);
        console.log('캔버스 내용 길이:', testDataURL.length);
        console.log('캔버스 내용 미리보기:', testDataURL.substring(0, 100) + '...');
      } catch (e) {
        console.error('캔버스 toDataURL 실패:', e);
      }
      
    } else {
      console.log('❌ NiiVue 캔버스를 찾을 수 없음');
    }
    
    alert(`총 ${canvases.length}개의 캔버스가 발견되었습니다. 콘솔에서 자세한 정보를 확인하세요.`);
  };

  // 뇌 영상 가시성 강제 복원
  const forceShowBreast = () => {
    if (!niivueRef.current) {
      alert('NiiVue가 초기화되지 않았습니다.');
      return;
    }

    const nv = niivueRef.current;
    console.log('=== 뇌 영상 가시성 강제 복원 ===');

    try {
      // 볼륨이 로드되어 있는지 확인
      if (!nv.volumes || nv.volumes.length === 0) {
        alert('로드된 볼륨이 없습니다. NIfTI 파일을 먼저 로드해주세요.');
        return;
      }

      const vol = nv.volumes[0];
      console.log('현재 볼륨 상태:', {
        opacity: vol.opacity,
        cal_min: vol.cal_min,
        cal_max: vol.cal_max,
        colormap: vol.colormap
      });

      // 투명도 강제 설정
      nv.setOpacity(0, 1.0);
      console.log('✓ 투명도 1.0으로 설정');

      // 컬러맵 재적용
      nv.setColormap(0, currentColormap);
      console.log('✓ 컬러맵 재적용:', currentColormap);

      // 스케일 자동 조정
      if (vol.robust_min !== undefined && vol.robust_max !== undefined) {
        nv.setScale(0, vol.robust_min, vol.robust_max);
        console.log('✓ 스케일 자동 조정:', vol.robust_min, vol.robust_max);
      }

      // 레이아웃 설정 재적용 (올바른 해부학적 방향으로)
      nv.opts.multiplanarLayout = 0; // 메인 뷰어와 동일한 레이아웃
      nv.opts.multiplanarPadPixels = 4; // 패딩 고정
      console.log('✓ 멀티플래너 해부학적 방향 재고정');

      // 화면 업데이트
      nv.updateGLVolume();
      console.log('✓ GL 볼륨 업데이트');

      alert('뇌 영상 가시성과 레이아웃을 복원했습니다.');

    } catch (error) {
      console.error('❌ 뇌 영상 복원 실패:', error);
      alert('뇌 영상 복원에 실패했습니다: ' + error);
    }
  };

  // 🧪 저장 전 미리보기 테스트
  const testSavePreview = async () => {
    if (!niivueRef.current) {
      alert('NiiVue가 초기화되지 않았습니다.');
      return;
    }

    const nv = niivueRef.current;
    
    try {
      console.log('=== 저장 미리보기 테스트 ===');
      
      // 강제 렌더링
      await new Promise(resolve => requestAnimationFrame(resolve));
      nv.drawScene();
      
      const canvas = nv.canvas;
      if (!canvas) {
        alert('캔버스를 찾을 수 없습니다.');
        return;
      }
      
      // 캔버스 내용을 DataURL로 변환하여 새 창에서 미리보기
      const dataURL = canvas.toDataURL('image/png', 1.0);
      
      if (dataURL.length < 1000) {
        alert(`⚠️ 캔버스가 비어있거나 내용이 부족합니다 (길이: ${dataURL.length})`);
        return;
      }
      
      // 새 창에서 미리보기 표시
      const previewWindow = window.open('', '_blank', 'width=800,height=600');
      if (previewWindow) {
        previewWindow.document.write(`
          <html>
            <head><title>저장 미리보기</title></head>
            <body style="margin:0; background:#000; display:flex; justify-content:center; align-items:center;">
              <div style="text-align:center; color:white;">
                <h3>저장될 이미지 미리보기</h3>
                <img src="${dataURL}" style="max-width:90%; max-height:80%; border:1px solid #333;">
                <p>크기: ${dataURL.length} bytes</p>
              </div>
            </body>
          </html>
        `);
        previewWindow.document.close();
      }
      
      console.log('✅ 미리보기 생성 완료, 새 창에서 확인하세요.');
      
    } catch (error) {
      console.error('❌ 미리보기 테스트 실패:', error);
      alert('미리보기 생성에 실패했습니다: ' + error);
    }
  };

  // 🎯 GPT 방식: 두 캔버스 합성하여 저장
  const handleSaveSegmentationGPTWay = async () => {
    if (!niivueRef.current || !patientId) {
      alert('환자 정보가 없거나 뷰어가 초기화되지 않았습니다.');
      return;
    }

    const nv = niivueRef.current;
    
    try {
      console.log('=== GPT 방식: 두 캔버스 합성 저장 시작 ===');
      
      setIsLoading(true);
      
      // 🔍 모든 캔버스 찾기
      const allCanvases = [...document.querySelectorAll('canvas')];
      console.log('페이지의 모든 캔버스:', allCanvases.map((c, i) => ({
        index: i,
        id: c.id || '(no id)',
        className: c.className || '(no class)',
        width: c.width,
        height: c.height,
        isNiivueCanvas: c === nv.canvas
      })));
      
      // 🎯 NiiVue WebGL 캔버스 (뇌 영상)
      const glCanvas = nv.canvas;
      if (!glCanvas) {
        throw new Error('NiiVue WebGL 캔버스를 찾을 수 없습니다.');
      }
      
      // 🔍 드로잉 캔버스 찾기 (NiiVue 캔버스가 아닌 다른 캔버스들 중에서)
      let drawCanvas: HTMLCanvasElement | null = null;
      
      // 방법 1: NiiVue 캔버스와 다른 캔버스 찾기
      const otherCanvases = allCanvases.filter(c => c !== glCanvas);
      if (otherCanvases.length > 0) {
        drawCanvas = otherCanvases[0] as HTMLCanvasElement;
        console.log('✓ 드로잉 캔버스 후보 발견:', drawCanvas);
      }
      
      // 방법 2: 만약 별도 드로잉 캔버스가 없다면, NiiVue 내부에서 드로잉 레이어 추출 시도
      if (!drawCanvas) {
        console.log('⚠️ 별도 드로잉 캔버스가 없습니다. NiiVue 단일 캔버스 방식 사용...');
        
        // NiiVue 단일 캔버스에서 뇌 영상만 따로 렌더링 시도
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = glCanvas.width;
        tempCanvas.height = glCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (tempCtx) {
          // 드로잉 비활성화 상태로 임시 렌더링
          const originalDrawingState = nv.opts?.isDrawingEnabled;
          
          try {
            // 드로잉 임시 비활성화
            nv.setDrawingEnabled(false);
            await new Promise(resolve => requestAnimationFrame(resolve));
            nv.drawScene();
            
            // 뇌 영상만 캡처
            tempCtx.drawImage(glCanvas, 0, 0);
            
            // 드로잉 다시 활성화
            nv.setDrawingEnabled(originalDrawingState || true);
            await new Promise(resolve => requestAnimationFrame(resolve));
            nv.drawScene();
            
            console.log('✓ 뇌 영상 전용 캔버스 생성 완료');
            
            // 이제 합성: 뇌 영상(tempCanvas) + 드로잉(glCanvas)
            return await compositeTwoCanvases(tempCanvas, glCanvas);
            
          } catch (e) {
            console.error('임시 캔버스 생성 실패:', e);
            // 드로잉 상태 복원
            nv.setDrawingEnabled(originalDrawingState || true);
          }
        }
      }
      
      // 방법 3: 두 개의 캔버스가 있는 경우 합성
      if (drawCanvas) {
        console.log('✓ 두 캔버스 합성 시작...');
        return await compositeTwoCanvases(glCanvas, drawCanvas);
      }
      
      // 방법 4: 최후의 수단 - 기존 방식
      console.log('⚠️ 캔버스 합성 불가, 기존 방식 사용...');
      throw new Error('적절한 캔버스 구성을 찾을 수 없습니다. 기존 저장 방식을 사용해주세요.');
      
    } catch (error) {
      console.error('❌ GPT 방식 저장 오류:', error);
      alert('GPT 방식 저장 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    } finally {
      setIsLoading(false);
    }
  };

  // 🎨 두 캔버스 합성 함수 (GPT 제안 방식)
  const compositeTwoCanvases = async (breastCanvas: HTMLCanvasElement, drawingCanvas: HTMLCanvasElement) => {
    console.log('=== 두 캔버스 합성 시작 ===');
    console.log('뇌 캔버스:', { width: breastCanvas.width, height: breastCanvas.height });
    console.log('드로잉 캔버스:', { width: drawingCanvas.width, height: drawingCanvas.height });
    
    // 최신 프레임으로 강제 렌더링
    if (niivueRef.current) {
      niivueRef.current.drawScene();
    }
    
    // 더 큰 캔버스 크기 사용
    const width = Math.max(breastCanvas.width, drawingCanvas.width);
    const height = Math.max(breastCanvas.height, drawingCanvas.height);
    
    // 드로잉 캔버스 크기 맞추기
    if (drawingCanvas.width !== width || drawingCanvas.height !== height) {
      drawingCanvas.width = width;
      drawingCanvas.height = height;
      console.log('✓ 드로잉 캔버스 크기 조정:', { width, height });
    }
    
    // 합성용 임시 캔버스 생성
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    const ctx = outputCanvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('합성 캔버스 컨텍스트를 생성할 수 없습니다.');
    }
    
    // requestAnimationFrame으로 안전한 타이밍 확보
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    try {
      // 1단계: 뇌 영상 (배경)
      console.log('🧠 1단계: 뇌 영상 그리기...');
      ctx.drawImage(breastCanvas, 0, 0, width, height);
      
      // 2단계: 드로잉 (오버레이)
      console.log('🖊️ 2단계: 드로잉 오버레이...');
      ctx.drawImage(drawingCanvas, 0, 0, width, height);
      
      // 3단계: JPG로 변환
      console.log('💾 3단계: JPG 변환...');
      const dataURL = outputCanvas.toDataURL('image/jpeg', 0.92);
      
      if (dataURL.length < 1000) {
        throw new Error(`합성된 이미지가 비어있습니다 (길이: ${dataURL.length})`);
      }
      
      // Blob 생성
      const response = await fetch(dataURL);
      const blob = await response.blob();
      
      // 파일명 생성
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `breast_drawing_composite_${patientId}_${timestamp}.jpg`;
      
      console.log('✅ 캔버스 합성 완료:', {
        filename,
        size: blob.size,
        dimensions: `${width}x${height}`
      });
      
      // 서버로 업로드
      await uploadPngToServer(blob, filename);
      
    } catch (drawError) {
      console.error('캔버스 합성 중 오류:', drawError);
      throw new Error('이미지 합성 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <div className="text-white text-sm font-medium mb-3">{title}</div>
      
      {/* 드로잉 컨트롤 패널 */}
      <div className="mb-4 p-3 bg-gray-700 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* 드로잉 모드 토글 */}
          <button
            onClick={toggleDrawing}
            className={`px-3 py-2 rounded font-medium transition-colors ${
              isDrawingEnabled 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
            }`}
          >
            {isDrawingEnabled ? '드로잉 ON' : '드로잉 OFF'}
          </button>

          {/* 펜 모드 토글 */}
          <button
            onClick={togglePenMode}
            disabled={!isDrawingEnabled}
            className={`px-3 py-2 rounded font-medium transition-colors ${
              isFilledPen 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isFilledPen ? '채우기' : '펜'}
          </button>

          {/* Click-to-Segment 토글 */}
          <button
            onClick={toggleClickToSegment}
            className={`px-3 py-2 rounded font-medium transition-colors ${
              clickToSegment 
                ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
            }`}
          >
            {clickToSegment ? '자동 ON' : '자동 OFF'}
          </button>

          {/* 2D/3D 세그멘테이션 */}
          <button
            onClick={toggleSegmentDimension}
            disabled={!clickToSegment}
            className={`px-3 py-2 rounded font-medium transition-colors ${
              segmentIs2D 
                ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {segmentIs2D ? '2D' : '3D'}
          </button>
        </div>

        {/* 펜 값 선택 */}
        <div className="mt-3 flex items-center gap-3">
          <label className="text-white text-xs font-medium">펜 값:</label>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5, 6].map((value) => (
              <button
                key={value}
                onClick={() => handlePenValueChange(value)}
                disabled={!isDrawingEnabled && value !== 0}
                className={`w-8 h-8 rounded text-xs font-bold border-2 transition-all ${
                  penValue === value 
                    ? 'border-white scale-110' 
                    : 'border-gray-400 hover:border-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                style={{
                  backgroundColor: value === 0 ? '#000000' : 
                    value === 1 ? '#FF0000' : 
                    value === 2 ? '#00FF00' : 
                    value === 3 ? '#0000FF' : 
                    value === 4 ? '#FF00FF' : 
                    value === 5 ? '#FFFF00' : '#00FFFF',
                  color: value === 0 || value === 3 ? '#FFFFFF' : '#000000'
                }}
                title={drawingColormap.labels[value]}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {/* 투명도 조절 */}
        <div className="mt-3 flex items-center gap-3">
          <label className="text-white text-xs font-medium">투명도:</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={drawOpacity}
            onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-white text-xs w-8">{Math.round(drawOpacity * 100)}%</span>
        </div>

        {/* 컬러맵 선택 */}
        <div className="mt-3 flex items-center gap-3">
          <label className="text-white text-xs font-medium">{t.colormap}:</label>
          <select
            value={currentColormap}
            onChange={(e) => handleColormapChange(e.target.value)}
            className="px-2 py-1 bg-gray-600 text-white text-xs rounded border border-gray-500 focus:border-blue-400 focus:outline-none"
          >
            <option value="gray">Gray</option>
            <option value="hot">Hot</option>
            <option value="cool">Cool</option>
            <option value="jet">Jet</option>
            <option value="winter">Winter</option>
            <option value="summer">Summer</option>
          </select>
        </div>

        {/* 액션 버튼들 */}
        <div className="mt-3 grid grid-cols-2 md:grid-cols-9 gap-2">
          <button
            onClick={handleUndo}
            disabled={!isDrawingEnabled}
            className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            실행취소
          </button>
          
          <button
            onClick={handleClearDrawing}
            disabled={!isDrawingEnabled}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            모두지우기
          </button>
          
          <button
            onClick={handleGrowCut}
            disabled={!isDrawingEnabled}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Grow Cut
          </button>

          <button
            onClick={forceShowBreast}
            className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs rounded font-medium transition-colors"
            title="뇌 영상이 안 보일 때 가시성을 강제로 복원"
          >
            뇌 복원
          </button>

          <button
            onClick={testLayout}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded font-medium transition-colors"
            title="해부학적 방향을 맞추기 위해 레이아웃을 테스트"
          >
            방향 테스트
          </button>

          <button
            onClick={debugCanvases}
            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded font-medium transition-colors"
            title="캔버스 디버그 정보 출력 (지피티 제안)"
          >
            캔버스 디버그
          </button>

          <button
            onClick={testSavePreview}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-medium transition-colors"
            title="저장될 이미지를 미리보기로 확인"
          >
            미리보기
          </button>
          
          <button
            onClick={handleSaveSegmentation}
            disabled={isLoading}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            title="뇌 영상과 드로잉을 합쳐서 PNG 파일로 저장 (개선된 방식)"
          >
            {isLoading ? (
              <>
                <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full"></div>
                PNG 저장중...
              </>
            ) : (
              'PNG 저장'
            )}
          </button>

          <button
            onClick={handleSaveSegmentationGPTWay}
            disabled={isLoading}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            title="GPT 제안 방식: 두 캔버스 합성하여 저장"
          >
            {isLoading ? (
              <>
                <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full"></div>
                GPT 저장중...
              </>
            ) : (
              'GPT 저장'
            )}
          </button>
        </div>
      </div>
      
      {/* 캔버스 영역 */}
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {fileUrl ? (
          <div className="w-full h-full relative">
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              style={{ 
                imageRendering: 'pixelated',
                cursor: isDrawingEnabled ? 'crosshair' : 'default'
              }}
            />
            
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-white text-sm">
                  <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                  NIfTI 파일 로딩 중...
                </div>
              </div>
            )}
            
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-50">
                <div className="text-white text-sm text-center px-4">
                  <div className="text-red-400 mb-2">⚠️ 오류</div>
                  <div>{error}</div>
                </div>
              </div>
            )}

          </div>
        ) : (
          /* Placeholder */
          <div className="w-full h-full bg-gray-900 flex items-center justify-center relative">
            <div className="text-center text-gray-400">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-gray-600 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border border-gray-600"></div>
              </div>
              <div className="text-sm">NIfTI 파일을 로드하세요</div>
            </div>
          </div>
        )}
      </div>

      {/* 범례 */}
      <div className="mt-3 p-2 bg-gray-700 rounded-lg">
        <div className="text-white text-xs font-medium mb-2">드로잉 컬러 범례</div>
        <div className="flex flex-wrap gap-2">
          {drawingColormap.labels.map((label, index) => (
            <div key={index} className="flex items-center gap-1">
              <div 
                className="w-3 h-3 rounded border border-gray-400"
                style={{
                  backgroundColor: index === 0 ? '#000000' : 
                    index === 1 ? '#FF0000' : 
                    index === 2 ? '#00FF00' : 
                    index === 3 ? '#0000FF' : 
                    index === 4 ? '#FF00FF' : 
                    index === 5 ? '#FFFF00' : '#00FFFF'
                }}
              ></div>
              <span className="text-white text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

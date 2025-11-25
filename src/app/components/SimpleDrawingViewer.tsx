'use client';

import { useEffect, useRef, useState } from 'react';
// import { Niivue } from '@niivue/niivue'; // 동적 import로 변경

// NiiVue 타입 정의 (동적 import를 위한)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NiivueInstance = any;

interface SimpleDrawingViewerProps {
  fileUrl?: string;
  title: string;
  className?: string;
  patientId?: number;
}

export default function SimpleDrawingViewer({ 
  fileUrl, 
  title, 
  className = '',
  patientId
}: SimpleDrawingViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const niivueRef = useRef<NiivueInstance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [penValue, setPenValue] = useState(1);

  // NiiVue 초기화
  useEffect(() => {
    if (!canvasRef.current) return;

    const initNiiVue = async () => {
      try {
        console.log('=== NiiVue 초기화 시작 ===');
        
        // WebGL 컨텍스트 사전 확인
        const canvas = canvasRef.current!;
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) {
          throw new Error('WebGL을 지원하지 않는 브라우저입니다.');
        }
        
        // 동적 import로 NiiVue 로드
        const niivueModule = await import('@niivue/niivue');
        const { Niivue } = niivueModule;
        
        // 가장 기본적인 설정으로 NiiVue 생성
        const nv = new Niivue();
        
        // 캔버스 연결 전 추가 안전 검사
        if (canvasRef.current && canvasRef.current.parentElement) {
          await nv.attachToCanvas(canvasRef.current);
          
          // WebGL 컨텍스트 안정성 확인
          if (!nv.gl || nv.gl.isContextLost()) {
            throw new Error('WebGL 컨텍스트가 손실되었습니다.');
          }
          console.log('캔버스 연결 완료');
        } else {
          console.warn('⚠️ 심플 드로잉 뷰어 캔버스가 DOM에 연결되지 않음');
          return;
        }
        
        // 기본 설정
        nv.setSliceType(nv.sliceTypeMultiplanar);
        
        niivueRef.current = nv;
        
        // 파일 로드
        if (fileUrl) {
          console.log('파일 로드 시작:', fileUrl);
          await loadNiftiFile(nv, fileUrl);
        }
        
        console.log('=== NiiVue 초기화 완료 ===');
        
      } catch (err) {
        console.error('NiiVue 초기화 오류:', err);
        setError('뷰어 초기화 중 오류가 발생했습니다.');
      }
    };

    initNiiVue();

    return () => {
      if (niivueRef.current) {
        niivueRef.current = null;
      }
    };
  }, [fileUrl]);

  // NIfTI 파일 로드
  const loadNiftiFile = async (nv: NiivueInstance, url: string) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('파일 로드 중:', url);
      
      const volume = {
        url: url,
        colormap: 'gray',
        opacity: 1.0
      };

      await nv.loadVolumes([volume]);
      console.log('파일 로드 완료');
      
    } catch (err) {
      console.error('NIfTI 파일 로드 오류:', err);
      setError(err instanceof Error ? err.message : '파일 로드 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 드로잉 모드 토글
  const toggleDrawingMode = () => {
    if (!niivueRef.current) {
      console.log('NiiVue 인스턴스가 없습니다');
      return;
    }

    const nv = niivueRef.current;
    const newMode = !isDrawingMode;
    
    console.log('=== 드로잉 모드 토글 ===');
    console.log('새로운 모드:', newMode ? 'ON' : 'OFF');
    
    try {
      if (newMode) {
        // 드로잉 활성화
        console.log('드로잉 활성화 시도...');
        nv.setDrawingEnabled(true);
        
        // 펜 설정
        console.log('펜 값 설정:', penValue);
        nv.setPenValue(penValue, false);
        
        // 투명도 설정
        nv.setDrawOpacity(0.8);
        
        console.log('드로잉 설정 완료');
      } else {
        // 드로잉 비활성화
        console.log('드로잉 비활성화');
        nv.setDrawingEnabled(false);
      }
      
      setIsDrawingMode(newMode);
      
    } catch (error) {
      console.error('드로잉 모드 설정 오류:', error);
      alert('드로잉 모드 설정 중 오류가 발생했습니다: ' + error);
    }
  };

  // 펜 값 변경
  const changePenValue = (value: number) => {
    console.log('펜 값 변경:', value);
    setPenValue(value);
    
    if (niivueRef.current && isDrawingMode) {
      try {
        niivueRef.current.setPenValue(value, false);
        console.log('펜 값 적용 완료');
      } catch (error) {
        console.error('펜 값 설정 오류:', error);
      }
    }
  };

  // 드로잉 지우기
  const clearDrawing = () => {
    if (!niivueRef.current) return;
    
    try {
      // 드로잉을 지우는 방법
      niivueRef.current.drawUndo(); // 또는 다른 메서드 시도
      console.log('드로잉 지우기 완료');
    } catch (error) {
      console.error('드로잉 지우기 오류:', error);
    }
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <div className="text-white text-sm font-medium mb-3">{title}</div>
      
      {/* 간단한 컨트롤 패널 */}
      <div className="mb-4 p-3 bg-gray-700 rounded-lg">
        <div className="flex gap-3 mb-3">
          {/* 드로잉 모드 토글 */}
          <button
            onClick={toggleDrawingMode}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              isDrawingMode 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
            }`}
          >
            {isDrawingMode ? '🎨 드로잉 ON' : '👁️ 뷰어 모드'}
          </button>

          {/* 드로잉 지우기 */}
          <button
            onClick={clearDrawing}
            disabled={!isDrawingMode}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            지우기
          </button>
        </div>

        {/* 펜 값 선택 */}
        {isDrawingMode && (
          <div className="flex items-center gap-3">
            <label className="text-white text-sm font-medium">펜 값:</label>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => changePenValue(value)}
                  className={`w-10 h-10 rounded text-sm font-bold border-2 transition-all ${
                    penValue === value 
                      ? 'border-white scale-110' 
                      : 'border-gray-400 hover:border-gray-300'
                  }`}
                  style={{
                    backgroundColor: value === 0 ? '#000000' : 
                      value === 1 ? '#FF0000' : 
                      value === 2 ? '#00FF00' : 
                      value === 3 ? '#0000FF' : 
                      value === 4 ? '#FF00FF' : '#FFFF00',
                    color: value === 0 || value === 3 ? '#FFFFFF' : '#000000'
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        )}
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
                cursor: isDrawingMode ? 'crosshair' : 'default'
              }}
            />
            
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-white text-sm">
                  <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                  파일 로딩 중...
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

            {/* 상태 표시 */}
            <div className="absolute top-2 left-2 text-white text-xs bg-black bg-opacity-70 px-2 py-1 rounded">
              {isDrawingMode ? (
                <div className="text-green-400">
                  ✏️ 드로잉 모드 | 펜: {penValue}
                </div>
              ) : (
                <div className="text-gray-400">
                  👁️ 뷰어 모드
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-sm">NIfTI 파일을 로드하세요</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

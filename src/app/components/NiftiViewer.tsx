'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as nifti from 'nifti-reader-js';

// 슬라이더 CSS 스타일
const sliderStyle = `
  .nifti-slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ffffff;
    border: 2px solid #3b82f6;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  
  .nifti-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ffffff;
    border: 2px solid #3b82f6;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
`;

interface NiftiViewerProps {
  fileUrl?: string;
  title: string;
  className?: string;
  niftiHeader?: NiftiHeader;
  niftiImage?: ArrayBuffer;
  plane?: 'axial' | 'coronal' | 'sagittal';
  slice?: number;
  patientId?: number; // 환자 ID 추가
  originalNiftiUrl?: string; // 원본 NIfTI URL 추가
  globalSelectedSegFile?: string | null; // 전역 segmentation 파일
}

interface NiftiHeader {
  dims: number[];
  pixDims: number[];
  affine?: number[][];
  [key: string]: unknown;
}

interface NiftiData {
  header: NiftiHeader;
  image: ArrayBuffer;
  dimensions: number[];
  pixelData: Float32Array | Uint8Array | Uint16Array;
}

export default function NiftiViewer({ 
  fileUrl, 
  title, 
  className = '',
  niftiHeader,
  niftiImage,
  plane,
  slice,
  patientId,
  originalNiftiUrl,
  globalSelectedSegFile
}: NiftiViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [niftiData, setNiftiData] = useState<NiftiData | null>(null);
  const [currentSlice, setCurrentSlice] = useState(0);
  const [maxSlices, setMaxSlices] = useState(0);
  
  // Segmentation 데이터 상태 (전역 파일에서 로드된 데이터)
  const [segmentationData, setSegmentationData] = useState<NiftiData | null>(null);
  
  // Pan 기능을 위한 상태
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  // Zoom 기능을 위한 상태
  const [zoomLevel, setZoomLevel] = useState(0.5);
  const [isZoomDragging, setIsZoomDragging] = useState(false);
  const minZoom = 0.1;
  const maxZoom = 1.0;



  // Segmentation 데이터 로드 함수
  const loadSegmentationData = async (segUrl: string) => {
    try {
      console.log('NiftiViewer: Segmentation 데이터 로딩 시작:', segUrl);
      
      const response = await fetch(segUrl);
      if (!response.ok) {
        throw new Error(`Segmentation 파일을 다운로드할 수 없습니다. 상태: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = new ArrayBuffer(arrayBuffer.byteLength);
      const view = new Uint8Array(buffer);
      view.set(new Uint8Array(arrayBuffer));
      
      // NIfTI 파일 파싱
      const nifti = await import('nifti-reader-js');
      
      let processBuffer = buffer;
      
      // 압축된 파일인 경우 압축 해제
      if (nifti.isCompressed(buffer)) {
        console.log('NiftiViewer: Segmentation 압축된 파일 감지, 압축 해제 중...');
        processBuffer = nifti.decompress(buffer) as ArrayBuffer;
      }
      
      // NIfTI 파일인지 확인
      if (!nifti.isNIFTI(processBuffer)) {
        throw new Error('유효한 Segmentation NIfTI 파일이 아닙니다.');
      }
      
      const header = nifti.readHeader(processBuffer);
      const image = nifti.readImage(header, processBuffer);
      const typedData = new Float32Array(image as ArrayBuffer);
      
      setSegmentationData({
        header: header as unknown as NiftiHeader,
        image,
        dimensions: header.dims.slice(1, 4),
        pixelData: typedData
      });
      
      console.log('NiftiViewer: Segmentation 데이터 로딩 성공');
      
    } catch (error) {
      console.error('NiftiViewer: Segmentation 데이터 로딩 실패:', error);
      setSegmentationData(null);
    }
  };

  // 전역 segmentation 파일이 변경될 때 데이터 로드
  useEffect(() => {
    if (globalSelectedSegFile) {
      loadSegmentationData(globalSelectedSegFile);
    } else {
      setSegmentationData(null);
    }
  }, [globalSelectedSegFile]);

  useEffect(() => {
    // 직접 전달받은 NIfTI 데이터가 있으면 우선 사용
    if (niftiHeader && niftiImage && plane && slice !== undefined) {
      const niftiData = {
        header: niftiHeader,
        image: niftiImage,
        dimensions: niftiHeader.dims.slice(1, 4),
        pixelData: new Float32Array(niftiImage)
      };
      setNiftiData(niftiData);
      setCurrentSlice(slice);
      
      // 각 뷰별 최대 슬라이스 수 계산
      const [width, height, depth] = niftiHeader.dims.slice(1, 4);
      let maxSlicesForPlane;
      if (plane === 'axial') {
        maxSlicesForPlane = depth; // Z축 (위→아래)
      } else if (plane === 'coronal') {
        maxSlicesForPlane = height; // Y축 (앞→뒤)
      } else if (plane === 'sagittal') {
        maxSlicesForPlane = width; // X축 (좌→우)
      } else {
        maxSlicesForPlane = depth; // 기본값
      }
      setMaxSlices(maxSlicesForPlane);
      return;
    }
    
    if (!fileUrl || !canvasRef.current) return;

    const loadNiftiFile = async () => {
      setIsLoading(true);
      setError(null);
      console.log('NiftiViewer: 파일 로딩 시작:', fileUrl);

      try {
        console.log('NiftiViewer: 파일 URL:', fileUrl);
        
        // NIfTI 파일 다운로드
        const response = await fetch(fileUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/octet-stream, application/gzip, */*',
          },
          mode: 'cors',
          credentials: 'same-origin'
        });
        
        console.log('NiftiViewer: 응답 상태:', response.status, response.statusText);
        console.log('NiftiViewer: 응답 헤더:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          throw new Error(`파일을 다운로드할 수 없습니다. 상태: ${response.status} - ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        console.log('NiftiViewer: 파일 크기:', arrayBuffer.byteLength, 'bytes');
        console.log('NiftiViewer: ArrayBuffer 타입:', arrayBuffer.constructor.name);
        
        // ArrayBuffer를 새로운 ArrayBuffer로 복사 (타입 호환성 문제 해결)
        const buffer = new ArrayBuffer(arrayBuffer.byteLength);
        const view = new Uint8Array(buffer);
        view.set(new Uint8Array(arrayBuffer));
        
        console.log('NiftiViewer: 새 ArrayBuffer 크기:', buffer.byteLength, 'bytes');
        
        // NIfTI 파일 파싱
        console.log('NiftiViewer: 압축 여부 확인:', nifti.isCompressed(buffer));
        
        let processBuffer = buffer;
        
        // 압축된 파일인 경우 압축 해제
        if (nifti.isCompressed(buffer)) {
          console.log('NiftiViewer: 압축된 파일 감지, 압축 해제 중...');
          processBuffer = nifti.decompress(buffer) as ArrayBuffer;
          console.log('NiftiViewer: 압축 해제 완료, 새 크기:', processBuffer.byteLength, 'bytes');
        }
        
        // NIfTI 파일인지 확인
        if (!nifti.isNIFTI(processBuffer)) {
          throw new Error('유효한 NIfTI 파일이 아닙니다.');
        }
        
        const header = nifti.readHeader(processBuffer);
        console.log('NiftiViewer: 헤더 파싱 완료:', header);
        console.log('NiftiViewer: 헤더 타입:', typeof header, header?.constructor?.name);

        const image = nifti.readImage(header, processBuffer);
        const typedData = new Float32Array(image as ArrayBuffer);
        
        // 차원 정보 추출
        const dims = header.dims.slice(1, 4); // [x, y, z]
        const [width, height, depth] = dims;
        
        // 각 뷰별 최대 슬라이스 수 계산
        let maxSlicesForPlane;
        if (plane === 'axial') {
          maxSlicesForPlane = depth; // Z축 (위→아래)
        } else if (plane === 'coronal') {
          maxSlicesForPlane = height; // Y축 (앞→뒤)
        } else if (plane === 'sagittal') {
          maxSlicesForPlane = width; // X축 (좌→우)
        } else {
          maxSlicesForPlane = depth; // 기본값 (axial)
        }
        
        console.log('NiftiViewer: 이미지 차원:', dims);
        console.log('NiftiViewer: 뷰 타입:', plane);
        console.log('NiftiViewer: 슬라이스 수:', maxSlicesForPlane);
        console.log('NiftiViewer: 픽셀 데이터 길이:', typedData.length);
        
        setNiftiData({
          header: header as unknown as NiftiHeader,
          image,
          dimensions: dims,
          pixelData: typedData
        });
        
        setMaxSlices(maxSlicesForPlane);
        setCurrentSlice(Math.floor(maxSlicesForPlane / 2)); // 중간 슬라이스부터 시작

      } catch (err) {
        console.error('NIfTI 파일 로드 오류:', err);
        
        // 네트워크 에러인지 확인
        if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
          setError('네트워크 연결 오류: 파일에 접근할 수 없습니다. 인터넷 연결을 확인하거나 잠시 후 다시 시도해주세요.');
        } else {
          setError(err instanceof Error ? err.message : '파일 로드 중 오류가 발생했습니다.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadNiftiFile();
  }, [fileUrl, niftiHeader, niftiImage, plane, slice]);

  // 마우스 이벤트 핸들러들
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setLastMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    e.currentTarget.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const currentMousePos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    const deltaX = currentMousePos.x - lastMousePos.x;
    const deltaY = currentMousePos.y - lastMousePos.y;

    setPanOffset(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));

    setLastMousePos(currentMousePos);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    e.currentTarget.style.cursor = 'grab';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    e.currentTarget.style.cursor = 'grab';
  };

  // 더블클릭으로 pan 리셋
  const handleDoubleClick = () => {
    setPanOffset({ x: 0, y: 0 });
  };

  // 마우스 휠로 줌 - useCallback으로 최적화 (vec4/vec410 에러 방지)
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      
      // 기본 상태 검증 (vec4/vec410 에러 방지)
      if (!canvasRef.current) {
        console.warn('⚠️ NiftiViewer 캔버스가 준비되지 않음 - 휠 이벤트 무시');
        return;
      }
      
      const delta = e.deltaY > 0 ? -0.02 : 0.02; // 더욱 부드러운 줌 (0.05 -> 0.02)
      const newZoom = Math.max(minZoom, Math.min(maxZoom, zoomLevel + delta));
      setZoomLevel(newZoom);
    } catch (wheelError) {
      console.error('❌ NiftiViewer 휠 이벤트 처리 에러:', wheelError);
      // vec4/vec410 관련 에러인지 확인
      if (wheelError instanceof Error && wheelError.message && (wheelError.message.includes('vec4') || wheelError.message.includes('410'))) {
        console.warn('🔧 vec4/vec410 에러 감지 - NiftiViewer 휠 이벤트 무시');
      }
    }
  }, [zoomLevel, minZoom, maxZoom]);

  // 줌 슬라이더 드래그 핸들러들
  const handleZoomMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsZoomDragging(true);
    updateZoomFromMousePosition(e);
  };

  const handleZoomMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomDragging) return;
    e.stopPropagation();
    updateZoomFromMousePosition(e);
  };

  const handleZoomMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsZoomDragging(false);
  };

  const updateZoomFromMousePosition = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    const ratio = Math.max(0, Math.min(1, 1 - (y / height))); // 위쪽이 최대줌
    const newZoom = minZoom + (maxZoom - minZoom) * ratio;
    setZoomLevel(newZoom);
  };

  // 줌 리셋
  const resetZoom = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  // NIFTI 데이터를 캔버스에 렌더링
  useEffect(() => {
    if (!niftiData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { dimensions, pixelData } = niftiData;
    const [width, height, depth] = dimensions;
    
    // plane에 따라 슬라이스 데이터 추출
    let sliceData: Float32Array;
    let sliceWidth: number, sliceHeight: number;
    
    if (plane === 'axial') {
      // Axial view: Z축 슬라이스 (위→아래)
      // currentSlice가 증가하면 위에서 아래로 이동
      sliceWidth = width;
      sliceHeight = height;
      const sliceSize = width * height;
      const actualSlice = (depth - 1) - currentSlice; // 뒤집어서 위→아래 방향으로
      const sliceStart = actualSlice * sliceSize;
      sliceData = new Float32Array(pixelData.slice(sliceStart, sliceStart + sliceSize));
    } else if (plane === 'coronal') {
      // Coronal view: Y축 슬라이스 (앞→뒤)
      // currentSlice가 증가하면 앞에서 뒤로 이동
      sliceWidth = width;
      sliceHeight = depth;
      sliceData = new Float32Array(sliceWidth * sliceHeight);
      const actualSlice = currentSlice; // 앞→뒤 방향 그대로
      for (let z = 0; z < depth; z++) {
        for (let x = 0; x < width; x++) {
          const sourceIndex = z * width * height + actualSlice * width + x;
          const targetIndex = (depth - 1 - z) * width + x; // Z축 뒤집기 (위쪽이 위로)
          sliceData[targetIndex] = pixelData[sourceIndex];
        }
      }
    } else if (plane === 'sagittal') {
      // Sagittal view: X축 슬라이스 (좌→우)
      // currentSlice가 증가하면 왼쪽에서 오른쪽으로 이동
      sliceWidth = height;
      sliceHeight = depth;
      sliceData = new Float32Array(sliceWidth * sliceHeight);
      const actualSlice = currentSlice; // 좌→우 방향 그대로
      for (let z = 0; z < depth; z++) {
        for (let y = 0; y < height; y++) {
          const sourceIndex = z * width * height + y * width + actualSlice;
          const targetIndex = (depth - 1 - z) * height + y; // Z축 뒤집기 (위쪽이 위로)
          sliceData[targetIndex] = pixelData[sourceIndex];
        }
      }
    } else {
      // 기본값: Axial view
      sliceWidth = width;
      sliceHeight = height;
      const sliceSize = width * height;
      const actualSlice = (depth - 1) - currentSlice;
      const sliceStart = actualSlice * sliceSize;
      sliceData = new Float32Array(pixelData.slice(sliceStart, sliceStart + sliceSize));
    }
    
    // 데이터 정규화 (0-255 범위로)
    const min = Math.min(...sliceData);
    const max = Math.max(...sliceData);
    const range = max - min;
    
    // ImageData 생성
    const imageData = ctx.createImageData(sliceWidth, sliceHeight);
    const data = imageData.data;
    
    // Segmentation 데이터 준비 (있는 경우)
    let segSliceData: Float32Array | null = null;
    if (segmentationData && segmentationData.dimensions) {
      const segDimensions = segmentationData.dimensions;
      const [segWidth, segHeight, segDepth] = segDimensions;
      
      // 기본 이미지와 segmentation 이미지의 차원이 일치하는지 확인
      if (segWidth === width && segHeight === height && segDepth === depth) {
        // Segmentation 슬라이스 데이터 추출 (기본 이미지와 동일한 방식)
        if (plane === 'axial') {
          const segSliceSize = segWidth * segHeight;
          const segActualSlice = (segDepth - 1) - currentSlice;
          const segSliceStart = segActualSlice * segSliceSize;
          segSliceData = new Float32Array(segmentationData.pixelData.slice(segSliceStart, segSliceStart + segSliceSize));
        } else if (plane === 'coronal') {
          segSliceData = new Float32Array(segWidth * segDepth);
          const segActualSlice = currentSlice;
          for (let z = 0; z < segDepth; z++) {
            for (let x = 0; x < segWidth; x++) {
              const sourceIndex = z * segWidth * segHeight + segActualSlice * segWidth + x;
              const targetIndex = (segDepth - 1 - z) * segWidth + x;
              segSliceData[targetIndex] = segmentationData.pixelData[sourceIndex];
            }
          }
        } else if (plane === 'sagittal') {
          segSliceData = new Float32Array(segHeight * segDepth);
          const segActualSlice = currentSlice;
          for (let z = 0; z < segDepth; z++) {
            for (let y = 0; y < segHeight; y++) {
              const sourceIndex = z * segWidth * segHeight + y * segWidth + segActualSlice;
              const targetIndex = (segDepth - 1 - z) * segHeight + y;
              segSliceData[targetIndex] = segmentationData.pixelData[sourceIndex];
            }
          }
        }
      }
    }
    
    for (let i = 0; i < sliceData.length; i++) {
      const normalizedValue = range > 0 ? ((sliceData[i] - min) / range) * 255 : 0;
      const pixelIndex = i * 4;
      
      // 기본 그레이스케일 값
      let r = normalizedValue;
      let g = normalizedValue;
      let b = normalizedValue;
      
      // Segmentation 오버레이 적용 (빨간색으로 표시)
      if (segSliceData && i < segSliceData.length && segSliceData[i] > 0.5) {
        // 종양 영역: 빨간색 오버레이 (70% 투명도)
        const overlayOpacity = 0.7;
        r = normalizedValue * (1 - overlayOpacity) + 255 * overlayOpacity;
        g = normalizedValue * (1 - overlayOpacity);
        b = normalizedValue * (1 - overlayOpacity);
      }
      
      data[pixelIndex] = r;     // R
      data[pixelIndex + 1] = g; // G
      data[pixelIndex + 2] = b; // B
      data[pixelIndex + 3] = 255; // A
    }
    
    // 캔버스 크기에 맞게 스케일링
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 임시 캔버스에 원본 크기로 그리기
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sliceWidth;
    tempCanvas.height = sliceHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.putImageData(imageData, 0, 0);
      
      // 메인 캔버스에 zoom과 pan을 적용하여 그리기
      ctx.imageSmoothingEnabled = false; // 픽셀 아트 스타일 유지
      
      // 줌과 팬을 적용한 크기와 위치 계산
      const scaledWidth = canvas.width * zoomLevel;
      const scaledHeight = canvas.height * zoomLevel;
      const x = panOffset.x + (canvas.width - scaledWidth) / 2;
      const y = panOffset.y + (canvas.height - scaledHeight) / 2;
      
      ctx.drawImage(
        tempCanvas, 
        x, 
        y, 
        scaledWidth, 
        scaledHeight
      );
    }
    
    // 슬라이스 정보 표시 제거됨
    
  }, [niftiData, currentSlice, maxSlices, panOffset, zoomLevel, plane, segmentationData]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: sliderStyle }} />
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="text-white text-base font-medium mb-3 text-center">{title}</div>
      
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '1' }}>
        {fileUrl ? (
          <div className="w-full h-full relative">
            <canvas
              ref={canvasRef}
              width={300}
              height={300}
              className="w-full h-full object-contain"
              style={{ 
                imageRendering: 'pixelated',
                cursor: isDragging ? 'grabbing' : 'grab'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onDoubleClick={handleDoubleClick}
              onWheel={handleWheel}
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

            {/* 슬라이스 네비게이션 컨트롤 */}
            {niftiData && maxSlices > 1 && (
              <div className="absolute bottom-2 left-2 right-8 text-white text-xs bg-black bg-opacity-70 px-2 py-1 rounded">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setCurrentSlice(Math.max(0, currentSlice - 1))}
                    disabled={currentSlice === 0}
                    className="px-2 py-1 bg-blue-600 rounded disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    ←
                  </button>
                  <span>Slice {currentSlice + 1}/{maxSlices}</span>
                  <button
                    onClick={() => setCurrentSlice(Math.min(maxSlices - 1, currentSlice + 1))}
                    disabled={currentSlice === maxSlices - 1}
                    className="px-2 py-1 bg-blue-600 rounded disabled:bg-gray-600 disabled:cursor-not-allowed"
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
                    onChange={(e) => setCurrentSlice(parseInt(e.target.value))}
                    className="w-full h-3 bg-gray-600 rounded-lg cursor-pointer nifti-slider"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentSlice / (maxSlices - 1)) * 100}%, #4b5563 ${(currentSlice / (maxSlices - 1)) * 100}%, #4b5563 100%)`,
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      appearance: 'none',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* 기본 정보 */}
            {!niftiData && (
              <div className="absolute bottom-2 left-2 text-white text-xs bg-black bg-opacity-70 px-2 py-1 rounded">
                3D NIfTI View
              </div>
            )}
          </div>
        ) : (
          /* Placeholder */
          <div className="w-full h-full bg-gray-900 flex items-center justify-center relative">
            <div className="w-3/4 h-3/4 rounded-full border-2 border-gray-600 flex items-center justify-center relative">
              <div className="w-1/2 h-1/2 rounded-full border border-gray-600"></div>
              <div className="w-1/4 h-1/4 rounded-full border border-gray-600 absolute top-1/4 left-1/4"></div>
              <div className="absolute top-1/3 right-1/3 w-4 h-4 bg-red-500 rounded-full"></div>
            </div>
          </div>
        )}

        {/* 줌 컨트롤 */}
        {niftiData && (
          <div className="absolute right-1 top-4 bottom-4 w-4 flex flex-col items-center">
            {/* 줌 레벨 표시 */}
            <div className="text-white text-xs mb-1 bg-black bg-opacity-70 px-1 rounded">
              {Math.round(zoomLevel * 100)}%
            </div>
            
            {/* 줌 슬라이더 */}
            <div 
              className="flex-1 w-3 bg-gray-700 rounded-full cursor-pointer relative"
              onMouseDown={handleZoomMouseDown}
              onMouseMove={handleZoomMouseMove}
              onMouseUp={handleZoomMouseUp}
              onMouseLeave={handleZoomMouseUp}
            >
              <div 
                className="w-full bg-green-400 rounded-full transition-all duration-100 absolute bottom-0" 
                style={{ 
                  height: `${((zoomLevel - minZoom) / (maxZoom - minZoom)) * 100}%`
                }}
              ></div>
              <div 
                className="w-4 h-2 bg-green-500 rounded-full absolute -left-0.5 transform -translate-y-1/2 border border-white shadow-sm" 
                style={{ 
                  top: `${100 - ((zoomLevel - minZoom) / (maxZoom - minZoom)) * 100}%`
                }}
              ></div>
            </div>
            
            {/* 줌 리셋 버튼 */}
            <button
              onClick={resetZoom}
              className="text-white text-xs mt-1 bg-black bg-opacity-70 px-1 rounded hover:bg-opacity-90"
              title="줌 리셋 (1:1)"
            >
              1:1
            </button>
          </div>
        )}
      </div>
      </div>
    </>
  );
}

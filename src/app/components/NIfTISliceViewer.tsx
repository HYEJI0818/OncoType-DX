'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@/contexts/EnhancedTranslationContext';
import { fileStorage, type FileData } from '@/lib/indexedDB';
import Breast3DView from './Breast3DView';

type Sequence = 'MAIN';
type Plane = 'axial' | 'sagittal' | 'coronal';

interface NiftiHeader {
  dims: number[];
  pixDims: number[];
  affine?: number[][];
  [key: string]: unknown;
}

interface NIfTISliceViewerProps {
  className?: string;
  niftiData?: ArrayBuffer | null;
  // onSliceChange 제거 - 각 뷰어 독립적 관리
  onViewSelect?: (views: Set<'axial' | 'coronal' | 'sagittal' | '3d'>) => void;
  selectedViews?: Set<'axial' | 'coronal' | 'sagittal' | '3d'>;
  onNiftiDataParsed?: (header: NiftiHeader, image: ArrayBuffer) => void;
  on3DOnlyDataParsed?: (header: unknown, image: ArrayBuffer) => void; // 3D 전용 데이터 콜백 추가
  onOriginalNiftiUrl?: (url: string) => void; // 원본 NIfTI URL 콜백 추가
  patientId?: number; // 환자 ID 추가
  globalSelectedSegFile?: string | null; // 전역 segmentation 파일
  onFullscreenClick?: () => void; // 전체화면 버튼 클릭 핸들러 추가
  onTumorOverlayUrl?: (url: string | null) => void; // Tumor 오버레이 URL 콜백 추가
  onSequenceChange?: (sequence: string) => void; // 현재 시퀀스 변경 콜백 추가
}

interface SliceViewerState {
  sequence: Sequence;
  slice: number;
  axialSlice: number; // Axial 뷰어 전용 슬라이스
  coronalSlice: number; // Coronal 뷰어 전용 슬라이스
  sagittalSlice: number; // Sagittal 뷰어 전용 슬라이스
  isPlaying: boolean;
  windowLevel: number;
  windowWidth: number;
}

export default function NIfTISliceViewer({ 
  className = '', 
  niftiData,
  // onSliceChange 제거 - 각 뷰어 독립적 관리
  onViewSelect,
  selectedViews = new Set(),
  onNiftiDataParsed,
  on3DOnlyDataParsed,
  onOriginalNiftiUrl,
  patientId,
  globalSelectedSegFile,
  onFullscreenClick,
  onTumorOverlayUrl,
  onSequenceChange
}: NIfTISliceViewerProps) {
  const { t } = useTranslation();
  
  // 업로드된 파일 정보 상태
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, FileData> | null>(null);
  
  // 현재 로드된 시퀀스 타입 상태
  const [currentLoadedSequence, setCurrentLoadedSequence] = useState<string | null>(null);
  
  
  
  
  // Tumor 오버레이 관련 상태
  const [tumorOverlayUrl, setTumorOverlayUrl] = useState<string | null>(null);
  const [tumorOverlayData, setTumorOverlayData] = useState<{header: NiftiHeader, image: ArrayBuffer} | null>(null);
  
  // 원본 NIfTI URL 상태
  const [originalNiftiUrl, setOriginalNiftiUrl] = useState<string | null>(null);
  
  // UUID 기반 업로드된 파일 정보 로드
  useEffect(() => {
    const loadUploadedFiles = async () => {
      try {
        const hasFiles = localStorage.getItem('hasUploadedFiles');
        const sessionId = localStorage.getItem('currentSessionId');
        
        if (hasFiles && sessionId) {
          console.log('🔄 UUID 기반 파일 정보 로드 중:', sessionId);
          
          // 메타데이터 파일에서 파일 정보 로드
          const metadataResponse = await fetch(`/uploads/${sessionId}/metadata.json`);
          if (metadataResponse.ok) {
            const metadata = await metadataResponse.json();
            console.log('✅ 메타데이터 로드 성공:', metadata);
            
            // 파일 정보를 IndexedDB 형태로 변환
            const files: Record<string, any> = {};
            
            setUploadedFiles(files);
            console.log('업로드된 파일 정보 로드:', Object.keys(files));
            
            // 모든 업로드된 시퀀스 파일을 자동으로 로드하여 각각의 미리보기 표시
            let isFirstSequence = true;
            
            // 업로드된 파일이 있으면 모든 시퀀스 슬롯에 해당 파일을 표시
            const uploadedSequences = Object.keys(files);
            if (uploadedSequences.length > 0) {
              const firstUploadedFile = files[uploadedSequences[0]];
              console.log(`📁 업로드된 파일을 모든 시퀀스에 적용:`, firstUploadedFile.name);
              
              // 모든 시퀀스 슬롯에 업로드된 파일 적용
              const availableSequences = ['T1', 'T1CE', 'T2', 'FLAIR'];
              availableSequences.forEach((seq, index) => {
                console.log(`${seq} 슬롯에 업로드된 파일 로드 예약`);
                const isFirst = isFirstSequence;
                isFirstSequence = false; // 첫 번째 이후로는 false
                
                setTimeout(() => {
                  if (isFirst) {
                    // 첫 번째 시퀀스는 미리보기 + 3D 뷰어용 데이터 로드
                    console.log(`🎯 첫 번째 시퀀스 ${seq} - 미리보기 + 3D 뷰어 로드`);
                    loadSequenceFileFromUrl(seq, firstUploadedFile.url, false, true);
                  } else {
                    // 나머지는 미리보기만 로드
                    loadSequenceFileFromUrl(seq, firstUploadedFile.url);
                  }
                }, 100 + (index * 200)); // 각 파일을 순차적으로 로드 (200ms 간격)
              });
            }
          } else {
            console.warn('⚠️ 메타데이터 파일을 찾을 수 없습니다. IndexedDB에서 로드를 시도합니다.');
            
            // 기존 IndexedDB 방식으로 폴백
            const files = await fileStorage.getAllFiles();
            setUploadedFiles(files);
            console.log('업로드된 파일 정보 로드 (IndexedDB):', Object.keys(files));
          }
        }
      } catch (error) {
        console.error('업로드된 파일 정보 로드 실패:', error);
      }
    };

    loadUploadedFiles();
    
    // 페이지 포커스 시에도 다시 로드 (다른 탭에서 업로드한 경우)
    const handleFocus = () => loadUploadedFiles();
    window.addEventListener('focus', handleFocus);
    
    return () => window.removeEventListener('focus', handleFocus);
  }, []);
  
  // 상태 관리
  const [state, setState] = useState<SliceViewerState>({
    sequence: 'MAIN',
    slice: 100,
    axialSlice: 100, // Axial 뷰어 전용 슬라이스 초기값
    coronalSlice: 100, // Coronal 뷰어 전용 슬라이스 초기값
    sagittalSlice: 100, // Sagittal 뷰어 전용 슬라이스 초기값
    isPlaying: false,
    windowLevel: 0,
    windowWidth: 255
  });

  // Canvas refs - 각 시퀀스별로 독립적인 canvas
  const axialCanvasRef = useRef<HTMLCanvasElement>(null);
  const coronalCanvasRef = useRef<HTMLCanvasElement>(null);
  const sagittalCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // 각 시퀀스별 미리보기 canvas refs
  const t1PreviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const t1cePreviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const t2PreviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const flairPreviewCanvasRef = useRef<HTMLCanvasElement>(null);

  // NIfTI 데이터 상태 (현재 선택된 시퀀스)
  const [niftiHeader, setNiftiHeader] = useState<NiftiHeader | null>(null);
  const [niftiImage, setNiftiImage] = useState<ArrayBuffer | null>(null);
  const [maxSlices, setMaxSlices] = useState({ axial: 199, coronal: 199, sagittal: 199 });
  
  // 각 시퀀스별 독립적인 NIfTI 데이터 상태
  const [sequenceData, setSequenceData] = useState<{
    T1?: { header: NiftiHeader; image: ArrayBuffer };
    T1CE?: { header: NiftiHeader; image: ArrayBuffer };
    T2?: { header: NiftiHeader; image: ArrayBuffer };
    FLAIR?: { header: NiftiHeader; image: ArrayBuffer };
  }>({});
  
  // Segmentation 데이터 상태 (전역 파일에서 로드된 데이터)
  const [segmentationHeader, setSegmentationHeader] = useState<NiftiHeader | null>(null);
  const [segmentationImage, setSegmentationImage] = useState<ArrayBuffer | null>(null);

  // 전역 segmentation 파일이 변경될 때 데이터 로드
  useEffect(() => {
    if (globalSelectedSegFile) {
      loadSegmentationData(globalSelectedSegFile);
    } else {
      setSegmentationHeader(null);
      setSegmentationImage(null);
    }
  }, [globalSelectedSegFile]);

  // 각 시퀀스별 미리보기 렌더링 함수 (종양 오버레이 적용)
  const renderSequencePreview = useCallback((sequenceType: string, canvas: HTMLCanvasElement, data: { header: NiftiHeader; image: ArrayBuffer }, plane: 'axial' | 'coronal' | 'sagittal' = 'axial') => {
    if (!canvas || !data) return;

    const { header, image } = data;
    const { dims } = header;
    const [, width, height, depth] = dims;
    const niftiArray = new Float32Array(image);
    
    // 각 시퀀스별로 종양이 가장 많은 슬라이스를 개별적으로 찾아서 표시
    let sliceIndex = Math.min(100, Math.floor(depth / 2));
    
    // 종양 오버레이가 있으면 이 시퀀스에서 종양이 가장 많이 보이는 슬라이스 찾기
    if (tumorOverlayData) {
      const tumorDims = tumorOverlayData.header.dims;
      const [, tumorWidth, tumorHeight, tumorDepth] = tumorDims;
      
      // 차원이 일치하는 경우에만 종양 슬라이스 찾기
      if (tumorWidth === width && tumorHeight === height && tumorDepth === depth) {
        const tumorArray = new Float32Array(tumorOverlayData.image);
        let bestSlice = sliceIndex;
        let maxTumorPixels = 0;
        
        // 각 슬라이스에서 종양 픽셀 수 계산 (상하 반전만 적용, 좌우는 원래대로)
        for (let z = 0; z < depth; z++) {
          let tumorPixelCount = 0;
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              // 상하 반전만 적용하여 일관성 유지 (좌우는 원래대로)
              const flippedY = height - 1 - y;
              const tumorNiftiIndex = z * width * height + flippedY * width + x;
              if (tumorNiftiIndex < tumorArray.length && tumorArray[tumorNiftiIndex] > 0.5) {
                tumorPixelCount++;
              }
            }
          }
          if (tumorPixelCount > maxTumorPixels) {
            maxTumorPixels = tumorPixelCount;
            bestSlice = z;
          }
        }
        
        if (maxTumorPixels > 0) {
          sliceIndex = bestSlice;
          console.log(`🎯 ${sequenceType} 미리보기: 종양이 가장 많은 슬라이스 ${sliceIndex} 선택 (종양 픽셀: ${maxTumorPixels})`);
        }
      }
    }
    
    // Canvas 크기 설정
    const containerSize = Math.min(canvas.offsetWidth, canvas.offsetHeight) || 200;
    canvas.width = containerSize;
    canvas.height = containerSize;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 배경을 검은색으로 채움
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, containerSize, containerSize);
    
    // 이미지 데이터 생성
    const imageData = ctx.createImageData(width, height);
    const data8 = imageData.data;
    
    // 데이터 범위 확인 (정규화를 위해)
    let minVal = Infinity, maxVal = -Infinity;
    for (let i = 0; i < niftiArray.length; i++) {
      const val = niftiArray[i];
      if (val !== 0 && val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }
    if (minVal === Infinity) {
      minVal = 0;
      maxVal = 1;
    }
    
    // 방향에 따른 슬라이스 데이터 추출 및 렌더링
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let niftiIndex = 0;
        
        if (plane === 'axial') {
          // Axial: Z축 슬라이스 (상하 반전)
          const flippedY = height - 1 - y;
          niftiIndex = sliceIndex * width * height + flippedY * width + x;
        } else if (plane === 'coronal') {
          // Coronal: Y축 슬라이스 (앞뒤 방향)
          const flippedY = height - 1 - y;
          niftiIndex = flippedY * width * height + sliceIndex * width + x;
        } else if (plane === 'sagittal') {
          // Sagittal: X축 슬라이스 (좌우 방향)
          const flippedY = height - 1 - y;
          niftiIndex = flippedY * width * height + y * width + sliceIndex;
        }
        
        const pixelIndex = (y * width + x) * 4;
        
        if (niftiIndex < niftiArray.length) {
          const value = niftiArray[niftiIndex];
          
          // 정규화된 픽셀 값 계산
          let normalizedValue;
          if (maxVal > minVal && maxVal > 0) {
            normalizedValue = ((value - minVal) / (maxVal - minVal)) * 255;
          } else if (value > 0) {
            normalizedValue = 128;
          } else {
            normalizedValue = 0;
          }
          normalizedValue = Math.min(255, Math.max(0, normalizedValue));
          
          // 기본 그레이스케일 값
          let r = normalizedValue;
          let g = normalizedValue;
          let b = normalizedValue;
          
          // 🔥 종양 오버레이 적용 (업로드된 tumor 파일)
          if (tumorOverlayData) {
            const tumorDims = tumorOverlayData.header.dims;
            const [, tumorWidth, tumorHeight, tumorDepth] = tumorDims;
            
            // 디버깅: 첫 번째 픽셀에서만 로그 출력
            if (x === 0 && y === 0) {
              console.log(`🔍 ${sequenceType} 미리보기 종양 오버레이 처리:`, {
                기본이미지차원: [width, height, depth],
                종양이미지차원: [tumorWidth, tumorHeight, tumorDepth],
                슬라이스인덱스: sliceIndex,
                차원일치: (tumorWidth === width && tumorHeight === height && tumorDepth === depth)
              });
            }
            
            // 기본 이미지와 tumor 이미지의 차원이 일치하는지 확인
            if ((tumorWidth === width && tumorHeight === height && tumorDepth === depth) ||
                (tumorWidth === width && tumorHeight === height) ||
                (Math.abs(tumorWidth - width) <= 1 && Math.abs(tumorHeight - height) <= 1 && Math.abs(tumorDepth - depth) <= 1)) {
              
              // 종양 오버레이에도 동일한 상하 반전만 적용 (좌우는 원래대로)
              const flippedY = height - 1 - y;
              const tumorNiftiIndex = sliceIndex * tumorWidth * tumorHeight + flippedY * tumorWidth + x;
              
              if (tumorNiftiIndex >= 0 && tumorNiftiIndex < tumorOverlayData.image.byteLength / 4) {
                const tumorArray = new Float32Array(tumorOverlayData.image);
                const tumorValue = tumorArray[tumorNiftiIndex];
                
                if (tumorValue > 0.5) {
                  // 종양 영역: 녹색 오버레이 (70% 투명도) - 미리보기에서도 적용
                  const overlayOpacity = 0.7;
                  r = normalizedValue * (1 - overlayOpacity);
                  g = normalizedValue * (1 - overlayOpacity) + 255 * overlayOpacity;
                  b = normalizedValue * (1 - overlayOpacity);
                  
                  // 디버깅: 종양 픽셀 발견 시 로그 (첫 번째만)
                  if (x === 0 && y === 0) {
                    console.log(`✅ ${sequenceType} 미리보기에서 종양 픽셀 발견! 값: ${tumorValue}, 위치: (${x}, ${y})`);
                  }
                }
              }
            } else {
              // 차원이 일치하지 않는 경우 로그
              if (x === 0 && y === 0) {
                console.warn(`⚠️ ${sequenceType} 미리보기: 차원 불일치로 종양 오버레이 적용 불가`);
              }
            }
          }
          
          data8[pixelIndex] = r;     // R
          data8[pixelIndex + 1] = g; // G
          data8[pixelIndex + 2] = b; // B
          data8[pixelIndex + 3] = 255; // A
        }
      }
    }
    
    // 임시 캔버스에 이미지 데이터 그리기
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCanvas.width = width;
      tempCanvas.height = height;
      tempCtx.putImageData(imageData, 0, 0);
      
      // 이미지를 컨테이너에 맞게 스케일링하여 그리기
      const scale = Math.min(containerSize / width, containerSize / height) * 0.9;
      const scaledWidth = width * scale;
      const scaledHeight = height * scale;
      
      const x = (containerSize - scaledWidth) / 2;
      const y = (containerSize - scaledHeight) / 2;
      
      ctx.drawImage(tempCanvas, x, y, scaledWidth, scaledHeight);
    }
    
    console.log(`${sequenceType} 미리보기 렌더링 완료 (슬라이스 ${sliceIndex}) - 종양 오버레이: ${!!tumorOverlayData}`);
  }, [tumorOverlayData]); // tumorOverlayData 의존성 추가

  // 각 시퀀스 데이터가 로드될 때마다 해당 미리보기 렌더링
  useEffect(() => {
    // 3D 패널 (T1) - axial 방향으로 렌더링
    if (sequenceData.T1 && t1PreviewCanvasRef.current) {
      setTimeout(() => {
        renderSequencePreview('T1', t1PreviewCanvasRef.current!, sequenceData.T1!, 'axial');
      }, 100);
    }
    
    // Axial View 패널 (T1CE) - axial 방향으로 렌더링
    if (sequenceData.T1CE && t1cePreviewCanvasRef.current) {
      setTimeout(() => {
        renderSequencePreview('T1CE', t1cePreviewCanvasRef.current!, sequenceData.T1CE!, 'axial');
      }, 100);
    }
    
    // Coronal View 패널 (T2) - coronal 방향으로 렌더링
    if (sequenceData.T2 && t2PreviewCanvasRef.current) {
      setTimeout(() => {
        renderSequencePreview('T2', t2PreviewCanvasRef.current!, sequenceData.T2!, 'coronal');
      }, 100);
    }
    
    // Sagittal View 패널 (FLAIR) - sagittal 방향으로 렌더링
    if (sequenceData.FLAIR && flairPreviewCanvasRef.current) {
      setTimeout(() => {
        renderSequencePreview('FLAIR', flairPreviewCanvasRef.current!, sequenceData.FLAIR!, 'sagittal');
      }, 100);
    }
  }, [sequenceData, renderSequencePreview]);

  // 🔥 종양 오버레이 데이터가 변경될 때 모든 미리보기 다시 렌더링 (추가/제거 모두 처리)
  useEffect(() => {
    console.log('🔥 종양 오버레이 데이터 변경됨 - 모든 미리보기 다시 렌더링', !!tumorOverlayData);
    
    // 모든 패널 미리보기를 다시 렌더링 (종양 오버레이 있든 없든)
    setTimeout(() => {
      if (sequenceData.T1 && t1PreviewCanvasRef.current) {
        renderSequencePreview('T1', t1PreviewCanvasRef.current, sequenceData.T1, 'axial');
      }
      if (sequenceData.T1CE && t1cePreviewCanvasRef.current) {
        renderSequencePreview('T1CE', t1cePreviewCanvasRef.current, sequenceData.T1CE, 'axial');
      }
      if (sequenceData.T2 && t2PreviewCanvasRef.current) {
        renderSequencePreview('T2', t2PreviewCanvasRef.current, sequenceData.T2, 'coronal');
      }
      if (sequenceData.FLAIR && flairPreviewCanvasRef.current) {
        renderSequencePreview('FLAIR', flairPreviewCanvasRef.current, sequenceData.FLAIR, 'sagittal');
      }
    }, 100);
  }, [tumorOverlayData, sequenceData, renderSequencePreview]);

  // 각 방향별로 종양이 가장 잘 보이는 슬라이스를 찾는 함수들
  const findTumorSliceByPlane = useCallback((segHeader: NiftiHeader, segImage: ArrayBuffer, plane: Plane): number => {
    if (!segHeader || !segImage) {
      switch (plane) {
        case 'axial': return Math.floor(maxSlices.axial / 2);
        case 'coronal': return Math.floor(maxSlices.coronal / 2);
        case 'sagittal': return Math.floor(maxSlices.sagittal / 2);
        default: return 100;
      }
    }
    
    const { dims } = segHeader;
    const [, width, height, depth] = dims;
    const segArray = new Float32Array(segImage);
    
    const tumorSlices: { slice: number, tumorCount: number }[] = [];
    
    switch (plane) {
      case 'axial':
        for (let sliceIndex = 0; sliceIndex < depth; sliceIndex++) {
          let tumorCount = 0;
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const segNiftiIndex = sliceIndex * width * height + y * width + x;
              if (segNiftiIndex < segArray.length && segArray[segNiftiIndex] > 0.5) {
                tumorCount++;
              }
            }
          }
          if (tumorCount > 0) {
            tumorSlices.push({ slice: sliceIndex, tumorCount });
          }
        }
        break;
        
      case 'coronal':
        for (let sliceIndex = 0; sliceIndex < height; sliceIndex++) {
          let tumorCount = 0;
          for (let z = 0; z < depth; z++) {
            for (let x = 0; x < width; x++) {
              const segNiftiIndex = z * width * height + sliceIndex * width + x;
              if (segNiftiIndex < segArray.length && segArray[segNiftiIndex] > 0.5) {
                tumorCount++;
              }
            }
          }
          if (tumorCount > 0) {
            tumorSlices.push({ slice: sliceIndex, tumorCount });
          }
        }
        break;
        
      case 'sagittal':
        for (let sliceIndex = 0; sliceIndex < width; sliceIndex++) {
          let tumorCount = 0;
          for (let y = 0; y < height; y++) {
            for (let z = 0; z < depth; z++) {
              const segNiftiIndex = z * width * height + y * width + sliceIndex;
              if (segNiftiIndex < segArray.length && segArray[segNiftiIndex] > 0.5) {
                tumorCount++;
              }
            }
          }
          if (tumorCount > 0) {
            tumorSlices.push({ slice: sliceIndex, tumorCount });
          }
        }
        break;
        
      default:
        return 100;
    }
    
    // 종양이 가장 많이 보이는 슬라이스 선택
    if (tumorSlices.length > 0) {
      tumorSlices.sort((a, b) => b.tumorCount - a.tumorCount);
      const bestSlice = tumorSlices[0].slice;
      console.log(`종양이 가장 많이 보이는 ${plane} 슬라이스: ${bestSlice} (종양 픽셀: ${tumorSlices[0].tumorCount})`);
      return bestSlice;
    }
    
    // 종양이 없으면 중간 슬라이스 반환
    switch (plane) {
      case 'axial': return Math.floor(maxSlices.axial / 2);
      case 'coronal': return Math.floor(maxSlices.coronal / 2);
      case 'sagittal': return Math.floor(maxSlices.sagittal / 2);
      default: return 100;
    }
  }, [maxSlices.axial, maxSlices.coronal, maxSlices.sagittal]);

  // URL에서 특정 시퀀스 타입의 파일을 로드하는 함수
  const loadSequenceFileFromUrl = async (sequenceType: string, fileUrl: string, isUserClick: boolean = false, is3DOnly: boolean = false) => {
    try {
      console.log(`${sequenceType} 파일 URL에서 로드 시도:`, fileUrl);
      
      // URL에서 파일 데이터 가져오기
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`파일 로드 실패: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log(`${sequenceType} 파일 로드 중:`, fileUrl);
      
      // NIfTI 파일 파싱
      const nifti = await import('nifti-reader-js');
      
      let processBuffer = arrayBuffer;
      
      // 압축된 파일인 경우 압축 해제
      if (nifti.isCompressed(arrayBuffer)) {
        console.log(`${sequenceType}: 압축된 파일 감지, 압축 해제 중...`);
        processBuffer = nifti.decompress(arrayBuffer) as ArrayBuffer;
      }
      
      // NIfTI 파일인지 확인
      if (!nifti.isNIFTI(processBuffer)) {
        throw new Error(`유효한 ${sequenceType} NIfTI 파일이 아닙니다.`);
      }
      
      const header = nifti.readHeader(processBuffer);
      const image = nifti.readImage(header, processBuffer);
      
      // NIfTI 데이터를 상태에 저장 (현재 선택된 시퀀스)
      setNiftiHeader(header as unknown as NiftiHeader);
      setNiftiImage(image);
      
      // 각 시퀀스별 독립적인 데이터 저장
      const sequenceNiftiData = { header: header as unknown as NiftiHeader, image };
      setSequenceData(prev => ({
        ...prev,
        [sequenceType]: sequenceNiftiData
      }));
      
      // 각 방향별 최대 슬라이스 수 계산
      const dims = header.dims;
      const newMaxSlices = {
        axial: dims[3] || 100,
        coronal: dims[2] || 100,
        sagittal: dims[1] || 100
      };
      setMaxSlices(newMaxSlices);
      
      // 현재 선택된 시퀀스 업데이트
      setCurrentLoadedSequence(sequenceType);
      onSequenceChange?.(sequenceType);
      
      
      // 콜백 호출
      if (is3DOnly && on3DOnlyDataParsed) {
        on3DOnlyDataParsed(header, image);
        onOriginalNiftiUrl?.(fileUrl);
        setOriginalNiftiUrl(fileUrl); // 로컬 상태 업데이트
      } else if (onNiftiDataParsed) {
        onNiftiDataParsed(header as unknown as NiftiHeader, image);
        onOriginalNiftiUrl?.(fileUrl);
        setOriginalNiftiUrl(fileUrl); // 로컬 상태 업데이트
      }
      
      console.log(`✅ ${sequenceType} 파일 로드 완료`);
      
    } catch (error) {
      console.error(`❌ ${sequenceType} 파일 로드 실패:`, error);
      alert(`${sequenceType} 파일 로드에 실패했습니다: ${error}`);
    }
  };

  // 특정 시퀀스 타입의 파일을 로드하는 함수 (IndexedDB)
  const loadSequenceFile = async (sequenceType: string, isUserClick: boolean = false, is3DOnly: boolean = false) => {
    try {
      console.log(`${sequenceType} 파일 로드 시도...`);
      
      // 먼저 업로드된 파일이 있는지 확인
      if (uploadedFiles && Object.keys(uploadedFiles).length > 0) {
        // 업로드된 파일이 있으면 첫 번째 파일을 사용
        const firstFile = Object.values(uploadedFiles)[0];
        console.log(`${sequenceType} 슬롯에 업로드된 파일 사용:`, firstFile.name);
        // TODO: URL 기반 로딩 대신 ArrayBuffer 사용하도록 수정 필요
        // await loadSequenceFileFromUrl(sequenceType, firstFile.url, isUserClick, is3DOnly);
        // return;
      }
      
      // IndexedDB에서 파일 데이터 가져오기 (폴백)
      const fileData = await fileStorage.getFile(sequenceType);
      if (!fileData) {
        console.log(`${sequenceType} 파일이 없습니다.`);
        alert(`${sequenceType} 파일이 업로드되지 않았습니다.`);
        return;
      }

      console.log(`${sequenceType} 파일 로드 중:`, fileData.name);
      
      // ArrayBuffer 데이터 사용
      const arrayBuffer = fileData.arrayBuffer;
      
      // NIfTI 파일 파싱
      const nifti = await import('nifti-reader-js');
      
      let processBuffer = arrayBuffer;
      
      // 압축된 파일인 경우 압축 해제
      if (nifti.isCompressed(arrayBuffer)) {
        console.log(`${sequenceType}: 압축된 파일 감지, 압축 해제 중...`);
        processBuffer = nifti.decompress(arrayBuffer) as ArrayBuffer;
      }
      
      // NIfTI 파일인지 확인
      if (!nifti.isNIFTI(processBuffer)) {
        throw new Error(`유효한 ${sequenceType} NIfTI 파일이 아닙니다.`);
      }
      
      const header = nifti.readHeader(processBuffer);
      const image = nifti.readImage(header, processBuffer);
      
      // NIfTI 데이터를 상태에 저장 (현재 선택된 시퀀스)
      setNiftiHeader(header as unknown as NiftiHeader);
      setNiftiImage(image);
      
      // 각 시퀀스별 독립적인 데이터 저장
      const sequenceNiftiData = { header: header as unknown as NiftiHeader, image };
      setSequenceData(prev => ({
        ...prev,
        [sequenceType]: sequenceNiftiData
      }));
      
      // 각 방향별 최대 슬라이스 수 계산
      const newMaxSlices = {
        axial: header.dims[3] - 1,      // Z 축
        sagittal: header.dims[1] - 1,   // X 축  
        coronal: header.dims[2] - 1     // Y 축
      };
      setMaxSlices(newMaxSlices);
      
      // 슬라이스를 중간값으로 설정
      const middleAxialSlice = Math.floor(newMaxSlices.axial / 2);
      const middleCoronalSlice = Math.floor(newMaxSlices.coronal / 2);
      const middleSagittalSlice = Math.floor(newMaxSlices.sagittal / 2);
      setState(prev => ({ 
        ...prev, 
        slice: middleAxialSlice,
        axialSlice: middleAxialSlice,
        coronalSlice: middleCoronalSlice,
        sagittalSlice: middleSagittalSlice 
      }));
      
      console.log(`${sequenceType} 파일 로드 성공:`, {
        dimensions: header.dims,
        maxSlices: newMaxSlices
      });
      
      // 사용자가 클릭했거나 3D만 활성화할 때 메인 뷰어 업데이트
      if (isUserClick || is3DOnly) {
        console.log(`🎯 ${isUserClick ? '사용자 클릭' : '3D 자동 로드'} - ${sequenceType} 메인 뷰어 업데이트`);
        
        // 현재 로드된 시퀀스 타입 업데이트
        setCurrentLoadedSequence(sequenceType);
        
        // 부모 컴포넌트에 현재 시퀀스 알림 (연동 확인용)
        onSequenceChange?.(sequenceType);
        
        // 🎯 뷰어 활성화 및 데이터 전달 (3D만 또는 모든 뷰어)
        if (is3DOnly) {
          console.log(`${sequenceType} 로드 완료 - 3D 뷰어만 활성화`);
          // 3D 뷰어 전용 데이터 콜백 호출 (2D 뷰어는 활성화하지 않음)
          on3DOnlyDataParsed?.(header, image);
          // selectedViews는 이미 ['3d']로 설정되어 있으므로 변경하지 않음
        } else {
          console.log(`${sequenceType} 로드 완료 - 모든 뷰어 활성화`);
          // 부모 컴포넌트에 파싱된 데이터 전달 (메인 뷰어 업데이트)
          onNiftiDataParsed?.(header as unknown as NiftiHeader, image);
          // 모든 뷰어 활성화
          if (onViewSelect) {
            onViewSelect(new Set(['3d', 'axial', 'coronal', 'sagittal']));
          }
        }
        
        // 🎯 원본 파일 URL 생성 및 전달 (NiiVueSliceViewer에서 사용하기 위해)
        try {
          const blob = new Blob([processBuffer], { type: 'application/octet-stream' });
          const blobUrl = URL.createObjectURL(blob);
          
          console.log(`${sequenceType} Blob URL 생성:`, blobUrl);
          
          // 부모 컴포넌트에 원본 NIfTI URL 전달
          if (onOriginalNiftiUrl) {
            onOriginalNiftiUrl(blobUrl);
          }
          setOriginalNiftiUrl(blobUrl); // 로컬 상태 업데이트
        } catch (urlError) {
          console.error('Blob URL 생성 실패:', urlError);
        }
      }
      
      // 🔥 종양 오버레이가 있으면 새로운 시퀀스에도 적용
      if (tumorOverlayData) {
        console.log(`${sequenceType} 로드 완료 후 종양 오버레이 재적용`);
        // 약간의 지연을 두어 시퀀스 로드가 완전히 완료된 후 오버레이 적용
        setTimeout(() => {
          // 현재 로드된 시퀀스에 따라 해당하는 캔버스들을 모두 업데이트
          console.log(`${sequenceType} 시퀀스의 모든 뷰에 종양 오버레이 적용`);
          updateAllSlices();
          
          // 추가로 현재 시퀀스 데이터를 모든 뷰어에 강제 적용 (모두 axial 방향으로 통일)
          if (axialCanvasRef.current) {
            renderSlice(axialCanvasRef.current, 'axial', state.axialSlice);
          }
        }, 200); // 지연 시간을 늘려서 안정성 확보
      }
      
    } catch (error) {
      console.error(`${sequenceType} 파일 로드 실패:`, error);
      alert(`${sequenceType} 파일 로드에 실패했습니다: ${error}`);
    }
  };

  // Segmentation 데이터 로드 함수
  const loadSegmentationData = async (segUrl: string) => {
    try {
      console.log('NIfTISliceViewer: Segmentation 데이터 로딩 시작:', segUrl);
      
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
        console.log('NIfTISliceViewer: Segmentation 압축된 파일 감지, 압축 해제 중...');
        processBuffer = nifti.decompress(buffer) as ArrayBuffer;
      }
      
      // NIfTI 파일인지 확인
      if (!nifti.isNIFTI(processBuffer)) {
        throw new Error('유효한 Segmentation NIfTI 파일이 아닙니다.');
      }
      
      const header = nifti.readHeader(processBuffer);
      const image = nifti.readImage(header, processBuffer);
      
      setSegmentationHeader(header as unknown as NiftiHeader);
      setSegmentationImage(image);
      
      // 각 방향별로 종양이 있는 슬라이스로 이동
      const axialTumorSlice = findTumorSliceByPlane(header as unknown as NiftiHeader, image, 'axial');
      const coronalTumorSlice = findTumorSliceByPlane(header as unknown as NiftiHeader, image, 'coronal');
      const sagittalTumorSlice = findTumorSliceByPlane(header as unknown as NiftiHeader, image, 'sagittal');
      
      setState(prev => ({ 
        ...prev, 
        axialSlice: axialTumorSlice,
        coronalSlice: coronalTumorSlice,
        sagittalSlice: sagittalTumorSlice 
      }));
      
      console.log('NIfTISliceViewer: Segmentation 데이터 로딩 성공, 각 방향별 종양 슬라이스로 이동:', {
        axial: axialTumorSlice,
        coronal: coronalTumorSlice,
        sagittal: sagittalTumorSlice
      });
      
    } catch (error) {
      console.error('NIfTISliceViewer: Segmentation 데이터 로딩 실패:', error);
      setSegmentationHeader(null);
      setSegmentationImage(null);
    }
  };

  // NIfTI 파일 로드 및 파싱
  useEffect(() => {
    if (!niftiData) return;

    const loadNIfTI = async () => {
      try {
        // Dynamic import for nifti-reader-js
        const nifti = await import('nifti-reader-js');
        
        let data = niftiData;
        
        // 압축된 파일인지 확인하고 압축 해제
        if (nifti.isCompressed(data)) {
          const decompressed = nifti.decompress(data);
          data = decompressed instanceof ArrayBuffer ? decompressed : new ArrayBuffer(decompressed.byteLength);
          if (!(decompressed instanceof ArrayBuffer)) {
            new Uint8Array(data).set(new Uint8Array(decompressed));
          }
        }
        
        if (nifti.isNIFTI(data)) {
          const header = nifti.readHeader(data);
          const image = nifti.readImage(header, data);
          
          setNiftiHeader(header as unknown as NiftiHeader);
          setNiftiImage(image);
          
          // 부모 컴포넌트에 파싱된 데이터 전달
          onNiftiDataParsed?.(header as unknown as NiftiHeader, image);
          
          // 각 방향별 최대 슬라이스 수 계산
          const newMaxSlices = {
            axial: header.dims[3] - 1,      // Z 축
            sagittal: header.dims[1] - 1,   // X 축  
            coronal: header.dims[2] - 1     // Y 축
          };
          setMaxSlices(newMaxSlices);
          
          // 슬라이스를 중간값으로 설정
          const middleSlice = Math.floor(newMaxSlices.axial / 2);
          const middleAxialSlice = Math.floor(newMaxSlices.axial / 2);
          const middleCoronalSlice = Math.floor(newMaxSlices.coronal / 2);
          const middleSagittalSlice = Math.floor(newMaxSlices.sagittal / 2);
          setState(prev => ({ 
            ...prev, 
            slice: middleSlice,
            axialSlice: middleAxialSlice,
            coronalSlice: middleCoronalSlice,
            sagittalSlice: middleSagittalSlice 
          }));
          
          console.log('NIfTI 파일 로드 완료:', {
            dimensions: header.dims,
            datatype: header.datatypeCode,
            voxOffset: header.vox_offset,
            imageSize: image.byteLength,
            maxSlices: {
              axial: header.dims[3] - 1,
              sagittal: header.dims[1] - 1,
              coronal: header.dims[2] - 1
            }
          });
          
          // 데이터 샘플 확인
          const sampleData = new Uint16Array(image.slice(0, 100));
          console.log('샘플 데이터:', Array.from(sampleData).slice(0, 10));
        }
      } catch (error) {
        console.error('NIfTI 파일 로드 오류:', error);
      }
    };

    loadNIfTI();
  }, [niftiData]);

  // 슬라이스 추출 함수
  const extractSlice = useCallback((plane: Plane, sliceIndex: number): ImageData | null => {
    if (!niftiHeader || !niftiImage) {
      console.log('NIfTI 데이터 없음:', { header: !!niftiHeader, image: !!niftiImage });
      return null;
    }

    const { dims, datatypeCode } = niftiHeader;
    const [, width, height, depth] = dims;
    
    console.log(`슬라이스 추출 시도: ${plane}, slice ${sliceIndex}, dims: ${width}x${height}x${depth}`);
    
    // 슬라이스 인덱스 범위 체크
    let maxSlice: number;
    let actualWidth: number, actualHeight: number;
    
    switch (plane) {
      case 'axial':
        maxSlice = depth - 1;
        actualWidth = width;
        actualHeight = height;
        break;
      case 'sagittal':
        maxSlice = width - 1;
        actualWidth = depth;
        actualHeight = height;
        break;
      case 'coronal':
        maxSlice = height - 1;
        actualWidth = width;
        actualHeight = depth;
        break;
      default:
        return null;
    }
    
    if (sliceIndex < 0 || sliceIndex > maxSlice) {
      console.log(`슬라이스 인덱스 범위 초과: ${sliceIndex}, max: ${maxSlice}`);
      return null;
    }

    // ImageData 생성
    const imageData = new ImageData(actualWidth, actualHeight);
    const data = imageData.data;
    
    // 데이터 타입에 따라 적절한 배열 생성
    let niftiArray: Float32Array | Uint8Array | Uint16Array | Int16Array | Int32Array | Float64Array;
    switch (datatypeCode) {
      case 2: // unsigned char
        niftiArray = new Uint8Array(niftiImage);
        break;
      case 4: // signed short
        niftiArray = new Int16Array(niftiImage);
        break;
      case 8: // signed int
        niftiArray = new Int32Array(niftiImage);
        break;
      case 16: // float
        niftiArray = new Float32Array(niftiImage);
        break;
      case 64: // double
        niftiArray = new Float64Array(niftiImage);
        break;
      default:
        niftiArray = new Uint16Array(niftiImage);
    }
    
    console.log(`데이터 타입: ${datatypeCode}, 배열 길이: ${niftiArray.length}`);
    
    // 슬라이스별 데이터 범위 확인 (노이즈 제거를 위해)
    let minVal = Infinity, maxVal = -Infinity;
    
    // 현재 슬라이스의 데이터만 샘플링하여 범위 계산
    const sliceDataSample = [];
    for (let y = 0; y < actualHeight; y++) {
      for (let x = 0; x < actualWidth; x++) {
        let niftiIndex: number;
        
        switch (plane) {
          case 'axial':
            niftiIndex = sliceIndex * width * height + y * width + x;
            break;
          case 'sagittal':
            niftiIndex = (height - 1 - y) * width * height + x * width + sliceIndex;
            break;
          case 'coronal':
            niftiIndex = (depth - 1 - y) * width * height + sliceIndex * width + x;
            break;
          default:
            continue;
        }
        
        if (niftiIndex < niftiArray.length) {
          const val = niftiArray[niftiIndex];
          if (val !== 0) { // 0이 아닌 값만 고려
            sliceDataSample.push(val);
          }
        }
      }
    }
    
    // 통계적 방법으로 노이즈 제거
    if (sliceDataSample.length > 0) {
      sliceDataSample.sort((a, b) => a - b);
      const len = sliceDataSample.length;
      
      // 하위 5%와 상위 5%를 제거하여 노이즈 제거
      const lowerIndex = Math.floor(len * 0.05);
      const upperIndex = Math.floor(len * 0.95);
      
      minVal = sliceDataSample[lowerIndex] || 0;
      maxVal = sliceDataSample[upperIndex] || 255;
    } else {
      minVal = 0;
      maxVal = 255;
    }
    
    console.log(`데이터 범위: ${minVal} ~ ${maxVal}`);
    
    for (let y = 0; y < actualHeight; y++) {
      for (let x = 0; x < actualWidth; x++) {
        let niftiIndex: number;
        
        switch (plane) {
          case 'axial':
            niftiIndex = sliceIndex * width * height + y * width + x;
            break;
          case 'sagittal':
            // 메인 뷰와 동일한 방향으로 수정 (NiiVue 표준 방향)
            niftiIndex = (height - 1 - y) * width * height + x * width + sliceIndex;
            break;
          case 'coronal':
            // 메인 뷰와 동일한 방향으로 수정 (Y축 반전)
            niftiIndex = (depth - 1 - y) * width * height + sliceIndex * width + x;
            break;
          default:
            continue;
        }
        
        if (niftiIndex < niftiArray.length) {
          const value = niftiArray[niftiIndex];
          
          // 개선된 픽셀 값 처리 (노이즈 제거 및 대비 향상)
          let pixelValue;
          if (maxVal > minVal && maxVal > 0) {
            // 정규화 후 감마 보정 적용 (대비 향상)
            const normalized = (value - minVal) / (maxVal - minVal);
            const gamma = plane === 'sagittal' ? 0.8 : 1.0; // sagittal에서 감마 보정 적용
            pixelValue = Math.pow(normalized, gamma) * 255;
          } else if (value > 0) {
            pixelValue = 128;
          } else {
            pixelValue = 0;
          }
          
          // 추가 노이즈 필터링
          if (plane === 'sagittal' && pixelValue > 0 && pixelValue < 30) {
            pixelValue = 0; // 낮은 값의 노이즈 제거
          }
          
          pixelValue = Math.min(255, Math.max(0, pixelValue));
          
          const pixelIndex = (y * actualWidth + x) * 4;
          
          // 기본 그레이스케일 값
          let r = pixelValue;
          let g = pixelValue;
          let b = pixelValue;
          
          // Segmentation 오버레이 적용 (빨간색으로 표시)
          let hasOverlay = false;
          
          // 기존 segmentation 오버레이 처리
          if (segmentationHeader && segmentationImage) {
            const segDims = segmentationHeader.dims;
            const [, segWidth, segHeight, segDepth] = segDims;
            
            // 기본 이미지와 segmentation 이미지의 차원이 일치하는지 확인
            if (segWidth === width && segHeight === height && segDepth === depth) {
              let segNiftiIndex: number;
              
              // Segmentation 데이터 추출 (기본 이미지와 동일한 방식)
              switch (plane) {
                case 'axial':
                  segNiftiIndex = sliceIndex * segWidth * segHeight + y * segWidth + x;
                  break;
                case 'sagittal':
                  segNiftiIndex = (segHeight - 1 - y) * segWidth * segHeight + x * segWidth + sliceIndex;
                  break;
                case 'coronal':
                  segNiftiIndex = (segDepth - 1 - y) * segWidth * segHeight + sliceIndex * segWidth + x;
                  break;
                default:
                  segNiftiIndex = -1;
              }
              
              if (segNiftiIndex >= 0 && segNiftiIndex < segmentationImage.byteLength / 4) {
                const segArray = new Float32Array(segmentationImage);
                const segValue = segArray[segNiftiIndex];
                
                if (segValue > 0.5) {
                  // 종양 영역: 빨간색 오버레이 (70% 투명도)
                  const overlayOpacity = 0.7;
                  r = pixelValue * (1 - overlayOpacity) + 255 * overlayOpacity;
                  g = pixelValue * (1 - overlayOpacity);
                  b = pixelValue * (1 - overlayOpacity);
                  hasOverlay = true;
                }
              }
            }
          }
          
          // Tumor 오버레이 처리 (업로드된 tumor 파일)
          if (!hasOverlay && tumorOverlayData) {
            const tumorDims = tumorOverlayData.header.dims;
            const [, tumorWidth, tumorHeight, tumorDepth] = tumorDims;
            
            console.log(`Tumor 오버레이 처리 시도 - ${plane} 뷰:`, {
              기본이미지차원: [width, height, depth],
              종양이미지차원: [tumorWidth, tumorHeight, tumorDepth],
              차원일치: tumorWidth === width && tumorHeight === height && tumorDepth === depth
            });
            
            // 기본 이미지와 tumor 이미지의 차원이 일치하는지 확인 (더 유연한 조건)
            if ((tumorWidth === width && tumorHeight === height && tumorDepth === depth) ||
                (tumorWidth === width && tumorHeight === height) || // 2D 호환성
                (Math.abs(tumorWidth - width) <= 1 && Math.abs(tumorHeight - height) <= 1 && Math.abs(tumorDepth - depth) <= 1)) { // 1픽셀 차이 허용
              let tumorNiftiIndex: number;
              
              // Tumor 데이터 추출 (기본 이미지와 동일한 방식)
              switch (plane) {
                case 'axial':
                  tumorNiftiIndex = sliceIndex * tumorWidth * tumorHeight + y * tumorWidth + x;
                  break;
                case 'sagittal':
                  tumorNiftiIndex = (tumorHeight - 1 - y) * tumorWidth * tumorHeight + x * tumorWidth + sliceIndex;
                  break;
                case 'coronal':
                  tumorNiftiIndex = (tumorDepth - 1 - y) * tumorWidth * tumorHeight + sliceIndex * tumorWidth + x;
                  break;
                default:
                  tumorNiftiIndex = -1;
              }
              
              if (tumorNiftiIndex >= 0 && tumorNiftiIndex < tumorOverlayData.image.byteLength / 4) {
                const tumorArray = new Float32Array(tumorOverlayData.image);
                const tumorValue = tumorArray[tumorNiftiIndex];
                
                if (tumorValue > 0.5) {
                  // 종양 영역: 녹색 오버레이 (70% 투명도) - 업로드된 tumor와 구분
                  const overlayOpacity = 0.7;
                  r = pixelValue * (1 - overlayOpacity);
                  g = pixelValue * (1 - overlayOpacity) + 255 * overlayOpacity;
                  b = pixelValue * (1 - overlayOpacity);
                  
                  // 디버깅: 종양 픽셀 발견 시 로그 (첫 번째만)
                  if (x === 0 && y === 0) {
                    console.log(`✅ ${plane} 뷰에서 종양 픽셀 발견! 값: ${tumorValue}, 위치: (${x}, ${y})`);
                  }
                }
              }
            }
          }
          
          data[pixelIndex] = r;        // R
          data[pixelIndex + 1] = g;    // G  
          data[pixelIndex + 2] = b;    // B
          data[pixelIndex + 3] = 255;  // A
        }
      }
    }
    
    console.log(`슬라이스 추출 완료: ${plane}, ${actualWidth}x${actualHeight}`);
    return imageData;
  }, [niftiHeader, niftiImage, state.windowLevel, state.windowWidth, segmentationHeader, segmentationImage, tumorOverlayData]);

  // Canvas에 슬라이스 렌더링
  const renderSlice = useCallback((canvas: HTMLCanvasElement, plane: Plane, sliceIndex: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    console.log(`렌더링 시도: ${plane}, slice ${sliceIndex}, segmentation 있음: ${!!segmentationHeader && !!segmentationImage}`);
    const imageData = extractSlice(plane, sliceIndex);
    
    if (imageData) {
      console.log(`이미지 데이터 획득: ${imageData.width}x${imageData.height}`);
      
      // Canvas를 컨테이너 크기에 맞춤 (정사각형)
      const containerSize = Math.min(canvas.parentElement?.clientWidth || 256, canvas.parentElement?.clientHeight || 256);
      canvas.width = containerSize;
      canvas.height = containerSize;
      
      // 배경을 검은색으로 채움
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, containerSize, containerSize);
      
      // 임시 캔버스에 원본 이미지 데이터 그리기
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        tempCtx.putImageData(imageData, 0, 0);
        
        // 이미지를 컨테이너에 맞게 스케일링하여 그리기 (aspect ratio 유지, 중앙 정렬)
        const scale = Math.min(containerSize / imageData.width, containerSize / imageData.height) * 0.9; // 약간 여백 추가
        const scaledWidth = imageData.width * scale;
        const scaledHeight = imageData.height * scale;
        
        // 완전 중앙 정렬
        const x = (containerSize - scaledWidth) / 2;
        const y = (containerSize - scaledHeight) / 2;
        
        ctx.drawImage(tempCanvas, x, y, scaledWidth, scaledHeight);
        console.log(`렌더링 완료: ${plane}, 스케일: ${scale}`);
      }
    } else {
      console.log(`이미지 데이터 없음: ${plane}`);
      // 데이터가 없을 때 placeholder
      const containerSize = Math.min(canvas.parentElement?.clientWidth || 256, canvas.parentElement?.clientHeight || 256);
      canvas.width = containerSize;
      canvas.height = containerSize;
      
      ctx.fillStyle = '#374151';
      ctx.fillRect(0, 0, containerSize, containerSize);
      
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`No ${plane} data`, containerSize / 2, containerSize / 2 - 10);
      ctx.fillText(`Slice ${sliceIndex}`, containerSize / 2, containerSize / 2 + 10);
    }
  }, [extractSlice]);

  // 3D Breast 렌더링 함수
  const render3DBreast = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('3D Breast: Canvas context 없음');
      return;
    }
    
    const containerSize = Math.min(canvas.parentElement?.clientWidth || 256, canvas.parentElement?.clientHeight || 256);
    canvas.width = containerSize;
    canvas.height = containerSize;
    
    if (!niftiHeader || !niftiImage) {
      console.log('3D Breast: NIfTI 데이터 없음');
      // 데이터가 없을 때 placeholder 표시
      ctx.fillStyle = '#374151';
      ctx.fillRect(0, 0, containerSize, containerSize);
      
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No 3D data', containerSize / 2, containerSize / 2);
      return;
    }

    console.log('3D Breast 렌더링 시작', { 
      canvasSize: { width: canvas.width, height: canvas.height },
      headerDims: niftiHeader.dims 
    });
    
    // 배경
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, containerSize, containerSize);
    
    const { dims, datatypeCode } = niftiHeader;
    const [, width, height, depth] = dims;
    
    // 데이터 타입에 따라 적절한 배열 생성
    let niftiArray: Float32Array | Uint8Array | Uint16Array | Int16Array | Int32Array | Float64Array;
    switch (datatypeCode) {
      case 2: niftiArray = new Uint8Array(niftiImage); break;
      case 4: niftiArray = new Int16Array(niftiImage); break;
      case 8: niftiArray = new Int32Array(niftiImage); break;
      case 16: niftiArray = new Float32Array(niftiImage); break;
      case 64: niftiArray = new Float64Array(niftiImage); break;
      default: niftiArray = new Uint16Array(niftiImage);
    }
    
    // 데이터 범위 확인
    let minVal = Infinity, maxVal = -Infinity;
    const sampleSize = Math.min(10000, niftiArray.length);
    for (let i = 0; i < sampleSize; i++) {
      const val = niftiArray[i];
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }
    
    // 간단한 중간 슬라이스를 3D View로 표시
    const middleSlice = Math.floor(depth / 2);
    console.log(`3D View: 중간 슬라이스 ${middleSlice} 사용`);
    
    const imageData = ctx.createImageData(containerSize, containerSize);
    const data = imageData.data;
    
    // 중앙 정렬을 위한 오프셋 계산
    const scale = 0.8; // 약간 작게 표시하여 여백 확보
    const scaledSize = containerSize * scale;
    const offset = (containerSize - scaledSize) / 2;
    
    for (let y = 0; y < containerSize; y++) {
      for (let x = 0; x < containerSize; x++) {
        let pixelValue = 0;
        
        // 중앙 정렬된 영역 내에서만 뇌 이미지 표시
        if (x >= offset && x < offset + scaledSize && y >= offset && y < offset + scaledSize) {
          const normalizedX = (x - offset) / scaledSize;
          const normalizedY = (y - offset) / scaledSize;
          const realX = Math.floor(normalizedX * width);
          const realY = Math.floor(normalizedY * height);
          
          if (realX < width && realY < height) {
            const index = middleSlice * width * height + realY * width + realX;
            if (index < niftiArray.length) {
              const value = niftiArray[index];
              if (maxVal > minVal) {
                pixelValue = ((value - minVal) / (maxVal - minVal)) * 255;
              } else {
                pixelValue = value;
              }
              pixelValue = Math.min(255, Math.max(0, pixelValue));
            }
          }
        }
        
        const pixelIndex = (y * containerSize + x) * 4;
        data[pixelIndex] = pixelValue;     // R
        data[pixelIndex + 1] = pixelValue; // G
        data[pixelIndex + 2] = pixelValue; // B
        data[pixelIndex + 3] = 255;        // A
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    console.log('3D Breast 렌더링 완료 (중간 슬라이스 방식)');
  }, [niftiHeader, niftiImage]);

  // 3D Breast Canvas ref 추가
  const breast3DCanvasRef = useRef<HTMLCanvasElement>(null);

  // 모든 슬라이스 업데이트
  const updateAllSlices = useCallback(() => {
    // 모든 시퀀스 미리보기를 axial 방향으로 통일
    if (axialCanvasRef.current) {
      renderSlice(axialCanvasRef.current, 'axial', state.axialSlice);
    }
  }, [renderSlice, state.axialSlice]);

  // Tumor 파일 업로드/제거 토글 핸들러 함수들
  const handleTumorUpload = () => {
    // 이미 tumor 오버레이가 있으면 제거
    if (tumorOverlayUrl) {
      console.log('Tumor 오버레이 제거 중...');
      setTumorOverlayUrl(null);
      setTumorOverlayData(null);
      
      // MainDashboard에 null 전달하여 모든 뷰어에서 오버레이 제거
      if (onTumorOverlayUrl) {
        onTumorOverlayUrl(null);
      }
      
      console.log('✅ Tumor 오버레이 제거 완료');
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
        console.log('📝 Flask 서버 비활성화 - seg 파일 로드 건너뜀');
        return;
      }

      console.log('📝 Flask 서버 비활성화 - seg 파일 로드 기능 사용 안함');
      
      // Flask 서버가 비활성화되어 있으므로 seg 파일 로드하지 않음
      // 필요시 로컬 파일에서 seg.nii.gz를 직접 로드하는 로직 추가 가능
      
    } catch (error) {
      console.log('📝 Flask 서버 비활성화 - Tumor 로드 기능 사용 안함');
    }
  };

  // 파일 업로드 관련 코드 제거 - 이제 자동으로 seg.nii.gz 파일을 로드함

  // Tumor 오버레이 데이터 로드 함수
  const loadTumorOverlayData = async (overlayUrl: string) => {
    try {
      console.log('Tumor 오버레이 데이터 로드 시작:', overlayUrl);
      
      const response = await fetch(overlayUrl);
      if (!response.ok) {
        console.error('Tumor 파일 로드 오류:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('응답 내용:', errorText);
        throw new Error(`Tumor 파일 로드 실패: ${response.status} - ${errorText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      // Dynamic import for nifti-reader-js
      const nifti = await import('nifti-reader-js');
      
      // NIfTI 파일 파싱
      if (nifti.isCompressed(arrayBuffer)) {
        const decompressed = nifti.decompress(arrayBuffer) as ArrayBuffer;
        if (nifti.isNIFTI(decompressed)) {
          const header = nifti.readHeader(decompressed);
          const image = nifti.readImage(header, decompressed);
          
          setTumorOverlayData({ header: header as unknown as NiftiHeader, image });
          console.log('압축된 Tumor NIfTI 파일 로드 완료:', header);
        }
      } else if (nifti.isNIFTI(arrayBuffer)) {
        const header = nifti.readHeader(arrayBuffer);
        const image = nifti.readImage(header, arrayBuffer);
        
        setTumorOverlayData({ header: header as unknown as NiftiHeader, image });
        console.log('Tumor NIfTI 파일 로드 완료:', header);
      } else {
        throw new Error('유효하지 않은 NIfTI 파일입니다.');
      }
      
      // 오버레이 데이터가 로드되면 모든 슬라이스 다시 렌더링
      updateAllSlices();
      
    } catch (error) {
      console.error('Tumor 오버레이 데이터 로드 오류:', error);
      setTumorOverlayData(null);
    }
  };

  // 슬라이스 변경 시 렌더링 업데이트
  useEffect(() => {
    updateAllSlices();
  }, [updateAllSlices]);

  // 윈도우 리사이즈 시 캔버스 다시 그리기
  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => {
        updateAllSlices();
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateAllSlices]);

  // 컴포넌트 마운트 시 초기 렌더링
  useEffect(() => {
    setTimeout(() => {
      updateAllSlices();
    }, 100);
  }, []);

  // 자동 재생 기능 - 비활성화
  // useEffect(() => {
  //   if (!state.isPlaying) return;

  //   const interval = setInterval(() => {
  //     setState(prev => ({
  //       ...prev,
  //       slice: (prev.slice + 1) % Math.max(maxSlices.axial, maxSlices.coronal, maxSlices.sagittal)
  //     }));
  //   }, 100);

  //   return () => clearInterval(interval);
  // }, [state.isPlaying, maxSlices]);

  // 키보드 컨트롤
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setState(prev => ({
          ...prev,
          slice: Math.max(0, prev.slice - 1)
        }));
      } else if (e.key === 'ArrowRight') {
        setState(prev => ({
          ...prev,
          slice: Math.min(Math.max(maxSlices.axial, maxSlices.coronal, maxSlices.sagittal), prev.slice + 1)
        }));
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [maxSlices]);

  // 슬라이스 변경 핸들러
  const handleSliceChange = (newSlice: number) => {
    setState(prev => ({ ...prev, slice: newSlice }));
    // onSliceChange 제거 - 각 뷰어 독립적 관리
  };

  // 재생/정지 토글
  const togglePlayback = () => {
    setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 pb-2 ${className}`}>
      {/* 상단 컨트롤 */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-center">
          <h3 className="text-white text-sm font-medium text-center">{t.imageList || 'MRI LIST'}</h3>
        </div>
      </div>

      {/* 정적 뷰 패널들 */}
      <div className="space-y-2">
        {/* 3D View - 실제 Breast3DView 컴포넌트 사용 */}
        <div className="relative rounded-lg overflow-hidden aspect-square">
          <Breast3DView
            imageUrl={undefined}
            niftiHeader={niftiHeader || undefined}
            niftiImage={niftiImage || undefined}
            originalNiftiUrl={originalNiftiUrl || undefined}
            patientId={patientId}
            globalSelectedSegFile={globalSelectedSegFile}
            onFullscreenClick={onFullscreenClick}
            tumorOverlayUrl={tumorOverlayUrl}
          />
        </div>

        {/* Axial View */}
        <div className="relative rounded-lg overflow-hidden aspect-square cursor-pointer transition-all bg-gray-800 hover:bg-gray-700">
          <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-50 px-2 py-1 rounded text-xs text-white">
            Axial
          </div>
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <div className="text-gray-300 text-center">
              <div className="text-lg font-medium">Axial</div>
              <div className="text-xs mt-1">View</div>
            </div>
          </div>
        </div>

        {/* Coronal View */}
        <div className="relative rounded-lg overflow-hidden aspect-square cursor-pointer transition-all bg-gray-800 hover:bg-gray-700">
          <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-50 px-2 py-1 rounded text-xs text-white">
            Coronal
          </div>
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <div className="text-gray-300 text-center">
              <div className="text-lg font-medium">Coronal</div>
              <div className="text-xs mt-1">View</div>
            </div>
          </div>
        </div>

        {/* Sagittal View */}
        <div className="relative rounded-lg overflow-hidden aspect-square cursor-pointer transition-all bg-gray-800 hover:bg-gray-700">
          <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-50 px-2 py-1 rounded text-xs text-white">
            Sagittal
          </div>
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <div className="text-gray-300 text-center">
              <div className="text-lg font-medium">Sagittal</div>
              <div className="text-xs mt-1">View</div>
            </div>
          </div>
        </div>
      </div>

      {/* 키보드 힌트 */}
      <div className="mt-3 text-xs text-gray-400 text-center">
        Use ← → keys to navigate slices
      </div>
    </div>
  );
}

import NiiVueSliceViewer from './NiiVueSliceViewer';

interface NiftiHeader {
  dims: number[];
  pixDims: number[];
  affine?: number[][];
  [key: string]: unknown;
}

interface CTViewProps {
  title: string;
  leftLabel?: string;
  rightLabel?: string;
  className?: string;
  imageUrl?: string; // 업로드된 이미지 URL 추가
  niftiHeader?: NiftiHeader;
  niftiImage?: ArrayBuffer;
  plane?: 'axial' | 'coronal' | 'sagittal';
  // slice 제거 - 각 뷰어가 독립적으로 관리
  patientId?: number; // 환자 ID 추가
  originalNiftiUrl?: string; // 원본 NIfTI URL 추가
  globalSelectedSegFile?: string | null; // 전역 segmentation 파일
  tumorOverlayUrl?: string | null; // Tumor 오버레이 URL 추가
}

export default function CTView({ 
  title, 
  leftLabel = 'R', 
  rightLabel = 'L',
  className = '',
  imageUrl,
  niftiHeader,
  niftiImage,
  plane,
  // slice 제거 - 각 뷰어가 독립적으로 관리
  patientId,
  originalNiftiUrl,
  globalSelectedSegFile,
  tumorOverlayUrl
}: CTViewProps) {
  return (
    <div className={`relative ${className}`}>
      {/* NiiVueSliceViewer 사용 */}
      <NiiVueSliceViewer 
        fileUrl={imageUrl} 
        title={title}
        className="h-full"
        niftiHeader={niftiHeader}
        niftiImage={niftiImage}
        plane={plane}
        // slice 제거 - 각 뷰어가 독립적으로 관리
        patientId={patientId}
        originalNiftiUrl={originalNiftiUrl}
        globalSelectedSegFile={globalSelectedSegFile}
        tumorOverlayUrl={tumorOverlayUrl}
      />
      
      {/* 방향 라벨은 NiiVueSliceViewer에서 처리 */}
    </div>
  );
} 
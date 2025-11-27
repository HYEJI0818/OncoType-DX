import NiiVueSliceViewer from './NiiVueSliceViewer';
import Breast3DView from './Breast3DView';

interface NiftiHeader {
  dims: number[];
  pixDims: number[];
  affine?: number[][];
  [key: string]: unknown;
}

interface MRIViewProps {
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
  maxSlice?: number; // 최대 슬라이스 수 제한
}

export default function MRIView({ 
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
  tumorOverlayUrl,
  maxSlice
}: MRIViewProps) {
  return (
    <div className={`relative ${className}`}>
      {/* 3D 섹션에서는 Breast3DView 사용, 나머지는 NiiVueSliceViewer 사용 */}
      {title === "3D" ? (
        <Breast3DView 
          imageUrl={imageUrl}
          niftiHeader={niftiHeader}
          niftiImage={niftiImage}
          originalNiftiUrl={originalNiftiUrl}
          patientId={patientId}
          globalSelectedSegFile={globalSelectedSegFile}
          tumorOverlayUrl={tumorOverlayUrl}
          onFullscreenClick={() => {
            // 전체화면 기능은 필요시 구현
            console.log('3D 전체화면 클릭');
          }}
        />
      ) : title === "OncoType DX 예측 결과" || title === "Patient information" || title === "Radiomics Feature" ? (
        // 비활성화된 기능들 - 3D View와 동일한 크기로 맞춤
        <div className="bg-gray-800 rounded-lg p-4">
          {/* 헤더 */}
          <div className="relative mb-3">
            <h3 className="text-white text-base font-medium text-center">{title}</h3>
          </div>
          
          {/* 메인 콘텐츠 - 3D View와 동일한 aspectRatio */}
          <div className="relative bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center" style={{ aspectRatio: '1' }}>
            <div className="text-gray-500 text-center">
              <div className="text-lg font-medium mb-2">기능 비활성화</div>
              <div className="text-sm">현재 사용할 수 없습니다</div>
            </div>
          </div>
        </div>
      ) : (
        <NiiVueSliceViewer 
          fileUrl={imageUrl} // 실제 이미지 URL 전달
          title={title}
          className="h-full"
          niftiHeader={niftiHeader}
          niftiImage={niftiImage}
          plane={plane}
          patientId={patientId}
          originalNiftiUrl={originalNiftiUrl}
          globalSelectedSegFile={globalSelectedSegFile}
          tumorOverlayUrl={tumorOverlayUrl}
          maxSlice={maxSlice}
        />
      )}
      
      {/* 방향 라벨은 각 뷰어에서 처리 */}
    </div>
  );
}

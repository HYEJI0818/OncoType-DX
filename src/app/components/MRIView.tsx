import NiiVueSliceViewer from './NiiVueSliceViewer';
import Breast3DView from './Breast3DView';
import { useState, useEffect } from 'react';
import { openPrintPreview, extractReportDataFromSession } from '@/lib/pdfGenerator';

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
  onXAIClick?: () => void; // XAI 설명 버튼 클릭 핸들러
  sessionData?: any; // AI 분석 세션 데이터
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
  maxSlice,
  onXAIClick,
  sessionData
}: MRIViewProps) {
  // 메모 상태 관리
  const [memoText, setMemoText] = useState('');

  // 컴포넌트 로드 시 저장된 참고 사항 불러오기
  useEffect(() => {
    // sessionData에서 환자 정보 로드
    if (sessionData?.patient_info) {
      const medicalHistory = sessionData.patient_info.medical_history || '';
      const notes = sessionData.patient_info.notes || '';
      const combinedNotes = [medicalHistory, notes].filter(Boolean).join('\n\n');
      
      if (combinedNotes) {
        setMemoText(combinedNotes);
      } else {
        // sessionData에 없으면 localStorage에서 로드
        const savedMemo = localStorage.getItem(`patient-notes-${patientId || 'default'}`);
        if (savedMemo) {
          setMemoText(savedMemo);
        }
      }
    }
  }, [patientId, sessionData]);
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
      ) : title === "Patient information" ? (
        // Patient Information 박스
        <div className="bg-gray-800 rounded-lg p-4">
          {/* 헤더 */}
          <div className="relative mb-3">
            <h3 className="text-white text-base font-medium text-center">{title}</h3>
          </div>
          
          {/* 환자 정보 및 버튼 */}
          <div className="relative bg-gray-700 rounded-lg p-4 h-full flex flex-col" style={{ aspectRatio: '1' }}>
            <div className="text-white space-y-3 flex-1">
              <div className="space-y-2 text-sm">
                <div>• 환자: {sessionData?.patient_info?.name || '정보 없음'} 
                  {sessionData?.patient_info?.gender && ` (${sessionData.patient_info.gender === 'male' ? 'M' : sessionData.patient_info.gender === 'female' ? 'F' : sessionData.patient_info.gender})`}
                </div>
                {sessionData?.patient_info?.birth_date && (
                  <div>• 생년월일: {sessionData.patient_info.birth_date}</div>
                )}
                {sessionData?.patient_info?.scan_date && (
                  <div>• 촬영일자: {sessionData.patient_info.scan_date}</div>
                )}
                {sessionData?.patient_info?.weight && sessionData?.patient_info?.height && (
                  <div>• 신체정보: {sessionData.patient_info.height}cm / {sessionData.patient_info.weight}kg</div>
                )}
              </div>
              
              {/* 참고 사항 입력 박스 */}
              <div className="bg-gray-600 rounded-lg p-3 mt-3 flex-1">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs font-medium text-yellow-300">참고 사항</div>
                  <button 
                    onClick={() => {
                      // 저장 기능 - 로컬 스토리지에 저장
                      localStorage.setItem(`patient-notes-${patientId || 'default'}`, memoText);
                      alert('참고 사항이 저장되었습니다.');
                    }}
                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                  >
                    저장
                  </button>
                </div>
                <div className="h-full flex flex-col">
                  <textarea 
                    value={memoText}
                    onChange={(e) => setMemoText(e.target.value)}
                    placeholder="환자 정보, 과거 병력, 진단명, 복용 중인 약물"
                    className="flex-1 min-h-[120px] px-2 py-2 text-xs bg-gray-700 border border-gray-500 rounded text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none resize-none"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
              </div>
            </div>
            
            <div className="pt-4 mt-2">
              <button 
                onClick={() => {
                  try {
                    console.log('인쇄 미리보기 창 열기...');
                    const reportData = extractReportDataFromSession(sessionData);
                    openPrintPreview(reportData);
                    console.log('인쇄 미리보기 창 열기 완료!');
                  } catch (error) {
                    console.error('인쇄 미리보기 실패:', error);
                    alert('인쇄 미리보기 중 오류가 발생했습니다.');
                  }
                }}
                className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-colors"
              >
                PDF 리포트 출력
              </button>
            </div>
          </div>
        </div>
      ) : title === "OncoType DX 예측 결과" ? (
        // OncoType DX 예측 결과 박스
        <div className="bg-gray-800 rounded-lg p-4">
          {/* 헤더 */}
          <div className="relative mb-3">
            <h3 className="text-white text-base font-medium text-center">{title}</h3>
          </div>
          
          {/* 예측 결과 내용 */}
          <div className="relative bg-gray-700 rounded-lg p-4 h-full flex flex-col justify-center" style={{ aspectRatio: '1' }}>
            <div className="text-white space-y-3 text-center">
              {/* 예측 점수 대형 표시 */}
              <div>
                <div className="text-4xl font-bold text-yellow-400 mb-1">42점</div>
                <div className="text-lg text-yellow-300 mb-3">(중간위험군)</div>
              </div>
              
              {/* 위험도 분류 */}
              <div className="text-xs text-gray-300 mb-3">
                저위험 ≤25 | 중간 26-50 | 고위험 ≥51
              </div>
              
              {/* 시각적 게이지바 */}
              <div className="mb-3 px-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>저위험</span>
                  <span>중간위험</span>
                  <span>고위험</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-2 rounded-full relative">
                    {/* 현재 점수 위치 표시 */}
                    <div 
                      className="absolute top-0 w-1 h-2 bg-white rounded-full shadow-lg"
                      style={{ left: '42%' }}
                    ></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0</span>
                  <span>25</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>
              
              {/* 신뢰도 */}
              <div className="mb-3">
                <div className="text-sm text-blue-400">신뢰도: 87%</div>
              </div>
              
              {/* 검사 권고사항 */}
              <div className="bg-gray-600 rounded-lg p-2 text-xs">
                <div className="text-yellow-300 font-medium mb-1">검사 권고사항:</div>
                <div className="text-gray-200 text-left">
                  • 추가 유전자 검사 고려<br/>
                  • 6개월 후 추적 검사<br/>
                  • 항암화학요법 상담 권장
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : title === "Radiomics Feature" ? (
        // Radiomics Feature 박스
        <div className="bg-gray-800 rounded-lg p-4">
          {/* 헤더 */}
          <div className="relative mb-3">
            <h3 className="text-white text-base font-medium text-center">{title}</h3>
          </div>
          
          {/* Radiomics 피처 데이터 */}
          <div className="relative bg-gray-700 rounded-lg p-4 h-full flex flex-col" style={{ aspectRatio: '1' }}>
            <div className="text-white space-y-3 text-center pt-6">
              <div className="text-sm font-medium mb-2">
                Top 5 High-Impact Radiomic Features
              </div>
              
              <div className="mt-8 space-y-3 text-xs">
                {/* 1. 조영증강 불균일도 */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span>1. 조영증강 불균일도</span>
                    <div className="text-right">
                      <div className="text-red-400 font-bold">0.78</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-1 mb-1">
                    <div className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-1 rounded-full relative">
                      <div className="absolute top-0 w-0.5 h-1 bg-white rounded-full" style={{ left: '75%' }}></div>
                    </div>
                  </div>
                  <div className="text-gray-400 text-[10px]">(정상: 0.45-0.65)</div>
                </div>
                
                {/* 2. 종양 경계 불규칙성 */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span>2. 종양 경계 불규칙성</span>
                    <div className="text-right">
                      <div className="text-red-400 font-bold">1.92</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-1 mb-1">
                    <div className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-1 rounded-full relative">
                      <div className="absolute top-0 w-0.5 h-1 bg-white rounded-full" style={{ left: '85%' }}></div>
                    </div>
                  </div>
                  <div className="text-gray-400 text-[10px]">(정상: 1.20-1.50)</div>
                </div>
                
                {/* 3. 종양 이질성 */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span>3. 종양 이질성</span>
                    <div className="text-right">
                      <div className="text-red-400 font-bold">2.34</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-1 mb-1">
                    <div className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-1 rounded-full relative">
                      <div className="absolute top-0 w-0.5 h-1 bg-white rounded-full" style={{ left: '80%' }}></div>
                    </div>
                  </div>
                  <div className="text-gray-400 text-[10px]">(정상: 1.80-2.10)</div>
                </div>
                
                {/* 4. 종양 크기 */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span>4. 종양 크기</span>
                    <div className="text-right">
                      <div className="text-red-400 font-bold">3.2 cm³</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-1 mb-1">
                    <div className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-1 rounded-full relative">
                      <div className="absolute top-0 w-0.5 h-1 bg-white rounded-full" style={{ left: '90%' }}></div>
                    </div>
                  </div>
                  <div className="text-gray-400 text-[10px]">(기준: &lt;2.0)</div>
                </div>
                
                {/* 5. 관류 패턴 변이 */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span>5. 관류 패턴 변이</span>
                    <div className="text-right">
                      <div className="text-red-400 font-bold">0.65</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-1 mb-1">
                    <div className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-1 rounded-full relative">
                      <div className="absolute top-0 w-0.5 h-1 bg-white rounded-full" style={{ left: '70%' }}></div>
                    </div>
                  </div>
                  <div className="text-gray-400 text-[10px]">(정상: 0.40-0.55)</div>
                </div>
              </div>
              
              {/* XAI 설명 버튼 */}
              <div className="absolute bottom-4 left-4 right-4">
                <button 
                  onClick={onXAIClick}
                  className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-colors"
                >
                  XAI 설명 →
                </button>
              </div>
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

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/contexts/EnhancedTranslationContext';
import { useAuth } from '@/contexts/AuthContext';
import DashboardHeader from './DashboardHeader';
import MRIView from './MRIView';
import Breast3DView from './Breast3DView';
import FeatureTable from './FeatureTable';
import ShapleyChart from './ShapleyChart';
import OptimizedLLMAnalysis from './OptimizedLLMAnalysis';
import NIfTISliceViewer from './NIfTISliceViewer';
import MPRViewer from './MPRViewer';

interface NiftiHeader {
  dims: number[];
  pixDims: number[];
  affine?: number[][];
  [key: string]: unknown;
}

interface Patient {
  id: number;
  examDate: string;
  chartNumber: string;
  labelNumber: string;
  name: string;
  gender: string;
  age: number;
  diagnosis: string;
  description: string;
  department: string;
  status: 'normal' | 'urgent';
}

export default function MainDashboard() {
  const { t } = useTranslation();
  const { logout, userType } = useAuth();
  
  // 업로드된 이미지 URL들을 관리하는 상태
  const [uploadedImages, setUploadedImages] = useState<{
    axial?: string;
    coronal?: string;
    sagittal?: string;
    breast3d?: string;
  }>({});

  // 원본 NIfTI 파일 URL 상태 추가
  const [originalNiftiUrl, setOriginalNiftiUrl] = useState<string | undefined>(undefined);
  
  // 선택된 환자 ID 상태 추가
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(undefined);

  // 선택된 파일 정보 상태 추가 (파일을 클릭했지만 아직 뷰어에 로드되지 않은 상태)
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | undefined>(undefined);

  // 전역 Segmentation 상태 (모든 뷰어에서 공유)
  const [globalSelectedSegFile, setGlobalSelectedSegFile] = useState<string | null>(null);

  // 환자 데이터 상태 추가
  const [patients, setPatients] = useState<Patient[]>([]);

  // 전체화면 모달 상태 추가
  const [showMPRViewer, setShowMPRViewer] = useState(false);

  // NIfTI 파일 데이터를 관리하는 상태 (뷰어 간 공유용)
  const [niftiHeader, setNiftiHeader] = useState<unknown>(null);
  const [niftiImage, setNiftiImage] = useState<ArrayBuffer | null>(null);

  // Tumor 오버레이 상태 추가
  const [tumorOverlayUrl, setTumorOverlayUrl] = useState<string | null>(null);

  // 현재 로드된 시퀀스 상태 추가 (연동 확인용)
  const [currentSequence, setCurrentSequence] = useState<string | null>(null);

  // Flask API 세션 관련 상태 추가
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  // Tumor 오버레이 URL 설정 핸들러
  const handleTumorOverlayUrl = (url: string | null) => {
    setTumorOverlayUrl(url);
  };

  // 세션 데이터 로드 함수 (Flask 서버 없이도 작동)
  const loadSessionData = useCallback(async (sessionId: string) => {
    setIsLoadingSession(true);
    try {
      console.log('🔄 세션 데이터 로드 중:', sessionId);
      
      // 먼저 로컬 메타데이터 파일에서 데이터 로드 시도
      try {
        const metadataResponse = await fetch(`/uploads/${sessionId}/metadata.json`);
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json();
          console.log('✅ 로컬 메타데이터에서 세션 데이터 로드:', metadata);
          
          // 로컬 메타데이터를 기반으로 시뮬레이션 데이터 생성
          const mockSessionData = {
            status: { status: 'completed', progress: 100 },
            results: { 
              success: true,
              tumor_overlay_url: null,
              analysis_complete: true
            },
            ai_analysis: {
              llm_analysis: {
                diagnosis: "유방암 의심 소견이 관찰됩니다.",
                confidence: 87,
                key_findings: [
                  "좌측 유방에 불규칙한 경계의 종괴 확인",
                  "조영증강 패턴이 악성 종양과 일치",
                  "주변 조직 침윤 소견 동반"
                ],
                recommendation: "추가 조영제 검사 및 조직검사 권장",
                analysis_time: new Date().toISOString()
              },
              shapley_values: {
                values: [
                  { feature: "Volume", value: 0.45, positive: true },
                  { feature: "Surface Area", value: 0.32, positive: true },
                  { feature: "Sphericity", value: -0.18, positive: false },
                  { feature: "Compactness", value: 0.23, positive: true },
                  { feature: "Elongation", value: -0.12, positive: false }
                ]
              },
              feature_analysis: {
                radiomic_features: [
                  { category: "Shape", feature: "Volume", value: 12.5, unit: "cm³" },
                  { category: "Shape", feature: "Surface Area", value: 45.2, unit: "cm²" },
                  { category: "Intensity", feature: "Mean", value: 156.8, unit: "HU" },
                  { category: "Texture", feature: "Contrast", value: 0.78, unit: "" }
                ]
              }
            }
          };
          
          setSessionData(mockSessionData);
          return;
        }
      } catch (metadataError) {
        console.log('📝 로컬 메타데이터 로드 실패, Flask 서버 시도...');
      }
      
      // Flask 서버 비활성화됨 - 시뮬레이션 데이터만 사용
      console.log('📝 Flask 서버 비활성화 - 시뮬레이션 데이터만 사용');
      
      // 기본 시뮬레이션 데이터 설정
      console.log('✅ 시뮬레이션 데이터로 진행');
      const mockSessionData = {
        status: { status: 'completed', progress: 100 },
        results: { 
          success: true,
          tumor_overlay_url: null,
          analysis_complete: true
        }
      };
      
      setSessionData(mockSessionData);
      
    } catch (error) {
      console.error('❌ 세션 데이터 로드 실패:', error);
      console.log('📝 일반 뷰어 모드로 계속 진행');
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  // 컴포넌트 마운트 시 세션 ID 확인 (AI 분석 결과용)
  useEffect(() => {
    const currentSessionId = localStorage.getItem('currentSessionId');
    const hasUploadedFiles = localStorage.getItem('hasUploadedFiles');
    
    if (currentSessionId && hasUploadedFiles) {
      console.log('🚀 저장된 세션 ID 발견 - AI 분석 결과 로드:', currentSessionId);
      setSessionId(currentSessionId);
      loadSessionData(currentSessionId);
    } else {
      console.log('📝 저장된 세션 없음 - 일반 뷰어 모드로 실행');
      
      // 테스트를 위해 임시로 세션 정보 설정
      console.log('🧪 테스트용 세션 정보 설정');
      localStorage.setItem('hasUploadedFiles', 'true');
      localStorage.setItem('currentSessionId', 'session_test_123');
      setSessionId('session_test_123');
      loadSessionData('session_test_123');
    }
  }, [loadSessionData]);

  // 선택된 뷰들을 관리하는 상태 (초기에는 3D만 표시)
  const [selectedViews, setSelectedViews] = useState<Set<'axial' | 'coronal' | 'sagittal' | '3d'>>(new Set(['3d']));
  
  // 3D 뷰어 전용 데이터 상태 (초기 로드용)
  const [breast3DData, setBreast3DData] = useState<{
    niftiHeader?: unknown;
    niftiImage?: ArrayBuffer;
  }>({});

  // UUID 기반 업로드된 파일 데이터 로드
  useEffect(() => {
    const loadUploadedData = async () => {
      try {
        if (!sessionId) return;
        
        console.log('🔄 UUID 기반 파일 데이터 로드 중:', sessionId);
        
        // 메타데이터 파일 로드
        const metadataResponse = await fetch(`/uploads/${sessionId}/metadata.json`);
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json();
          console.log('✅ 메타데이터 로드 성공:', metadata);
          
          // 첫 번째 파일을 3D 뷰어에 로드
          const sequences = ['T1', 'T1CE', 'T2', 'FLAIR'];
          const firstAvailableSequence = sequences.find(seq => metadata.files[seq]);
          
          if (firstAvailableSequence && metadata.files[firstAvailableSequence]) {
            const firstFileUrl = `/${metadata.files[firstAvailableSequence].file_path}`;
            console.log('🎯 첫 번째 파일 로드:', firstFileUrl);
            
            setOriginalNiftiUrl(firstFileUrl);
            setSelectedViews(new Set(['3d']));
            setUploadedImages({
              breast3d: firstFileUrl
            });
            
            console.log('✅ UUID 기반 3D 뷰어 활성화 완료');
          }
        } else {
          console.warn('⚠️ 메타데이터 파일을 찾을 수 없습니다. 기본 샘플 데이터를 로드합니다.');
          
          // 기본 샘플 데이터 로드
          const sampleNiftiUrl = '/uploads/19824666-8e5d-4c05-8ce9-336e82132d93/T1_BraTS-GLI-01532-000-t1n.nii.gz';
          const response = await fetch(sampleNiftiUrl, { method: 'HEAD' });
          if (response.ok) {
            setOriginalNiftiUrl(sampleNiftiUrl);
            setSelectedViews(new Set(['3d']));
            setUploadedImages({
              breast3d: sampleNiftiUrl
            });
            console.log('✅ 기본 샘플 데이터 로드 완료');
          }
        }
      } catch (error) {
        console.error('❌ 파일 데이터 로드 실패:', error);
      }
    };

    // 세션이 설정된 후 업로드된 데이터 로드
    if (sessionId) {
      setTimeout(loadUploadedData, 1000);
    }
  }, [sessionId]);

  // 디버깅 로그를 개발 환경에서만 실행하도록 최적화 (빈도 줄임)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && tumorOverlayUrl !== null) {
      console.log('🔥 MainDashboard: tumorOverlayUrl 변경됨:', tumorOverlayUrl);
    }
  }, [tumorOverlayUrl]);

  // selectedViews 로그는 제거 (너무 빈번함)

  // 뷰 선택 핸들러 - 최적화된 버전으로 불필요한 리렌더링 방지
  const handleViewSelect = useCallback((views: Set<'axial' | 'coronal' | 'sagittal' | '3d'>) => {
    // 개발 환경에서만 로그 출력 (빈도 줄임)
    if (process.env.NODE_ENV === 'development' && views.size > 1) {
      console.log('뷰 선택 업데이트:', views, 'Type:', typeof views, 'Is Set:', views instanceof Set);
    }
    
    // Set이 아닌 경우 Set으로 변환
    let viewsSet: Set<'axial' | 'coronal' | 'sagittal' | '3d'>;
    if (views instanceof Set) {
      viewsSet = views;
    } else {
      console.warn('views가 Set이 아닙니다. Set으로 변환합니다:', views);
      viewsSet = new Set(Array.isArray(views) ? views : []);
    }
    
    // 현재 선택된 뷰와 동일한지 확인하여 불필요한 업데이트 방지
    const currentViewsArray = Array.from(selectedViews).sort();
    const newViewsArray = Array.from(viewsSet).sort();
    const isViewsEqual = currentViewsArray.length === newViewsArray.length && 
                        currentViewsArray.every((view, index) => view === newViewsArray[index]);
    
    if (isViewsEqual) {
      return; // 동일한 뷰 선택이면 업데이트하지 않음
    }
    
    setSelectedViews(viewsSet);
    
    // 선택된 뷰들에 대해 이미지 설정 (배치 업데이트)
    const newUploadedImages: typeof uploadedImages = {};
    viewsSet.forEach(view => {
      if (selectedFileUrl) {
        const imageKey = view === '3d' ? 'breast3d' : view;
        newUploadedImages[imageKey] = selectedFileUrl;
      }
    });
    
    setUploadedImages(newUploadedImages);
  }, [selectedViews, selectedFileUrl]);

  // 파일 선택이 변경될 때 뷰어 선택 상태 초기화 (부드러운 전환)
  useEffect(() => {
    if (selectedFileUrl) {
      // 새 파일 선택 시 점진적으로 상태 업데이트
      const timeoutId = setTimeout(() => {
        setSelectedViews(new Set(['3d']));
        // 메인 뷰어에서 모든 이미지 점진적 제거
        setUploadedImages({
          axial: undefined,
          coronal: undefined,
          sagittal: undefined,
          breast3d: undefined
        });
      }, 50); // 50ms 지연으로 부드러운 전환
      
      return () => clearTimeout(timeoutId);
    }
    // 이전 파일 데이터 초기화
    setNiftiHeader(null);
    setNiftiImage(null);
  }, [selectedFileUrl]);

  // 3D 뷰어 전용 데이터 핸들러 (초기 로드용)
  const handle3DOnlyDataParsed = (header: unknown, image: ArrayBuffer) => {
    console.log('🎯 3D 전용 데이터 설정:', header, image);
    setBreast3DData({
      niftiHeader: header,
      niftiImage: image
    });
  };

  // NIfTI 데이터 파싱 핸들러 (모든 뷰어용)
  const handleNiftiDataParsed = (header: unknown, image: ArrayBuffer) => {
    console.log('🎯 메인 뷰어 데이터 설정:', header, image);
    setNiftiHeader(header);
    setNiftiImage(image);
  };

  // 원본 NIfTI URL 핸들러
  const handleOriginalNiftiUrl = (url: string) => {
    console.log('🎯 원본 NIfTI URL 설정:', url);
    setOriginalNiftiUrl(url);
  };

  // 환자 선택 시 데이터 초기화
  const handlePatientSelect = (patientId?: number) => {
    setNiftiHeader(null);
    setNiftiImage(null);
    setBreast3DData({}); // 3D 전용 데이터도 초기화
    setSelectedViews(new Set(['3d'])); // 3D만 유지하고 나머지는 초기화
    setUploadedImages({
      axial: undefined,
      coronal: undefined,
      sagittal: undefined,
      breast3d: undefined
    });
    setOriginalNiftiUrl(undefined);
    setSelectedFileUrl(undefined); // 선택된 파일도 초기화
    setSelectedPatientId(patientId);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-6">
      <div className="w-full max-w-full mx-auto px-2">
        <DashboardHeader patients={patients} />

        {/* AI 분석 로딩 상태 표시 */}
        {isLoadingSession && (
          <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <span className="text-blue-300">AI 분석 결과를 불러오는 중...</span>
            </div>
          </div>
        )}

        {/* AI 분석 세션 정보 표시 */}
        {sessionId && sessionData && (
          <div className="bg-green-900/20 border border-green-500 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-300 font-medium">
                  AI 분석 완료: {sessionId}
                </span>
              </div>
              
              {/* 오른쪽에 추가된 버튼들 */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowMPRViewer(true)}
                  className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors whitespace-nowrap"
                >
                  전체 화면
                </button>
                <button
                  className={`px-3 py-1.5 text-sm rounded transition-colors whitespace-nowrap ${
                    tumorOverlayUrl 
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                  onClick={() => {
                    // TUMOR 버튼 로직 (필요시 추가)
                    console.log('TUMOR 버튼 클릭');
                  }}
                >
                  {tumorOverlayUrl ? 'TUMOR ON' : 'TUMOR'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 메인 콘텐츠: 뷰어 섹션 */}
        <div className="flex gap-4 min-h-[700px] overflow-x-auto">
          {/* 뷰어 섹션 */}
          <div className="flex-1">
              <div className="w-full h-full">
                <div className="w-full">
                  <div className="grid grid-cols-2 gap-4 h-full">
                  {/* 첫 번째 뷰어 - 3D View */}
                  <MRIView
                    title="3D"
                    leftLabel="R"
                    rightLabel="L"
                    imageUrl={uploadedImages.axial || uploadedImages.breast3d}
                    niftiHeader={(selectedViews.size > 1 ? niftiHeader : breast3DData.niftiHeader) as unknown as NiftiHeader}
                    niftiImage={(selectedViews.size > 1 ? niftiImage : breast3DData.niftiImage) || undefined}
                    plane="axial"
                    patientId={selectedPatientId}
                    originalNiftiUrl={originalNiftiUrl} // tumor 오버레이를 위해 항상 전달
                    globalSelectedSegFile={globalSelectedSegFile}
                    tumorOverlayUrl={tumorOverlayUrl} // Tumor 오버레이 URL 전달
                    maxSlice={120} // 슬라이스 120까지 제한
                  />
                  
                  {/* 두 번째 뷰어 - OncoType DX 예측 결과 */}
                  <MRIView
                    title="OncoType DX 예측 결과"
                    leftLabel="R"
                    rightLabel="L"
                    imageUrl={undefined} // 뷰어 비활성화
                    niftiHeader={undefined}
                    niftiImage={undefined}
                    plane="axial"
                    patientId={selectedPatientId}
                    originalNiftiUrl={originalNiftiUrl}
                    globalSelectedSegFile={globalSelectedSegFile}
                    tumorOverlayUrl={tumorOverlayUrl}
                  />
                  
                  {/* 세 번째 뷰어 - Patient information */}
                  <MRIView
                    title="Patient information"
                    leftLabel="R"
                    rightLabel="L"
                    imageUrl={undefined} // 뷰어 비활성화
                    niftiHeader={undefined}
                    niftiImage={undefined}
                    plane="coronal"
                    patientId={selectedPatientId}
                    originalNiftiUrl={originalNiftiUrl}
                    globalSelectedSegFile={globalSelectedSegFile}
                    tumorOverlayUrl={tumorOverlayUrl}
                  />
                  
                  {/* 네 번째 뷰어 - Radiomics Feature */}
                  <MRIView
                    title="Radiomics Feature"
                    leftLabel="F"
                    rightLabel="B"
                    imageUrl={undefined} // 뷰어 비활성화
                    niftiHeader={undefined}
                    niftiImage={undefined}
                    plane="sagittal"
                    patientId={selectedPatientId}
                    originalNiftiUrl={originalNiftiUrl}
                    globalSelectedSegFile={globalSelectedSegFile}
                    tumorOverlayUrl={tumorOverlayUrl}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 중앙: AI 분석 박스들 */}
          <div className="w-80 space-y-3 flex-shrink-0">
            <div className="h-fit">
              <OptimizedLLMAnalysis sessionData={sessionData} />
            </div>
            
            <div className="h-[500px]">
              <ShapleyChart sessionData={sessionData} />
            </div>

          </div>

          {/* 우측: Feature Analysis 독립 패널 */}
          <div className="w-80 flex-shrink-0">
            <div className="h-fit">
              <FeatureTable sessionData={sessionData} />
            </div>
          </div>
        </div>

        {/* 전체화면 MPR 뷰어 모달 */}
        {showMPRViewer && (
          <MPRViewer
            imageUrl={selectedViews.has('3d') ? uploadedImages.breast3d : undefined}
            niftiHeader={niftiHeader as unknown as NiftiHeader}
            niftiImage={niftiImage || undefined}
            originalNiftiUrl={originalNiftiUrl}
            overlayNiftiUrl={globalSelectedSegFile || undefined}
            tumorOverlayUrl={tumorOverlayUrl} // 분석 페이지의 tumor 오버레이 URL 전달
            patientId={selectedPatientId}
            onClose={() => setShowMPRViewer(false)}
          />
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/contexts/EnhancedTranslationContext';
import { useAuth } from '@/contexts/AuthContext';
import DashboardHeader from './DashboardHeader';
import CTView from './CTView';
import Brain3DView from './Brain3DView';
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
    brain3d?: string;
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

  // 세션 데이터 로드 함수 (시뮬레이션)
  const loadSessionData = useCallback(async (sessionId: string) => {
    setIsLoadingSession(true);
    try {
      console.log('🔄 세션 데이터 시뮬레이션 로드 중:', sessionId);
      
      // 시뮬레이션 지연
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ 세션 데이터 시뮬레이션 로드 완료');
      console.log('📝 일반 뷰어 모드로 진행합니다.');
      
      // 시뮬레이션 데이터 설정
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
      
      // 네트워크 오류나 서버 오류의 경우 사용자에게 알림 없이 조용히 처리
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log('📝 Flask 서버 연결 실패 - 일반 뷰어 모드로 계속 진행');
      } else {
        // 다른 오류의 경우만 사용자에게 알림
        console.warn('⚠️ AI 분석 결과를 불러올 수 없습니다. 일반 뷰어 기능은 정상 작동합니다.');
      }
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
    }
  }, [loadSessionData]);

  // 선택된 뷰들을 관리하는 상태 (초기에는 3D만 표시)
  const [selectedViews, setSelectedViews] = useState<Set<'axial' | 'coronal' | 'sagittal' | '3d'>>(new Set(['3d']));
  
  // 3D 뷰어 전용 데이터 상태 (초기 로드용)
  const [brain3DData, setBrain3DData] = useState<{
    niftiHeader?: unknown;
    niftiImage?: ArrayBuffer;
  }>({});

  // 디버깅 로그를 개발 환경에서만 실행하도록 최적화
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔥 MainDashboard: tumorOverlayUrl 변경됨:', tumorOverlayUrl);
      console.log('🔥 MainDashboard: selectedViews:', selectedViews);
      console.log('🔥 MainDashboard: originalNiftiUrl:', originalNiftiUrl);
    }
  }, [tumorOverlayUrl]);

  // 디버깅 로그를 개발 환경에서만 실행하도록 최적화
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔥 MainDashboard: selectedViews 변경됨:', selectedViews);
    }
  }, [selectedViews]);

  // 뷰 선택 핸들러 - 최적화된 버전으로 불필요한 리렌더링 방지
  const handleViewSelect = useCallback((views: Set<'axial' | 'coronal' | 'sagittal' | '3d'>) => {
    if (process.env.NODE_ENV === 'development') {
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
        const imageKey = view === '3d' ? 'brain3d' : view;
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
          brain3d: undefined
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
    setBrain3DData({
      niftiHeader: header,
      niftiImage: image
    });
  };

  // 환자 선택 시 데이터 초기화
  const handlePatientSelect = (patientId?: number) => {
    setNiftiHeader(null);
    setNiftiImage(null);
    setBrain3DData({}); // 3D 전용 데이터도 초기화
    setSelectedViews(new Set(['3d'])); // 3D만 유지하고 나머지는 초기화
    setUploadedImages({
      axial: undefined,
      coronal: undefined,
      sagittal: undefined,
      brain3d: undefined
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
                  AI 분석 완료: {sessionId.substring(0, 8)}...
                </span>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('currentSessionId');
                  localStorage.removeItem('hasUploadedFiles');
                  window.location.reload();
                }}
                className="text-gray-400 hover:text-gray-300 text-sm px-3 py-1 rounded hover:bg-gray-700/50"
              >
                새 분석 시작
              </button>
            </div>
          </div>
        )}

        {/* 메인 콘텐츠: 좌측 뷰어, 우측 AI 분석 */}
        <div className="flex gap-6 min-h-[700px]">
          {/* 좌측: 뷰어 섹션 */}
          <div className="flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-9 gap-4 h-full">
              <div className="lg:col-span-2 order-1">
                <NIfTISliceViewer 
                  className="h-full" 
                  onViewSelect={handleViewSelect}
                  selectedViews={selectedViews}
                  onNiftiDataParsed={(header, image) => {
                    setNiftiHeader(header);
                    setNiftiImage(image);
                  }}
                  on3DOnlyDataParsed={handle3DOnlyDataParsed} // 3D 전용 데이터 콜백 추가
                  onOriginalNiftiUrl={setOriginalNiftiUrl} // 원본 NIfTI URL 콜백 연결
                  patientId={selectedPatientId}
                  globalSelectedSegFile={globalSelectedSegFile}
                  onFullscreenClick={() => setShowMPRViewer(true)}
                  onTumorOverlayUrl={handleTumorOverlayUrl} // Tumor 오버레이 URL 핸들러
                  onSequenceChange={setCurrentSequence} // 현재 시퀀스 변경 콜백 추가
                />
              </div>

              <div className="lg:col-span-7 order-2">
                <div className="grid grid-cols-2 gap-4 h-full">
                  {/* 첫 번째 뷰어 - 3D Brain (항상 표시) */}
                  <Brain3DView
                    imageUrl={uploadedImages.brain3d}
                    niftiHeader={(selectedViews.size > 1 ? niftiHeader : brain3DData.niftiHeader) as unknown as NiftiHeader}
                    niftiImage={(selectedViews.size > 1 ? niftiImage : brain3DData.niftiImage) || undefined}
                    originalNiftiUrl={originalNiftiUrl} // tumor 오버레이를 위해 항상 전달
                    patientId={selectedPatientId}
                    // slice 제거 - 각 뷰어 독립적 관리
                    globalSelectedSegFile={globalSelectedSegFile}
                    tumorOverlayUrl={tumorOverlayUrl} // Tumor 오버레이 URL 전달
                  />
                  
                  {/* 두 번째 뷰어 - Axial */}
                  <CTView
                    title={currentSequence ? `${t.axialView} (${currentSequence})` : t.axialView}
                    leftLabel="R"
                    rightLabel="L"
                    imageUrl={selectedViews instanceof Set && selectedViews.has('axial') ? uploadedImages.axial : undefined}
                    niftiHeader={selectedViews instanceof Set && selectedViews.has('axial') ? niftiHeader as unknown as NiftiHeader : undefined}
                    niftiImage={selectedViews instanceof Set && selectedViews.has('axial') ? niftiImage || undefined : undefined}
                    plane="axial"
                    // slice 제거 - 각 뷰어 독립적 관리
                    patientId={selectedPatientId}
                    originalNiftiUrl={originalNiftiUrl} // tumor 오버레이를 위해 항상 전달
                    globalSelectedSegFile={globalSelectedSegFile}
                    tumorOverlayUrl={tumorOverlayUrl} // Tumor 오버레이 URL 전달
                  />
                  
                  {/* 세 번째 뷰어 - Coronal */}
                  <CTView
                    title={currentSequence ? `${t.coronalView} (${currentSequence})` : t.coronalView}
                    leftLabel="R"
                    rightLabel="L"
                    imageUrl={selectedViews instanceof Set && selectedViews.has('coronal') ? uploadedImages.coronal : undefined}
                    niftiHeader={selectedViews instanceof Set && selectedViews.has('coronal') ? niftiHeader as unknown as NiftiHeader : undefined}
                    niftiImage={selectedViews instanceof Set && selectedViews.has('coronal') ? niftiImage || undefined : undefined}
                    plane="coronal"
                    // slice 제거 - 각 뷰어 독립적 관리
                    patientId={selectedPatientId}
                    originalNiftiUrl={originalNiftiUrl} // tumor 오버레이를 위해 항상 전달
                    globalSelectedSegFile={globalSelectedSegFile}
                    tumorOverlayUrl={tumorOverlayUrl} // Tumor 오버레이 URL 전달
                  />
                  
                  {/* 네 번째 뷰어 - Sagittal */}
                  <CTView
                    title={currentSequence ? `${t.sagittalView} (${currentSequence})` : t.sagittalView}
                    leftLabel="F"
                    rightLabel="B"
                    imageUrl={selectedViews instanceof Set && selectedViews.has('sagittal') ? uploadedImages.sagittal : undefined}
                    niftiHeader={selectedViews instanceof Set && selectedViews.has('sagittal') ? niftiHeader as unknown as NiftiHeader : undefined}
                    niftiImage={selectedViews instanceof Set && selectedViews.has('sagittal') ? niftiImage || undefined : undefined}
                    plane="sagittal"
                    // slice 제거 - 각 뷰어 독립적 관리
                    patientId={selectedPatientId}
                    originalNiftiUrl={originalNiftiUrl} // tumor 오버레이를 위해 항상 전달
                    globalSelectedSegFile={globalSelectedSegFile}
                    tumorOverlayUrl={tumorOverlayUrl} // Tumor 오버레이 URL 전달
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 우측: AI 분석 박스들 */}
          <div className="w-80 space-y-3">
            <div className="h-96">
              <OptimizedLLMAnalysis sessionData={sessionData} />
            </div>
            
            <div className="h-72">
              <ShapleyChart sessionData={sessionData} />
            </div>
            
            <div className="h-[500px]">
              <FeatureTable sessionData={sessionData} />
            </div>
          </div>
        </div>

        {/* 전체화면 MPR 뷰어 모달 */}
        {showMPRViewer && (
          <MPRViewer
            imageUrl={selectedViews.has('3d') ? uploadedImages.brain3d : undefined}
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

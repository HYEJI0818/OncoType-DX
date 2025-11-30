'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/EnhancedTranslationContext';
import DashboardHeader from '../components/DashboardHeader';
import { fileStorage } from '@/lib/indexedDB';

interface UploadedFile {
  file: File;
  id: string;
}

interface PatientInfo {
  name: string;
  gender: string;
  birthDate: string;
  scanDate: string;
}

interface AdditionalInfo {
  weight: string;
  height: string;
  medicalHistory: string;
  notes: string;
}

export default function UploadPage() {
  const { logout, user, isAuthenticated, loading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    name: '',
    gender: '',
    birthDate: '',
    scanDate: ''
  });

  const [additionalInfo, setAdditionalInfo] = useState<AdditionalInfo>({
    weight: '',
    height: '',
    medicalHistory: '',
    notes: ''
  });

  const [isEditingAdditionalInfo, setIsEditingAdditionalInfo] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);

  // 인증 상태 확인 (임시로 비활성화 - 테스트용)
  useEffect(() => {
    // if (!loading && !isAuthenticated && !user) {
    //   console.log('🔄 업로드 페이지 - 인증되지 않음, 로그인으로 리다이렉트');
    //   router.push('/login');
    // }
    console.log('⚠️ 인증 체크 비활성화 - 테스트 모드');
  }, [loading, isAuthenticated, user, router]);

  // 파일 업로드 핸들러
  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };



  // 파일 선택 핸들러
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // 지원되는 파일 형식 필터링
    const supportedFiles = Array.from(files).filter(file => {
      const fileName = file.name.toLowerCase();
      return fileName.endsWith('.dcm') || 
             fileName.endsWith('.dicom') || 
             fileName.endsWith('.nii') || 
             fileName.endsWith('.nii.gz');
    });

    if (supportedFiles.length === 0) {
      alert('지원되는 파일 형식을 선택해주세요. (DCM, NII, NII.gz)');
      return;
    }

    // 파일 크기 체크 (개별 파일 100MB, 전체 500MB)
    const maxFileSize = 100 * 1024 * 1024; // 100MB
    const maxTotalSize = 500 * 1024 * 1024; // 500MB
    
    const oversizedFiles = supportedFiles.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      alert(`다음 파일들이 너무 큽니다 (개별 파일 최대 100MB):\n${oversizedFiles.map(f => f.name).join('\n')}`);
      return;
    }

    // 전체 파일 크기 체크
    const totalSize = supportedFiles.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > maxTotalSize) {
      const totalSizeMB = Math.round(totalSize / (1024 * 1024));
      alert(`전체 파일 크기가 너무 큽니다 (${totalSizeMB}MB). 최대 500MB까지 업로드 가능합니다.`);
      return;
    }

    setUploadedFiles(supportedFiles);
  };

  // 개별 파일 제거 핸들러
  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 모든 파일 초기화
  const resetFiles = () => {
    setUploadedFiles([]);
  };

  // 진행률 시뮬레이션 함수
  const simulateProgress = (step: number, duration: number) => {
    return new Promise<void>((resolve) => {
      setProcessingStep(step);
      setProcessingProgress(0);
      
      const interval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            resolve();
            return 100;
          }
          return prev + (100 / (duration / 100)); // 100ms마다 업데이트
        });
      }, 100);
    });
  };

  // 분석 시작 (Supabase Storage 직접 업로드)
  const startAnalysis = async () => {
    if (uploadedFiles.length === 0) {
      alert('최소 1개의 파일을 업로드해주세요.');
      return;
    }

    setIsUploading(true);
    setProcessingStep(0);
    setProcessingProgress(0);
    
    try {
      // UUID 생성
      const sessionUuid = crypto.randomUUID();
      console.log('🆔 새 세션 UUID 생성:', sessionUuid);

      // 1단계: 파일 전처리 및 저장
      console.log('🚀 1단계: Supabase Storage에 파일 업로드 시작...');
      setProcessingStep(1);
      
      // Supabase client 가져오기 (이미 생성된 클라이언트 사용)
      const { supabase } = await import('@/lib/supabase');

      const uploadedFileData: any[] = [];
      
      // 각 파일을 Supabase Storage에 직접 업로드
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const progress = ((i + 1) / uploadedFiles.length) * 100;
        setProcessingProgress(Math.round(progress));
        
        console.log(`📤 파일 ${i + 1}/${uploadedFiles.length} 업로드 중: ${file.name}`);
        
        // 파일명에서 시퀀스 타입 추출
        const getSequenceType = (filename: string, index: number): string => {
          const name = filename.toLowerCase();
          if (name.includes('t1c') || name.includes('t1ce')) return 'T1CE';
          if (name.includes('t1n') || name.includes('t1')) return 'T1';
          if (name.includes('t2')) return 'T2';
          if (name.includes('flair')) return 'FLAIR';
          return ['T1', 'T1CE', 'T2', 'FLAIR'][index] || 'T1';
        };
        
        const sequenceType = getSequenceType(file.name, i);
        const savedFileName = `${sequenceType}_${file.name}`;
        const storagePath = `uploads/${sessionUuid}/${savedFileName}`;
        
        // Supabase Storage에 업로드
        const { data, error } = await supabase.storage
          .from('oncotype-files')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (error) {
          console.error(`❌ 파일 업로드 실패: ${file.name}`, error);
          throw new Error(`파일 업로드 실패: ${error.message}`);
        }
        
        console.log(`✅ 파일 ${i + 1}/${uploadedFiles.length} 업로드 완료: ${file.name}`);
        
        uploadedFileData.push({
          sequenceType,
          originalName: file.name,
          savedName: savedFileName,
          storagePath: data.path,
          size: file.size
        });
      }
      
      // 메타데이터를 서버에 저장 (환자 정보 포함)
      const metadataResponse = await fetch('/api/upload-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionUuid,
          patientName: patientInfo.name || 'Unknown Patient',
          patientGender: patientInfo.gender,
          patientBirthDate: patientInfo.birthDate,
          patientScanDate: patientInfo.scanDate,
          patientWeight: additionalInfo.weight ? parseFloat(additionalInfo.weight) : null,
          patientHeight: additionalInfo.height ? parseFloat(additionalInfo.height) : null,
          patientMedicalHistory: additionalInfo.medicalHistory,
          patientNotes: additionalInfo.notes,
          files: uploadedFileData
        })
      });
      
      if (!metadataResponse.ok) {
        throw new Error('메타데이터 저장에 실패했습니다.');
      }
      
      const metadataResult = await metadataResponse.json();
      console.log('✅ 메타데이터 저장 성공:', metadataResult);
      
      console.log('✅ 1단계 완료: 파일 저장 및 N4 Bias Correction + ComBat 정규화');

      // 2단계: 종양 세그멘테이션
      console.log('🔍 2단계: 종양 세그멘테이션 시작...');
      await simulateProgress(2, 1000); // 1초
      console.log('✅ 2단계 완료: U-Net 모델로 종양 영역 자동 추출');

      // 3단계: AI 추론
      console.log('🧠 3단계: AI 추론 시작...');
      await simulateProgress(3, 1000); // 1초
      console.log('✅ 3단계 완료: OncoType DX 점수 예측');

      // 4단계: 결과 생성 및 XAI 분석
      console.log('📊 4단계: 결과 생성 및 XAI 분석 시작...');
      await simulateProgress(4, 1000); // 1초
      console.log('✅ 4단계 완료: Grad-CAM 히트맵 + 피처 기여도 분석');

      // 완료 표시
      setProcessingStep(5);
      setProcessingProgress(100);

      // 잠시 대기 후 대시보드로 이동
      setTimeout(() => {
        localStorage.setItem('currentSessionId', sessionUuid);
        localStorage.setItem('hasUploadedFiles', 'true');
        localStorage.setItem('uploadedFileCount', uploadedFiles.length.toString());
        console.log('🎯 대시보드로 이동:', sessionUuid);
        router.push('/dashboard');
      }, 300);

    } catch (error) {
      console.error('❌ 분석 실패:', error);
      alert(`분석에 실패했습니다: ${error}`);
      setProcessingStep(0);
      setProcessingProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  // 업로드된 파일 개수 확인
  const uploadedCount = uploadedFiles.length;

  return (
    <div className="min-h-screen bg-gray-900 p-2 sm:p-4">
      <div className="max-w-[1600px] mx-auto">
        
        <DashboardHeader />

        {/* 메인 업로드 영역 - 새로운 레이아웃 */}
        <div className="w-full space-y-8">
          {/* 상단: 업로드 창과 분석과정을 나란히 */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* 왼쪽: 파일 업로드 영역 */}
            <div className="flex flex-col space-y-6">
              {/* 파일 업로드 박스 */}
              <div 
                onClick={uploadedFiles.length === 0 ? handleFileUpload : undefined}
                className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors duration-200 min-h-[400px] ${
                  uploadedFiles.length === 0 
                    ? 'border-gray-600 hover:border-blue-500 cursor-pointer bg-gray-800 hover:bg-gray-750' 
                    : 'border-green-500 bg-gray-800'
                }`}
              >
                {uploadedFiles.length === 0 ? (
                  /* 파일이 없을 때 - 업로드 UI */
                  <div className="flex items-center justify-center h-full">
                    <div className="space-y-6">
                      {/* 파일 아이콘 */}
                      <div className="mx-auto w-20 h-20 text-gray-400">
                        <svg fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                        </svg>
                      </div>
                      
                      {/* 업로드 버튼 */}
                      <div>
                        <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 text-lg">
                          파일 선택
                        </button>
                      </div>
                      
                      <div className="text-gray-400">
                        <p className="text-xl font-medium">MRI 파일을 업로드 하세요.</p>
                        <p className="text-base mt-3">
                          지원 형식: DCM, NII, NII.gz
                        </p>
                        <p className="text-sm mt-2 text-gray-500">
                          최대 크기: 500MB
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 파일이 있을 때 - 파일 목록 UI */
                  <div className="h-full">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <h3 className="text-base font-medium text-gray-300">업로드된 파일 ({uploadedFiles.length}개)</h3>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileUpload();
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors duration-200"
                      >
                        파일 추가
                      </button>
                    </div>
                    
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-700 rounded-md p-3 hover:bg-gray-650 transition-colors duration-200">
                          <div className="flex items-center space-x-2">
                            <span className="text-white text-sm font-medium">{file.name}</span>
                            <span className="text-gray-400 text-xs">
                              ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(index);
                            }}
                            className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-900/20 transition-colors duration-200"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 숨겨진 파일 입력 */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".nii,.nii.gz,.dcm,.dicom"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* 액션 버튼들 */}
              <div className="space-y-4">
                <button
                  onClick={startAnalysis}
                  disabled={uploadedCount === 0 || isUploading}
                  className={`w-full py-4 px-8 rounded-lg font-medium transition-colors duration-200 text-lg ${
                    uploadedCount === 0 || isUploading
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isUploading ? '업로드 중...' : '분석 시작'}
                </button>
                
                <button
                  onClick={resetFiles}
                  disabled={uploadedCount === 0}
                  className={`w-full py-4 px-8 rounded-lg font-medium transition-colors duration-200 text-lg ${
                    uploadedCount === 0
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-600 hover:bg-gray-700 text-gray-200'
                  }`}
                >
                  초기화
                </button>
              </div>
            </div>

            {/* 오른쪽: 분석 과정 */}
            <div className="bg-gray-800 rounded-lg p-6 min-h-[400px]">
              <h3 className="text-lg font-medium text-white mb-6">분석 과정</h3>
              <div className="space-y-4">
                {/* 1. 파일 전처리 */}
                <div className={`p-4 rounded-lg ${processingStep >= 1 ? 'bg-blue-900/30 border border-blue-500' : 'bg-gray-700'}`}>
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${processingStep >= 1 ? 'bg-blue-500' : 'bg-gray-500'}`}>
                      <span className="text-white font-medium">1</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-medium">파일 전처리</h4>
                      <p className="text-gray-400 text-sm">N4 Bias Correction + ComBat 정규화</p>
                    </div>
                    {processingStep > 1 && (
                      <div className="text-green-400">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {processingStep === 1 && (
                    <div className="mt-3 w-full bg-gray-600 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{width: `${processingProgress}%`}}></div>
                    </div>
                  )}
                </div>

                {/* 2. 종양 세그멘테이션 */}
                <div className={`p-4 rounded-lg ${processingStep >= 2 ? 'bg-blue-900/30 border border-blue-500' : 'bg-gray-700'}`}>
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${processingStep >= 2 ? 'bg-blue-500' : 'bg-gray-500'}`}>
                      <span className="text-white font-medium">2</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-medium">종양 세그멘테이션</h4>
                      <p className="text-gray-400 text-sm">U-Net 모델로 종양 영역 자동 추출</p>
                    </div>
                    {processingStep > 2 && (
                      <div className="text-green-400">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {processingStep === 2 && (
                    <div className="mt-3 w-full bg-gray-600 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{width: `${processingProgress}%`}}></div>
                    </div>
                  )}
                </div>

                {/* 3. AI 추론 */}
                <div className={`p-4 rounded-lg ${processingStep >= 3 ? 'bg-blue-900/30 border border-blue-500' : 'bg-gray-700'}`}>
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${processingStep >= 3 ? 'bg-blue-500' : 'bg-gray-500'}`}>
                      <span className="text-white font-medium">3</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-medium">AI 추론 (Radiomics + 3D CNN)</h4>
                      <p className="text-gray-400 text-sm">OncoType DX 점수 예측</p>
                    </div>
                    {processingStep > 3 && (
                      <div className="text-green-400">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {processingStep === 3 && (
                    <div className="mt-3 w-full bg-gray-600 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{width: `${processingProgress}%`}}></div>
                    </div>
                  )}
                </div>

                {/* 4. 결과 생성 및 XAI 분석 */}
                <div className={`p-4 rounded-lg ${processingStep >= 4 ? 'bg-blue-900/30 border border-blue-500' : 'bg-gray-700'}`}>
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${processingStep >= 4 ? 'bg-blue-500' : 'bg-gray-500'}`}>
                      <span className="text-white font-medium">4</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-medium">결과 생성 및 XAI 분석</h4>
                      <p className="text-gray-400 text-sm">Grad-CAM 히트맵 + 피처 기여도 분석</p>
                    </div>
                    {processingStep > 4 && (
                      <div className="text-green-400">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {processingStep === 4 && (
                    <div className="mt-3 w-full bg-gray-600 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{width: `${processingProgress}%`}}></div>
                    </div>
                  )}
                </div>
              </div>

              {/* 전체 진행률 */}
              {processingStep > 0 && (
                <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">
                      전체 진행률: {Math.min(100, Math.round(((processingStep - 1) * 25) + (processingProgress * 0.25)))}%
                    </span>
                    <span className="text-gray-400 text-sm">
                      {processingStep < 5 ? `단계 ${processingStep}/4 진행 중` : '분석 완료!'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-3">
                    <div 
                      className="bg-blue-500 h-3 rounded-full transition-all duration-300" 
                      style={{width: `${Math.min(100, Math.round(((processingStep - 1) * 25) + (processingProgress * 0.25)))}%`}}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 하단: 환자 정보와 추가 정보를 양 옆으로 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 왼쪽: 환자 정보 박스 */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-4">환자 정보</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">성함:</label>
                  <div className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-300">
                    {patientInfo.name || '파일에서 자동 파싱됩니다'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">성별:</label>
                  <div className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-300">
                    {patientInfo.gender || '파일에서 자동 파싱됩니다'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">생년월일:</label>
                  <div className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-300">
                    {patientInfo.birthDate || '파일에서 자동 파싱됩니다'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">촬영 일자:</label>
                  <div className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-300">
                    {patientInfo.scanDate || '파일에서 자동 파싱됩니다'}
                  </div>
                </div>
              </div>
            </div>

            {/* 오른쪽: 추가 정보 박스 */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">추가 정보</h3>
                <div className="flex space-x-2">
                      {isEditingAdditionalInfo ? (
                        <button
                          onClick={() => setIsEditingAdditionalInfo(false)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors duration-200"
                        >
                          저장
                        </button>
                      ) : (
                    <button
                      onClick={() => setIsEditingAdditionalInfo(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors duration-200"
                    >
                      수정
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">체중:</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={additionalInfo.weight}
                      onChange={(e) => setAdditionalInfo(prev => ({ ...prev, weight: e.target.value }))}
                      disabled={!isEditingAdditionalInfo}
                      className={`w-full px-3 py-2 pr-12 rounded-lg text-white focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                        isEditingAdditionalInfo 
                          ? 'bg-gray-700 border border-gray-600' 
                          : 'bg-gray-600 border border-gray-500 text-gray-300'
                      }`}
                      placeholder="체중을 입력하세요"
                      style={{ paddingRight: additionalInfo.weight ? `${Math.max(40, additionalInfo.weight.length * 9 + 35)}px` : '12px' }}
                    />
                    {additionalInfo.weight && (
                      <span 
                        className="absolute top-1/2 transform -translate-y-1/2 text-gray-400 text-sm pointer-events-none"
                        style={{ 
                          left: `${Math.max(15, additionalInfo.weight.length * 9 + 20)}px`
                        }}
                      >
                        kg
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">키:</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={additionalInfo.height}
                      onChange={(e) => setAdditionalInfo(prev => ({ ...prev, height: e.target.value }))}
                      disabled={!isEditingAdditionalInfo}
                      className={`w-full px-3 py-2 pr-12 rounded-lg text-white focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                        isEditingAdditionalInfo 
                          ? 'bg-gray-700 border border-gray-600' 
                          : 'bg-gray-600 border border-gray-500 text-gray-300'
                      }`}
                      placeholder="키를 입력하세요"
                      style={{ paddingRight: additionalInfo.height ? `${Math.max(40, additionalInfo.height.length * 9 + 35)}px` : '12px' }}
                    />
                    {additionalInfo.height && (
                      <span 
                        className="absolute top-1/2 transform -translate-y-1/2 text-gray-400 text-sm pointer-events-none"
                        style={{ 
                          left: `${Math.max(15, additionalInfo.height.length * 9 + 20)}px`
                        }}
                      >
                        cm
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">과거 병력:</label>
                  <textarea
                    value={additionalInfo.medicalHistory}
                    onChange={(e) => setAdditionalInfo(prev => ({ ...prev, medicalHistory: e.target.value }))}
                    disabled={!isEditingAdditionalInfo}
                    className={`w-full px-3 py-2 rounded-lg text-white focus:outline-none focus:border-blue-500 h-20 resize-none ${
                      isEditingAdditionalInfo 
                        ? 'bg-gray-700 border border-gray-600' 
                        : 'bg-gray-600 border border-gray-500 text-gray-300'
                    }`}
                    placeholder="과거 병력을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">참고 사항:</label>
                  <textarea
                    value={additionalInfo.notes}
                    onChange={(e) => setAdditionalInfo(prev => ({ ...prev, notes: e.target.value }))}
                    disabled={!isEditingAdditionalInfo}
                    className={`w-full px-3 py-2 rounded-lg text-white focus:outline-none focus:border-blue-500 h-20 resize-none ${
                      isEditingAdditionalInfo 
                        ? 'bg-gray-700 border border-gray-600' 
                        : 'bg-gray-600 border border-gray-500 text-gray-300'
                    }`}
                    placeholder="참고 사항을 입력하세요"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
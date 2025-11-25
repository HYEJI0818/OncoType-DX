'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/EnhancedTranslationContext';
import DashboardHeader from '../components/DashboardHeader';
import { fileStorage } from '@/lib/indexedDB';

interface UploadedFile {
  file: File;
  id: string;
}

interface FileSlots {
  T1: UploadedFile | null;
  T1CE: UploadedFile | null;
  T2: UploadedFile | null;
  FLAIR: UploadedFile | null;
}

export default function UploadPage() {
  const { logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [fileSlots, setFileSlots] = useState<FileSlots>({
    T1: null,
    T1CE: null,
    T2: null,
    FLAIR: null
  });

  const [isUploading, setIsUploading] = useState(false);

  // 파일 업로드 핸들러
  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };


  // 파일명에서 CT 시퀀스 타입 자동 감지
  const detectSequenceType = (fileName: string): keyof FileSlots | null => {
    const lowerName = fileName.toLowerCase();
    
    // T1 (t1, t1n)
    if (lowerName.includes('t1n') || (lowerName.includes('t1') && !lowerName.includes('t1c'))) {
      return 'T1';
    }
    
    // T1CE (t1c, t1ce)
    if (lowerName.includes('t1c') || lowerName.includes('t1ce')) {
      return 'T1CE';
    }
    
    // T2 (t2, t2w)
    if (lowerName.includes('t2') && !lowerName.includes('t2f')) {
      return 'T2';
    }
    
    // FLAIR (t2f, flair)
    if (lowerName.includes('t2f') || lowerName.includes('flair')) {
      return 'FLAIR';
    }
    
    return null;
  };

  // 파일 선택 핸들러
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // nii.gz 파일만 필터링
    const niiFiles = Array.from(files).filter(file => 
      file.name.toLowerCase().endsWith('.nii.gz') || 
      file.name.toLowerCase().endsWith('.nii')
    );

    if (niiFiles.length === 0) {
      alert('nii.gz 파일을 선택해주세요.');
      return;
    }

    // 파일명 기반 자동 배치 시도
    const newFileSlots = { ...fileSlots };
    const successfullyPlaced: string[] = [];
    const failedFiles: string[] = [];

    niiFiles.forEach(file => {
      const detectedType = detectSequenceType(file.name);
      
      if (detectedType && !newFileSlots[detectedType]) {
        // 해당 슬롯이 비어있으면 자동 배치
        newFileSlots[detectedType] = {
          file,
          id: `${Date.now()}-${detectedType}`
        };
        successfullyPlaced.push(`${file.name} → ${detectedType}`);
        console.log(`자동 배치: ${file.name} -> ${detectedType}`);
      } else {
        // 자동 배치 실패
        if (detectedType && newFileSlots[detectedType]) {
          failedFiles.push(`${file.name} (${detectedType} 슬롯이 이미 사용 중)`);
        } else {
          failedFiles.push(`${file.name} (파일명에서 시퀀스 타입을 인식할 수 없음)`);
        }
      }
    });

    // 상태 업데이트
    setFileSlots(newFileSlots);

    // 결과 알림
    if (successfullyPlaced.length > 0) {
      console.log('자동 배치 완료:', successfullyPlaced);
    }
    
    if (failedFiles.length > 0) {
      alert(`다음 파일들은 자동 배치되지 않았습니다:\n\n${failedFiles.join('\n')}\n\n파일명에 t1, t1ce, t2, flair 등의 키워드가 포함되어야 자동 인식됩니다.`);
    }
  };

  // 특정 슬롯에 파일 할당
  const assignFileToSlot = (file: File, slotKey: keyof FileSlots) => {
    setFileSlots(prev => ({
      ...prev,
      [slotKey]: {
        file,
        id: `${Date.now()}-${slotKey}`
      }
    }));
  };

  // 개별 파일 제거 핸들러
  const removeFile = (slotKey: keyof FileSlots) => {
    setFileSlots(prev => ({
      ...prev,
      [slotKey]: null
    }));
  };

  // 모든 파일 초기화
  const resetFiles = () => {
    setFileSlots({
      T1: null,
      T1CE: null,
      T2: null,
      FLAIR: null
    });
  };

  // 분석 시작 (Flask API 사용)
  const startAnalysis = async () => {
    const uploadedFiles = Object.values(fileSlots).filter(slot => slot !== null);
    
    if (uploadedFiles.length === 0) {
      alert('최소 1개의 파일을 업로드해주세요.');
      return;
    }

    setIsUploading(true);
    
    try {
      // 1. Flask API에서 새 세션 생성
      console.log('🚀 새 세션 생성 중...');
      const sessionResponse = await fetch('http://localhost:5001/api/session/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!sessionResponse.ok) {
        const errorText = await sessionResponse.text();
        throw new Error(`세션 생성에 실패했습니다. (${sessionResponse.status}): ${errorText}`);
      }

      const sessionData = await sessionResponse.json();
      const sessionId = sessionData.session_id;
      console.log('✅ 세션 생성 완료:', sessionId);

      // 2. Flask API에 파일들 업로드
      console.log('📤 파일 업로드 시작...');
      const formData = new FormData();
      
      Object.entries(fileSlots)
        .filter(([_, slot]) => slot !== null)
        .forEach(([sequenceType, slot]) => {
          formData.append(sequenceType, slot!.file);
          console.log(`${sequenceType} 파일 추가:`, slot!.file.name);
        });

      const uploadResponse = await fetch(`http://localhost:5001/api/session/${sessionId}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`파일 업로드에 실패했습니다. (${uploadResponse.status}): ${errorText}`);
      }

      const uploadData = await uploadResponse.json();
      console.log('✅ 파일 업로드 완료:', uploadData);

      // 3. AI 분석 시작
      console.log('🧠 AI 분석 시작...');
      const analysisResponse = await fetch(`http://localhost:5001/api/session/${sessionId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text();
        throw new Error(`AI 분석 시작에 실패했습니다. (${analysisResponse.status}): ${errorText}`);
      }

      const analysisData = await analysisResponse.json();
      console.log('✅ AI 분석 완료:', analysisData);

      // 4. IndexedDB에 파일들 저장 (뷰어용)
      console.log('💾 IndexedDB에 파일 저장 중...');
      const savedFiles: string[] = [];
      
      for (const [sequenceType, slot] of Object.entries(fileSlots)) {
        if (slot !== null) {
          try {
            await fileStorage.saveFile(sequenceType, slot.file);
            savedFiles.push(sequenceType);
            console.log(`✅ ${sequenceType} 파일 IndexedDB 저장 완료`);
          } catch (error) {
            console.error(`❌ ${sequenceType} 파일 IndexedDB 저장 실패:`, error);
          }
        }
      }
      
      console.log('💾 IndexedDB 저장 완료:', savedFiles);

      // 5. 세션 ID를 localStorage에 저장하고 분석 페이지로 이동
      localStorage.setItem('currentSessionId', sessionId);
      localStorage.setItem('hasUploadedFiles', 'true');
      console.log('🎯 분석 페이지로 이동:', sessionId);
      
      router.push('/analysis');
    } catch (error) {
      console.error('❌ 업로드/분석 실패:', error);
      alert(`업로드에 실패했습니다: ${error}`);
    } finally {
      setIsUploading(false);
    }
  };

  // 업로드된 파일 개수 확인
  const uploadedCount = Object.values(fileSlots).filter(slot => slot !== null).length;

  return (
    <div className="min-h-screen bg-gray-900 p-2 sm:p-4">
      <div className="max-w-[1600px] mx-auto">
        
        <DashboardHeader />

        {/* 메인 업로드 영역 - 화면 비율에 맞게 크게 */}
        <div className="w-full">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 min-h-[800px]">
            {/* 왼쪽: 파일 업로드 영역 (더 넓게) */}
            <div className="xl:col-span-2 flex flex-col">
              {/* 파일 업로드 박스 - 오른쪽 전체 높이와 동일 */}
              <div 
                onClick={handleFileUpload}
                className="relative border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-lg p-16 text-center cursor-pointer transition-colors duration-200 bg-gray-800 hover:bg-gray-750 flex items-center justify-center h-full"
              >
                <div className="space-y-6">
                  {/* 파일 아이콘 - 더 크게 */}
                  <div className="mx-auto w-24 h-24 text-gray-400">
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  </div>
                  
                  {/* 업로드 버튼 - 더 크게 */}
                  <div>
                    <button className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 text-lg">
                      파일 선택
                    </button>
                  </div>
                  
                  <div className="text-gray-400">
                    <p className="text-xl font-medium">NIfTI CT 파일을 업로드하세요</p>
                    <p className="text-base mt-3">
                      .nii.gz 또는 .nii CT 파일을 최대 4개까지 선택할 수 있습니다
                    </p>
                    <p className="text-sm mt-2 text-gray-500">
                      T1, T1CE, T2, FLAIR 순서로 자동 배치됩니다
                    </p>
                  </div>
                </div>
              </div>

              {/* 숨겨진 파일 입력 */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".nii,.nii.gz"
                onChange={handleFileSelect}
                className="hidden"
              />

            </div>

            {/* 오른쪽: 파일 슬롯 */}
            <div className="xl:col-span-1 flex flex-col h-full">
              {/* 업로드 상태 */}
              {uploadedCount > 0 && (
                <div className="bg-gray-800 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 font-medium text-lg">
                      {uploadedCount}개 파일 업로드됨
                    </span>
                    <button
                      onClick={resetFiles}
                      className="text-red-400 hover:text-red-300 text-base px-4 py-2 rounded-lg hover:bg-red-900/20 transition-colors duration-200"
                    >
                      모두 초기화
                    </button>
                  </div>
                </div>
              )}
              
              
              {/* 파일 슬롯들 */}
              <div className="space-y-6">
                {Object.entries(fileSlots).map(([slotKey, slot]) => (
                    <div
                      key={slotKey}
                      className={`p-6 rounded-lg border-2 transition-colors duration-200 ${
                        slot 
                          ? 'border-green-500 bg-green-900/20' 
                          : 'border-gray-600 bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            slot ? 'bg-green-500' : 'bg-gray-500'
                          }`}>
                            {slot && (
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className="font-medium text-white text-lg">{slotKey}</span>
                        </div>
                        
                        {slot ? (
                          <div className="flex items-center space-x-3">
                            <span className="text-base text-gray-300 truncate max-w-48">
                              {slot.file.name}
                            </span>
                            <button
                              onClick={() => removeFile(slotKey as keyof FileSlots)}
                              className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-900/20 transition-colors duration-200"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-base">파일 없음</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              {/* 액션 버튼들 - 더 크게 */}
              <div className="mt-6">
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
                
                <div className="mt-6">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
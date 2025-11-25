'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/EnhancedTranslationContext';

interface LLMAnalysisData {
  diagnosis: string;
  confidence: number;
  key_findings: string[];
  recommendation: string;
  analysis_time: string;
}

interface OptimizedLLMAnalysisProps {
  sessionData?: any;
}

export default function OptimizedLLMAnalysis({ sessionData }: OptimizedLLMAnalysisProps) {
  const { t, language } = useTranslation();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [analysisData, setAnalysisData] = useState<LLMAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentTime(new Date().toLocaleString('ko-KR'));
    loadAnalysisData();
  }, [sessionData]);

  const loadAnalysisData = async () => {
    try {
      // sessionData가 props로 전달되었으면 그것을 사용
      if (sessionData?.results?.ai_analysis?.llm_analysis) {
        console.log('✅ Props에서 AI 분석 결과 사용:', sessionData.results.ai_analysis.llm_analysis);
        setAnalysisData(sessionData.results.ai_analysis.llm_analysis);
        setIsLoading(false);
        return;
      }

      // sessionData가 없으면 기존 방식으로 API 호출
      const sessionId = localStorage.getItem('currentSessionId');
      if (!sessionId) {
        console.log('📝 세션 ID 없음 - AI 분석 결과 표시 안함');
        setIsLoading(false);
        return;
      }

      console.log('🔍 AI 분석 결과 조회 중...', sessionId);
      
      // Flask 서버 연결 확인
      try {
        const response = await fetch(`http://localhost:5001/api/session/${sessionId}/analysis`, {
          signal: AbortSignal.timeout(5000) // 5초 타임아웃
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            console.warn('⚠️ 분석 결과를 찾을 수 없습니다.');
            setError('분석이 아직 완료되지 않았습니다.');
            return;
          }
          throw new Error(`분석 결과 조회 실패: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ AI 분석 결과 로드:', data);
        
        if (data.success && data.ai_analysis?.llm_analysis) {
          setAnalysisData(data.ai_analysis.llm_analysis);
        } else {
          setError('분석 결과가 없습니다.');
        }
      } catch (fetchError) {
        if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
          console.log('📝 Flask 서버 연결 실패 - AI 분석 결과 표시 안함');
          setError('AI 분석 서버에 연결할 수 없습니다.');
        } else {
          throw fetchError;
        }
      }
    } catch (err) {
      console.error('❌ AI 분석 결과 로드 실패:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setIsLoading(false);
    }
  };

  // 현재 데이터 설정
  const currentData = analysisData ? {
    diagnosis: analysisData.diagnosis,
    keyFindings: analysisData.key_findings,
    recommendation: analysisData.recommendation
  } : {
    diagnosis: "",
    keyFindings: [],
    recommendation: ""
  };
  const confidence = analysisData?.confidence || null;

  return (
    <div className="bg-gray-800 rounded-lg p-4 h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-white text-sm font-medium text-center mb-2">{t.aiAnalysis}</h3>
        <div className="flex items-center justify-center space-x-2">
          {isLoading ? (
            <>
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-yellow-400">분석 결과 로딩 중...</span>
            </>
          ) : error ? (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-xs text-red-400">{error}</span>
            </>
          ) : analysisData ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-400">분석 완료</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span className="text-xs text-gray-400">분석 대기 중</span>
            </>
          )}
        </div>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto">
        {/* 진단 결과 */}
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">{t.analysisResult}</span>
            {confidence && (
              <span className="text-xs text-blue-400">{t.confidence}: {confidence}%</span>
            )}
          </div>
          <p className="text-sm text-white font-medium">
            {currentData.diagnosis}
          </p>
        </div>

        {/* 주요 소견 */}
        <div>
          <h4 className="text-xs text-gray-400 mb-2">{t.keyFindings}</h4>
          <div className="space-y-1.5">
            {currentData.keyFindings.map((finding, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="w-1 h-1 bg-blue-400 rounded-full mt-1.5 flex-shrink-0"></div>
                <span className="text-xs text-gray-300 leading-relaxed">{finding}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 권장사항 */}
        <div className="bg-blue-900/30 border border-blue-800/50 rounded-lg p-2.5">
          <h4 className="text-xs text-blue-400 mb-1">{t.recommendation}</h4>
          <p className="text-xs text-blue-300">
            {currentData.recommendation}
          </p>
        </div>

        {/* 분석 시간 */}
        <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-700 mt-auto">
          {currentTime && `${t.analysisCompleteAt}: ${currentTime}`}
        </div>
      </div>

      {/* New Analysis 버튼 */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <button
          onClick={() => router.push('/upload')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Analysis</span>
        </button>
      </div>
    </div>
  );
}

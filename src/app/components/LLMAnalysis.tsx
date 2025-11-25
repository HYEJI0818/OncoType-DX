'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/EnhancedTranslationContext';

export default function LLMAnalysis() {
  const { t } = useTranslation();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    setCurrentTime(new Date().toLocaleString('ko-KR'));
  }, []);

  const analysisData = {
    diagnosis: t.benignTumor,
    confidence: 87.3,
    keyFindings: [
      "종양의 경계가 명확하고 규칙적임",
      "주변 조직으로의 침윤 소견 없음",
      "조영 증강 패턴이 균등함",
      "괴사나 출혈 소견 관찰되지 않음"
    ],
    recommendation: "3-6개월 후 추적 관찰 권장"
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-sm font-medium">{t.aiAnalysis}</h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-400">{t.analysisComplete}</span>
        </div>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto">
        {/* 진단 결과 */}
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">{t.analysisResult}</span>
            <span className="text-xs text-blue-400">{t.confidence}: {analysisData.confidence}%</span>
          </div>
          <p className="text-sm text-white font-medium">{analysisData.diagnosis}</p>
        </div>

        {/* 주요 소견 */}
        <div>
          <h4 className="text-xs text-gray-400 mb-2">{t.keyFindings}</h4>
          <div className="space-y-1.5">
            {analysisData.keyFindings.map((finding, index) => (
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
          <p className="text-xs text-blue-300">{analysisData.recommendation}</p>
        </div>

        {/* 분석 시간 */}
        <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-700 mt-auto">
          {currentTime && `${t.analysisCompleteAt}: ${currentTime}`}
        </div>
      </div>
    </div>
  );
} 
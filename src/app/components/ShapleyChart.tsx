'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/EnhancedTranslationContext';

interface ShapleyValue {
  feature: string;
  value: number;
  positive: boolean;
}

interface ImportanceValue {
  feature: string;
  value: number;
}

interface ShapleyData {
  values: ShapleyValue[];
  importance: ImportanceValue[];
}

interface ShapleyChartProps {
  sessionData?: any;
}

export default function ShapleyChart({ sessionData }: ShapleyChartProps) {
  const { t } = useTranslation();
  const [shapleyData, setShapleyData] = useState<ShapleyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadShapleyData();
  }, [sessionData]);

  const loadShapleyData = async () => {
    try {
      const sessionId = localStorage.getItem('currentSessionId');
      if (!sessionId) {
        setError('세션 ID를 찾을 수 없습니다.');
        setIsLoading(false);
        return;
      }

      console.log('🔍 Shapley Values 시뮬레이션 로드 중...', sessionId);
      
      // 시뮬레이션 데이터 로드 (1초 지연)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData = {
        values: defaultShapleyData,
        importance: defaultImportanceData
      };
      
      setShapleyData(mockData);
      console.log('✅ Shapley Values 시뮬레이션 로드 완료:', mockData);
      
    } catch (err) {
      console.error('❌ Shapley Values 로드 실패:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setIsLoading(false);
    }
  };

  // 기본 데이터 (로딩 중이거나 에러일 때)
  const defaultShapleyData = [
    { feature: 'Volume', value: 0.4, positive: true },
    { feature: 'GLCM_contrast', value: 0.3, positive: true },
    { feature: 'Surface_area', value: 0.25, positive: true },
    { feature: 'Compactness', value: -0.15, positive: false },
    { feature: 'GLRLM_LRE', value: 0.1, positive: true },
    { feature: 'Sphericity', value: -0.08, positive: false },
    { feature: 'GLSZM_ZE', value: 0.05, positive: true },
    { feature: 'Flatness', value: -0.03, positive: false },
  ];

  const defaultImportanceData = [
    { feature: 'Volume', value: 0.85 },
    { feature: 'GLCM_contrast', value: 0.72 },
    { feature: 'Surface_area', value: 0.68 },
    { feature: 'GLRLM_LRE', value: 0.45 },
    { feature: 'Compactness', value: 0.38 },
    { feature: 'GLSZM_ZE', value: 0.32 },
    { feature: 'Sphericity', value: 0.28 },
    { feature: 'Flatness', value: 0.15 },
  ];

  const currentShapleyData = shapleyData?.values || defaultShapleyData;
  const currentImportanceData = shapleyData?.importance || defaultImportanceData;

  return (
    <div className="bg-gray-800 rounded-lg p-4 h-full flex flex-col">
      <h3 className="text-white text-sm font-medium mb-2 text-center">{t.shapleyValues} & {t.importance}</h3>
      
      <div className="flex-1 overflow-y-auto">
        {/* Shapley Values */}
        <div className="mb-6">
          <h4 className="text-gray-300 text-xs mb-3 text-center">{t.shapleyValues}</h4>
          <div className="space-y-2">
            {currentShapleyData.map((item, index) => (
              <div key={index} className="flex items-center text-xs justify-center">
                <div className="w-20 text-gray-300 truncate text-center">{item.feature}</div>
                <div className="flex-1 ml-2 relative">
                  <div className="h-4 bg-gray-700 rounded-full">
                    <div 
                      className={`h-full rounded-full ${item.positive ? 'bg-blue-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.abs(item.value) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className={`w-16 text-center ml-3 ${item.positive ? 'text-blue-400' : 'text-red-400'}`}>
                  {item.value > 0 ? '+' : ''}{item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Importance */}
        <div>
          <h4 className="text-gray-300 text-xs mb-3 text-center">{t.importance}</h4>
          <div className="space-y-2">
            {currentImportanceData.map((item, index) => (
              <div key={index} className="flex items-center text-xs justify-center">
                <div className="w-20 text-gray-300 truncate text-center">{item.feature}</div>
                <div className="flex-1 ml-2">
                  <div className="h-4 bg-gray-700 rounded-full">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${item.value * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-16 text-center ml-3 text-blue-400">
                  {item.value.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          {/* Flatness 아래 여백 추가 */}
          <div className="h-6"></div>
        </div>
      </div>
    </div>
  );
} 
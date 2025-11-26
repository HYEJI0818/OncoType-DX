'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/EnhancedTranslationContext';

interface FeatureData {
  [key: string]: { [subKey: string]: string | number };
}


interface FeatureToggleState {
  [category: string]: {
    [feature: string]: boolean;
  };
}

interface RadiomicFeature {
  category: string;
  feature: string;
  value: number;
  unit: string;
}

interface FeatureAnalysisData {
  radiomic_features: RadiomicFeature[];
  summary: {
    total_features: number;
    significant_features: number;
    analysis_method: string;
  };
}

interface FeatureTableProps {
  sessionData?: any;
}

export default function FeatureTable({ sessionData }: FeatureTableProps) {
  const { t } = useTranslation();
  
  // 개별 feature의 토글 상태 관리 (기본값: 모두 활성화)
  const [featureToggles, setFeatureToggles] = useState<FeatureToggleState>({});
  
  // 비활성화된 항목들의 박스 표시 여부 상태
  const [showDisabledFeatures, setShowDisabledFeatures] = useState(true);

  // Flask API 데이터 상태
  const [featureAnalysisData, setFeatureAnalysisData] = useState<FeatureAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeatureAnalysisData();
  }, []);

  const loadFeatureAnalysisData = async () => {
    try {
      const sessionId = localStorage.getItem('currentSessionId');
      if (!sessionId) {
        setError('세션 ID를 찾을 수 없습니다.');
        setIsLoading(false);
        return;
      }

      console.log('🔍 Feature Analysis 시뮬레이션 데이터 로드 중...', sessionId);
      
      // 시뮬레이션 데이터 로드 (1초 지연)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockFeatureAnalysisData: FeatureAnalysisData = {
        radiomic_features: [
          { name: 'Volume', value: 1234.56, unit: 'mm³' },
          { name: 'Surface_area', value: 567.89, unit: 'mm²' },
          { name: 'GLCM_contrast', value: 0.234, unit: '' },
          { name: 'GLRLM_LRE', value: 45.67, unit: '' },
          { name: 'Compactness', value: 0.789, unit: '' },
          { name: 'GLSZM_ZE', value: 12.34, unit: '' },
          { name: 'Sphericity', value: 0.456, unit: '' },
          { name: 'Flatness', value: 0.123, unit: '' },
        ],
        summary: {
          total_features: 8,
          analysis_method: 'PyRadiomics'
        }
      };
      
      setFeatureAnalysisData(mockFeatureAnalysisData);
      console.log('✅ Feature Analysis 시뮬레이션 데이터 로드 완료:', mockFeatureAnalysisData);
      
    } catch (err) {
      console.error('❌ Feature Analysis 데이터 로드 실패:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setIsLoading(false);
    }
  };

  // 개별 feature 토글 핸들러
  const handleFeatureToggle = (categoryKey: string, featureName: string) => {
    setFeatureToggles(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        [featureName]: !prev[categoryKey]?.[featureName]
      }
    }));
  };

  // feature가 활성화되어 있는지 확인 (기본값: true)
  const isFeatureEnabled = (categoryKey: string, featureName: string) => {
    return featureToggles[categoryKey]?.[featureName] !== false;
  };

  // 토글 스위치 컴포넌트 (현재 사용하지 않음 - 제거됨)
  
  const getFeatureData = (): FeatureData => {
    // Flask API 데이터가 있으면 사용, 없으면 기본 데이터
    if (featureAnalysisData?.radiomic_features) {
      const groupedFeatures: FeatureData = {};
      
      featureAnalysisData.radiomic_features.forEach(feature => {
        const categoryName = feature.category;
        if (!groupedFeatures[categoryName]) {
          groupedFeatures[categoryName] = {};
        }
        const displayValue = feature.unit ? `${feature.value} ${feature.unit}` : feature.value.toString();
        groupedFeatures[categoryName][feature.feature] = displayValue;
      });
      
      return groupedFeatures;
    }
    
    // 기본 데이터 (API 데이터가 없을 때)
    return ({
    [t.morphology || '형태학 (Morphology)']: {
      [t.volume || '부피 (cc)']: '18.4',
      [t.surfaceArea || '표면적 (cm²)']: '122.7',
      [t.compactness || 'Compactness (0-1)']: '0.81',
      [t.sphericity || 'Sphericity (0-1)']: '0.77',
      [t.elongation || 'Elongation (비율)']: '01:02.3',
      [t.flatness || 'Flatness (0-1)']: '0.32'
    },
    [t.glcmTexture || 'GLCM (Texture)']: {
      [t.contrast || 'Contrast']: '3.64 × 10²',
      [t.correlation || 'Correlation']: '0.67',
      [t.homogeneity || 'Homogeneity']: '0.91',
      [t.shortRunEmphasis || 'Short Run Emphasis']: '0.38',
      [t.longRunEmphasis || 'Long Run Emphasis']: '0.22',
      [t.smallZoneEmphasis || 'Small-Zone Emphasis']: '0.46'
    },
    [t.glrlm || 'GLRLM']: {
      [t.largeZoneEmphasis || 'Large-Zone Emphasis']: '0.18'
    },
    [t.glszm || 'GLSZM']: {
      [t.coarseness || 'Coarseness']: '0.012',
      [t.busyness || 'Busyness']: '0.87',
      [t.strength || 'Strength']: '29.4'
    },
    [t.ngtdm || 'NGTDM']: {
      [t.maximum3DDiameter || 'Maximum 3D diameter (mm)']: '34.6',
      [t.standardDeviation || '표준편차 (AU)']: '98.1',
      [t.skewness || 'Skewness']: '0.42',
      [t.kurtosis || 'Kurtosis']: '2.97'
    }
  });
  };
  
  const featureData = getFeatureData();

  // 카테고리 키 매핑
  const categoryKeyMap: { [key: string]: string } = {
    [t.morphology || '형태학 (Morphology)']: 'morphology',
    [t.glcmTexture || 'GLCM (Texture)']: 'glcm',
    [t.glrlm || 'GLRLM']: 'glrlm',
    [t.glszm || 'GLSZM']: 'glszm',
    [t.ngtdm || 'NGTDM']: 'ngtdm'
  };

  // 활성화된 항목과 비활성화된 항목을 분리
  const getActiveAndDisabledFeatures = () => {
    const activeFeatures: FeatureData = {};
    const disabledFeatures: FeatureData = {};
    
    Object.entries(featureData).forEach(([category, features]) => {
      const categoryKey = categoryKeyMap[category];
      const activeFeaturesList: { [key: string]: string | number } = {};
      const disabledFeaturesList: { [key: string]: string | number } = {};
      
      Object.entries(features).forEach(([feature, value]) => {
        if (isFeatureEnabled(categoryKey, feature)) {
          activeFeaturesList[feature] = value;
        } else {
          disabledFeaturesList[feature] = value;
        }
      });
      
      // 활성화된 항목이 있으면 추가
      if (Object.keys(activeFeaturesList).length > 0) {
        activeFeatures[category] = activeFeaturesList;
      }
      
      // 비활성화된 항목이 있으면 추가
      if (Object.keys(disabledFeaturesList).length > 0) {
        disabledFeatures[category] = disabledFeaturesList;
      }
    });
    
    return { activeFeatures, disabledFeatures };
  };
  
  const { activeFeatures, disabledFeatures } = getActiveAndDisabledFeatures();
  const hasDisabledFeatures = Object.keys(disabledFeatures).length > 0;

  // Feature 항목 렌더링 컴포넌트
  const FeatureItem = ({ 
    feature, 
    value, 
    categoryKey, 
    isEnabled, 
    showToggle = true 
  }: { 
    feature: string; 
    value: string | number; 
    categoryKey: string; 
    isEnabled: boolean; 
    showToggle?: boolean;
  }) => (
    <div className="flex items-center justify-between text-xs border-b border-gray-600 pb-2">
      <div className="flex items-center flex-1">
        <div className="flex items-center justify-between w-full">
          <span className={`flex-1 pr-2 truncate transition-opacity ${
            isEnabled ? 'text-gray-300' : 'text-gray-500 opacity-50'
          }`} title={feature}>
            {feature}
          </span>
          <span className={`font-mono text-right font-medium mr-3 transition-opacity ${
            isEnabled ? 'text-white' : 'text-gray-500 opacity-50'
          }`}>
            {isEnabled ? value : '---'}
          </span>
        </div>
      </div>
      {showToggle && (
        <button
          onClick={() => handleFeatureToggle(categoryKey, feature)}
          className={`relative inline-flex h-3 w-5 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-gray-800 ${
            isEnabled ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${
              isEnabled ? 'translate-x-2.5' : 'translate-x-0.5'
            }`}
          />
        </button>
      )}
    </div>
  );

  return (
    <div className="bg-gray-800 rounded-lg p-4 h-full flex flex-col overflow-y-auto">
      <h3 className="text-white text-sm font-medium mb-2 text-center">
        {t.featureAnalysis || 'Feature Analysis'}
      </h3>
      
      {/* 활성화된 항목들 */}
      <div className="space-y-4">
        {Object.entries(activeFeatures).map(([category, features]) => {
          const categoryKey = categoryKeyMap[category];
          return (
            <div key={category} className="bg-gray-750 rounded-lg p-3">
              <h4 className="text-blue-400 text-xs font-semibold mb-3 bg-gray-700 px-3 py-1 rounded">
                {category}
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(features).map(([feature, value]) => (
                  <FeatureItem
                    key={feature}
                    feature={feature}
                    value={value}
                    categoryKey={categoryKey}
                    isEnabled={true}
                    showToggle={true}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* 비활성화된 항목들 박스 */}
      {hasDisabledFeatures && (
        <div className="mt-4">
          <div className="bg-gray-700/20 border border-gray-600/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-gray-400 text-xs font-semibold flex items-center gap-2">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 715.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 818.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd"/>
                </svg>
{t.disabledFeatures || '비활성화된 Features'}
              </h4>
              <button
                onClick={() => setShowDisabledFeatures(!showDisabledFeatures)}
                className="text-gray-400 hover:text-gray-300 transition-colors"
              >
                <svg 
                  className={`w-4 h-4 transform transition-transform ${showDisabledFeatures ? 'rotate-180' : ''}`} 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </button>
            </div>
            
            {showDisabledFeatures && (
              <div className="space-y-3">
                {Object.entries(disabledFeatures).map(([category, features]) => {
                  const categoryKey = categoryKeyMap[category];
                  return (
                    <div key={`disabled-${category}`} className="bg-gray-800/50 rounded-lg p-2">
                      <h5 className="text-gray-300 text-xs font-medium mb-2 px-2 py-1 bg-gray-700/30 rounded">
                        {category}
                      </h5>
                      <div className="grid grid-cols-1 gap-1">
                        {Object.entries(features).map(([feature, value]) => (
                          <FeatureItem
                            key={`disabled-${feature}`}
                            feature={feature}
                            value={value}
                            categoryKey={categoryKey}
                            isEnabled={false}
                            showToggle={true}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 
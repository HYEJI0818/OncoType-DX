'use client';

import { useState } from 'react';

interface OncoTypePredictionProps {
  className?: string;
}

export default function OncoTypePrediction({ className = '' }: OncoTypePredictionProps) {
  const [score] = useState(42); // 예시 점수
  const [confidence] = useState(87); // 신뢰도

  // 위험도 계산
  const getRiskLevel = (score: number) => {
    if (score < 25) return { level: '저위험', color: 'text-green-400', bgColor: 'bg-green-900/20' };
    if (score <= 50) return { level: '중간', color: 'text-yellow-400', bgColor: 'bg-yellow-900/20' };
    return { level: '고위험', color: 'text-red-400', bgColor: 'bg-red-900/20' };
  };

  const risk = getRiskLevel(score);

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      {/* 헤더 */}
      <div className="bg-gray-700 text-white text-center py-2 rounded-t-lg mb-4 -mx-4 -mt-4">
        <h3 className="text-lg font-semibold">OncoType DX 예측 결과</h3>
      </div>

      {/* 메인 점수 */}
      <div className="text-center mb-6">
        <div className="text-6xl font-bold text-white mb-2">{score}점</div>
        <div className="text-gray-400 text-sm">(중간위험군)</div>
      </div>

      {/* 위험도 구간 */}
      <div className="mb-4">
        <div className="text-center text-sm text-gray-300 mb-2">
          저위험 ≤25 | 중간 26-50 | 고위험 ≥51
        </div>
        <div className="text-center text-sm text-gray-400">
          신뢰도: {confidence}%
        </div>
      </div>

      {/* 출처 */}
      <div className="text-xs text-gray-500 text-center">
        출처: OncoType DX 검사 실시 권고
      </div>
    </div>
  );
}

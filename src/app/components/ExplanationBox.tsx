export default function ExplanationBox() {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-white text-sm font-semibold mb-3 border-b border-gray-700 pb-2">
        AI 진단 결과 및 해석
      </h3>
      
      <div className="space-y-3">
        {/* 진단 결과 */}
        <div className="bg-gray-750 rounded-lg p-3">
          <h4 className="text-blue-400 text-xs font-semibold mb-2">진단 예측</h4>
          <div className="text-gray-300 text-sm leading-relaxed">
            예측 결과 상 <span className="text-green-400 font-semibold">양성 종양 가능성이 78%</span>로 가장 높으며, 
            악성<span className="text-red-400">(12%)</span> 및 전이성<span className="text-yellow-400">(6%)</span>의 
            추가 위험을 고려하더라도 비교적 안정적인 소견으로 판별됩니다.
          </div>
        </div>

        {/* 신뢰도 정보 */}
        <div className="bg-gray-750 rounded-lg p-3">
          <h4 className="text-green-400 text-xs font-semibold mb-2">모델 성능</h4>
          <div className="text-gray-300 text-sm leading-relaxed">
            <span className="text-green-400 font-semibold">87%</span>의 진단 정확도를 가지며, 
            전 케이스의 세그멘테이션 Dice 계수 <span className="text-blue-400 font-semibold">0.93</span>으로 
            정량적으로 우수한 정도를 보장하는 분류 범위입니다.
          </div>
        </div>

        {/* 권장사항 */}
        <div className="bg-gray-750 rounded-lg p-3">
          <h4 className="text-yellow-400 text-xs font-semibold mb-2">권장 사항</h4>
          <div className="text-gray-300 text-sm leading-relaxed">
            • 정기적인 추적 검사 권장 (3-6개월 간격)<br/>
            • 임상 소견과 종합적 판단 필요<br/>
            • 필요시 조영제 검사 고려
          </div>
        </div>
      </div>
    </div>
  );
} 
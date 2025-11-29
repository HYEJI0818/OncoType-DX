'use client';

import { useState } from 'react';

interface XAIExplanationPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function XAIExplanationPopup({ isOpen, onClose }: XAIExplanationPopupProps) {
  const [activeTab, setActiveTab] = useState<'whatif' | 'analysis'>('analysis');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
      <div className="bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto shadow-2xl border border-gray-600">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">XAI 설명 - 설명 가능한 인공지능</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'analysis'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            XAI 설명 화면 - AI 판단 근거 (의사용)
          </button>
          <button
            onClick={() => setActiveTab('whatif')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'whatif'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            What-If 시뮬레이션 (참고용)
          </button>
        </div>

        {/* 탭 내용 */}
        <div className="p-6">
          {activeTab === 'analysis' ? (
            // AI 판단 근거 내용
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 왼쪽: 종양 세그멘테이션 */}
              <div className="bg-gray-700 rounded-lg p-6">
                <div className="bg-gray-600 text-center py-3 mb-4 rounded-lg">
                  <h3 className="text-white font-medium">종양 세그멘테이션</h3>
                  <div className="text-sm text-gray-300">[종양 영역 표시]</div>
                  <div className="text-sm text-blue-300">Axial View</div>
                </div>
                
                {/* 가상의 MRI 이미지 영역 */}
                <div className="bg-black rounded-lg aspect-square flex items-center justify-center mb-4">
                  <div className="text-gray-500 text-center">
                    <div className="text-sm">MRI 이미지</div>
                    <div className="text-xs">(종양 영역 하이라이트)</div>
                  </div>
                </div>

                {/* 피처 기여도 분석 */}
                <div className="bg-gray-600 rounded-lg p-4">
                  <div className="text-sm font-medium text-white mb-3">피처 기여도 분석 (ODX 점수 예측에 미친 영향)</div>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-white">조영증강 불균일도</span>
                      <span className="text-red-400 font-bold">+18%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1">
                      <div className="bg-red-500 h-1 rounded-full" style={{ width: '18%' }}></div>
                    </div>
                    <div className="text-gray-400 text-xs">종양 내부 인질성이 증가했습니다.</div>
                    <div className="text-gray-400 text-xs">→ 재발 위험도 상승 요인</div>
                    <div className="text-gray-400 text-xs">참조: ASCO Biomarker Guidelines 2023</div>

                    <div className="flex justify-between items-center mt-3">
                      <span className="text-white">종양 경계 불규칙성</span>
                      <span className="text-red-400 font-bold">+12%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1">
                      <div className="bg-red-500 h-1 rounded-full" style={{ width: '12%' }}></div>
                    </div>
                    <div className="text-gray-400 text-xs">침습적 악성 패턴을 보입니다.</div>
                    <div className="text-gray-400 text-xs">→ HER2 음성, 높은 증식률과 연관</div>
                    <div className="text-gray-400 text-xs">참조: Radiology 2023;308:e221234</div>

                    <div className="flex justify-between items-center mt-3">
                      <span className="text-white">DCE 관류 패턴에서 빠른 washout 현상</span>
                      <span className="text-red-400 font-bold">+6%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1">
                      <div className="bg-red-500 h-1 rounded-full" style={{ width: '6%' }}></div>
                    </div>
                    <div className="text-gray-400 text-xs">미세혈관 증가와 관련됩니다.</div>
                    <div className="text-gray-400 text-xs">→ 종양 증식 활성도 증가</div>
                    <div className="text-gray-400 text-xs">참조: ESMO Breast Cancer Guidelines</div>
                  </div>
                </div>
              </div>

              {/* 오른쪽: AI 판단 요약 */}
              <div className="bg-gray-700 rounded-lg p-6">
                <div className="bg-gray-600 text-center py-3 mb-4 rounded-lg">
                  <h3 className="text-white font-medium">AI 판단 요약</h3>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4">
                    <div className="text-blue-300 font-medium mb-2">이 환자의 MRI 영상에서 추출된 Radiomics 특징들은</div>
                    <div className="text-white text-sm">중간위험군 (ODX 26-50점)과 78% 유사합니다.</div>
                    <div className="text-gray-300 text-xs mt-2">주요 근거 (상위 3개)</div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="bg-red-900/20 border border-red-600 rounded-lg p-3">
                      <div className="text-red-300 font-medium">1. 조영증강 패턴 불균일도 (+18%)</div>
                      <div className="text-gray-300 text-xs mt-1">종양 내부 인질성이 증가했습니다.</div>
                      <div className="text-gray-300 text-xs">→ 재발 위험도 상승 요인</div>
                      <div className="text-gray-300 text-xs">참조: ASCO Biomarker Guidelines 2023</div>
                    </div>

                    <div className="bg-red-900/20 border border-red-600 rounded-lg p-3">
                      <div className="text-red-300 font-medium">2. 종양 경계 불규칙성 (+12%)</div>
                      <div className="text-gray-300 text-xs mt-1">침습적 악성 패턴을 보입니다.</div>
                      <div className="text-gray-300 text-xs">→ HER2 음성, 높은 증식률과 연관</div>
                      <div className="text-gray-300 text-xs">참조: Radiology 2023;308:e221234</div>
                    </div>

                    <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-3">
                      <div className="text-yellow-300 font-medium">3. DCE 관류 패턴에서 빠른 washout 현상 (+6%)</div>
                      <div className="text-gray-300 text-xs mt-1">미세혈관 증가와 관련됩니다.</div>
                      <div className="text-gray-300 text-xs">→ 종양 증식 활성도 증가</div>
                      <div className="text-gray-300 text-xs">참조: ESMO Breast Cancer Guidelines</div>
                    </div>
                  </div>

                  <div className="bg-gray-600 rounded-lg p-4">
                    <div className="text-white font-medium mb-2">임상적 해석</div>
                    <div className="text-gray-300 text-sm space-y-1">
                      <div>예상 범위: ER+ / PR+ / HER2-, Ki-67 증등도 (20-30%)</div>
                      <div>권고: 항암화학요법 고려 필요, OncoType DX 검사 권장</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // What-If 시뮬레이션 내용
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 왼쪽: 현재 예측 결과 */}
              <div className="bg-gray-700 rounded-lg p-6">
                <div className="bg-gray-600 text-center py-3 mb-4 rounded-lg">
                  <h3 className="text-white font-medium">현재 예측 결과</h3>
                </div>
                
                <div className="text-center mb-6 pb-4 border-b border-gray-500">
                  <div className="text-6xl font-bold text-white mb-2">42점</div>
                  <div className="text-lg text-gray-300">(중간위험군)</div>
                </div>

                <div className="space-y-4 text-sm text-white">
                  <div className="font-medium mb-3">주요 위험 요인</div>
                  
                  <div className="space-y-4">
                    {/* 1. 조영증강 불균일도 */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span>• 조영증강 불균일도</span>
                        <div className="text-right">
                          <div className="text-red-400 font-bold">0.78</div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-1 mb-1">
                        <div className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-1 rounded-full relative">
                          <div className="absolute top-0 w-0.5 h-1 bg-white rounded-full" style={{ left: '75%' }}></div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">(정상범위: 0.45-0.65)</div>
                    </div>
                    
                    {/* 2. 종양 경계 불규칙성 */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span>• 종양 경계 불규칙성</span>
                        <div className="text-right">
                          <div className="text-red-400 font-bold">1.92</div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-1 mb-1">
                        <div className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-1 rounded-full relative">
                          <div className="absolute top-0 w-0.5 h-1 bg-white rounded-full" style={{ left: '85%' }}></div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">(정상범위: 1.20-1.50)</div>
                    </div>
                    
                    {/* 3. 종양 크기 */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span>• 종양 크기</span>
                        <div className="text-right">
                          <div className="text-red-400 font-bold">3.2 cm³</div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-1 mb-1">
                        <div className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-1 rounded-full relative">
                          <div className="absolute top-0 w-0.5 h-1 bg-white rounded-full" style={{ left: '90%' }}></div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">(기준: &lt;2.0 cm³)</div>
                    </div>
                    
                    {/* 4. 텍스처 이질성 */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span>• 텍스처 이질성</span>
                        <div className="text-right">
                          <div className="text-red-400 font-bold">2.34</div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-1 mb-1">
                        <div className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-1 rounded-full relative">
                          <div className="absolute top-0 w-0.5 h-1 bg-white rounded-full" style={{ left: '80%' }}></div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">(정상범위: 1.80-2.10)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 오른쪽: What-If 가상 시나리오 분석 */}
              <div className="bg-gray-700 rounded-lg p-6">
                <div className="bg-gray-600 text-center py-3 mb-4 rounded-lg">
                  <h3 className="text-white font-medium">What-If 가상 시나리오 분석</h3>
                </div>

                <div className="space-y-4 text-sm text-white">
                  <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4">
                    <div className="font-medium text-blue-300 mb-2">시나리오 1: 종양 크기가 1cm 작다면</div>
                    <div className="text-white">현재: 3.2 cm³ → 가정: 2.2 cm³</div>
                    <div className="text-green-400">예상 ODX 점수: 38점 (약 -4점 감소)</div>
                    <div className="text-xs text-gray-300 mt-1">결과: 여전히 중간위험군</div>
                  </div>

                  <div className="bg-green-900/30 border border-green-500 rounded-lg p-4">
                    <div className="font-medium text-green-300 mb-2">시나리오 2: 조영 불균일도가 정상 범위라면</div>
                    <div className="text-white">현재: 0.78 → 가정: 0.55 (정상)</div>
                    <div className="text-green-400">예상 ODX 점수: 32점 (약 -10점 감소)</div>
                    <div className="text-xs text-gray-300 mt-1">결과: 중간위험군 하한</div>
                  </div>

                  <div className="bg-yellow-900/30 border border-yellow-500 rounded-lg p-4">
                    <div className="font-medium text-yellow-300 mb-2">시나리오 3: 두 요인 모두 개선된다면</div>
                    <div className="text-white">종양 크기 2.2 cm³ + 조영 불균일도 0.55</div>
                    <div className="text-green-400">예상 ODX 점수: 24점 (약 -18점 감소)</div>
                    <div className="text-xs text-gray-300 mt-1">결과: 저위험군 전환 가능!</div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <div className="text-yellow-500 mt-0.5">⚠</div>
                    <div className="text-xs text-yellow-200">
                      <div className="font-medium mb-1">주의: 이는 예측 모델 기반 가상 시뮬레이션이며, 실제 치료 효과를 보장하지 않습니다.</div>
                      <div>최종 치료 판단은 담당 의사와 충분한 상담을 통해 결정하시기 바랍니다.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-end p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

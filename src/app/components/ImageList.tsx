import Image from 'next/image';
import { useState, useEffect } from 'react';

// 슬라이더 CSS 스타일
const sliderStyle = `
  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ffffff;
    border: 2px solid #3b82f6;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  
  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ffffff;
    border: 2px solid #3b82f6;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
`;

interface ImageListProps {
  selectedIndex?: number;
  onImageSelect?: (index: number) => void;
  uploadedImages?: string[];
  sessionId?: string; // 세션 ID 추가
}

export default function ImageList({ selectedIndex = 0, onImageSelect, uploadedImages = [], sessionId }: ImageListProps) {
  const [availableSequences, setAvailableSequences] = useState<any[]>([]);
  
  // 업로드된 파일들을 확인하여 사용 가능한 시퀀스 목록 생성
  useEffect(() => {
    const checkAvailableFiles = async () => {
      if (!sessionId) return;
      
      // 실제 세션 ID를 UUID로 매핑 (현재는 session_test_123 -> 19824666-8e5d-4c05-8ce9-336e82132d93)
      const actualSessionId = sessionId === 'session_test_123' ? '19824666-8e5d-4c05-8ce9-336e82132d93' : sessionId;
      
      const sequences = [
        { 
          id: 1, 
          filename: 'T1_BraTS-GLI-01532-000-t1n.nii.gz',
          label: '3D',
          description: 'T1-weighted 3D view',
          sequenceType: 'T1'
        },
        { 
          id: 2, 
          filename: 'T1CE_BraTS-GLI-01532-000-t1c.nii.gz',
          label: 'Axial',
          description: 'T1CE Axial view',
          sequenceType: 'T1CE'
        },
        { 
          id: 3, 
          filename: 'T2_BraTS-GLI-01532-000-t2w.nii.gz',
          label: 'Coronal',
          description: 'T2-weighted Coronal view',
          sequenceType: 'T2'
        },
        { 
          id: 4, 
          filename: 'FLAIR_BraTS-GLI-01532-000-t2f.nii.gz',
          label: 'Sagittal',
          description: 'FLAIR Sagittal view',
          sequenceType: 'FLAIR'
        },
      ];
      
      // 각 파일이 존재하는지 확인
      const checkedSequences = await Promise.all(
        sequences.map(async (seq) => {
          try {
            const response = await fetch(`/uploads/${actualSessionId}/${seq.filename}`, { method: 'HEAD' });
            return {
              ...seq,
              exists: response.ok,
              src: response.ok ? `/uploads/${actualSessionId}/${seq.filename}` : null
            };
          } catch (error) {
            return {
              ...seq,
              exists: false,
              src: null
            };
          }
        })
      );
      
      setAvailableSequences(checkedSequences);
    };
    
    checkAvailableFiles();
  }, [sessionId]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: sliderStyle }} />
      <div className="bg-gray-800 p-3 sm:p-4 rounded-lg">
        <h3 className="text-white text-xs sm:text-sm font-medium mb-3 sm:mb-4">MRI LIST</h3>
      
      
      {/* Mobile: Horizontal scroll */}
      <div className="lg:hidden">
        <div className="flex space-x-3 overflow-x-auto pb-2">
          {availableSequences.map((sequence, index) => (
            <div
              key={sequence.id}
              className={`
                flex-shrink-0 relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden cursor-pointer border-2 transition-all group
                ${selectedIndex === index 
                  ? 'border-blue-400 ring-2 ring-blue-400/50' 
                  : 'border-gray-600 hover:border-gray-500'
                }
              `}
              onClick={() => onImageSelect?.(index)}
              title={`${sequence.label}: ${sequence.description}`}
            >
              {/* MRI 시퀀스 라벨 */}
              <div className="absolute top-0 left-0 bg-black/70 text-white text-[8px] sm:text-[10px] px-1 py-0.5 rounded-br-md font-medium z-10">
                {sequence.label}
              </div>
              
              {/* 파일 존재 여부에 따른 표시 */}
              {sequence.exists && sequence.src ? (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <div className="text-white text-[8px] sm:text-[10px] font-medium text-center">
                    <div>{sequence.sequenceType}</div>
                    <div className="text-[6px] sm:text-[8px] text-green-400 mt-1">사용 가능</div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full bg-gray-800 flex flex-col items-center justify-center">
                  <div className="text-gray-400 text-[8px] sm:text-[10px] font-medium text-center">
                    <div>{sequence.sequenceType}</div>
                    <div className="text-[6px] sm:text-[8px] text-red-400 mt-1">파일 없음</div>
                  </div>
                </div>
              )}
              
              {/* 호버 시 설명 툴팁 */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-[7px] sm:text-[8px] p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {sequence.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Vertical layout */}
      <div className="hidden lg:block">
        <div className="space-y-3">
          {availableSequences.map((sequence, index) => (
            <div
              key={sequence.id}
              className={`
                relative w-16 h-16 rounded-lg overflow-hidden cursor-pointer border-2 transition-all group
                ${selectedIndex === index 
                  ? 'border-blue-400 ring-2 ring-blue-400/50' 
                  : 'border-gray-600 hover:border-gray-500'
                }
              `}
              onClick={() => onImageSelect?.(index)}
              title={`${sequence.label}: ${sequence.description}`}
            >
              {/* MRI 시퀀스 라벨 */}
              <div className="absolute top-0 left-0 bg-black/70 text-white text-[10px] px-1.5 py-1 rounded-br-md font-medium z-10">
                {sequence.label}
              </div>
              
              {/* 파일 존재 여부에 따른 표시 */}
              {sequence.exists && sequence.src ? (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <div className="text-white text-[10px] font-medium text-center">
                    <div>{sequence.sequenceType}</div>
                    <div className="text-[8px] text-green-400 mt-1">사용 가능</div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full bg-gray-800 flex flex-col items-center justify-center">
                  <div className="text-gray-400 text-[10px] font-medium text-center">
                    <div>{sequence.sequenceType}</div>
                    <div className="text-[8px] text-red-400 mt-1">파일 없음</div>
                  </div>
                </div>
              )}
              
              {/* 호버 시 설명 툴팁 */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-[8px] p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {sequence.description}
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </>
  );
} 
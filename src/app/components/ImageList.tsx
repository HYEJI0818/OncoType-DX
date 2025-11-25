import Image from 'next/image';
// import { useState } from 'react';

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
}

export default function ImageList({ selectedIndex = 0, onImageSelect, uploadedImages = [] }: ImageListProps) {
  // 슬라이스 및 윈도우 레벨 상태 (현재 사용하지 않음)
  // const [slice, setSlice] = useState(54);
  // const [windowWidth, setWindowWidth] = useState(138);
  // const [windowLevel, setWindowLevel] = useState(114);
  // CT 시퀀스별 이미지 - 모두 Axial View로 통일 (슬라이스 100번 사용)
  const ctSequences = [
    { 
      id: 1, 
      src: '/ct/T1N/axial/100.png', 
      alt: 'T1 Axial View',
      label: 'T1',
      description: '해부학적 구조 (물 어둡고, 지방 밝음)'
    },
    { 
      id: 2, 
      src: '/ct/T1C/axial/100.png', 
      alt: 'T1CE Axial View',
      label: 'T1CE',
      description: '조영제 주입 후 병변 강조'
    },
    { 
      id: 3, 
      src: '/ct/T2/axial/100.png', 
      alt: 'T2 Axial View',
      label: 'T2',
      description: '물 많은 부위 밝게 (부종 잘 보임)'
    },
    { 
      id: 4, 
      src: '/ct/FLAIR/axial/100.png', 
      alt: 'FLAIR Axial View',
      label: 'FLAIR',
      description: '뇌실 주변 병변 선명하게'
    },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: sliderStyle }} />
      <div className="bg-gray-800 p-3 sm:p-4 rounded-lg">
        <h3 className="text-white text-xs sm:text-sm font-medium mb-3 sm:mb-4">Image List</h3>
      
      
      {/* Mobile: Horizontal scroll */}
      <div className="lg:hidden">
        <div className="flex space-x-3 overflow-x-auto pb-2">
          {ctSequences.map((sequence, index) => (
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
              {/* CT 시퀀스 라벨 */}
              <div className="absolute top-0 left-0 bg-black/70 text-white text-[8px] sm:text-[10px] px-1 py-0.5 rounded-br-md font-medium z-10">
                {sequence.label}
              </div>
              
              {/* 실제 CT 이미지 */}
              <Image
                src={sequence.src}
                alt={sequence.alt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 64px, 64px"
                onError={(e) => {
                  // 이미지 로드 실패 시 fallback
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="w-full h-full bg-gray-700 flex flex-col items-center justify-center">
                        <div class="text-white text-[8px] sm:text-[10px] font-medium">${sequence.label}</div>
                        <div class="w-6 h-6 sm:w-8 sm:h-8 bg-gray-600 rounded-full mt-1"></div>
                      </div>
                    `;
                  }
                }}
              />
              
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
          {ctSequences.map((sequence, index) => (
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
              {/* CT 시퀀스 라벨 */}
              <div className="absolute top-0 left-0 bg-black/70 text-white text-[10px] px-1.5 py-1 rounded-br-md font-medium z-10">
                {sequence.label}
              </div>
              
              {/* 실제 CT 이미지 */}
              <Image
                src={sequence.src}
                alt={sequence.alt}
                fill
                className="object-cover"
                sizes="64px"
                onError={(e) => {
                  // 이미지 로드 실패 시 fallback
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="w-full h-full bg-gray-700 flex flex-col items-center justify-center">
                        <div class="text-white text-[10px] font-medium">${sequence.label}</div>
                        <div class="w-8 h-8 bg-gray-600 rounded-full mt-1"></div>
                      </div>
                    `;
                  }
                }}
              />
              
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
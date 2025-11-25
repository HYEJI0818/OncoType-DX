'use client';

import { useState } from 'react';
import { useTranslation } from '@/contexts/EnhancedTranslationContext';

export default function FilterPanel() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    chartNumber: '',
    patientName: '',
    department: t.allDepartments || '전체'
  });

  const departments = [
    { value: '전체', label: t.allDepartments || '전체' },
    { value: '신경외과', label: t.neurosurgery || '신경외과' },
    { value: '신경과', label: t.neurology || '신경과' },
    { value: '영상의학과', label: t.radiology || '영상의학과' },
    { value: '내과', label: t.internalMedicine || '내과' },
    { value: '외과', label: t.surgery || '외과' }
  ];

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSearch = () => {
    console.log('검색 필터:', filters);
    // 여기에 검색 로직 구현
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4">
      {/* 조회조건 */}
      <div className="flex items-center">
        <span className="text-gray-300 text-sm font-medium min-w-[60px] mr-3 text-right">조회 조건</span>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="차트번호"
            value={filters.chartNumber}
            onChange={(e) => handleFilterChange('chartNumber', e.target.value)}
            className="bg-gray-700 text-white text-sm font-normal rounded px-3 py-2 border border-gray-600 focus:border-blue-400 focus:outline-none placeholder-gray-500 h-9 flex-1 text-center"
          />
          
          <input
            type="text"
            placeholder="성명"
            value={filters.patientName}
            onChange={(e) => handleFilterChange('patientName', e.target.value)}
            className="bg-gray-700 text-white text-sm font-normal rounded px-3 py-2 border border-gray-600 focus:border-blue-400 focus:outline-none placeholder-gray-500 h-9 flex-1 text-center"
          />
          
          <select 
            value={filters.department}
            onChange={(e) => handleFilterChange('department', e.target.value)}
            className="bg-gray-700 text-white text-sm font-normal rounded px-3 py-2 border border-gray-600 focus:border-blue-400 focus:outline-none h-9 text-center flex-1"
          >
            {departments.map((dept) => (
              <option key={dept.value} value={dept.value}>
                {dept.value === '전체' ? `${t.department || '진료과'} - ${dept.label}` : dept.label}
              </option>
            ))}
          </select>

          
          <button
            onClick={handleSearch}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded transition-colors h-9 min-w-[60px]"
          >
            조회
          </button>
        </div>
      </div>
    </div>
  );
} 
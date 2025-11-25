'use client';

import Image from 'next/image';
import { useTranslation } from '@/contexts/EnhancedTranslationContext';
import { useAuth } from '@/contexts/AuthContext';

interface Patient {
  id: number;
  examDate: string;
  chartNumber: string;
  labelNumber: string;
  name: string;
  gender: string;
  age: number;
  diagnosis: string;
  description: string;
  department: string;
  status: 'normal' | 'urgent';
}

interface DashboardHeaderProps {
  patients?: Patient[];
}

export default function DashboardHeader({ patients = [] }: DashboardHeaderProps) {
  const { t } = useTranslation();
  const { logout, userType } = useAuth();
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-3 sm:mb-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-white text-xl sm:text-2xl font-bold flex items-center gap-3">
            <Image 
              src="/silla-mark.png" 
              alt="로고" 
              width={32}
              height={32}
              className="h-6 sm:h-8 w-auto"
            />
            {t.dashboardTitle}
          </h1>
        </div>
        
        {/* 오른쪽 정렬: 로그아웃 버튼 */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center space-x-4">
            <button
              onClick={logout}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-gray-200 rounded text-sm transition-colors duration-200"
            >
              {t.logout}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
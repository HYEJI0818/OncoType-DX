'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import MainDashboard from '../components/MainDashboard';

export default function DashboardPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 개발 환경에서는 인증 체크 우회
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 개발 환경 - 인증 체크 우회, 대시보드 표시');
      return;
    }
    
    // 로딩이 완료되고 인증되지 않은 경우에만 로그인으로 리다이렉트
    if (!loading && !isAuthenticated && !user) {
      console.log('🔄 인증되지 않음 - 로그인 페이지로 리다이렉트');
      router.push('/login');
    } else if (!loading && (isAuthenticated || user)) {
      console.log('✅ 인증 확인됨 - 대시보드 표시');
    }
  }, [user, loading, isAuthenticated, router]);

  // 로딩 중이면 로딩 화면 표시
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">로딩 중...</div>
      </div>
    );
  }

  // 개발 환경에서는 인증 체크 우회
  if (process.env.NODE_ENV === 'development') {
    return <MainDashboard />;
  }

  // 인증되지 않은 경우 null 반환 (리다이렉트 처리 중)
  if (!isAuthenticated && !user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">인증 확인 중...</div>
      </div>
    );
  }

  // 인증된 경우 대시보드 표시
  return <MainDashboard />;
}

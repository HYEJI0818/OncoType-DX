'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AdminDashboard from '../components/AdminDashboard';

export default function AdminPage() {
  const { isAuthenticated, userType } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 로그인하지 않았거나 관리자가 아닌 경우 메인 페이지로 리다이렉트
    if (!isAuthenticated || userType !== 'admin') {
      router.push('/');
    }
  }, [isAuthenticated, userType, router]);

  // 관리자가 아닌 경우 로딩 표시
  if (!isAuthenticated || userType !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">관리자 권한을 확인하는 중...</div>
      </div>
    );
  }

  return <AdminDashboard />;
}

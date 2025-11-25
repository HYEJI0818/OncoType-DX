'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isRefreshTokenError, forceSignOut } from '@/lib/auth-utils';

interface AuthErrorBoundaryProps {
  children: React.ReactNode;
}

export function AuthErrorBoundary({ children }: AuthErrorBoundaryProps) {
  const { logout } = useAuth();

  useEffect(() => {
    // 전역 오류 처리기
    const handleGlobalError = async (event: ErrorEvent) => {
      const error = event.error;
      
      if (isRefreshTokenError(error)) {
        console.warn('전역 refresh token 오류 감지');
        await forceSignOut();
        logout();
        
        // 로그인 페이지로 리다이렉트
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    };

    // Promise rejection 처리기
    const handleUnhandledRejection = async (event: PromiseRejectionEvent) => {
      const error = event.reason;
      
      if (isRefreshTokenError(error)) {
        console.warn('전역 Promise rejection에서 refresh token 오류 감지');
        await forceSignOut();
        logout();
        
        // 로그인 페이지로 리다이렉트
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [logout]);

  return <>{children}</>;
}

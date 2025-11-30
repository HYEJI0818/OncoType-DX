'use client';

interface AuthErrorBoundaryProps {
  children: React.ReactNode;
}

// 간단한 에러 바운더리 (Supabase 연동 제거로 더 이상 복잡한 처리 불필요)
export function AuthErrorBoundary({ children }: AuthErrorBoundaryProps) {
  return <>{children}</>;
}

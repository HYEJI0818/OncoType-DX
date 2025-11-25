'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { getSafeSession, isRefreshTokenError, forceSignOut } from '@/lib/auth-utils';

interface AuthContextType {
  isAuthenticated: boolean;
  userType: 'admin' | 'test' | null;
  user: any;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState<'admin' | 'test' | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 페이지 로드 시 로그인 상태 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { session, error } = await getSafeSession();
        
        if (error && isRefreshTokenError(error)) {
          console.warn('Refresh token 오류로 인한 로그아웃');
          setIsAuthenticated(false);
          setUser(null);
          setUserType(null);
          return;
        }
        
        if (session?.user) {
          setIsAuthenticated(true);
          setUser(session.user);
          // 사용자 역할에 따라 userType 설정
          const role = session.user.user_metadata?.role;
          setUserType(role === '관리자' ? 'admin' : 'test');
        } else {
          setIsAuthenticated(false);
          setUser(null);
          setUserType(null);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('인증 확인 중 예외 발생:', error);
        await forceSignOut();
        setIsAuthenticated(false);
        setUser(null);
        setUserType(null);
        setIsLoading(false);
      }
    };

    checkAuth();

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('인증 상태 변경:', event, session);
        
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          if (event === 'SIGNED_OUT') {
            setIsAuthenticated(false);
            setUser(null);
            setUserType(null);
          }
        }
        
        if (session?.user) {
          setIsAuthenticated(true);
          setUser(session.user);
          const role = session.user.user_metadata?.role;
          setUserType(role === '관리자' ? 'admin' : 'test');
        } else if (event !== 'TOKEN_REFRESHED') {
          setIsAuthenticated(false);
          setUser(null);
          setUserType(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // 기존 세션 정리
      await supabase.auth.signOut();
      
      // Supabase 이메일 로그인 시도
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username,
        password: password,
      });

      if (error) {
        console.error('로그인 오류:', error);
        return false;
      }

      if (data.user && data.session) {
        setIsAuthenticated(true);
        setUser(data.user);
        const role = data.user.user_metadata?.role;
        setUserType(role === '관리자' ? 'admin' : 'test');
        return true;
      }

      return false;
    } catch (error) {
      console.error('로그인 처리 중 오류:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await forceSignOut();
      setIsAuthenticated(false);
      setUserType(null);
      setUser(null);
      
      // 로그아웃 후 메인 페이지로 리다이렉트
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('로그아웃 중 오류:', error);
      // 오류가 발생해도 상태는 초기화하고 리다이렉트
      setIsAuthenticated(false);
      setUserType(null);
      setUser(null);
      
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userType, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

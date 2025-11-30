'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  userType: 'admin' | 'test' | null;
  user: any;
  loading: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setIsAuthenticated: (value: boolean) => void;
  setUser: (user: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState<'admin' | 'test' | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 페이지 로드 시 로그인 상태 확인 (로컬 스토리지에서)
  useEffect(() => {
    const checkAuth = () => {
      try {
        if (typeof window !== 'undefined') {
          const savedAuth = localStorage.getItem('auth_state');
          if (savedAuth) {
            const authData = JSON.parse(savedAuth);
            setIsAuthenticated(authData.isAuthenticated);
            setUser(authData.user);
            setUserType(authData.userType);
          }
        }
      } catch (error) {
        console.error('인증 상태 확인 중 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // 인증 상태가 변경될 때마다 로컬 스토리지에 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isAuthenticated && user) {
        localStorage.setItem('auth_state', JSON.stringify({
          isAuthenticated,
          user,
          userType
        }));
      } else {
        localStorage.removeItem('auth_state');
      }
    }
  }, [isAuthenticated, user, userType]);

  const login = async (username: string, password: string): Promise<boolean> => {
    // 하드코딩된 로그인: test / 1234만 허용
    if (username === 'test' && password === '1234') {
      setIsAuthenticated(true);
      setUser({
        id: 'test-user',
        email: 'test@oncotype.local',
        user_metadata: {
          name: '테스트 사용자',
          role: 'admin'
        }
      });
      setUserType('admin');
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserType(null);
    setUser(null);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_state');
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      userType, 
      user, 
      loading: isLoading,
      isLoading, 
      login, 
      logout,
      setIsAuthenticated,
      setUser
    }}>
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

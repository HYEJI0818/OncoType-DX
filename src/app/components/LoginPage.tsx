'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setIsAuthenticated, setUser } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 하드코딩된 로그인: test / 1234 만 허용
      if (username === 'test' && password === '1234') {
        console.log('✅ 로그인 성공 - test 사용자');
        
        // 로그인 성공 처리
        setIsAuthenticated(true);
        setUser({
          id: 'test-user',
          email: 'test@oncotype.local',
          user_metadata: {
            name: '테스트 사용자',
            role: 'admin'
          }
        });
        
        // 업로드 페이지로 이동
        router.push('/upload');
      } else {
        // 로그인 실패
        setError('아이디 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* 신라시스템 로고 */}
      <div className="absolute top-0 left-6 z-20">
        <Image
          src="/silla-full.png"
          alt="SILLA SYSTEM"
          width={200}
          height={60}
          className="drop-shadow-2xl"
          style={{
            filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.8)) drop-shadow(0 0 10px rgba(255,255,255,0.3))'
          }}
        />
      </div>

      {/* MRI 격자 효과 */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(59, 130, 246, 0.4) 1px, transparent 1px),
            linear-gradient(0deg, rgba(59, 130, 246, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      {/* 메인 로그인 컨테이너 */}
      <div className="relative z-10 w-full max-w-md">
        {/* 글래스모피즘 로그인 폼 */}
        <div className="backdrop-blur-xl rounded-3xl border-2 border-white/20 p-8 shadow-2xl bg-white/5 relative overflow-hidden">
          {/* 폼 내부 글로우 효과 */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-transparent to-purple-400/10 rounded-3xl"></div>
          
          <div className="relative z-10 text-center mb-8">
            <h2 className="text-4xl font-bold text-white mb-2" 
                style={{
                  textShadow: '2px 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(255,255,255,0.3), 0 0 30px rgba(59, 130, 246, 0.5)'
                }}>
              회원 로그인
            </h2>
            <p className="text-gray-100 text-lg font-medium"
               style={{textShadow: '1px 1px 4px rgba(0,0,0,0.8)'}}>
              OncoType DX 유방암 분석 시스템
            </p>
            <div className="mt-4 h-1 w-20 bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 rounded-full mx-auto shadow-lg shadow-blue-400/50"></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            <div>
              <label htmlFor="username" className="block text-sm font-bold text-white mb-2"
                     style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8)'}}>
                아이디
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-xl text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-300 font-medium"
                style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}
                placeholder="아이디를 입력하세요"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-white mb-2"
                     style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8)'}}>
                비밀번호
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-xl text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-300 font-medium"
                style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}
                placeholder="비밀번호를 입력하세요"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 backdrop-blur-sm border-2 border-red-400/50 rounded-xl">
                <p className="text-red-100 text-sm font-medium"
                   style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8)'}}>
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500/30 to-cyan-500/30 backdrop-blur-sm hover:from-blue-500/50 hover:to-cyan-500/50 disabled:from-gray-500/30 disabled:to-gray-500/30 text-white font-bold py-4 px-4 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 focus:ring-offset-transparent shadow-lg hover:shadow-2xl transform hover:-translate-y-1 disabled:hover:translate-y-0 border-2 border-white/30 hover:border-white/50 disabled:cursor-not-allowed"
              style={{textShadow: '2px 2px 4px rgba(0,0,0,0.8)'}}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

        </div>
      </div>

      {/* 푸터 */}
      <div className="absolute bottom-6 text-center text-gray-300 text-sm z-10">
        <p style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8)'}}>
          © 2025 SILLA SYSTEM OncoType DX Breast Cancer Analysis
        </p>
      </div>

      {/* 추가 시각 효과 - 떠다니는 파티클들 */}
      <div className="absolute top-20 left-10 w-3 h-3 bg-blue-400 rounded-full opacity-80 animate-ping"></div>
      <div className="absolute top-40 right-20 w-2 h-2 bg-cyan-400 rounded-full opacity-70 animate-pulse"></div>
      <div className="absolute bottom-32 left-16 w-2.5 h-2.5 bg-purple-400 rounded-full opacity-60 animate-ping"></div>
      <div className="absolute bottom-20 right-32 w-2 h-2 bg-blue-300 rounded-full opacity-80 animate-pulse"></div>
      <div className="absolute top-1/3 left-1/4 w-1.5 h-1.5 bg-cyan-300 rounded-full opacity-60 animate-ping"></div>
      <div className="absolute top-2/3 right-1/4 w-2 h-2 bg-blue-400 rounded-full opacity-70 animate-pulse"></div>
    </div>
  );
}

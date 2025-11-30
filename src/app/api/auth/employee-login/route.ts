import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gargpfkhcowpxfrdtkwr.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhcmdwZmtoY293cHhmcmR0a3dyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDQ2NDU4NywiZXhwIjoyMDgwMDQwNTg3fQ.swoRDX-RqRdTCC9hSNCtAjlV-bHDh-PvLRvW0BHz6mY'
);

// 사번 기반 로그인
export async function POST(request: NextRequest) {
  try {
    console.log('🔐 로그인 요청 시작...');
    
    const body = await request.json();
    console.log('📋 요청 데이터:', body);
    
    const { employeeId, password } = body;

    if (!employeeId || !password) {
      console.log('❌ 필수 데이터 누락:', { employeeId: !!employeeId, password: !!password });
      return NextResponse.json({ 
        error: '사번과 비밀번호를 입력해주세요.' 
      }, { status: 400 });
    }

    // 간단한 사번 로그인 - test 사번과 1234 비밀번호 체크
    if (employeeId === 'test' && password === '1234') {
      console.log('✅ 테스트 사번 로그인 성공');
      return NextResponse.json({
        message: '사번 검증 성공',
        user: {
          id: 'test-user-id',
          employeeId: 'test',
          name: '테스트 사용자',
          role: 'admin',
          is_employee_only: true
        },
        credentials: {
          email: 'test@naver.com',
          password: '1234'
        }
      });
    }

    // test 사번이지만 비밀번호가 틀린 경우
    if (employeeId === 'test' && password !== '1234') {
      console.log('❌ 테스트 사번 비밀번호 오류');
      return NextResponse.json({ 
        error: '비밀번호가 올바르지 않습니다.' 
      }, { status: 401 });
    }

    console.log('✅ 입력 데이터 검증 완료:', { employeeId, passwordLength: password.length });

    // 1. 사번으로 사용자 찾기 (user_metadata에서 employee_id 검색)
    const { data: users, error: searchError } = await supabase.auth.admin.listUsers();
    
    if (searchError) {
      console.error('사용자 검색 오류:', searchError);
      return NextResponse.json({ 
        error: '로그인 처리 중 오류가 발생했습니다.' 
      }, { status: 500 });
    }

    // 사번이 일치하는 사용자 찾기 (하드코딩된 test 사번 포함)
    let targetUser = users.users.find(user => 
      user.user_metadata?.employee_id === employeeId
    );

    // test 사번의 경우 test@naver.com 계정과 연결
    if (!targetUser && employeeId === 'test') {
      targetUser = users.users.find(user => 
        user.email === 'test@naver.com'
      );
    }

    if (!targetUser) {
      return NextResponse.json({ 
        error: '등록되지 않은 사번입니다.' 
      }, { status: 401 });
    }

    // 2. 사번 검증을 위해 비밀번호 확인 (서버 사이드에서 임시 로그인)
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: targetUser.email!,
      password: password
    });

    if (signInError) {
      console.error('로그인 오류:', signInError);
      return NextResponse.json({ 
        error: '사번 또는 비밀번호가 올바르지 않습니다.' 
      }, { status: 401 });
    }

    // 서버 사이드 세션 즉시 종료 (클라이언트에서 다시 로그인할 것임)
    await supabase.auth.signOut();

    // 3. 성공적인 검증 응답 - 클라이언트에서 로그인할 수 있도록 정보 전달
    return NextResponse.json({
      message: '사번 검증 성공',
      user: {
        id: targetUser.id,
        employeeId: targetUser.user_metadata?.employee_id || (employeeId === 'test' ? 'test' : null),
        name: targetUser.user_metadata?.name,
        role: targetUser.user_metadata?.role,
        is_employee_only: targetUser.user_metadata?.is_employee_only
      },
      // 클라이언트에서 로그인할 수 있도록 이메일 전달
      credentials: {
        email: targetUser.email,
        password: password
      }
    });

  } catch (error) {
    console.error('사번 로그인 중 오류:', error);
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}

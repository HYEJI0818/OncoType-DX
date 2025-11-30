import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gargpfkhcowpxfrdtkwr.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhcmdwZmtoY293cHhmcmR0a3dyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDQ2NDU4NywiZXhwIjoyMDgwMDQwNTg3fQ.swoRDX-RqRdTCC9hSNCtAjlV-bHDh-PvLRvW0BHz6mY'
);

export async function POST() {
  try {
    console.log('🔧 테스트 사용자 생성 시작...');

    // 1. 기존 사용자 확인
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('사용자 목록 조회 오류:', listError);
      return NextResponse.json({ error: '사용자 목록 조회 실패' }, { status: 500 });
    }

    const existingUser = existingUsers.users.find(user => user.email === 'test@naver.com');
    
    if (existingUser) {
      console.log('✅ 기존 테스트 사용자 발견:', existingUser.email);
      return NextResponse.json({ 
        message: '테스트 사용자가 이미 존재합니다.',
        user: {
          email: existingUser.email,
          employee_id: 'test',
          created_at: existingUser.created_at
        }
      });
    }

    // 2. 새 테스트 사용자 생성
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'test@naver.com',
      password: '1234',
      email_confirm: true,
      user_metadata: {
        employee_id: 'test',
        name: '테스트 사용자',
        role: 'admin',
        is_employee_only: true
      }
    });

    if (createError) {
      console.error('사용자 생성 오류:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    console.log('✅ 테스트 사용자 생성 완료:', newUser.user?.email);

    // 3. users 테이블에도 추가
    if (newUser.user) {
      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          id: newUser.user.id,
          email: newUser.user.email,
          name: '테스트 사용자',
          role: 'admin'
        }]);

      if (insertError) {
        console.error('users 테이블 삽입 오류:', insertError);
        // 이 오류는 무시하고 계속 진행
      }
    }

    return NextResponse.json({
      message: '테스트 사용자가 성공적으로 생성되었습니다!',
      user: {
        email: 'test@naver.com',
        employee_id: 'test',
        password: '1234',
        name: '테스트 사용자',
        role: 'admin'
      },
      instructions: {
        login_url: '/login',
        credentials: {
          사번: 'test',
          비밀번호: '1234'
        }
      }
    });

  } catch (error: any) {
    console.error('테스트 사용자 생성 실패:', error);
    return NextResponse.json({ 
      error: error.message || '알 수 없는 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}

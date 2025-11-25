import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 사용자 목록 조회
export async function GET() {
  try {
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('사용자 목록 조회 오류:', error);
      return NextResponse.json({ error: '사용자 목록을 불러올 수 없습니다.' }, { status: 500 });
    }

    // 사용자 메타데이터와 함께 반환
    const formattedUsers = users.users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split('@')[0] || '이름 없음',
      role: user.user_metadata?.role || '사용자',
      status: user.email_confirmed_at ? '승인' : '대기',
      joinDate: new Date(user.created_at).toLocaleDateString('ko-KR'),
      lastSignIn: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('ko-KR') : '로그인 기록 없음'
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('사용자 목록 조회 중 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 새 사용자 생성
export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role, employeeId, employeeOnly } = await request.json();

    // 사번만으로 가입하는 경우
    if (employeeOnly && employeeId) {
      if (!employeeId || !password || !name) {
        return NextResponse.json({ error: '사번, 비밀번호, 이름은 필수입니다.' }, { status: 400 });
      }

      // 사번 계정 비밀번호 길이 확인 (최소 4자)
      if (password.length < 4) {
        return NextResponse.json({ error: '사번 계정의 비밀번호는 최소 4자 이상이어야 합니다.' }, { status: 400 });
      }

      // 사번 중복 확인
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const duplicateEmployee = existingUsers.users.find(user => 
        user.user_metadata?.employee_id === employeeId
      );
      
      if (duplicateEmployee) {
        return NextResponse.json({ 
          error: '이미 등록된 사번입니다.' 
        }, { status: 400 });
      }

      // 더미 이메일 생성 (사번@hospital.internal)
      const dummyEmail = `${employeeId}@hospital.internal`;
      
      // 사용자 생성
      const { data: user, error } = await supabase.auth.admin.createUser({
        email: dummyEmail,
        password,
        user_metadata: {
          name: name,
          role: role || '사용자',
          employee_id: employeeId,
          is_employee_only: true, // 사번 전용 계정 표시
          display_email: null // 실제 이메일 없음을 표시
        },
        email_confirm: true
      });

      if (error) {
        console.error('사용자 생성 오류:', error);
        return NextResponse.json({ 
          error: error.message === 'User already registered' 
            ? '이미 등록된 사번입니다.' 
            : '사용자 생성에 실패했습니다.' 
        }, { status: 400 });
      }

      return NextResponse.json({ 
        message: '사번 계정이 성공적으로 생성되었습니다.',
        user: {
          id: user.user?.id,
          employeeId: employeeId,
          name: name,
          role: role || '사용자'
        }
      });
    }

    // 기존 이메일 기반 가입
    if (!email || !password) {
      return NextResponse.json({ error: '이메일과 비밀번호는 필수입니다.' }, { status: 400 });
    }

    // 이메일 계정 비밀번호 길이 확인 (최소 8자)
    if (password.length < 8) {
      return NextResponse.json({ error: '이메일 계정의 비밀번호는 최소 8자 이상이어야 합니다.' }, { status: 400 });
    }

    // 사번이 제공된 경우 중복 확인
    if (employeeId) {
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const duplicateEmployee = existingUsers.users.find(user => 
        user.user_metadata?.employee_id === employeeId
      );
      
      if (duplicateEmployee) {
        return NextResponse.json({ 
          error: '이미 등록된 사번입니다.' 
        }, { status: 400 });
      }
    }

    // 사용자 생성
    const { data: user, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name: name || email.split('@')[0],
        role: role || '사용자',
        employee_id: employeeId || null,
        is_employee_only: false,
        display_email: email
      },
      email_confirm: true // 이메일 확인을 자동으로 처리
    });

    if (error) {
      console.error('사용자 생성 오류:', error);
      return NextResponse.json({ 
        error: error.message === 'User already registered' 
          ? '이미 등록된 이메일입니다.' 
          : '사용자 생성에 실패했습니다.' 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      message: '사용자가 성공적으로 생성되었습니다.',
      user: {
        id: user.user.id,
        email: user.user.email,
        name: user.user.user_metadata?.name,
        role: user.user.user_metadata?.role
      }
    });
  } catch (error) {
    console.error('사용자 생성 중 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

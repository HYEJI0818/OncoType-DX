import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 특정 사용자 정보 조회
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const params = await context.params;
  try {
    const { data: user, error } = await supabase.auth.admin.getUserById(params.userId);
    
    if (error) {
      console.error('사용자 조회 오류:', error);
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    const formattedUser = {
      id: user.user.id,
      email: user.user.email,
      name: user.user.user_metadata?.name || user.user.email?.split('@')[0] || '이름 없음',
      role: user.user.user_metadata?.role || '사용자',
      status: user.user.email_confirmed_at ? '승인' : '대기',
      joinDate: new Date(user.user.created_at).toLocaleDateString('ko-KR'),
      lastSignIn: user.user.last_sign_in_at ? new Date(user.user.last_sign_in_at).toLocaleDateString('ko-KR') : '로그인 기록 없음'
    };

    return NextResponse.json(formattedUser);
  } catch (error) {
    console.error('사용자 조회 중 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 사용자 정보 수정
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const params = await context.params;
  try {
    const { name, role, email, password } = await request.json();

    const updateData: any = {};
    
    if (email) {
      updateData.email = email;
    }
    
    if (password) {
      // 비밀번호 길이 검증
      if (password.length < 4) {
        return NextResponse.json({ 
          error: '비밀번호는 최소 4자 이상이어야 합니다.' 
        }, { status: 400 });
      }
      updateData.password = password;
    }
    
    if (name || role) {
      updateData.user_metadata = {};
      if (name) updateData.user_metadata.name = name;
      if (role) updateData.user_metadata.role = role;
    }

    const { data: user, error } = await supabase.auth.admin.updateUserById(
      params.userId,
      updateData
    );

    if (error) {
      console.error('사용자 수정 오류:', error);
      return NextResponse.json({ error: '사용자 정보 수정에 실패했습니다.' }, { status: 400 });
    }

    return NextResponse.json({ 
      message: '사용자 정보가 성공적으로 수정되었습니다.',
      user: {
        id: user.user.id,
        email: user.user.email,
        name: user.user.user_metadata?.name,
        role: user.user.user_metadata?.role
      }
    });
  } catch (error) {
    console.error('사용자 수정 중 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 사용자 삭제
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const params = await context.params;
  try {
    const { data, error } = await supabase.auth.admin.deleteUser(params.userId);

    if (error) {
      console.error('사용자 삭제 오류:', error);
      return NextResponse.json({ error: '사용자 삭제에 실패했습니다.' }, { status: 400 });
    }

    return NextResponse.json({ 
      message: '사용자가 성공적으로 삭제되었습니다.',
      deletedUserId: params.userId
    });
  } catch (error) {
    console.error('사용자 삭제 중 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

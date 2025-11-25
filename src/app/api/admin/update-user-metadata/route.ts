import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, metadata } = await request.json();

    if (!userId || !metadata) {
      return NextResponse.json({ 
        error: '사용자 ID와 메타데이터가 필요합니다.' 
      }, { status: 400 });
    }

    // 사용자 메타데이터 업데이트
    const { data, error } = await supabase.auth.admin.updateUserById(
      userId,
      { user_metadata: metadata }
    );

    if (error) {
      console.error('사용자 메타데이터 업데이트 오류:', error);
      return NextResponse.json({ 
        error: '메타데이터 업데이트 중 오류가 발생했습니다.' 
      }, { status: 500 });
    }

    return NextResponse.json({
      message: '사용자 메타데이터가 성공적으로 업데이트되었습니다.',
      user: data.user
    });

  } catch (error) {
    console.error('메타데이터 업데이트 중 오류:', error);
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}

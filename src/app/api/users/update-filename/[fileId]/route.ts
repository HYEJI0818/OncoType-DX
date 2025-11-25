import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const params = await context.params;
    const { fileId } = params;
    const body = await request.json();
    const { fileName } = body;

    console.log(`파일 ${fileId} 이름 업데이트: ${fileName}`);

    // 관리자 권한으로 RLS 우회
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('patient_files')
      .update({
        file_name: fileName
      })
      .eq('id', fileId)
      .select();

    if (error) {
      console.error('파일명 업데이트 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`파일 ${fileId} 이름 업데이트 완료`);
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('파일명 업데이트 실패:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ patientId: string }> }
) {
  try {
    const params = await context.params;
    const { patientId } = params;
    const body = await request.json();
    const { diagnosis, description } = body;

    console.log(`환자 ${patientId} 정보 저장 시작:`, { diagnosis, description });

    // 관리자 권한으로 RLS 우회
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('patients')
      .update({
        diagnosis: diagnosis,
        description: description,
        updated_at: new Date().toISOString()
      })
      .eq('id', patientId)
      .select();

    if (error) {
      console.error('환자 정보 저장 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`환자 ${patientId} 정보 저장 완료`);
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('환자 정보 저장 실패:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

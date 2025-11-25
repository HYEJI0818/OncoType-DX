import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ patientId: string }> }
) {
  try {
    const params = await context.params;
    const { patientId } = params;
    console.log(`환자 ${patientId} 드로잉 파일 목록 조회 시작`);

    const { data: files, error } = await supabase
      .from('patient_files')
      .select('*')
      .eq('patient_id', patientId)
      .eq('file_type', 'drawing')
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('드로잉 파일 목록 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 각 파일에 프록시 URL 추가 (상대 경로 사용으로 SSL 문제 해결)
    const filesWithUrls = (files || []).map(file => {
      const proxyUrl = `/api/users/files/proxy/${encodeURIComponent(file.file_path)}`;
      
      return {
        ...file,
        public_url: proxyUrl
      };
    });

    console.log(`환자 ${patientId} 드로잉 파일 ${files?.length || 0}개 조회 완료`);
    return NextResponse.json(filesWithUrls);

  } catch (error) {
    console.error('드로잉 파일 목록 조회 실패:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

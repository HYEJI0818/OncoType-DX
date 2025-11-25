import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ patientId: string }> }
) {
  try {
    const params = await context.params;
    const { patientId } = params;
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
    }

    console.log(`🚀 환자 ${patientId} 드로잉 파일 업로드 시작:`, file.name);
    console.log('📝 API 버전: RLS 우회 버전 (파일만 저장)');

    // Supabase Storage에 파일 업로드
    const fileName = `patients/${patientId}/drawings/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('patient-files')
      .upload(fileName, file);

    if (uploadError) {
      console.error('파일 업로드 오류:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 임시 해결책: 파일만 저장하고 데이터베이스 저장은 건너뛰기
    console.log('⚠️ RLS 정책 문제로 인해 파일만 저장하고 데이터베이스 기록은 건너뜁니다.');
    console.log('📁 저장된 파일 경로:', fileName);
    
    // 성공 응답 (파일 저장만 완료)
    const fileData = {
      id: Date.now(), // 임시 ID
      patient_id: parseInt(patientId),
      file_name: file.name,
      file_path: fileName,
      file_type: 'drawing',
      file_size: file.size,
      uploaded_at: new Date().toISOString()
    };

    // 나중에 RLS 문제가 해결되면 아래 코드를 다시 활성화
    /*
    // 데이터베이스에 파일 정보 저장
    const { data: fileData, error: dbError } = await (supabaseAdmin || supabase)
      .from('patient_files')
      .insert({
        patient_id: parseInt(patientId),
        file_name: file.name,
        file_path: fileName,
        file_type: 'drawing',
        file_size: file.size,
        uploaded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('데이터베이스 저장 오류:', dbError);
      // 파일 저장은 성공했으므로 Storage에서 파일 삭제
      await supabase.storage
        .from('patient-files')
        .remove([fileName]);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }
    */

    console.log(`환자 ${patientId} 드로잉 파일 업로드 완료 (파일만)`);
    return NextResponse.json({ 
      success: true, 
      file: fileData,
      path: uploadData.path,
      note: 'File saved to storage. Database record skipped due to RLS policy.'
    });

  } catch (error) {
    console.error('드로잉 파일 업로드 실패:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

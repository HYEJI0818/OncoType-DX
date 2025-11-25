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

    console.log(`🎨 환자 ${patientId} Drawing 파일 완전 업로드 시작:`, file.name);

    // 관리자 권한으로 Storage 업로드 (RLS 우회)
    const fileName = `patients/${patientId}/drawings/${Date.now()}_${file.name}`;
    const storageClient = supabaseAdmin || supabase;
    
    const { data: uploadData, error: uploadError } = await storageClient.storage
      .from('patient-files')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Storage 업로드 오류:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    console.log(`✅ Storage 업로드 완료:`, uploadData.path);

    // 데이터베이스에 파일 정보 저장 (관리자 권한으로 RLS 우회)
    let fileData = null;
    try {
      const { data, error: dbError } = await storageClient
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
        // Storage에서 업로드된 파일 삭제
        await storageClient.storage
          .from('patient-files')
          .remove([fileName]);
        return NextResponse.json({ error: 'Database save failed: ' + dbError.message }, { status: 500 });
      }

      fileData = data;
      console.log(`✅ 데이터베이스 저장 완료:`, fileData);

    } catch (dbError) {
      console.error('데이터베이스 저장 실패:', dbError);
      // Storage에서 업로드된 파일 삭제
      await storageClient.storage
        .from('patient-files')
        .remove([fileName]);
      return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
    }

    console.log(`🎉 환자 ${patientId} Drawing 파일 완전 업로드 성공!`);
    
    // 성공 응답
    return NextResponse.json({ 
      success: true, 
      message: 'File uploaded successfully to both storage and database',
      file: fileData,
      path: uploadData.path,
      fileName: file.name
    });

  } catch (error) {
    console.error('Drawing 파일 완전 업로드 실패:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ patientId: string; fileId: string }> }
) {
  try {
    const params = await context.params;
    const { patientId, fileId } = params;
    console.log(`파일 삭제 요청: 환자 ${patientId}, 파일 ${fileId}`);

    // 1. 데이터베이스에서 파일 정보 조회
    const { data: fileData, error: fetchError } = await supabase
      .from('patient_files')
      .select('*')
      .eq('id', fileId)
      .eq('patient_id', patientId)
      .single();

    if (fetchError || !fileData) {
      console.error('파일 조회 오류:', fetchError);
      return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 2. Storage에서 파일 삭제
    const storageClient = supabaseAdmin || supabase;
    const { error: storageError } = await storageClient.storage
      .from('patient-files')
      .remove([fileData.file_path]);

    if (storageError) {
      console.error('Storage 파일 삭제 오류:', storageError);
      // Storage 삭제 실패해도 DB에서는 삭제 진행 (파일이 이미 없을 수 있음)
    }

    // 3. 데이터베이스에서 파일 정보 삭제
    const { error: dbError } = await supabase
      .from('patient_files')
      .delete()
      .eq('id', fileId)
      .eq('patient_id', patientId);

    if (dbError) {
      console.error('데이터베이스 파일 삭제 오류:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    console.log(`파일 삭제 완료: ${fileData.file_name}`);
    return NextResponse.json({ 
      success: true, 
      message: '파일이 성공적으로 삭제되었습니다.',
      deletedFile: fileData.file_name
    });

  } catch (error) {
    console.error('파일 삭제 실패:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

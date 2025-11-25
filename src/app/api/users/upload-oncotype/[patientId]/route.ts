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
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: '업로드할 파일이 없습니다.' },
        { status: 400 }
      );
    }

    console.log(`환자 ${patientId}에게 ${files.length}개 파일 업로드 시작`);

    // 환자 존재 확인
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      console.error('환자 조회 오류:', patientError);
      return NextResponse.json({ error: '환자를 찾을 수 없습니다.' }, { status: 404 });
    }

    const results = [];
    const storageClient = supabaseAdmin || supabase;

    // 각 파일을 순차적으로 업로드
    for (const file of files) {
      try {
        console.log(`파일 업로드 중: ${file.name}`);
        
        // Storage에 파일 업로드
        const fileName = `patients/${patientId}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await storageClient.storage
          .from('patient-files')
          .upload(fileName, file);

        if (uploadError) {
          console.error(`파일 업로드 오류 (${file.name}):`, uploadError);
          results.push({
            fileName: file.name,
            success: false,
            error: uploadError.message
          });
          continue;
        }

        // 데이터베이스에 파일 정보 저장
        const { data: fileData, error: fileError } = await supabase
          .from('patient_files')
          .insert({
            patient_id: parseInt(patientId),
            file_name: file.name,
            file_path: fileName,
            file_type: file.type || 'application/octet-stream',
            file_size: file.size,
            uploaded_at: new Date().toISOString()
          })
          .select()
          .single();

        if (fileError) {
          console.error(`파일 정보 저장 오류 (${file.name}):`, fileError);
          // Storage에서 업로드된 파일 삭제
          await storageClient.storage
            .from('patient-files')
            .remove([fileName]);
          
          results.push({
            fileName: file.name,
            success: false,
            error: fileError.message
          });
          continue;
        }

        results.push({
          fileName: file.name,
          success: true,
          fileData: fileData
        });

        console.log(`파일 업로드 완료: ${file.name}`);
      } catch (error) {
        console.error(`파일 처리 오류 (${file.name}):`, error);
        results.push({
          fileName: file.name,
          success: false,
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`업로드 완료: 성공 ${successCount}개, 실패 ${failCount}개`);

    return NextResponse.json({
      success: true,
      summary: {
        total: files.length,
        success: successCount,
        failed: failCount
      },
      results: results
    });

  } catch (error) {
    console.error('파일 업로드 실패:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

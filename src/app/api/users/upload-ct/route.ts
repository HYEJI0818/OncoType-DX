import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const patientName = formData.get('patientName') as string;

    if (!file || !patientName) {
      return NextResponse.json(
        { error: '파일과 환자명이 필요합니다.' },
        { status: 400 }
      );
    }

    console.log(`CT 파일 업로드 시작: ${file.name}, 환자: ${patientName}`);

    // 환자 생성 또는 조회
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('name', patientName)
      .single();

    let finalPatient = patient;
    
    if (patientError && patientError.code === 'PGRST116') {
      // 환자가 없으면 새로 생성
      const { data: newPatient, error: createError } = await supabase
        .from('patients')
        .insert({
          name: patientName,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('환자 생성 오류:', createError);
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }
      finalPatient = newPatient;
    } else if (patientError) {
      console.error('환자 조회 오류:', patientError);
      return NextResponse.json({ error: patientError.message }, { status: 500 });
    }

    // 파일 업로드 (관리자 클라이언트 사용)
    const fileName = `patients/${finalPatient.id}/${Date.now()}_${file.name}`;
    const storageClient = supabaseAdmin || supabase;
    const { data: uploadData, error: uploadError } = await storageClient.storage
      .from('patient-files')
      .upload(fileName, file);

    if (uploadError) {
      console.error('파일 업로드 오류:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 파일 정보 저장
    const { data: fileData, error: fileError } = await supabase
      .from('patient_files')
      .insert({
        patient_id: finalPatient.id,
        file_name: file.name,
        file_path: fileName,
        file_type: 'mri',
        file_size: file.size,
        created_at: new Date().toISOString()
      })
      .select();

    if (fileError) {
      console.error('파일 정보 저장 오류:', fileError);
      return NextResponse.json({ error: fileError.message }, { status: 500 });
    }

    console.log(`CT 파일 업로드 완료: 환자 ${finalPatient.id}`);
    return NextResponse.json({
      success: true,
      patient: finalPatient,
      file: fileData?.[0]
    });

  } catch (error) {
    console.error('CT 업로드 실패:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

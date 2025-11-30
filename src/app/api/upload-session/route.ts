import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Route Segment Config
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // JSON 형식으로 메타데이터만 받음 (파일은 Supabase Storage에 이미 업로드됨)
    const body = await request.json();
    const { 
      sessionId, 
      patientName, 
      patientGender,
      patientBirthDate,
      patientScanDate,
      patientWeight,
      patientHeight,
      patientMedicalHistory,
      patientNotes,
      files 
    } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID가 필요합니다.' }, { status: 400 });
    }

    console.log(`📋 세션 메타데이터 수신: ${sessionId}`);
    console.log(`👤 환자 정보: ${patientName}`);
    console.log(`📂 업로드된 파일: ${files?.length || 0}개`);

    // 파일 총 크기 계산
    const totalSize = files?.reduce((sum: number, file: any) => sum + (file.size || 0), 0) || 0;

    // 1. upload_sessions 테이블에 세션 저장 (기본 정보만)
    const { data: sessionData, error: sessionError } = await supabase
      .from('upload_sessions')
      .insert({
        session_id: sessionId,
        patient_name: patientName || 'Unknown Patient',
        file_count: files?.length || 0,
        total_size: totalSize,
        status: 'uploaded',
        storage_type: 'supabase'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('❌ 세션 저장 실패:', sessionError);
      throw new Error(`세션 저장 실패: ${sessionError.message}`);
    }

    console.log('✅ 세션 저장 완료:', sessionData);

    // 2. 추가 환자 정보가 있으면 업데이트 시도 (선택적)
    if (patientGender || patientBirthDate || patientScanDate || patientWeight || patientHeight || patientMedicalHistory || patientNotes) {
      try {
        const updateData: any = {};
        if (patientGender) updateData.patient_gender = patientGender;
        if (patientBirthDate) updateData.patient_birth_date = patientBirthDate;
        if (patientScanDate) updateData.patient_scan_date = patientScanDate;
        if (patientWeight) updateData.patient_weight = patientWeight;
        if (patientHeight) updateData.patient_height = patientHeight;
        if (patientMedicalHistory) updateData.patient_medical_history = patientMedicalHistory;
        if (patientNotes) updateData.patient_notes = patientNotes;

        const { error: updateError } = await supabase
          .from('upload_sessions')
          .update(updateData)
          .eq('session_id', sessionId);

        if (updateError) {
          console.warn('⚠️ 추가 환자 정보 저장 실패 (테이블 컬럼이 없을 수 있음):', updateError.message);
          console.log('💡 기본 정보는 저장되었으므로 계속 진행합니다.');
        } else {
          console.log('✅ 추가 환자 정보 저장 완료');
        }
      } catch (updateErr) {
        console.warn('⚠️ 추가 환자 정보 업데이트 중 에러:', updateErr);
      }
    }

    // 다시 세션 데이터 조회 (업데이트된 정보 포함)
    const { data: finalSessionData } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    // 3. upload_files 테이블에 파일 정보 저장
    if (files && Array.isArray(files) && files.length > 0) {
      const fileRecords = files.map((fileInfo: any) => ({
        session_id: sessionId,
        sequence_type: fileInfo.sequenceType,
        original_filename: fileInfo.originalName,
        saved_filename: fileInfo.savedName,
        storage_path: fileInfo.storagePath,
        file_size: fileInfo.size
      }));

      const { data: filesData, error: filesError } = await supabase
        .from('upload_files')
        .insert(fileRecords)
        .select();

      if (filesError) {
        console.error('❌ 파일 정보 저장 실패:', filesError);
        throw new Error(`파일 정보 저장 실패: ${filesError.message}`);
      }

      console.log(`✅ ${filesData.length}개 파일 정보 저장 완료`);
    }

    console.log(`✅ 세션 ${sessionId} 메타데이터 DB 저장 완료`);

    return NextResponse.json({
      success: true,
      sessionId,
      savedFiles: files,
      message: `${files?.length || 0}개 파일의 메타데이터가 Supabase DB에 저장되었습니다.`
    });

  } catch (error) {
    console.error('❌ 메타데이터 저장 실패:', error);
    return NextResponse.json(
      { error: `메타데이터 저장에 실패했습니다: ${error}` },
      { status: 500 }
    );
  }
}


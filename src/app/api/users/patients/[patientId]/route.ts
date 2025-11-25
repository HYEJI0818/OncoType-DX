import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ patientId: string }> }
) {
  try {
    const params = await context.params;
    const { patientId } = params;
    console.log(`환자 ${patientId} 정보 수정 시작`);
    
    const body = await request.json();
    const { name, gender, age, birth_date, diagnosis, description, department, chart_number, exam_date } = body;

    // 필수 필드 검증
    if (!name || !gender || !chart_number) {
      return NextResponse.json(
        { success: false, error: '이름, 성별, 등록번호는 필수 입력 항목입니다.' },
        { status: 400 }
      );
    }

    // 환자 데이터 업데이트
    const { data: patient, error } = await supabase
      .from('patients')
      .update({
        name,
        gender,
        age: age ? parseInt(age) : null,
        diagnosis: diagnosis || null,
        description: description || null,
        department: department || null,
        chart_number: chart_number || null,
        exam_date: exam_date || null,
      })
      .eq('id', patientId)
      .select()
      .single();

    if (error) {
      console.error('환자 수정 Supabase 오류:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('환자 수정 완료:', patient);
    return NextResponse.json({ 
      success: true, 
      message: '환자 정보가 성공적으로 수정되었습니다.',
      patient 
    });
    
  } catch (error) {
    console.error('환자 수정 실패:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ patientId: string }> }
) {
  try {
    const params = await context.params;
    const { patientId } = params;
    console.log(`환자 ${patientId} 삭제 시작`);

    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', patientId);

    if (error) {
      console.error('환자 삭제 Supabase 오류:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('환자 삭제 완료');
    return NextResponse.json({ 
      success: true, 
      message: '환자가 성공적으로 삭제되었습니다.'
    });
    
  } catch (error) {
    console.error('환자 삭제 실패:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
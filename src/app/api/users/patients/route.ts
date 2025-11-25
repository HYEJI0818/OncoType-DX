import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('환자 목록 조회 시작');
    
    const { data: patients, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase 오류:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log(`환자 ${patients?.length || 0}명 조회 완료`);
    return NextResponse.json(patients || []);
    
  } catch (error) {
    console.error('환자 목록 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('새 환자 등록 시작');
    
    const body = await request.json();
    const { name, gender, age, birth_date, diagnosis, description, department, chart_number, exam_date } = body;

    // 필수 필드 검증
    if (!name || !gender || age === undefined || age === null) {
      return NextResponse.json(
        { success: false, error: '이름, 성별, 생년월일은 필수 입력 항목입니다.' },
        { status: 400 }
      );
    }

    // 나이 검증
    if (isNaN(age) || age < 0 || age > 150) {
      return NextResponse.json(
        { success: false, error: '올바른 생년월일을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 환자 데이터 삽입
    const { data: patient, error } = await supabase
      .from('patients')
      .insert([
        {
          name,
          gender,
          age: parseInt(age),
          diagnosis: diagnosis || null,
          description: description || null,
          department: department || null,
          chart_number: chart_number || null,
          exam_date: exam_date || null,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('환자 등록 Supabase 오류:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('환자 등록 완료:', patient);
    return NextResponse.json({ 
      success: true, 
      message: '환자가 성공적으로 등록되었습니다.',
      patient 
    });
    
  } catch (error) {
    console.error('환자 등록 실패:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

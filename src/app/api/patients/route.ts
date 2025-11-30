import { NextRequest, NextResponse } from 'next/server'
import { PatientService } from '@/lib/supabase-utils'

// 모든 환자 조회
export async function GET() {
  try {
    const patients = await PatientService.getAllPatients()
    return NextResponse.json({ success: true, data: patients })
  } catch (error: any) {
    console.error('환자 목록 조회 실패:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// 새 환자 생성
export async function POST(request: NextRequest) {
  try {
    const patientData = await request.json()
    
    // 필수 필드 검증
    if (!patientData.name) {
      return NextResponse.json(
        { success: false, error: '환자 이름은 필수입니다.' },
        { status: 400 }
      )
    }

    const patient = await PatientService.createPatient(patientData)
    return NextResponse.json({ success: true, data: patient }, { status: 201 })
  } catch (error: any) {
    console.error('환자 생성 실패:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

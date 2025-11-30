import { NextRequest, NextResponse } from 'next/server'
import { PatientService } from '@/lib/supabase-utils'

// 특정 환자 조회
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const patientId = parseInt(id)
    
    if (isNaN(patientId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 환자 ID입니다.' },
        { status: 400 }
      )
    }

    const patient = await PatientService.getPatientById(patientId)
    
    if (!patient) {
      return NextResponse.json(
        { success: false, error: '환자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: patient })
  } catch (error: any) {
    console.error('환자 조회 실패:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// 환자 정보 업데이트
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const patientId = parseInt(id)
    
    if (isNaN(patientId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 환자 ID입니다.' },
        { status: 400 }
      )
    }

    const updates = await request.json()
    const patient = await PatientService.updatePatient(patientId, updates)
    
    return NextResponse.json({ success: true, data: patient })
  } catch (error: any) {
    console.error('환자 정보 업데이트 실패:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// 환자 삭제
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const patientId = parseInt(id)
    
    if (isNaN(patientId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 환자 ID입니다.' },
        { status: 400 }
      )
    }

    await PatientService.deletePatient(patientId)
    
    return NextResponse.json({ success: true, message: '환자가 삭제되었습니다.' })
  } catch (error: any) {
    console.error('환자 삭제 실패:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

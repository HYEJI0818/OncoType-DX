import { NextRequest, NextResponse } from 'next/server'
import { FileService } from '@/lib/supabase-utils'

// 특정 환자의 파일 목록 조회
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

    const files = await FileService.getPatientFiles(patientId)
    return NextResponse.json({ success: true, data: files })
  } catch (error: any) {
    console.error('파일 목록 조회 실패:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// 파일 업로드 및 메타데이터 저장
export async function POST(
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일이 제공되지 않았습니다.' },
        { status: 400 }
      )
    }

    // 파일 크기 제한 (50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: '파일 크기는 50MB를 초과할 수 없습니다.' },
        { status: 400 }
      )
    }

    // Storage에 파일 업로드
    const timestamp = new Date().getTime()
    const fileName = `${timestamp}_${file.name}`
    const filePath = `patients/${patientId}/${fileName}`
    
    const uploadResult = await FileService.uploadFile(file, filePath, { upsert: true })
    
    // 데이터베이스에 메타데이터 저장
    const fileMetadata = await FileService.saveFileMetadata({
      patient_id: patientId,
      file_name: file.name,
      file_path: uploadResult.path,
      file_size: file.size,
      file_type: file.type
    })

    return NextResponse.json({ 
      success: true, 
      data: fileMetadata,
      message: '파일이 성공적으로 업로드되었습니다.'
    }, { status: 201 })
  } catch (error: any) {
    console.error('파일 업로드 실패:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

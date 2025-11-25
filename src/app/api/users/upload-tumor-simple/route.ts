import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Tumor 파일 간단 업로드 API 호출됨');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.log('❌ 파일이 없음');
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
    }

    console.log(`🎯 Tumor 파일 업로드 시작:`, file.name, `크기: ${file.size} bytes`);

    // 고유한 파일명 생성 (환자 ID 없이)
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const fileName = `tumor-uploads/${timestamp}_${randomId}_${file.name}`;
    
    // Supabase Storage에 파일 업로드 (관리자 권한 사용)
    const storageClient = supabaseAdmin || supabase;
    
    // 먼저 사용 가능한 bucket 목록 확인
    const { data: buckets, error: bucketsError } = await storageClient.storage.listBuckets();
    console.log('사용 가능한 buckets:', buckets?.map(b => b.name));
    
    if (bucketsError) {
      console.error('Bucket 목록 조회 오류:', bucketsError);
      return NextResponse.json({ error: 'Storage bucket 접근 실패: ' + bucketsError.message }, { status: 500 });
    }
    
    // 적절한 bucket 선택 (patient-files가 없으면 첫 번째 bucket 사용)
    let bucketName = 'patient-files';
    if (buckets && buckets.length > 0) {
      const patientBucket = buckets.find(b => b.name.includes('patient'));
      if (patientBucket) {
        bucketName = patientBucket.name;
      } else {
        bucketName = buckets[0].name; // 첫 번째 사용 가능한 bucket 사용
      }
    } else {
      // bucket이 없으면 patient-files bucket 생성 시도
      console.log('Bucket이 없어서 patient-files bucket 생성 시도...');
      const { data: createData, error: createError } = await storageClient.storage.createBucket('patient-files', {
        public: false,
        allowedMimeTypes: ['image/*', 'application/*'],
        fileSizeLimit: 1024 * 1024 * 100 // 100MB
      });
      
      if (createError) {
        console.error('Bucket 생성 오류:', createError);
        return NextResponse.json({ error: 'Storage bucket 생성 실패: ' + createError.message }, { status: 500 });
      }
      
      console.log('patient-files bucket 생성 성공:', createData);
      bucketName = 'patient-files';
    }
    
    console.log('사용할 bucket:', bucketName);
    
    const { data: uploadData, error: uploadError } = await storageClient.storage
      .from(bucketName)
      .upload(fileName, file);

    if (uploadError) {
      console.error('Tumor 파일 Storage 업로드 오류:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    console.log(`✅ Tumor 파일 Storage 업로드 완료:`, uploadData.path);
    
    // 성공 응답 (데이터베이스 저장 없이 파일 정보만 반환)
    const fileData = {
      id: `${timestamp}_${randomId}`,
      file_name: file.name,
      file_path: fileName,
      file_type: 'tumor-segmentation',
      file_size: file.size,
      uploaded_at: new Date().toISOString(),
      storage_path: uploadData.path
    };

    console.log(`🎉 Tumor 파일 업로드 성공!`, fileData);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Tumor file uploaded successfully',
      fileData: fileData
    });

  } catch (error) {
    console.error('Tumor 파일 업로드 실패:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

// 테스트용 GET 메서드
export async function GET() {
  return NextResponse.json({ 
    message: 'Tumor simple upload API is working',
    timestamp: new Date().toISOString()
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const params = await context.params;
    const filePath = params.path.join('/');
    console.log(`파일 프록시 요청: ${filePath}`);

    // Supabase Storage에서 파일 다운로드 (관리자 클라이언트 사용)
    const storageClient = supabaseAdmin || supabase;
    
    // 먼저 사용 가능한 bucket 목록 확인
    const { data: buckets, error: bucketsError } = await storageClient.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Bucket 목록 조회 오류:', bucketsError);
      return NextResponse.json({ error: 'Storage bucket 접근 실패' }, { status: 500 });
    }
    
    // 적절한 bucket 선택
    let bucketName = 'patient-files';
    if (buckets && buckets.length > 0) {
      const patientBucket = buckets.find(b => b.name.includes('patient'));
      if (patientBucket) {
        bucketName = patientBucket.name;
      } else {
        bucketName = buckets[0].name;
      }
    }
    
    console.log(`파일 다운로드 시도: bucket=${bucketName}, path=${filePath}`);
    
    const { data, error } = await storageClient.storage
      .from(bucketName)
      .download(filePath);

    if (error) {
      console.error('파일 다운로드 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    // 파일 타입 결정
    const contentType = filePath.endsWith('.nii.gz') ? 'application/gzip' :
                       filePath.endsWith('.nii') ? 'application/octet-stream' :
                       'application/octet-stream';

    // 파일 반환
    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });

  } catch (error) {
    console.error('파일 프록시 실패:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

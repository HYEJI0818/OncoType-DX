import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Supabase 연결 테스트 시작...');
    
    // 1. 데이터베이스 연결 테스트
    const { data: patients, error: dbError } = await supabase
      .from('patients')
      .select('*')
      .limit(1);

    if (dbError) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: dbError.message
      }, { status: 500 });
    }

    // 2. Storage 연결 테스트 (관리자 클라이언트 사용)
    const storageClient = supabaseAdmin || supabase;
    const { data: buckets, error: storageError } = await storageClient.storage.listBuckets();
    
    console.log('Storage buckets:', buckets);
    console.log('Storage error:', storageError);
    
    if (storageError) {
      return NextResponse.json({
        success: false,
        error: 'Storage connection failed',
        details: storageError.message
      }, { status: 500 });
    }

    // 3. 특정 파일 존재 확인 (bucket이 있는 경우에만)
    let files = null;
    let listError = null;
    
    if (buckets && buckets.length > 0) {
      const bucketName = buckets.find(b => b.name.includes('patient')) || buckets[0];
      const { data: fileData, error: fileError } = await storageClient.storage
        .from(bucketName.name)
        .list('patients/6', { limit: 5 });
      files = fileData;
      listError = fileError;
      console.log(`Files in ${bucketName.name}:`, files);
    }

    return NextResponse.json({
      success: true,
      database: {
        connected: true,
        patients_count: patients?.length || 0,
        sample_patient: patients?.[0] || null
      },
      storage: {
        connected: true,
        buckets: buckets?.map(b => b.name) || [],
        patient_files: files?.length || 0,
        sample_files: files?.slice(0, 3) || []
      }
    });

  } catch (error) {
    console.error('Supabase 테스트 실패:', error);
    return NextResponse.json({
      success: false,
      error: 'Connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

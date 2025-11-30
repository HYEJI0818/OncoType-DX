import { NextResponse } from 'next/server';
import { performHealthCheck, StorageService, PatientService } from '@/lib/supabase-utils';

export async function GET() {
  try {
    console.log('🔍 Supabase 종합 연결 테스트 시작...');
    
    // 1. 헬스체크 수행
    const healthStatus = await performHealthCheck();
    console.log('헬스체크 결과:', healthStatus);

    // 2. 환자 데이터 샘플 조회
    let patients: any[] = [];
    let patientsError: string | null = null;
    try {
      patients = await PatientService.getAllPatients() as any[];
    } catch (error: any) {
      patientsError = error.message;
    }

    // 3. Storage 정보 조회
    const storageInfo = await StorageService.getStorageUsage();
    console.log('Storage 정보:', storageInfo);

    // 4. 버킷 목록 조회
    let buckets: any[] = [];
    let bucketsError: string | null = null;
    try {
      buckets = await StorageService.listBuckets() as any[];
    } catch (error: any) {
      bucketsError = error.message;
    }

    // 5. 샘플 파일 목록 조회
    let sampleFiles: any[] = [];
    let filesError = null;
    try {
      sampleFiles = await StorageService.listFiles('patients');
    } catch (error: any) {
      filesError = error.message;
    }

    // 6. 환경 변수 확인
    const envCheck = {
      supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      google_translate: !!process.env.GOOGLE_TRANSLATE_API_KEY
    };

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      health: healthStatus,
      environment: envCheck,
      database: {
        connected: healthStatus.database,
        patients_count: patients.length,
        sample_patients: patients.slice(0, 3).map(p => ({
          id: p.id,
          name: p.name,
          department: p.department,
          created_at: p.created_at
        })),
        error: patientsError
      },
      storage: {
        connected: healthStatus.storage,
        usage: storageInfo,
        buckets: buckets?.map(b => ({
          id: b.id,
          name: b.name,
          public: b.public,
          created_at: b.created_at
        })) || [],
        sample_files: sampleFiles?.slice(0, 5).map(f => ({
          name: f.name,
          size: f.metadata?.size,
          last_modified: f.updated_at
        })) || [],
        buckets_error: bucketsError,
        files_error: filesError
      },
      auth: {
        connected: healthStatus.auth
      }
    };

    console.log('✅ 테스트 완료');
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Supabase 테스트 실패:', error);
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: 'Connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

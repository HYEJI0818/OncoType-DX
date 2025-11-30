import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const params = await context.params;
    const { path } = params;
    
    if (!path || path.length === 0) {
      return NextResponse.json({ error: '파일 경로가 필요합니다.' }, { status: 400 });
    }

    // 모든 환경에서 Supabase Storage 사용
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const filePath = path.join('/');
    console.log('📁 Supabase Storage 파일 요청:', filePath);

    const { data, error } = await supabase.storage
        .from('patient-files')
      .download(filePath);

    if (error) {
      console.log('❌ Supabase Storage에서 파일을 찾을 수 없습니다:', error);
      return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 });
    }

    const fileBuffer = Buffer.from(await data.arrayBuffer());
    
    // 파일 확장자에 따른 Content-Type 설정
    const fileName = path[path.length - 1];
    let contentType = 'application/octet-stream';
    
    if (fileName.endsWith('.json')) {
      contentType = 'application/json';
    } else if (fileName.endsWith('.nii') || fileName.endsWith('.nii.gz')) {
      contentType = 'application/octet-stream';
    } else if (fileName.endsWith('.png')) {
      contentType = 'image/png';
    } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    }

    console.log('✅ 파일 제공 성공:', fileName, 'Size:', fileBuffer.length, 'bytes');

    // 파일 응답
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('❌ 파일 제공 실패:', error);
    return NextResponse.json(
      { error: `파일 제공에 실패했습니다: ${error}` },
      { status: 500 }
    );
  }
}

// HEAD 메서드도 지원 (파일 존재 확인용)
export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const params = await context.params;
    const { path } = params;
    
    if (!path || path.length === 0) {
      return new NextResponse(null, { status: 400 });
    }

    // 모든 환경에서 Supabase Storage 사용
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const filePath = path.join('/');
    
    const { data, error } = await supabase.storage
        .from('patient-files')
      .download(filePath);

    if (error) {
      return new NextResponse(null, { status: 404 });
    }

    const fileBuffer = Buffer.from(await data.arrayBuffer());
    const fileName = path[path.length - 1];
    let contentType = 'application/octet-stream';
    
    if (fileName.endsWith('.json')) {
      contentType = 'application/json';
    } else if (fileName.endsWith('.nii') || fileName.endsWith('.nii.gz')) {
      contentType = 'application/octet-stream';
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}


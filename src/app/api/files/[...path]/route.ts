import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

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

    // uploads 폴더의 파일 경로 구성
    const filePath = join(process.cwd(), 'uploads', ...path);
    
    console.log('📁 파일 요청:', filePath);

    // 파일 존재 확인
    if (!existsSync(filePath)) {
      console.log('❌ 파일을 찾을 수 없습니다:', filePath);
      return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 파일 읽기
    const fileBuffer = await readFile(filePath);
    
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

    const filePath = join(process.cwd(), 'uploads', ...path);
    
    if (!existsSync(filePath)) {
      return new NextResponse(null, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
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

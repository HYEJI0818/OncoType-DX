import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const sessionId = formData.get('sessionId') as string;
    const patientName = formData.get('patientName') as string;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID가 필요합니다.' }, { status: 400 });
    }

    console.log(`🚀 UUID 기반 파일 업로드 시작: ${sessionId}`);

    // uploads 폴더 경로
    const uploadsDir = join(process.cwd(), 'uploads');
    const sessionDir = join(uploadsDir, sessionId);

    // 세션 폴더 생성
    if (!existsSync(sessionDir)) {
      await mkdir(sessionDir, { recursive: true });
    }

    const savedFiles: any[] = [];
    const metadata: any = {
      session_id: sessionId,
      created_at: new Date().toISOString(),
      patient_name: patientName || 'Unknown Patient',
      files: {},
      status: 'files_uploaded',
      updated_at: new Date().toISOString()
    };

    // 파일명에서 시퀀스 타입 추출 함수
    const getSequenceType = (filename: string, index: number): string => {
      const name = filename.toLowerCase();
      if (name.includes('t1c') || name.includes('t1ce')) return 'T1CE';
      if (name.includes('t1n') || name.includes('t1')) return 'T1';
      if (name.includes('t2')) return 'T2';
      if (name.includes('flair')) return 'FLAIR';
      // 기본값으로 순서에 따라 할당
      return ['T1', 'T1CE', 'T2', 'FLAIR'][index] || 'T1';
    };

    // 파일들 처리
    let fileIndex = 0;
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file_') && value instanceof File) {
        const file = value as File;
        const sequenceType = getSequenceType(file.name, fileIndex);
        const savedFileName = `${sequenceType}_${file.name}`;
        const filePath = join(sessionDir, savedFileName);

        // 파일 저장
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filePath, buffer);

        // 메타데이터 업데이트
        metadata.files[sequenceType] = {
          original_filename: file.name,
          saved_filename: savedFileName,
          file_path: `uploads/${sessionId}/${savedFileName}`,
          file_size: file.size,
          uploaded_at: new Date().toISOString()
        };

        savedFiles.push({
          sequenceType,
          originalName: file.name,
          savedName: savedFileName,
          size: file.size
        });

        console.log(`✅ ${file.name} -> ${sequenceType} 저장 완료`);
        fileIndex++;
      }
    }

    // 메타데이터 파일 저장
    const metadataPath = join(sessionDir, 'metadata.json');
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    console.log(`✅ 세션 ${sessionId} 파일 업로드 완료: ${savedFiles.length}개 파일`);

    return NextResponse.json({
      success: true,
      sessionId,
      savedFiles,
      metadata,
      message: `${savedFiles.length}개 파일이 성공적으로 업로드되었습니다.`
    });

  } catch (error) {
    console.error('❌ 파일 업로드 실패:', error);
    return NextResponse.json(
      { error: `파일 업로드에 실패했습니다: ${error}` },
      { status: 500 }
    );
  }
}


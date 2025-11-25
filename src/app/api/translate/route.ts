import { NextRequest, NextResponse } from 'next/server';

// Google Translate API 키 (환경 변수에서 가져오기)
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

export async function POST(request: NextRequest) {
  try {
    // API 키 확인
    if (!GOOGLE_TRANSLATE_API_KEY) {
      return NextResponse.json(
        { error: 'Google Translate API key not configured' },
        { status: 500 }
      );
    }

    const { text, source, target } = await request.json();

    // 입력 검증
    if (!text || !target) {
      return NextResponse.json(
        { error: 'Missing required parameters: text, target' },
        { status: 400 }
      );
    }

    // Google Translate API 호출
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: source || 'auto',
          target: target,
          format: 'text',
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google Translate API error:', errorData);
      return NextResponse.json(
        { error: 'Translation service unavailable' },
        { status: 503 }
      );
    }

    const data = await response.json();
    const translatedText = data.data.translations[0].translatedText;

    return NextResponse.json({
      translatedText,
      sourceLanguage: data.data.translations[0].detectedSourceLanguage || source,
    });

  } catch (error) {
    console.error('Translation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

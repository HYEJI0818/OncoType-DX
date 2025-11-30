import { Language } from './translations';

// 번역 캐시 인터페이스
interface TranslationCache {
  [key: string]: {
    [lang: string]: string;
  };
}

// 메모리 캐시 (실제 운영에서는 Redis나 로컬 스토리지 사용 권장)
const translationCache: TranslationCache = {};

// 언어 코드 매핑 (Google Translate API 형식)
const languageCodeMap: Record<Language, string> = {
  ko: 'ko',
  en: 'en',
  th: 'th',
  zh: 'zh-CN'
};

/**
 * Google Translate API를 사용한 텍스트 번역
 * @param text 번역할 텍스트
 * @param targetLanguage 목표 언어
 * @param sourceLanguage 원본 언어 (기본값: 'ko')
 * @returns 번역된 텍스트
 */
export async function translateText(
  text: string,
  targetLanguage: Language,
  sourceLanguage: Language = 'ko'
): Promise<string> {
  // 같은 언어면 원본 반환
  if (sourceLanguage === targetLanguage) {
    return text;
  }

  // 캐시 키 생성
  const cacheKey = `${text}_${sourceLanguage}_${targetLanguage}`;
  
  // 캐시에서 확인
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey][targetLanguage];
  }

  try {
    // Google Translate API 호출
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        source: languageCodeMap[sourceLanguage],
        target: languageCodeMap[targetLanguage],
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.translatedText;

    // 캐시에 저장
    if (!translationCache[cacheKey]) {
      translationCache[cacheKey] = {};
    }
    translationCache[cacheKey][targetLanguage] = translatedText;

    return translatedText;
  } catch (error) {
    console.error('Translation error:', error);
    // 번역 실패 시 원본 텍스트 반환
    return text;
  }
}

/**
 * 여러 텍스트를 한 번에 번역 (배치 처리)
 * @param texts 번역할 텍스트 배열
 * @param targetLanguage 목표 언어
 * @param sourceLanguage 원본 언어
 * @returns 번역된 텍스트 배열
 */
export async function translateTexts(
  texts: string[],
  targetLanguage: Language,
  sourceLanguage: Language = 'ko'
): Promise<string[]> {
  // 병렬 처리로 성능 최적화
  const translationPromises = texts.map(text => 
    translateText(text, targetLanguage, sourceLanguage)
  );
  
  return Promise.all(translationPromises);
}

/**
 * 의료 용어 특화 번역 (더 정확한 번역을 위한 컨텍스트 제공)
 * @param medicalText 의료 관련 텍스트
 * @param targetLanguage 목표 언어
 * @param context 의료 컨텍스트 (예: 'diagnosis', 'symptom', 'treatment')
 * @returns 번역된 텍스트
 */
export async function translateMedicalText(
  medicalText: string,
  targetLanguage: Language,
  context: 'diagnosis' | 'symptom' | 'treatment' | 'general' = 'general'
): Promise<string> {
  // 의료 용어 컨텍스트를 추가하여 더 정확한 번역
  const contextPrefix = {
    diagnosis: '[Medical Diagnosis] ',
    symptom: '[Medical Symptom] ',
    treatment: '[Medical Treatment] ',
    general: '[Medical] '
  };

  const textWithContext = contextPrefix[context] + medicalText;
  const translatedWithContext = await translateText(textWithContext, targetLanguage);
  
  // 컨텍스트 프리픽스 제거
  return translatedWithContext.replace(/^\[Medical[^\]]*\]\s*/, '');
}

/**
 * 캐시 클리어 함수
 */
export function clearTranslationCache(): void {
  Object.keys(translationCache).forEach(key => {
    delete translationCache[key];
  });
}

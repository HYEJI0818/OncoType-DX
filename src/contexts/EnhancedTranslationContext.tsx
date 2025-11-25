'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, getTranslation, Translations } from '@/lib/translations';
import { translateText, translateMedicalText } from '@/lib/translateService';

interface EnhancedTranslationContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translations;
  translateDynamic: (text: string, context?: 'diagnosis' | 'symptom' | 'treatment' | 'general') => Promise<string>;
  isTranslating: boolean;
}

const EnhancedTranslationContext = createContext<EnhancedTranslationContextType | undefined>(undefined);

export function EnhancedTranslationProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('ko');
  const [t, setT] = useState<Translations>(getTranslation('ko'));
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    // 로컬 스토리지에서 언어 설정 불러오기
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && ['ko', 'en', 'th', 'zh'].includes(savedLanguage)) {
      setLanguage(savedLanguage);
      setT(getTranslation(savedLanguage));
    }
  }, []);

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    setT(getTranslation(newLanguage));
    localStorage.setItem('language', newLanguage);
  };

  /**
   * 동적 텍스트 번역 함수
   * @param text 번역할 텍스트
   * @param context 의료 컨텍스트
   * @returns 번역된 텍스트
   */
  const translateDynamic = async (
    text: string, 
    context: 'diagnosis' | 'symptom' | 'treatment' | 'general' = 'general'
  ): Promise<string> => {
    // 한국어면 원본 반환
    if (language === 'ko') {
      return text;
    }

    setIsTranslating(true);
    try {
      if (context === 'general') {
        return await translateText(text, language);
      } else {
        return await translateMedicalText(text, language, context);
      }
    } catch (error) {
      console.error('Dynamic translation error:', error);
      return text; // 실패 시 원본 반환
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <EnhancedTranslationContext.Provider value={{ 
      language, 
      setLanguage: handleLanguageChange, 
      t, 
      translateDynamic,
      isTranslating 
    }}>
      {children}
    </EnhancedTranslationContext.Provider>
  );
}

export function useEnhancedTranslation() {
  const context = useContext(EnhancedTranslationContext);
  if (context === undefined) {
    throw new Error('useEnhancedTranslation must be used within an EnhancedTranslationProvider');
  }
  return context;
}

// 기존 useTranslation과 호환성을 위한 래퍼
export function useTranslation() {
  const { language, setLanguage, t } = useEnhancedTranslation();
  return { language, setLanguage, t };
}

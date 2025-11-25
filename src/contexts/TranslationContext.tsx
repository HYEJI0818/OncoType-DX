'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, getTranslation, Translations } from '@/lib/translations';

interface TranslationContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translations;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('ko');
  const [t, setT] = useState<Translations>(getTranslation('ko'));

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

  return (
    <TranslationContext.Provider value={{ language, setLanguage: handleLanguageChange, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}

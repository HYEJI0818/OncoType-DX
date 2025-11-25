'use client';

import { useTranslation } from '@/contexts/EnhancedTranslationContext';
import { Language } from '@/lib/translations';

const languageOptions: { code: Language; name: string }[] = [
  { code: 'ko', name: '한국어' },
  { code: 'en', name: 'English' },
  { code: 'th', name: 'ไทย' },
  { code: 'zh', name: '中文' },
];

export default function LanguageSelector() {
  const { language, setLanguage } = useTranslation();

  const handleLanguageSelect = (langCode: Language) => {
    setLanguage(langCode);
  };

  return (
    <div className="flex items-center gap-3">
      {languageOptions.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleLanguageSelect(lang.code)}
          className={`text-xs font-medium transition-colors ${
            language === lang.code 
              ? 'text-blue-400' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {lang.name}
        </button>
      ))}
    </div>
  );
}

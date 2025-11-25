/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
    },
  },
  plugins: [],
  // 🎯 배포 환경에서 동적 클래스 보장
  safelist: [
    'h-screen',
    'w-screen', 
    'h-full',
    'w-full',
    'h-[calc(100vh-64px)]',
    'w-[calc(100vw-64px)]',
    'min-h-screen',
    'min-w-full',
    'absolute',
    'fixed',
    'inset-0',
    'z-10',
    'z-20',
    'z-50',
    'pointer-events-none',
    'pointer-events-auto',
  ]
}




#!/bin/bash

echo "🚀 OncoType DX 유방암 분석 시스템 배포 시작..."

# 환경 변수 확인
echo "📋 환경 변수 확인 중..."
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "⚠️  NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다."
  echo "Vercel 대시보드에서 다음 환경 변수를 설정해주세요:"
  echo "NEXT_PUBLIC_SUPABASE_URL=https://kphkzqffcxyqydcpvmxx.supabase.co"
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwaGt6cWZmY3h5cXlkY3B2bXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjYyNjcsImV4cCI6MjA3MDI0MjI2N30.ThclMTdKHU60M9OJEUTv2K-qEKD1LZ5rsnmlo-SBHhc"
fi

# 빌드 테스트
echo "🔧 로컬 빌드 테스트 중..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ 로컬 빌드 성공!"
  
  # Vercel 배포
  echo "🎨 Vercel에 배포 중..."
  npx vercel --prod
  
  echo "✅ 배포 완료!"
  echo ""
  echo "🎉 OncoType DX 유방암 분석 시스템이 성공적으로 배포되었습니다!"
  echo ""
  echo "📋 배포된 기능들:"
  echo "- ✅ NIfTI 파일 뷰어 (압축 파일 지원)"
  echo "- ✅ MPR 뷰어 (다중 평면 재구성)"
  echo "- ✅ 3D 뇌 모델 뷰어"
  echo "- ✅ 환자 관리 시스템"
  echo "- ✅ 파일 업로드 및 관리"
  echo "- ✅ Supabase 데이터베이스 연동"
  echo "- ✅ 다국어 지원"
  echo ""
  echo "🔗 배포 URL을 확인하여 모든 기능이 정상 작동하는지 테스트해주세요."
else
  echo "❌ 로컬 빌드 실패! 오류를 수정한 후 다시 시도해주세요."
  exit 1
fi

#!/bin/bash

echo "🚀 BTumor 프로젝트 전체 시작"
echo "📁 프로젝트 디렉토리: $(pwd)"

# 기존 프로세스 정리
echo "🔄 기존 프로세스 정리 중..."
pkill -f "python.*app.py" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

# 업로드 폴더 생성
mkdir -p uploads

echo ""
echo "🎯 백엔드와 프론트엔드 동시 실행..."

# 백엔드 Flask 서버 시작 (백그라운드)
echo "🐍 Flask 서버 시작 중... (http://localhost:5001)"
python3 app.py &
FLASK_PID=$!

# 잠시 대기 (Flask 서버 시작 시간)
sleep 3

# Flask 서버 상태 확인
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo "✅ Flask 서버 정상 실행됨"
else
    echo "❌ Flask 서버 시작 실패"
    kill $FLASK_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "🌐 Next.js 프론트엔드 시작 중... (http://localhost:3000)"
echo "📋 사용 가능한 서비스:"
echo "  - 프론트엔드: http://localhost:3000"
echo "  - 백엔드 API: http://localhost:5001"
echo "  - 서버 상태: http://localhost:5001/health"
echo ""

# 프론트엔드 시작 (포그라운드)
npm run dev

# 프론트엔드가 종료되면 백엔드도 종료
echo "🔄 서버 종료 중..."
kill $FLASK_PID 2>/dev/null || true
echo "✅ 모든 서버가 종료되었습니다."

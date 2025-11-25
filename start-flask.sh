#!/bin/bash

echo "🚀 BTumor Flask 마이크로서비스 시작"

# 업로드 폴더 생성
mkdir -p uploads

# 기존 Flask 프로세스 종료
echo "🔄 기존 Flask 프로세스 정리 중..."
pkill -f "python.*app.py" 2>/dev/null || true

echo "🌐 Flask 서버 시작 (http://localhost:5001)"
python3 app.py

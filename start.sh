#!/bin/bash

echo "🚀 Brain Tumor Analysis System 시작 중..."
echo "📁 프로젝트 디렉토리: $(pwd)"

# 기존 프로세스 종료
echo "🔄 기존 프로세스 정리 중..."
pkill -f "ts-node src/server.ts" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

# 백엔드와 프론트엔드 동시 실행
echo "🎯 백엔드와 프론트엔드 동시 실행..."
npm run dev

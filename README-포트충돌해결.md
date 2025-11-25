# 🔧 포트 5000 충돌 해결 가이드

## 문제 상황
macOS에서 AirPlay Receiver가 포트 5000을 사용하여 Flask 서버와 충돌이 발생합니다.

## 해결 방법

### 방법 1: AirPlay Receiver 비활성화 (권장)
1. **시스템 설정** 열기
2. **일반** → **AirDrop 및 Handoff** 이동
3. **AirPlay 수신기** 끄기

### 방법 2: 다른 포트 사용 (현재 적용됨)
- Flask 서버를 포트 5001에서 실행
- 프론트엔드 코드도 5001로 수정 완료

## 프로젝트 실행 방법

### 🚀 통합 실행 (권장)
```bash
./start-all.sh
```
- 백엔드(Flask)와 프론트엔드(Next.js)를 동시에 실행
- 기존 프로세스 자동 정리
- 서버 상태 자동 확인

### 🐍 백엔드만 실행
```bash
./start-flask.sh
```

### 🌐 프론트엔드만 실행
```bash
npm run dev
```

## 서비스 주소
- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:5001
- **서버 상태 확인**: http://localhost:5001/health

## 문제 해결
포트 충돌이 계속 발생하면:
1. 기존 프로세스 종료: `pkill -f "python.*app.py"`
2. 포트 사용 확인: `lsof -i :5001`
3. AirPlay Receiver 비활성화 확인

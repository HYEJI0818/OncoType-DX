# Google Translate API 설정 가이드

## 🔧 Google Translate API 설정 방법

### 1. Google Cloud Console 설정

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/ 방문
   - Google 계정으로 로그인

2. **새 프로젝트 생성 (또는 기존 프로젝트 선택)**
   - 상단의 프로젝트 선택 드롭다운 클릭
   - "새 프로젝트" 클릭
   - 프로젝트 이름 입력 (예: "btumor-translation")

3. **Google Translate API 활성화**
   - 좌측 메뉴에서 "API 및 서비스" > "라이브러리" 클릭
   - "Cloud Translation API" 검색
   - "Cloud Translation API" 클릭 후 "사용" 버튼 클릭

4. **API 키 생성**
   - 좌측 메뉴에서 "API 및 서비스" > "사용자 인증 정보" 클릭
   - 상단의 "+ 사용자 인증 정보 만들기" > "API 키" 클릭
   - API 키가 생성됩니다 (안전하게 복사해두세요)

5. **API 키 제한 설정 (보안 강화)**
   - 생성된 API 키 옆의 편집 아이콘 클릭
   - "API 제한사항"에서 "키 제한" 선택
   - "Cloud Translation API" 선택
   - 저장

### 2. 환경 변수 설정

프론트엔드 폴더에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# Google Translate API Configuration
GOOGLE_TRANSLATE_API_KEY=your_actual_api_key_here

# 기타 환경 변수들...
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

⚠️ **중요**: `your_actual_api_key_here`를 실제 API 키로 교체하세요!

### 3. 개발 서버 재시작

환경 변수 설정 후 개발 서버를 재시작하세요:

```bash
cd frontend
npm run dev
```

## 💰 비용 정보

- **무료 할당량**: 월 500,000자까지 무료
- **유료 요금**: 그 이후 1백만자당 $20
- **예상 사용량**: 의료 대시보드 기준 월 10만자 내외 (무료 범위)

## 🔍 테스트 방법

1. 개발 서버 실행 후 `http://localhost:3001` 접속
2. 언어 선택 버튼에서 영어, 태국어, 중국어 중 하나 선택
3. AI 분석 섹션에서 의료 데이터가 번역되는지 확인
4. 번역 중일 때는 노란색 점과 "Translating..." 표시
5. 번역 완료 후 초록색 점으로 변경

## 🚨 문제 해결

### API 키 오류
- 브라우저 개발자 도구 > Console 탭에서 오류 메시지 확인
- API 키가 올바르게 설정되었는지 확인
- Google Cloud Console에서 API가 활성화되었는지 확인

### 번역이 작동하지 않을 때
- 네트워크 연결 확인
- API 할당량 초과 여부 확인
- 콘솔 로그에서 오류 메시지 확인

## 📊 사용량 모니터링

Google Cloud Console > "API 및 서비스" > "할당량"에서 사용량을 모니터링할 수 있습니다.

## 🔒 보안 주의사항

- API 키를 GitHub 등 공개 저장소에 업로드하지 마세요
- `.env.local` 파일은 `.gitignore`에 포함되어 있습니다
- 운영 환경에서는 서버 사이드에서 API 호출하는 것을 권장합니다

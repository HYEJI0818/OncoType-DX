# 🚀 Supabase 연동 설정 가이드

## 1. Supabase 프로젝트 생성

### 1-1. Supabase 계정 생성 및 로그인
1. [Supabase 대시보드](https://supabase.com/dashboard)에 접속
2. GitHub 계정으로 로그인하거나 이메일로 회원가입
3. 새 프로젝트 생성

### 1-2. 새 프로젝트 생성
1. "New project" 버튼 클릭
2. 프로젝트 정보 입력:
   - **Name**: `oncotype-dx` (또는 원하는 이름)
   - **Database Password**: 강력한 비밀번호 설정
   - **Region**: `Northeast Asia (Seoul)` 선택 (한국 서버)
3. "Create new project" 클릭

## 2. 환경 변수 설정

### 2-1. .env.local 파일 생성
프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가:

```bash
# Supabase 환경 변수
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Google Translate API (선택사항)
GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key_here
```

### 2-2. Supabase 키 찾기
1. Supabase 대시보드에서 프로젝트 선택
2. 좌측 메뉴에서 "Settings" → "API" 클릭
3. 다음 값들을 복사:
   - **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`에 입력
   - **anon public**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 입력
   - **service_role**: `SUPABASE_SERVICE_ROLE_KEY`에 입력

## 3. 데이터베이스 설정

### 3-1. SQL 스크립트 실행
1. Supabase 대시보드에서 "SQL Editor" 클릭
2. "New query" 버튼 클릭
3. `oncotype_supabase_tables.sql` 파일의 내용을 복사해서 붙여넣기
4. "Run" 버튼 클릭하여 실행

### 3-2. Storage 설정
1. 좌측 메뉴에서 "Storage" 클릭
2. `mri-files` 버킷이 생성되었는지 확인
3. 필요시 `oncotype_storage_fix.sql` 실행

### 3-3. 정책 설정 (선택사항)
개발 환경에서 더 관대한 정책을 원한다면:
- `oncotype_table_policy_fix.sql` 실행

## 4. 테스트

### 4-1. 연결 테스트
```bash
npm run dev
```

### 4-2. API 테스트
브라우저에서 다음 URL 접속:
- `http://localhost:3000/api/test-supabase`

### 4-3. 대시보드 확인
- `http://localhost:3000/dashboard`에서 Supabase 상태 확인

## 5. 주요 기능

### ✅ 구현된 기능
- 환자 정보 관리
- MRI 파일 업로드/다운로드
- 사용자 인증 (사번 기반)
- 관리자 대시보드
- 다국어 지원
- 실시간 연결 상태 모니터링

### 🔧 API 엔드포인트
- `GET /api/test-supabase` - 연결 테스트
- `POST /api/auth/employee-login` - 사번 로그인
- `GET /api/admin/users` - 사용자 목록
- `POST /api/upload-session` - 파일 업로드
- `GET /api/files` - 파일 목록

## 6. 문제 해결

### 연결 오류 시
1. 환경 변수가 올바르게 설정되었는지 확인
2. Supabase 프로젝트가 활성화되어 있는지 확인
3. API 키가 만료되지 않았는지 확인

### Storage 오류 시
1. `mri-files` 버킷이 생성되었는지 확인
2. Storage 정책이 올바르게 설정되었는지 확인
3. 파일 크기 제한 확인 (기본 50MB)

## 7. 보안 고려사항

### 프로덕션 환경
- RLS(Row Level Security) 정책 강화
- API 키 정기 교체
- CORS 설정 확인
- HTTPS 사용 필수

### 개발 환경
- `.env.local` 파일을 git에 커밋하지 않기
- 테스트 데이터만 사용
- 개발용 API 키 사용


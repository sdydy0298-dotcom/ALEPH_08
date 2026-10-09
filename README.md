# ALEPH 08 · Passkey Private Workspace

기존 T01 자기소개 페이지의 소개·경험·강점·근거·프로필 이미지를 보존한 상태에서, 별도 패스키 인증 기반의 비공개 공간을 추가했습니다.

## Deployment

- Public: https://sdy-task08.vercel.app/
- Private: https://sdy-task08.vercel.app/private.html
- GitHub: https://github.com/sdydy0298-dotcom/ALEPH_08
- Database: Supabase `aleph_common` → `t08` 전용 비공개 스키마
- Authentication backend: Supabase Edge Function `t08-passkey`
- API gateway: Vercel Functions (`/api/auth`, `/api/private`, `/api/passkeys`)

## Authentication design

- 패스키 등록/로그인: WebAuthn, SimpleWebAuthn
- 첫 등록: 일회용 초대코드가 있는 계정만 허용
- 등록 완료 후 자동 로그인되지 않음. 로그인은 별도 수행
- 공개/개인 데이터 서버 분리, 서버측 challenge 일회성 사용
- 개인키 서버 전송·저장 없음
- 서버에서 검증한 세션의 `user_id`로만 개인 기록을 조회
- 패스키 여러 개 등록, 마지막 패스키 삭제 제한
- HttpOnly Secure SameSite=Lax 세션 쿠키

## Source layout

- `index.html`, `style.css`, `script.js`, `images/profile.png`: T01 공개 콘텐츠
- `private.html`, `private.css`, `private.js`: T08 개인 공간 UI와 WebAuthn 브라우저 흐름
- `api/`: Vercel 경량 API 프록시 (서버리스 함수 3개)
- `supabase/functions/t08-passkey/index.ts`: 패스키 인증 및 비공개 DB 서버 로직

## Test status

- GitHub 소스 반영 및 Vercel 프로덕션 빌드 READY: 확인
- Supabase 스키마와 Edge Function ACTIVE: 확인
- 패스키 실기기 등록/로그인: 실제 기기에서 추가 검증 필요
- 계정 A/B 권한 격리와 리플레이 차단: 코드 구현, 실제 브라우저 검증 증거 별도 수집 필요

## Security and submission

모든 기록은 가상의 학습용 샘플이며, 실제 개인정보/시크릿은 공개 소스에 포함하지 않습니다. 최초 등록 코드는 GitHub에 저장하지 않으며 DB에는 SHA-256 해시만 저장됩니다. 비공개 데이터는 가입한 계정에 대해 서버에서 초기 생성됩니다.

원본: https://github.com/sdydy0298-dotcom/ALEPH_01

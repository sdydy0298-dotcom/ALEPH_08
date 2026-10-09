# ALEPH 08 · Passkey Private Workspace

기존 T01 자기소개 페이지의 소개·경험·강점·근거·프로필 이미지를 보존한 상태에서, 별도 패스키 인증 기반의 비공개 공간을 추가했습니다.

## Deployment

- Public: https://sdy-task08.vercel.app/
- Private: https://sdy-task08.vercel.app/private.html
- Record editor: https://sdy-task08.vercel.app/records.html
- GitHub: https://github.com/sdydy0298-dotcom/ALEPH_08
- Database: Supabase `aleph_common` → `t08` 전용 비공개 스키마
- Authentication backend: Supabase Edge Function `t08-passkey`
- API gateway: Vercel Functions (`/api/auth`, `/api/private`, `/api/passkeys`)

## Authentication design

- 패스키 등록/로그인: WebAuthn, SimpleWebAuthn
- 첫 등록: 사용자가 계정 ID와 패스키 이름으로 직접 등록 (초대코드 없음)
- 기존 계정 ID 재등록은 제한하며 두 번째 패스키는 로그인 후 추가
- 등록 완료 후 자동 로그인되지 않음. 로그인은 별도 수행
- 공개/개인 데이터 서버 분리, 서버측 challenge 일회성 사용
- 개인키 서버 전송·저장 없음
- 서버에서 검증한 세션의 `user_id`로만 개인 기록을 조회
- 패스키 여러 개 등록, 마지막 패스키 삭제 제한
- HttpOnly Secure SameSite=Lax 세션 쿠키

## Source layout

- `index.html`, `style.css`, `script.js`, `images/profile.png`: T01 공개 콘텐츠
- `private.html`, `private.css`, `private.js`: T08 개인 공간 UI와 WebAuthn 브라우저 흐름
- `records.html`, `records.css`, `records.js`: 로그인한 사용자 전용 기록 작성·수정·삭제·목록
- `api/`: Vercel 경량 API 프록시 (서버리스 함수 3개)
- `supabase/functions/t08-passkey/index.ts`: 패스키 인증 및 비공개 DB 서버 로직

## Test status

- GitHub 소스 반영 및 Vercel 프로덕션 빌드 READY: 확인
- Supabase 스키마와 Edge Function ACTIVE: 확인
- 패스키 실기기 등록/로그인: 사용자 브라우저에서 로그인 후 보관함 표시 확인
- 직접 작성한 기록의 생성·수정·삭제: 구현, 실제 사용자 동작 검증 필요
- 계정 A/B 권한 격리와 리플레이 차단: 코드 구현, 실제 브라우저 검증 증거 별도 수집 필요

## Security and submission

기록은 자동 생성하지 않습니다. 로그인한 사용자가 기록 화면에서 직접 작성하고, 서버가 검증한 세션 계정 ID 기준으로만 조회·수정·삭제합니다. 기존 실습용 자동 기록 3개는 2026-10-09에 조건을 대조한 후 제거했습니다. 공개 소스에는 실제 개인 기록이나 비밀값이 포함되지 않습니다.

원본: https://github.com/sdydy0298-dotcom/ALEPH_01

## 최초 등록 안내

`/private.html`에서 계정 ID와 패스키 이름을 입력하여 등록합니다. 등록 후 자동 로그인하지 않으며, 별도 패스키 로그인 버튼을 사용합니다. 실제 기기에서 패스키 등록과 로그인 시나리오 및 인증 증거를 확인해야 합니다.

## 직접 기록 작성 및 검증

1. 패스키로 로그인하면 내 보관함이 표시됩니다. 아직 기록하지 않았다면 빈 상태와 작성 버튼을 보여줍니다.
2. `/records.html`에서 제목과 내용을 입력해 저장하거나 기존 기록을 수정·삭제합니다.
3. T08의 비공개 자료 3건 이상 검증을 위해 실제 작성 화면에서 서로 다른 가상 기록 3건을 직접 등록합니다. 자동 샘플은 사용하지 않습니다.
4. 미로그인 POST/PATCH/DELETE는 401, 다른 계정의 기록 ID를 수정·삭제하려는 요청은 404가 예상되며 실제 요청/응답은 별도 검증 기록으로 남겨야 합니다.

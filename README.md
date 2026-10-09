# ALEPH 08 · Passkey Private Workspace

기존 T01 자기소개 페이지의 소개·경험·강점·근거·프로필 이미지를 보존한 상태에서, 별도 패스키 인증 기반의 비공개 공간을 추가했습니다.

## Deployment

- Public: https://sdy-task08.vercel.app/
- Private: https://sdy-task08.vercel.app/private.html
- Unified private workspace: https://sdy-task08.vercel.app/info.html
- Legacy `/records.html` redirects to unified workspace (preserving `?edit=` links)
- GitHub: https://github.com/sdydy0298-dotcom/ALEPH_08
- Database: Supabase `aleph_common` → `t08` 전용 비공개 스키마
- Authentication backend: Supabase Edge Function `t08-passkey`
- API gateway: Vercel Functions (`/api/auth`, `/api/private`, `/api/passkeys`, `/api/info`)

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
- `info.html`, `info.css`, `info.js`: 단일 비공개 공간. 기본정보 3개 선택 입력, 사용자 정의 항목 및 기존 기록의 통합 조회·수정·삭제
- `records.html`: 기존 링크 호환용 `/info.html` 이동 페이지. 기존 `records.js`, `records.css`는 참조하지 않지만 기록 DB는 그대로 유지
- `api/info.js`: 정보 관리 API 프록시 (4개 서버리스 함수 중 1개)
- `api/`: Vercel 경량 API 프록시 (서버리스 함수 3개)
- `supabase/functions/t08-passkey/index.ts`: 패스키 인증 및 비공개 DB 서버 로직

## PRIVATE 정보 저장 정책

- 기본 항목: 전화번호·상세 주소·생년월일. 초깃값은 없으며 사용자가 입력한 항목만 `t08.private_fields`에 저장합니다.
- 기본 항목 내용을 비우고 저장하면 해당 DB 행을 삭제합니다.
- 자유 항목: 원하는 제목과 선택적으로 빈 내용을 작성하고 추가·수정·삭제합니다. `프로젝트 메모`는 입력창에 표시하는 예시이며 자동으로 DB에 기록하지 않습니다.
- `t08.notes`의 기존 작성 기록도 동일 화면에 함께 표시되며, 수정·삭제는 기존 `/api/private` 소유자 검사 API를 재사용합니다. DB 데이터 이관·삭제는 진행하지 않았습니다.
- 기존 `t08.notes`, `t08.users`, `t08.passkeys`를 변경하거나 삭제하지 않습니다.
- 조회·생성·수정·삭제는 검증된 세션의 `user_id`로 범위를 제한합니다. 클라이언트의 owner ID는 신뢰하지 않습니다.
- 개인 정보 실데이터 대신 과제 검증 시 가상 정보를 사용하도록 권장합니다.

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
2. `/info.html`에서 기본 정보와 자유 항목을 관리합니다. 이전 `/records.html` 링크도 자동으로 통합 페이지로 이동합니다.
3. T08의 비공개 자료 3건 이상 검증을 위해 실제 작성 화면에서 서로 다른 가상 기록 3건을 직접 등록합니다. 자동 샘플은 사용하지 않습니다.
4. 미로그인 POST/PATCH/DELETE는 401, 다른 계정의 기록 ID를 수정·삭제하려는 요청은 404가 예상되며 실제 요청/응답은 별도 검증 기록으로 남겨야 합니다.

## 개인 정보 관리 검증

1. 미로그인 GET/PUT/POST/PATCH/DELETE `/api/info`는 401이어야 합니다.
2. 첫 로그인 시 기본 정보는 비어 있어야 하고 자유 항목은 자동 생성되지 않아야 합니다.
3. 기본 정보를 일부 저장·새로고침·지우고 저장한 후 DB 반영 상태를 확인합니다.
4. 자유 항목을 제목 `프로젝트 메모`, 빈 내용으로 저장하고 수정·삭제해봅니다.
5. 다른 계정의 항목 ID로 PATCH/DELETE하면 성공하면 안 됩니다.
6. 기존 패스키 로그인 및 비공개 기록의 데이터가 유지되는지 확인합니다.

## 통합 화면 (2026-10-09)

- 로그인 후 보관함에는 '내 비공개 공간' 메뉴만 제공합니다. 그 안에 기본 3개 선택 입력 및 자유 항목·기존 기록을 모두 나타냅니다.
- 기존 `t08.notes` 기록은 `t08.private_fields`에 복제하거나 이관하지 않습니다. 통합 목록에서 두 API의 정보를 합쳐 표시합니다.
- 기존 기록은 `/api/private`를 통해 수정·삭제하며 자유 항목은 `/api/info`를 이용합니다. 두 API 모두 서버 세션의 소유자 ID로 접근 범위를 제한합니다.
- 기존 계정/패스키/세션/기록은 변경하지 않았습니다. 실제 브라우저에서 저장·수정·삭제 시나리오는 별도로 검증해야 합니다.

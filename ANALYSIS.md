# 분석 및 검증

## 원본 문항 매핑

원본 HTML 내부 이름은 화면 번호와 다릅니다. 기존 DOM 이름을 바꾸지 않아 분기를 보존하되 payload는 다음처럼 고정했습니다.

| 화면/저장 | 원본 내부 입력 | 의미 |
|---|---|---|
| Q1 | q1 | 이용 목적, 복수 |
| Q2 | q2 | 동승자, 복수 |
| Q3 | age | 연령 |
| Q4 | q3 | Q1 중 대표 목적 |
| Q5 | q4 | Q2 중 대표 동승자 |
| Q6 | q5 | 중요 경험, 1~2개 |
| Q7 | q6 | 희망 기능, 필수 주관식 |
| Q8 | q7-extra | 자유 의견, 선택 |
| Q9 | q8 | 앱 선호, 1~2개 |
| Q10 | q9 | 디지털 기능 이용 방식 |
| Q11 | q10 | Q10이 미사용 외인 경우 필수 |
| Q12 | q11 | Pleos 인지도 |

Q12 현재 사용 중/사용 경험 있음에만 인터뷰 의향이 나타납니다. 기타 직접 입력은 대표 선택지 문구·상황 설명에 반영되며 other.Q1/Q2/Q6/Q9/Q11에 저장합니다. Q11 미노출은 빈 배열과 q11_applicable=0으로 구별합니다. 경품/인터뷰는 선택입니다. Pleos 이미지는 원본 base64를 바이너리로 추출해 외부 의존 없이 보존했습니다.

## 기술 선택

| 후보 | 장점 | 이번 선택 |
|---|---|---|
| Supabase + 정적 프런트 | Postgres·Auth·RLS, SQL 분석 편리 | 별도 프로젝트/키/인증 연결이 필요해 이번에는 미사용 |
| Firebase | 관리형 인증 및 Firestore 규칙 | 집계·관계형 연락처 분리에는 추가 설계 필요 |
| Vercel | 프런트/함수 배포 편리 | 별도 DB 필요, 이번 Workers 백엔드의 직접 대상 아님 |
| Cloudflare Pages/Workers + D1 | 정적 파일과 서버 함수, SQL DB를 한 운영 체계로 구성 | 연결된 Sites가 Workers/D1·HTTPS·인증을 제공하여 채택 |

Sites는 배포에 필요한 서버 프레임워크로 Vinext를 제공하지만 설문 UI는 HTML/CSS/JavaScript 그대로입니다. Three.js는 자동차 영역에서만 사용하고 로컬 vendor 파일로 배포합니다. 별도 Supabase/Firebase 계정이나 API 키는 필요하지 않습니다. 플랫폼 사용량/요금 및 공개 접근 가능 여부는 현재 계정 정책을 따르며 무료 무제한 운영을 보장하지 않습니다.

공식 참고 (2026-11-04 확인):
- Supabase 키/서버 비밀: https://supabase.com/docs/guides/getting-started/api-keys
- Firebase 접근 규칙: https://firebase.google.com/docs/rules
- Cloudflare 개발 플랫폼 요금: https://www.cloudflare.com/plans/developer-platform/
- Vercel 함수 제한: https://vercel.com/docs/functions/limitations

## 검증

- Node 테스트: 필수값/선택지/최대2개/기타/Q11/인터뷰 대상/개인정보 동의·버전/CSV 수식 방어.
- 로컬 D1 API 통합: 실제 저장, 동시 재전송, 잘못된 영수증, 출처 차단, 미인증 관리자 조회·삭제 차단.
- 가상 관리자 통합: 집계·응답 조회, 전화번호 분리, 동의 기록, 발송 완료일 기준 30일 기한, 연락처 삭제 후 설문 유지.
- 브라우저: 약 433px 폭에서 시작/설문/완료, GLB 렌더링, 기타 라벨 동기화, Q6 3번째 선택 거부, 인터뷰 분기, 실제 로컬 DB 제출 완료, 관리자 로그인/집계.
- TypeScript 검사 및 프로덕션 빌드.

운영 로그인은 실제 관리자 계정으로 최종 확인해야 합니다. 테스트 데이터는 로컬 DB에만 생성하며 운영 DB로 복사하지 않습니다. 움직임 줄이기/WebGL 실패 경로는 코드 검토를 포함하며 모든 실제 기기 조합을 실측하지 않았습니다.

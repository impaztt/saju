# 대화형 사주 상담 웹앱 제품 설계 문서

## 0. 제품 개요
- 서비스명: 온결 사주
- 제품 형태: 모바일 우선 반응형 웹앱
- 핵심 가치: 긴 사주풀이 페이지를 읽게 하지 않고, 사용자가 지금 가장 궁금한 문제를 먼저 선택한 뒤 짧은 질문을 따라가며 카드형 결과를 받는 상담형 UX
- UX 톤: 토스 스타일의 단정함, 신뢰감, 과한 장식 최소화, 한 화면 한 행동
- 해석 원칙: 단정 대신 경향, 흐름, 선택 기준 중심. 불안을 키우지 않고 희망 고문도 하지 않음

## 1. 전체 IA
1. 랜딩 `/`
2. 유의사항 `/notice`
3. 기본 정보 입력 `/profile`
4. 주제 선택 홈 `/topics`
5. 질문 진행 `/session/:sessionId`
6. 답변 검토 `/review/:sessionId`
7. 결과 로딩 `/loading/:sessionId`
8. 결과 상세 `/result/:resultId`
9. 이전 결과 보관함 `/archive`
10. 공유 결과 `/shared/:token`
11. 설정/데이터 관리 `/settings`
12. 운영 구조/통계 `/ops`

## 2. 사용자 흐름도
1. 랜딩 진입
2. 유의사항 확인
3. 기본 정보 입력
4. 주제 선택
5. 분기형 질문 진행
6. 답변 검토 및 수정
7. 결과 생성
8. 결과 확인
9. 저장 또는 공유
10. 보관함에서 이전 결과 재열람
11. 설정에서 데이터 삭제 또는 공유 링크 비활성화

중간 이탈 복원 흐름
1. 질문 진행 중 이탈
2. localStorage 또는 Firestore draft session 유지
3. 재진입 시 최신 draft session 노출
4. 같은 세션 이어서 보기 또는 새로 시작 선택

질문 구조 변경 흐름
1. 운영자가 질문 플로우 버전 변경
2. 세션 로드 시 `flowVersion` 과 현재 플로우 버전 비교
3. 기존 nodeId 가 모두 살아 있으면 `warning`
4. 일부 노드가 사라졌으면 `outdated`
5. `outdated` 세션은 보호 상태로 보존 후 새 세션 시작 유도

## 3. 화면 목록
| 화면 | 목적 | 핵심 액션 |
| --- | --- | --- |
| 랜딩 | 서비스 소개와 진입 전환 | 시작하기 |
| 유의사항 | 참고용 해석 안내 | 안내 확인 |
| 기본 정보 입력 | 출생 정보와 닉네임 수집 | 저장 후 주제 선택 |
| 주제 홈 | 현재 고민 선택 | 주제 탭 |
| 질문 진행 | 분기형 질문 답변 | 선택지 탭 |
| 답변 검토 | 수정과 최종 확인 | 결과 보기 |
| 결과 로딩 | 결과 생성 단계 안내 | 대기 |
| 결과 상세 | 카드형 해석 제공 | 저장, 공유 |
| 보관함 | 저장 결과 재열람 | 결과 열기 |
| 공유 결과 | 공유 링크 전용 읽기 | 홈 이동 |
| 설정 | 삭제, 링크 관리, 상태 확인 | 삭제/비활성화 |
| 운영 구조 | 카탈로그와 통계 확인 | 운영 기준 확인 |

## 4. 화면별 상세 구성요소
### 랜딩
- 서비스 가치 제안 문구
- 핵심 UX 요약 카드
- 공지 배너
- 이어 보기 세션 카드
- 시작하기 버튼

### 유의사항
- 참고용 해석 원칙
- 출생시간 미입력 정확도 안내
- 현실 판단 주의 문구
- 확인 버튼

### 기본 정보 입력
- 닉네임
- 생년월일
- 양력/음력 선택
- 출생시간
- 출생시간 모름 체크
- 성별
- 입력 검증 에러
- 저장 CTA

### 주제 선택 홈
- 현재 프로필 요약
- 이어 보기 세션 1~2개
- 주제 카드 10개
- 보관함, 기본 정보 수정 이동

### 질문 진행
- 주제 라벨
- 질문 문구
- 보조 문구
- 진행률 바
- 선택지 카드
- 이전 질문, 답변 검토 버튼
- 버전 경고 배너

### 답변 검토
- 기본 정보 요약
- 질문/선택 답변 목록
- 답변 수정 버튼
- 결과 보기 CTA
- 출생시간 모름 정확도 안내

### 결과 로딩
- 생성 단계 안내
- 기본 결과 우선 생성 정책 설명
- 오프라인 대응 문구

### 결과 상세
- 핵심 요약 헤더
- 생성 소스 뱃지 local/cloud/fallback
- 정확도 안내
- 결과 카드 10종
- 저장 버튼
- 공유 링크 생성 버튼
- 다른 주제 보기

### 보관함
- 저장된 결과 목록
- 주제 라벨
- 생성 시각
- 요약 문장

### 설정
- Firebase 연결 상태
- 네트워크 상태
- 저장 데이터 수량
- 공유 링크 목록 및 비활성화
- 전체 데이터 삭제

### 운영 구조
- 주제 수, 노드 수, 템플릿 수
- 주제별 진입/완주/저장률
- 질문별 이탈 후보
- 관리 모듈 구조 설명

## 5. 질문 엔진 구조
### 노드 모델
- `id`: 영구 식별자. 버전 변경 시에도 가능하면 유지
- `topicId`: 주제 ID
- `version`: 플로우 버전
- `prompt`: 질문 문구
- `helper`: 보조 문구
- `type`: `single_select`, `binary`, `multi_select`
- `options[]`: 선택지 배열
- `branchRules[]`: 응답/프로필/태그 기반 분기 규칙
- `resultTags[]`: 노드 레벨 결과 반영 태그

### 선택지 모델
- `id`
- `label`
- `description`
- `next`: 다음 노드 ID 또는 `null`
- `tags[]`: 결과 카드에 반영할 태그

### 세션 모델
- `sessionId`
- `userId`
- `topicId`
- `flowVersion`
- `status`: `draft`, `review`, `loading`, `result`, `outdated`
- `currentNodeId`
- `responses[]`
- `compatibility`
- `profileSnapshot`
- `saved`, `resultId`, `shareToken`

### 버전 충돌 최소화 설계
- 노드 ID 는 의미 기반 영구 키를 사용
- 플로우 전체 버전과 노드 ID 를 분리
- 세션 로드 시 `nodeId` 유효성 검증
- 모두 유효하면 `warning` 으로 최신 플로우에 매핑
- 일부 손실 시 `outdated` 로 보호하고 재시작 유도
- 결과가 이미 생성된 세션은 `result` 상태 유지

## 6. 주제별 분기 예시
### 연애
- 시작 질문: 썸 / 연애 중 / 애매한 관계 / 상대 없음
- 썸 선택 시: 반응 속도, 정의 회피, 간격 문제 질문
- 연애 중 선택 시: 미래 방향, 거리감, 갈등 방식 질문
- 상대 없음 선택 시: 시기감, 준비도, 반복 패턴 질문

### 재회
- 최근 이별 / 긴 공백 / 연락 유지 / 완전 단절
- 최근 이별은 감정 잔존과 후회 중심 질문
- 단절 상태는 기다림보다 정리 방향 질문

### 직장/이직
- 버틸지 / 이직할지 / 번아웃 / 사람 갈등
- 이직 선택 시 탐색 단계, 지원 단계, 오퍼 비교로 분기
- 번아웃 선택 시 신체 피로, 감정 소진, 판단 마비로 분기

### 마음의 방향
- 불안 / 지침 / 미련 / 무기력
- 불안은 밤, 결정, 관계 장면으로 분기
- 무기력은 시작 불가, 흥미 저하, 회피 성향으로 분기

## 7. 결과 카드 구조
1. 핵심 한 줄 요약
2. 지금의 흐름
3. 내 입장
4. 상대 입장
5. 관계/상황 구조
6. 가까운 시기 흐름
7. 지금 하면 좋은 행동
8. 지금 피해야 할 행동
9. 오늘의 한마디
10. 이어서 보면 좋은 질문

결과 생성 규칙
- 주제별 기본 템플릿을 먼저 로드
- 응답 태그와 매칭되는 신호 템플릿으로 일부 카드 문구 덮어쓰기
- 추천 후속 질문은 중복 제거 후 2~3개 노출
- 출생시간 모름이면 정확도 안내 카드 상단 노출
- 생성 실패 시 기본 템플릿만으로 fallback 결과 우선 제공

## 8. Firestore 컬렉션 구조
### `catalog/topics/{topicId}`
- `label`, `description`, `accent`, `estimatedMinutes`, `active`, `sortOrder`

### `catalog/flows/{topicId_version}`
- `topicId`, `version`, `startNodeId`, `publishedAt`, `status`
- `nodes[]`: 노드 배열 또는 하위 컬렉션 `nodes/{nodeId}`

### `catalog/resultTemplates/{templateId}`
- `scope`: `base` | `signal`
- `topicId`
- `matches[]`
- `summary`, `currentFlow`, `self`, `other`, `structure`, `nearTerm`, `do`, `dont`, `oneLine`, `nextQuestions[]`

### `catalog/banners/{bannerId}`
- `title`, `body`, `tone`, `actionLabel`, `actionPath`, `active`, `priority`

### `users/{uid}`
- `profile`
- `createdAt`, `updatedAt`

### `sessions/{sessionId}`
- `userId`, `topicId`, `flowVersion`, `status`, `currentNodeId`, `responses`, `compatibility`, `profileSnapshot`, `saved`, `resultId`, `shareToken`, `startedAt`, `updatedAt`

### `results/{resultId}`
- `userId`, `sessionId`, `topicId`, `summary`, `cards`, `tags`, `generationSource`, `accuracyNote`, `generatedAt`

### `shares/{token}`
- `userId`, `sessionId`, `resultId`, `status`, `createdAt`, `expiresAt`, `urlPath`

### `ops/topicDaily/{topicId_yyyymmdd}`
- `entries`, `completed`, `saved`, `dropouts`

### `ops/questionDaily/{nodeId_yyyymmdd}`
- `opened`, `answered`, `pendingDropouts`

## 9. 상태 관리 구조
- 클라이언트 상태: Zustand
- 영속화: localStorage MVP, Firestore 2차
- 주요 상태
  - `profile`
  - `acceptedNotice`
  - `networkStatus`
  - `sessions[]`
  - `results[]`
  - `shares[]`
  - `dismissedBannerIds[]`
  - `lastError`
- 액션
  - `startSession`
  - `submitAnswer`
  - `goBack`
  - `rewindToNode`
  - `markLoading`
  - `generateResult`
  - `saveSession`
  - `createShare`
  - `disableShare`
  - `deleteAllData`

## 10. 운영자 기능 구조
### 운영자 콘솔 권장 메뉴
1. 주제 관리
2. 질문 플로우 관리
3. 선택지/분기 규칙 관리
4. 결과 템플릿 관리
5. 배너/공지 관리
6. 통계 대시보드
7. 세션 이상 로그

### 통계 지표
- 주제별 진입 수
- 주제별 완주율
- 주제별 저장률
- 질문별 opened / answered / dropoutRate
- 버전 충돌 세션 수
- 공유 링크 생성 수 / 만료 수 / 비활성화 수

### Firebase 매핑
- Firestore: 카탈로그, 세션, 결과, 공유, ops 집계
- Cloud Functions: 결과 생성, 공유 링크 생성, 링크 만료 스케줄러, ops 집계
- Analytics: 화면 진입, 선택지 탭, 결과 저장, 공유 생성
- Remote Config: 배너, 긴급 공지, 질문 노출 실험

## 11. 예외 처리 정책
### 네트워크 오류
- 질문 진행은 로컬 상태 우선
- 결과 생성 시 cloud 실패하면 fallback 결과 즉시 노출
- 오프라인 배너 상단 표시

### 중간 이탈 후 복원
- 모든 답변 입력 후 즉시 localStorage 저장
- 재진입 시 최신 draft session 카드 우선 노출

### 질문 구조 변경
- `flowVersion` 비교
- `warning`: 가능한 범위에서 최신 플로우에 매핑
- `outdated`: 기존 세션 보호 후 새 세션 시작 유도

### 결과 생성 실패
- fallback 결과 우선 노출
- generationSource=`fallback` 저장
- 운영자 로그 전송 대상

### 출생시간 모름
- 기본 정보 입력 단계에서 안내
- 결과 화면 상단에 정확도 안내 재노출

### 공유 링크 만료/비활성화
- 결과 미노출
- 만료/비활성화 상태 안내 화면 노출
- 재발급은 원 결과 보유자만 가능

## 12. MVP / 2차 / 3차 고도화 범위
### MVP
- 모바일 우선 웹앱
- 로컬 프로필/세션/결과 저장
- 10개 주제 분기형 질문
- 카드형 결과 생성
- 저장, 이전 결과 보기, 공유 링크, 데이터 삭제
- 운영 구조 페이지와 기초 지표 계산

### 2차
- Firebase Auth 연동
- Firestore 세션 동기화
- Cloud Functions 결과 생성
- 실시간 배너/공지 Remote Config 적용
- 운영자 카탈로그 CRUD 콘솔

### 3차
- A/B 테스트 기반 질문 개선
- LLM 보조 결과 리라이팅 파이프라인
- 주제 추천 엔진
- 사용자 리텐션 캠페인
- 상담 기록 요약/연속성 분석

## 13. 실제 개발 가능한 컴포넌트 구조 제안
- `App.tsx`: 라우트 조합, 글로벌 알림
- `store/useAppStore.ts`: 상태 저장소와 액션
- `data/questionFlows.ts`: 분기형 질문 카탈로그
- `data/resultTemplates.ts`: 기본 템플릿 + 태그 템플릿
- `lib/engine.ts`: 분기 판정, 세션 호환성, 결과 생성
- `lib/storage.ts`: 로컬 영속화
- `lib/share.ts`: 공유 토큰/만료 계산
- `lib/ops.ts`: 주제/질문 통계 계산
- `styles.css`: 모바일 우선 디자인 시스템

화면 컴포넌트 분리 권장
- `LandingPage`
- `NoticePage`
- `ProfilePage`
- `TopicHomePage`
- `SessionPage`
- `ReviewPage`
- `LoadingPage`
- `ResultPage`
- `ArchivePage`
- `SharedPage`
- `SettingsPage`
- `OpsPage`

## 14. Firebase 기준 실제 구현 방향
- Hosting: SPA 정적 배포
- Authentication: 익명 로그인 후 필요 시 소셜 전환
- Firestore: 카탈로그, 세션, 결과, 공유, 통계
- Functions: 결과 생성 API, 공유 토큰 발급, 링크 만료 배치, 일별 집계
- Storage: 공유용 OG 이미지, 운영 배너 이미지
- Analytics: 화면 진입, 이탈, 저장, 공유, 주제 선택 이벤트
- Remote Config: 배너, 문구 실험, 주제 노출 순서, 긴급 비활성화 스위치

현재 저장소 상태
- 프론트엔드 프로토타입은 local-first 구조로 구현
- 동일한 타입과 세션 모델을 Firestore 문서 구조로 바로 매핑 가능
- 운영 구조 페이지는 향후 관리자 대시보드로 확장 가능한 형태로 설계

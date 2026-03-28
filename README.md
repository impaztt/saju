# Interactive Saju Counselor

모바일 우선 반응형 "대화형 사주 상담 웹앱"의 초기 설계/구현 스캐폴드다.

이 저장소는 다음을 포함한다.

- 실제 개발에 바로 연결 가능한 제품 설계 문서
- React + TypeScript + Vite 기반 모바일 우선 프론트엔드
- 분기형 질문 엔진과 로컬 세션 복원 구조
- Firebase Hosting / Firestore / Functions 기준 운영 아키텍처 스캐폴드

## 기술 기준

- Frontend: React 18, TypeScript, Vite, React Router, Zustand
- Platform: Firebase Hosting, Authentication, Firestore, Cloud Functions, Storage, Analytics, Remote Config
- Data strategy: 질문 플로우 버전 관리 + 세션 복원 + 결과 카드 템플릿화

## 실행

```bash
npm install
npm run dev
```

빌드:

```bash
npm run build
```

Cloud Functions:

```bash
cd functions
npm install
npm run build
```

## 주요 경로

- 제품 설계 문서: `docs/interactive-saju-product-spec.md`
- 앱 엔트리: `src/main.tsx`
- 라우트/화면: `src/app`
- 질문 정의: `src/data/questionFlows.ts`
- 결과 템플릿: `src/data/resultTemplates.ts`
- 상태 저장소: `src/store/useAppStore.ts`
- Firebase Functions 스캐폴드: `functions/src/index.ts`

## 비고

- 현재 프론트엔드는 Firestore 연동 전 단계의 로컬 프로토타입이다.
- 세션 복원, 결과 저장, 공유 만료, 버전 충돌 보호는 모두 실제 Firebase 구조에 매핑될 수 있게 타입과 데이터 모델을 먼저 설계했다.
- `.env.example`에 Firebase 웹 앱 환경 변수를 넣으면 `src/lib/firebase.ts`를 실제 SDK 연결 지점으로 사용할 수 있다.

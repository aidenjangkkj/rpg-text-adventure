# 🏰 TRPG 텍스트 어드벤처

웹 기반 인터랙티브 텍스트 어드벤처 RPG 프로젝트입니다. Next.js, Tailwind CSS, Zustand를 사용하여 구현했으며, OpenAI/Gemini API와 연동해 매번 동적으로 이야기를 생성합니다. D&D 스타일 전투, 버프 시스템을 갖추고 있어 다양한 분기와 플레이를 제공합니다.

---

## 🚀 주요 기능

- **동적 시나리오 생성**  
  AI(Gemini) 호출로 매번 새로운 이야기와 선택지를 JSON 형태로 받아옵니다.  
- **선택지 기반 분기 처리**  
  사용자의 선택에 따라 `callStory(choice, combatResult?)`를 호출해 다음 분기를 로드합니다.  
- **D&D 스타일 전투**  
  d20 주사위 판정, 공격/방어 로직, 전투 UI, 승패에 따른 분기 처리.  
- **위험도 기반 적 레벨 조정**  
  `low`/`medium`/`high` 위험도에 따라 적 레벨을 플레이어 레벨 대비 +0/+1/+2 만큼 보정합니다.  
- **버프 시스템**  
  AI 응답의 `buffs` 배열을 적용해 HP·힘·민첩·체력 등 스탯을 상승시킵니다.  
- **이어하기(History) 기능**  
  Zustand + localStorage로 선택/스토리 기록을 저장해 페이지 새로고침 후에도 복원합니다.  
- **반응형 UI**  
  Tailwind CSS로 웹·모바일 모두 쾌적한 사용 경험 제공.

---

## 📦 기술 스택

- **Framework**: Next.js 13 (App Router, React 18)  
- **언어**: TypeScript  
- **스타일**: Tailwind CSS  
- **상태 관리**: Zustand (localStorage 동기화)  
- **AI API**: Google Gemini (REST API)  
- **테스트**: Jest + React Testing Library  
- **배포**: Vercel  https://rpg-text-adventure.vercel.app/
- **모니터링**: Sentry / LogRocket

---

## 🔧 설치 및 실행

1. 레포지토리 클론  
   ```bash
   git clone https://github.com/your-username/trpg-text-adventure.git
   cd trpg-text-adventure
   ```

2. 의존성 설치  
   ```bash
   npm install
   # or
   yarn install
   ```

3. 환경 변수 설정  
   프로젝트 루트에 `.env.local` 파일 생성 후:
   ```env
   NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. 5e-srd API 사용: 별도 키 없이 인터넷 연결만으로 D&D 데이터(종족, 클래스)를 불러옵니다.

5. 개발 서버 실행
   ```bash
   npm run dev
   # or
   yarn dev
   ```
   `http://localhost:3000` 에서 확인

6. 프로덕션 빌드 & 실행
   ```bash
   npm run build
   npm run start
   # or
   yarn build
   yarn start
   ```

---

## 🗂️ 디렉토리 구조

```
.
├── app/
│   ├── globals.css          # 전역 스타일
│   └── layout.tsx           # 공통 레이아웃
├── components/
│   └── CombatComponent.tsx  # 전투 UI
├── lib/
│   └── gemini.ts            # OpenAI/Gemini 호출 래퍼
├── pages/
│   └── api/
│       └── story.ts         # `/api/story` 엔드포인트
├── stores/                   # Zustand 스토어
├── tsconfig.json            # TypeScript 설정
└── package.json
```

---

## 📖 사용법

1. **모험 시작**: 이름·성별·나이·종족 입력 후 “모험 시작” 클릭  
2. **스토리 읽기**: AI 생성 스토리, 위험도·버프 확인  
3. **선택지 선택**: 버튼 클릭으로 분기 진행  
4. **전투 모드**: “전투 발생” 시 전투 UI 등장 → 공격 버튼으로 턴 진행  
5. **전투 종료**: 승리 시 AI에 결과 전달 → 다음 스토리, 패배 시 Game Over
6. **이어하기**: 페이지 새로고침해도 진행 기록(history) 유지

---

## 🤝 기여

1. Fork & 브랜치 생성  
2. 기능 구현 후 커밋  
3. Pull Request 생성

---

## 📄 라이선스

MIT © JangSeokHwan

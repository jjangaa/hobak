# 🎃 호박(Hobak) - 우리 동네 따뜻한 중고거래 웹서비스

**호박(Hobak)**은 울산 동구(방어동·화정동·대송동·전하동·일산동) 이웃들이 따뜻하게 물건을 나누고 거래할 수 있는 중고거래 웹 애플리케이션입니다.

---

## ✨ 주요 기능

1. **상품 목록 페이지 (`js/list-view.js`, `css/list-view.css`)**
   - 3열 반응형 상품 카드 그리드 및 실시간 검색·카테고리·동네 필터링
   - 상태별 태그(`🟢 판매중`, `🟡 예약중`, `⚫ 거래완료`, `👑 내 글`, `🎃 바로구매`) 표시
   - **거래완료 게시글 흐리게 처리(Dimming)** 및 `거래 가능 보기(거래완료 글 확인)` 필터 지원
   - 실시간 동네 평균 시세 및 매물 현황 대시보드 바, 인기 검색어 위젯

2. **상품 상세 안내 페이지/드로어 (`js/detail-view.js`, `css/detail-view.css`)**
   - 다중 이미지 슬라이드 캐러셀(Carousel), 판매자 가명 프로필 및 **매너온도(`37.2°C 😊`)** 게이지
   - **내가 직접 올린 게시글 관리:** `[판매중 / 예약중 / 거래완료]` 상태 변경, `[✏️ 수정]`, `[🗑️ 삭제]`, `[🚀 1초 끌올]`
   - 관심 하트(`♥`) 토글, **`💰 가격 제안하기(네고 요청)`** 모달, 실시간 **호박 미니 채팅** 연동

3. **상품 글쓰기 & 수정 페이지 (`js/write-view.js`, `css/write-view.css`)**
   - 다중 사진 등록(PC 파일 업로드, URL 추가, 원클릭 샘플 사진 칩), 판매/나눔 설정, 천 단위 콤마 가격 입력
   - 우측 **실시간 상품 상세페이지 미리보기(Live Preview)** 제공
   - 기존 게시글 수정 모드(Edit Mode) 및 임시저장 지원

4. **Supabase Auth & 비식별(No-PII) 데이터베이스 연동 (`js/auth.js`, `js/supabase-config.js`, `supabase/schema.sql`)**
   - 이메일·비밀번호·필수 닉네임 회원가입 및 로그인 모달 (`Supabase Auth` 연동)
   - 로그인 상태에 따른 우측 상단 버튼 자동 전환 (`[로그인]` ↔ `[🎃 닉네임] · [로그아웃]`)
   - 비로그인 상태에서 글쓰기 클릭 시 로그인 모달 선행 → 로그인 성공 즉시 글쓰기 화면 자동 이동
   - 개인식별정보(실명, 전화번호)를 직접 저장하지 않는 5대 테이블(`profiles`, `products`, `product_likes`, `chat_messages`, `popular_keywords`) 및 RLS 적용

5. **Antigravity Design Expert 3D & Glassmorphism UI (`css/antigravity-design.css`, `js/antigravity-motion.js`)**
   - 무중력 부유 애니메이션(`Weightlessness`), 마우스 반응형 3D 공간 틸트(`Spatial Depth`), 글래스모피즘(`Glassmorphism`), 3D 아이소메트릭 그리드 뷰 전환

---

## 📂 폴더 구조

```text
hobak/
├── index.html                  # 메인 통합 엔트리 페이지
├── .env.example                # 환경변수 템플릿 (.env 실제 파일은 .gitignore로 제외됨)
├── css/
│   ├── common.css              # 공통 레이아웃 및 상단 컨트롤 바
│   ├── list-view.css           # 상품 목록·검색 헤더·인기검색어·푸터 스타일
│   ├── detail-view.css         # 상품 상세 안내 패널 및 미니 채팅 스타일
│   ├── write-view.css          # 상품 글쓰기·수정 및 실시간 프리뷰 스타일
│   ├── antigravity-design.css  # 3D 공간 깊이감 및 글래스모피즘 스타일
│   └── auth.css                # 로그인/회원가입 모달 및 거래완료 흐리게 처리 스타일
├── js/
│   ├── data.js                 # 초기 가상 상품 10개 및 상태 동기화 모듈
│   ├── supabase-config.js      # Supabase 5대 테이블 CRUD 연동 클라이언트
│   ├── auth.js                 # Supabase Auth 로그인/회원가입/세션 관리 모듈
│   ├── list-view.js            # 상품 목록 페이지 렌더링 및 필터 모듈
│   ├── detail-view.js          # 상품 상세 패널·내 글 관리·가격제안·미니채팅 모듈
│   ├── write-view.js           # 상품 등록 및 수정 폼·실시간 미리보기 모듈
│   ├── app.js                  # 전체 화면 전환 및 이벤트 통합 컨트롤러
│   └── antigravity-motion.js   # GSAP + 3D 마우스 패럴랙스 모션 엔진
└── supabase/
    └── schema.sql              # Supabase PostgreSQL 5대 테이블·RLS·트리거·시드 SQL
```

---

## 🚀 실행 및 배포 방법

별도의 빌드 과정 없는 정적 웹 애플리케이션(Vanilla HTML/CSS/JS + Supabase CDN)이므로 **GitHub Pages**, **Vercel**, **Netlify** 어디서든 즉시 배포할 수 있습니다.
- 로컬 실행: `index.html` 파일을 브라우저에서 열거나 Live Server로 실행합니다.

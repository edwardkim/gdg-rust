# 수행계획서: Task #3 - GDG 디테일 기능 레플리카

> **상태: 완료** (2026-04-15 최종 보고서 승인)

## 기본 정보

| 항목 | 내용 |
|------|------|
| 타스크 번호 | #3 |
| 마일스톤 | M100 (POC) |
| 작성일 | 2026-04-15 |
| 선행 타스크 | #2 (POC 구현) |
| 목표 | GDG의 핵심 기능을 Rust/WASM으로 레플리카하여 실용 수준의 그리드 구현 |

## 배경

Task #2에서 최소 동작 POC(텍스트 셀 + hitTest + 스크롤)를 구현했다. 현재 POC는 GDG 전체 기능의 약 5% 수준이다. 이 타스크에서는 GDG의 디테일 기능을 단계적으로 레플리카하여 실용 수준의 그리드로 발전시킨다.

## 현재 구현 상태 vs 목표

| 카테고리 | 현재 (POC) | Task #3 목표 |
|----------|-----------|-------------|
| 셀 타입 | Text만 | Boolean, Number, Image, URI, Bubble, Loading, Protected |
| 셀 렌더링 | 기본 텍스트 | 호버 효과, 선택 하이라이트, 포커스 링, 필 핸들 |
| 헤더 | 텍스트만 | 아이콘, 메뉴 버튼, 그룹 헤더, 컬럼 리사이즈 |
| 선택 | 단일 셀 | 범위 선택 (드래그), 다중 선택, 행/컬럼 선택 |
| 최적화 | 없음 | DPR 처리, 텍스트 캐싱 |
| 테마 | 고정 | 셀/행/컬럼별 테마 오버라이드, 교대 행 색상 |
| 데이터 | 정적 배열 | getCellContent 콜백 패턴 |

## 수행 단계 (6단계)

### Stage 1: 셀 타입 확장

**목표**: GDG의 핵심 셀 타입 7종 추가

| 셀 타입 | 난이도 | Canvas API | 비고 |
|---------|--------|-----------|------|
| Number | 소 | fillText (우측 정렬) | Text와 유사, contentAlign 지원 |
| Boolean | 소 | roundedRect, stroke, fill | 체크박스 3상태 (true/false/indeterminate) |
| URI | 소 | fillText (밑줄, 링크 색상) | linkColor 테마 |
| Loading | 소 | fillRect (스켈레톤) | 애니메이션 없이 정적 스켈레톤 |
| Protected | 극소 | fillRect (bgCellMedium) | 배경색만 다름 |
| Bubble | 소 | roundedRect, fillText | 태그/버블 배열 |
| Image | 중 | drawImage, clip, roundedRect | 이미지 로딩은 JS 측, WASM은 렌더링만 |

**산출물**: `mydocs/working/task_m100_3_stage1.md`

### Stage 2: 셀 렌더링 디테일

**목표**: 선택/호버/포커스 시각 효과

- 셀 호버 효과 (globalAlpha 기반 배경 오버레이)
- 셀 선택 하이라이트 (accentLight 배경)
- 포커스 링 (선택 셀 테두리, accentColor)
- 필 핸들 (선택 범위 우하단 원형/사각형 마커)
- 셀 contentAlign 지원 (left, center, right)
- 셀 style "faded" 지원
- **텍스트 자동 맞춤 (Auto-fit Text)** — rhwp 폰트 메트릭 기술 활용
  - rhwp 프로젝트의 폰트 메트릭 시스템을 재활용
  - 대상 폰트: **맑은 고딕(Malgun Gothic)**, **나눔고딕(NanumGothic)**, **Noto Sans KR**, **Pretendard**
  - 4개 폰트 × Regular/Bold = 8개 변형의 글리프 너비 테이블을 rhwp 메트릭 데이터에서 추출하여 내장
  - **Rust에서 직접 텍스트 너비 계산** → Canvas `measureText()` JS 호출 제거
  - 텍스트 > 셀 가용 너비 시 장평(ratio) 자동 축소 (최소 70%까지)
  - 장평 70%에도 초과 시 말줄임(...) 처리
  - 렌더링: `ctx.transform(ratio, 0, 0, 1, tx, ty)` + `ctx.fillText()`
  - 셀별 fitMode: `"clip"` (클리핑만) | `"shrink"` (장평 축소) | `"ellipsis"` (말줄임)
  - **참조**: `rhwp/src/renderer/layout/text_measurement.rs`, `rhwp/src/renderer/font_metrics_data.rs`

**산출물**: `mydocs/working/task_m100_3_stage2.md`

### Stage 3: 헤더 기능 강화

**목표**: 헤더의 인터랙티브 기능

- 컬럼 아이콘 (SpriteManager 대응 — 기본 아이콘 세트)
- 메뉴 버튼 (⋯ 아이콘, hitTest 대응)
- 그룹 헤더 (2단 헤더 구조, walkGroups 대응)
- 컬럼 리사이즈 (드래그, 리사이즈 인디케이터)
- 헤더 호버 효과 (bgHeaderHovered)

**산출물**: `mydocs/working/task_m100_3_stage3.md`

### Stage 4: 입력 처리 아키텍처 (rhwp-studio 패턴)

**목표**: rhwp-studio와 동일한 모듈형 입력 처리 시스템 구축

현재 `demo/main.js`에 인라인으로 작성된 이벤트 핸들링을 구조화된 아키텍처로 리팩토링한다.

**아키텍처 구조** (rhwp-studio 패턴 대응):

```
demo/src/
├── input-handler.ts          # 메인 입력 오케스트레이터 (모드 관리)
├── input-handler-mouse.ts    # 마우스 이벤트 (클릭, 드래그, 호버)
├── input-handler-keyboard.ts # 키보드 이벤트 (셀 이동, 단축키)
├── input-handler-selection.ts # 범위 선택 드래그, Shift+클릭 확장
├── input-handler-resize.ts   # 컬럼 리사이즈 드래그
├── event-bus.ts              # EventBus (on/emit/removeAll)
├── grid-bridge.ts            # WASM GridRenderer 래핑 (hitTest, draw, scroll)
└── main.ts                   # 진입점 (Canvas 설정, InputHandler 연결)
```

**구현 항목**:
- **InputHandler** — 모드 상태 관리 (idle, cell-selecting, range-dragging, column-resizing, scrollbar-dragging)
- **InputHandlerMouse** — mousedown/mousemove/mouseup/click 분리, 모드별 디스패치
- **InputHandlerKeyboard** — 셀 이동, PageUp/Down, Home/End, 단축키 맵
- **InputHandlerSelection** — 드래그 범위 선택, Shift+클릭, 행/컬럼 전체 선택
- **InputHandlerResize** — 컬럼 경계 감지 (5px), 드래그 리사이즈, 커서 변경
- **EventBus** — selection-changed, scroll-changed, column-resized 등 이벤트
- **GridBridge** — WASM GridRenderer를 감싸고 JS 측 상태(선택, 호버) 관리

**rhwp-studio 대응표**:

| rhwp-studio | 그리드 POC |
|------------|-----------|
| input-handler.ts (모드 관리) | input-handler.ts (idle/selecting/resizing) |
| input-handler-mouse.ts | input-handler-mouse.ts |
| input-handler-keyboard.ts | input-handler-keyboard.ts |
| input-handler-table.ts (셀 선택) | input-handler-selection.ts |
| input-handler-picture.ts (리사이즈) | input-handler-resize.ts |
| event-bus.ts | event-bus.ts |
| WasmBridge | grid-bridge.ts |

**산출물**: `mydocs/working/task_m100_3_stage4.md`

### Stage 5: 범위 선택 및 인터랙션

**목표**: 입력 처리 아키텍처 위에 다중 셀 선택과 인터랙션 구현

- 범위 선택 (마우스 드래그로 사각형 범위)
- 행 선택 / 컬럼 선택
- Shift+클릭 범위 확장
- 선택 영역 시각 표시 (하이라이트 링, 점선/실선)
- 행 마커 컬럼 (체크박스/번호)
- 드래그 투 필 (필 핸들 드래그)

**산출물**: `mydocs/working/task_m100_3_stage5.md`

### Stage 6: 테마 시스템 완성

**목표**: GDG의 7단계 테마 오버라이드 계층 구현

- Theme 구조체 확장 (41개 속성 전체)
- 셀별 themeOverride
- 행별 getRowThemeOverride 콜백
- 컬럼별 themeOverride
- 그룹 테마
- 교대 행 색상 (stripe)
- bgCell 알파 블렌딩 머지 로직

**산출물**: `mydocs/working/task_m100_3_stage6.md`

### Stage 7: DPR 처리 및 성능 기초

**목표**: 고해상도 디스플레이 지원 및 기초 성능 최적화

- DPR(devicePixelRatio) 스케일링
- 텍스트 너비 계산: 내장 폰트 메트릭 우선, 미등록 폰트만 JS fallback + HashMap 캐시
- 뷰포트 밖 렌더링 건너뛰기 최적화 강화
- 컬럼 Prep 캐싱 (font/fillStyle 재설정 최소화)

**산출물**: `mydocs/working/task_m100_3_stage7.md`

## 제외 항목 (다음 타스크)

- Blit 스크롤 최적화 / Damage Tracking / 더블 버퍼링
- React 통합
- 에디터 오버레이 (셀 편집 UI)
- 복사/붙여넣기
- 컬럼 드래그 재정렬
- 무한 스크롤 / 행 그루핑
- 검색/필터
- 커스텀 셀 렌더러 확장 API

## 최종 산출물

| 문서 | 경로 |
|------|------|
| 수행계획서 | `mydocs/plans/task_m100_3.md` (본 문서) |
| 구현계획서 | `mydocs/plans/task_m100_3_impl.md` |
| Stage 1~7 보고서 | `mydocs/working/task_m100_3_stage{1..7}.md` |
| 최종 보고서 | `mydocs/report/task_m100_3_report.md` |

## 검증 기준

1. `cargo test` 전체 통과
2. 데모 페이지에서 7종 셀 타입 렌더링 확인
3. 입력 처리 모듈 구조 확인 (모드별 핸들러 분리, EventBus 동작)
4. 범위 선택 (드래그) + 하이라이트 링 표시
5. 컬럼 리사이즈 드래그 동작
6. 그룹 헤더 렌더링
7. 테마 오버라이드 (셀/행/컬럼별 다른 배경색)
8. 고해상도 디스플레이에서 선명한 렌더링

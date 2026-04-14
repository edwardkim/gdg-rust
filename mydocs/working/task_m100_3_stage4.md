# Stage 4 완료보고서: 입력 처리 아키텍처 (rhwp-studio 패턴)

## 기본 정보

| 항목 | 내용 |
|------|------|
| 타스크 번호 | #3 |
| 단계 | Stage 4 / 7 |
| 작성일 | 2026-04-15 |

## 완료 항목

### 4-1. 모듈 구조 리팩토링

기존 `demo/main.js` (단일 파일 400+ 행) → TypeScript 모듈 7개로 분리:

```
demo/
├── index.html                  # bundle.js 로드
├── bundle.js                   # esbuild 번들 출력 (26KB)
├── bundle.js.map               # 소스맵
└── src/
    ├── main.ts                 # 진입점 (데이터 생성, 모듈 조립, 이벤트 구독)
    ├── event-bus.ts            # EventBus (on/off/emit/removeAll)
    ├── grid-bridge.ts          # WASM GridRenderer 래핑
    ├── input-handler.ts        # 메인 입력 오케스트레이터
    ├── input-handler-mouse.ts  # 마우스 (클릭, 호버, 스크롤바, 리사이즈)
    ├── input-handler-keyboard.ts # 키보드 (셀 이동, 단축키)
    └── scrollbar.ts            # 스크롤바 렌더링/드래그
```

### 4-2. rhwp-studio 패턴 대응

| rhwp-studio | 그리드 POC | 역할 |
|------------|-----------|------|
| `input-handler.ts` (모드 관리) | `input-handler.ts` | attach/detach, 핸들러 조합 |
| `input-handler-mouse.ts` | `input-handler-mouse.ts` | mousedown/move/up/click/wheel |
| `input-handler-keyboard.ts` | `input-handler-keyboard.ts` | 방향키, Page, Home/End, Tab, Esc |
| `input-handler-table.ts` (셀 선택) | (keyboard 내 포함) | 셀 이동 + 자동 스크롤 |
| `input-handler-picture.ts` (리사이즈) | `input-handler-mouse.ts` 내 | 컬럼 리사이즈 드래그 |
| `event-bus.ts` | `event-bus.ts` | on/off/emit |
| `WasmBridge` | `grid-bridge.ts` | WASM 래핑 + 상태 관리 |

### 4-3. EventBus 이벤트 목록

| 이벤트 | 데이터 | 발생 시점 |
|--------|--------|----------|
| `selection-changed` | `{ col, row }` \| `null` | 셀 클릭, 키보드 이동, Esc |
| `hover-changed` | `{ col, row }` | 마우스 이동 |
| `scroll-changed` | `{ scrollX, scrollY }` | 스크롤 |
| `column-resized` | `{ col, width }` | 컬럼 리사이즈 드래그 |
| `cell-clicked` | `{ col, row }` | 셀 클릭 |
| `header-clicked` | `{ col }` | 헤더 클릭 |
| `redraw-requested` | void | 상태 변경 후 다시 그리기 |

### 4-4. GridBridge API

| 메서드 | 설명 |
|--------|------|
| `setColumns(cols)` | 컬럼 설정 |
| `setData(rows, data)` | 셀 데이터 설정 |
| `scrollTo(x, y)` / `scrollXTo` / `scrollYTo` | 스크롤 |
| `setHover(col, row)` | 호버 상태 → WASM |
| `setSelection(col, row)` | 선택 상태 → WASM |
| `resizeColumn(col, width)` | 컬럼 리사이즈 → WASM + JS 동기화 |
| `hitTest(x, y)` | 좌표 → 셀/헤더 |
| `getBounds(col, row)` | 셀 → 화면 좌표 |
| `draw()` | Canvas 렌더링 |

### 4-5. InputHandlerMouse 드래그 모드

| 모드 | 트리거 | 동작 |
|------|--------|------|
| `idle` | 기본 | 호버, 클릭 |
| `v-scrollbar` | 수직 스크롤바 mousedown | 드래그 → scrollYTo |
| `h-scrollbar` | 수평 스크롤바 mousedown | 드래그 → scrollXTo |
| `column-resize` | 헤더 경계 mousedown | 드래그 → resizeColumn |

### 4-6. InputHandlerKeyboard

| 키 | 동작 |
|----|------|
| ↑↓←→ | 셀 이동 + 자동 스크롤 |
| PageDown/Up | 페이지 단위 셀 이동 |
| Home/End | 행 처음/끝 컬럼 |
| Ctrl+Home/End | 그리드 처음/끝 |
| Tab/Shift+Tab | 다음/이전 셀 |
| Escape | 선택 해제 |

### 4-7. 빌드

- esbuild로 TypeScript → ESM 번들 (`demo/bundle.js`, 26KB)
- WASM import는 external로 처리 (`../pkg/grid_render.js`)
- 소스맵 포함

## 검증 결과

| 항목 | 결과 |
|------|------|
| 셀 클릭 → 선택 | 정상 |
| 키보드 셀 이동 | 정상 (자동 스크롤 포함) |
| 호버 하이라이트 | 셀/헤더/그룹 헤더 모두 정상 |
| 마우스 휠 스크롤 | 수직/수평 정상 |
| 스크롤바 드래그 | 수직/수평 정상 |
| 컬럼 리사이즈 | 드래그 정상 |
| Tab/Esc | 정상 |
| 기존 기능 회귀 | 없음 |

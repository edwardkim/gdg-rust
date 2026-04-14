# Stage 3 완료보고서: Rust/WASM 전환 관점 분석

## 기본 정보

| 항목 | 내용 |
|------|------|
| 타스크 번호 | #1 |
| 단계 | Stage 3 / 3 |
| 작성일 | 2026-04-15 |

---

## 3-1. Canvas 2D API 사용 패턴 목록

### 전체 API 인벤토리 (35종)

#### 경로/도형 (7종)

| API | 사용빈도 | web-sys 매핑 |
|-----|---------|-------------|
| `beginPath()` | 50회 | `CanvasRenderingContext2d::begin_path()` |
| `rect()` | 20회 | `CanvasRenderingContext2d::rect()` |
| `moveTo()` | 16회 | `CanvasRenderingContext2d::move_to()` |
| `lineTo()` | 16회 | `CanvasRenderingContext2d::line_to()` |
| `arc()` | 6회 | `CanvasRenderingContext2d::arc()` |
| `arcTo()` | 4회 | `CanvasRenderingContext2d::arc_to()` |
| `closePath()` | 2회 | `CanvasRenderingContext2d::close_path()` |

#### 채우기/테두리 (4종)

| API | 사용빈도 | web-sys 매핑 |
|-----|---------|-------------|
| `fill()` | 19회 | `CanvasRenderingContext2d::fill()` |
| `stroke()` | 14회 | `CanvasRenderingContext2d::stroke()` |
| `fillRect()` | 8회 | `CanvasRenderingContext2d::fill_rect()` |
| `strokeRect()` | 2회 | `CanvasRenderingContext2d::stroke_rect()` |

#### 상태 관리 (4종)

| API | 사용빈도 | web-sys 매핑 |
|-----|---------|-------------|
| `save()` | 14회 | `CanvasRenderingContext2d::save()` |
| `restore()` | 15회 | `CanvasRenderingContext2d::restore()` |
| `clip()` | 14회 | `CanvasRenderingContext2d::clip()` |
| `setLineDash()` | 3회 | `CanvasRenderingContext2d::set_line_dash()` (JsValue 배열 필요) |

#### 스타일 속성 (6종)

| API | 사용빈도 | web-sys 매핑 |
|-----|---------|-------------|
| `fillStyle` | 38회 | `set_fill_style()` (JsValue) |
| `globalAlpha` | 26회 | `set_global_alpha()` |
| `strokeStyle` | 15회 | `set_stroke_style()` (JsValue) |
| `lineWidth` | 11회 | `set_line_width()` |
| `lineCap` | 4회 | `set_line_cap()` |
| `lineJoin` | 1회 | `set_line_join()` |

#### 텍스트 (6종)

| API | 사용빈도 | web-sys 매핑 | 비고 |
|-----|---------|-------------|------|
| `measureText()` | 9회 | `CanvasRenderingContext2d::measure_text()` | ⚠ 가장 큰 병목 |
| `fillText()` | 9회 | `CanvasRenderingContext2d::fill_text()` | |
| `font` | 8회 | `set_font()` | CSS 폰트 문자열 파싱 |
| `textAlign` | 7회 | `set_text_align()` | |
| `textBaseline` | 3회 | `set_text_baseline()` | |
| `direction` | 2회 | `set_direction()` | RTL 지원 |

#### 이미지/변환 (4종)

| API | 사용빈도 | web-sys 매핑 |
|-----|---------|-------------|
| `drawImage()` | 8회 | `CanvasRenderingContext2d::draw_image_*()` |
| `imageSmoothingEnabled` | 5회 | `set_image_smoothing_enabled()` |
| `scale()` | 2회 | `CanvasRenderingContext2d::scale()` |
| `setTransform()` | 1회 | `CanvasRenderingContext2d::set_transform()` |

#### 효과 (4종)

| API | 사용빈도 | web-sys 매핑 |
|-----|---------|-------------|
| `shadowColor` | 2회 | `set_shadow_color()` |
| `shadowBlur` | 4회 | `set_shadow_blur()` |
| `shadowOffsetY` | 2회 | `set_shadow_offset_y()` |
| `createLinearGradient()` | 2회 | `CanvasRenderingContext2d::create_linear_gradient()` |

### web-sys 매핑 가능성 평가

**전체 35종 API 중 35종 모두 `web-sys` 크레이트의 `CanvasRenderingContext2d`로 매핑 가능.**

⚠ **주의 사항:**
- `fillStyle`/`strokeStyle`은 JsValue 변환 필요 (문자열 → `JsValue::from_str()`)
- `setLineDash()`는 JsValue 배열 생성 필요
- `measureText()`는 JS 호출 오버헤드가 큼 → 캐싱 전략 필수
- `drawImage()`는 `HtmlCanvasElement` 또는 `HtmlImageElement` 참조 필요

---

## 3-2. React 의존성 분리 분석

### 파일별 React 의존성 분류

#### ✅ 순수 함수 (React 런타임 의존 없음) — WASM 포팅 대상

| 파일 | 역할 | 함수 수 |
|------|------|---------|
| `data-grid-render.ts` | 메인 오케스트레이터 (drawGrid) | ~5 |
| `data-grid-render.blit.ts` | Blit 최적화 | ~3 |
| `data-grid-render.header.ts` | 헤더 렌더링 | ~6 |
| `data-grid-render.lines.ts` | 그리드라인 | ~4 |
| `data-grid-render.walk.ts` | 순회 유틸리티 | ~4 |
| `data-grid.render.rings.ts` | 선택 하이라이트 | ~3 |
| `draw-checkbox.ts` | 체크박스 렌더링 | ~1 |
| `draw-edit-hover-indicator.ts` | 호버 인디케이터 | ~1 |
| `math.ts` | 기하 유틸리티 | ~10 |

#### ⚠ 혼합 파일 (순수 함수 + React 코드)

| 파일 | 순수 함수 | React 의존 |
|------|----------|-----------|
| `data-grid-lib.ts` | 25+ 함수 (drawTextCell, roundedRect, getColumnIndexForX, getRowIndexForY 등) | `useMappedColumns()` 훅 1개 |
| `data-grid-render.cells.ts` | `drawCells()`, `drawCell()` | `React.CSSProperties` 타입 참조만 |
| `draw-grid-arg.ts` | 타입 정의만 | `React.MutableRefObject` 타입 참조만 |

#### ❌ React 필수 (JS에 유지)

| 코드 | 이유 |
|------|------|
| `useMappedColumns()` 훅 | React.useMemo 사용 |
| 셀 에디터 (provideEditor) | React JSX 컴포넌트 |
| `use-animation-queue.ts` | React.useCallback, useRef |
| `animation-manager.ts` | rAF 관리 (JS 런타임) |
| `data-grid.tsx` | React 컴포넌트, 이벤트 핸들러 |
| `data-editor.tsx` | React 컴포넌트, 상태 관리 |

### 분리 결론

```
전체 렌더링 코드의 약 90%가 순수 Canvas 드로잉 함수
→ React 런타임 의존 없이 Rust/WASM으로 포팅 가능
```

---

## 3-3. JS ↔ WASM 경계 설계

### 아키텍처 방안 비교

#### 방안 A: JS 레이아웃 유지 + WASM 드로잉만

```
JS 측 (유지)                    WASM 측 (신규)
─────────────                  ────────────
React 컴포넌트                  drawGrid()
이벤트 핸들러                   drawCells()
hitTest (기존 그대로)            drawHeaders()
레이아웃 계산                    drawLines()
애니메이션 관리                  drawRings()
에디터 오버레이                  셀 렌더러 draw()
                               
    JS가 레이아웃 계산 ──→ WASM에 전달 ──→ Canvas에 그리기
    마우스 이벤트 ──→ JS hitTest (기존 로직 그대로)
```

| 장점 | 단점 |
|------|------|
| hitTest 변경 불필요 | JS↔WASM 데이터 전달 오버헤드 |
| 점진적 마이그레이션 용이 | 레이아웃 로직 중복 가능성 |
| 에디터/이벤트 영향 없음 | WASM이 컬럼/행 위치를 받아야 함 |

#### 방안 B: WASM이 hitTest 함수도 export

```
JS 측                           WASM 측
─────────                      ────────
React 컴포넌트                  drawGrid() (레이아웃 + 드로잉)
이벤트 핸들러                   getColumnIndexForX()
에디터 오버레이                  getRowIndexForY()
                               computeBounds()
마우스 이벤트                    hitTest() ← WASM export
  │                             레이아웃 상태 소유
  └──→ wasm.hitTest(x, y) ──→ [col, row] 반환
```

| 장점 | 단점 |
|------|------|
| 레이아웃 정보 단일 소유 (WASM) | WASM↔JS 호출 빈도 높음 (마우스 이벤트마다) |
| 드로잉과 hitTest 일관성 보장 | 포팅 범위 확대 |
| 중복 로직 없음 | getRowHeight 콜백 전달 복잡 |

#### 방안 C: SharedArrayBuffer로 레이아웃 메타데이터 공유

```
JS 측                           WASM 측
─────────                      ────────
React 컴포넌트                  drawGrid()
이벤트 핸들러                   
                               렌더링 시 레이아웃 정보를
  SharedArrayBuffer ←───────── SharedArrayBuffer에 기록
  (컬럼 X좌표 배열,             
   행 Y좌표 배열,              
   스크롤 오프셋 등)            

마우스 이벤트
  └──→ JS에서 SharedArrayBuffer 읽어 hitTest
```

| 장점 | 단점 |
|------|------|
| 함수 호출 오버헤드 없음 | SharedArrayBuffer 브라우저 지원 (COOP/COEP 헤더) |
| 드로잉과 hitTest 일관성 | 동기화 문제 가능성 |
| JS hitTest 로직 간단 | 가변 행 높이 시 큰 버퍼 필요 |

### 권장 방안: **방안 B (WASM hitTest export)**

**이유:**
1. **핵심 요구사항 충족**: Rust 백엔드 드로잉 + 프론트 hitTest 인지
2. **일관성**: 드로잉과 hitTest가 같은 레이아웃 상태 사용 → 불일치 불가
3. **기존 hitTest 함수가 순수 함수**: `getColumnIndexForX`, `getRowIndexForY`, `computeBounds` 모두 React 의존 없음 → 포팅 용이
4. **마우스 이벤트 빈도**: mousemove 이벤트 시 WASM 호출이지만, 단순 산술 연산이므로 JS↔WASM 호출 오버헤드 무시 가능
5. **가변 행 높이 처리**: WASM이 행 높이 배열을 소유하면 콜백 불필요

**보완 사항:**
- `getRowHeight` 콜백: JS 함수를 WASM에서 호출하는 대신, 가시 영역 행 높이 배열을 미리 전달
- `effectiveCols` 계산: WASM에서 수행 (순수 함수)
- 이벤트 좌표 → 로컬 좌표 변환: JS에서 수행 후 로컬 좌표만 WASM에 전달

---

## 3-4. 성능 최적화 포팅 전략

### Blit 최적화

| TS 원본 | Rust/WASM 전략 |
|---------|---------------|
| `blitLastFrame()` - Canvas→Canvas 복사 | `ctx.drawImage(canvas, ...)` — web-sys에서도 동일하게 호출 가능 |
| `computeCanBlit()` - 18개 상태 비교 | Rust에서 구조체 PartialEq 비교로 더 효율적 |
| 더블 버퍼 교대 | OffscreenCanvas 사용 가능 (Worker 지원 시) |

**Blit은 WASM에서도 유효**: Canvas 복사는 브라우저 GPU가 처리하므로 JS/WASM 차이 없음

### Damage Tracking

| TS 원본 | Rust/WASM 전략 |
|---------|---------------|
| `CellSet` (Map 기반) | `HashSet<(i32, i32)>` — Rust 네이티브 해시셋 |
| `hasItemInRegion()` 교차 검사 | 비트마스크 기반 영역 교차 또는 R-tree |
| packed integer 큐 | 불필요 (Rust는 GC 없음, 튜플 사용) |

**Rust 이점**: GC 없으므로 packed integer 트릭 불필요, 직접 `(col, row)` 튜플 사용

### 텍스트 측정 최적화

| TS 원본 | Rust/WASM 전략 |
|---------|---------------|
| `measureTextCached()` | Rust HashMap 캐시 + `ctx.measure_text()` JS 호출 |
| 폰트별 baseline 캐시 | 한 번 측정 후 Rust 측에서 캐싱 |

**⚠ 병목**: `ctx.measureText()`는 JS 호출 필수 (브라우저 폰트 엔진). Rust 순수 계산 불가.
**대안**: 자주 사용하는 텍스트를 배치 측정하여 캐시 적중률 극대화

### 컬럼 Prep 캐싱

| TS 원본 | Rust/WASM 전략 |
|---------|---------------|
| PrepResult { font, fillStyle } | Rust에서 이전 상태 비교 후 조건부 `set_font()`/`set_fill_style()` 호출 |

**JS↔WASM 호출 최소화**: `set_font()` 같은 속성 설정은 JsValue 생성 비용이 있으므로 캐싱 유지

---

## 3-5. 포팅 우선순위 및 로드맵

### Phase 1: 기초 인프라 (POC 핵심)

| 순서 | 모듈 | Rust 구현 | 효과 |
|------|------|----------|------|
| 1 | Canvas 래퍼 | `web-sys::CanvasRenderingContext2d` 래퍼 구조체 | 타입 안전한 Canvas API |
| 2 | 기하 유틸리티 | `math.ts` → Rust (`pointInRect`, `intersectRect` 등) | 기반 함수 |
| 3 | 테마 구조체 | `Theme`/`FullTheme` → Rust struct | 스타일 데이터 |
| 4 | 셀/컬럼 타입 | `GridCell`, `GridColumn` → Rust enum/struct | 데이터 모델 |

### Phase 2: 핵심 렌더링

| 순서 | 모듈 | TS 원본 | 효과 |
|------|------|--------|------|
| 5 | 그리드라인 | `drawGridLines`, `overdrawStickyBoundaries` | 가장 단순한 렌더링 |
| 6 | 텍스트 드로잉 | `drawTextCell`, `roundedRect` | 핵심 셀 렌더링 |
| 7 | 체크박스 | `drawCheckbox` | Boolean 셀 |
| 8 | Walk 함수 | `walkColumns`, `walkRowsInCol` | 순회 로직 |
| 9 | 셀 렌더링 | `drawCells`, `drawCell` + 개별 셀 `draw()` | 전체 셀 렌더링 |
| 10 | 헤더 렌더링 | `drawGridHeaders`, `drawGroups` | 헤더 영역 |

### Phase 3: 최적화 및 hitTest

| 순서 | 모듈 | TS 원본 | 효과 |
|------|------|--------|------|
| 11 | hitTest | `getColumnIndexForX`, `getRowIndexForY`, `computeBounds` | 마우스 인터랙션 |
| 12 | Blit 최적화 | `blitLastFrame`, `computeCanBlit` | 스크롤 성능 |
| 13 | Damage Tracking | `CellSet` 기반 증분 렌더링 | 업데이트 성능 |
| 14 | 하이라이트/포커스 | `drawHighlightRings`, `drawFillHandle` | 선택 UI |

### Phase 4: 통합

| 순서 | 모듈 | 설명 |
|------|------|------|
| 15 | drawGrid 오케스트레이터 | 전체 렌더링 파이프라인 통합 |
| 16 | JS 바인딩 | wasm-bindgen으로 JS↔WASM 인터페이스 정의 |
| 17 | React 어댑터 | 기존 data-grid.tsx에서 WASM drawGrid 호출로 교체 |

### 점진적 마이그레이션 전략

```
Phase 1-2 동안: TS 코드 100% 유지, Rust 코드 병행 개발
  │
  ▼
Phase 3: Rust drawGrid가 동작하면 TS drawGrid와 A/B 비교
  │
  ▼
Phase 4: data-grid.tsx에서 draw 콜백을 WASM 함수로 교체
  ├── getMouseArgsForPosition 내부에서 WASM hitTest 호출
  ├── 에디터/이벤트 핸들러는 JS 유지
  └── getCellContent 콜백은 JS에서 호출 후 결과를 WASM에 전달
```

---

## JS ↔ WASM 인터페이스 설계 (초안)

```rust
// WASM에서 export할 함수들
#[wasm_bindgen]
pub fn draw_grid(
    ctx: &web_sys::CanvasRenderingContext2d,
    overlay_ctx: &web_sys::CanvasRenderingContext2d,
    // 레이아웃 파라미터 (JS에서 전달)
    width: f64, height: f64,
    cell_x_offset: i32, cell_y_offset: i32,
    translate_x: f64, translate_y: f64,
    // ... 추가 파라미터
);

#[wasm_bindgen]
pub fn hit_test(
    x: f64, y: f64,        // 로컬 좌표 (JS에서 DPR 보정 후)
    // 레이아웃 상태는 WASM 내부에서 관리
) -> JsValue;               // { kind, col, row, bounds } 반환

#[wasm_bindgen]
pub fn get_bounds_for_item(
    col: i32, row: i32,
) -> JsValue;               // Rectangle 반환

// 데이터 전달 (JS → WASM)
#[wasm_bindgen]
pub fn set_columns(columns_data: &JsValue);  // 컬럼 메타데이터
#[wasm_bindgen]
pub fn set_cell_content(col: i32, row: i32, cell_data: &JsValue);  // 셀 데이터
#[wasm_bindgen]
pub fn set_theme(theme_data: &JsValue);      // 테마
```

---

## 핵심 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| `measureText()` JS 호출 오버헤드 | 텍스트 셀 렌더링 병목 | 적극적 캐싱 + 배치 측정 |
| `fillStyle`/`font` JsValue 변환 | 매 셀 호출 시 비용 | PrepResult 캐싱 패턴 유지 |
| `getCellContent` 콜백 | JS→WASM→JS 왕복 | 가시 영역 셀 데이터 배치 전달 |
| 가변 행 높이 | `rowHeight(row)` 콜백 | 가시 영역 높이 배열 미리 계산 후 전달 |
| 이미지 로딩 | `imageLoader`는 JS 전용 | 이미지 로딩은 JS 유지, 로드 완료 후 WASM에 drawImage 호출 |
| 커스텀 셀 렌더러 | JS로 작성된 사용자 렌더러 | fallback: 커스텀 셀은 JS에서 렌더링 |

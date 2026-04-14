# 구현 계획서: Task #3 - GDG 디테일 기능 레플리카

## 기본 정보

| 항목 | 내용 |
|------|------|
| 타스크 번호 | #3 |
| 마일스톤 | M100 (POC) |
| 작성일 | 2026-04-15 |
| 수행계획서 | `mydocs/plans/task_m100_3.md` |
| 단계 수 | 7단계 |

---

## Stage 1: 셀 타입 확장

### 1-1. CellContent enum 확장 (`types.rs`)

```rust
pub enum CellContent {
    Text(String),
    Number { display: String, align: ContentAlign },
    Boolean { value: BooleanState, max_size: Option<f64> },
    Uri { display: String, data: String },
    Bubble(Vec<String>),
    Loading { skeleton_width: Option<f64> },
    Protected,
    Image { urls: Vec<String>, rounding: f64 },
    Empty,
}

pub enum BooleanState { True, False, Indeterminate, Empty }
pub enum ContentAlign { Left, Center, Right }
```

### 1-2. Number 셀 렌더러 (`render/cells.rs`)

- `draw_number_cell(canvas, text, rect, align, theme)`
- 우측 정렬 기본: `ctx.set_text_align("right")`, x = right - padding
- 포맷된 displayData를 그대로 렌더링 (포맷팅은 JS 측)

### 1-3. Boolean 셀 렌더러 (`render/cells_boolean.rs`)

- `draw_boolean_cell(canvas, state, rect, theme, hover_amount)`
- 3상태: True(체크마크), False(빈 박스), Indeterminate(가로선)
- `roundedRect` → `fill`(True/Indeterminate) 또는 `stroke`(False)
- 체크마크: `moveTo/lineTo/stroke` (lineJoin=round, lineCap=round)
- GDG 원본 좌표 비율 참조: `boolean-cell.tsx`, `draw-checkbox.ts`

### 1-4. URI 셀 렌더러

- `draw_uri_cell(canvas, display, rect, theme)`
- `fillText` + 밑줄 (lineTo), 색상: `theme.link_color`

### 1-5. Bubble 셀 렌더러

- `draw_bubble_cell(canvas, tags, rect, theme)`
- 태그별: `roundedRect` + `fill`(bgBubble) + `fillText`(textBubble)
- 수평 배치, 넘치면 클리핑

### 1-6. Loading 셀 렌더러

- `draw_loading_cell(canvas, rect, theme, skeleton_width)`
- 둥근 회색 막대 (`roundedRect` + `fill` with bgCellMedium)

### 1-7. Protected 셀 렌더러

- 배경색만 `bgCellMedium`으로 변경

### 1-8. Image 셀 렌더러

- `draw_image_cell(canvas, images, rect, theme, rounding)`
- 이미지는 JS에서 `HTMLImageElement`로 로드 → WASM에 참조 전달
- `ctx.drawImage()` + 라운딩 시 `roundedRect` → `clip` → `drawImage` → `restore`
- JS 측 ImageLoader 간이 구현 (데모용)

### 1-9. 데모 업데이트

- 컬럼별 다른 셀 타입 배정
- Boolean 컬럼, URI 컬럼, Bubble 컬럼 추가

### 1-10. 단위 테스트

- CellContent enum 직렬화/역직렬화 테스트
- BooleanState 각 상태별 테스트

---

## Stage 2: 셀 렌더링 디테일

### 2-1. 호버 효과

- GridRenderer에 `hover_cell: Option<(usize, usize)>` 상태 추가
- `set_hover_cell(col, row)` WASM export
- 호버 셀 배경: `globalAlpha` 조절 + 오버레이 fillRect
- JS mousemove → hitTest → `set_hover_cell`

### 2-2. 선택 하이라이트

- 선택 셀 배경: `accentLight` 색상으로 fillRect
- 선택 범위 전체에 적용

### 2-3. 포커스 링

- 선택 셀 테두리: `strokeRect` with `accentColor`, lineWidth=2
- 현재 JS에서 하던 하이라이트를 WASM 렌더링으로 이동

### 2-4. 필 핸들

- 선택 범위 우하단에 작은 원/사각형 마커
- `ctx.arc()` 또는 `ctx.rect()` + `fill`(accentColor) + `stroke`(bgCell)

### 2-5. contentAlign 지원

- `ContentAlign::Left | Center | Right`
- 텍스트 x 좌표 계산: left=padding, center=width/2, right=width-padding
- `ctx.set_text_align()` 대응

### 2-6. 폰트 메트릭 내장 및 텍스트 자동 맞춤

**rhwp에서 추출할 데이터:**

```
rhwp/src/renderer/font_metrics_data.rs에서:
  - FONT_4, FONT_5 (Malgun Gothic Regular/Bold)
  - FONT_8, FONT_9 (NanumGothic Regular/Bold)
  - FONT_12, FONT_13 (Noto Sans KR Regular/Bold)
  - FONT_593, FONT_594 (Pretendard Regular/Bold)
```

**새 파일**: `crates/grid-render/src/font_metrics.rs`

```rust
pub struct FontMetric {
    pub name: &'static str,
    pub bold: bool,
    pub em_size: u16,
    pub latin_ranges: &'static [LatinRange],
    pub hangul: Option<&'static HangulMetric>,
}

pub struct LatinRange {
    pub start: u32,
    pub end: u32,
    pub widths: &'static [u16],
}

pub struct HangulMetric {
    pub group_widths: &'static [u16; 72],  // 72개 초/중/종 조합 그룹
}

/// 문자 너비 계산 (px)
pub fn measure_char_width(
    font_name: &str, bold: bool, ch: char, font_size: f64
) -> f64 { ... }

/// 텍스트 전체 너비 계산 (px)
pub fn measure_text_width(
    font_name: &str, bold: bool, text: &str, font_size: f64,
    letter_spacing: f64
) -> f64 { ... }
```

**텍스트 자동 맞춤 렌더링 로직** (`render/cells.rs`):

```rust
fn draw_text_auto_fit(canvas, text, rect, theme, fit_mode) {
    let available = rect.width - padding * 2;
    let text_width = measure_text_width(font, bold, text, font_size, 0.0);

    match fit_mode {
        FitMode::Clip => {
            // 기존: 클리핑만
            canvas.clip(); canvas.fill_text(text, x, y);
        }
        FitMode::Shrink => {
            if text_width <= available {
                canvas.fill_text(text, x, y);
            } else {
                let ratio = (available / text_width).max(0.7);
                if ratio >= 0.7 {
                    // 장평 축소
                    canvas.save();
                    canvas.transform(ratio, 0, 0, 1, x, y);
                    canvas.fill_text(text, 0, 0);
                    canvas.restore();
                } else {
                    // 말줄임
                    draw_ellipsis(canvas, text, available, ...);
                }
            }
        }
        FitMode::Ellipsis => {
            draw_ellipsis(canvas, text, available, ...);
        }
    }
}
```

### 2-7. 단위 테스트

- `measure_char_width`: 한글, 영문, 숫자 각각 테스트
- `measure_text_width`: 혼합 문자열 테스트
- 장평 비율 계산 테스트
- 말줄임 처리 테스트

---

## Stage 3: 헤더 기능 강화

### 3-1. 컬럼 아이콘

- Column에 `icon: Option<String>` 필드 추가
- 기본 아이콘 세트: 텍스트/숫자/체크박스/이미지/URI 등
- SVG path 기반 아이콘 렌더링 또는 Unicode 심볼 사용 (POC 단계)
- 헤더 레이아웃: `[icon 18px][gap 4px][title text]`

### 3-2. 메뉴 버튼

- Column에 `has_menu: bool` 필드 추가
- 헤더 우측에 ⋯ (세로 점 3개) 아이콘 렌더링
- hitTest에 `HeaderMenu { col }` 결과 추가
- 메뉴 버튼 영역: 우측 28px

### 3-3. 그룹 헤더

- Column에 `group: Option<String>` 필드 추가
- Theme에 `group_header_height: f64` 추가
- `draw_group_headers(canvas, columns, theme, scroll_x)`
  - 같은 그룹의 연속 컬럼을 하나로 묶어 렌더링
  - walkGroups 패턴: 연속 동일 그룹명 + 동일 sticky 상태
- 총 헤더 높이: `group_header_height + header_height`
- hitTest에 `GroupHeader { col, group }` 결과 추가

### 3-4. 컬럼 리사이즈

- 헤더 셀 경계 5px 이내 감지 → hitTest에 `isEdge: bool` 추가
- JS에서 cursor: "col-resize" 변경
- mousedown → 드래그 → 컬럼 너비 갱신 → 재렌더링
- 리사이즈 인디케이터: 수직 점선 (`setLineDash`)
- WASM export: `resize_column(col, new_width)`

### 3-5. 헤더 호버 효과

- hover_cell의 row == -1 (헤더) 시 `bgHeaderHovered` 배경
- 메뉴 버튼 호버 시 별도 하이라이트

---

## Stage 4: 입력 처리 아키텍처 (rhwp-studio 패턴)

### 4-1. 프로젝트 구조 리팩토링

```
demo/
├── index.html
└── src/
    ├── main.ts              # 진입점
    ├── event-bus.ts         # EventBus (on/emit/removeAll)
    ├── grid-bridge.ts       # WASM GridRenderer 래핑
    ├── input-handler.ts     # 메인 입력 오케스트레이터
    ├── input-handler-mouse.ts
    ├── input-handler-keyboard.ts
    ├── input-handler-selection.ts
    ├── input-handler-resize.ts
    └── scrollbar.ts         # 스크롤바 렌더링/드래그
```

빌드: 간단한 번들러 사용 (esbuild 또는 TypeScript tsc → ESM)

### 4-2. EventBus (`event-bus.ts`)

```typescript
class EventBus {
    on(event: string, handler: Function): void;
    emit(event: string, ...args: any[]): void;
    off(event: string, handler: Function): void;
    removeAll(): void;
}

// 이벤트 목록:
// "selection-changed" → { cell, range }
// "hover-changed" → { col, row }
// "scroll-changed" → { scrollX, scrollY }
// "column-resized" → { col, width }
// "cell-clicked" → { col, row, bounds }
// "header-menu-clicked" → { col }
// "redraw-requested" → void
```

### 4-3. GridBridge (`grid-bridge.ts`)

```typescript
class GridBridge {
    private renderer: GridRenderer;
    private ctx: CanvasRenderingContext2D;

    draw(): void;
    hitTest(x: number, y: number): HitTestResult;
    getBounds(col: number, row: number): Rectangle;
    setHoverCell(col: number, row: number): void;
    setSelection(cell: { col, row }, range?: { ... }): void;
    scrollTo(x: number, y: number): void;
    resizeColumn(col: number, width: number): void;
    // ... WASM 호출 래핑
}
```

### 4-4. InputHandler — 모드 관리

```typescript
type InputMode =
    | "idle"
    | "cell-selecting"      // 셀 클릭/키보드 이동
    | "range-dragging"      // 범위 선택 드래그
    | "column-resizing"     // 컬럼 리사이즈 드래그
    | "scrollbar-v-drag"    // 수직 스크롤바 드래그
    | "scrollbar-h-drag"    // 수평 스크롤바 드래그
    | "fill-handle-drag";   // 필 핸들 드래그

class InputHandler {
    private mode: InputMode = "idle";
    private bus: EventBus;
    private bridge: GridBridge;
    private mouse: InputHandlerMouse;
    private keyboard: InputHandlerKeyboard;
    private selection: InputHandlerSelection;
    private resize: InputHandlerResize;

    attach(canvas: HTMLCanvasElement): void;
    detach(): void;
}
```

### 4-5. InputHandlerMouse

- mousedown: 모드 전환 (스크롤바/리사이즈/셀 선택 판별)
- mousemove: 모드별 디스패치 + 호버 갱신
- mouseup: 모드 종료
- click: 셀 클릭 → EventBus emit
- wheel: 스크롤

### 4-6. InputHandlerKeyboard

- 셀 이동: ↑↓←→, PageUp/Down, Home/End
- Shift+방향키: 범위 확장
- Tab/Shift+Tab: 다음/이전 셀
- Enter: 셀 활성화 (향후 에디터 연동)
- Escape: 선택 해제
- Ctrl+A: 전체 선택

### 4-7. InputHandlerSelection

- 드래그 시작 → 시작 셀 기록
- 드래그 중 → hitTest로 현재 셀 → 범위 갱신 → EventBus emit
- Shift+클릭 → 현재 선택에서 확장
- 더블클릭 → 셀 활성화 이벤트

### 4-8. InputHandlerResize

- 헤더 셀 경계 5px 이내 감지 (hitTest isEdge)
- mousedown → 드래그 시작 (시작 너비 기록)
- mousemove → 새 너비 계산 → `bridge.resizeColumn()`
- mouseup → 드래그 종료 → EventBus "column-resized" emit

---

## Stage 5: 범위 선택 및 인터랙션

### 5-1. 선택 상태 모델 (WASM 측)

```rust
pub struct GridSelection {
    pub current_cell: Option<(usize, usize)>,      // 포커스 셀
    pub range: Option<SelectionRange>,              // 선택 범위
    pub rows: Vec<usize>,                           // 선택된 행
    pub columns: Vec<usize>,                        // 선택된 컬럼
}

pub struct SelectionRange {
    pub x: usize,       // 시작 컬럼
    pub y: usize,       // 시작 행
    pub width: usize,   // 컬럼 수
    pub height: usize,  // 행 수
}
```

### 5-2. 범위 선택 렌더링

- 선택 범위: `accentLight` 배경 채우기
- 하이라이트 링: `strokeRect` with `accentColor` (실선)
- 비활성 범위: 점선 (`setLineDash([5, 3])`)
- GDG `drawHighlightRings` 패턴 참조

### 5-3. 행 마커 컬럼

- 자동 0번 컬럼으로 추가 (옵션)
- 체크박스 + 행 번호 렌더링
- 클릭 → 행 전체 선택

### 5-4. 필 핸들 드래그

- 선택 범위 우하단 마커 감지 (hitTest)
- 드래그 → 범위 확장 → "fill-range" 이벤트

---

## Stage 6: 테마 시스템 완성

### 6-1. Theme 구조체 확장

GDG의 41개 속성 전체 + 그리드 전용 확장:

```rust
pub struct Theme {
    // 색상 (24개)
    pub accent_color: String,
    pub accent_fg: String,
    pub accent_light: String,
    pub text_dark: String,
    pub text_medium: String,
    pub text_light: String,
    pub text_bubble: String,
    pub bg_icon_header: String,
    pub fg_icon_header: String,
    pub text_header: String,
    pub text_header_selected: String,
    pub text_group_header: Option<String>,
    pub bg_group_header: Option<String>,
    pub bg_group_header_hovered: Option<String>,
    pub bg_cell: String,
    pub bg_cell_medium: String,
    pub bg_header: String,
    pub bg_header_has_focus: String,
    pub bg_header_hovered: String,
    pub bg_bubble: String,
    pub bg_bubble_selected: String,
    pub bg_search_result: String,
    pub border_color: String,
    pub link_color: String,
    // 간격 (5개)
    pub cell_horizontal_padding: f64,
    pub cell_vertical_padding: f64,
    pub header_icon_size: f64,
    pub checkbox_max_size: f64,
    pub line_height: f64,
    // 폰트 (5개)
    pub header_font_style: String,
    pub base_font_style: String,
    pub marker_font_style: String,
    pub font_family: String,
    pub editor_font_size: String,
    // 버블 (3개)
    pub bubble_height: f64,
    pub bubble_padding: f64,
    pub bubble_margin: f64,
    // 크기
    pub header_height: f64,
    pub group_header_height: f64,
    pub row_height: f64,
    // 선택적
    pub horizontal_border_color: Option<String>,
    pub header_bottom_border_color: Option<String>,
    pub rounding_radius: Option<f64>,
}
```

### 6-2. 테마 오버라이드 계층

```rust
pub struct ThemeOverride {
    // Theme의 모든 필드를 Option으로
    pub bg_cell: Option<String>,
    pub text_dark: Option<String>,
    // ... 필요한 필드만
}

fn merge_theme(base: &Theme, override: &ThemeOverride) -> Theme {
    // bgCell만 알파 블렌딩, 나머지는 덮어쓰기
}
```

적용 순서: 기본 → 전역 → 그룹 → 컬럼 → 행 → 추가행 → 셀

### 6-3. 교대 행 색상

- `getRowThemeOverride` JS 콜백 → 짝수/홀수 행 다른 bgCell
- WASM export: `set_row_theme_override(row, theme_override)` 또는 JS에서 배치 전달

---

## Stage 7: DPR 처리 및 성능 기초

### 7-1. DPR 스케일링

```rust
pub fn draw_with_dpr(canvas, ctx, width, height, dpr) {
    // Canvas 물리 크기: width * dpr, height * dpr
    // CSS 크기: width, height
    // ctx.scale(dpr, dpr)
    // 이후 모든 드로잉은 논리 좌표
}
```

- JS에서 `window.devicePixelRatio` → WASM `draw()` 파라미터로 전달
- 스크롤 중 DPR 다운스케일: Firefox=1, Safari=2, 기본=ceil(dpr)

### 7-2. 텍스트 너비 계산 최적화

- 내장 폰트 메트릭 → JS 호출 없이 Rust에서 계산 (Stage 2에서 구현)
- 미등록 폰트 fallback: JS `measureText()` → HashMap 캐시 (LRU 256 엔트리)

### 7-3. 뷰포트 밖 렌더링 스킵

- 행: scroll_y 기반 시작/종료 행 계산 → 범위 밖 건너뛰기 (기존)
- 컬럼: scroll_x 기반 시작/종료 컬럼 계산 → 범위 밖 건너뛰기 (기존)
- 셀 클리핑 최적화: 뷰포트 완전 내부 셀은 클리핑 생략

### 7-4. 컬럼 Prep 캐싱

- 같은 컬럼의 연속 셀: font, fillStyle 변경 여부 확인 후 조건부 설정
- Rust에서 이전 상태를 저장하여 불필요한 `set_font()`/`set_fill_style()` 호출 방지

---

## 최종 산출물 요약

| 순서 | 문서 | 경로 |
|------|------|------|
| 1 | 수행계획서 | `mydocs/plans/task_m100_3.md` |
| 2 | 구현계획서 | `mydocs/plans/task_m100_3_impl.md` (본 문서) |
| 3~9 | Stage 1~7 완료보고서 | `mydocs/working/task_m100_3_stage{1..7}.md` |
| 10 | 최종 보고서 | `mydocs/report/task_m100_3_report.md` |

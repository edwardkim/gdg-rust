# 구현 계획서: Task #2 - Rust/WASM 기반 그리드 렌더링 POC 구현

## 기본 정보

| 항목 | 내용 |
|------|------|
| 타스크 번호 | #2 |
| 마일스톤 | M100 (POC) |
| 작성일 | 2026-04-15 |
| 수행계획서 | `mydocs/plans/task_m100_2.md` |
| 단계 수 | 3단계 |

---

## Stage 1: Rust 프로젝트 셋업 및 기본 타입

### 1-1. Cargo.toml 및 프로젝트 구조 생성

**생성 파일**: `crates/grid-render/Cargo.toml`

```toml
[package]
name = "grid-render"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"
serde = { version = "1", features = ["derive"] }
serde-wasm-bindgen = "0.6"

[dependencies.web-sys]
version = "0.3"
features = [
    "CanvasRenderingContext2d",
    "HtmlCanvasElement",
    "TextMetrics",
    "Document",
    "Window",
    "console",
]

[dev-dependencies]
wasm-bindgen-test = "0.3"
```

**디렉토리 구조**:
```
crates/grid-render/src/
├── lib.rs              # wasm-bindgen 엔트리, GridRenderer 구조체 export
├── types.rs            # Rectangle, Item, Theme, Column, CellContent
├── canvas.rs           # CanvasRenderingContext2d 래퍼
├── render/
│   ├── mod.rs          # draw_grid 진입점
│   ├── lines.rs        # 그리드라인 드로잉
│   ├── header.rs       # 헤더 렌더링
│   └── cells.rs        # 텍스트 셀 렌더링
└── hit_test.rs         # hit_test, get_bounds_for_item
```

### 1-2. 기본 타입 정의 (`types.rs`)

```rust
// 기하
pub struct Rectangle { pub x: f64, pub y: f64, pub width: f64, pub height: f64 }

// 셀 좌표
pub struct Item { pub col: i32, pub row: i32 }

// 테마 (최소)
pub struct Theme {
    pub bg_cell: String,           // "#FFFFFF"
    pub bg_header: String,         // "#F7F7F8"
    pub text_dark: String,         // "#313139"
    pub text_header: String,       // "#313139"
    pub border_color: String,      // "rgba(115,116,131,0.16)"
    pub accent_color: String,      // "#4F5DFF"
    pub header_font: String,       // "600 13px Inter, sans-serif"
    pub base_font: String,         // "13px Inter, sans-serif"
    pub cell_horizontal_padding: f64,  // 8.0
    pub cell_vertical_padding: f64,    // 3.0
    pub header_height: f64,        // 36.0
    pub row_height: f64,           // 34.0
}

// 컬럼
pub struct Column {
    pub title: String,
    pub width: f64,
    pub source_index: usize,
}

// 셀 콘텐츠 (POC: 텍스트만)
pub enum CellContent {
    Text(String),
    Empty,
}
```

### 1-3. Canvas 래퍼 (`canvas.rs`)

`web_sys::CanvasRenderingContext2d`에 대한 얇은 래퍼:
- `set_fill_style_str(color: &str)` — JsValue 변환 캡슐화
- `set_stroke_style_str(color: &str)`
- `set_font(font: &str)`
- `fill_rect(x, y, w, h)`
- `stroke_rect(x, y, w, h)`
- `fill_text(text, x, y)`
- `measure_text(text) -> f64` (width)
- `begin_path()`, `move_to()`, `line_to()`, `stroke()`
- `save()`, `restore()`, `clip()`
- `set_text_align(align)`, `set_text_baseline(baseline)`

목적: JsValue 변환 비용을 한 곳에서 관리하고, 향후 테스트 시 mock 가능한 trait 분리 준비

### 1-4. wasm-pack 빌드 확인

```bash
cd crates/grid-render && wasm-pack build --target web --out-dir ../../pkg
```

빈 모듈이라도 `.wasm` + `.js` 생성 확인

### 1-5. Docker 빌드 설정

**생성 파일**:
- `Dockerfile.wasm` — Rust + wasm-pack 이미지
- `docker-compose.yml` — WASM 빌드 서비스
- `.env.docker.example` — 환경변수 예시

### 1-6. .gitignore 업데이트

추가 항목:
```
pkg/
target/
output/
*.wasm
```

**Stage 1 검증**: `wasm-pack build` 성공, `pkg/` 에 `.wasm` + `.js` 생성

---

## Stage 2: 그리드 드로잉 구현

### 2-1. GridRenderer 구조체 (`lib.rs`)

```rust
#[wasm_bindgen]
pub struct GridRenderer {
    columns: Vec<Column>,
    rows: usize,
    cells: Vec<Vec<CellContent>>,  // [row][col]
    theme: Theme,
}

#[wasm_bindgen]
impl GridRenderer {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self { ... }

    pub fn set_columns(&mut self, columns: JsValue) { ... }
    pub fn set_data(&mut self, rows: usize, data: JsValue) { ... }
    pub fn set_theme(&mut self, theme: JsValue) { ... }

    pub fn draw(&self, ctx: &web_sys::CanvasRenderingContext2d,
                width: f64, height: f64) { ... }
}
```

### 2-2. draw_grid 오케스트레이터 (`render/mod.rs`)

드로잉 순서 (Task #1 분석 기반, 최소 버전):
1. 배경 채우기 (`ctx.fill_rect(0, 0, width, height)`)
2. 헤더 렌더링 (`render::header::draw_header`)
3. 셀 렌더링 (`render::cells::draw_cells`)
4. 그리드라인 (`render::lines::draw_lines`)

### 2-3. 그리드라인 (`render/lines.rs`)

```rust
pub fn draw_lines(ctx, columns, rows, theme) {
    // 수평선: 헤더 하단 + 각 행 하단
    // 수직선: 각 컬럼 우측
    ctx.set_stroke_style(theme.border_color);
    ctx.set_line_width(1.0);
    for each line:
        ctx.begin_path();
        ctx.move_to(x1, y1);
        ctx.line_to(x2, y2);
        ctx.stroke();
}
```

### 2-4. 헤더 렌더링 (`render/header.rs`)

```rust
pub fn draw_header(ctx, columns, theme) {
    // 1. 헤더 배경 채우기
    ctx.set_fill_style(theme.bg_header);
    ctx.fill_rect(0, 0, total_width, header_height);

    // 2. 각 컬럼 헤더 텍스트
    ctx.set_fill_style(theme.text_header);
    ctx.set_font(theme.header_font);
    ctx.set_text_align("left");
    ctx.set_text_baseline("middle");
    for col in columns:
        ctx.fill_text(col.title, x + padding, header_height / 2);
}
```

### 2-5. 텍스트 셀 렌더링 (`render/cells.rs`)

```rust
pub fn draw_cells(ctx, columns, rows, cells, theme) {
    ctx.set_fill_style(theme.text_dark);
    ctx.set_font(theme.base_font);
    ctx.set_text_align("left");
    ctx.set_text_baseline("middle");

    for row in 0..rows:
        let y = header_height + row * row_height;
        for (col_idx, col) in columns.iter().enumerate():
            let x = col_x_position;
            match cells[row][col_idx]:
                CellContent::Text(text) =>
                    ctx.fill_text(text, x + padding, y + row_height / 2);
                CellContent::Empty => {}
}
```

### 2-6. HTML 데모 페이지 (`demo/index.html`, `demo/main.js`)

```html
<canvas id="grid" width="800" height="600"></canvas>
<div id="info">Click a cell...</div>
```

```javascript
import init, { GridRenderer } from '../pkg/grid_render.js';

await init();
const renderer = new GridRenderer();
renderer.set_columns([...]);
renderer.set_data(10, [...]);

const canvas = document.getElementById('grid');
const ctx = canvas.getContext('2d');
renderer.draw(ctx, 800, 600);
```

**Stage 2 검증**: 브라우저에서 데모 페이지 열었을 때 헤더 + 셀 + 그리드라인이 보이는 그리드 확인

---

## Stage 3: hitTest 구현 및 통합

### 3-1. hit_test 함수 (`hit_test.rs`)

```rust
pub fn hit_test(x: f64, y: f64, columns: &[Column], rows: usize, theme: &Theme)
    -> HitTestResult
{
    // 1. 헤더 영역 확인
    if y <= theme.header_height {
        let col = get_column_for_x(x, columns);
        return HitTestResult::Header { col };
    }

    // 2. 셀 영역
    let col = get_column_for_x(x, columns);
    let row = get_row_for_y(y, theme.header_height, theme.row_height, rows);

    match (col, row) {
        (Some(c), Some(r)) => HitTestResult::Cell { col: c, row: r },
        _ => HitTestResult::OutOfBounds,
    }
}

fn get_column_for_x(x: f64, columns: &[Column]) -> Option<usize> {
    let mut cx = 0.0;
    for (i, col) in columns.iter().enumerate() {
        if x <= cx + col.width { return Some(i); }
        cx += col.width;
    }
    None
}

fn get_row_for_y(y: f64, header_height: f64, row_height: f64, rows: usize)
    -> Option<usize>
{
    if y <= header_height { return None; }
    let row = ((y - header_height) / row_height) as usize;
    if row < rows { Some(row) } else { None }
}
```

### 3-2. get_bounds_for_item 함수

```rust
pub fn get_bounds_for_item(col: usize, row: i32, columns: &[Column], theme: &Theme)
    -> Option<Rectangle>
{
    if col >= columns.len() { return None; }

    let x = columns[..col].iter().map(|c| c.width).sum::<f64>();
    let width = columns[col].width;

    if row == -1 {
        // 헤더
        Some(Rectangle { x, y: 0.0, width, height: theme.header_height })
    } else if row >= 0 {
        let y = theme.header_height + (row as f64) * theme.row_height;
        Some(Rectangle { x, y, width, height: theme.row_height })
    } else {
        None
    }
}
```

### 3-3. WASM export (`lib.rs`)

```rust
#[wasm_bindgen]
impl GridRenderer {
    pub fn hit_test(&self, x: f64, y: f64) -> JsValue {
        let result = hit_test::hit_test(x, y, &self.columns, self.rows, &self.theme);
        serde_wasm_bindgen::to_value(&result).unwrap()
    }

    pub fn get_bounds(&self, col: usize, row: i32) -> JsValue {
        let result = hit_test::get_bounds_for_item(col, row, &self.columns, &self.theme);
        serde_wasm_bindgen::to_value(&result).unwrap()
    }
}
```

### 3-4. HTML 데모에 hitTest 통합

```javascript
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const result = renderer.hit_test(x, y);
    const info = document.getElementById('info');

    if (result.kind === 'cell') {
        const bounds = renderer.get_bounds(result.col, result.row);
        info.textContent = `Cell [${result.col}, ${result.row}] bounds: ${JSON.stringify(bounds)}`;

        // 선택 셀 하이라이트 (선택 사항)
        renderer.draw(ctx, 800, 600);  // 다시 그리기
        ctx.strokeStyle = '#4F5DFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    } else if (result.kind === 'header') {
        info.textContent = `Header: column ${result.col}`;
    } else {
        info.textContent = 'Out of bounds';
    }
});
```

### 3-5. 단위 테스트

```rust
#[cfg(test)]
mod tests {
    // hit_test: 셀 영역 클릭 → 올바른 [col, row]
    // hit_test: 헤더 영역 클릭 → Header 결과
    // hit_test: 영역 밖 → OutOfBounds
    // get_bounds_for_item: 유효한 셀 → Rectangle
    // get_bounds_for_item: 헤더 → Rectangle (row == -1)
    // get_column_for_x: 경계값 테스트
    // get_row_for_y: 경계값 테스트
}
```

**Stage 3 검증**:
1. `cargo test` 통과
2. 브라우저 데모에서 셀 클릭 → 올바른 `[col, row]` 표시
3. 헤더 클릭 → 올바른 컬럼 인덱스 표시
4. 그리드 밖 클릭 → "Out of bounds" 표시

---

## 최종 산출물 요약

| 순서 | 문서 | 경로 |
|------|------|------|
| 1 | 수행계획서 | `mydocs/plans/task_m100_2.md` |
| 2 | 구현계획서 | `mydocs/plans/task_m100_2_impl.md` (본 문서) |
| 3 | Stage 1 완료보고서 | `mydocs/working/task_m100_2_stage1.md` |
| 4 | Stage 2 완료보고서 | `mydocs/working/task_m100_2_stage2.md` |
| 5 | Stage 3 완료보고서 | `mydocs/working/task_m100_2_stage3.md` |
| 6 | 최종 보고서 | `mydocs/working/task_m100_2_report.md` |

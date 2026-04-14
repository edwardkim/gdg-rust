# Stage 1 완료보고서: Rust 프로젝트 셋업 및 기본 타입

## 기본 정보

| 항목 | 내용 |
|------|------|
| 타스크 번호 | #2 |
| 단계 | Stage 1 / 3 |
| 작성일 | 2026-04-15 |

## 완료 항목

### 1-1. Cargo.toml 및 프로젝트 구조

- `Cargo.toml` (루트 workspace) + `crates/grid-render/Cargo.toml` 생성
- 의존성: wasm-bindgen 0.2, web-sys 0.3, js-sys 0.3, serde 1.0, serde-wasm-bindgen 0.6
- web-sys features: CanvasRenderingContext2d, HtmlCanvasElement, TextMetrics, console

### 1-2. 기본 타입 정의 (`types.rs`)

| 타입 | 설명 |
|------|------|
| `Rectangle` | x, y, width, height + `contains()` |
| `Item` | col, row (셀 좌표) |
| `Theme` | 12개 속성 (색상, 폰트, 간격), `Default` 구현 |
| `Column` | title, width |
| `CellContent` | `Text(String)` \| `Empty` |
| `HitTestResult` | `Cell { col, row }` \| `Header { col }` \| `OutOfBounds` (serde tagged enum) |

### 1-3. Canvas 래퍼 (`canvas.rs`)

- `web_sys::CanvasRenderingContext2d` 래핑
- JsValue 변환 캡슐화 (set_fill_style_str, set_stroke_style_str 등)
- 18개 메서드: 스타일, 텍스트, 도형, 경로, 상태 관리

### 1-4. wasm-pack 빌드 확인

- `wasm-pack build --target web --out-dir ../../pkg` 성공
- 출력: `grid_render_bg.wasm` (82KB), `grid_render.js` (20KB)

### 1-5. Docker 빌드 설정

- `Dockerfile.wasm`, `docker-compose.yml`, `.env.docker.example` 생성

### 1-6. .gitignore 업데이트

- `pkg/`, `target/`, `output/` 추가

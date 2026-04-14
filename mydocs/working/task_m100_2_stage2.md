# Stage 2 완료보고서: 그리드 드로잉 구현

## 기본 정보

| 항목 | 내용 |
|------|------|
| 타스크 번호 | #2 |
| 단계 | Stage 2 / 3 |
| 작성일 | 2026-04-15 |

## 완료 항목

### 2-1. GridRenderer 구조체 (`lib.rs`)

- `#[wasm_bindgen]`으로 JS에 export
- 상태: columns, rows, cells, theme, scroll_x, scroll_y
- JS 인터페이스: `set_columns()`, `set_data()`, `set_theme()`, `set_scroll_x/y()`, `draw()`, `hit_test()`, `get_bounds()`, `content_width/height()`

### 2-2. draw_grid 오케스트레이터 (`render/mod.rs`)

드로잉 순서:
1. 배경 채우기 (bgCell)
2. 셀 렌더링 (헤더 아래 클리핑, 수평/수직 스크롤 반영)
3. 그리드라인 (스크롤 반영)
4. 헤더 렌더링 (수직 고정, 수평 스크롤만 반영)
5. 헤더 하단 경계선

### 2-3. 그리드라인 (`render/lines.rs`)

- 수평선: 각 행 하단, scroll_y 반영, 뷰포트 밖 건너뛰기
- 수직선: 각 컬럼 우측, scroll_x 반영, 뷰포트 밖 건너뛰기

### 2-4. 헤더 렌더링 (`render/header.rs`)

- 배경 + 컬럼 제목 텍스트
- 수평 스크롤 반영 (헤더는 수직 고정)
- 뷰포트 내 컬럼만 렌더링, per-column 클리핑

### 2-5. 텍스트 셀 렌더링 (`render/cells.rs`)

- 수평/수직 스크롤 반영
- 뷰포트 밖 행/열 건너뛰기 (성능)
- per-cell 클리핑 (텍스트 오버플로우 방지)

### 2-6. HTML 데모 페이지

- `demo/index.html` + `demo/main.js`
- 15개 컬럼 × 1,000행 데이터 생성
- WASM 로드 → Canvas 렌더링 확인

## 검증

- 브라우저에서 헤더 + 셀 + 그리드라인이 올바르게 표시됨
- 수평/수직 스크롤 시 렌더링 정상

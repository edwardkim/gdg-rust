# Stage 3 완료보고서: hitTest 구현 및 통합

## 기본 정보

| 항목 | 내용 |
|------|------|
| 타스크 번호 | #2 |
| 단계 | Stage 3 / 3 |
| 작성일 | 2026-04-15 |

## 완료 항목

### 3-1. hitTest 함수 (`hit_test.rs`)

- `get_column_for_x(x, columns, scroll_x)` — 화면 X좌표 → 컬럼 인덱스 (수평 스크롤 반영)
- `get_row_for_y(y, header_height, row_height, rows, scroll_y)` — 화면 Y좌표 → 행 인덱스 (수직 스크롤 반영)
- `hit_test(x, y, columns, rows, theme, scroll_x, scroll_y)` → `HitTestResult`

### 3-2. get_bounds_for_item 함수

- `get_bounds_for_item(col, row, columns, theme, scroll_x, scroll_y)` → `Option<Rectangle>`
- 수평/수직 스크롤 오프셋을 화면 좌표에 반영
- 헤더(row=-1) 지원

### 3-3. WASM export

- `GridRenderer.hit_test(x, y)` → JsValue (`{ kind, col, row }`)
- `GridRenderer.get_bounds(col, row)` → JsValue (`{ x, y, width, height }`)
- serde-wasm-bindgen으로 Rust↔JS 직렬화

### 3-4. 데모 통합

- **마우스 클릭** → hitTest → 선택 셀 하이라이트 (파란 테두리)
- **키보드 셀 이동** → ↑↓←→ 방향키로 선택 셀 변경 + 뷰포트 밖 시 자동 스크롤
- **PageDown/PageUp** → 페이지 단위 셀 이동
- **Home/End** → 행 첫/마지막 컬럼 이동, Ctrl 조합 시 그리드 처음/끝
- **마우스 휠** → 수직 스크롤, Shift+휠 → 수평 스크롤
- **수직/수평 스크롤바** → 드래그 및 트랙 클릭

### 3-5. 단위 테스트

12개 테스트 전부 통과:

| 테스트 | 설명 |
|--------|------|
| `test_get_column_for_x_no_scroll` | X좌표→컬럼 (스크롤 없음) |
| `test_get_column_for_x_with_scroll` | X좌표→컬럼 (수평 스크롤) |
| `test_get_row_for_y_no_scroll` | Y좌표→행 (스크롤 없음) |
| `test_get_row_for_y_with_scroll` | Y좌표→행 (수직 스크롤) |
| `test_hit_test_cell` | 셀 영역 클릭 |
| `test_hit_test_cell_with_scroll` | 스크롤 상태에서 셀 클릭 |
| `test_hit_test_header` | 헤더 영역 클릭 |
| `test_hit_test_out_of_bounds` | 영역 밖 클릭 |
| `test_get_bounds_for_item_cell` | 셀 bounds 조회 |
| `test_get_bounds_with_scroll` | 스크롤 상태 bounds |
| `test_get_bounds_for_item_header` | 헤더 bounds 조회 |
| `test_get_bounds_for_item_invalid` | 유효하지 않은 좌표 |

## 검증

- `cargo test` — 12개 통과
- 브라우저: 셀 클릭 → 올바른 [col, row] 표시
- 브라우저: 스크롤 후 클릭 → 올바른 [col, row] 표시
- 브라우저: 키보드 ↑↓←→ → 셀 이동 + 자동 스크롤
- 브라우저: 수평/수직 스크롤바 드래그 정상

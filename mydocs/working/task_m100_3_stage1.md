# Stage 1 완료보고서: 셀 타입 확장

## 기본 정보

| 항목 | 내용 |
|------|------|
| 타스크 번호 | #3 |
| 단계 | Stage 1 / 7 |
| 작성일 | 2026-04-15 |

## 완료 항목

### 1-1. CellContent enum 확장 (`types.rs`)

기존 `Text | Empty` → **9종**으로 확장:

| 셀 타입 | 필드 | 용도 |
|---------|------|------|
| `Text` | text, align, fit_mode | 텍스트 (장평 축소/말줄임 지원) |
| `Number` | display, align | 숫자 (우측 정렬 기본) |
| `Boolean` | value(4상태), max_size | 체크박스 |
| `Uri` | display, data | 하이퍼링크 (밑줄) |
| `Bubble` | tags: Vec\<String\> | 태그/버블 배열 |
| `Loading` | skeleton_width | 스켈레톤 로더 |
| `Protected` | (없음) | 보호 셀 (회색 배경) |
| `Image` | urls, rounding | 이미지 (JS 로딩 필요, placeholder) |
| `Empty` | (없음) | 빈 셀 |

추가 타입:
- `ContentAlign` — Left, Center, Right
- `BooleanState` — True, False, Indeterminate, Empty
- `FitMode` — Clip, Shrink, Ellipsis

### 1-2. Theme 확장

기존 12개 → **24개** 속성:
- 추가: `bg_cell_medium`, `bg_header_hovered`, `text_medium`, `text_light`, `text_bubble`, `accent_light`, `link_color`, `bg_bubble`, `bubble_height/padding/margin`, `checkbox_max_size`

### 1-3. 셀 렌더러 구현

| 렌더러 | Canvas API | GDG 원본 참조 |
|--------|-----------|--------------|
| **Text** | fillText, transform(ratio) | text-cell.tsx |
| **Number** | fillText (right align) | number-cell.tsx |
| **Boolean** | roundedRect, moveTo/lineTo/stroke | boolean-cell.tsx, draw-checkbox.ts |
| **URI** | fillText + lineTo (밑줄) | uri-cell.tsx |
| **Bubble** | roundedRect + fillText (반복) | bubble-cell.tsx |
| **Loading** | roundedRect + fill (스켈레톤) | loading-cell.tsx |
| **Protected** | fillRect (bgCellMedium) | protected-cell.tsx |

### 1-4. 텍스트 자동 맞춤 (FitMode)

- **Clip**: 기존 방식 (클리핑만)
- **Shrink**: 텍스트 > 가용 너비 시 장평(scaleX) 축소 (최소 70%), 초과 시 말줄임
- **Ellipsis**: 말줄임(...) 바로 적용
- 구현: `ctx.transform(ratio, 0, 0, 1, tx, ty)` + `ctx.fillText()`

### 1-5. Canvas 래퍼 확장 (`canvas.rs`)

추가 메서드: `close_path`, `arc_to`, `arc`, `set_line_cap`, `set_line_join`, `transform`

### 1-6. 유틸리티 (`render/draw_utils.rs`)

- `rounded_rect(canvas, x, y, w, h, r)` — 둥근 사각형 경로 (GDG roundedRect 대응)

### 1-7. serde 태그 방식 변경

- `CellContent` 직렬화: `#[serde(tag = "type")]` — JS에서 `{ type: "Text", text: "..." }` 형식

### 1-8. 데모 업데이트

- 15개 컬럼에 다양한 셀 타입 배정
- Boolean 컬럼 (Active), URI 컬럼 (Email), Bubble 컬럼 (Tags)
- Loading (50행마다), Protected (10행마다)
- Name 컬럼: `fit_mode: "Shrink"`, Skill 컬럼: `fit_mode: "Ellipsis"`

## 검증 결과

| 항목 | 결과 |
|------|------|
| `cargo test` | 12개 통과 |
| `wasm-pack build` | 성공 |
| WASM 크기 | 148 KB (기존 82KB → 셀 타입 확장으로 증가) |
| 브라우저 데모 | 7종 셀 타입 렌더링 정상 확인 |
| Boolean 체크박스 | True/False/Indeterminate/Empty 4상태 표시 |
| Bubble 태그 | 둥근 배경 + 텍스트 배열 |
| URI 밑줄 링크 | 파란색 텍스트 + 밑줄 |
| FitMode Shrink | 긴 텍스트 장평 축소 동작 확인 |

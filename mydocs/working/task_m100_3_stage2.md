# Stage 2 완료보고서: 셀 렌더링 디테일 + 폰트 메트릭

## 기본 정보

| 항목 | 내용 |
|------|------|
| 타스크 번호 | #3 |
| 단계 | Stage 2 / 7 |
| 작성일 | 2026-04-15 |

## 완료 항목

### 2-1. 호버 효과

- GridRenderer에 `hover_col`, `hover_row` 상태 추가
- WASM export: `set_hover(col, row)`
- 호버 셀 배경: `accentLight` 색상, `globalAlpha=0.5` 오버레이
- JS mousemove → hitTest → `set_hover` → redraw

### 2-2. 선택 하이라이트

- GridRenderer에 `selected_col`, `selected_row` 상태 추가
- WASM export: `set_selection(col, row)`
- 선택 셀 배경: `accentLight` 색상, `globalAlpha=1.0`
- 기존 JS 측 하이라이트 코드 제거 → WASM 렌더링으로 이동

### 2-3. 포커스 링

- 선택 셀 테두리: `strokeRect` with `accentColor`, lineWidth=2
- WASM의 `draw_grid` 내에서 셀 콘텐츠 위에 렌더링

### 2-4. InteractionState 구조

```rust
pub struct InteractionState {
    pub hover_col: i32,    // -1: 호버 없음
    pub hover_row: i32,
    pub selected_col: i32, // -1: 선택 없음
    pub selected_row: i32,
}
```

draw_grid에 전달하여 호버/선택/포커스를 일관되게 렌더링

### 2-5. 폰트 메트릭 내장 (`font_metrics.rs`)

**rhwp 프로젝트에서 추출한 데이터:**

| 폰트 | Regular | Bold | em_size |
|------|---------|------|---------|
| Malgun Gothic (맑은 고딕) | FONT_4 | FONT_5 | 2048 |
| NanumGothic (나눔고딕) | FONT_8 | FONT_9 | 1000 |
| Noto Sans KR | FONT_12 | FONT_13 | 1000 |
| Pretendard (프리텐다드) | FONT_593 | FONT_594 | 2048 |

**구현 함수:**

| 함수 | 설명 |
|------|------|
| `find_metric(name, bold)` | 폰트 이름으로 메트릭 조회 (한글 별칭 지원) |
| `measure_char_width(font, bold, ch, size)` | 단일 문자 너비 (px) |
| `measure_text_width(font, bold, text, size, spacing)` | 텍스트 전체 너비 (px) |

**특징:**
- 한글 음절 11,172자를 초/중/종 분해 → 그룹 인덱스 → 너비 테이블 조회
- Latin 범위: ASCII, Latin-1, 일반 구두점, 수학 기호, CJK 기호, 한글 자모, 전각 문자
- Canvas `measureText()` JS 호출 없이 Rust에서 직접 계산
- 미등록 폰트: CJK → font_size, 그 외 → font_size × 0.5 fallback

**파일 크기:** 407행 (메트릭 데이터 포함)

### 2-6. 단위 테스트 (6개 추가)

| 테스트 | 설명 |
|--------|------|
| `test_find_metric` | 4개 폰트 + 한글 별칭 조회 |
| `test_measure_char_width_ascii` | 영문 'A' 너비 (5~15px 범위) |
| `test_measure_char_width_hangul` | 한글 '가' 너비 (10~16px 범위) |
| `test_measure_text_width` | "Hello" 전체 너비 |
| `test_measure_text_width_korean` | "안녕하세요" 전체 너비 |
| `test_measure_text_width_with_spacing` | 자간 2px 추가 시 정확한 증가 |

## 검증 결과

| 항목 | 결과 |
|------|------|
| `cargo test` | 18개 통과 (기존 12 + 폰트 6) |
| `wasm-pack build` | 성공 |
| WASM 크기 | 150 KB (폰트 메트릭 + 호버/선택 추가) |
| 호버 효과 | 마우스 이동 시 반투명 하이라이트 |
| 선택 하이라이트 | 클릭 시 배경 + 포커스 링 테두리 |
| 키보드 이동 | 기존과 동일하게 정상 동작 |

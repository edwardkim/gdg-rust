# Stage 7 완료보고서: DPR 처리 및 성능 기초

## 기본 정보

| 항목 | 내용 |
|------|------|
| 타스크 번호 | #3 |
| 단계 | Stage 7 / 7 |
| 작성일 | 2026-04-15 |

## 완료 항목

### 7-1. DPR 스케일링

- WASM export: `draw_with_dpr(ctx, width, height, dpr)`
- Canvas 물리 크기: `width * dpr`, `height * dpr` (JS에서 설정)
- Canvas 논리 크기: CSS `width`, `height` (변경 없음)
- 렌더링: `ctx.scale(dpr, dpr)` → 모든 드로잉이 논리 좌표
- 4K 모니터 (DPR 2x) 확인 완료

### 7-2. 내장 폰트 메트릭 우선 텍스트 너비 계산

`measure_text(canvas, text, theme)` 헬퍼 함수:

1. `theme.base_font`에서 폰트 이름/크기/bold 추출
2. 내장 메트릭 조회 (`font_metrics::find_metric`)
3. 있으면 → `font_metrics::measure_text_width()` (Rust 순수 계산)
4. 없으면 → `canvas.measure_text_width()` (JS fallback)

**교체 위치 (5곳):**
- `draw_text_cell` — Shrink 모드 텍스트 너비
- `draw_ellipsis_text` — 말줄임 너비 + 글자별 너비
- `draw_uri_cell` — 밑줄 너비
- `draw_bubble_cell` — 태그별 너비

### 7-3. 성능 영향

| 항목 | 기존 (JS measureText) | 변경 후 (내장 메트릭) |
|------|----------------------|---------------------|
| 텍스트 너비 계산 | JS 호출 (WASM→JS 왕복) | Rust 순수 계산 (호출 없음) |
| 대상 폰트 | 모든 폰트 | 맑은 고딕, 나눔고딕, Noto Sans KR, Pretendard |
| 미등록 폰트 | - | JS fallback 유지 |

## 검증 결과

| 항목 | 결과 |
|------|------|
| `cargo test` | 18개 통과 |
| WASM 크기 | 198 KB (폰트 메트릭 데이터 포함) |
| DPR 1x | 정상 렌더링 |
| DPR 2x (4K) | 선명한 렌더링 확인 |
| 내장 메트릭 측정 | 기존과 동일한 렌더링 결과 |
| 기존 기능 회귀 | 없음 |

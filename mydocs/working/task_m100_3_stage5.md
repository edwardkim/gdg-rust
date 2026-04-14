# Stage 5 완료보고서: 범위 선택 및 인터랙션

## 기본 정보

| 항목 | 내용 |
|------|------|
| 타스크 번호 | #3 |
| 단계 | Stage 5 / 7 |
| 작성일 | 2026-04-15 |

## 완료 항목

### 5-1. SelectionRange 모델 (Rust)

```rust
pub struct SelectionRange {
    pub x: usize,      // 시작 컬럼
    pub y: usize,      // 시작 행
    pub width: usize,   // 컬럼 수
    pub height: usize,  // 행 수
}
```

- `from_corners(col1, row1, col2, row2)` — 두 모서리에서 정규화된 범위 생성
- `contains(col, row)` — 셀이 범위 내인지 확인
- WASM export: `set_range(col1, row1, col2, row2)`, `clear_range()`

### 5-2. 범위 렌더링 (Rust)

| 요소 | 구현 |
|------|------|
| 범위 배경 | `accentColor` + `globalAlpha=0.15` 반투명 fillRect |
| 범위 테두리 | `accentColor` 실선 strokeRect (lineWidth=2) |
| 단일 셀 선택 배경 | 범위 없을 때만 `accentLight` 표시 |
| 포커스 링 | 범위 없을 때만 표시 |

### 5-3. 마우스 드래그 범위 선택 (JS)

- mousedown (셀 영역) → `dragMode="range-dragging"` + 앵커 셀 기록
- mousemove (드래그 중) → hitTest로 현재 셀 → `set_range(anchor, current)`
- mouseup → `dragMode="idle"` + `wasDraggingRange` 플래그
- 직후 click 이벤트 → `wasDraggingRange`면 범위 해제 건너뜀

### 5-4. Shift+방향키 범위 확장 (JS)

- Shift+↑↓←→ → `extendRange(dc, dr)` — 앵커(selectedCell)에서 rangeEnd 확장
- Shift+PageDown/Up → 페이지 단위 범위 확장
- 범위 끝 셀이 뷰포트 밖으로 나가면 자동 스크롤

### 5-5. 범위 해제

- 단일 셀 클릭 → `clearRange()` + 선택 셀 설정
- Escape → 선택 + 범위 모두 해제
- 방향키 (Shift 없이) → 범위 해제 + 셀 이동

### 5-6. 버그 수정

| 버그 | 원인 | 수정 |
|------|------|------|
| 드래그 범위 선택 후 즉시 해제됨 | mouseup 후 click 이벤트가 clearRange 호출 | `wasDraggingRange` 플래그로 직후 click 무시 |
| 앵커 셀만 진한 배경 | 선택 셀 하이라이트가 범위와 겹침 | 범위 활성 시 선택 셀 하이라이트 비활성 |
| 앵커 셀 포커스 링 남음 | 포커스 링이 범위와 무관하게 표시 | 범위 활성 시 포커스 링 비활성 |

## 검증 결과

| 항목 | 결과 |
|------|------|
| `cargo test` | 18개 통과 |
| WASM 크기 | 154 KB |
| 마우스 드래그 범위 선택 | 정상 (하이라이트 + 테두리) |
| 드래그 후 범위 유지 | 정상 (click에서 해제 안 됨) |
| Shift+방향키 범위 확장 | 정상 |
| 범위 내 균일한 배경색 | 정상 (앵커 셀 특별 처리 없음) |
| 클릭으로 범위 해제 | 정상 |
| Escape 전체 해제 | 정상 |

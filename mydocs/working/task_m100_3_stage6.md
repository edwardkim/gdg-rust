# Stage 6 완료보고서: 테마 시스템 완성

## 기본 정보

| 항목 | 내용 |
|------|------|
| 타스크 번호 | #3 |
| 단계 | Stage 6 / 7 |
| 작성일 | 2026-04-15 |

## 완료 항목

### 6-1. ThemeOverride 타입 (`types.rs`)

```rust
pub struct ThemeOverride {
    pub bg_cell: Option<String>,
    pub bg_header: Option<String>,
    pub text_dark: Option<String>,
    pub text_header: Option<String>,
    pub border_color: Option<String>,
    pub accent_color: Option<String>,
    pub accent_light: Option<String>,
    pub link_color: Option<String>,
}
```

- `apply_to(base: &Theme) -> Theme` — base 테마에 오버라이드 적용
- 모든 필드 `Option` — 설정된 필드만 덮어씀

### 6-2. 컬럼별 테마 오버라이드

- `Column.theme_override: Option<ThemeOverride>` 필드 추가
- 렌더링 시 해당 컬럼 영역에 `bg_cell` 배경색 적용
- 데모: Salary 컬럼 `#FFF8DC` (연한 노랑), Active 컬럼 `#EEF4FF` (연한 파랑)

### 6-3. 행별 테마 오버라이드

- GridRenderer에 `row_themes: HashMap<usize, ThemeOverride>` 저장
- WASM export: `set_row_theme(row, override)`, `clear_row_theme(row)`
- 렌더링 시 해당 행 영역에 `bg_cell` 배경색 적용
- 데모: 5행마다 `#F0FFF0` (연한 초록)

### 6-4. 교대 행 색상 (Stripe)

- WASM export: `set_stripe_color(color)`, `clear_stripe_color()`
- 홀수 행에 배경색 적용
- 데모: `#F0F0F4` (연한 회색)

### 6-5. 오버라이드 적용 계층

렌더링 순서 (후순위가 위에 덮어씀):

```
[1] 전역 배경 (theme.bg_cell) — 전체 캔버스
 ↓
[2] 교대 행 색상 (stripe) — 홀수 행
 ↓
[3] 행별 테마 오버라이드 — 특정 행
 ↓
[4] 컬럼별 테마 오버라이드 — 특정 컬럼 영역
 ↓
[5] 호버/선택 하이라이트 — 인터랙션
 ↓
[6] 셀 콘텐츠 렌더링
 ↓
[7] 그리드라인
 ↓
[8] 범위 선택 + 포커스 링
```

### 6-6. GridBridge 확장 (JS)

- `ColumnDef.theme_override?: ThemeOverrideDef` 추가
- `ThemeOverrideDef` 인터페이스 정의

## 검증 결과

| 항목 | 결과 |
|------|------|
| `cargo test` | 18개 통과 |
| WASM 크기 | 163 KB |
| 교대 행 색상 | 홀수 행 연한 회색 배경 확인 |
| 컬럼별 테마 | Salary(노랑), Active(파랑) 배경 확인 |
| 행별 테마 | 5행마다 연한 초록 배경 확인 |
| 기존 기능 회귀 | 없음 (호버, 선택, 범위 선택 정상) |

# Stage 3 완료보고서: 헤더 기능 강화

## 기본 정보

| 항목 | 내용 |
|------|------|
| 타스크 번호 | #3 |
| 단계 | Stage 3 / 7 |
| 작성일 | 2026-04-15 |

## 완료 항목

### 3-1. 컬럼 타입 확장

Column 구조체에 추가:
- `group: Option<String>` — 그룹 헤더 소속
- `icon: Option<String>` — 헤더 아이콘 (이모지/텍스트)
- `has_menu: bool` — 메뉴 버튼 표시

### 3-2. 그룹 헤더

- 2단 헤더 구조: 그룹 헤더(28px) + 컬럼 헤더(36px) = 총 64px
- walkGroups 패턴: 같은 그룹의 연속 컬럼을 하나의 영역으로 묶어 렌더링
- 그룹명 텍스트 + 우측 구분선 + 하단 경계선
- 그룹 없는 컬럼은 빈 그룹으로 처리
- `effective_group_header_height()`: 기본값 28px (0이면 자동)

### 3-3. 컬럼 아이콘

- 헤더 좌측에 이모지 아이콘 표시 (👤 📍 ✉ ✓ 📅 📞 등)
- 레이아웃: `[icon 20px][title text][menu 28px]`

### 3-4. 메뉴 버튼

- `has_menu: true` 컬럼의 헤더 우측에 ⋮ (세로 점 3개) 렌더링
- `ctx.arc()`로 원형 점 3개 (반지름 1.5px, 간격 4px)

### 3-5. 헤더 호버

- **컬럼 헤더** (hover_row == -1): 해당 컬럼 배경 `bgHeaderHovered`
- **그룹 헤더** (hover_row == -2): 호버 컬럼이 속한 그룹 전체 배경 `bgHeaderHovered`
- JS에서 마우스 Y 좌표로 그룹 헤더(상단 28px) vs 컬럼 헤더 영역 구분

### 3-6. 컬럼 리사이즈

- **경계 감지**: 컬럼 우측 경계 ±5px 이내 → 커서 `col-resize`
- **드래그**: mousedown → `dragMode='column-resize'` → mousemove → `renderer.resize_column(col, width)` → 실시간 렌더링
- **최소 너비**: 30px
- **WASM export**: `resize_column(col, new_width)`
- 그룹 헤더 영역에서는 리사이즈 커서 비활성화

### 3-7. hitTest 확장

- `total_header_height` 파라미터 추가 — 그룹 헤더 포함 높이
- `content_height()` 그룹 헤더 높이 반영
- `HitTestResultExt` 타입 정의 (향후 group-header, is_edge, is_menu 구분용)

### 3-8. 데모 업데이트

- 4개 그룹: Personal, Work, Contact, Metrics
- 아이콘: 6개 컬럼에 이모지 아이콘 배정
- 메뉴 버튼: Name, City, Salary, Project 4개 컬럼

## 검증 결과

| 항목 | 결과 |
|------|------|
| `cargo test` | 18개 통과 |
| WASM 크기 | 153 KB |
| 그룹 헤더 | 4개 그룹 정상 렌더링, 구분선 표시 |
| 컬럼 아이콘 | 이모지 아이콘 헤더 좌측 표시 |
| 메뉴 버튼 | ⋮ 아이콘 헤더 우측 표시 |
| 컬럼 헤더 호버 | 배경색 변경 정상 |
| 그룹 헤더 호버 | 해당 그룹 전체 배경 변경 정상 |
| 컬럼 리사이즈 | 드래그로 실시간 너비 변경 정상 |
| 리사이즈 커서 | 컬럼 경계 ±5px에서 col-resize 표시 |

# 구현 계획서: Task #1 - 기존 TypeScript 소스 그리드 드로잉 방식 리뷰

## 기본 정보

| 항목 | 내용 |
|------|------|
| 타스크 번호 | #1 |
| 마일스톤 | M100 (POC 준비) |
| 작성일 | 2026-04-15 |
| 수행계획서 | `mydocs/plans/task_m100_1.md` |
| 단계 수 | 3단계 |

## 분석 진행 절차

각 Stage는 다음 순서로 진행한다:
1. 대상 파일을 순서대로 읽고 핵심 로직 추출
2. 함수 호출 흐름 및 데이터 흐름 도식화
3. 단계별 완료보고서 작성 → 승인 요청

---

## Stage 1: 렌더링 파이프라인 및 hitTest 분석

### 1-1. Canvas 생성 및 관리 구조
- **대상**: `data-grid.tsx`
- **분석**: Canvas 요소 생성, 더블버퍼 컨텍스트(`bufferACtx`, `bufferBCtx`), overlay 캔버스 구조
- **산출**: Canvas 구조도 (메인/오버레이/버퍼 관계)

### 1-2. drawGrid() 오케스트레이터 분석
- **대상**: `data-grid-render.ts`
- **분석**: `drawGrid()` 함수의 전체 드로잉 순서, 렌더링 전략 분기(single/double/direct), DPR 처리
- **산출**: 드로잉 순서 플로우차트

### 1-3. 개별 렌더링 모듈 분석
- **대상**: `data-grid-render.cells.ts`, `data-grid-render.header.ts`, `data-grid-render.lines.ts`, `data-grid.render.rings.ts`
- **분석**: 각 모듈의 진입 함수, Canvas 2D API 사용 패턴, 클리핑/상태관리
- **산출**: 모듈별 역할 및 Canvas API 사용 목록

### 1-4. Blit 최적화 및 Damage Tracking
- **대상**: `data-grid-render.blit.ts`, `use-animation-queue.ts`, `animation-manager.ts`
- **분석**: `blitLastFrame()` 스크롤 최적화, CellSet 기반 damage 추적, rAF 드로우 루프
- **산출**: 최적화 메커니즘 정리

### 1-5. hitTest 메커니즘 분석
- **대상**: `data-grid.tsx`(`getMouseArgsForPosition`), `data-grid-lib.ts`(`getColumnIndexForX`, `getRowIndexForY`), `math.ts`(`pointInRect`)
- **분석**:
  - 마우스 이벤트 좌표 → DPR 보정 → 로컬 좌표 변환
  - X좌표 → 컬럼 인덱스 변환 (고정 컬럼, 스크롤 오프셋 고려)
  - Y좌표 → 행 인덱스 변환 (헤더, 그룹헤더, 고정행 고려)
  - `getBoundsForItem()` - 셀 [col, row] → 화면 Rectangle 역변환
  - hitTest가 의존하는 레이아웃 상태: `effectiveCols`, `cellXOffset`, `cellYOffset`, `translateX/Y`, `freezeColumns`, `freezeTrailingRows`
- **산출**: hitTest 흐름도 및 레이아웃 의존성 맵

### 1-6. 컬럼/로우 순회(Walk) 구조
- **대상**: `data-grid-render.walk.ts`
- **분석**: `walkColumns`, `walkRowsInCol`, `walkGroups` 등 순회 패턴
- **산출**: 순회 구조 정리

**Stage 1 산출물**: `mydocs/working/task_m100_1_stage1.md`

---

## Stage 2: 데이터 모델 및 셀 렌더러 분석

### 2-1. GridCell 타입 계층 분석
- **대상**: `data-grid-types.ts`
- **분석**: GridCellKind enum, BaseGridCell 인터페이스, 12종 셀 타입 + Custom 타입 구조
- **산출**: 타입 계층도

### 2-2. 셀 렌더러 인터페이스 분석
- **대상**: `cell-types.ts`
- **분석**: `BaseCellRenderer<T>` 인터페이스, `draw`/`measure`/`drawPrep`/`provideEditor` 콜백 구조, `DrawArgs` 구조
- **산출**: 렌더러 인터페이스 명세

### 2-3. 주요 셀 렌더러 구현 분석
- **대상**: `cells/text-cell.tsx`, `cells/number-cell.tsx`, `cells/boolean-cell.tsx`, `cells/image-cell.tsx`
- **분석**: 각 셀의 `draw()` 구현에서 Canvas API 사용 방식, `measure()` 로직
- **산출**: 셀별 Canvas API 사용 패턴 비교표

### 2-4. 컬럼 모델 및 크기 결정 로직
- **대상**: `data-grid-types.ts`(컬럼 타입), `use-column-sizer.ts`
- **분석**: `SizedGridColumn`/`AutoGridColumn` 차이, grow 분배 로직, 자동 측정 로직
- **산출**: 컬럼 크기 결정 플로우

### 2-5. 데이터 공급 패턴
- **대상**: `data-editor.tsx`
- **분석**: `getCellContent` 콜백, `getCellsForSelection`, `onCellEdited` 패턴, `onVisibleRegionChanged`
- **산출**: 데이터 흐름도

### 2-6. 테마 시스템
- **대상**: `common/styles.ts` 또는 테마 관련 파일
- **분석**: `FullTheme` 구조, 셀/헤더/그리드라인 등 테마 적용 방식
- **산출**: 테마 속성 목록

**Stage 2 산출물**: `mydocs/working/task_m100_1_stage2.md`

---

## Stage 3: Rust/WASM 전환 관점 분석

### 3-1. Canvas 2D API 사용 패턴 목록화
- 전체 렌더링 코드에서 사용하는 Canvas 2D API 메서드 추출
- `web-sys` 크레이트의 `CanvasRenderingContext2d` 매핑 가능 여부 확인

### 3-2. React 의존성 분리 분석
- 순수 드로잉 로직 (React 무관) vs React 의존 로직 분류
- WASM으로 이관 가능한 함수 범위 정의

### 3-3. JS ↔ WASM 경계 설계
- 드로잉 명령 전달 방식: WASM이 직접 Canvas API 호출 vs 드로잉 커맨드 버퍼
- **hitTest 연동 방안**:
  - 방안 A: JS가 레이아웃 정보를 유지하고 기존 hitTest 로직을 그대로 사용
  - 방안 B: WASM이 hitTest 함수를 export하여 JS에서 호출
  - 방안 C: SharedArrayBuffer로 레이아웃 메타데이터 공유
- 각 방안의 장단점 비교

### 3-4. 성능 최적화 포팅 전략
- blit 최적화: WASM에서의 캔버스 복사 전략
- damage tracking: Rust 측 CellSet 구현 방안
- 더블 버퍼링: OffscreenCanvas 활용 가능성

### 3-5. 포팅 우선순위 및 로드맵 제안
- 단계별 전환 순서 제안 (어떤 모듈부터 Rust로 전환할지)
- 점진적 마이그레이션 전략 (TS/Rust 혼합 단계)

**Stage 3 산출물**: `mydocs/working/task_m100_1_stage3.md`

---

## 최종 산출물 요약

| 순서 | 문서 | 경로 |
|------|------|------|
| 1 | 수행계획서 | `mydocs/plans/task_m100_1.md` |
| 2 | 구현계획서 | `mydocs/plans/task_m100_1_impl.md` (본 문서) |
| 3 | Stage 1 완료보고서 | `mydocs/working/task_m100_1_stage1.md` |
| 4 | Stage 2 완료보고서 | `mydocs/working/task_m100_1_stage2.md` |
| 5 | Stage 3 완료보고서 | `mydocs/working/task_m100_1_stage3.md` |
| 6 | 최종 보고서 | `mydocs/working/task_m100_1_report.md` |

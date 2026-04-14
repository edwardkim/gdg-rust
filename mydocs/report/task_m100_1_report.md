# 최종 보고서: Task #1 - 기존 TypeScript 소스 그리드 드로잉 방식 리뷰

## 기본 정보

| 항목 | 내용 |
|------|------|
| 타스크 번호 | #1 |
| 마일스톤 | M100 (POC 준비) |
| 작성일 | 2026-04-15 |
| 수행 기간 | 2026-04-14 ~ 2026-04-15 |
| 핵심 요구사항 | Rust 백엔드 드로잉 시 프론트(JS)에서 hitTest로 선택 영역 인지 가능해야 함 |

---

## 1. 요약

Glide Data Grid의 Canvas 기반 그리드 렌더링 아키텍처를 3단계로 분석하여 Rust/WASM 전환 전략을 수립했다.

**핵심 결론:**
- 렌더링 코드의 **~90%가 순수 함수**로 React 런타임 의존 없이 Rust/WASM 포팅 가능
- Canvas 2D API **35종 전체**가 `web-sys` 크레이트로 매핑 가능
- hitTest는 **WASM export 방식**(방안 B)이 최적 — 드로잉과 동일 레이아웃 상태 사용으로 불일치 방지
- 점진적 마이그레이션이 가능한 구조 (TS/Rust 혼합 운영 후 단계적 전환)

---

## 2. Rust/WASM 포팅의 기대 효용

이 POC 프로젝트가 가치를 갖기 위해서는 Rust/WASM 전환이 기존 TypeScript 대비 명확한 이점을 제공해야 한다. 분석 결과를 바탕으로 다음과 같은 효용을 기대할 수 있다.

### 2.1 런타임 안정성: GC 일시정지 제거

JavaScript의 가비지 컬렉션(GC)은 대규모 그리드(수만~수십만 행)에서 렌더링 도중 예측 불가능한 일시정지를 유발한다. 현재 TS 코드가 **packed integer 큐**, **튜플 재사용**, **할당 최소화** 등의 트릭을 쓰는 이유가 바로 GC 압력 때문이다. Rust는 GC가 없으므로 이러한 우회 전략 없이도 **안정적인 60fps 렌더링**이 가능하다.

### 2.2 CPU 바운드 연산 성능

Canvas 드로잉 자체는 브라우저 GPU가 처리하므로 JS/WASM 차이가 없다. 그러나 **드로잉 이전의 계산 로직**에서 실질적 성능 향상이 기대된다:

| 연산 | 현재 (TS) | Rust/WASM | 개선 기대 |
|------|----------|-----------|----------|
| Damage Tracking | JS `Map` 기반 `CellSet` | `HashSet<(i32, i32)>` | 높음 |
| Blit 판정 (`computeCanBlit`) | 18개 속성 개별 비교 | `PartialEq` derive 단일 비교 | 높음 |
| hitTest 좌표 계산 | JS 산술 연산 | 네이티브 속도 산술 | 높음 |
| 행/컬럼 순회 (Walk) | JS 루프 | 네이티브 루프 + 인라이닝 | 중간 |
| Canvas API 호출 | JS → GPU | WASM → GPU | 없음 |
| `measureText()` | JS 브라우저 API | JS 호출 필수 | 없음 (캐싱으로만 개선) |

### 2.3 타입 안전성과 코드 품질

- **셀 타입 계층**: 12종 GridCellKind를 문자열 유니온 대신 Rust `enum`으로 관리 → **컴파일 타임에 패턴 매칭 완전성 검증** (exhaustive match). 셀 타입 추가/변경 시 처리 누락을 컴파일러가 자동 감지
- **좌표 오류 방지**: `Item = [col, row]` 튜플의 col/row 혼동 → Rust newtype (`Col(i32)`, `Row(i32)`)으로 타입 레벨 구분
- **테마 41개 속성**: Partial 오버라이드의 누락/오타를 `Option<T>` 필드로 컴파일 시 검출
- **불변성 기본값**: 렌더링 함수의 부수효과(side effect) 원천 차단
- **대규모 리팩토링 안전성**: 17개 렌더링 모듈 변경 시 컴파일러가 영향 범위 자동 검증

### 2.4 번들 크기 및 초기 로딩

- **WASM 바이너리**: 컴파일 시 dead code 제거로 JS 번들 대비 더 작은 바이너리 가능
- **파싱 비용 제거**: JS는 파싱+JIT 컴파일이 필요하지만, WASM은 디코딩 즉시 실행

### 2.5 향후 확장 가능성

- **OffscreenCanvas + Web Worker**: WASM 렌더링을 워커로 분리하여 메인 스레드 부하 제거
- **SIMD**: `wasm-simd` 활성화 시 색상 블렌딩, 좌표 계산 등 벡터 연산 가속
- **네이티브 확장**: 동일 Rust 코드를 데스크톱 앱(Tauri 등)에서 네이티브 Canvas로 직접 렌더링 가능

### 2.6 현실적 기대치 요약

| 영역 | 개선 기대 | 근거 |
|------|----------|------|
| GC 일시정지 제거 | **★★★** | 대규모 그리드 프레임 안정성 |
| CPU 바운드 연산 | **★★★** | hitTest, damage, blit 판정 |
| 타입 안전성/유지보수 | **★★★** | 컴파일 타임 검증 |
| 초기 로딩 시간 | **★★☆** | WASM 디코딩 > JS 파싱 |
| Canvas 드로잉 속도 | **☆☆☆** | 브라우저 GPU 처리, 차이 없음 |
| `measureText` 성능 | **☆☆☆** | JS 호출 필수 |

---

## 3. 아키텍처 분석 결과

### 3.1 렌더링 파이프라인 (Stage 1)

**Canvas 구조**: 3개 캔버스 (메인 + 오버레이 + 더블버퍼 A/B)

**drawGrid 파이프라인** (22단계):
```
초기화 → DPR 스케일링 → [Damage 경로: 증분 렌더링 → 조기종료]
                        또는
                        [Blit 경로: 이전 프레임 복사 → 노출 영역만 렌더링]
→ 배경 → 셀 → 빈영역 → 행테마 → 그리드라인 → 하이라이트 → 포커스 → 리사이즈
→ 더블버퍼 합성 → blit 데이터 저장
```

**최적화 메커니즘** (10종):
| 메커니즘 | 효과 |
|----------|------|
| Blit 스크롤 복사 | O(cells) → O(delta) |
| Damage Tracking (CellSet) | 변경 셀만 재렌더링 |
| 컬럼 Prep 캐싱 | font/fillStyle 재사용 |
| DPR 다운스케일 | 스크롤 시 해상도 낮춤 |
| 라인 색상 그룹화 | strokeStyle 변경 최소화 |
| per-cell 클리핑 | GPU 클립 큐 병목 방지 |
| packed integer 큐 | GC 압력 감소 |
| skipToY 최적화 | damage 영역 위 행 건너뛰기 |
| 지연 드로잉 | 하이라이트/포커스 콜백 반환 |
| 더블 버퍼 교대 | 플리커 방지 |

### 3.2 hitTest 메커니즘 (Stage 1)

```
마우스 이벤트 → DPR 보정 → getColumnIndexForX(x) + getRowIndexForY(y)
                                     │
                                     ▼
                              [col, row, bounds, kind]
```

**의존 레이아웃 상태 11개**: cellXOffset, cellYOffset, translateX, translateY, freezeColumns, freezeTrailingRows, width, height, headerHeight, groupHeaderHeight, rowHeight, mappedColumns

**핵심 발견**: 모든 hitTest 함수가 **순수 함수** → Rust 포팅 가능

### 3.3 데이터 모델 (Stage 2)

- **GridCell**: 12종 공개 + 2종 내부, BaseGridCell 공통 속성 9개
- **셀 렌더러**: `drawPrep → draw → deprep` 라이프사이클
- **컬럼 크기**: 샘플링(최대 10행) → 이상치 제거 → 헤더 측정 → grow 분배
- **데이터 공급**: `getCellContent([col, row]) → GridCell` 콜백
- **테마**: 41개 속성, 7단계 오버라이드 계층

### 3.4 Rust/WASM 전환 분석 (Stage 3)

**React 의존성 분리**:
```
[WASM 포팅 가능 ~90%]              [JS 유지 ~10%]
- drawGrid 오케스트레이터          - React 컴포넌트
- drawCells, drawHeaders           - 이벤트 핸들러 등록
- drawLines, drawRings             - 에디터 오버레이 (JSX)
- 셀 렌더러 draw/measure           - 애니메이션 큐 (React hooks)
- hitTest 함수                     - useMappedColumns 훅
- 기하 유틸리티                    - 이미지 로더
- Blit/Damage 로직                 - 커스텀 셀 렌더러 (JS)
```

---

## 4. 권장 아키텍처

### JS ↔ WASM 경계

```
┌─ JS 측 ───────────────────┐     ┌─ WASM 측 (Rust) ──────────┐
│                            │     │                            │
│  React DataEditor          │     │  GridRenderer              │
│  ├── 이벤트 핸들링          │     │  ├── draw_grid()           │
│  ├── 에디터 오버레이         │     │  ├── draw_cells()          │
│  ├── 스크롤 관리             │     │  ├── draw_headers()        │
│  │                          │     │  ├── draw_lines()          │
│  │   마우스 이벤트           │     │  ├── draw_rings()          │
│  │     │                    │     │  │                          │
│  │     ├─ DPR 보정          │     │  │  hitTest                 │
│  │     └─ wasm.hit_test()  ─┼────→│  ├── hit_test(x, y)        │
│  │         ← [col, row] ───┼─────│  ├── get_column_for_x()    │
│  │                          │     │  ├── get_row_for_y()       │
│  │   셀 데이터              │     │  └── compute_bounds()      │
│  │     │                    │     │                            │
│  │     └─ 배치 전달        ─┼────→│  레이아웃 상태 (소유)       │
│  │                          │     │  ├── columns[]             │
│  │   draw 트리거            │     │  ├── cell_offsets           │
│  │     │                    │     │  ├── translate_x/y          │
│  │     └─ wasm.draw_grid() ─┼────→│  └── row_heights[]         │
│  │                          │     │                            │
└──┘                          │     └──────────────────────────┘
```

### hitTest 연동 방식: WASM export (방안 B 채택)

**이유**:
1. 드로잉과 hitTest가 **동일 레이아웃 상태** 사용 → 불일치 원천 차단
2. 기존 hitTest 함수 전부 **순수 함수** → 포팅 용이
3. WASM 호출 오버헤드 무시 가능 (단순 산술 연산)
4. 가변 행 높이를 WASM이 배열로 소유 → 콜백 불필요

---

## 5. 포팅 로드맵

### Phase 1: 기초 인프라
1. Canvas 래퍼 구조체 (web-sys 래핑)
2. 기하 유틸리티 (pointInRect, intersectRect 등)
3. 테마/셀/컬럼 타입 정의 (Rust struct/enum)

### Phase 2: 핵심 렌더링
4. 그리드라인 렌더링
5. 텍스트 드로잉 + roundedRect
6. 체크박스 렌더링
7. Walk 함수 (컬럼/행 순회)
8. drawCells + 개별 셀 렌더러
9. drawHeaders + 그룹 헤더

### Phase 3: 최적화 및 hitTest
10. hitTest (getColumnIndexForX, getRowIndexForY, computeBounds)
11. Blit 최적화 (blitLastFrame, computeCanBlit)
12. Damage Tracking (CellSet → HashSet)
13. 하이라이트/포커스 링

### Phase 4: 통합
14. drawGrid 오케스트레이터 통합
15. wasm-bindgen JS 바인딩
16. React 어댑터 (data-grid.tsx에서 WASM 호출)
17. A/B 비교 테스트 (TS vs Rust 렌더링 결과)

---

## 6. 핵심 리스크 및 대응

| 리스크 | 영향도 | 대응 전략 |
|--------|--------|----------|
| `measureText()` JS 호출 오버헤드 | 높음 | 적극적 캐싱 + 배치 측정 |
| `fillStyle`/`font` JsValue 변환 비용 | 중간 | PrepResult 캐싱 패턴 유지 |
| `getCellContent` 콜백 왕복 | 높음 | 가시 영역 셀 데이터 배치 전달 |
| 가변 행 높이 콜백 | 중간 | 가시 영역 높이 배열 미리 계산 |
| 이미지 로딩 | 낮음 | JS에서 로딩 유지, 완료 후 WASM 통보 |
| 커스텀 셀 렌더러 (JS) | 낮음 | fallback: 커스텀 셀은 JS 렌더링 |

---

## 7. 산출물 목록

| 문서 | 경로 | 상태 |
|------|------|------|
| 수행계획서 | `mydocs/plans/task_m100_1.md` | 완료 |
| 구현계획서 | `mydocs/plans/task_m100_1_impl.md` | 완료 |
| Stage 1 보고서 | `mydocs/working/task_m100_1_stage1.md` | 완료 |
| Stage 2 보고서 | `mydocs/working/task_m100_1_stage2.md` | 완료 |
| Stage 3 보고서 | `mydocs/working/task_m100_1_stage3.md` | 완료 |
| 최종 보고서 | `mydocs/working/task_m100_1_report.md` | 완료 (본 문서) |

---

## 8. 결론

Glide Data Grid의 렌더링 엔진은 **모듈화가 잘 되어 있고 순수 함수 비율이 높아** Rust/WASM 전환에 유리한 구조이다.

- 렌더링 파이프라인이 `drawGrid` 오케스트레이터를 중심으로 7개 모듈로 분리되어 있어 **단계적 포팅**이 가능하다
- hitTest 함수가 드로잉과 독립적인 순수 좌표 계산 로직이므로 **WASM export로 JS↔WASM 연동**이 자연스럽다
- Blit/Damage 등 성능 최적화 메커니즘도 Rust에서 동등하게 구현 가능하며, GC 부재로 인한 **추가 이점**도 기대된다
- 주요 병목은 `measureText()` 등 브라우저 API 호출로, 캐싱 전략이 핵심이다

POC의 다음 단계로 Phase 1 (기초 인프라) 구현을 권장한다.

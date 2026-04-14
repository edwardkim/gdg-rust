# 수행계획서: Task #2 - Rust/WASM 기반 그리드 렌더링 POC 구현

> **상태: 완료** (2026-04-15 최종 보고서 승인)

## 기본 정보

| 항목 | 내용 |
|------|------|
| 타스크 번호 | #2 |
| 마일스톤 | M100 (POC) |
| 작성일 | 2026-04-15 |
| 완료일 | 2026-04-15 |
| 선행 타스크 | #1 (그리드 드로잉 방식 리뷰) |
| 최종 보고서 | `mydocs/report/task_m100_2_report.md` |
| 목표 | Rust/WASM으로 Canvas에 그리드를 그리고, JS에서 hitTest로 셀을 인지하는 최소 동작 POC |

## 배경

Task #1 분석 결과, 기존 TS 렌더링 코드의 ~90%가 순수 함수이며 Canvas 2D API 35종 전체가 `web-sys`로 매핑 가능함을 확인했다. 이를 기반으로 실제 Rust/WASM 코드가 Canvas에 그리드를 그리고, JS 측에서 WASM이 export한 hitTest 함수로 셀을 인지하는 **최소 동작 POC**를 구현한다.

## 개발 환경

| 도구 | 버전 |
|------|------|
| Rust | 1.93.1 |
| wasm-pack | 0.14.0 |
| cargo | 1.93.1 |
| Node.js | 24.11.0 |
| 대상 | `wasm32-unknown-unknown` |

## POC 범위

### 포함 (In Scope)

1. **Rust 프로젝트 초기 구조** — Cargo.toml, wasm-bindgen, web-sys 설정
2. **Canvas 래퍼** — `web-sys::CanvasRenderingContext2d` 기반 타입 안전 래퍼
3. **기본 타입 정의** — Rectangle, Theme(최소), Column, Cell 구조체
4. **그리드 드로잉 최소 구현**
   - 배경 채우기
   - 그리드라인 (수평/수직)
   - 컬럼 헤더 (텍스트)
   - 텍스트 셀 렌더링
5. **hitTest 구현** — WASM export
   - `hit_test(x, y)` → `{ col, row }` 반환
   - `get_bounds_for_item(col, row)` → Rectangle 반환
6. **HTML 데모 페이지** — Canvas + JS에서 WASM 로드, 마우스 클릭 시 hitTest 결과 표시
7. **빌드 인프라** — wasm-pack 빌드, Docker 빌드 설정 (CLAUDE.md 규칙)

### 제외 (Out of Scope)

- React 통합 (다음 타스크)
- Blit/Damage 최적화
- 더블 버퍼링
- 이미지 셀, 체크박스 셀 등 고급 셀 타입
- 스크롤, 고정 컬럼/행
- 에디터 오버레이
- 애니메이션

## POC 목표 화면

```
┌──────────┬──────────┬──────────┐
│ Column A │ Column B │ Column C │  ← 헤더 (배경색 + 텍스트)
├──────────┼──────────┼──────────┤
│ Cell 0,0 │ Cell 0,1 │ Cell 0,2 │  ← 텍스트 셀
├──────────┼──────────┼──────────┤
│ Cell 1,0 │ Cell 1,1 │ Cell 1,2 │
├──────────┼──────────┼──────────┤
│ Cell 2,0 │ Cell 2,1 │ Cell 2,2 │
└──────────┴──────────┴──────────┘

[클릭 시] → "Clicked: col=1, row=2, bounds={x:100, y:136, w:100, h:34}"
```

## 프로젝트 구조 (예상)

```
glide-data-grid/
├── packages/          # 기존 TS 코드 (변경 없음)
├── crates/
│   └── grid-render/   # Rust 렌더링 엔진
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs          # wasm-bindgen 엔트리
│           ├── types.rs        # Rectangle, Theme, Column, Cell
│           ├── canvas.rs       # Canvas 래퍼
│           ├── render/
│           │   ├── mod.rs
│           │   ├── grid.rs     # draw_grid 오케스트레이터
│           │   ├── lines.rs    # 그리드라인
│           │   ├── header.rs   # 헤더 렌더링
│           │   └── cells.rs    # 셀 렌더링
│           └── hit_test.rs     # hitTest 함수
├── pkg/                # wasm-pack 빌드 출력
├── demo/               # HTML 데모 페이지
│   ├── index.html
│   └── main.js
├── docker-compose.yml  # WASM 빌드용 Docker
├── Dockerfile.wasm     # WASM 빌드 이미지
├── .env.docker.example # Docker 환경변수 예시
└── output/             # 렌더링 결과물 출력
```

## 수행 단계

### Stage 1: Rust 프로젝트 셋업 및 기본 타입

- Cargo.toml 설정 (wasm-bindgen, web-sys, js-sys)
- 기본 타입 정의 (Rectangle, Theme, Column, CellContent)
- Canvas 래퍼 구조체
- wasm-pack 빌드 확인 (빈 모듈 컴파일)
- Docker 빌드 설정

**산출물**: `mydocs/working/task_m100_2_stage1.md`

### Stage 2: 그리드 드로잉 구현

- draw_grid 오케스트레이터 (최소 버전)
- 배경 채우기 + 그리드라인
- 헤더 렌더링 (배경 + 텍스트)
- 텍스트 셀 렌더링
- HTML 데모 페이지에서 Canvas에 그리드 표시 확인

**산출물**: `mydocs/working/task_m100_2_stage2.md`

### Stage 3: hitTest 구현 및 통합

- `hit_test(x, y)` → `{ kind, col, row }` WASM export
- `get_bounds_for_item(col, row)` → Rectangle WASM export
- HTML 데모에서 마우스 클릭 시 hitTest 결과 표시
- 셀 호버 하이라이트 (선택 사항)
- 전체 동작 검증

**산출물**: `mydocs/working/task_m100_2_stage3.md`

## 최종 산출물

| 문서 | 경로 |
|------|------|
| 수행계획서 | `mydocs/plans/task_m100_2.md` (본 문서) |
| 구현계획서 | `mydocs/plans/task_m100_2_impl.md` |
| Stage 1 보고서 | `mydocs/working/task_m100_2_stage1.md` |
| Stage 2 보고서 | `mydocs/working/task_m100_2_stage2.md` |
| Stage 3 보고서 | `mydocs/working/task_m100_2_stage3.md` |
| 최종 보고서 | `mydocs/working/task_m100_2_report.md` |

## 검증 기준

1. `wasm-pack build` 성공
2. HTML 데모 페이지에서 Canvas에 그리드(헤더 + 3×3 셀) 렌더링 확인
3. 마우스 클릭 시 `hit_test()` 호출 → 올바른 `[col, row]` 반환
4. `get_bounds_for_item()` 호출 → 올바른 Rectangle 반환
5. `cargo test` 통과 (단위 테스트)

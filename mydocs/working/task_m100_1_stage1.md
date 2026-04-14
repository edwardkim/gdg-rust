# Stage 1 완료보고서: 렌더링 파이프라인 및 hitTest 분석

## 기본 정보

| 항목 | 내용 |
|------|------|
| 타스크 번호 | #1 |
| 단계 | Stage 1 / 3 |
| 작성일 | 2026-04-15 |
| 수행계획서 | `mydocs/plans/task_m100_1.md` |
| 구현계획서 | `mydocs/plans/task_m100_1_impl.md` |

---

## 1-1. Canvas 생성 및 관리 구조

### Canvas 요소 (3개)

| Canvas | 참조 | 용도 | DOM 배치 |
|--------|------|------|----------|
| **메인 캔버스** | `canvasRef` / `ref` | 그리드 셀 렌더링 | JSX `<canvas>` |
| **오버레이 캔버스** | `overlayRef` | 헤더/그룹 헤더 렌더링 | JSX `<canvas>` (absolute 포지션) |
| **버퍼 A/B** | `bufferACtx` / `bufferBCtx` | 더블 버퍼링용 오프스크린 | `document.createElement("canvas")`, DOM에 숨김 배치 |

**파일**: `packages/core/src/internal/data-grid/data-grid.tsx`

### 컨텍스트 생성
```typescript
canvas.getContext("2d", { alpha: false })  // 알파 채널 비활성화 (성능)
```

### DPR 처리
```typescript
const dpr = Math.min(maxScaleFactor, Math.ceil(window.devicePixelRatio ?? 1));

// 물리 해상도 = 논리 해상도 × DPR
canvas.width = width * dpr;     // 물리 픽셀
canvas.style.width = width + "px";  // CSS 픽셀 (변경 없음)

// 컨텍스트에 DPR 스케일링 적용
ctx.scale(dpr, dpr);
```

**maxScaleFactor 동적 조정:**
- Firefox + 스크롤 중: 1 (DPR 무시)
- Safari + 스크롤 중: 2 (DPR 제한)
- 기본: 5 (고해상도 지원)

### draw 콜백 바인딩
- `React.useCallback()`으로 30+ 의존성을 캡처한 `draw()` 함수 생성
- `useLayoutEffect`에서 초기 호출
- 폰트 로드 완료, damage 업데이트, 애니메이션 프레임에서 재호출

---

## 1-2. drawGrid() 오케스트레이터

**파일**: `packages/core/src/internal/data-grid/render/data-grid-render.ts` (line 115)

```typescript
export function drawGrid(arg: DrawGridArg, lastArg: DrawGridArg | undefined)
```

### 전체 드로잉 순서 (22단계)

```
Phase 1: 초기화 (Step 1-9)
├── [1] 캔버스 크기 0 검사 → 조기 종료
├── [2] 렌더링 전략 결정 (single/double/direct)
├── [3] DPR 계산
├── [4] canBlit 판정 (true/false/columnIndex)
├── [5] 메인 캔버스 크기 조정
├── [6] 오버레이 캔버스 크기 조정
├── [7] 버퍼 캔버스 크기 조정 (더블버퍼 시)
├── [8] 변경 없음 → 조기 종료
└── [9] 렌더 타겟 선택 + DPR 스케일 적용

Phase 2: Damage 경로 (Step 10-12) → 조기 종료
├── [10] damage 존재 확인
├── [11] 가시 영역과 damage 교차 확인 (5개 영역)
└── [12] 손상 셀만 다시 그리기 → return

Phase 3: 풀 렌더/Blit (Step 13-22)
├── [13] 헤더 텍스처 재생성 (변경 시)
├── [14] Blit 최적화 실행
│   ├── [14a] 스크롤 blit → 노출 영역만 drawRegions에 추가
│   └── [14b] 컬럼 리사이즈 blit → 변경 영역만
├── [15] 고정 컬럼/행 경계선
├── [16] 하이라이트 링 (선택 영역)
├── [17] 포커스 링 / 필 핸들
├── [18] 배경 채우기 (drawRegions 클리핑)
├── [19] ★ 셀 렌더링 (drawCells)
├── [20] 빈 영역 채우기
├── [21] 행 테마 오버라이드
├── [22] 그리드라인
├── [23] 선택/하이라이트 오버레이 실행
├── [24] 리사이즈 인디케이터
├── [25] 더블버퍼 → 메인 캔버스로 복사
├── [26] 이미지 로더 윈도우 업데이트
├── [27] 다음 프레임용 blit 데이터 저장
└── [28] 컨텍스트 상태 복원
```

### 레이어 스택 (드로잉 순서)

```
[최하위] 배경 (bgCell)
    ↑    셀 콘텐츠 (drawCells)
    ↑    빈 영역 (drawBlanks)
    ↑    행 테마 오버라이드 (drawExtraRowThemes)
    ↑    그리드라인 (drawGridLines)
    ↑    하이라이트 링 (drawHighlightRings)
    ↑    포커스/필 핸들 (drawFillHandle)
[최상위] 리사이즈 인디케이터 (drawColumnResizeOutline)
```

### 렌더링 전략

| 전략 | 설명 | 기본 사용 |
|------|------|----------|
| **single-buffer** | 메인 캔버스에 직접 그리기 | 대부분 브라우저 |
| **double-buffer** | 오프스크린 버퍼에 그린 후 복사 (플리커 방지) | Safari |
| **direct** | 최적화 없이 매번 전체 다시 그리기 | 디버깅용 |

---

## 1-3. 개별 렌더링 모듈

### 셀 렌더링 (`data-grid-render.cells.ts`)

**진입 함수**: `drawCells()` (line 75, 31개 파라미터)

**렌더링 흐름**:
1. `walkColumns()` → 가시 컬럼 순회
2. 컬럼별 `drawPrep()` 호출 (폰트/fillStyle 캐싱)
3. `walkRowsInCol()` → 각 컬럼 내 행 순회
4. damage 체크 → 해당 셀만 렌더링
5. 셀 배경 채우기 (선택/호버/비활성 상태 반영)
6. 셀 렌더러의 `draw()` 호출

**최적화**:
- 컬럼 레벨 prep 캐싱 (폰트, fillStyle)
- span 추적 (중복 렌더링 방지)
- per-cell 클리핑 (GPU 병목 방지)
- 할당 최소화 (cellIndex 튜플 재사용)

### 헤더 렌더링 (`data-grid-render.header.ts`)

**진입 함수**: `drawGridHeaders()` (line 22, 42개 파라미터)

**구성**:
- `drawGridHeaders()` → 컬럼 헤더 전체
- `drawGroups()` → 그룹 헤더 (선형 그래디언트 지원)
- `drawHeader()` → 개별 컬럼 헤더 셀
- `computeHeaderLayout()` → 텍스트/아이콘/메뉴 위치 계산

### 그리드라인 (`data-grid-render.lines.ts`)

**진입 함수**: `drawGridLines()` (line 279)

**최적화**: 같은 색상 라인을 그룹화하여 `strokeStyle` 변경 최소화
```typescript
const groups = groupBy(toDraw, line => line.color);
for (const g of Object.keys(groups)) {
    ctx.strokeStyle = g;
    for (const line of groups[g]) {
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
    }
    ctx.stroke();
}
```

**기타 함수**:
- `overdrawStickyBoundaries()` — 고정 컬럼/행 경계선
- `drawBlanks()` — 마지막 컬럼 이후 빈 영역
- `drawExtraRowThemes()` — 행별 배경색 오버라이드

### 선택/포커스 링 (`data-grid.render.rings.ts`)

**진입 함수**: `drawHighlightRings()` (line 11), `drawFillHandle()` (line 175)

**특징**: 지연 실행(deferred drawing) 패턴 — 콜백을 반환하여 나중에 실행
- 점선/실선 선택 표시 (`setLineDash`)
- 필 핸들 (원/사각형, `ctx.arc()`)

---

## 1-4. Blit 최적화 및 Damage Tracking

### Blit 최적화 (`data-grid-render.blit.ts`)

**BlitData 구조**:
```typescript
interface BlitData {
    cellXOffset: number;
    cellYOffset: number;
    translateX: number;
    translateY: number;
    mustDrawFocusOnHeader: boolean;
    mustDrawHighlightRingsOnHeader: boolean;
    lastBuffer: "a" | "b" | undefined;
    aBufferScroll: [boolean, boolean] | undefined;
    bBufferScroll: [boolean, boolean] | undefined;
}
```

**`computeCanBlit()` 판정 (line 233)**:
- 18개 상태 비교 → 하나라도 변경 시 `false` (풀 다시 그리기)
- 컬럼만 변경 시 → 단일 컬럼 리사이즈 감지 → 컬럼 인덱스 반환

**`blitLastFrame()` 로직 (line 21)**:
1. 이전 프레임 대비 픽셀 델타 계산
2. 대각선 스크롤 → blit 불가 (빈 영역 반환)
3. 수직 스크롤 → 이전 프레임 수직 복사 + 노출 영역 반환
4. 수평 스크롤 → 이전 프레임 수평 복사 + 고정 컬럼 별도 처리
5. blit 영역 최소 크기: 150×150px

### Damage Tracking

**애니메이션 큐** (`use-animation-queue.ts`):
- `requestAnimationFrame` 기반 배칭
- packed integer 큐로 메모리 할당 최소화
- 중복 제거 포함
- seq 카운터 > 600 시 재큐잉 (무한 루프 방지)

**호버 애니메이션** (`animation-manager.ts`):
- 80ms 지속, easeOutCubic 이징
- 델타 기반 프레임 독립적 애니메이션
- 애니메이션 완료 시 rAF 자동 중지

### CellSet 기반 damage 흐름
```
셀 변경 → damage(cells) → CellSet 생성 → drawGrid에 전달
→ hasItemInRegion()으로 가시 영역 교차 확인
→ 교차하는 셀만 drawCells/drawHeaders에서 렌더링
```

---

## 1-5. hitTest 메커니즘

### 전체 흐름

```
마우스 이벤트 (clientX, clientY)
    │
    ▼
getMouseArgsForPosition(canvas, posX, posY, ev)    ← data-grid.tsx:516
    │
    ├── DPR 보정: scale = rect.width / width
    │   x = (posX - rect.left) / scale
    │   y = (posY - rect.top) / scale
    │
    ├── getEffectiveColumns()     ← data-grid-lib.ts:205
    │   가시 컬럼 목록 (고정 + 스크롤)
    │
    ├── getColumnIndexForX(x, effectiveCols, translateX)    ← data-grid-lib.ts:248
    │   X좌표 → 컬럼 인덱스 (-1: 오른쪽 밖)
    │
    ├── getRowIndexForY(y, ...)    ← data-grid-lib.ts:264
    │   Y좌표 → 행 인덱스 (-2: 그룹헤더, -1: 헤더, undefined: 아래쪽 밖)
    │
    ├── getBoundsForItem(canvas, col, row)    ← data-grid.tsx:459
    │   [col, row] → 화면 좌표 Rectangle
    │
    └── GridMouseEventArgs 반환
        ├── kind: "cell" | "header" | "group-header" | "out-of-bounds"
        ├── location: [col, row]
        ├── bounds: Rectangle
        ├── localEventX, localEventY (셀 내 상대 좌표)
        ├── isEdge (리사이즈 핸들 5px 이내)
        ├── isFillHandle (필 핸들 클릭)
        └── scrollEdge, shiftKey, ctrlKey, ...
```

### getColumnIndexForX (line 248)

```typescript
function getColumnIndexForX(targetX, effectiveColumns, translateX): number {
    let x = 0;
    for (const c of effectiveColumns) {
        const cx = c.sticky ? x : x + (translateX ?? 0);
        if (targetX <= cx + c.width) return c.sourceIndex;
        x += c.width;
    }
    return -1;  // 오른쪽 밖
}
```

**핵심**: 고정 컬럼은 `translateX` 무시, 스크롤 컬럼만 오프셋 적용

### getRowIndexForY (line 264)

```typescript
function getRowIndexForY(targetY, height, hasGroups, headerHeight, 
    groupHeaderHeight, rows, rowHeight, cellYOffset, translateY, freezeTrailingRows)
{
    // 1. 그룹 헤더 영역
    if (hasGroups && targetY <= groupHeaderHeight) return -2;
    
    // 2. 일반 헤더 영역
    if (targetY <= totalHeaderHeight) return -1;
    
    // 3. 하단 고정 행 (아래에서 위로 계산)
    for (let fr = 0; fr < freezeTrailingRows; fr++) {
        // ...
    }
    
    // 4. 스크롤 가능 행
    //    균일 높이: (y - headerHeight) / rowHeight + cellYOffset
    //    가변 높이: 순회하며 누적
}
```

### getBoundsForItem / computeBounds

**역매핑**: [col, row] → 화면 Rectangle

```
X축 위치:
  고정 컬럼 (col < freezeColumns): 0부터 컬럼 너비 누적 (스크롤 무관)
  스크롤 컬럼: stickyWidth + translateX + (cellXOffset → col 너비 누적)

Y축 위치:
  그룹 헤더 (row == -2): y=0, h=groupHeaderHeight (그룹 스패닝)
  일반 헤더 (row == -1): y=groupHeaderHeight, h=headerHeight
  하단 고정 행: 캔버스 아래에서 위로 계산
  스크롤 행: totalHeaderHeight + translateY + (cellYOffset → row 높이 누적)
```

### hitTest가 의존하는 레이아웃 상태

| 상태 | 타입 | 설명 |
|------|------|------|
| `cellXOffset` | `number` | 첫 가시 컬럼 인덱스 (≥ freezeColumns) |
| `cellYOffset` | `number` | 첫 가시 행 인덱스 |
| `translateX` | `number` | 수평 서브픽셀 스크롤 오프셋 (음수) |
| `translateY` | `number` | 수직 서브픽셀 스크롤 오프셋 (음수) |
| `freezeColumns` | `number` | 왼쪽 고정 컬럼 수 |
| `freezeTrailingRows` | `number` | 하단 고정 행 수 |
| `width` / `height` | `number` | 캔버스 논리 크기 |
| `headerHeight` | `number` | 헤더 높이 |
| `groupHeaderHeight` | `number` | 그룹 헤더 높이 (0이면 비활성) |
| `rowHeight` | `number \| (row) => number` | 행 높이 (균일 또는 가변) |
| `mappedColumns` | `MappedGridColumn[]` | 컬럼 메타데이터 (sourceIndex, sticky, width) |

### 엣지 케이스

1. **컬럼 리사이즈 감지**: 헤더 셀 왼쪽 5px 이내 클릭 → 이전 컬럼의 리사이즈로 처리
2. **필 핸들 클릭**: 선택 범위 우하단 모서리에서 감지
3. **그룹 헤더 스패닝**: 같은 그룹/같은 sticky 상태인 연속 컬럼으로 자동 확장
4. **스크롤바 영역**: 캔버스 너비/높이 밖이면 `isMaybeScrollbar` 플래그
5. **가변 행 높이**: 균일 높이와 다른 코드 경로 (순회 vs 산술)

---

## 1-6. 컬럼/로우 순회(Walk) 구조

**파일**: `packages/core/src/internal/data-grid/render/data-grid-render.walk.ts`

### walkColumns (line 66)
```
for (col in effectiveCols):
    drawX = col.sticky ? clipX : x + translateX
    cb(col, drawX, drawY, clipX, cellYOffset) → true면 조기 종료
    x += col.width
    clipX += (col.sticky ? col.width : 0)
```

### walkRowsInCol (line 21)
```
// 스크롤 가능 행
while (y < height && row < rows - freezeTrailingRows):
    rh = getRowHeight(row)
    if (y + rh > skipToY):  // damage 최적화
        cb(y, row, rh, false, isAppend)
    y += rh; row++

// 하단 고정 행 (아래에서 위로)
y = height
for (fr = 0; fr < freezeTrailingRows; fr++):
    row = rows - 1 - fr
    y -= getRowHeight(row)
    cb(y, row, rh, true, isAppend)
```

### walkGroups (line 98)
- 같은 그룹명 + 같은 sticky 상태인 연속 컬럼을 하나의 그룹으로 묶어 순회
- 그룹별 콜백에 범위([startCol, endCol]), 그룹명, 위치, 크기 전달

---

## Canvas 2D API 사용 패턴 요약

| API | 사용처 | 빈도 |
|-----|--------|------|
| `fillRect()` | 배경, 셀 배경, 빈 영역 | ★★★★★ |
| `fillStyle` | 모든 채우기 전 | ★★★★★ |
| `save()` / `restore()` | 클리핑, 상태 관리 | ★★★★★ |
| `beginPath()` / `rect()` / `clip()` | 셀별 클리핑 | ★★★★★ |
| `fillText()` / `font` | 셀/헤더 텍스트 | ★★★★ |
| `moveTo()` / `lineTo()` / `stroke()` | 그리드라인, 경계선 | ★★★★ |
| `strokeStyle` / `lineWidth` | 라인 스타일 | ★★★★ |
| `scale()` | DPR 처리 | ★★★ |
| `drawImage()` | blit 복사, 더블버퍼 합성 | ★★★ |
| `setLineDash()` | 점선 선택 표시 | ★★ |
| `globalAlpha` | 호버/페이드 효과 | ★★ |
| `arc()` | 필 핸들 원형 | ★ |
| `createLinearGradient()` | 그룹 헤더 그래디언트 | ★ |
| `strokeRect()` | 선택 링 | ★ |
| `imageSmoothingEnabled` | blit 시 보간 비활성화 | ★ |
| `setTransform()` | blit 시 변환 초기화 | ★ |
| `textBaseline` | 텍스트 수직 정렬 | ★ |

---

## 최적화 메커니즘 요약

| 메커니즘 | 위치 | 효과 |
|----------|------|------|
| **Blit 스크롤 복사** | blit.ts | 스크롤 시 O(cells) → O(delta) |
| **Damage Tracking** | CellSet | 변경 셀만 다시 그리기 |
| **컬럼 prep 캐싱** | cells.ts | 폰트/fillStyle 재사용 |
| **packed integer 큐** | use-animation-queue.ts | GC 압력 감소 |
| **라인 색상 그룹화** | lines.ts | strokeStyle 변경 최소화 |
| **per-cell 클리핑** | cells.ts | GPU 클립 큐 병목 방지 |
| **skipToY 최적화** | walk.ts | damage 영역 위 행 건너뛰기 |
| **지연 드로잉** | rings.ts | 하이라이트/포커스 콜백 반환 |
| **DPR 다운스케일** | data-grid.tsx | 스크롤 시 해상도 낮춰 성능 확보 |
| **더블 버퍼 교대** | data-grid-render.ts | 버퍼 A↔B 교대로 플리커 방지 |

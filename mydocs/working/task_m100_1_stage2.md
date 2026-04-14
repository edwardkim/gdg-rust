# Stage 2 완료보고서: 데이터 모델 및 셀 렌더러 분석

## 기본 정보

| 항목 | 내용 |
|------|------|
| 타스크 번호 | #1 |
| 단계 | Stage 2 / 3 |
| 작성일 | 2026-04-15 |

---

## 2-1. GridCell 타입 계층

**파일**: `packages/core/src/internal/data-grid/data-grid-types.ts`

### GridCellKind 열거형 (12종)

| Kind | 값 | 설명 | 편집 가능 |
|------|----|------|----------|
| `Text` | "text" | 텍스트 (래핑 지원) | O |
| `Number` | "number" | 숫자 (포맷, 천단위 구분자) | O |
| `Image` | "image" | 이미지 배열 (라운딩 지원) | O |
| `Boolean` | "boolean" | 체크박스 (3상태: true/false/null) | O |
| `Markdown` | "markdown" | 마크다운 텍스트 | O |
| `Uri` | "uri" | 하이퍼링크 | O |
| `Custom` | "custom" | 사용자 정의 (제네릭 `<T>`) | O |
| `Bubble` | "bubble" | 태그/버블 배열 | X |
| `RowID` | "row-id" | 행 식별자 | X (읽기 전용) |
| `Loading` | "loading" | 스켈레톤 로더 | X |
| `Protected` | "protected" | 보호 셀 | X |
| `Drilldown` | "drilldown" | 계층 탐색 (텍스트+이미지) | X |

### InnerGridCellKind (내부 전용 2종)

| Kind | 용도 |
|------|------|
| `NewRow` | 행 추가 플레이스홀더 |
| `Marker` | 행 선택/체크박스 마커 컬럼 |

### BaseGridCell (공통 속성 9개)

```typescript
interface BaseGridCell {
    allowOverlay: boolean;                          // 편집 오버레이 활성화
    lastUpdated?: number;                           // 업데이트 타임스탬프 (애니메이션)
    style?: "normal" | "faded";                     // 표시 스타일
    themeOverride?: Partial<Theme>;                 // 셀 레벨 테마
    span?: readonly [start: number, end: number];   // 컬럼 스팬
    contentAlign?: "left" | "right" | "center";     // 정렬
    cursor?: CSSProperties["cursor"];               // 커서 스타일
    copyData?: string;                              // 복사 텍스트
    activationBehaviorOverride?: CellActivationBehavior; // 편집 트리거
}
```

### 타입 유니온 구조

```
GridCell (전체)
├── EditableGridCell (편집 가능 7종)
│   ├── TextCell      { displayData, data, readonly?, allowWrapping?, hoverEffect? }
│   ├── NumberCell     { displayData, data: number, fixedDecimals?, thousandSeparator? }
│   ├── ImageCell      { data: string[], rounding?, displayData? }
│   ├── BooleanCell    { data: bool|null|undefined, maxSize?, hoverEffectIntensity? }
│   ├── MarkdownCell   { data: string, readonly? }
│   ├── UriCell        { data: string, displayData?, onClickUri? }
│   └── CustomCell<T>  { data: T, copyData: string }
├── BubbleCell         { data: string[] }
├── RowIDCell          { data: string }
├── LoadingCell        { skeletonWidth?, skeletonHeight? }
├── ProtectedCell      { (없음) }
└── DrilldownCell      { data: DrilldownCellData[] }
```

### 컬럼 타입 계층

```
BaseGridColumn { title, group?, icon?, grow?, style?, themeOverride?, trailingRowOptions? }
├── SizedGridColumn extends BaseGridColumn { width: number, id?: string }
├── AutoGridColumn extends BaseGridColumn { id: string }  (auto-sizing)
└── InnerGridColumn = SizedGridColumn & { growOffset?, rowMarker?, ... }

GridColumn = SizedGridColumn | AutoGridColumn
```

---

## 2-2. 셀 렌더러 인터페이스

**파일**: `packages/core/src/cells/cell-types.ts`

### DrawArgs\<T\> (렌더링 컨텍스트)

```typescript
interface DrawArgs<T extends InnerGridCell> extends BaseDrawArgs {
    cell: T;                                        // 타입화된 셀 데이터
    requestAnimationFrame: (state?: any) => void;   // 애니메이션 요청
    drawState: [any, (state: any) => void];         // 영속 상태
    frameTime: number;                              // performance.now()
    overrideCursor: ((cursor) => void) | undefined; // 커서 변경
}

interface BaseDrawArgs {
    ctx: CanvasRenderingContext2D;
    theme: FullTheme;
    col: number;
    row: number;
    rect: Rectangle;           // 셀 화면 좌표
    highlighted: boolean;      // 선택/포커스 여부
    hoverAmount: number;       // 호버 애니메이션 0~1
    hoverX: number | undefined;
    hoverY: number | undefined;
    cellFillColor: string;
    imageLoader: ImageWindowLoader;
    spriteManager: SpriteManager;
    hyperWrapping: boolean;
    cell: InnerGridCell;
}
```

### BaseCellRenderer\<T\> 인터페이스

```typescript
interface BaseCellRenderer<T extends InnerGridCell> {
    // 렌더링 (필수)
    kind: T["kind"];
    draw: DrawCallback<T>;                        // ★ 메인 드로잉 함수

    // 렌더링 (선택)
    drawPrep?: PrepCallback;                      // 캔버스 상태 사전 설정
    needsHover?: boolean | ((cell: T) => boolean); // 호버 애니메이션 필요
    needsHoverPosition?: boolean;                 // 호버 마우스 좌표 필요
    measure?: (ctx, cell, theme) => number;       // 콘텐츠 너비 측정

    // 편집
    provideEditor?: ProvideEditorCallback<T>;     // 에디터 컴포넌트 제공

    // 이벤트
    onClick?: (args) => T | undefined;            // 클릭 처리
    onSelect?: (args) => void;                    // 선택 이벤트
    onDelete?: (cell: T) => T | undefined;        // 삭제 처리
}
```

### PrepResult 라이프사이클

```
컬럼 루프 시작
  │
  ▼ 행마다 반복:
  [1] 렌더러 변경 확인 (lastPrep?.renderer !== currentRenderer)
      → 변경 시 deprep() 호출 + lastPrep 초기화
  [2] drawPrep(args, lastPrep) → PrepResult { font, fillStyle, renderer, deprep }
      → font/fillStyle 캐싱 (같은 컬럼 내 재사용)
  [3] draw(args, cell) → 실제 렌더링
  [4] lastPrep 저장 (다음 행에서 재사용)
  │
  ▼ 컬럼 루프 종료
  deprep(lastPrep)  // 마지막 정리
```

**효과**: 같은 컬럼 내 연속 셀의 `ctx.font`, `ctx.fillStyle` 재설정 비용 절감

### InternalCellRenderer\<T\> (내부 렌더러)

BaseCellRenderer 확장:
- `getAccessibilityString(cell): string` — 스크린 리더 텍스트 (필수)
- `onPaste(val, cell, details): T | undefined` — 붙여넣기 처리 (필수)

### CustomRenderer\<T\> (사용자 렌더러)

BaseCellRenderer 확장:
- `isMatch(cell): cell is T` — 타입 가드 (필수)
- `onPaste?(val, cellData): T["data"] | undefined`

---

## 2-3. 주요 셀 렌더러 Canvas API 사용 패턴

### 셀별 Canvas API 비교표

| Canvas API | Text | Number | Boolean | Image |
|------------|:----:|:------:|:-------:|:-----:|
| `fillText()` | ★ | ★ | - | - |
| `measureText()` | ★ | ★ | - | - |
| `fillRect()` | ○ | ○ | - | - |
| `fillStyle` | ★ | ★ | ★ | - |
| `globalAlpha` | ○ | ○ | ★ | - |
| `beginPath()` | ○ | ○ | ★ | ○ |
| `fill()` | ○ | ○ | ★ | - |
| `stroke()` | - | - | ★ | - |
| `moveTo()/lineTo()` | - | - | ★ | - |
| `arcTo()` | - | - | ★ | ○ |
| `lineJoin/lineCap` | - | - | ★ | - |
| `lineWidth` | - | - | ★ | - |
| `drawImage()` | - | - | - | ★ |
| `save()/restore()` | ○ | - | - | ★ |
| `clip()` | ○ | - | - | ★ |
| `textAlign` | ★ | ★ | - | - |
| `font` | ★ | ★ | - | - |

★ = 핵심 사용, ○ = 조건부 사용, - = 미사용

### Text Cell (`text-cell.tsx`)

- **draw()**: `drawEditHoverIndicator()` (호버 시) → `drawTextCell()` (텍스트 렌더링)
- **measure()**: `ctx.measureText(line).width + cellHorizontalPadding × 2`
  - 멀티라인 시 각 줄 중 최대 너비
- **drawPrep()**: `ctx.fillStyle = theme.textDark`
- **needsHover**: `cell.hoverEffect === true`일 때만
- **특징**: RTL 지원 (`ctx.direction`), 텍스트 래핑 시 클리핑

### Number Cell (`number-cell.tsx`)

- **draw()**: Text Cell과 동일 코드 경로 (`drawEditHoverIndicator` + `drawTextCell`)
- **measure()**: `ctx.measureText(displayData).width + cellHorizontalPadding × 2`
- **drawPrep()**: Text Cell과 동일 (`prepTextCell`)
- **needsHover**: `cell.hoverEffect === true`일 때만
- **특징**: 래핑 없음 (단일 행), 보통 우측 정렬 (`contentAlign: "right"`)

### Boolean Cell (`boolean-cell.tsx`)

- **draw()**: `drawBoolean()` → `drawCheckbox()` (3가지 상태)
  - **true**: `roundedRect` + `fill` (배경) → `moveTo/lineTo/stroke` (체크마크)
  - **false/empty**: `roundedRect` + `stroke` (테두리만)
  - **indeterminate**: `roundedRect` + `fill` (배경) → `moveTo/lineTo/stroke` (가로선)
- **measure()**: 고정 50px
- **needsHover**: 항상 `true`
- **needsHoverPosition**: `true` (체크박스 영역 감지)
- **특징**: `ctx.globalAlpha`로 호버 페이드, `arcTo()`로 둥근 모서리

### Image Cell (`image-cell.tsx`)

- **draw()**: `imageLoader.loadOrGetImage()` → 종횡비 유지 스케일링 → `ctx.drawImage()`
  - rounding > 0일 때: `roundedRect` → `save` → `clip` → `drawImage` → `restore`
- **measure()**: `cell.data.length × 50` (이미지 수 × 50px, 고정)
- **needsHover**: `false`
- **특징**: 비동기 이미지 로딩, `displayData`로 저해상도 프리뷰 지원

---

## 2-4. 컬럼 크기 결정 로직

**파일**: `packages/core/src/data-editor/use-column-sizer.ts`

### useColumnSizer 훅

```typescript
function useColumnSizer(
    columns, rows, getCellsForSelection, clientWidth,
    minColumnWidth, maxColumnWidth, theme, getCellRenderer, abortController
): { sizedColumns: InnerGridColumn[]; nonGrowWidth: number }
```

### 크기 결정 플로우

```
[1] SizedGridColumn (width 명시) → 그대로 사용
[2] AutoGridColumn (id만 있음) → 자동 측정
    │
    ├── [2a] 셀 데이터 샘플링
    │   ├── computeRows = max(1, 10 - floor(columns / 10000))
    │   ├── 상위 N행 + 마지막 1행 (tail) 샘플
    │   └── getCellsForSelection()으로 셀 데이터 가져오기
    │
    ├── [2b] 셀 너비 측정
    │   ├── 각 셀: renderer.measure(ctx, cell, theme)
    │   ├── 이상치 제거: 샘플 > 5개 시, 평균의 2배 이상 → 제외
    │   └── 최대값 선택
    │
    ├── [2c] 헤더 너비 측정
    │   ├── ctx.font = headerFontFull
    │   ├── ctx.measureText(title).width + padding × 2 + (아이콘 28px)
    │   └── max(셀 너비, 헤더 너비)
    │
    └── [2d] 범위 클램핑
        └── max(minColumnWidth, min(maxColumnWidth, ceil(측정값)))

[3] Grow 분배 (여유 공간 존재 시)
    │
    ├── extra = clientWidth - totalWidth
    ├── 각 컬럼: toAdd = floor(extra × (grow / totalGrow))
    ├── 마지막 컬럼: toAdd = remaining (정확한 합 보장)
    └── width += growOffset
```

### 이상치 제거 전략
- 샘플 > 5개일 때만 적용
- 임계값: 평균 너비의 2배
- 이상치 셀 너비를 0으로 설정 (max 계산에서 제외)
- 목적: 단일 비정상 행이 전체 컬럼 너비를 지배하지 않도록 방지

### measure() 반환값 비교

| 셀 타입 | measure() 로직 | 단위 |
|---------|---------------|------|
| Text | `max(각 줄 measureText) + padding×2` | px |
| Number | `measureText(displayData) + padding×2` | px |
| Boolean | 고정 `50` | px |
| Image | `data.length × 50` | px |
| Loading | 기본값 (`150`) | px |
| 기타 | 기본값 (`150`) | px |

---

## 2-5. 데이터 공급 패턴

**파일**: `packages/core/src/data-editor/data-editor.tsx`

### 핵심 Props

```typescript
interface DataEditorProps {
    columns: readonly GridColumn[];        // 컬럼 정의
    rows: number;                          // 행 수
    getCellContent: (cell: Item) => GridCell;  // ★ 핵심 데이터 콜백
    getCellsForSelection?: ...;            // 범위 선택/복사용 배치 조회
    onCellEdited?: (cell: Item, newValue: EditableGridCell) => void;
    onCellsEdited?: (newValues: EditListItem[]) => boolean | void;
    onVisibleRegionChanged?: (range, tx, ty, extras) => void;
    customRenderers?: readonly CustomRenderer[];
    rowHeight?: number | ((index: number) => number);  // 기본 34px
    headerHeight?: number;                  // 기본 36px
    groupHeaderHeight?: number;
    getRowThemeOverride?: (row, groupRow, contentRow) => Partial<Theme> | undefined;
}
```

### 데이터 흐름도

```
애플리케이션
  │
  ├── columns: GridColumn[]
  ├── rows: number
  └── getCellContent([col, row]) → GridCell
         │
         ▼
    DataEditor
         │
         ├── useColumnSizer()
         │   └── renderer.measure(ctx, cell, theme) → 컬럼 너비
         │
         ├── 렌더 루프 (Canvas)
         │   │
         │   ├── 가시 영역의 각 [col, row]:
         │   │   ├── cell = getCellContent([col, row])
         │   │   ├── theme = merge(base, group, column, row, trailing, cell)
         │   │   ├── renderer = getCellRenderer(cell)
         │   │   └── renderer.draw(ctx, cell, rect, theme, ...)
         │   │
         │   └── onVisibleRegionChanged(range, tx, ty) → 외부 통보
         │
         └── 편집 시:
             └── onCellEdited([col, row], newValue) → 애플리케이션에 통보
```

### DataEditorRef (외부 제어 API)

| 메서드 | 설명 |
|--------|------|
| `updateCells(cells)` | 특정 셀 다시 그리기 트리거 |
| `getBounds(col, row)` | 셀 화면 좌표 Rectangle 반환 |
| `scrollTo(col, row, ...)` | 프로그래밍 방식 스크롤 |
| `focus()` | 포커스 설정 |
| `remeasureColumns(cols)` | 컬럼 너비 재측정 |
| `getMouseArgsForPosition(x, y, ev)` | 좌표 → GridMouseEventArgs (hitTest) |
| `appendRow(col, ...)` | 행 추가 |

---

## 2-6. 테마 시스템

**파일**: `packages/core/src/common/styles.ts`

### Theme 속성 분류

#### 색상 속성 (24개)

| 카테고리 | 속성 | 기본값 |
|----------|------|--------|
| **액센트** | `accentColor` | #4F5DFF |
| | `accentFg` | #FFFFFF |
| | `accentLight` | rgba(62,116,253,0.1) |
| **텍스트** | `textDark` | #313139 |
| | `textMedium` | #737383 |
| | `textLight` | #B2B2C0 |
| | `textBubble` | #313139 |
| **헤더** | `textHeader` | #313139 |
| | `textGroupHeader` | #313139BB |
| | `textHeaderSelected` | #FFFFFF |
| | `bgIconHeader` | #737383 |
| | `fgIconHeader` | #FFFFFF |
| | `bgHeader` | #F7F7F8 |
| | `bgHeaderHasFocus` | #E9E9EB |
| | `bgHeaderHovered` | #EFEFF1 |
| | `bgGroupHeader?` | (상속) |
| | `bgGroupHeaderHovered?` | (상속) |
| **셀** | `bgCell` | #FFFFFF |
| | `bgCellMedium` | #FAFAFB |
| **버블** | `bgBubble` | #EDEDF3 |
| | `bgBubbleSelected` | #FFFFFF |
| **기타** | `bgSearchResult` | #fff9e3 |
| | `borderColor` | rgba(115,116,131,0.16) |
| | `drilldownBorder` | rgba(0,0,0,0) |
| | `linkColor` | #353fb5 |

#### 간격/크기 속성 (5개)

| 속성 | 기본값 | 용도 |
|------|--------|------|
| `cellHorizontalPadding` | 8 | 셀 좌우 패딩 |
| `cellVerticalPadding` | 3 | 셀 상하 패딩 |
| `headerIconSize` | 18 | 헤더 아이콘 크기 |
| `checkboxMaxSize` | 18 | 체크박스 최대 크기 |
| `lineHeight` | 1.4 | 줄 높이 배율 |

#### 폰트 속성 (5개)

| 속성 | 기본값 | 용도 |
|------|--------|------|
| `headerFontStyle` | "600 13px" | 헤더 폰트 |
| `baseFontStyle` | "13px" | 셀 텍스트 폰트 |
| `markerFontStyle` | "9px" | 마커 폰트 |
| `fontFamily` | "Inter, Roboto, ..." | 폰트 패밀리 |
| `editorFontSize` | "13px" | 에디터 폰트 크기 |

#### 버블 속성 (3개)

| 속성 | 기본값 |
|------|--------|
| `bubbleHeight` | 20 |
| `bubblePadding` | 6 |
| `bubbleMargin` | 4 |

#### 선택적 속성 (4개)

| 속성 | 설명 |
|------|------|
| `horizontalBorderColor?` | 수평 경계선 (기본: borderColor) |
| `headerBottomBorderColor?` | 헤더 하단 경계선 |
| `resizeIndicatorColor?` | 리사이즈 핸들 색상 |
| `roundingRadius?` | 모서리 라운딩 |

### FullTheme (계산된 속성 추가)

```typescript
interface FullTheme extends Theme {
    headerFontFull: string;   // "600 13px Inter, Roboto, ..."
    baseFontFull: string;     // "13px Inter, Roboto, ..."
    markerFontFull: string;   // "9px Inter, Roboto, ..."
}
```

### 테마 오버라이드 계층 (우선순위 순)

```
[1] 기본 테마 (dataEditorBaseTheme)
  ↓ mergeAndRealizeTheme()
[2] DataEditor.theme prop (전역)
  ↓
[3] 그룹 테마 (getGroupDetails().overrideTheme)
  ↓
[4] 컬럼 테마 (GridColumn.themeOverride)
  ↓ mergeAndRealizeTheme(base, group, column)
[5] 행 테마 (getRowThemeOverride(row))
  ↓
[6] 추가행 테마 (trailingRowOptions.themeOverride)
  ↓
[7] 셀 테마 (GridCell.themeOverride)    ← 최우선
  ↓ mergeAndRealizeTheme(column, row, trailing, cell)
= 최종 테마 (렌더링에 사용)
```

**병합 규칙**:
- `bgCell`만 **알파 블렌딩** (투명도 보존)
- 나머지 속성은 **덮어쓰기** (undefined 시 건너뜀)
- 폰트 속성은 변경 시 `fontStyle + fontFamily` 재합성

### CSS 커스텀 프로퍼티

테마 속성은 `--gdg-*` CSS 변수로도 노출되어 에디터/오버레이 스타일링에 사용:
```
--gdg-accent-color, --gdg-bg-cell, --gdg-text-dark, --gdg-border-color, ...
```

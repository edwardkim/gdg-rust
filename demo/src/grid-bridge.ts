/**
 * GridBridge — WASM GridRenderer를 래핑하여 JS 측 상태 관리
 * rhwp-studio의 WasmBridge 패턴
 */

import type { EventBus } from "./event-bus";

// WASM 타입 (pkg에서 import)
export interface HitTestResult {
    kind: "cell" | "header" | "group-header" | "out-of-bounds";
    col?: number;
    row?: number;
}

export interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ThemeOverrideDef {
    bg_cell?: string;
    bg_header?: string;
    text_dark?: string;
    text_header?: string;
    accent_color?: string;
}

export interface ColumnDef {
    title: string;
    width: number;
    group?: string | null;
    icon?: string | null;
    has_menu?: boolean;
    theme_override?: ThemeOverrideDef | null;
}

export class GridBridge {
    private renderer: any; // WASM GridRenderer
    private ctx: CanvasRenderingContext2D;
    private canvas: HTMLCanvasElement;
    private bus: EventBus;
    public columns: ColumnDef[];

    constructor(renderer: any, canvas: HTMLCanvasElement, bus: EventBus) {
        this.renderer = renderer;
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;
        this.bus = bus;
        this.columns = [];
    }

    // --- 데이터 설정 ---

    setColumns(columns: ColumnDef[]): void {
        this.columns = columns;
        this.renderer.set_columns(columns);
    }

    setData(rows: number, data: any[]): void {
        this.renderer.set_data(rows, data);
    }

    // --- 스크롤 ---

    get scrollX(): number { return this.renderer.get_scroll_x(); }
    get scrollY(): number { return this.renderer.get_scroll_y(); }
    get contentWidth(): number { return this.renderer.content_width(); }
    get contentHeight(): number { return this.renderer.content_height(); }

    scrollTo(x: number, y: number): void {
        this.renderer.set_scroll_x(x);
        this.renderer.set_scroll_y(y);
    }

    scrollXTo(x: number): void {
        this.renderer.set_scroll_x(Math.max(0, x));
    }

    scrollYTo(y: number): void {
        this.renderer.set_scroll_y(Math.max(0, y));
    }

    // --- 인터랙션 ---

    setHover(col: number, row: number): void {
        this.renderer.set_hover(col, row);
    }

    setSelection(col: number, row: number): void {
        this.renderer.set_selection(col, row);
    }

    resizeColumn(col: number, width: number): void {
        this.renderer.resize_column(col, width);
        if (col < this.columns.length) {
            this.columns[col].width = width;
        }
    }

    setRange(col1: number, row1: number, col2: number, row2: number): void {
        this.renderer.set_range(col1, row1, col2, row2);
    }

    clearRange(): void {
        this.renderer.clear_range();
    }

    // --- hitTest ---

    hitTest(x: number, y: number): HitTestResult {
        return this.renderer.hit_test(x, y);
    }

    getBounds(col: number, row: number): Rectangle | null {
        return this.renderer.get_bounds(col, row);
    }

    // --- 드로잉 ---

    private _logicalWidth: number = 0;
    private _logicalHeight: number = 0;

    /** DPR 적용 초기화 — Canvas 물리 크기 설정 */
    setupDpr(): void {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this._logicalWidth = rect.width;
        this._logicalHeight = rect.height;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
    }

    draw(): void {
        const dpr = window.devicePixelRatio || 1;
        if (this.renderer.draw_with_dpr) {
            this.renderer.draw_with_dpr(this.ctx, this._logicalWidth || this.canvas.width, this._logicalHeight || this.canvas.height, dpr);
        } else {
            this.renderer.draw(this.ctx, this.canvas.width, this.canvas.height);
        }
    }

    get width(): number { return this._logicalWidth || this.canvas.width; }
    get height(): number { return this._logicalHeight || this.canvas.height; }
    get context(): CanvasRenderingContext2D { return this.ctx; }
}

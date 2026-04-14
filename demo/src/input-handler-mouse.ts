/**
 * InputHandlerMouse — 마우스 이벤트 처리
 * 클릭, 호버, 스크롤바 드래그, 컬럼 리사이즈, 마우스 휠
 */

import type { EventBus } from "./event-bus";
import type { GridBridge } from "./grid-bridge";
import type { Scrollbar } from "./scrollbar";
import { SCROLLBAR_WIDTH, H_SCROLLBAR_HEIGHT } from "./scrollbar";

export type DragMode = "idle" | "v-scrollbar" | "h-scrollbar" | "column-resize" | "range-dragging";

const EDGE_DETECT = 5;

export class InputHandlerMouse {
    private bus: EventBus;
    private bridge: GridBridge;
    private scrollbar: Scrollbar;
    private canvas: HTMLCanvasElement;

    private dragMode: DragMode = "idle";
    private dragStartPos = 0;
    private dragStartScroll = 0;
    private resizeCol = -1;

    // 범위 선택 드래그
    private rangeAnchor: { col: number; row: number } | null = null;
    private wasDraggingRange = false;

    private headerHeight: number;
    private groupHeaderHeight: number;

    constructor(bus: EventBus, bridge: GridBridge, scrollbar: Scrollbar, canvas: HTMLCanvasElement) {
        this.bus = bus;
        this.bridge = bridge;
        this.scrollbar = scrollbar;
        this.canvas = canvas;

        const hasGroups = bridge.columns.some(c => c.group);
        this.groupHeaderHeight = hasGroups ? 28 : 0;
        this.headerHeight = this.groupHeaderHeight + 36;
    }

    // --- 컬럼 경계 감지 ---

    private getColumnEdge(mx: number): number {
        const sx = this.bridge.scrollX;
        let cx = -sx;
        for (let i = 0; i < this.bridge.columns.length; i++) {
            cx += this.bridge.columns[i].width;
            if (Math.abs(mx - cx) <= EDGE_DETECT) return i;
        }
        return -1;
    }

    // --- 이벤트 핸들러 ---

    handleMouseDown(e: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // 컬럼 리사이즈
        if (my <= this.headerHeight && my > this.groupHeaderHeight) {
            const edge = this.getColumnEdge(mx);
            if (edge >= 0) {
                e.preventDefault();
                this.dragMode = "column-resize";
                this.resizeCol = edge;
                this.dragStartPos = mx;
                this.dragStartScroll = this.bridge.columns[edge].width;
                return;
            }
        }

        // 수직 스크롤바
        if (mx >= this.bridge.width - SCROLLBAR_WIDTH && my < this.bridge.height - H_SCROLLBAR_HEIGHT) {
            e.preventDefault();
            const thumb = this.scrollbar.getVerticalThumb();
            if (!thumb) return;
            if (my >= thumb.y && my <= thumb.y + thumb.height) {
                this.dragMode = "v-scrollbar";
                this.dragStartPos = my;
                this.dragStartScroll = this.bridge.scrollY;
            } else {
                const viewportH = this.bridge.height - H_SCROLLBAR_HEIGHT;
                this.bridge.scrollYTo(Math.min(this.scrollbar.getMaxScrollY(), (my / viewportH) * this.scrollbar.getMaxScrollY()));
                this.bus.emit("redraw-requested");
            }
            return;
        }

        // 수평 스크롤바
        if (my >= this.bridge.height - H_SCROLLBAR_HEIGHT && mx < this.bridge.width - SCROLLBAR_WIDTH) {
            e.preventDefault();
            const thumb = this.scrollbar.getHorizontalThumb();
            if (!thumb) return;
            if (mx >= thumb.x && mx <= thumb.x + thumb.width) {
                this.dragMode = "h-scrollbar";
                this.dragStartPos = mx;
                this.dragStartScroll = this.bridge.scrollX;
            } else {
                const viewportW = this.bridge.width - SCROLLBAR_WIDTH;
                this.bridge.scrollXTo(Math.min(this.scrollbar.getMaxScrollX(), (mx / viewportW) * this.scrollbar.getMaxScrollX()));
                this.bus.emit("redraw-requested");
            }
            return;
        }

        // 셀 영역 — 범위 선택 드래그 시작
        const result = this.bridge.hitTest(mx, my);
        if (result.kind === "cell") {
            this.dragMode = "range-dragging";
            this.rangeAnchor = { col: result.col!, row: result.row! };
            // 초기: 단일 셀 선택
            this.bridge.setSelection(result.col!, result.row!);
            this.bridge.setRange(result.col!, result.row!, result.col!, result.row!);
            this.bus.emit("selection-changed", { col: result.col, row: result.row });
            this.bus.emit("redraw-requested");
        }
    }

    handleMouseMove(e: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // 드래그 중
        if (this.dragMode === "column-resize") {
            const delta = mx - this.dragStartPos;
            const newWidth = Math.max(30, this.dragStartScroll + delta);
            this.bridge.resizeColumn(this.resizeCol, newWidth);
            this.bus.emit("column-resized", { col: this.resizeCol, width: newWidth });
            this.bus.emit("redraw-requested");
            return;
        }
        if (this.dragMode === "v-scrollbar") {
            const delta = my - this.dragStartPos;
            const contentH = this.bridge.contentHeight;
            const viewportH = this.bridge.height - H_SCROLLBAR_HEIGHT;
            const thumbH = Math.max(30, (viewportH / contentH) * viewportH);
            const trackH = viewportH - thumbH;
            if (trackH > 0) {
                this.bridge.scrollYTo(Math.min(this.scrollbar.getMaxScrollY(), this.dragStartScroll + (delta / trackH) * this.scrollbar.getMaxScrollY()));
                this.bus.emit("redraw-requested");
            }
            return;
        }
        if (this.dragMode === "h-scrollbar") {
            const delta = mx - this.dragStartPos;
            const contentW = this.bridge.contentWidth;
            const viewportW = this.bridge.width - SCROLLBAR_WIDTH;
            const thumbW = Math.max(30, (viewportW / contentW) * viewportW);
            const trackW = viewportW - thumbW;
            if (trackW > 0) {
                this.bridge.scrollXTo(Math.min(this.scrollbar.getMaxScrollX(), this.dragStartScroll + (delta / trackW) * this.scrollbar.getMaxScrollX()));
                this.bus.emit("redraw-requested");
            }
            return;
        }
        if (this.dragMode === "range-dragging" && this.rangeAnchor) {
            const result = this.bridge.hitTest(mx, my);
            if (result.kind === "cell") {
                this.bridge.setRange(
                    this.rangeAnchor.col, this.rangeAnchor.row,
                    result.col!, result.row!,
                );
                this.bus.emit("redraw-requested");
            }
            return;
        }

        // 호버
        if (mx >= this.bridge.width - SCROLLBAR_WIDTH || my >= this.bridge.height - H_SCROLLBAR_HEIGHT) {
            this.canvas.style.cursor = "default";
            this.bridge.setHover(-1, -1);
            this.bus.emit("redraw-requested");
            return;
        }

        const result = this.bridge.hitTest(mx, my);

        if (result.kind === "header") {
            const isInGroupHeader = this.groupHeaderHeight > 0 && my <= this.groupHeaderHeight;
            const edge = this.getColumnEdge(mx);
            this.canvas.style.cursor = (edge >= 0 && !isInGroupHeader) ? "col-resize" : "pointer";
            this.bridge.setHover(result.col!, isInGroupHeader ? -2 : -1);
        } else if (result.kind === "cell") {
            this.canvas.style.cursor = "pointer";
            this.bridge.setHover(result.col!, result.row!);
        } else {
            this.canvas.style.cursor = "default";
            this.bridge.setHover(-1, -1);
        }
        this.bus.emit("redraw-requested");
    }

    handleMouseUp(): void {
        this.wasDraggingRange = this.dragMode === "range-dragging";
        this.dragMode = "idle";
        this.rangeAnchor = null;
    }

    handleClick(e: MouseEvent): void {
        if (this.dragMode !== "idle") return;

        // 드래그 범위 선택 직후의 click은 무시 (범위 해제 방지)
        if (this.wasDraggingRange) {
            this.wasDraggingRange = false;
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        if (mx >= this.bridge.width - SCROLLBAR_WIDTH) return;
        if (my >= this.bridge.height - H_SCROLLBAR_HEIGHT) return;

        const result = this.bridge.hitTest(mx, my);

        if (result.kind === "cell") {
            this.bridge.setSelection(result.col!, result.row!);
            this.bridge.clearRange();
            this.bus.emit("selection-changed", { col: result.col, row: result.row });
            this.bus.emit("cell-clicked", { col: result.col, row: result.row });
        } else if (result.kind === "header") {
            this.bridge.setSelection(-1, -1);
            this.bridge.clearRange();
            this.bus.emit("selection-changed", null);
            this.bus.emit("header-clicked", { col: result.col });
        } else {
            this.bridge.setSelection(-1, -1);
            this.bus.emit("selection-changed", null);
        }
        this.bus.emit("redraw-requested");
    }

    handleWheel(e: WheelEvent): void {
        e.preventDefault();
        if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            const delta = e.deltaX || e.deltaY;
            this.bridge.scrollXTo(Math.min(this.scrollbar.getMaxScrollX(), this.bridge.scrollX + delta));
        } else {
            this.bridge.scrollYTo(Math.min(this.scrollbar.getMaxScrollY(), this.bridge.scrollY + e.deltaY));
        }
        this.bus.emit("redraw-requested");
    }

    get isDragging(): boolean {
        return this.dragMode !== "idle";
    }
}

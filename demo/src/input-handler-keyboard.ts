/**
 * InputHandlerKeyboard — 키보드 이벤트 처리
 * 셀 이동, 페이지 이동, Home/End
 */

import type { EventBus } from "./event-bus";
import type { GridBridge, ColumnDef } from "./grid-bridge";
import type { Scrollbar } from "./scrollbar";
import { SCROLLBAR_WIDTH, H_SCROLLBAR_HEIGHT } from "./scrollbar";

export class InputHandlerKeyboard {
    private bus: EventBus;
    private bridge: GridBridge;
    private scrollbar: Scrollbar;
    private selectedCell: { col: number; row: number } | null = null;
    private rangeEnd: { col: number; row: number } | null = null;
    private rowCount: number;

    constructor(bus: EventBus, bridge: GridBridge, scrollbar: Scrollbar, rowCount: number) {
        this.bus = bus;
        this.bridge = bridge;
        this.scrollbar = scrollbar;
        this.rowCount = rowCount;

        bus.on("selection-changed", (sel: any) => {
            this.selectedCell = sel;
        });
    }

    handleKeyDown(e: KeyboardEvent): void {
        const cols = this.bridge.columns;
        const ROW_HEIGHT = 34;
        const HEADER_HEIGHT = cols.some(c => c.group) ? 64 : 36;
        const PAGE_ROWS = Math.floor((this.bridge.height - HEADER_HEIGHT) / ROW_HEIGHT);

        const shift = e.shiftKey;

        switch (e.key) {
            case "ArrowDown":  e.preventDefault(); shift ? this.extendRange(0, 1) : this.moveSelection(0, 1); break;
            case "ArrowUp":    e.preventDefault(); shift ? this.extendRange(0, -1) : this.moveSelection(0, -1); break;
            case "ArrowRight": e.preventDefault(); shift ? this.extendRange(1, 0) : this.moveSelection(1, 0); break;
            case "ArrowLeft":  e.preventDefault(); shift ? this.extendRange(-1, 0) : this.moveSelection(-1, 0); break;
            case "PageDown":   e.preventDefault(); shift ? this.extendRange(0, PAGE_ROWS) : this.moveSelection(0, PAGE_ROWS); break;
            case "PageUp":     e.preventDefault(); shift ? this.extendRange(0, -PAGE_ROWS) : this.moveSelection(0, -PAGE_ROWS); break;
            case "Home":
                e.preventDefault();
                if (e.ctrlKey) {
                    this.setSelection(0, 0);
                } else {
                    this.setSelection(0, this.selectedCell?.row ?? 0);
                }
                break;
            case "End":
                e.preventDefault();
                if (e.ctrlKey) {
                    this.setSelection(cols.length - 1, this.rowCount - 1);
                } else {
                    this.setSelection(cols.length - 1, this.selectedCell?.row ?? 0);
                }
                break;
            case "Tab":
                e.preventDefault();
                this.moveSelection(e.shiftKey ? -1 : 1, 0);
                break;
            case "Escape":
                e.preventDefault();
                this.bus.emit("selection-changed", null);
                this.bridge.setSelection(-1, -1);
                this.bridge.clearRange();
                this.rangeEnd = null;
                this.bus.emit("redraw-requested");
                break;
        }
    }

    private moveSelection(dc: number, dr: number): void {
        const cols = this.bridge.columns;
        if (!this.selectedCell) {
            this.setSelection(0, 0);
            return;
        }
        const newCol = Math.max(0, Math.min(cols.length - 1, this.selectedCell.col + dc));
        const newRow = Math.max(0, Math.min(this.rowCount - 1, this.selectedCell.row + dr));
        this.rangeEnd = null;
        this.bridge.clearRange();
        this.setSelection(newCol, newRow);
    }

    private extendRange(dc: number, dr: number): void {
        const cols = this.bridge.columns;
        if (!this.selectedCell) {
            this.setSelection(0, 0);
            return;
        }
        // anchor = selectedCell, end = rangeEnd (없으면 selectedCell)
        const end = this.rangeEnd ?? { ...this.selectedCell };
        const newCol = Math.max(0, Math.min(cols.length - 1, end.col + dc));
        const newRow = Math.max(0, Math.min(this.rowCount - 1, end.row + dr));
        this.rangeEnd = { col: newCol, row: newRow };

        this.bridge.setRange(
            this.selectedCell.col, this.selectedCell.row,
            newCol, newRow,
        );
        this.ensureVisible(newCol, newRow);
        this.bus.emit("redraw-requested");
    }

    private setSelection(col: number, row: number): void {
        this.selectedCell = { col, row };
        this.bridge.setSelection(col, row);
        this.ensureVisible(col, row);
        this.bus.emit("selection-changed", { col, row });
        this.bus.emit("redraw-requested");
    }

    private ensureVisible(col: number, row: number): void {
        const cols = this.bridge.columns;
        const ROW_HEIGHT = 34;
        const HEADER_HEIGHT = cols.some(c => c.group) ? 64 : 36;

        // 수직
        const cellTop = HEADER_HEIGHT + row * ROW_HEIGHT;
        const cellBottom = cellTop + ROW_HEIGHT;
        const sy = this.bridge.scrollY;
        const viewTop = sy + HEADER_HEIGHT;
        const viewBottom = sy + this.bridge.height - H_SCROLLBAR_HEIGHT;

        if (cellTop < viewTop) {
            this.bridge.scrollYTo(Math.max(0, Math.min(this.scrollbar.getMaxScrollY(), cellTop - HEADER_HEIGHT)));
        } else if (cellBottom > viewBottom) {
            this.bridge.scrollYTo(Math.max(0, Math.min(this.scrollbar.getMaxScrollY(), cellBottom - this.bridge.height + H_SCROLLBAR_HEIGHT)));
        }

        // 수평
        let cellLeft = 0;
        for (let i = 0; i < col; i++) cellLeft += cols[i].width;
        const cellRight = cellLeft + cols[col].width;
        const sx = this.bridge.scrollX;
        const viewLeft = sx;
        const viewRight = sx + this.bridge.width - SCROLLBAR_WIDTH;

        if (cellLeft < viewLeft) {
            this.bridge.scrollXTo(Math.max(0, Math.min(this.scrollbar.getMaxScrollX(), cellLeft)));
        } else if (cellRight > viewRight) {
            this.bridge.scrollXTo(Math.max(0, Math.min(this.scrollbar.getMaxScrollX(), cellRight - this.bridge.width + SCROLLBAR_WIDTH)));
        }
    }
}

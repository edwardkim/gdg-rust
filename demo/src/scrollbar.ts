/**
 * Scrollbar — 수직/수평 스크롤바 렌더링 및 드래그 처리
 */

import type { GridBridge } from "./grid-bridge";

export const SCROLLBAR_WIDTH = 14;
export const H_SCROLLBAR_HEIGHT = 14;

export class Scrollbar {
    private bridge: GridBridge;

    constructor(bridge: GridBridge) {
        this.bridge = bridge;
    }

    getMaxScrollX(): number {
        return Math.max(0, this.bridge.contentWidth - this.bridge.width + SCROLLBAR_WIDTH);
    }

    getMaxScrollY(): number {
        return Math.max(0, this.bridge.contentHeight - this.bridge.height + H_SCROLLBAR_HEIGHT);
    }

    draw(ctx: CanvasRenderingContext2D): void {
        this.drawVertical(ctx);
        this.drawHorizontal(ctx);
    }

    private drawVertical(ctx: CanvasRenderingContext2D): void {
        const contentH = this.bridge.contentHeight;
        const viewportH = this.bridge.height - H_SCROLLBAR_HEIGHT;
        if (contentH <= viewportH) return;

        const scrollY = this.bridge.scrollY;
        const maxScroll = this.getMaxScrollY();
        const barHeight = Math.max(30, (viewportH / contentH) * viewportH);
        const barY = maxScroll > 0 ? (scrollY / maxScroll) * (viewportH - barHeight) : 0;

        ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        ctx.fillRect(this.bridge.width - SCROLLBAR_WIDTH, 0, SCROLLBAR_WIDTH, viewportH);

        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.beginPath();
        this.roundRect(ctx, this.bridge.width - SCROLLBAR_WIDTH + 3, barY + 2, SCROLLBAR_WIDTH - 6, barHeight - 4, 3);
        ctx.fill();
    }

    private drawHorizontal(ctx: CanvasRenderingContext2D): void {
        const contentW = this.bridge.contentWidth;
        const viewportW = this.bridge.width - SCROLLBAR_WIDTH;
        if (contentW <= viewportW) return;

        const scrollX = this.bridge.scrollX;
        const maxScroll = this.getMaxScrollX();
        const barWidth = Math.max(30, (viewportW / contentW) * viewportW);
        const barX = maxScroll > 0 ? (scrollX / maxScroll) * (viewportW - barWidth) : 0;

        ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        ctx.fillRect(0, this.bridge.height - H_SCROLLBAR_HEIGHT, viewportW, H_SCROLLBAR_HEIGHT);

        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.beginPath();
        this.roundRect(ctx, barX + 2, this.bridge.height - H_SCROLLBAR_HEIGHT + 3, barWidth - 4, H_SCROLLBAR_HEIGHT - 6, 3);
        ctx.fill();
    }

    getVerticalThumb(): { y: number; height: number } | null {
        const contentH = this.bridge.contentHeight;
        const viewportH = this.bridge.height - H_SCROLLBAR_HEIGHT;
        if (contentH <= viewportH) return null;
        const maxScroll = this.getMaxScrollY();
        const barHeight = Math.max(30, (viewportH / contentH) * viewportH);
        const barY = maxScroll > 0 ? (this.bridge.scrollY / maxScroll) * (viewportH - barHeight) : 0;
        return { y: barY, height: barHeight };
    }

    getHorizontalThumb(): { x: number; width: number } | null {
        const contentW = this.bridge.contentWidth;
        const viewportW = this.bridge.width - SCROLLBAR_WIDTH;
        if (contentW <= viewportW) return null;
        const maxScroll = this.getMaxScrollX();
        const barWidth = Math.max(30, (viewportW / contentW) * viewportW);
        const barX = maxScroll > 0 ? (this.bridge.scrollX / maxScroll) * (viewportW - barWidth) : 0;
        return { x: barX, width: barWidth };
    }

    private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
}

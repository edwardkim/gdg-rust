/**
 * EventBus — 컴포넌트 간 느슨한 연결을 위한 이벤트 시스템
 * rhwp-studio/src/core/event-bus.ts 패턴
 */

type Handler = (...args: any[]) => void;

export class EventBus {
    private handlers: Map<string, Set<Handler>> = new Map();

    on(event: string, handler: Handler): void {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event)!.add(handler);
    }

    off(event: string, handler: Handler): void {
        this.handlers.get(event)?.delete(handler);
    }

    emit(event: string, ...args: any[]): void {
        this.handlers.get(event)?.forEach(h => h(...args));
    }

    removeAll(): void {
        this.handlers.clear();
    }
}

// 이벤트 타입 정의
export type GridEvents = {
    "selection-changed": { col: number; row: number } | null;
    "hover-changed": { col: number; row: number };
    "scroll-changed": { scrollX: number; scrollY: number };
    "column-resized": { col: number; width: number };
    "cell-clicked": { col: number; row: number };
    "header-clicked": { col: number };
    "header-menu-clicked": { col: number };
    "redraw-requested": void;
};

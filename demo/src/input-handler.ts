/**
 * InputHandler — 메인 입력 오케스트레이터
 * rhwp-studio/src/engine/input-handler.ts 패턴
 *
 * 모드별 핸들러를 조합하여 Canvas에 이벤트를 연결한다.
 */

import type { EventBus } from "./event-bus";
import type { GridBridge } from "./grid-bridge";
import type { Scrollbar } from "./scrollbar";
import { InputHandlerMouse } from "./input-handler-mouse";
import { InputHandlerKeyboard } from "./input-handler-keyboard";

export class InputHandler {
    private bus: EventBus;
    private bridge: GridBridge;
    private canvas: HTMLCanvasElement;
    private mouse: InputHandlerMouse;
    private keyboard: InputHandlerKeyboard;

    // 바인딩된 핸들러 (detach용)
    private boundMouseDown: (e: MouseEvent) => void;
    private boundMouseMove: (e: MouseEvent) => void;
    private boundMouseUp: () => void;
    private boundClick: (e: MouseEvent) => void;
    private boundWheel: (e: WheelEvent) => void;
    private boundKeyDown: (e: KeyboardEvent) => void;

    constructor(bus: EventBus, bridge: GridBridge, scrollbar: Scrollbar, canvas: HTMLCanvasElement, rowCount: number) {
        this.bus = bus;
        this.bridge = bridge;
        this.canvas = canvas;

        this.mouse = new InputHandlerMouse(bus, bridge, scrollbar, canvas);
        this.keyboard = new InputHandlerKeyboard(bus, bridge, scrollbar, rowCount);

        this.boundMouseDown = (e) => this.mouse.handleMouseDown(e);
        this.boundMouseMove = (e) => this.mouse.handleMouseMove(e);
        this.boundMouseUp = () => this.mouse.handleMouseUp();
        this.boundClick = (e) => this.mouse.handleClick(e);
        this.boundWheel = (e) => this.mouse.handleWheel(e);
        this.boundKeyDown = (e) => this.keyboard.handleKeyDown(e);
    }

    attach(): void {
        this.canvas.setAttribute("tabindex", "0");
        this.canvas.focus();

        this.canvas.addEventListener("mousedown", this.boundMouseDown);
        window.addEventListener("mousemove", this.boundMouseMove);
        window.addEventListener("mouseup", this.boundMouseUp);
        this.canvas.addEventListener("click", this.boundClick);
        this.canvas.addEventListener("wheel", this.boundWheel, { passive: false });
        this.canvas.addEventListener("keydown", this.boundKeyDown);
    }

    detach(): void {
        this.canvas.removeEventListener("mousedown", this.boundMouseDown);
        window.removeEventListener("mousemove", this.boundMouseMove);
        window.removeEventListener("mouseup", this.boundMouseUp);
        this.canvas.removeEventListener("click", this.boundClick);
        this.canvas.removeEventListener("wheel", this.boundWheel);
        this.canvas.removeEventListener("keydown", this.boundKeyDown);
    }
}

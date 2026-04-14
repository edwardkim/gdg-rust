var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// ../../demo/src/event-bus.ts
var EventBus;
var init_event_bus = __esm({
  "../../demo/src/event-bus.ts"() {
    "use strict";
    EventBus = class {
      handlers = /* @__PURE__ */ new Map();
      on(event, handler) {
        if (!this.handlers.has(event)) {
          this.handlers.set(event, /* @__PURE__ */ new Set());
        }
        this.handlers.get(event).add(handler);
      }
      off(event, handler) {
        this.handlers.get(event)?.delete(handler);
      }
      emit(event, ...args) {
        this.handlers.get(event)?.forEach((h) => h(...args));
      }
      removeAll() {
        this.handlers.clear();
      }
    };
  }
});

// ../../demo/src/grid-bridge.ts
var GridBridge;
var init_grid_bridge = __esm({
  "../../demo/src/grid-bridge.ts"() {
    "use strict";
    GridBridge = class {
      renderer;
      // WASM GridRenderer
      ctx;
      canvas;
      bus;
      columns;
      constructor(renderer, canvas, bus) {
        this.renderer = renderer;
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.bus = bus;
        this.columns = [];
      }
      // --- 데이터 설정 ---
      setColumns(columns) {
        this.columns = columns;
        this.renderer.set_columns(columns);
      }
      setData(rows, data) {
        this.renderer.set_data(rows, data);
      }
      // --- 스크롤 ---
      get scrollX() {
        return this.renderer.get_scroll_x();
      }
      get scrollY() {
        return this.renderer.get_scroll_y();
      }
      get contentWidth() {
        return this.renderer.content_width();
      }
      get contentHeight() {
        return this.renderer.content_height();
      }
      scrollTo(x, y) {
        this.renderer.set_scroll_x(x);
        this.renderer.set_scroll_y(y);
      }
      scrollXTo(x) {
        this.renderer.set_scroll_x(Math.max(0, x));
      }
      scrollYTo(y) {
        this.renderer.set_scroll_y(Math.max(0, y));
      }
      // --- 인터랙션 ---
      setHover(col, row) {
        this.renderer.set_hover(col, row);
      }
      setSelection(col, row) {
        this.renderer.set_selection(col, row);
      }
      resizeColumn(col, width) {
        this.renderer.resize_column(col, width);
        if (col < this.columns.length) {
          this.columns[col].width = width;
        }
      }
      setRange(col1, row1, col2, row2) {
        this.renderer.set_range(col1, row1, col2, row2);
      }
      clearRange() {
        this.renderer.clear_range();
      }
      // --- hitTest ---
      hitTest(x, y) {
        return this.renderer.hit_test(x, y);
      }
      getBounds(col, row) {
        return this.renderer.get_bounds(col, row);
      }
      // --- 드로잉 ---
      _logicalWidth = 0;
      _logicalHeight = 0;
      /** DPR 적용 초기화 — Canvas 물리 크기 설정 */
      setupDpr() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this._logicalWidth = rect.width;
        this._logicalHeight = rect.height;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
      }
      draw() {
        const dpr = window.devicePixelRatio || 1;
        if (this.renderer.draw_with_dpr) {
          this.renderer.draw_with_dpr(this.ctx, this._logicalWidth || this.canvas.width, this._logicalHeight || this.canvas.height, dpr);
        } else {
          this.renderer.draw(this.ctx, this.canvas.width, this.canvas.height);
        }
      }
      get width() {
        return this._logicalWidth || this.canvas.width;
      }
      get height() {
        return this._logicalHeight || this.canvas.height;
      }
      get context() {
        return this.ctx;
      }
    };
  }
});

// ../../demo/src/scrollbar.ts
var SCROLLBAR_WIDTH, H_SCROLLBAR_HEIGHT, Scrollbar;
var init_scrollbar = __esm({
  "../../demo/src/scrollbar.ts"() {
    "use strict";
    SCROLLBAR_WIDTH = 14;
    H_SCROLLBAR_HEIGHT = 14;
    Scrollbar = class {
      bridge;
      constructor(bridge) {
        this.bridge = bridge;
      }
      getMaxScrollX() {
        return Math.max(0, this.bridge.contentWidth - this.bridge.width + SCROLLBAR_WIDTH);
      }
      getMaxScrollY() {
        return Math.max(0, this.bridge.contentHeight - this.bridge.height + H_SCROLLBAR_HEIGHT);
      }
      draw(ctx) {
        this.drawVertical(ctx);
        this.drawHorizontal(ctx);
      }
      drawVertical(ctx) {
        const contentH = this.bridge.contentHeight;
        const viewportH = this.bridge.height - H_SCROLLBAR_HEIGHT;
        if (contentH <= viewportH) return;
        const scrollY = this.bridge.scrollY;
        const maxScroll = this.getMaxScrollY();
        const barHeight = Math.max(30, viewportH / contentH * viewportH);
        const barY = maxScroll > 0 ? scrollY / maxScroll * (viewportH - barHeight) : 0;
        ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        ctx.fillRect(this.bridge.width - SCROLLBAR_WIDTH, 0, SCROLLBAR_WIDTH, viewportH);
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.beginPath();
        this.roundRect(ctx, this.bridge.width - SCROLLBAR_WIDTH + 3, barY + 2, SCROLLBAR_WIDTH - 6, barHeight - 4, 3);
        ctx.fill();
      }
      drawHorizontal(ctx) {
        const contentW = this.bridge.contentWidth;
        const viewportW = this.bridge.width - SCROLLBAR_WIDTH;
        if (contentW <= viewportW) return;
        const scrollX = this.bridge.scrollX;
        const maxScroll = this.getMaxScrollX();
        const barWidth = Math.max(30, viewportW / contentW * viewportW);
        const barX = maxScroll > 0 ? scrollX / maxScroll * (viewportW - barWidth) : 0;
        ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        ctx.fillRect(0, this.bridge.height - H_SCROLLBAR_HEIGHT, viewportW, H_SCROLLBAR_HEIGHT);
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.beginPath();
        this.roundRect(ctx, barX + 2, this.bridge.height - H_SCROLLBAR_HEIGHT + 3, barWidth - 4, H_SCROLLBAR_HEIGHT - 6, 3);
        ctx.fill();
      }
      getVerticalThumb() {
        const contentH = this.bridge.contentHeight;
        const viewportH = this.bridge.height - H_SCROLLBAR_HEIGHT;
        if (contentH <= viewportH) return null;
        const maxScroll = this.getMaxScrollY();
        const barHeight = Math.max(30, viewportH / contentH * viewportH);
        const barY = maxScroll > 0 ? this.bridge.scrollY / maxScroll * (viewportH - barHeight) : 0;
        return { y: barY, height: barHeight };
      }
      getHorizontalThumb() {
        const contentW = this.bridge.contentWidth;
        const viewportW = this.bridge.width - SCROLLBAR_WIDTH;
        if (contentW <= viewportW) return null;
        const maxScroll = this.getMaxScrollX();
        const barWidth = Math.max(30, viewportW / contentW * viewportW);
        const barX = maxScroll > 0 ? this.bridge.scrollX / maxScroll * (viewportW - barWidth) : 0;
        return { x: barX, width: barWidth };
      }
      roundRect(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      }
    };
  }
});

// ../../demo/src/input-handler-mouse.ts
var EDGE_DETECT, InputHandlerMouse;
var init_input_handler_mouse = __esm({
  "../../demo/src/input-handler-mouse.ts"() {
    "use strict";
    init_scrollbar();
    EDGE_DETECT = 5;
    InputHandlerMouse = class {
      bus;
      bridge;
      scrollbar;
      canvas;
      dragMode = "idle";
      dragStartPos = 0;
      dragStartScroll = 0;
      resizeCol = -1;
      // 범위 선택 드래그
      rangeAnchor = null;
      wasDraggingRange = false;
      headerHeight;
      groupHeaderHeight;
      constructor(bus, bridge, scrollbar, canvas) {
        this.bus = bus;
        this.bridge = bridge;
        this.scrollbar = scrollbar;
        this.canvas = canvas;
        const hasGroups = bridge.columns.some((c) => c.group);
        this.groupHeaderHeight = hasGroups ? 28 : 0;
        this.headerHeight = this.groupHeaderHeight + 36;
      }
      // --- 컬럼 경계 감지 ---
      getColumnEdge(mx) {
        const sx = this.bridge.scrollX;
        let cx = -sx;
        for (let i = 0; i < this.bridge.columns.length; i++) {
          cx += this.bridge.columns[i].width;
          if (Math.abs(mx - cx) <= EDGE_DETECT) return i;
        }
        return -1;
      }
      // --- 이벤트 핸들러 ---
      handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
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
            this.bridge.scrollYTo(Math.min(this.scrollbar.getMaxScrollY(), my / viewportH * this.scrollbar.getMaxScrollY()));
            this.bus.emit("redraw-requested");
          }
          return;
        }
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
            this.bridge.scrollXTo(Math.min(this.scrollbar.getMaxScrollX(), mx / viewportW * this.scrollbar.getMaxScrollX()));
            this.bus.emit("redraw-requested");
          }
          return;
        }
        const result = this.bridge.hitTest(mx, my);
        if (result.kind === "cell") {
          this.dragMode = "range-dragging";
          this.rangeAnchor = { col: result.col, row: result.row };
          this.bridge.setSelection(result.col, result.row);
          this.bridge.setRange(result.col, result.row, result.col, result.row);
          this.bus.emit("selection-changed", { col: result.col, row: result.row });
          this.bus.emit("redraw-requested");
        }
      }
      handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
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
          const thumbH = Math.max(30, viewportH / contentH * viewportH);
          const trackH = viewportH - thumbH;
          if (trackH > 0) {
            this.bridge.scrollYTo(Math.min(this.scrollbar.getMaxScrollY(), this.dragStartScroll + delta / trackH * this.scrollbar.getMaxScrollY()));
            this.bus.emit("redraw-requested");
          }
          return;
        }
        if (this.dragMode === "h-scrollbar") {
          const delta = mx - this.dragStartPos;
          const contentW = this.bridge.contentWidth;
          const viewportW = this.bridge.width - SCROLLBAR_WIDTH;
          const thumbW = Math.max(30, viewportW / contentW * viewportW);
          const trackW = viewportW - thumbW;
          if (trackW > 0) {
            this.bridge.scrollXTo(Math.min(this.scrollbar.getMaxScrollX(), this.dragStartScroll + delta / trackW * this.scrollbar.getMaxScrollX()));
            this.bus.emit("redraw-requested");
          }
          return;
        }
        if (this.dragMode === "range-dragging" && this.rangeAnchor) {
          const result2 = this.bridge.hitTest(mx, my);
          if (result2.kind === "cell") {
            this.bridge.setRange(
              this.rangeAnchor.col,
              this.rangeAnchor.row,
              result2.col,
              result2.row
            );
            this.bus.emit("redraw-requested");
          }
          return;
        }
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
          this.canvas.style.cursor = edge >= 0 && !isInGroupHeader ? "col-resize" : "pointer";
          this.bridge.setHover(result.col, isInGroupHeader ? -2 : -1);
        } else if (result.kind === "cell") {
          this.canvas.style.cursor = "pointer";
          this.bridge.setHover(result.col, result.row);
        } else {
          this.canvas.style.cursor = "default";
          this.bridge.setHover(-1, -1);
        }
        this.bus.emit("redraw-requested");
      }
      handleMouseUp() {
        this.wasDraggingRange = this.dragMode === "range-dragging";
        this.dragMode = "idle";
        this.rangeAnchor = null;
      }
      handleClick(e) {
        if (this.dragMode !== "idle") return;
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
          this.bridge.setSelection(result.col, result.row);
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
      handleWheel(e) {
        e.preventDefault();
        if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          const delta = e.deltaX || e.deltaY;
          this.bridge.scrollXTo(Math.min(this.scrollbar.getMaxScrollX(), this.bridge.scrollX + delta));
        } else {
          this.bridge.scrollYTo(Math.min(this.scrollbar.getMaxScrollY(), this.bridge.scrollY + e.deltaY));
        }
        this.bus.emit("redraw-requested");
      }
      get isDragging() {
        return this.dragMode !== "idle";
      }
    };
  }
});

// ../../demo/src/input-handler-keyboard.ts
var InputHandlerKeyboard;
var init_input_handler_keyboard = __esm({
  "../../demo/src/input-handler-keyboard.ts"() {
    "use strict";
    init_scrollbar();
    InputHandlerKeyboard = class {
      bus;
      bridge;
      scrollbar;
      selectedCell = null;
      rangeEnd = null;
      rowCount;
      constructor(bus, bridge, scrollbar, rowCount) {
        this.bus = bus;
        this.bridge = bridge;
        this.scrollbar = scrollbar;
        this.rowCount = rowCount;
        bus.on("selection-changed", (sel) => {
          this.selectedCell = sel;
        });
      }
      handleKeyDown(e) {
        const cols = this.bridge.columns;
        const ROW_HEIGHT = 34;
        const HEADER_HEIGHT = cols.some((c) => c.group) ? 64 : 36;
        const PAGE_ROWS = Math.floor((this.bridge.height - HEADER_HEIGHT) / ROW_HEIGHT);
        const shift = e.shiftKey;
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            shift ? this.extendRange(0, 1) : this.moveSelection(0, 1);
            break;
          case "ArrowUp":
            e.preventDefault();
            shift ? this.extendRange(0, -1) : this.moveSelection(0, -1);
            break;
          case "ArrowRight":
            e.preventDefault();
            shift ? this.extendRange(1, 0) : this.moveSelection(1, 0);
            break;
          case "ArrowLeft":
            e.preventDefault();
            shift ? this.extendRange(-1, 0) : this.moveSelection(-1, 0);
            break;
          case "PageDown":
            e.preventDefault();
            shift ? this.extendRange(0, PAGE_ROWS) : this.moveSelection(0, PAGE_ROWS);
            break;
          case "PageUp":
            e.preventDefault();
            shift ? this.extendRange(0, -PAGE_ROWS) : this.moveSelection(0, -PAGE_ROWS);
            break;
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
      moveSelection(dc, dr) {
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
      extendRange(dc, dr) {
        const cols = this.bridge.columns;
        if (!this.selectedCell) {
          this.setSelection(0, 0);
          return;
        }
        const end = this.rangeEnd ?? { ...this.selectedCell };
        const newCol = Math.max(0, Math.min(cols.length - 1, end.col + dc));
        const newRow = Math.max(0, Math.min(this.rowCount - 1, end.row + dr));
        this.rangeEnd = { col: newCol, row: newRow };
        this.bridge.setRange(
          this.selectedCell.col,
          this.selectedCell.row,
          newCol,
          newRow
        );
        this.ensureVisible(newCol, newRow);
        this.bus.emit("redraw-requested");
      }
      setSelection(col, row) {
        this.selectedCell = { col, row };
        this.bridge.setSelection(col, row);
        this.ensureVisible(col, row);
        this.bus.emit("selection-changed", { col, row });
        this.bus.emit("redraw-requested");
      }
      ensureVisible(col, row) {
        const cols = this.bridge.columns;
        const ROW_HEIGHT = 34;
        const HEADER_HEIGHT = cols.some((c) => c.group) ? 64 : 36;
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
    };
  }
});

// ../../demo/src/input-handler.ts
var InputHandler;
var init_input_handler = __esm({
  "../../demo/src/input-handler.ts"() {
    "use strict";
    init_input_handler_mouse();
    init_input_handler_keyboard();
    InputHandler = class {
      bus;
      bridge;
      canvas;
      mouse;
      keyboard;
      // 바인딩된 핸들러 (detach용)
      boundMouseDown;
      boundMouseMove;
      boundMouseUp;
      boundClick;
      boundWheel;
      boundKeyDown;
      constructor(bus, bridge, scrollbar, canvas, rowCount) {
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
      attach() {
        this.canvas.setAttribute("tabindex", "0");
        this.canvas.focus();
        this.canvas.addEventListener("mousedown", this.boundMouseDown);
        window.addEventListener("mousemove", this.boundMouseMove);
        window.addEventListener("mouseup", this.boundMouseUp);
        this.canvas.addEventListener("click", this.boundClick);
        this.canvas.addEventListener("wheel", this.boundWheel, { passive: false });
        this.canvas.addEventListener("keydown", this.boundKeyDown);
      }
      detach() {
        this.canvas.removeEventListener("mousedown", this.boundMouseDown);
        window.removeEventListener("mousemove", this.boundMouseMove);
        window.removeEventListener("mouseup", this.boundMouseUp);
        this.canvas.removeEventListener("click", this.boundClick);
        this.canvas.removeEventListener("wheel", this.boundWheel);
        this.canvas.removeEventListener("keydown", this.boundKeyDown);
      }
    };
  }
});

// ../../demo/src/main.ts
import init, { GridRenderer } from "../pkg/grid_render.js";
var require_main = __commonJS({
  "../../demo/src/main.ts"() {
    init_event_bus();
    init_grid_bridge();
    init_scrollbar();
    init_input_handler();
    var NAMES = [
      "Alice",
      "Bob",
      "Charlie",
      "Diana",
      "Eve",
      "Frank",
      "Grace",
      "Henry",
      "Ivy",
      "Jack",
      "Kate",
      "Leo",
      "Mia",
      "Noah",
      "Olivia",
      "Peter",
      "Quinn",
      "Ruby",
      "Sam",
      "Tina"
    ];
    var CITIES = [
      "Seoul",
      "Tokyo",
      "New York",
      "London",
      "Berlin",
      "Paris",
      "Sydney",
      "Toronto",
      "Singapore",
      "Dubai",
      "Amsterdam",
      "Rome",
      "Madrid",
      "Vienna",
      "Prague"
    ];
    var STATUSES = ["Active", "Inactive", "Pending", "Suspended"];
    var DEPARTMENTS = ["Engineering", "Design", "Marketing", "Sales", "HR", "Finance", "Operations"];
    var SKILLS = ["Rust", "TypeScript", "Python", "Go", "Java", "C++", "Swift", "Kotlin", "Ruby", "Scala"];
    function generateData(rowCount) {
      const boolStates = ["True", "False", "Indeterminate", "Empty"];
      const data = [];
      for (let r = 0; r < rowCount; r++) {
        data.push([
          { type: "Text", text: `${NAMES[r % NAMES.length]} ${Math.floor(r / NAMES.length) || ""}`.trim(), align: "Left", fit_mode: "Shrink" },
          { type: "Number", display: String(20 + r * 7 % 45), align: "Right" },
          { type: "Boolean", value: boolStates[r % 4] },
          { type: "Text", text: CITIES[r % CITIES.length], align: "Left", fit_mode: "Clip" },
          { type: "Bubble", tags: [STATUSES[r % STATUSES.length], DEPARTMENTS[r % DEPARTMENTS.length]] },
          { type: "Uri", display: `user${r}@example.com`, data: `mailto:user${r}@example.com` },
          { type: "Number", display: `$${((3e4 + r * 127) % 15e4).toLocaleString()}`, align: "Right" },
          { type: "Text", text: SKILLS[r % SKILLS.length], align: "Left", fit_mode: "Ellipsis" },
          { type: "Text", text: `2024-${String(1 + r % 12).padStart(2, "0")}-${String(1 + r % 28).padStart(2, "0")}`, align: "Center", fit_mode: "Clip" },
          { type: "Text", text: `+82-10-${String(1e3 + r).slice(-4)}-${String(5e3 + r * 3).slice(-4)}`, align: "Left", fit_mode: "Shrink" },
          { type: "Text", text: `PRJ-${String(1e3 + r).slice(-4)}`, align: "Left", fit_mode: "Clip" },
          { type: "Text", text: ["Manager", "Senior", "Junior", "Lead", "Intern"][r % 5], align: "Center", fit_mode: "Clip" },
          r % 50 === 49 ? { type: "Loading" } : { type: "Text", text: ["Full-time", "Part-time", "Contract"][r % 3], align: "Left", fit_mode: "Clip" },
          { type: "Number", display: `${(r * 17 + 3) % 100}%`, align: "Right" },
          r % 10 === 9 ? { type: "Protected" } : { type: "Text", text: ["Remote", "Office", "Hybrid"][r % 3], align: "Left", fit_mode: "Clip" }
        ]);
      }
      return data;
    }
    async function main() {
      await init();
      const columns = [
        { title: "Name", width: 130, group: "Personal", icon: "\u{1F464}", has_menu: true },
        { title: "Age", width: 65, group: "Personal", icon: null, has_menu: false },
        { title: "Active", width: 60, group: "Personal", icon: "\u2713", has_menu: false },
        { title: "City", width: 110, group: "Personal", icon: "\u{1F4CD}", has_menu: true },
        { title: "Tags", width: 220, group: "Work", icon: null, has_menu: false },
        { title: "Email", width: 190, group: "Contact", icon: "\u2709", has_menu: false },
        { title: "Salary", width: 100, group: "Work", icon: null, has_menu: true },
        { title: "Skill", width: 80, group: "Work", icon: null, has_menu: false },
        { title: "Join Date", width: 100, group: "Work", icon: "\u{1F4C5}", has_menu: false },
        { title: "Phone", width: 130, group: "Contact", icon: "\u{1F4DE}", has_menu: false },
        { title: "Project", width: 90, group: "Work", icon: null, has_menu: true },
        { title: "Level", width: 80, group: "Work", icon: null, has_menu: false },
        { title: "Type", width: 90, group: "Work", icon: null, has_menu: false },
        { title: "Progress", width: 80, group: "Metrics", icon: null, has_menu: false },
        { title: "Location", width: 80, group: "Metrics", icon: null, has_menu: false }
      ];
      const ROW_COUNT = 1e3;
      const data = generateData(ROW_COUNT);
      const renderer = new GridRenderer();
      const canvas = document.getElementById("grid");
      const info = document.getElementById("info");
      const scrollInfo = document.getElementById("scroll-info");
      const bus = new EventBus();
      const bridge = new GridBridge(renderer, canvas, bus);
      bridge.setupDpr();
      bridge.setColumns(columns);
      bridge.setData(ROW_COUNT, data);
      renderer.set_stripe_color("#F0F0F4");
      columns[6].theme_override = { bg_cell: "#FFF8DC" };
      columns[2].theme_override = { bg_cell: "#EEF4FF" };
      bridge.setColumns(columns);
      for (let r = 0; r < ROW_COUNT; r += 5) {
        renderer.set_row_theme(r, { bg_cell: "#F0FFF0" });
      }
      const scrollbar = new Scrollbar(bridge);
      const inputHandler = new InputHandler(bus, bridge, scrollbar, canvas, ROW_COUNT);
      bus.on("redraw-requested", () => {
        bridge.draw();
        scrollbar.draw(bridge.context);
        const sx = bridge.scrollX;
        const sy = bridge.scrollY;
        scrollInfo.textContent = `${ROW_COUNT} rows \xD7 ${columns.length} cols | Scroll: (${sx.toFixed(0)}, ${sy.toFixed(0)}) | Content: ${bridge.contentWidth}\xD7${bridge.contentHeight.toFixed(0)}`;
      });
      bus.on("selection-changed", (sel) => {
        if (sel) {
          const bounds = bridge.getBounds(sel.col, sel.row);
          info.textContent = `Cell [col=${sel.col}, row=${sel.row}] \u2014 bounds: {x:${bounds?.x?.toFixed(0)}, y:${bounds?.y?.toFixed(0)}, w:${bounds?.width}, h:${bounds?.height}}`;
        } else {
          info.textContent = "No selection";
        }
      });
      bus.on("header-clicked", (data2) => {
        info.textContent = `Header [col=${data2.col}] "${columns[data2.col].title}"`;
      });
      bus.on("column-resized", (data2) => {
        columns[data2.col].width = data2.width;
      });
      inputHandler.attach();
      bus.emit("redraw-requested");
    }
    main().catch(console.error);
  }
});
export default require_main();
//# sourceMappingURL=bundle.js.map

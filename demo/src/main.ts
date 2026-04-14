/**
 * 그리드 POC 데모 진입점
 */

// @ts-ignore — WASM 모듈은 타입 없이 import
import init, { GridRenderer } from "../pkg/grid_render.js";

import { EventBus } from "./event-bus";
import { GridBridge, ColumnDef } from "./grid-bridge";
import { Scrollbar } from "./scrollbar";
import { InputHandler } from "./input-handler";

// --- 데이터 생성 ---

const NAMES = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Henry", "Ivy", "Jack",
    "Kate", "Leo", "Mia", "Noah", "Olivia", "Peter", "Quinn", "Ruby", "Sam", "Tina"];
const CITIES = ["Seoul", "Tokyo", "New York", "London", "Berlin", "Paris", "Sydney", "Toronto",
    "Singapore", "Dubai", "Amsterdam", "Rome", "Madrid", "Vienna", "Prague"];
const STATUSES = ["Active", "Inactive", "Pending", "Suspended"];
const DEPARTMENTS = ["Engineering", "Design", "Marketing", "Sales", "HR", "Finance", "Operations"];
const SKILLS = ["Rust", "TypeScript", "Python", "Go", "Java", "C++", "Swift", "Kotlin", "Ruby", "Scala"];

function generateData(rowCount: number): any[] {
    const boolStates = ["True", "False", "Indeterminate", "Empty"];
    const data = [];
    for (let r = 0; r < rowCount; r++) {
        data.push([
            { type: "Text", text: `${NAMES[r % NAMES.length]} ${Math.floor(r / NAMES.length) || ""}`.trim(), align: "Left", fit_mode: "Shrink" },
            { type: "Number", display: String(20 + (r * 7) % 45), align: "Right" },
            { type: "Boolean", value: boolStates[r % 4] },
            { type: "Text", text: CITIES[r % CITIES.length], align: "Left", fit_mode: "Clip" },
            { type: "Bubble", tags: [STATUSES[r % STATUSES.length], DEPARTMENTS[r % DEPARTMENTS.length]] },
            { type: "Uri", display: `user${r}@example.com`, data: `mailto:user${r}@example.com` },
            { type: "Number", display: `$${((30000 + r * 127) % 150000).toLocaleString()}`, align: "Right" },
            { type: "Text", text: SKILLS[r % SKILLS.length], align: "Left", fit_mode: "Ellipsis" },
            { type: "Text", text: `2024-${String(1 + r % 12).padStart(2, "0")}-${String(1 + r % 28).padStart(2, "0")}`, align: "Center", fit_mode: "Clip" },
            { type: "Text", text: `+82-10-${String(1000 + r).slice(-4)}-${String(5000 + r * 3).slice(-4)}`, align: "Left", fit_mode: "Shrink" },
            { type: "Text", text: `PRJ-${String(1000 + r).slice(-4)}`, align: "Left", fit_mode: "Clip" },
            { type: "Text", text: ["Manager", "Senior", "Junior", "Lead", "Intern"][r % 5], align: "Center", fit_mode: "Clip" },
            r % 50 === 49 ? { type: "Loading" } : { type: "Text", text: ["Full-time", "Part-time", "Contract"][r % 3], align: "Left", fit_mode: "Clip" },
            { type: "Number", display: `${(r * 17 + 3) % 100}%`, align: "Right" },
            r % 10 === 9 ? { type: "Protected" } : { type: "Text", text: ["Remote", "Office", "Hybrid"][r % 3], align: "Left", fit_mode: "Clip" },
        ]);
    }
    return data;
}

// --- 메인 ---

async function main() {
    await init();

    const columns: ColumnDef[] = [
        { title: "Name",        width: 130, group: "Personal",  icon: "👤", has_menu: true },
        { title: "Age",         width: 65,  group: "Personal",  icon: null, has_menu: false },
        { title: "Active",      width: 60,  group: "Personal",  icon: "✓", has_menu: false },
        { title: "City",        width: 110, group: "Personal",  icon: "📍", has_menu: true },
        { title: "Tags",        width: 220, group: "Work",      icon: null, has_menu: false },
        { title: "Email",       width: 190, group: "Contact",   icon: "✉", has_menu: false },
        { title: "Salary",      width: 100, group: "Work",      icon: null, has_menu: true },
        { title: "Skill",       width: 80,  group: "Work",      icon: null, has_menu: false },
        { title: "Join Date",   width: 100, group: "Work",      icon: "📅", has_menu: false },
        { title: "Phone",       width: 130, group: "Contact",   icon: "📞", has_menu: false },
        { title: "Project",     width: 90,  group: "Work",      icon: null, has_menu: true },
        { title: "Level",       width: 80,  group: "Work",      icon: null, has_menu: false },
        { title: "Type",        width: 90,  group: "Work",      icon: null, has_menu: false },
        { title: "Progress",    width: 80,  group: "Metrics",   icon: null, has_menu: false },
        { title: "Location",    width: 80,  group: "Metrics",   icon: null, has_menu: false },
    ];

    const ROW_COUNT = 1000;
    const data = generateData(ROW_COUNT);

    // WASM 렌더러 생성
    const renderer = new GridRenderer();

    // Canvas
    const canvas = document.getElementById("grid") as HTMLCanvasElement;
    const info = document.getElementById("info")!;
    const scrollInfo = document.getElementById("scroll-info")!;

    // 모듈 조립 (rhwp-studio 패턴)
    const bus = new EventBus();
    const bridge = new GridBridge(renderer, canvas, bus);
    bridge.setupDpr();
    bridge.setColumns(columns);
    bridge.setData(ROW_COUNT, data);

    // 교대 행 색상 (stripe) — 홀수 행 연한 회색
    renderer.set_stripe_color("#F0F0F4");

    // Salary 컬럼(6) 배경 오버라이드 (연한 노랑)
    columns[6].theme_override = { bg_cell: "#FFF8DC" };
    // Active 컬럼(2) 배경 오버라이드 (연한 파랑)
    columns[2].theme_override = { bg_cell: "#EEF4FF" };
    // 컬럼 테마 오버라이드를 반영하기 위해 재설정
    bridge.setColumns(columns);

    // 특정 행 테마 오버라이드 (5행마다 연한 초록)
    for (let r = 0; r < ROW_COUNT; r += 5) {
        renderer.set_row_theme(r, { bg_cell: "#F0FFF0" });
    }

    const scrollbar = new Scrollbar(bridge);
    const inputHandler = new InputHandler(bus, bridge, scrollbar, canvas, ROW_COUNT);

    // --- 이벤트 구독 ---

    bus.on("redraw-requested", () => {
        bridge.draw();
        scrollbar.draw(bridge.context);

        const sx = bridge.scrollX;
        const sy = bridge.scrollY;
        scrollInfo.textContent = `${ROW_COUNT} rows × ${columns.length} cols | Scroll: (${sx.toFixed(0)}, ${sy.toFixed(0)}) | Content: ${bridge.contentWidth}×${bridge.contentHeight.toFixed(0)}`;
    });

    bus.on("selection-changed", (sel: any) => {
        if (sel) {
            const bounds = bridge.getBounds(sel.col, sel.row);
            info.textContent = `Cell [col=${sel.col}, row=${sel.row}] — bounds: {x:${bounds?.x?.toFixed(0)}, y:${bounds?.y?.toFixed(0)}, w:${bounds?.width}, h:${bounds?.height}}`;
        } else {
            info.textContent = "No selection";
        }
    });

    bus.on("header-clicked", (data: any) => {
        info.textContent = `Header [col=${data.col}] "${columns[data.col].title}"`;
    });

    bus.on("column-resized", (data: any) => {
        columns[data.col].width = data.width;
    });

    // 입력 핸들러 연결
    inputHandler.attach();

    // 초기 렌더링
    bus.emit("redraw-requested");
}

main().catch(console.error);

import init, { GridRenderer } from '../pkg/grid_render.js';

const NAMES = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Henry", "Ivy", "Jack",
    "Kate", "Leo", "Mia", "Noah", "Olivia", "Peter", "Quinn", "Ruby", "Sam", "Tina"];
const CITIES = ["Seoul", "Tokyo", "New York", "London", "Berlin", "Paris", "Sydney", "Toronto",
    "Singapore", "Dubai", "Amsterdam", "Rome", "Madrid", "Vienna", "Prague"];
const STATUSES = ["Active", "Inactive", "Pending", "Suspended"];
const DEPARTMENTS = ["Engineering", "Design", "Marketing", "Sales", "HR", "Finance", "Operations"];
const SKILLS = ["Rust", "TypeScript", "Python", "Go", "Java", "C++", "Swift", "Kotlin", "Ruby", "Scala"];

function generateData(rowCount) {
    const boolStates = ["True", "False", "Indeterminate", "Empty"];
    const data = [];
    for (let r = 0; r < rowCount; r++) {
        data.push([
            // 0: Name (Text, shrink fit)
            { type: "Text", text: `${NAMES[r % NAMES.length]} ${Math.floor(r / NAMES.length) || ''}`.trim(), align: "Left", fit_mode: "Shrink" },
            // 1: Age (Number)
            { type: "Number", display: String(20 + (r * 7) % 45), align: "Right" },
            // 2: Active (Boolean)
            { type: "Boolean", value: boolStates[r % 4] },
            // 3: City (Text)
            { type: "Text", text: CITIES[r % CITIES.length], align: "Left", fit_mode: "Clip" },
            // 4: Status (Bubble)
            { type: "Bubble", tags: [STATUSES[r % STATUSES.length], DEPARTMENTS[r % DEPARTMENTS.length]] },
            // 5: Email (URI)
            { type: "Uri", display: `user${r}@example.com`, data: `mailto:user${r}@example.com` },
            // 6: Salary (Number)
            { type: "Number", display: `$${((30000 + r * 127) % 150000).toLocaleString()}`, align: "Right" },
            // 7: Skill (Text, ellipsis)
            { type: "Text", text: SKILLS[r % SKILLS.length], align: "Left", fit_mode: "Ellipsis" },
            // 8: Join Date (Text)
            { type: "Text", text: `2024-${String(1 + r % 12).padStart(2, '0')}-${String(1 + r % 28).padStart(2, '0')}`, align: "Center", fit_mode: "Clip" },
            // 9: Phone (Text, shrink)
            { type: "Text", text: `+82-10-${String(1000 + r).slice(-4)}-${String(5000 + r * 3).slice(-4)}`, align: "Left", fit_mode: "Shrink" },
            // 10: Project (Text)
            { type: "Text", text: `PRJ-${String(1000 + r).slice(-4)}`, align: "Left", fit_mode: "Clip" },
            // 11: Level (Text)
            { type: "Text", text: ['Manager', 'Senior', 'Junior', 'Lead', 'Intern'][r % 5], align: "Center", fit_mode: "Clip" },
            // 12: Loading (every 50th row)
            r % 50 === 49 ? { type: "Loading" } : { type: "Text", text: ['Full-time', 'Part-time', 'Contract'][r % 3], align: "Left", fit_mode: "Clip" },
            // 13: Progress (Number)
            { type: "Number", display: `${(r * 17 + 3) % 100}%`, align: "Right" },
            // 14: Protected (every 10th row)
            r % 10 === 9 ? { type: "Protected" } : { type: "Text", text: ['Remote', 'Office', 'Hybrid'][r % 3], align: "Left", fit_mode: "Clip" },
        ]);
    }
    return data;
}

async function main() {
    await init();

    const renderer = new GridRenderer();

    const columns = [
        { title: "Name",        width: 130, group: "Personal",   icon: "👤", has_menu: true },
        { title: "Age",         width: 65,  group: "Personal",   icon: null, has_menu: false },
        { title: "Active",      width: 60,  group: "Personal",   icon: "✓", has_menu: false },
        { title: "City",        width: 110, group: "Personal",   icon: "📍", has_menu: true },
        { title: "Tags",        width: 220, group: "Work",       icon: null, has_menu: false },
        { title: "Email",       width: 190, group: "Contact",    icon: "✉", has_menu: false },
        { title: "Salary",      width: 100, group: "Work",       icon: null, has_menu: true },
        { title: "Skill",       width: 80,  group: "Work",       icon: null, has_menu: false },
        { title: "Join Date",   width: 100, group: "Work",       icon: "📅", has_menu: false },
        { title: "Phone",       width: 130, group: "Contact",    icon: "📞", has_menu: false },
        { title: "Project",     width: 90,  group: "Work",       icon: null, has_menu: true },
        { title: "Level",       width: 80,  group: "Work",       icon: null, has_menu: false },
        { title: "Type",        width: 90,  group: "Work",       icon: null, has_menu: false },
        { title: "Progress",    width: 80,  group: "Metrics",    icon: null, has_menu: false },
        { title: "Location",    width: 80,  group: "Metrics",    icon: null, has_menu: false },
    ];
    renderer.set_columns(columns);

    const ROW_COUNT = 1000;
    const data = generateData(ROW_COUNT);
    renderer.set_data(ROW_COUNT, data);

    const canvas = document.getElementById('grid');
    const ctx = canvas.getContext('2d');
    const info = document.getElementById('info');
    const scrollInfo = document.getElementById('scroll-info');

    let selectedCell = null;

    const SCROLLBAR_WIDTH = 14;
    const hasGroups = columns.some(c => c.group);
    const HEADER_HEIGHT = hasGroups ? 28 + 36 : 36; // group_header(28) + header(36)
    const ROW_HEIGHT = 34;
    const PAGE_ROWS = Math.floor((canvas.height - HEADER_HEIGHT) / ROW_HEIGHT);
    const H_SCROLLBAR_HEIGHT = 14;

    function getMaxScrollX() {
        return Math.max(0, renderer.content_width() - canvas.width + SCROLLBAR_WIDTH);
    }

    function getMaxScrollY() {
        return Math.max(0, renderer.content_height() - canvas.height + H_SCROLLBAR_HEIGHT);
    }

    function scrollXTo(pos) {
        renderer.set_scroll_x(Math.max(0, Math.min(getMaxScrollX(), pos)));
    }

    function scrollYTo(pos) {
        renderer.set_scroll_y(Math.max(0, Math.min(getMaxScrollY(), pos)));
    }

    function redraw() {
        // 호버/선택 상태를 WASM에 전달 → WASM이 렌더링
        if (selectedCell) {
            renderer.set_selection(selectedCell.col, selectedCell.row);
        } else {
            renderer.set_selection(-1, -1);
        }
        renderer.draw(ctx, canvas.width, canvas.height);

        drawVerticalScrollbar();
        drawHorizontalScrollbar();

        const sx = renderer.get_scroll_x();
        const sy = renderer.get_scroll_y();
        const sel = selectedCell ? ` | Selected: [${selectedCell.col}, ${selectedCell.row}]` : '';
        scrollInfo.textContent = `${ROW_COUNT} rows × ${columns.length} cols | Scroll: (${sx.toFixed(0)}, ${sy.toFixed(0)}) | Content: ${renderer.content_width()}×${renderer.content_height().toFixed(0)}${sel}`;
    }

    // --- 수직 스크롤바 ---
    function drawVerticalScrollbar() {
        const contentH = renderer.content_height();
        const viewportH = canvas.height - H_SCROLLBAR_HEIGHT;
        if (contentH <= viewportH) return;

        const scrollY = renderer.get_scroll_y();
        const maxScroll = getMaxScrollY();
        const barHeight = Math.max(30, (viewportH / contentH) * viewportH);
        const barY = maxScroll > 0 ? (scrollY / maxScroll) * (viewportH - barHeight) : 0;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(canvas.width - SCROLLBAR_WIDTH, 0, SCROLLBAR_WIDTH, viewportH);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        roundRect(ctx, canvas.width - SCROLLBAR_WIDTH + 3, barY + 2, SCROLLBAR_WIDTH - 6, barHeight - 4, 3);
        ctx.fill();
    }

    // --- 수평 스크롤바 ---
    function drawHorizontalScrollbar() {
        const contentW = renderer.content_width();
        const viewportW = canvas.width - SCROLLBAR_WIDTH;
        if (contentW <= viewportW) return;

        const scrollX = renderer.get_scroll_x();
        const maxScroll = getMaxScrollX();
        const barWidth = Math.max(30, (viewportW / contentW) * viewportW);
        const barX = maxScroll > 0 ? (scrollX / maxScroll) * (viewportW - barWidth) : 0;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, canvas.height - H_SCROLLBAR_HEIGHT, viewportW, H_SCROLLBAR_HEIGHT);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        roundRect(ctx, barX + 2, canvas.height - H_SCROLLBAR_HEIGHT + 3, barWidth - 4, H_SCROLLBAR_HEIGHT - 6, 3);
        ctx.fill();
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    // --- 선택 셀 이동 + 자동 스크롤 ---
    function moveSelection(dc, dr) {
        if (!selectedCell) {
            selectedCell = { col: 0, row: 0 };
        } else {
            selectedCell = {
                col: Math.max(0, Math.min(columns.length - 1, selectedCell.col + dc)),
                row: Math.max(0, Math.min(ROW_COUNT - 1, selectedCell.row + dr)),
            };
        }
        ensureVisible(selectedCell.col, selectedCell.row);
        updateInfo();
        redraw();
    }

    function ensureVisible(col, row) {
        // 수직
        const cellTop = HEADER_HEIGHT + row * ROW_HEIGHT;
        const cellBottom = cellTop + ROW_HEIGHT;
        const sy = renderer.get_scroll_y();
        const viewTop = sy + HEADER_HEIGHT;
        const viewBottom = sy + canvas.height - H_SCROLLBAR_HEIGHT;

        if (cellTop < viewTop) {
            scrollYTo(cellTop - HEADER_HEIGHT);
        } else if (cellBottom > viewBottom) {
            scrollYTo(cellBottom - canvas.height + H_SCROLLBAR_HEIGHT);
        }

        // 수평
        let cellLeft = 0;
        for (let i = 0; i < col; i++) cellLeft += columns[i].width;
        const cellRight = cellLeft + columns[col].width;
        const sx = renderer.get_scroll_x();
        const viewLeft = sx;
        const viewRight = sx + canvas.width - SCROLLBAR_WIDTH;

        if (cellLeft < viewLeft) {
            scrollXTo(cellLeft);
        } else if (cellRight > viewRight) {
            scrollXTo(cellRight - canvas.width + SCROLLBAR_WIDTH);
        }
    }

    function updateInfo() {
        if (selectedCell) {
            const bounds = renderer.get_bounds(selectedCell.col, selectedCell.row);
            info.textContent = `Cell [col=${selectedCell.col}, row=${selectedCell.row}] — bounds: {x:${bounds.x.toFixed(0)}, y:${bounds.y.toFixed(0)}, w:${bounds.width}, h:${bounds.height}}`;
        }
    }

    // --- 스크롤바 드래그 ---
    let dragMode = null; // 'v-scrollbar' | 'h-scrollbar' | 'column-resize' | null
    let dragStartPos = 0;
    let dragStartScroll = 0;
    let resizeCol = -1;

    // 초기 렌더링
    canvas.setAttribute('tabindex', '0');
    canvas.focus();
    redraw();

    // 마우스 휠 — Shift+휠로 수평 스크롤
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            const delta = e.deltaX || e.deltaY;
            scrollXTo(renderer.get_scroll_x() + delta);
        } else {
            scrollYTo(renderer.get_scroll_y() + e.deltaY);
        }
        redraw();
    }, { passive: false });

    // 키보드: 셀 이동
    canvas.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowDown':  e.preventDefault(); moveSelection(0, 1); break;
            case 'ArrowUp':    e.preventDefault(); moveSelection(0, -1); break;
            case 'ArrowRight': e.preventDefault(); moveSelection(1, 0); break;
            case 'ArrowLeft':  e.preventDefault(); moveSelection(-1, 0); break;
            case 'PageDown':   e.preventDefault(); moveSelection(0, PAGE_ROWS); break;
            case 'PageUp':     e.preventDefault(); moveSelection(0, -PAGE_ROWS); break;
            case 'Home':
                e.preventDefault();
                if (e.ctrlKey) {
                    selectedCell = { col: 0, row: 0 };
                } else {
                    selectedCell = { col: 0, row: selectedCell?.row ?? 0 };
                }
                ensureVisible(selectedCell.col, selectedCell.row);
                updateInfo(); redraw();
                break;
            case 'End':
                e.preventDefault();
                if (e.ctrlKey) {
                    selectedCell = { col: columns.length - 1, row: ROW_COUNT - 1 };
                } else {
                    selectedCell = { col: columns.length - 1, row: selectedCell?.row ?? 0 };
                }
                ensureVisible(selectedCell.col, selectedCell.row);
                updateInfo(); redraw();
                break;
        }
    });

    // 마우스 다운 — 컬럼 리사이즈 / 스크롤바 드래그
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // 컬럼 리사이즈 (헤더 영역에서 경계 감지)
        if (my <= HEADER_HEIGHT) {
            const edge = getColumnEdge(mx);
            if (edge >= 0) {
                e.preventDefault();
                dragMode = 'column-resize';
                resizeCol = edge;
                dragStartPos = mx;
                dragStartScroll = columns[edge].width; // 시작 너비 저장
                return;
            }
        }

        // 수직 스크롤바
        if (mx >= canvas.width - SCROLLBAR_WIDTH && my < canvas.height - H_SCROLLBAR_HEIGHT) {
            e.preventDefault();
            const contentH = renderer.content_height();
            const viewportH = canvas.height - H_SCROLLBAR_HEIGHT;
            const barHeight = Math.max(30, (viewportH / contentH) * viewportH);
            const maxScroll = getMaxScrollY();
            const barY = maxScroll > 0 ? (renderer.get_scroll_y() / maxScroll) * (viewportH - barHeight) : 0;

            if (my >= barY && my <= barY + barHeight) {
                dragMode = 'v-scrollbar';
                dragStartPos = my;
                dragStartScroll = renderer.get_scroll_y();
            } else {
                const ratio = my / viewportH;
                scrollYTo(ratio * maxScroll);
                redraw();
            }
            return;
        }

        // 수평 스크롤바
        if (my >= canvas.height - H_SCROLLBAR_HEIGHT && mx < canvas.width - SCROLLBAR_WIDTH) {
            e.preventDefault();
            const contentW = renderer.content_width();
            const viewportW = canvas.width - SCROLLBAR_WIDTH;
            const barWidth = Math.max(30, (viewportW / contentW) * viewportW);
            const maxScroll = getMaxScrollX();
            const barX = maxScroll > 0 ? (renderer.get_scroll_x() / maxScroll) * (viewportW - barWidth) : 0;

            if (mx >= barX && mx <= barX + barWidth) {
                dragMode = 'h-scrollbar';
                dragStartPos = mx;
                dragStartScroll = renderer.get_scroll_x();
            } else {
                const ratio = mx / viewportW;
                scrollXTo(ratio * maxScroll);
                redraw();
            }
            return;
        }
    });

    // 드래그 이동
    window.addEventListener('mousemove', (e) => {
        if (!dragMode) return;
        const rect = canvas.getBoundingClientRect();

        if (dragMode === 'v-scrollbar') {
            const my = e.clientY - rect.top;
            const delta = my - dragStartPos;
            const contentH = renderer.content_height();
            const viewportH = canvas.height - H_SCROLLBAR_HEIGHT;
            const barHeight = Math.max(30, (viewportH / contentH) * viewportH);
            const trackH = viewportH - barHeight;
            if (trackH > 0) {
                scrollYTo(dragStartScroll + (delta / trackH) * getMaxScrollY());
                redraw();
            }
        } else if (dragMode === 'h-scrollbar') {
            const mx = e.clientX - rect.left;
            const delta = mx - dragStartPos;
            const contentW = renderer.content_width();
            const viewportW = canvas.width - SCROLLBAR_WIDTH;
            const barWidth = Math.max(30, (viewportW / contentW) * viewportW);
            const trackW = viewportW - barWidth;
            if (trackW > 0) {
                scrollXTo(dragStartScroll + (delta / trackW) * getMaxScrollX());
                redraw();
            }
        }
    });

    window.addEventListener('mouseup', () => { dragMode = null; });

    // 클릭 — hitTest
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        if (mx >= canvas.width - SCROLLBAR_WIDTH) return;
        if (my >= canvas.height - H_SCROLLBAR_HEIGHT) return;

        const result = renderer.hit_test(mx, my);

        if (result.kind === 'cell') {
            selectedCell = { col: result.col, row: result.row };
            updateInfo();
        } else if (result.kind === 'header') {
            selectedCell = null;
            info.textContent = `Header [col=${result.col}] "${columns[result.col].title}"`;
        } else {
            selectedCell = null;
            info.textContent = 'Out of bounds';
        }
        redraw();
    });

    // --- 컬럼 경계 감지 헬퍼 ---
    const EDGE_DETECT = 5; // 경계 감지 px

    function getColumnEdge(mx) {
        // 마우스 X 좌표가 컬럼 경계 ±5px 이내인지 확인
        const sx = renderer.get_scroll_x();
        let cx = -sx;
        for (let i = 0; i < columns.length; i++) {
            cx += columns[i].width;
            if (Math.abs(mx - cx) <= EDGE_DETECT) {
                return i; // 이 컬럼의 우측 경계
            }
        }
        return -1;
    }

    // 커서 + 호버 + 컬럼 경계 감지
    canvas.addEventListener('mousemove', (e) => {
        if (dragMode === 'column-resize') {
            // 리사이즈 드래그 중
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const delta = mx - dragStartPos;
            const newWidth = Math.max(30, dragStartScroll + delta); // dragStartScroll = 시작 너비
            renderer.resize_column(resizeCol, newWidth);
            // JS columns 배열도 동기화
            columns[resizeCol].width = newWidth;
            redraw();
            return;
        }
        if (dragMode) return;

        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        if (mx >= canvas.width - SCROLLBAR_WIDTH || my >= canvas.height - H_SCROLLBAR_HEIGHT) {
            canvas.style.cursor = 'default';
            renderer.set_hover(-1, -1);
            redraw();
            return;
        }

        const result = renderer.hit_test(mx, my);

        if (result.kind === 'header') {
            // 그룹 헤더 영역 vs 컬럼 헤더 영역 구분
            const groupHeaderH = hasGroups ? 28 : 0;
            const isInGroupHeader = hasGroups && my <= groupHeaderH;

            // 컬럼 경계 감지 → 리사이즈 커서
            const edge = getColumnEdge(mx);
            if (edge >= 0 && !isInGroupHeader) {
                canvas.style.cursor = 'col-resize';
            } else {
                canvas.style.cursor = 'pointer';
            }
            renderer.set_hover(result.col, isInGroupHeader ? -2 : -1);
        } else if (result.kind === 'cell') {
            canvas.style.cursor = 'pointer';
            renderer.set_hover(result.col, result.row);
        } else {
            canvas.style.cursor = 'default';
            renderer.set_hover(-1, -1);
        }
        redraw();
    });
}

main().catch(console.error);

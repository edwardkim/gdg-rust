use crate::canvas::Canvas;
use crate::font_metrics;
use crate::types::{BooleanState, CellContent, Column, ContentAlign, FitMode, Theme};

use super::draw_utils::rounded_rect;

/// 텍스트 너비 측정: 내장 폰트 메트릭 우선, fallback은 Canvas measureText
fn measure_text(canvas: &Canvas, text: &str, theme: &Theme) -> f64 {
    // 폰트 패밀리에서 첫 번째 이름 추출
    let font_name = theme
        .base_font
        .split(|c: char| c.is_ascii_digit() || c == 'p' || c == 'x' || c == ' ')
        .filter(|s| !s.is_empty())
        .last()
        .and_then(|s| s.split(',').next())
        .unwrap_or("sans-serif")
        .trim();

    // 폰트 크기 추출 (예: "13px Inter" → 13.0)
    let font_size = theme
        .base_font
        .split_whitespace()
        .find_map(|s| s.strip_suffix("px").and_then(|n| n.parse::<f64>().ok()))
        .unwrap_or(13.0);

    let bold = theme.base_font.contains("600") || theme.base_font.contains("700") || theme.base_font.contains("bold");

    // 내장 메트릭으로 측정 시도
    if font_metrics::find_metric(font_name, bold).is_some() {
        return font_metrics::measure_text_width(font_name, bold, text, font_size, 0.0);
    }

    // fallback: Canvas measureText (JS 호출)
    canvas.measure_text_width(text)
}

/// 셀 렌더링 (total_header_height 지정)
pub fn draw_cells_with_header(
    canvas: &Canvas,
    columns: &[Column],
    rows: usize,
    cells: &[Vec<CellContent>],
    width: f64,
    height: f64,
    theme: &Theme,
    scroll_x: f64,
    scroll_y: f64,
    total_header_height: f64,
) {
    draw_cells_inner(
        canvas,
        columns,
        rows,
        cells,
        width,
        height,
        theme,
        scroll_x,
        scroll_y,
        total_header_height,
    );
}

/// 셀 렌더링 (기존 호환)
pub fn draw_cells(
    canvas: &Canvas,
    columns: &[Column],
    rows: usize,
    cells: &[Vec<CellContent>],
    width: f64,
    height: f64,
    theme: &Theme,
    scroll_x: f64,
    scroll_y: f64,
) {
    draw_cells_inner(
        canvas,
        columns,
        rows,
        cells,
        width,
        height,
        theme,
        scroll_x,
        scroll_y,
        theme.header_height,
    );
}

fn draw_cells_inner(
    canvas: &Canvas,
    columns: &[Column],
    rows: usize,
    cells: &[Vec<CellContent>],
    width: f64,
    height: f64,
    theme: &Theme,
    scroll_x: f64,
    scroll_y: f64,
    header_height: f64,
) {
    let row_height = theme.row_height;

    for row in 0..rows {
        let y = header_height + (row as f64) * row_height - scroll_y;

        if y + row_height <= header_height {
            continue;
        }
        if y > height {
            break;
        }
        if row >= cells.len() {
            break;
        }

        let mut x = -scroll_x;
        for (col_idx, col) in columns.iter().enumerate() {
            let right = x + col.width;

            if right > 0.0 && x < width && col_idx < cells[row].len() {
                let cell = &cells[row][col_idx];
                let clip_x = x.max(0.0);
                let clip_w = right.min(width) - clip_x;
                let clip_y = y.max(header_height);

                canvas.save();
                canvas.begin_path();
                canvas.rect(clip_x, clip_y, clip_w, row_height);
                canvas.clip();

                draw_cell(canvas, cell, x, y, col.width, row_height, theme);

                canvas.restore();
            }

            if x > width {
                break;
            }
            x = right;
        }
    }
}

/// 개별 셀 렌더링 디스패치
fn draw_cell(canvas: &Canvas, cell: &CellContent, x: f64, y: f64, w: f64, h: f64, theme: &Theme) {
    match cell {
        CellContent::Text { text, align, fit_mode } => {
            draw_text_cell(canvas, text, x, y, w, h, theme, *align, *fit_mode);
        }
        CellContent::Number { display, align } => {
            let align = if *align == ContentAlign::Left {
                ContentAlign::Right
            } else {
                *align
            };
            draw_text_cell(canvas, display, x, y, w, h, theme, align, FitMode::Clip);
        }
        CellContent::Boolean { value, max_size } => {
            draw_boolean_cell(canvas, *value, x, y, w, h, theme, *max_size);
        }
        CellContent::Uri { display, .. } => {
            draw_uri_cell(canvas, display, x, y, w, h, theme);
        }
        CellContent::Bubble { tags } => {
            draw_bubble_cell(canvas, tags, x, y, w, h, theme);
        }
        CellContent::Loading { skeleton_width } => {
            draw_loading_cell(canvas, x, y, w, h, theme, *skeleton_width);
        }
        CellContent::Protected => {
            draw_protected_cell(canvas, x, y, w, h, theme);
        }
        CellContent::Image { .. } => {
            // Image는 JS 측에서 HTMLImageElement 로딩 필요 → 향후 구현
            draw_text_cell(
                canvas,
                "[Image]",
                x,
                y,
                w,
                h,
                theme,
                ContentAlign::Center,
                FitMode::Clip,
            );
        }
        CellContent::Empty => {}
    }
}

/// 텍스트 셀
fn draw_text_cell(
    canvas: &Canvas,
    text: &str,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
    theme: &Theme,
    align: ContentAlign,
    fit_mode: FitMode,
) {
    if text.is_empty() {
        return;
    }

    canvas.set_fill_style(&theme.text_dark);
    canvas.set_font(&theme.base_font);
    canvas.set_text_baseline("middle");

    let padding = theme.cell_horizontal_padding;
    let available = w - padding * 2.0;
    let cy = y + h / 2.0;

    if available <= 0.0 {
        return;
    }

    let text_width = measure_text(canvas, text, theme);

    match fit_mode {
        FitMode::Shrink if text_width > available => {
            let ratio = (available / text_width).max(0.7);
            if ratio >= 0.7 {
                // 장평 축소
                canvas.save();
                let tx = match align {
                    ContentAlign::Left => x + padding,
                    ContentAlign::Center => x + w / 2.0 - (text_width * ratio) / 2.0,
                    ContentAlign::Right => x + w - padding - text_width * ratio,
                };
                canvas.set_text_align("left");
                canvas.transform(ratio, 0.0, 0.0, 1.0, tx, cy);
                canvas.fill_text(text, 0.0, 0.0);
                canvas.restore();
            } else {
                // 70% 미만 → 말줄임
                draw_ellipsis_text(canvas, text, x, cy, w, padding, available, theme);
            }
        }
        FitMode::Ellipsis if text_width > available => {
            draw_ellipsis_text(canvas, text, x, cy, w, padding, available, theme);
        }
        _ => {
            // 일반 렌더링
            let (text_align, tx) = match align {
                ContentAlign::Left => ("left", x + padding),
                ContentAlign::Center => ("center", x + w / 2.0),
                ContentAlign::Right => ("right", x + w - padding),
            };
            canvas.set_text_align(text_align);
            canvas.fill_text(text, tx, cy);
        }
    }
}

/// 말줄임(...) 텍스트 렌더링
fn draw_ellipsis_text(
    canvas: &Canvas,
    text: &str,
    x: f64,
    cy: f64,
    _w: f64,
    padding: f64,
    available: f64,
    theme: &Theme,
) {
    let ellipsis = "…";
    let ellipsis_w = measure_text(canvas, ellipsis, theme);
    let target = available - ellipsis_w;

    if target <= 0.0 {
        canvas.set_text_align("left");
        canvas.fill_text(ellipsis, x + padding, cy);
        return;
    }

    // 글자 수를 줄여가며 맞춤
    let chars: Vec<char> = text.chars().collect();
    let mut end = chars.len();
    loop {
        if end == 0 {
            break;
        }
        let sub: String = chars[..end].iter().collect();
        let sub_w = measure_text(canvas, &sub, theme);
        if sub_w <= target {
            let display = format!("{}…", sub);
            canvas.set_text_align("left");
            canvas.fill_text(&display, x + padding, cy);
            return;
        }
        end -= 1;
    }

    canvas.set_text_align("left");
    canvas.fill_text(ellipsis, x + padding, cy);
}

/// Boolean 셀 (체크박스)
fn draw_boolean_cell(
    canvas: &Canvas,
    value: BooleanState,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
    theme: &Theme,
    max_size: Option<f64>,
) {
    let max_size = max_size.unwrap_or(theme.checkbox_max_size);
    let check_size = max_size.min(h - theme.cell_vertical_padding * 2.0);
    let half = check_size / 2.0;
    let cx = x + w / 2.0;
    let cy = y + h / 2.0;
    let radius = 2.0;

    match value {
        BooleanState::True => {
            // 채워진 박스
            canvas.set_fill_style(&theme.accent_color);
            canvas.begin_path();
            rounded_rect(canvas, cx - half, cy - half, check_size, check_size, radius);
            canvas.fill();

            // 체크마크
            canvas.set_stroke_style(&theme.bg_cell);
            canvas.set_line_width(1.9);
            canvas.set_line_cap("round");
            canvas.set_line_join("round");
            canvas.begin_path();
            canvas.move_to(cx - half + check_size / 4.23, cy - half + check_size / 1.97);
            canvas.line_to(cx - half + check_size / 2.42, cy - half + check_size / 1.44);
            canvas.line_to(cx - half + check_size / 1.29, cy - half + check_size / 3.25);
            canvas.stroke();
        }
        BooleanState::False | BooleanState::Empty => {
            // 빈 박스 (테두리만)
            let alpha = if value == BooleanState::Empty { 0.4 } else { 1.0 };
            canvas.set_global_alpha(alpha);
            canvas.set_stroke_style(&theme.text_medium);
            canvas.set_line_width(1.0);
            canvas.begin_path();
            rounded_rect(
                canvas,
                cx - half + 0.5,
                cy - half + 0.5,
                check_size - 1.0,
                check_size - 1.0,
                radius,
            );
            canvas.stroke();
            canvas.set_global_alpha(1.0);
        }
        BooleanState::Indeterminate => {
            // 채워진 박스 + 가로선
            canvas.set_fill_style(&theme.text_medium);
            canvas.begin_path();
            rounded_rect(canvas, cx - half, cy - half, check_size, check_size, radius);
            canvas.fill();

            canvas.set_stroke_style(&theme.bg_cell);
            canvas.set_line_width(1.9);
            canvas.set_line_cap("round");
            canvas.begin_path();
            canvas.move_to(cx - check_size / 3.0, cy);
            canvas.line_to(cx + check_size / 3.0, cy);
            canvas.stroke();
        }
    }
}

/// URI 셀 (밑줄 링크)
fn draw_uri_cell(canvas: &Canvas, display: &str, x: f64, y: f64, w: f64, h: f64, theme: &Theme) {
    if display.is_empty() {
        return;
    }

    let padding = theme.cell_horizontal_padding;
    let cy = y + h / 2.0;

    canvas.set_fill_style(&theme.link_color);
    canvas.set_font(&theme.base_font);
    canvas.set_text_align("left");
    canvas.set_text_baseline("middle");
    canvas.fill_text(display, x + padding, cy);

    // 밑줄
    let text_w = measure_text(canvas, display, theme).min(w - padding * 2.0);
    canvas.set_stroke_style(&theme.link_color);
    canvas.set_line_width(1.0);
    canvas.begin_path();
    canvas.move_to(x + padding, cy + 7.0);
    canvas.line_to(x + padding + text_w, cy + 7.0);
    canvas.stroke();
}

/// Bubble 셀 (태그 배열)
fn draw_bubble_cell(canvas: &Canvas, tags: &[String], x: f64, y: f64, w: f64, h: f64, theme: &Theme) {
    if tags.is_empty() {
        return;
    }

    let padding = theme.cell_horizontal_padding;
    let bubble_h = theme.bubble_height;
    let bubble_pad = theme.bubble_padding;
    let bubble_margin = theme.bubble_margin;
    let by = y + (h - bubble_h) / 2.0;
    let radius = bubble_h / 2.0;

    canvas.set_font(&theme.base_font);
    canvas.set_text_baseline("middle");

    let mut bx = x + padding;
    let max_x = x + w - padding;

    for tag in tags {
        let tw = measure_text(canvas, tag, theme);
        let bw = tw + bubble_pad * 2.0;

        if bx + bw > max_x {
            break; // 넘치면 중단
        }

        // 버블 배경
        canvas.set_fill_style(&theme.bg_bubble);
        canvas.begin_path();
        rounded_rect(canvas, bx, by, bw, bubble_h, radius);
        canvas.fill();

        // 버블 텍스트
        canvas.set_fill_style(&theme.text_bubble);
        canvas.set_text_align("left");
        canvas.fill_text(tag, bx + bubble_pad, by + bubble_h / 2.0);

        bx += bw + bubble_margin;
    }
}

/// Loading 셀 (스켈레톤)
fn draw_loading_cell(canvas: &Canvas, x: f64, y: f64, w: f64, h: f64, theme: &Theme, skeleton_width: Option<f64>) {
    let padding = theme.cell_horizontal_padding;
    let sk_w = skeleton_width.unwrap_or((w - padding * 2.0) * 0.6);
    let sk_h = 12.0;
    let sx = x + padding;
    let sy = y + (h - sk_h) / 2.0;
    let radius = 3.0;

    canvas.set_fill_style(&theme.bg_cell_medium);
    canvas.begin_path();
    rounded_rect(canvas, sx, sy, sk_w.min(w - padding * 2.0), sk_h, radius);
    canvas.fill();
}

/// Protected 셀 (배경색만 다름)
fn draw_protected_cell(canvas: &Canvas, x: f64, y: f64, w: f64, h: f64, theme: &Theme) {
    canvas.set_fill_style(&theme.bg_cell_medium);
    canvas.fill_rect(x, y, w, h);
}

use crate::canvas::Canvas;
use crate::types::{Column, Theme};

/// 그리드라인 (total_header_height 지정)
pub fn draw_lines_with_header(
    canvas: &Canvas,
    columns: &[Column],
    rows: usize,
    width: f64,
    height: f64,
    theme: &Theme,
    scroll_x: f64,
    scroll_y: f64,
    total_header_height: f64,
) {
    draw_lines_inner(
        canvas,
        columns,
        rows,
        width,
        height,
        theme,
        scroll_x,
        scroll_y,
        total_header_height,
    );
}

/// 그리드라인 (기존 호환)
pub fn draw_lines(
    canvas: &Canvas,
    columns: &[Column],
    rows: usize,
    width: f64,
    height: f64,
    theme: &Theme,
    scroll_x: f64,
    scroll_y: f64,
) {
    draw_lines_inner(
        canvas,
        columns,
        rows,
        width,
        height,
        theme,
        scroll_x,
        scroll_y,
        theme.header_height,
    );
}

fn draw_lines_inner(
    canvas: &Canvas,
    columns: &[Column],
    rows: usize,
    width: f64,
    height: f64,
    theme: &Theme,
    scroll_x: f64,
    scroll_y: f64,
    header_height: f64,
) {
    let row_height = theme.row_height;

    canvas.set_stroke_style(&theme.border_color);
    canvas.set_line_width(1.0);

    // 수평선
    for r in 0..rows {
        let y = header_height + ((r + 1) as f64) * row_height - scroll_y;
        if y <= header_height {
            continue;
        }
        if y > height {
            break;
        }
        canvas.begin_path();
        canvas.move_to(0.0, y + 0.5);
        canvas.line_to(width, y + 0.5);
        canvas.stroke();
    }

    // 수직선
    let mut x = -scroll_x;
    for col in columns {
        x += col.width;
        if x < 0.0 {
            continue;
        }
        if x > width {
            break;
        }
        canvas.begin_path();
        canvas.move_to(x + 0.5, header_height);
        canvas.line_to(x + 0.5, height);
        canvas.stroke();
    }
}

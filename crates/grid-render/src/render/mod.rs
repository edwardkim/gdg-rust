pub mod cells;
pub mod draw_utils;
pub mod header;
pub mod lines;

use std::collections::HashMap;

use crate::canvas::Canvas;
use crate::types::{CellContent, Column, SelectionRange, Theme, ThemeOverride};

/// 인터랙션 상태 (호버, 선택, 범위)
pub struct InteractionState {
    pub hover_col: i32,
    pub hover_row: i32, // -1: 헤더 호버, -2: 그룹 헤더 호버
    pub selected_col: i32,
    pub selected_row: i32,
    pub range: Option<SelectionRange>,
}

/// 그리드 드로잉 오케스트레이터
pub fn draw_grid(
    canvas: &Canvas,
    columns: &[Column],
    rows: usize,
    cells: &[Vec<CellContent>],
    width: f64,
    height: f64,
    theme: &Theme,
    scroll_x: f64,
    scroll_y: f64,
    interaction: &InteractionState,
    row_themes: &HashMap<usize, ThemeOverride>,
    stripe_bg: Option<&str>,
) {
    let has_groups = header::has_group_headers(columns);
    let total_hdr = header::total_header_height(theme, has_groups);
    let row_height = theme.row_height;

    // 1. 배경 채우기
    canvas.set_fill_style(&theme.bg_cell);
    canvas.fill_rect(0.0, 0.0, width, height);

    // 1b. 교대 행 색상 (stripe)
    if let Some(stripe) = stripe_bg {
        for r in 0..rows {
            if r % 2 == 0 {
                continue;
            } // 홀수 행만
            let y = total_hdr + (r as f64) * row_height - scroll_y;
            if y + row_height <= total_hdr {
                continue;
            }
            if y > height {
                break;
            }
            canvas.set_fill_style(stripe);
            canvas.fill_rect(0.0, y, width, row_height);
        }
    }

    // 1c. 행별 테마 배경 오버라이드
    for (&row, theme_ov) in row_themes.iter() {
        if let Some(ref bg) = theme_ov.bg_cell {
            let y = total_hdr + (row as f64) * row_height - scroll_y;
            if y + row_height <= total_hdr {
                continue;
            }
            if y > height {
                continue;
            }
            canvas.set_fill_style(bg);
            canvas.fill_rect(0.0, y, width, row_height);
        }
    }

    // 1d. 컬럼별 테마 배경 오버라이드
    {
        let mut x = -scroll_x;
        for col in columns {
            if let Some(ref ov) = col.theme_override {
                if let Some(ref bg) = ov.bg_cell {
                    if x + col.width > 0.0 && x < width {
                        canvas.set_fill_style(bg);
                        canvas.fill_rect(x, total_hdr, col.width, height - total_hdr);
                    }
                }
            }
            x += col.width;
        }
    }

    // 2. 셀 영역 (헤더 아래 클리핑)
    canvas.save();
    canvas.begin_path();
    canvas.rect(0.0, total_hdr, width, height - total_hdr);
    canvas.clip();

    // 2a. 호버 셀 배경
    if interaction.hover_col >= 0 && interaction.hover_row >= 0 {
        draw_cell_highlight(
            canvas,
            columns,
            interaction.hover_col as usize,
            interaction.hover_row as usize,
            theme,
            scroll_x,
            scroll_y,
            total_hdr,
            height,
            &theme.accent_light,
            0.5,
        );
    }

    // 2b. 선택 셀 배경 (범위 선택 중이 아닐 때만)
    if interaction.range.is_none() && interaction.selected_col >= 0 && interaction.selected_row >= 0 {
        draw_cell_highlight(
            canvas,
            columns,
            interaction.selected_col as usize,
            interaction.selected_row as usize,
            theme,
            scroll_x,
            scroll_y,
            total_hdr,
            height,
            &theme.accent_light,
            1.0,
        );
    }

    // 2c. 셀 콘텐츠 (total_hdr 반영)
    cells::draw_cells_with_header(
        canvas, columns, rows, cells, width, height, theme, scroll_x, scroll_y, total_hdr,
    );

    // 2d. 그리드라인
    lines::draw_lines_with_header(
        canvas, columns, rows, width, height, theme, scroll_x, scroll_y, total_hdr,
    );

    // 2e. 범위 선택 하이라이트 + 링
    if let Some(ref range) = interaction.range {
        draw_range_highlight(canvas, columns, range, theme, scroll_x, scroll_y, total_hdr, height);
        draw_range_ring(canvas, columns, range, theme, scroll_x, scroll_y, total_hdr, height);
    }

    // 2f. 포커스 링 (선택 셀, 범위 선택 중이 아닐 때만)
    if interaction.range.is_none() && interaction.selected_col >= 0 && interaction.selected_row >= 0 {
        draw_focus_ring(
            canvas,
            columns,
            interaction.selected_col as usize,
            interaction.selected_row as usize,
            theme,
            scroll_x,
            scroll_y,
            total_hdr,
            height,
        );
    }

    canvas.restore();

    // 3. 헤더 렌더링
    header::draw_header(canvas, columns, width, theme, scroll_x, interaction);

    // 헤더 하단 경계선
    canvas.set_stroke_style(&theme.border_color);
    canvas.set_line_width(1.0);
    canvas.begin_path();
    canvas.move_to(0.0, total_hdr + 0.5);
    canvas.line_to(width, total_hdr + 0.5);
    canvas.stroke();
}

fn draw_cell_highlight(
    canvas: &Canvas,
    columns: &[Column],
    col: usize,
    row: usize,
    theme: &Theme,
    scroll_x: f64,
    scroll_y: f64,
    total_hdr: f64,
    view_height: f64,
    color: &str,
    alpha: f64,
) {
    if col >= columns.len() {
        return;
    }
    let x: f64 = columns[..col].iter().map(|c| c.width).sum::<f64>() - scroll_x;
    let y = total_hdr + (row as f64) * theme.row_height - scroll_y;
    let w = columns[col].width;
    let h = theme.row_height;
    if x + w <= 0.0 || y + h <= total_hdr || y >= view_height {
        return;
    }

    canvas.save();
    canvas.set_global_alpha(alpha);
    canvas.set_fill_style(color);
    canvas.fill_rect(x, y, w, h);
    canvas.restore();
}

fn draw_focus_ring(
    canvas: &Canvas,
    columns: &[Column],
    col: usize,
    row: usize,
    theme: &Theme,
    scroll_x: f64,
    scroll_y: f64,
    total_hdr: f64,
    view_height: f64,
) {
    if col >= columns.len() {
        return;
    }
    let x: f64 = columns[..col].iter().map(|c| c.width).sum::<f64>() - scroll_x;
    let y = total_hdr + (row as f64) * theme.row_height - scroll_y;
    let w = columns[col].width;
    let h = theme.row_height;
    if x + w <= 0.0 || y + h <= total_hdr || y >= view_height {
        return;
    }

    canvas.set_stroke_style(&theme.accent_color);
    canvas.set_line_width(2.0);
    canvas.stroke_rect(x + 1.0, y + 1.0, w - 2.0, h - 2.0);
}

/// 범위 선택 배경 하이라이트
fn draw_range_highlight(
    canvas: &Canvas,
    columns: &[Column],
    range: &SelectionRange,
    theme: &Theme,
    scroll_x: f64,
    scroll_y: f64,
    total_hdr: f64,
    view_height: f64,
) {
    let row_height = theme.row_height;

    // 범위의 화면 좌표 계산
    let rx: f64 = columns[..range.x].iter().map(|c| c.width).sum::<f64>() - scroll_x;
    let rw: f64 = columns[range.x..range.x + range.width].iter().map(|c| c.width).sum();
    let ry = total_hdr + (range.y as f64) * row_height - scroll_y;
    let rh = (range.height as f64) * row_height;

    if rx + rw <= 0.0 || ry + rh <= total_hdr || ry >= view_height {
        return;
    }

    canvas.save();
    canvas.set_global_alpha(0.15);
    canvas.set_fill_style(&theme.accent_color);
    canvas.fill_rect(rx, ry, rw, rh);
    canvas.restore();
}

/// 범위 선택 테두리 링
fn draw_range_ring(
    canvas: &Canvas,
    columns: &[Column],
    range: &SelectionRange,
    theme: &Theme,
    scroll_x: f64,
    scroll_y: f64,
    total_hdr: f64,
    view_height: f64,
) {
    let row_height = theme.row_height;

    let rx: f64 = columns[..range.x].iter().map(|c| c.width).sum::<f64>() - scroll_x;
    let rw: f64 = columns[range.x..range.x + range.width].iter().map(|c| c.width).sum();
    let ry = total_hdr + (range.y as f64) * row_height - scroll_y;
    let rh = (range.height as f64) * row_height;

    if rx + rw <= 0.0 || ry + rh <= total_hdr || ry >= view_height {
        return;
    }

    canvas.set_stroke_style(&theme.accent_color);
    canvas.set_line_width(2.0);
    canvas.stroke_rect(rx + 0.5, ry + 0.5, rw - 1.0, rh - 1.0);
}

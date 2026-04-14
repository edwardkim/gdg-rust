use crate::canvas::Canvas;
use crate::types::{Column, Theme};

use super::InteractionState;

/// 전체 헤더 높이 (그룹 헤더 + 컬럼 헤더)
pub fn total_header_height(theme: &Theme, has_groups: bool) -> f64 {
    if has_groups {
        let gh = if theme.group_header_height > 0.0 {
            theme.group_header_height
        } else {
            28.0
        };
        gh + theme.header_height
    } else {
        theme.header_height
    }
}

/// 그룹 헤더 높이 (0이면 기본 28px)
pub fn effective_group_header_height(theme: &Theme) -> f64 {
    if theme.group_header_height > 0.0 {
        theme.group_header_height
    } else {
        28.0
    }
}

/// 그룹 헤더가 존재하는지 확인
pub fn has_group_headers(columns: &[Column]) -> bool {
    columns.iter().any(|c| c.group.is_some())
}

/// 헤더 전체 렌더링 (그룹 헤더 + 컬럼 헤더 + 메뉴 버튼)
pub fn draw_header(
    canvas: &Canvas,
    columns: &[Column],
    width: f64,
    theme: &Theme,
    scroll_x: f64,
    interaction: &InteractionState,
) {
    let has_groups = has_group_headers(columns);
    let total_h = total_header_height(theme, has_groups);

    // 전체 헤더 배경
    canvas.set_fill_style(&theme.bg_header);
    canvas.fill_rect(0.0, 0.0, width, total_h);

    // 그룹 헤더
    if has_groups {
        draw_group_headers(canvas, columns, width, theme, scroll_x, interaction);
    }

    // 컬럼 헤더
    let header_y = if has_groups {
        effective_group_header_height(theme)
    } else {
        0.0
    };
    draw_column_headers(canvas, columns, width, theme, scroll_x, header_y, interaction);
}

/// 그룹 헤더 렌더링
fn draw_group_headers(
    canvas: &Canvas,
    columns: &[Column],
    width: f64,
    theme: &Theme,
    scroll_x: f64,
    interaction: &InteractionState,
) {
    let gh = effective_group_header_height(theme);

    canvas.set_font(&theme.header_font);
    canvas.set_text_align("left");
    canvas.set_text_baseline("middle");

    let mut x = -scroll_x;
    let mut i = 0;
    while i < columns.len() {
        let group = columns[i].group.as_deref().unwrap_or("");
        let start_x = x;
        let mut group_width = 0.0;

        // 같은 그룹의 연속 컬럼 묶기
        while i < columns.len() && columns[i].group.as_deref().unwrap_or("") == group {
            group_width += columns[i].width;
            i += 1;
        }

        let right = start_x + group_width;

        if right > 0.0 && start_x < width && !group.is_empty() {
            // 호버 중인 컬럼이 이 그룹에 속하는지 확인
            let hover_col = interaction.hover_col;
            let is_hovered = interaction.hover_row <= -1
                && hover_col >= 0
                && hover_col < columns.len() as i32
                && columns[hover_col as usize].group.as_deref().unwrap_or("") == group;

            canvas.save();
            canvas.begin_path();
            canvas.rect(start_x.max(0.0), 0.0, right.min(width) - start_x.max(0.0), gh);
            canvas.clip();

            // 그룹 배경
            if is_hovered {
                canvas.set_fill_style(&theme.bg_header_hovered);
            } else {
                canvas.set_fill_style(&theme.bg_header);
            }
            canvas.fill_rect(start_x, 0.0, group_width, gh);

            // 그룹 텍스트
            canvas.set_fill_style(&theme.text_medium);
            canvas.fill_text(group, start_x + theme.cell_horizontal_padding, gh / 2.0);

            canvas.restore();

            // 그룹 우측 구분선
            if right > 0.0 && right < width {
                canvas.set_stroke_style(&theme.border_color);
                canvas.set_line_width(1.0);
                canvas.begin_path();
                canvas.move_to(right + 0.5, 0.0);
                canvas.line_to(right + 0.5, gh);
                canvas.stroke();
            }
        }

        x = right;
    }

    // 그룹 헤더 하단 경계선
    canvas.set_stroke_style(&theme.border_color);
    canvas.set_line_width(1.0);
    canvas.begin_path();
    canvas.move_to(0.0, gh + 0.5);
    canvas.line_to(width, gh + 0.5);
    canvas.stroke();
}

/// 컬럼 헤더 렌더링 (아이콘, 제목, 메뉴 버튼)
fn draw_column_headers(
    canvas: &Canvas,
    columns: &[Column],
    width: f64,
    theme: &Theme,
    scroll_x: f64,
    header_y: f64,
    interaction: &InteractionState,
) {
    let header_height = theme.header_height;

    canvas.set_text_baseline("middle");

    let mut x = -scroll_x;
    for (col_idx, col) in columns.iter().enumerate() {
        let right = x + col.width;

        if right > 0.0 && x < width {
            canvas.save();
            canvas.begin_path();
            canvas.rect(x.max(0.0), header_y, right.min(width) - x.max(0.0), header_height);
            canvas.clip();

            // 호버 배경
            if interaction.hover_row == -1 && interaction.hover_col == col_idx as i32 {
                canvas.set_fill_style(&theme.bg_header_hovered);
                canvas.fill_rect(x, header_y, col.width, header_height);
            }

            // 아이콘
            let mut text_x = x + theme.cell_horizontal_padding;
            if let Some(ref icon) = col.icon {
                canvas.set_font("13px sans-serif");
                canvas.set_fill_style(&theme.text_medium);
                canvas.set_text_align("left");
                canvas.fill_text(icon, text_x, header_y + header_height / 2.0);
                text_x += 20.0; // 아이콘 너비 + 간격
            }

            // 제목 텍스트
            canvas.set_font(&theme.header_font);
            canvas.set_fill_style(&theme.text_header);
            canvas.set_text_align("left");
            let max_text_w = col.width
                - (text_x - x)
                - if col.has_menu {
                    28.0
                } else {
                    theme.cell_horizontal_padding
                };
            if max_text_w > 0.0 {
                canvas.fill_text(&col.title, text_x, header_y + header_height / 2.0);
            }

            // 메뉴 버튼 (⋯)
            if col.has_menu {
                let menu_x = x + col.width - 24.0;
                let menu_cy = header_y + header_height / 2.0;
                let dot_r = 1.5;
                let gap = 4.0;

                canvas.set_fill_style(&theme.text_medium);
                for i in 0..3 {
                    let dy = (i as f64 - 1.0) * gap;
                    canvas.begin_path();
                    canvas.arc(menu_x, menu_cy + dy, dot_r, 0.0, std::f64::consts::TAU);
                    canvas.fill();
                }
            }

            canvas.restore();
        }

        if x > width {
            break;
        }
        x = right;
    }
}

/// 컬럼 리사이즈 인디케이터 (드래그 중 수직 점선)
pub fn draw_resize_indicator(canvas: &Canvas, x: f64, header_y: f64, height: f64, theme: &Theme) {
    canvas.set_stroke_style(&theme.accent_color);
    canvas.set_line_width(2.0);
    canvas.begin_path();
    canvas.move_to(x, header_y);
    canvas.line_to(x, height);
    canvas.stroke();
}

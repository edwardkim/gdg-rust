#![allow(clippy::too_many_arguments, clippy::double_ended_iterator_last)]

pub mod canvas;
pub mod font_metrics;
pub mod hit_test;
pub mod render;
pub mod types;

use wasm_bindgen::prelude::*;
use web_sys::CanvasRenderingContext2d;

use canvas::Canvas;
use std::collections::HashMap;
use types::{CellContent, Column, SelectionRange, Theme, ThemeOverride};

/// WASM으로 export되는 그리드 렌더러
#[wasm_bindgen]
pub struct GridRenderer {
    columns: Vec<Column>,
    rows: usize,
    cells: Vec<Vec<CellContent>>,
    theme: Theme,
    scroll_x: f64,
    scroll_y: f64,
    hover_col: i32,
    hover_row: i32,
    selected_col: i32,
    selected_row: i32,
    // 범위 선택
    range: Option<SelectionRange>,
    // 행별 테마 오버라이드
    row_themes: HashMap<usize, ThemeOverride>,
    // 교대 행 색상
    stripe_bg: Option<String>,
}

#[wasm_bindgen]
impl GridRenderer {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            columns: Vec::new(),
            rows: 0,
            cells: Vec::new(),
            theme: Theme::default(),
            scroll_x: 0.0,
            scroll_y: 0.0,
            hover_col: -1,
            hover_row: -1,
            selected_col: -1,
            selected_row: -1,
            range: None,
            row_themes: HashMap::new(),
            stripe_bg: None,
        }
    }
}

impl Default for GridRenderer {
    fn default() -> Self {
        Self::new()
    }
}

#[wasm_bindgen]
impl GridRenderer {
    pub fn set_columns(&mut self, columns: JsValue) {
        if let Ok(cols) = serde_wasm_bindgen::from_value::<Vec<Column>>(columns) {
            self.columns = cols;
        }
    }

    pub fn set_data(&mut self, rows: usize, data: JsValue) {
        self.rows = rows;
        if let Ok(cells) = serde_wasm_bindgen::from_value::<Vec<Vec<CellContent>>>(data) {
            self.cells = cells;
        }
    }

    pub fn set_theme(&mut self, theme: JsValue) {
        if let Ok(t) = serde_wasm_bindgen::from_value::<Theme>(theme) {
            self.theme = t;
        }
    }

    // --- 스크롤 ---

    pub fn set_scroll_x(&mut self, scroll_x: f64) {
        self.scroll_x = scroll_x.max(0.0);
    }
    pub fn get_scroll_x(&self) -> f64 {
        self.scroll_x
    }
    pub fn set_scroll_y(&mut self, scroll_y: f64) {
        self.scroll_y = scroll_y.max(0.0);
    }
    pub fn get_scroll_y(&self) -> f64 {
        self.scroll_y
    }
    pub fn content_width(&self) -> f64 {
        self.columns.iter().map(|c| c.width).sum()
    }

    pub fn content_height(&self) -> f64 {
        let has_groups = render::header::has_group_headers(&self.columns);
        let total_hdr = render::header::total_header_height(&self.theme, has_groups);
        total_hdr + (self.rows as f64) * self.theme.row_height
    }

    // --- 호버/선택 ---

    pub fn set_hover(&mut self, col: i32, row: i32) {
        self.hover_col = col;
        self.hover_row = row;
    }

    pub fn set_selection(&mut self, col: i32, row: i32) {
        self.selected_col = col;
        self.selected_row = row;
    }

    /// 범위 선택 설정 (col1,row1 ~ col2,row2)
    pub fn set_range(&mut self, col1: i32, row1: i32, col2: i32, row2: i32) {
        if col1 < 0 || row1 < 0 || col2 < 0 || row2 < 0 {
            self.range = None;
        } else {
            self.range = Some(SelectionRange::from_corners(
                col1 as usize,
                row1 as usize,
                col2 as usize,
                row2 as usize,
            ));
        }
    }

    /// 범위 선택 해제
    pub fn clear_range(&mut self) {
        self.range = None;
    }

    /// 행별 테마 오버라이드 설정
    pub fn set_row_theme(&mut self, row: usize, theme_override: JsValue) {
        if let Ok(t) = serde_wasm_bindgen::from_value::<ThemeOverride>(theme_override) {
            self.row_themes.insert(row, t);
        }
    }

    /// 행별 테마 오버라이드 해제
    pub fn clear_row_theme(&mut self, row: usize) {
        self.row_themes.remove(&row);
    }

    /// 교대 행 색상 설정 (짝수 행에 적용)
    pub fn set_stripe_color(&mut self, color: &str) {
        self.stripe_bg = Some(color.to_string());
    }

    /// 교대 행 색상 해제
    pub fn clear_stripe_color(&mut self) {
        self.stripe_bg = None;
    }

    // --- 드로잉 ---

    /// DPR 적용 드로잉 (고해상도 디스플레이 지원)
    pub fn draw_with_dpr(&self, ctx: &CanvasRenderingContext2d, width: f64, height: f64, dpr: f64) {
        let canvas = Canvas::new(ctx);

        // DPR 스케일링: 물리 캔버스 크기는 JS에서 설정, 여기서는 context만 스케일
        if dpr != 1.0 {
            canvas.save();
            canvas.scale(dpr, dpr);
        }

        let interaction = render::InteractionState {
            hover_col: self.hover_col,
            hover_row: self.hover_row,
            selected_col: self.selected_col,
            selected_row: self.selected_row,
            range: self.range,
        };
        render::draw_grid(
            &canvas,
            &self.columns,
            self.rows,
            &self.cells,
            width,
            height,
            &self.theme,
            self.scroll_x,
            self.scroll_y,
            &interaction,
            &self.row_themes,
            self.stripe_bg.as_deref(),
        );

        if dpr != 1.0 {
            canvas.restore();
        }
    }

    pub fn draw(&self, ctx: &CanvasRenderingContext2d, width: f64, height: f64) {
        let canvas = Canvas::new(ctx);
        let interaction = render::InteractionState {
            hover_col: self.hover_col,
            hover_row: self.hover_row,
            selected_col: self.selected_col,
            selected_row: self.selected_row,
            range: self.range,
        };
        render::draw_grid(
            &canvas,
            &self.columns,
            self.rows,
            &self.cells,
            width,
            height,
            &self.theme,
            self.scroll_x,
            self.scroll_y,
            &interaction,
            &self.row_themes,
            self.stripe_bg.as_deref(),
        );
    }

    // --- hitTest ---

    pub fn hit_test(&self, x: f64, y: f64) -> JsValue {
        let has_groups = render::header::has_group_headers(&self.columns);
        let total_hdr = render::header::total_header_height(&self.theme, has_groups);
        let result = hit_test::hit_test(
            x,
            y,
            &self.columns,
            self.rows,
            &self.theme,
            self.scroll_x,
            self.scroll_y,
            total_hdr,
        );
        serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
    }

    pub fn get_bounds(&self, col: usize, row: i32) -> JsValue {
        let has_groups = render::header::has_group_headers(&self.columns);
        let total_hdr = render::header::total_header_height(&self.theme, has_groups);
        let result = hit_test::get_bounds_for_item(
            col,
            row,
            &self.columns,
            &self.theme,
            self.scroll_x,
            self.scroll_y,
            total_hdr,
        );
        serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
    }

    pub fn resize_column(&mut self, col: usize, new_width: f64) {
        if col < self.columns.len() {
            self.columns[col].width = new_width.max(30.0);
        }
    }
}

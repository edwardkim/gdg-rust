use web_sys::CanvasRenderingContext2d;

/// Canvas 2D 래퍼 — JsValue 변환을 캡슐화
pub struct Canvas<'a> {
    ctx: &'a CanvasRenderingContext2d,
}

impl<'a> Canvas<'a> {
    pub fn new(ctx: &'a CanvasRenderingContext2d) -> Self {
        Self { ctx }
    }

    // --- 스타일 ---

    pub fn set_fill_style(&self, color: &str) {
        self.ctx.set_fill_style_str(color);
    }

    pub fn set_stroke_style(&self, color: &str) {
        self.ctx.set_stroke_style_str(color);
    }

    pub fn set_line_width(&self, width: f64) {
        self.ctx.set_line_width(width);
    }

    pub fn set_global_alpha(&self, alpha: f64) {
        self.ctx.set_global_alpha(alpha);
    }

    // --- 텍스트 ---

    pub fn set_font(&self, font: &str) {
        self.ctx.set_font(font);
    }

    pub fn set_text_align(&self, align: &str) {
        self.ctx.set_text_align(align);
    }

    pub fn set_text_baseline(&self, baseline: &str) {
        self.ctx.set_text_baseline(baseline);
    }

    pub fn fill_text(&self, text: &str, x: f64, y: f64) {
        let _ = self.ctx.fill_text(text, x, y);
    }

    pub fn measure_text_width(&self, text: &str) -> f64 {
        self.ctx.measure_text(text).map(|m| m.width()).unwrap_or(0.0)
    }

    // --- 도형 ---

    pub fn fill_rect(&self, x: f64, y: f64, w: f64, h: f64) {
        self.ctx.fill_rect(x, y, w, h);
    }

    pub fn stroke_rect(&self, x: f64, y: f64, w: f64, h: f64) {
        self.ctx.stroke_rect(x, y, w, h);
    }

    pub fn clear_rect(&self, x: f64, y: f64, w: f64, h: f64) {
        self.ctx.clear_rect(x, y, w, h);
    }

    // --- 경로 ---

    pub fn begin_path(&self) {
        self.ctx.begin_path();
    }

    pub fn move_to(&self, x: f64, y: f64) {
        self.ctx.move_to(x, y);
    }

    pub fn line_to(&self, x: f64, y: f64) {
        self.ctx.line_to(x, y);
    }

    pub fn stroke(&self) {
        self.ctx.stroke();
    }

    pub fn fill(&self) {
        self.ctx.fill();
    }

    pub fn rect(&self, x: f64, y: f64, w: f64, h: f64) {
        self.ctx.rect(x, y, w, h);
    }

    pub fn close_path(&self) {
        self.ctx.close_path();
    }

    pub fn arc_to(&self, x1: f64, y1: f64, x2: f64, y2: f64, radius: f64) {
        let _ = self.ctx.arc_to(x1, y1, x2, y2, radius);
    }

    pub fn arc(&self, x: f64, y: f64, radius: f64, start_angle: f64, end_angle: f64) {
        let _ = self.ctx.arc(x, y, radius, start_angle, end_angle);
    }

    pub fn clip(&self) {
        self.ctx.clip();
    }

    // --- 라인 스타일 ---

    pub fn set_line_cap(&self, cap: &str) {
        self.ctx.set_line_cap(cap);
    }

    pub fn set_line_join(&self, join: &str) {
        self.ctx.set_line_join(join);
    }

    // --- 변환 ---

    pub fn transform(&self, a: f64, b: f64, c: f64, d: f64, e: f64, f: f64) {
        let _ = self.ctx.transform(a, b, c, d, e, f);
    }

    // --- 상태 ---

    pub fn save(&self) {
        self.ctx.save();
    }

    pub fn restore(&self) {
        self.ctx.restore();
    }

    pub fn scale(&self, x: f64, y: f64) {
        let _ = self.ctx.scale(x, y);
    }
}

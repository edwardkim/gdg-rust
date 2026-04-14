use crate::canvas::Canvas;

/// 둥근 사각형 경로 (GDG draw-checkbox.ts의 roundedRect 대응)
pub fn rounded_rect(canvas: &Canvas, x: f64, y: f64, w: f64, h: f64, r: f64) {
    let r = r.min(w / 2.0).min(h / 2.0);
    canvas.move_to(x + r, y);
    canvas.arc_to(x + w, y, x + w, y + h, r);
    canvas.arc_to(x + w, y + h, x, y + h, r);
    canvas.arc_to(x, y + h, x, y, r);
    canvas.arc_to(x, y, x + w, y, r);
    canvas.close_path();
}

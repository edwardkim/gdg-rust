use crate::types::{Column, HitTestResult, Rectangle, Theme};

/// X좌표 → 컬럼 인덱스 (수평 스크롤 반영)
pub fn get_column_for_x(x: f64, columns: &[Column], scroll_x: f64) -> Option<usize> {
    let mut cx = -scroll_x;
    for (i, col) in columns.iter().enumerate() {
        if x < cx + col.width && x >= cx {
            return Some(i);
        }
        cx += col.width;
    }
    None
}

/// 화면 Y좌표 → 행 인덱스 (수직 스크롤 반영)
pub fn get_row_for_y(y: f64, total_header_height: f64, row_height: f64, rows: usize, scroll_y: f64) -> Option<usize> {
    if y <= total_header_height {
        return None;
    }
    let row = ((y - total_header_height + scroll_y) / row_height) as usize;
    if row < rows {
        Some(row)
    } else {
        None
    }
}

/// 마우스 좌표 → hitTest 결과
pub fn hit_test(
    x: f64,
    y: f64,
    columns: &[Column],
    rows: usize,
    theme: &Theme,
    scroll_x: f64,
    scroll_y: f64,
    total_header_height: f64,
) -> HitTestResult {
    if x < 0.0 || y < 0.0 {
        return HitTestResult::OutOfBounds;
    }

    let col = match get_column_for_x(x, columns, scroll_x) {
        Some(c) => c,
        None => return HitTestResult::OutOfBounds,
    };

    if y <= total_header_height {
        return HitTestResult::Header { col };
    }

    match get_row_for_y(y, total_header_height, theme.row_height, rows, scroll_y) {
        Some(row) => HitTestResult::Cell { col, row },
        None => HitTestResult::OutOfBounds,
    }
}

/// [col, row] → 화면 좌표 Rectangle
pub fn get_bounds_for_item(
    col: usize,
    row: i32,
    columns: &[Column],
    theme: &Theme,
    scroll_x: f64,
    scroll_y: f64,
    total_header_height: f64,
) -> Option<Rectangle> {
    if col >= columns.len() {
        return None;
    }

    let x: f64 = columns[..col].iter().map(|c| c.width).sum::<f64>() - scroll_x;
    let width = columns[col].width;

    if row == -1 {
        Some(Rectangle::new(x, 0.0, width, total_header_height))
    } else if row >= 0 {
        let y = total_header_height + (row as f64) * theme.row_height - scroll_y;
        Some(Rectangle::new(x, y, width, theme.row_height))
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_columns() -> Vec<Column> {
        vec![
            Column {
                title: "A".into(),
                width: 100.0,
                group: None,
                icon: None,
                has_menu: false,
                theme_override: None,
            },
            Column {
                title: "B".into(),
                width: 120.0,
                group: None,
                icon: None,
                has_menu: false,
                theme_override: None,
            },
            Column {
                title: "C".into(),
                width: 80.0,
                group: None,
                icon: None,
                has_menu: false,
                theme_override: None,
            },
        ]
    }

    fn test_theme() -> Theme {
        Theme::default()
    }

    #[test]
    fn test_get_column_for_x_no_scroll() {
        let cols = test_columns();
        assert_eq!(get_column_for_x(50.0, &cols, 0.0), Some(0));
        assert_eq!(get_column_for_x(100.0, &cols, 0.0), Some(1));
        assert_eq!(get_column_for_x(300.0, &cols, 0.0), None);
    }

    #[test]
    fn test_get_column_for_x_with_scroll() {
        let cols = test_columns();
        assert_eq!(get_column_for_x(0.0, &cols, 100.0), Some(1));
        assert_eq!(get_column_for_x(120.0, &cols, 100.0), Some(2));
    }

    #[test]
    fn test_get_row_for_y_no_scroll() {
        let theme = test_theme();
        let hdr = theme.header_height;
        assert_eq!(get_row_for_y(10.0, hdr, theme.row_height, 5, 0.0), None);
        assert_eq!(get_row_for_y(37.0, hdr, theme.row_height, 5, 0.0), Some(0));
        assert_eq!(get_row_for_y(500.0, hdr, theme.row_height, 5, 0.0), None);
    }

    #[test]
    fn test_get_row_for_y_with_scroll() {
        let theme = test_theme();
        let hdr = theme.header_height;
        assert_eq!(get_row_for_y(37.0, hdr, theme.row_height, 10, 34.0), Some(1));
    }

    #[test]
    fn test_hit_test_cell() {
        let cols = test_columns();
        let theme = test_theme();
        let hdr = theme.header_height;
        let result = hit_test(150.0, 50.0, &cols, 5, &theme, 0.0, 0.0, hdr);
        assert!(matches!(result, HitTestResult::Cell { col: 1, row: 0 }));
    }

    #[test]
    fn test_hit_test_cell_with_scroll() {
        let cols = test_columns();
        let theme = test_theme();
        let hdr = theme.header_height;
        let result = hit_test(50.0, 50.0, &cols, 10, &theme, 100.0, 34.0, hdr);
        assert!(matches!(result, HitTestResult::Cell { col: 1, row: 1 }));
    }

    #[test]
    fn test_hit_test_header() {
        let cols = test_columns();
        let theme = test_theme();
        let hdr = theme.header_height;
        let result = hit_test(50.0, 18.0, &cols, 5, &theme, 0.0, 0.0, hdr);
        assert!(matches!(result, HitTestResult::Header { col: 0 }));
    }

    #[test]
    fn test_hit_test_out_of_bounds() {
        let cols = test_columns();
        let theme = test_theme();
        let hdr = theme.header_height;
        assert!(matches!(
            hit_test(500.0, 50.0, &cols, 5, &theme, 0.0, 0.0, hdr),
            HitTestResult::OutOfBounds
        ));
        assert!(matches!(
            hit_test(-1.0, 50.0, &cols, 5, &theme, 0.0, 0.0, hdr),
            HitTestResult::OutOfBounds
        ));
    }

    #[test]
    fn test_get_bounds_for_item_cell() {
        let cols = test_columns();
        let theme = test_theme();
        let hdr = theme.header_height;
        let bounds = get_bounds_for_item(1, 2, &cols, &theme, 0.0, 0.0, hdr).unwrap();
        assert_eq!(bounds.x, 100.0);
        assert_eq!(bounds.y, hdr + 2.0 * 34.0);
    }

    #[test]
    fn test_get_bounds_with_scroll() {
        let cols = test_columns();
        let theme = test_theme();
        let hdr = theme.header_height;
        let bounds = get_bounds_for_item(1, 2, &cols, &theme, 50.0, 34.0, hdr).unwrap();
        assert_eq!(bounds.x, 100.0 - 50.0);
        assert_eq!(bounds.y, hdr + 2.0 * 34.0 - 34.0);
    }

    #[test]
    fn test_get_bounds_for_item_header() {
        let cols = test_columns();
        let theme = test_theme();
        let hdr = theme.header_height;
        let bounds = get_bounds_for_item(0, -1, &cols, &theme, 0.0, 0.0, hdr).unwrap();
        assert_eq!(bounds.height, hdr);
    }

    #[test]
    fn test_get_bounds_for_item_invalid() {
        let cols = test_columns();
        let theme = test_theme();
        let hdr = theme.header_height;
        assert!(get_bounds_for_item(5, 0, &cols, &theme, 0.0, 0.0, hdr).is_none());
    }
}

use serde::{Deserialize, Serialize};

/// 사각형 영역 (화면 좌표)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Rectangle {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

impl Rectangle {
    pub fn new(x: f64, y: f64, width: f64, height: f64) -> Self {
        Self { x, y, width, height }
    }

    pub fn contains(&self, px: f64, py: f64) -> bool {
        px >= self.x && px <= self.x + self.width && py >= self.y && py <= self.y + self.height
    }
}

/// 셀 좌표
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub struct Item {
    pub col: i32,
    pub row: i32,
}

/// 콘텐츠 정렬
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
pub enum ContentAlign {
    #[default]
    Left,
    Center,
    Right,
}

/// Boolean 셀 상태 (3상태 + Empty)
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum BooleanState {
    True,
    False,
    Indeterminate,
    Empty,
}

/// 텍스트 자동 맞춤 모드
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
pub enum FitMode {
    #[default]
    Clip,
    Shrink,
    Ellipsis,
}

/// 셀 콘텐츠
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum CellContent {
    Text {
        text: String,
        #[serde(default)]
        align: ContentAlign,
        #[serde(default)]
        fit_mode: FitMode,
    },
    Number {
        display: String,
        #[serde(default)]
        align: ContentAlign,
    },
    Boolean {
        value: BooleanState,
        #[serde(default)]
        max_size: Option<f64>,
    },
    Uri {
        display: String,
        data: String,
    },
    Bubble {
        tags: Vec<String>,
    },
    Loading {
        #[serde(default)]
        skeleton_width: Option<f64>,
    },
    Protected,
    Image {
        urls: Vec<String>,
        #[serde(default)]
        rounding: f64,
    },
    Empty,
}

/// 테마
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Theme {
    pub bg_cell: String,
    pub bg_cell_medium: String,
    pub bg_header: String,
    pub bg_header_hovered: String,
    pub text_dark: String,
    pub text_medium: String,
    pub text_light: String,
    pub text_header: String,
    pub text_bubble: String,
    pub border_color: String,
    pub accent_color: String,
    pub accent_light: String,
    pub link_color: String,
    pub bg_bubble: String,
    pub header_font: String,
    pub base_font: String,
    pub cell_horizontal_padding: f64,
    pub cell_vertical_padding: f64,
    pub header_height: f64,
    pub group_header_height: f64,
    pub row_height: f64,
    pub bubble_height: f64,
    pub bubble_padding: f64,
    pub bubble_margin: f64,
    pub checkbox_max_size: f64,
}

impl Default for Theme {
    fn default() -> Self {
        Self {
            bg_cell: "#FFFFFF".into(),
            bg_cell_medium: "#FAFAFB".into(),
            bg_header: "#F7F7F8".into(),
            bg_header_hovered: "#EFEFF1".into(),
            text_dark: "#313139".into(),
            text_medium: "#737383".into(),
            text_light: "#B2B2C0".into(),
            text_header: "#313139".into(),
            text_bubble: "#313139".into(),
            border_color: "rgba(115, 116, 131, 0.16)".into(),
            accent_color: "#4F5DFF".into(),
            accent_light: "rgba(62, 116, 253, 0.1)".into(),
            link_color: "#353fb5".into(),
            bg_bubble: "#EDEDF3".into(),
            header_font: "600 13px Inter, Roboto, sans-serif".into(),
            base_font: "13px Inter, Roboto, sans-serif".into(),
            cell_horizontal_padding: 8.0,
            cell_vertical_padding: 3.0,
            header_height: 36.0,
            group_header_height: 0.0,
            row_height: 34.0,
            bubble_height: 20.0,
            bubble_padding: 6.0,
            bubble_margin: 4.0,
            checkbox_max_size: 18.0,
        }
    }
}

/// 테마 오버라이드 (모든 필드 Optional)
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ThemeOverride {
    pub bg_cell: Option<String>,
    pub bg_header: Option<String>,
    pub text_dark: Option<String>,
    pub text_header: Option<String>,
    pub border_color: Option<String>,
    pub accent_color: Option<String>,
    pub accent_light: Option<String>,
    pub link_color: Option<String>,
}

impl ThemeOverride {
    /// base 테마에 오버라이드 적용하여 새 Theme 반환
    pub fn apply_to(&self, base: &Theme) -> Theme {
        let mut t = base.clone();
        if let Some(ref v) = self.bg_cell {
            t.bg_cell = v.clone();
        }
        if let Some(ref v) = self.bg_header {
            t.bg_header = v.clone();
        }
        if let Some(ref v) = self.text_dark {
            t.text_dark = v.clone();
        }
        if let Some(ref v) = self.text_header {
            t.text_header = v.clone();
        }
        if let Some(ref v) = self.border_color {
            t.border_color = v.clone();
        }
        if let Some(ref v) = self.accent_color {
            t.accent_color = v.clone();
        }
        if let Some(ref v) = self.accent_light {
            t.accent_light = v.clone();
        }
        if let Some(ref v) = self.link_color {
            t.link_color = v.clone();
        }
        t
    }
}

/// 컬럼 정의
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Column {
    pub title: String,
    pub width: f64,
    #[serde(default)]
    pub group: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub has_menu: bool,
    #[serde(default)]
    pub theme_override: Option<ThemeOverride>,
}

/// hitTest에서 헤더 메뉴 클릭 구분을 위한 확장
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum HitTestResultExt {
    #[serde(rename = "cell")]
    Cell { col: usize, row: usize },
    #[serde(rename = "header")]
    Header { col: usize, is_edge: bool, is_menu: bool },
    #[serde(rename = "group-header")]
    GroupHeader { col: usize, group: String },
    #[serde(rename = "out-of-bounds")]
    OutOfBounds,
}

/// 선택 범위
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub struct SelectionRange {
    pub x: usize,      // 시작 컬럼
    pub y: usize,      // 시작 행
    pub width: usize,  // 컬럼 수
    pub height: usize, // 행 수
}

impl SelectionRange {
    pub fn from_corners(col1: usize, row1: usize, col2: usize, row2: usize) -> Self {
        let x = col1.min(col2);
        let y = row1.min(row2);
        let width = col1.max(col2) - x + 1;
        let height = row1.max(row2) - y + 1;
        Self { x, y, width, height }
    }

    pub fn contains(&self, col: usize, row: usize) -> bool {
        col >= self.x && col < self.x + self.width && row >= self.y && row < self.y + self.height
    }
}

/// hitTest 결과
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum HitTestResult {
    #[serde(rename = "cell")]
    Cell { col: usize, row: usize },
    #[serde(rename = "header")]
    Header { col: usize },
    #[serde(rename = "out-of-bounds")]
    OutOfBounds,
}

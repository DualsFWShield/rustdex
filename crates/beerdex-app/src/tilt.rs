//! Native 3D Card Tilt and Holographic Glare Physics for Beerdex (replacing `vanilla-tilt.min.js`).

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TiltSettings {
    pub max: f64,
    pub perspective: f64,
    pub scale: f64,
    pub speed_ms: u32,
    pub max_glare: f64,
    pub reverse: bool,
    pub axis: Option<String>,
}

impl Default for TiltSettings {
    fn default() -> Self {
        Self {
            max: 15.0,
            perspective: 1000.0,
            scale: 1.0,
            speed_ms: 300,
            max_glare: 0.2,
            reverse: false,
            axis: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TiltState {
    pub tilt_x: f64,
    pub tilt_y: f64,
    pub percentage_x: f64,
    pub percentage_y: f64,
    pub angle_deg: f64,
    pub glare_opacity: f64,
    pub transform_css: String,
    pub glare_transform_css: String,
}

pub struct TiltEngine {
    pub settings: TiltSettings,
}

impl TiltEngine {
    pub fn new(settings: TiltSettings) -> Self {
        Self { settings }
    }

    /// Computes tilt state based on pointer/gyro position and element dimensions.
    pub fn compute(
        &self,
        cursor_x: f64,
        cursor_y: f64,
        elem_left: f64,
        elem_top: f64,
        elem_width: f64,
        elem_height: f64,
    ) -> TiltState {
        if elem_width <= 0.0 || elem_height <= 0.0 {
            return self.reset_state();
        }

        let rel_x = ((cursor_x - elem_left) / elem_width).clamp(0.0, 1.0);
        let rel_y = ((cursor_y - elem_top) / elem_height).clamp(0.0, 1.0);

        let reverse_factor = if self.settings.reverse { -1.0 } else { 1.0 };

        let tilt_x = reverse_factor * (self.settings.max - rel_x * self.settings.max * 2.0);
        let tilt_y = reverse_factor * (rel_y * self.settings.max * 2.0 - self.settings.max);

        let pct_x = rel_x * 100.0;
        let pct_y = rel_y * 100.0;

        let center_x = elem_left + elem_width / 2.0;
        let center_y = elem_top + elem_height / 2.0;
        let angle_rad = (cursor_x - center_x).atan2(-(cursor_y - center_y));
        let angle_deg = angle_rad.to_degrees();

        let glare_opacity = (pct_y * self.settings.max_glare / 100.0).clamp(0.0, 1.0);

        let rot_x = if self.settings.axis.as_deref() == Some("x") {
            0.0
        } else {
            tilt_y
        };
        let rot_y = if self.settings.axis.as_deref() == Some("y") {
            0.0
        } else {
            tilt_x
        };

        let transform_css = format!(
            "perspective({:.1}px) rotateX({:.2}deg) rotateY({:.2}deg) scale3d({:.3}, {:.3}, {:.3})",
            self.settings.perspective,
            rot_x,
            rot_y,
            self.settings.scale,
            self.settings.scale,
            self.settings.scale
        );

        let glare_transform_css = format!("rotate({:.2}deg) translate(-50%, -50%)", angle_deg);

        TiltState {
            tilt_x: (tilt_x * 100.0).round() / 100.0,
            tilt_y: (tilt_y * 100.0).round() / 100.0,
            percentage_x: (pct_x * 100.0).round() / 100.0,
            percentage_y: (pct_y * 100.0).round() / 100.0,
            angle_deg: (angle_deg * 100.0).round() / 100.0,
            glare_opacity: (glare_opacity * 1000.0).round() / 1000.0,
            transform_css,
            glare_transform_css,
        }
    }

    pub fn reset_state(&self) -> TiltState {
        TiltState {
            tilt_x: 0.0,
            tilt_y: 0.0,
            percentage_x: 50.0,
            percentage_y: 50.0,
            angle_deg: 180.0,
            glare_opacity: 0.0,
            transform_css: format!(
                "perspective({:.1}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
                self.settings.perspective
            ),
            glare_transform_css: "rotate(180deg) translate(-50%, -50%)".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tilt_center() {
        let engine = TiltEngine::new(TiltSettings::default());
        // Cursor exactly at center of 200x300 element
        let state = engine.compute(100.0, 150.0, 0.0, 0.0, 200.0, 300.0);
        assert_eq!(state.tilt_x, 0.0);
        assert_eq!(state.tilt_y, 0.0);
        assert_eq!(state.percentage_x, 50.0);
        assert_eq!(state.percentage_y, 50.0);
    }

    #[test]
    fn test_tilt_top_left() {
        let engine = TiltEngine::new(TiltSettings::default());
        // Cursor at top left
        let state = engine.compute(0.0, 0.0, 0.0, 0.0, 100.0, 100.0);
        assert_eq!(state.tilt_x, 15.0);
        assert_eq!(state.tilt_y, -15.0);
        assert!(state
            .transform_css
            .contains("rotateX(-15.00deg) rotateY(15.00deg)"));
    }
}

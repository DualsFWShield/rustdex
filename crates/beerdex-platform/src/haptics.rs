//! Native Haptics Engine for Beerdex (replacing `js/vendor/haptics-shim.js`).
//! Provides platform-agnostic vibration feedback for tactile micro-interactions.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ImpactStyle {
    Light,
    Medium,
    Heavy,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NotificationType {
    Success,
    Warning,
    Error,
}

pub struct HapticsEngine;

impl HapticsEngine {
    /// Triggers an impact tactile vibration.
    pub fn impact(style: ImpactStyle) {
        let duration = match style {
            ImpactStyle::Light => 10,
            ImpactStyle::Medium => 15,
            ImpactStyle::Heavy => 20,
        };
        Self::vibrate_raw(&[duration]);
    }

    /// Triggers a semantic notification vibration pattern.
    pub fn notification(notif: NotificationType) {
        match notif {
            NotificationType::Success => {
                // Short-Long-Short
                Self::vibrate_raw(&[10, 30, 10]);
            }
            NotificationType::Warning => {
                Self::vibrate_raw(&[20, 20]);
            }
            NotificationType::Error => {
                // Long-Short-Long-Short-Long
                Self::vibrate_raw(&[30, 20, 30, 20, 50]);
            }
        }
    }

    /// Triggers a vibration of a specified duration in milliseconds.
    pub fn vibrate(duration_ms: u32) {
        Self::vibrate_raw(&[duration_ms]);
    }

    #[cfg(target_arch = "wasm32")]
    fn vibrate_raw(pattern: &[u32]) {
        if let Some(window) = web_sys::window() {
            let navigator = window.navigator();
            if pattern.len() == 1 {
                navigator.vibrate_with_duration(pattern[0]);
            } else {
                let js_array = js_sys::Array::new();
                for &ms in pattern {
                    js_array.push(&wasm_bindgen::JsValue::from(ms));
                }
                navigator.vibrate_with_pattern(&js_array);
            }
        }
    }

    #[cfg(not(target_arch = "wasm32"))]
    fn vibrate_raw(_pattern: &[u32]) {
        // Native desktop/cli/android JNI bridge
        #[cfg(target_os = "android")]
        {
            // On Android Native, hooks into android.os.Vibrator
        }
    }
}

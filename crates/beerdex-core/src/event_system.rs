use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventDate {
    pub year: i32,
    pub month: u32, // 0-indexed in JS config, or 1-12
    pub day: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventAutomation {
    #[serde(rename = "museumTheme", default)]
    pub museum_theme: bool,
    #[serde(rename = "forceBannerId", default)]
    pub force_banner_id: Option<String>,
    #[serde(rename = "bacCalculator", default)]
    pub bac_calculator: bool,
    #[serde(rename = "bacWidget", default)]
    pub bac_widget: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventBanner {
    pub id: String,
    pub title: String,
    pub message: String,
    pub button: String,
    #[serde(rename = "forceDisplay", default)]
    pub force_display: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeerdexEvent {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub debug: bool,
    pub date: EventDate,
    #[serde(default)]
    pub automation: Option<EventAutomation>,
    #[serde(default)]
    pub banner: Option<EventBanner>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EventConfig {
    pub events: Vec<BeerdexEvent>,
}

pub struct EventSystem {
    pub config: EventConfig,
}

impl EventSystem {
    pub fn new(config_json: &str) -> Self {
        let config = serde_json::from_str(config_json).unwrap_or_default();
        Self { config }
    }

    pub fn get_active_event(
        &self,
        year: i32,
        month: u32,
        day: u32,
        force_debug: bool,
    ) -> Option<&BeerdexEvent> {
        self.config.events.iter().find(|e| {
            if e.debug || force_debug {
                return true;
            }
            e.date.year == year && e.date.month == month && e.date.day == day
        })
    }

    pub fn should_force_banner(&self, event: &BeerdexEvent) -> bool {
        if let Some(banner) = &event.banner {
            if banner.force_display {
                return true;
            }
            if let Some(auto) = &event.automation {
                if let Some(force_id) = &auto.force_banner_id {
                    return force_id == &banner.id;
                }
            }
        }
        false
    }
}

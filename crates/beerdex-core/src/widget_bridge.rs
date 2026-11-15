use crate::bac::{format_hours, hours_to_drive, hours_to_zero, simulate_bac, Gender};
use crate::models::{BacHistoryEntry, BacRule, UserBeerData};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetPayload {
    pub bac_value: String,
    pub bac_color: String,
    pub bac_title: String,
    pub bac_message: String,
    pub time_to_drive: String,
    pub time_to_zero: String,
    pub monthly_count: u32,
    pub vehicle_emoji: String,
    pub timestamp: i64,
}

pub fn generate_widget_payload(
    bac_history: &[BacHistoryEntry],
    user_data: &HashMap<String, UserBeerData>,
    rule: &BacRule,
    weight_kg: f64,
    gender: Gender,
    vehicle: &str,
    current_time_ms: i64,
) -> WidgetPayload {
    let sim = simulate_bac(bac_history, current_time_ms, weight_kg, gender, 15);
    let to_drive = hours_to_drive(&sim, rule, current_time_ms);
    let to_zero = hours_to_zero(&sim, current_time_ms);

    let (color, title, message) = if sim.current_bac < 0.01 {
        (
            "#4CAF50".to_string(),
            "Sobre".to_string(),
            "Apte à la conduite".to_string(),
        )
    } else if sim.current_bac < rule.sanction_threshold {
        (
            "#8BC34A".to_string(),
            "Zone légale".to_string(),
            "En-dessous de la limite légale".to_string(),
        )
    } else if sim.current_bac < rule.withdraw_threshold {
        (
            "#FF9800".to_string(),
            "Infraction".to_string(),
            "Conduite interdite".to_string(),
        )
    } else {
        (
            "#F44336".to_string(),
            "Délit grave".to_string(),
            "Retrait immédiat de permis".to_string(),
        )
    };

    let vehicle_emoji = match vehicle {
        "moto" => "🏍️".to_string(),
        "velo" => "🚲".to_string(),
        _ => "🚗".to_string(),
    };

    // Calculate monthly consumption count
    let mut monthly_count = 0u32;
    let now_seconds = current_time_ms / 1000;
    let now_month = ((now_seconds / 86400) / 30) % 12;

    for data in user_data.values() {
        for h in &data.history {
            let h_month = ((h.timestamp / 1000 / 86400) / 30) % 12;
            if h_month == now_month {
                monthly_count += 1;
            }
        }
    }

    WidgetPayload {
        bac_value: format!("{:.2}", sim.current_bac),
        bac_color: color,
        bac_title: title,
        bac_message: message,
        time_to_drive: if to_drive <= 0.0 {
            "✅".to_string()
        } else {
            format_hours(to_drive)
        },
        time_to_zero: if to_zero <= 0.0 {
            "✅".to_string()
        } else {
            format_hours(to_zero)
        },
        monthly_count,
        vehicle_emoji,
        timestamp: current_time_ms,
    }
}

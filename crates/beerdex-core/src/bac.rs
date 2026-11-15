use crate::models::{BacHistoryEntry, BacRule, GamerStats};

pub const MEN_R: f64 = 0.68;
pub const WOMEN_R: f64 = 0.55;
pub const AVERAGE_R: f64 = 0.615;
pub const ELIMINATION_RATE: f64 = 0.15; // g/L per hour

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Gender {
    Male,
    Female,
    Other,
}

impl Gender {
    pub fn r_factor(&self) -> f64 {
        match self {
            Gender::Male => MEN_R,
            Gender::Female => WOMEN_R,
            Gender::Other => AVERAGE_R,
        }
    }
}

/// Calculates grams of pure alcohol from volume in ml and ABV in percent (0-100).
pub fn calculate_alcohol_grams(volume_ml: u32, abv: f64) -> f64 {
    (volume_ml as f64) * (abv / 100.0) * 0.8
}

#[derive(Debug, Clone, PartialEq)]
pub struct BacCurvePoint {
    pub time: i64,
    pub bac: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct BacSimulation {
    pub current_bac: f64,
    pub peak_bac: f64,
    pub curve: Vec<BacCurvePoint>,
}

/// Simulates the user's BAC over time using the Widmark formula with realistic absorption queues.
pub fn simulate_bac(
    history: &[BacHistoryEntry],
    now: i64,
    weight_kg: f64,
    gender: Gender,
    drink_duration_min: u32,
) -> BacSimulation {
    let effective_weight = if weight_kg < 20.0 { 70.0 } else { weight_kg };
    let r = gender.r_factor();
    let bac_per_gram = 1.0 / (effective_weight * r);
    let elimination_per_min = ELIMINATION_RATE / 60.0;
    let absorption_mins = (45 + drink_duration_min) as f64;

    // Filter drinks within the last 24 hours
    let day_ms = 24 * 60 * 60 * 1000;
    let mut recent_drinks: Vec<BacHistoryEntry> = history
        .iter()
        .filter(|d| (now - d.time) < day_ms && d.grams > 0.0)
        .cloned()
        .collect();

    if recent_drinks.is_empty() {
        return BacSimulation {
            current_bac: 0.0,
            peak_bac: 0.0,
            curve: vec![],
        };
    }

    recent_drinks.sort_by_key(|d| d.time);

    let start_time = recent_drinks[0].time;
    let total_grams: f64 = recent_drinks.iter().map(|d| d.grams).sum();
    let estimated_hours = (total_grams * bac_per_gram) / ELIMINATION_RATE;
    let duration_ms = ((estimated_hours + 12.0).clamp(24.0, 200.0) * 3600.0 * 1000.0) as i64;
    let max_end_time = now.max(start_time) + duration_ms;

    let mut sim_time = start_time;
    let mut current_bac = 0.0;
    let mut current_actual_bac = 0.0;
    let mut peak_bac = 0.0;
    let mut curve = Vec::new();

    struct AbsorptionChunk {
        remaining_grams: f64,
        rate_per_min: f64,
    }
    let mut absorption_queue: Vec<AbsorptionChunk> = Vec::new();

    let step_ms = 60 * 1000; // 1 minute steps
    let mut drink_idx = 0;

    while sim_time <= max_end_time {
        while drink_idx < recent_drinks.len() && recent_drinks[drink_idx].time <= sim_time {
            let drink = &recent_drinks[drink_idx];
            absorption_queue.push(AbsorptionChunk {
                remaining_grams: drink.grams,
                rate_per_min: drink.grams / absorption_mins,
            });
            drink_idx += 1;
        }

        let mut absorbed_this_min = 0.0;
        for chunk in &mut absorption_queue {
            if chunk.remaining_grams > 0.0 {
                let to_absorb = chunk.rate_per_min.min(chunk.remaining_grams);
                absorbed_this_min += to_absorb;
                chunk.remaining_grams -= to_absorb;
            }
        }

        current_bac += absorbed_this_min * bac_per_gram;

        if current_bac > 0.0 {
            current_bac -= elimination_per_min;
            if current_bac < 0.0 {
                current_bac = 0.0;
            }
        }

        if sim_time >= now && current_bac > peak_bac {
            peak_bac = current_bac;
        }

        // Sample curve every 5 minutes
        if sim_time % (5 * 60 * 1000) < step_ms {
            curve.push(BacCurvePoint {
                time: sim_time,
                bac: current_bac,
            });
        }

        if sim_time >= now && sim_time - step_ms < now {
            current_actual_bac = current_bac;
        }

        // Termination condition: after now, all drinks injected, queue empty, and BAC back to zero
        if sim_time > now
            && drink_idx >= recent_drinks.len()
            && current_bac == 0.0
            && absorption_queue.iter().all(|q| q.remaining_grams <= 0.0)
        {
            curve.push(BacCurvePoint {
                time: sim_time,
                bac: 0.0,
            });
            break;
        }

        sim_time += step_ms;
    }

    if now < start_time {
        current_actual_bac = 0.0;
    }

    BacSimulation {
        current_bac: current_actual_bac,
        peak_bac: peak_bac.max(current_actual_bac),
        curve,
    }
}

/// Computes the wait time in hours before dropping below the driving sanction threshold.
pub fn hours_to_drive(sim: &BacSimulation, rule: &BacRule, now: i64) -> f64 {
    let limit = rule.sanction_threshold;
    let future_points: Vec<&BacCurvePoint> = sim.curve.iter().filter(|p| p.time >= now).collect();

    // Scan backwards to find the last point with bac >= limit
    for (i, p) in future_points.iter().enumerate().rev() {
        if p.bac >= limit {
            if let Some(next) = future_points.get(i + 1) {
                return ((next.time - now) as f64 / (1000.0 * 3600.0)).max(0.0);
            }
            break;
        }
    }

    if sim.current_bac < limit
        && (future_points.is_empty() || future_points.iter().all(|p| p.bac < limit))
    {
        return 0.0;
    }

    ((sim.current_bac - limit) / ELIMINATION_RATE).max(0.0)
}

/// Computes the wait time in hours until blood alcohol is completely eliminated (0.0 g/L).
pub fn hours_to_zero(sim: &BacSimulation, now: i64) -> f64 {
    if sim.current_bac == 0.0
        && (sim.curve.is_empty() || sim.curve.iter().all(|p| p.time < now || p.bac == 0.0))
    {
        return 0.0;
    }

    let future_points: Vec<&BacCurvePoint> = sim.curve.iter().filter(|p| p.time >= now).collect();
    for p in future_points.iter().rev() {
        if p.bac > 0.0 {
            return ((p.time - now) as f64 / (1000.0 * 3600.0)).max(0.0);
        }
    }

    (sim.current_bac / ELIMINATION_RATE).max(0.0)
}

/// Formats decimal hours into human-readable string (e.g. 1.5 -> "1h30").
pub fn format_hours(hours: f64) -> String {
    let total_mins = (hours * 60.0).round() as u32;
    let h = total_mins / 60;
    let m = total_mins % 60;
    if h == 0 {
        format!("{}min", m)
    } else {
        format!("{}h{:02}", h, m)
    }
}

/// Translates the current blood alcohol content into gamer performance metrics.
pub fn get_gamer_stats(bac: f64) -> GamerStats {
    let ping = (200.0 + (bac * 150.0)).round() as u32;
    let fps = (144.0 - (bac * 60.0)).round().max(10.0) as u32;
    let aim_assist = (bac * 50.0).round().min(100.0) as u32;
    let fov = (110.0 - (bac * 25.0)).round().max(60.0) as u32;

    let resolution_key = if bac <= 0.20 {
        "bac_gamer_res_4k"
    } else if bac <= 0.60 {
        "bac_gamer_res_1080"
    } else if bac <= 1.10 {
        "bac_gamer_res_720"
    } else if bac <= 1.60 {
        "bac_gamer_res_480"
    } else {
        "bac_gamer_res_144"
    };

    let setup_key = if bac <= 0.30 {
        "bac_gamer_setup_esport"
    } else if bac <= 0.70 {
        "bac_gamer_setup_wireless"
    } else if bac <= 1.20 {
        "bac_gamer_setup_drift"
    } else if bac <= 1.70 {
        "bac_gamer_setup_cheap"
    } else {
        "bac_gamer_setup_trackpad"
    };

    let (rank_key, rank_color, rank_sub_key) = if bac <= 0.20 {
        (
            "bac_gamer_rank_global_elite",
            "#00e5ff",
            "bac_gamer_sub_global_elite",
        )
    } else if bac <= 0.50 {
        ("bac_gamer_rank_gold", "#ffb300", "bac_gamer_sub_gold")
    } else if bac <= 1.00 {
        ("bac_gamer_rank_silver", "#b0bec5", "bac_gamer_sub_silver")
    } else if bac <= 1.50 {
        ("bac_gamer_rank_bronze", "#cd7f32", "bac_gamer_sub_bronze")
    } else {
        ("bac_gamer_rank_wood", "#8d6e63", "bac_gamer_sub_wood")
    };

    GamerStats {
        ping,
        fps,
        aim_assist,
        fov,
        resolution_key,
        setup_key,
        rank_key,
        rank_color,
        rank_sub_key,
    }
}

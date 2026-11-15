use serde::{Deserialize, Serialize};

/// Represents an official or custom beer in Beerdex.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Beer {
    pub title: String,
    pub brewery: String,
    #[serde(rename = "type")]
    pub beer_type: String,
    #[serde(default)]
    pub volume: Option<String>,
    #[serde(default)]
    pub alcohol: Option<String>,
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub image: Option<String>,
    #[serde(default)]
    pub production_volume: Option<String>,
    #[serde(default)]
    pub distribution: Option<String>,
    #[serde(default)]
    pub barrel_aged: Option<bool>,
    #[serde(default)]
    pub community_rating: Option<serde_json::Value>,
    #[serde(default)]
    pub ingredients: Option<String>,
    #[serde(default)]
    pub rarity_rank: Option<String>,
    #[serde(default)]
    pub barcode: Option<String>,
    #[serde(default)]
    pub country: Option<String>,
    #[serde(default)]
    pub country_code: Option<String>,
    #[serde(default)]
    pub search_region: Option<String>,
    #[serde(default)]
    pub search_country: Option<String>,
}

pub fn djb2_hash(s: &str) -> String {
    let mut hash: i32 = 5381;
    for code_unit in s.encode_utf16() {
        hash = hash
            .wrapping_shl(5)
            .wrapping_add(hash)
            .wrapping_add(code_unit as i32);
    }
    let abs_val = (hash as i64).unsigned_abs();
    to_base36(abs_val)
}

fn to_base36(mut n: u64) -> String {
    if n == 0 {
        return "0".to_string();
    }
    const CHARSET: &[u8] = b"0123456789abcdefghijklmnopqrstuvwxyz";
    let mut digits = Vec::new();
    while n > 0 {
        digits.push(CHARSET[(n % 36) as usize]);
        n /= 36;
    }
    digits.reverse();
    String::from_utf8(digits).unwrap_or_else(|_| "0".to_string())
}

impl Beer {
    /// Resolves the definitive ID for this beer matching JS djb2 deterministic hash.
    pub fn resolved_id(&self) -> String {
        if let Some(ref id) = self.id {
            if !id.trim().is_empty() {
                return id.clone();
            }
        }
        let clean_title = self
            .title
            .split_whitespace()
            .collect::<Vec<_>>()
            .join("_")
            .to_uppercase();
        let hash_input = format!("{}{}", self.title, self.brewery);
        let hash = djb2_hash(&hash_input);
        format!("{}_{}", clean_title, hash)
    }

    /// Parses ABV as float (e.g. "8.5%", "8,5°" -> 8.5)
    pub fn parsed_abv(&self) -> f64 {
        let abv_str = self.alcohol.as_deref().unwrap_or("0");
        let sanitized = abv_str.replace(['%', '°'], "").replace(',', ".");
        sanitized.trim().parse::<f64>().unwrap_or(0.0)
    }

    /// Parses volume to milliliters (ml)
    pub fn parsed_volume_ml(&self) -> u32 {
        let vol_str = self.volume.as_deref().unwrap_or("33cl");
        parse_volume_to_ml(vol_str)
    }

    /// Returns whether this beer is an authentic or historic Trappist beer.
    pub fn is_trappist(&self) -> bool {
        is_trappist_beer(self)
    }

    /// Resolves canonical Trappist Abbey key if applicable.
    pub fn trappist_abbey(&self) -> Option<&'static str> {
        get_trappist_abbey(self)
    }

    /// Formats volume as standard display string ("33cl", "50cl", "1L").
    pub fn formatted_volume(&self) -> String {
        format_volume(self.parsed_volume_ml())
    }
}

/// Helper function to convert various volume notations into milliliters.
pub fn parse_volume_to_ml(vol_str: &str) -> u32 {
    let lower = vol_str.trim().to_lowercase().replace(',', ".");
    if lower.contains("cl") {
        let num: f64 = lower.replace("cl", "").trim().parse().unwrap_or(33.0);
        (num * 10.0).round() as u32
    } else if lower.contains('l') && !lower.contains("cl") && !lower.contains("ml") {
        let num: f64 = lower.replace('l', "").trim().parse().unwrap_or(0.33);
        (num * 1000.0).round() as u32
    } else if lower.contains("ml") {
        lower.replace("ml", "").trim().parse().unwrap_or(330)
    } else if lower == "pinte" || lower == "pint" {
        500
    } else if lower == "galopin" || lower == "demi" {
        250
    } else {
        // Fallback default
        330
    }
}

/// Formats a volume in ml to standard display notation ("33cl", "50cl", "1L", "1.5L").
pub fn format_volume(volume_ml: u32) -> String {
    if volume_ml == 0 {
        return String::new();
    }
    if volume_ml >= 1000 {
        let liters = volume_ml as f64 / 1000.0;
        if (liters.fract()).abs() < f64::EPSILON {
            format!("{:.0}L", liters)
        } else {
            format!("{:.1}L", liters)
        }
    } else {
        let cl = volume_ml as f64 / 10.0;
        if (cl.fract()).abs() < f64::EPSILON {
            format!("{:.0}cl", cl)
        } else {
            format!("{:.1}cl", cl)
        }
    }
}

pub const TRAPPIST_BREWERIES: &[&str] = &[
    "scourmont",
    "chimay",
    "orval",
    "rochefort",
    "saint-remy",
    "saint-rémy",
    "westmalle",
    "westvleteren",
    "saint-sixte",
    "sint-sixtus",
    "achel",
    "achelse kluis",
    "koningshoeven",
    "la trappe",
    "de kievit",
    "zundert",
    "tre fontane",
    "fontane",
    "cardeña",
    "cardena",
    "san pedro de cardeña",
    "mount st bernard",
    "mount saint-bernard",
    "tynt meadow",
    "engelszell",
    "spencer",
    "mont des cats",
];

pub const TRAPPIST_TITLES: &[&str] = &[
    "chimay",
    "orval",
    "rochefort",
    "westmalle",
    "westvleteren",
    "achel",
    "la trappe",
    "zundert",
    "tre fontane",
    "cardeña",
    "cardena",
    "tynt meadow",
    "engelszell",
    "gregorius",
    "benno",
    "nivard",
    "spencer",
    "mont des cats",
];

/// Identifies if a given beer is an authentic or historic Trappist beer.
pub fn is_trappist_beer(beer: &Beer) -> bool {
    let brew = beer.brewery.to_lowercase();
    let title = beer.title.to_lowercase();
    let b_type = beer.beer_type.to_lowercase();
    let id = beer.resolved_id().to_lowercase();

    if b_type.contains("trappiste") || b_type.contains("trappist") || id.contains("trappist") {
        return true;
    }

    if TRAPPIST_BREWERIES.iter().any(|tb| brew.contains(tb)) {
        return true;
    }

    if TRAPPIST_TITLES.iter().any(|tt| {
        title.starts_with(tt)
            || title.contains(&format!(" {}", tt))
            || title.contains(&format!("{} ", tt))
    }) {
        return true;
    }

    false
}

/// Resolves the canonical Trappist Abbey key for achievements and grouping.
pub fn get_trappist_abbey(beer: &Beer) -> Option<&'static str> {
    let brew = beer.brewery.to_lowercase();
    let title = beer.title.to_lowercase();
    let id = beer.resolved_id().to_lowercase();

    if brew.contains("mont des cats")
        || title.contains("mont des cats")
        || title.contains("cats")
        || id.contains("mont_des_cats")
    {
        return Some("mont des cats");
    }
    if brew.contains("scourmont")
        || brew.contains("chimay")
        || title.contains("chimay")
        || id.contains("chimay")
    {
        return Some("chimay");
    }
    if brew.contains("orval") || title.contains("orval") || id.contains("orval") {
        return Some("orval");
    }
    if brew.contains("rochefort")
        || brew.contains("saint-remy")
        || brew.contains("saint-rémy")
        || title.contains("rochefort")
        || id.contains("rochefort")
    {
        return Some("rochefort");
    }
    if brew.contains("westmalle") || title.contains("westmalle") || id.contains("westmalle") {
        return Some("westmalle");
    }
    if brew.contains("westvleteren")
        || brew.contains("saint-sixte")
        || brew.contains("sint-sixtus")
        || title.contains("westvleteren")
        || id.contains("westvleteren")
    {
        return Some("westvleteren");
    }
    if brew.contains("achel") || title.contains("achel") || id.contains("achel") {
        return Some("achel");
    }
    if brew.contains("koningshoeven")
        || brew.contains("la trappe")
        || title.contains("la trappe")
        || id.contains("la_trappe")
    {
        return Some("la trappe");
    }
    if brew.contains("zundert")
        || brew.contains("kievit")
        || title.contains("zundert")
        || id.contains("zundert")
    {
        return Some("zundert");
    }
    if brew.contains("tre fontane")
        || brew.contains("fontane")
        || title.contains("tre fontane")
        || id.contains("tre_fontane")
    {
        return Some("tre fontane");
    }
    if brew.contains("cardeña")
        || brew.contains("cardena")
        || title.contains("cardena")
        || id.contains("cardena")
    {
        return Some("cardena");
    }
    if brew.contains("mount st")
        || brew.contains("tynt meadow")
        || title.contains("tynt meadow")
        || id.contains("tynt_meadow")
    {
        return Some("tynt meadow");
    }
    if brew.contains("engelszell")
        || title.contains("engelszell")
        || title.contains("gregorius")
        || title.contains("benno")
        || title.contains("nivard")
        || id.contains("engelszell")
    {
        return Some("engelszell");
    }
    if brew.contains("spencer") || title.contains("spencer") || id.contains("spencer") {
        return Some("spencer");
    }

    None
}

/// Brewery information with geographical location.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Brewery {
    pub name: String,
    #[serde(default)]
    pub province: Option<String>,
    pub country: String,
}

/// A single logged consumption occurrence.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ConsumptionRecord {
    #[serde(default)]
    pub date: String,
    #[serde(default)]
    pub timestamp: i64,
    pub volume: u32,
}

impl ConsumptionRecord {
    pub fn resolved_timestamp(&self) -> i64 {
        if self.timestamp > 0 {
            return self.timestamp;
        }
        if let Ok(parsed) = chrono::DateTime::parse_from_rfc3339(&self.date) {
            return parsed.timestamp_millis();
        }
        0
    }
}

/// User rating and consumption history for a beer.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct UserBeerData {
    #[serde(default)]
    pub count: u32,
    #[serde(default)]
    pub score: Option<f64>,
    #[serde(default)]
    pub comment: Option<String>,
    #[serde(default)]
    pub favorite: Option<bool>,
    #[serde(default)]
    pub aromas: Option<Vec<String>>,
    #[serde(default)]
    pub timestamp: Option<String>,
    #[serde(default)]
    pub history: Vec<ConsumptionRecord>,
}

/// Custom beer entered manually by the user.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CustomBeer {
    pub id: String,
    pub title: String,
    pub brewery: String,
    #[serde(rename = "type")]
    pub beer_type: String,
    pub volume: String,
    pub alcohol: String,
    #[serde(default)]
    pub image: Option<String>,
    #[serde(default)]
    pub barcode: Option<String>,
    #[serde(default)]
    pub country: Option<String>,
}

/// Entry stored for BAC historical calculation.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BacHistoryEntry {
    pub time: i64,   // Timestamp in milliseconds
    pub volume: u32, // in ml
    pub abv: f64,    // percentage 0-100
    pub grams: f64,  // pure alcohol grams
}

/// National legal limits for BAC and driving.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BacRule {
    #[serde(rename = "nameKey")]
    pub name_key: String,
    #[serde(rename = "sanctionThreshold")]
    pub sanction_threshold: f64,
    #[serde(rename = "withdrawThreshold")]
    pub withdraw_threshold: f64,
    #[serde(rename = "airRatio")]
    pub air_ratio: f64,
    #[serde(rename = "sanctionKey")]
    pub sanction_key: String,
    #[serde(rename = "withdrawKey")]
    pub withdraw_key: String,
}

/// Gamer stats derived from current BAC.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GamerStats {
    pub ping: u32,
    pub fps: u32,
    pub aim_assist: u32,
    pub fov: u32,
    pub resolution_key: &'static str,
    pub setup_key: &'static str,
    pub rank_key: &'static str,
    pub rank_color: &'static str,
    pub rank_sub_key: &'static str,
}

/// Rarity evaluation result.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RarityResult {
    pub score: i32,
    pub rarity: String,
    pub reasons: Vec<String>,
}

/// Represents an entry recorded in crashLogger.js.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CrashLogEntry {
    pub error_type: String,
    pub message: String,
    pub source: String,
    pub line: u32,
    pub stack: String,
    pub timestamp: String,
}

/// Offline queued analytics event from analytics.js.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AnalyticsEvent {
    pub event_type: String,
    pub payload: serde_json::Value,
    pub timestamp: i64,
}

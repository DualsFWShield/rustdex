use crate::models::{Beer, UserBeerData};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use strsim::jaro_winkler;

pub const CANONICAL_SYNONYMS: &[(&str, &str)] = &[
    // Styles & Colors
    ("triple", "triple"),
    ("tripel", "triple"),
    ("trippel", "triple"),
    ("double", "double"),
    ("dubbel", "double"),
    ("quadrupel", "quadrupel"),
    ("quad", "quadrupel"),
    ("blonde", "blond"),
    ("blond", "blond"),
    ("brune", "brune"),
    ("bruin", "brune"),
    ("brown", "brune"),
    ("donker", "brune"),
    ("dark", "brune"),
    ("blanche", "blanche"),
    ("wit", "blanche"),
    ("witte", "blanche"),
    ("white", "blanche"),
    ("witbier", "blanche"),
    ("tarwebier", "blanche"),
    ("ambree", "ambree"),
    ("amber", "ambree"),
    ("rouge", "rouge"),
    ("red", "rouge"),
    ("rubis", "rouge"),
    ("bleue", "bleue"),
    ("bleu", "bleue"),
    ("blue", "bleue"),
    ("noire", "noire"),
    ("black", "noire"),
    ("doree", "doree"),
    ("gold", "doree"),
    ("golden", "doree"),
    // Lambic & Sour
    ("gueuze", "gueuze"),
    ("geuze", "gueuze"),
    ("lambic", "lambic"),
    ("lambiek", "lambic"),
    ("kriek", "kriek"),
    ("framboise", "framboise"),
    ("frambozen", "framboise"),
    ("peche", "peche"),
    ("perzik", "peche"),
    ("cerise", "cerise"),
    ("cassis", "cassis"),
    // Alcohol Free
    ("sans alcool", "zero"),
    ("0.0", "zero"),
    ("00", "zero"),
    ("0°", "zero"),
    ("0%", "zero"),
    ("zero", "zero"),
    ("virgin", "zero"),
    ("alcoholvrij", "zero"),
    ("na", "zero"),
    ("non alcoholic", "zero"),
    // Hop & Styles
    ("ipa", "ipa"),
    ("neipa", "neipa"),
    ("dipa", "dipa"),
    ("stout", "stout"),
    ("porter", "porter"),
    ("pils", "pils"),
    ("pilsner", "pils"),
    ("lager", "lager"),
    ("saison", "saison"),
    ("barleywine", "barleywine"),
    // Season
    ("noel", "noel"),
    ("kerst", "noel"),
    ("christmas", "noel"),
    ("winter", "winter"),
    ("paques", "paques"),
    ("cuvee", "cuvee"),
    ("reserve", "reserve"),
    // Barrel / Aging
    ("smoked", "smoked"),
    ("fume", "smoked"),
    ("fumee", "smoked"),
    ("oaked", "oaked"),
    ("bourbon", "bourbon"),
    ("whisky", "whisky"),
    ("whiskey", "whisky"),
    ("rum", "rum"),
    ("rhum", "rum"),
];

pub const STOP_WORDS: &[&str] = &[
    "la",
    "le",
    "les",
    "l",
    "de",
    "du",
    "des",
    "d",
    "the",
    "t",
    "het",
    "een",
    "der",
    "den",
    "die",
    "das",
    "biere",
    "beer",
    "bier",
    "craft",
    "original",
    "tradition",
    "special",
    "speciale",
    "blik",
    "can",
    "canette",
    "fles",
    "bouteille",
    "bottle",
    "fut",
    "draft",
    "draught",
];

pub const BREWERY_PARENT_GROUPS: &[(&str, &str)] = &[
    ("mort subite", "Alken-Maes"),
    ("cristal", "Alken-Maes"),
    ("maes", "Alken-Maes"),
    ("grimbergen", "Alken-Maes"),
    ("alken maes", "Alken-Maes"),
    ("alken-maes", "Alken-Maes"),
    ("stella", "AB InBev"),
    ("stella artois", "AB InBev"),
    ("jupiler", "AB InBev"),
    ("leffe", "AB InBev"),
    ("hoegaarden", "AB InBev"),
    ("ab inbev", "AB InBev"),
    ("inbev", "AB InBev"),
    ("desperados", "Heineken"),
    ("fischer", "Heineken"),
    ("heineken", "Heineken"),
    ("duvel", "Duvel Moortgat"),
    ("duvel moortgat", "Duvel Moortgat"),
    ("chouffe", "Duvel Moortgat"),
    ("achouffe", "Duvel Moortgat"),
    ("vedett", "Duvel Moortgat"),
    ("maredsous", "Duvel Moortgat"),
    ("liefmans", "Duvel Moortgat"),
    ("d'ebly", "Ebly"),
    ("ebly", "Ebly"),
    ("st bernardus", "St. Bernardus"),
    ("st. bernardus", "St. Bernardus"),
    ("watou", "St. Bernardus"),
    ("bosteels", "Bosteels"),
    ("westmalle", "Westmalle"),
    ("rochefort", "Abbaye Notre-Dame de Saint-Remy"),
    ("chimay", "Bières de Chimay"),
];

/// Splits CamelCase or letter-digit transitions (e.g. "LaGeuze" -> "La Geuze", "Rochefort8" -> "Rochefort 8").
pub fn split_agglutinations(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 8);
    let chars: Vec<char> = s.chars().collect();
    for i in 0..chars.len() {
        out.push(chars[i]);
        if i + 1 < chars.len() {
            let curr = chars[i];
            let next = chars[i + 1];
            if (curr.is_lowercase() && next.is_uppercase())
                || (curr.is_alphabetic() && next.is_ascii_digit())
                || (curr.is_ascii_digit() && next.is_alphabetic())
            {
                out.push(' ');
            }
        }
    }
    out
}

/// Normalizes text deeply by un-agglutinating, stripping accents, and replacing symbols with spaces.
pub fn normalize_text(s: &str) -> String {
    let unagglutinated = split_agglutinations(s);
    let norm = crate::deduplicator::normalize(&unagglutinated);
    norm.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Splits an agglutinated article prefix if present (e.g. "lefort" -> "fort", "lageuze" -> "geuze").
pub fn split_article_prefix(word: &str) -> &str {
    for prefix in &["le", "la", "de", "du", "van", "st"] {
        if word.starts_with(prefix) && word.len() > prefix.len() + 2 {
            return &word[prefix.len()..];
        }
    }
    word
}

/// Extracts canonical tokens for order-invariant token matching.
pub fn extract_canonical_tokens(title: &str) -> Vec<String> {
    let norm = normalize_text(title);
    if norm.is_empty() {
        return Vec::new();
    }

    let synonyms_map: HashMap<&str, &str> = CANONICAL_SYNONYMS.iter().cloned().collect();
    let stop_words: HashSet<&str> = STOP_WORDS.iter().cloned().collect();

    let mut result = Vec::new();

    // Check multi-word synonyms
    let mut working = norm.clone();
    for (phrase, canon) in CANONICAL_SYNONYMS {
        if phrase.contains(' ') && working.contains(phrase) {
            result.push(canon.to_string());
            working = working.replace(phrase, " ");
        }
    }

    for raw in working.split_whitespace() {
        if raw.chars().all(|c| c.is_ascii_digit()) {
            continue;
        }
        let unprefix = split_article_prefix(raw);
        let canon = synonyms_map
            .get(unprefix)
            .or_else(|| synonyms_map.get(raw))
            .copied()
            .unwrap_or(unprefix);

        if !stop_words.contains(canon) && !canon.is_empty() && !result.iter().any(|r| r == canon) {
            result.push(canon.to_string());
        }
    }

    result
}

/// Jaccard token overlap between two sets of canonical tokens.
pub fn token_similarity(a: &[String], b: &[String]) -> f64 {
    if a.is_empty() && b.is_empty() {
        return 1.0;
    }
    if a.is_empty() || b.is_empty() {
        return 0.0;
    }
    let set_a: HashSet<&str> = a.iter().map(|s| s.as_str()).collect();
    let set_b: HashSet<&str> = b.iter().map(|s| s.as_str()).collect();

    let intersection = set_a.intersection(&set_b).count();
    let union = set_a.union(&set_b).count();

    if union == 0 {
        0.0
    } else {
        (intersection as f64) / (union as f64)
    }
}

/// Normalizes a brewery name by stripping corporate suffixes and resolving conglomerates.
pub fn normalize_brewery(raw: &str) -> String {
    let trimmed = raw.trim();
    let lower = trimmed.to_lowercase();
    for (group_key, group_val) in BREWERY_PARENT_GROUPS {
        if lower == *group_key
            || lower.starts_with(&format!("{} ", group_key))
            || lower.ends_with(&format!(" {}", group_key))
        {
            return group_val.to_string();
        }
    }

    let mut s = trimmed.to_string();
    for prefix in &["Brasserie de ", "Brasserie du ", "Brasserie ", "Brouwerij "] {
        if s.to_lowercase().starts_with(&prefix.to_lowercase()) {
            s = s[prefix.len()..].to_string();
            break;
        }
    }
    for suffix in &[
        " Brewery",
        " Brewing Co",
        " Brouwerij",
        " Brasserie",
        " SA",
        " NV",
        " SRL",
        " BVBA",
    ] {
        if s.to_lowercase().ends_with(&suffix.to_lowercase()) {
            s = s[..s.len() - suffix.len()].to_string();
            break;
        }
    }
    s.trim().to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchResult {
    pub is_match: bool,
    pub score: u32,
    pub reasons: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomMatch {
    pub custom_beer: Beer,
    pub official_beer: Beer,
    pub score: u32,
    pub reasons: Vec<String>,
    pub already_in_dex: bool,
    pub official_existing_count: u32,
    pub unique_impact: i32,
    pub is_collision_risk: bool,
    pub canonical_display: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogDuplicate {
    pub a: Beer,
    pub b: Beer,
    pub score: u32,
    pub reason: String,
}

pub const ALL_VARIANT_KEYWORDS: &[&str] = &[
    "triple",
    "double",
    "quadrupel",
    "blond",
    "brune",
    "blanche",
    "ambree",
    "rouge",
    "bleue",
    "noire",
    "doree",
    "gueuze",
    "lambic",
    "kriek",
    "framboise",
    "peche",
    "cerise",
    "cassis",
    "zero",
    "ipa",
    "neipa",
    "dipa",
    "stout",
    "porter",
    "pils",
    "lager",
    "saison",
    "noel",
    "winter",
    "paques",
];

pub fn has_variant_conflict(a: &Beer, b: &Beer) -> bool {
    // 0. Founder protection
    if a.rarity_rank.as_deref() == Some("Fondateur")
        || b.rarity_rank.as_deref() == Some("Fondateur")
        || a.brewery == "Noah & Dorian"
        || b.brewery == "Noah & Dorian"
    {
        return true;
    }

    let tokens_a = extract_canonical_tokens(&format!("{} {}", a.title, a.beer_type));
    let tokens_b = extract_canonical_tokens(&format!("{} {}", b.title, b.beer_type));

    let var_set: HashSet<&str> = ALL_VARIANT_KEYWORDS.iter().copied().collect();
    let vars_a: HashSet<&str> = tokens_a
        .iter()
        .filter_map(|t| var_set.get(t.as_str()).copied())
        .collect();
    let vars_b: HashSet<&str> = tokens_b
        .iter()
        .filter_map(|t| var_set.get(t.as_str()).copied())
        .collect();

    if !vars_a.is_empty() && !vars_b.is_empty() && vars_a != vars_b {
        return true;
    }

    false
}

pub fn has_number_conflict(a: &Beer, b: &Beer) -> bool {
    fn extract_series_numbers(title: &str) -> Vec<u32> {
        let norm = normalize_text(title);
        norm.split_whitespace()
            .filter_map(|w| w.parse::<u32>().ok())
            .filter(|&n| {
                n != 33
                    && n != 75
                    && n != 25
                    && n != 50
                    && n != 330
                    && n != 750
                    && n != 500
                    && !(1900..=2030).contains(&n)
            })
            .collect()
    }

    let nums_a = extract_series_numbers(&a.title);
    let nums_b = extract_series_numbers(&b.title);

    if !nums_a.is_empty() && !nums_b.is_empty() {
        let set_b: HashSet<u32> = nums_b.into_iter().collect();
        if !nums_a.iter().any(|n| set_b.contains(n)) {
            return true;
        }
    }

    false
}

pub fn match_beers(a: &Beer, b: &Beer) -> MatchResult {
    if has_variant_conflict(a, b) {
        return MatchResult {
            is_match: false,
            score: 0,
            reasons: vec!["Variant conflict".to_string()],
        };
    }

    if has_number_conflict(a, b) {
        return MatchResult {
            is_match: false,
            score: 0,
            reasons: vec!["Series number conflict".to_string()],
        };
    }

    // Exact barcode match
    if let (Some(ref bc_a), Some(ref bc_b)) = (&a.barcode, &b.barcode) {
        let clean_a = bc_a.trim();
        let clean_b = bc_b.trim();
        if !clean_a.is_empty() && clean_a == clean_b {
            return MatchResult {
                is_match: true,
                score: 100,
                reasons: vec!["Exact Barcode Match".to_string()],
            };
        }
    }

    // ABV conflict (> 1.5 delta)
    let abv_a = a.parsed_abv();
    let abv_b = b.parsed_abv();
    if abv_a > 0.0 && abv_b > 0.0 {
        if (abv_a <= 0.5 && abv_b >= 1.5) || (abv_b <= 0.5 && abv_a >= 1.5) {
            return MatchResult {
                is_match: false,
                score: 0,
                reasons: vec!["Alcohol vs Non-alcoholic conflict".to_string()],
            };
        }
        if (abv_a - abv_b).abs() > 1.5 {
            return MatchResult {
                is_match: false,
                score: 0,
                reasons: vec!["Large ABV delta (> 1.5°)".to_string()],
            };
        }
    }

    let tokens_a = extract_canonical_tokens(&a.title);
    let tokens_b = extract_canonical_tokens(&b.title);

    let jaccard = token_similarity(&tokens_a, &tokens_b);
    let leven = jaro_winkler(&normalize_text(&a.title), &normalize_text(&b.title));
    let title_score = jaccard.max(leven);

    if title_score < 0.35 {
        return MatchResult {
            is_match: false,
            score: (title_score * 100.0) as u32,
            reasons: vec!["Title similarity too low".to_string()],
        };
    }

    let brew_a = normalize_brewery(&a.brewery).to_lowercase();
    let brew_b = normalize_brewery(&b.brewery).to_lowercase();
    let brew_score = if brew_a.is_empty() || brew_b.is_empty() {
        0.5
    } else if brew_a == brew_b {
        1.0
    } else {
        jaro_winkler(&brew_a, &brew_b)
    };

    let degree_score = if abv_a > 0.0 && abv_b > 0.0 {
        let delta = (abv_a - abv_b).abs();
        if delta < 0.1 {
            1.0
        } else if delta <= 0.5 {
            0.85
        } else if delta <= 1.5 {
            0.5
        } else {
            0.1
        }
    } else {
        0.8
    };

    let vol_a = a.parsed_volume_ml();
    let vol_b = b.parsed_volume_ml();
    let volume_score = if vol_a > 0 && vol_b > 0 {
        if vol_a == vol_b {
            1.0
        } else {
            0.6
        }
    } else {
        0.8
    };

    let mut total =
        (title_score * 0.55) + (brew_score * 0.25) + (degree_score * 0.10) + (volume_score * 0.10);

    let norm_a = normalize_text(&a.title);
    let norm_b = normalize_text(&b.title);
    if norm_a.len() >= 4
        && norm_b.len() >= 4
        && (norm_a.contains(&norm_b) || norm_b.contains(&norm_a))
    {
        total = total.max(0.85);
    }

    let final_score = (total * 100.0).round() as u32;
    let is_match = final_score >= 68;

    MatchResult {
        is_match,
        score: final_score,
        reasons: vec![
            format!("Title: {:.0}%", title_score * 100.0),
            format!("Brewery: {:.0}%", brew_score * 100.0),
            format!("ABV: {:.0}%", degree_score * 100.0),
            format!("Volume: {:.0}%", volume_score * 100.0),
        ],
    }
}

pub fn find_custom_matches_with_safety(
    custom_beers: &[Beer],
    official_beers: &[Beer],
    user_data: &HashMap<String, UserBeerData>,
) -> Vec<CustomMatch> {
    let mut matches = Vec::new();
    let mut used_official_ids = HashSet::new();

    for custom in custom_beers {
        let mut best_match: Option<&Beer> = None;
        let mut best_score = 0u32;
        let mut match_reasons = Vec::new();

        for official in official_beers {
            let res = match_beers(custom, official);
            if res.is_match && res.score > best_score {
                best_score = res.score;
                best_match = Some(official);
                match_reasons = res.reasons;
            }
        }

        if let Some(official) = best_match {
            if best_score >= 68 {
                let off_id = official.resolved_id();
                let official_data = user_data.get(&off_id);
                let already_in_dex = official_data
                    .is_some_and(|d| d.count > 0 || d.score.is_some() || d.favorite == Some(true));
                let official_existing_count = official_data.map(|d| d.count).unwrap_or(0);
                let unique_impact = if already_in_dex { -1 } else { 0 };
                let is_collision_risk = used_official_ids.contains(&off_id);

                matches.push(CustomMatch {
                    custom_beer: custom.clone(),
                    official_beer: official.clone(),
                    score: best_score,
                    reasons: match_reasons,
                    already_in_dex,
                    official_existing_count,
                    unique_impact,
                    is_collision_risk,
                    canonical_display: format!("{} ({})", official.title, official.brewery),
                });

                used_official_ids.insert(off_id);
            }
        }
    }

    matches
}

pub fn scan_catalog_duplicates(official_beers: &[Beer], min_score: u32) -> Vec<CatalogDuplicate> {
    let mut duplicates = Vec::new();
    let len = official_beers.len();

    for i in 0..len {
        for j in (i + 1)..len {
            let a = &official_beers[i];
            let b = &official_beers[j];
            let res = match_beers(a, b);
            if res.is_match && res.score >= min_score {
                duplicates.push(CatalogDuplicate {
                    a: a.clone(),
                    b: b.clone(),
                    score: res.score,
                    reason: res.reasons.join(", "),
                });
            }
        }
    }

    duplicates
}

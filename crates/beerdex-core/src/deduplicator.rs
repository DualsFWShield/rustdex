use crate::models::{Beer, UserBeerData};
use crate::thanos::{
    find_custom_matches_with_safety, scan_catalog_duplicates, CatalogDuplicate, CustomMatch,
};
use std::collections::{HashMap, HashSet};
use strsim::jaro_winkler;

/// Normalizes a string by converting to lowercase, removing accents and non-alphanumeric characters.
pub fn normalize(s: &str) -> String {
    let mut normalized = String::with_capacity(s.len());
    for c in s.to_lowercase().chars() {
        match c {
            'à' | 'á' | 'â' | 'ã' | 'ä' | 'å' => normalized.push('a'),
            'è' | 'é' | 'ê' | 'ë' => normalized.push('e'),
            'ì' | 'í' | 'î' | 'ï' => normalized.push('i'),
            'ò' | 'ó' | 'ô' | 'õ' | 'ö' => normalized.push('o'),
            'ù' | 'ú' | 'û' | 'ü' => normalized.push('u'),
            'ç' => normalized.push('c'),
            'ñ' => normalized.push('n'),
            ' ' | '-' | '_' | '.' | ',' | '\'' | '/' | '(' | ')' => normalized.push(' '),
            c if c.is_alphanumeric() => normalized.push(c),
            _ => {}
        }
    }
    // Collapse consecutive whitespaces
    normalized
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join(" ")
}

/// Computes the Jaro-Winkler similarity between two strings (0.0 to 1.0).
pub fn similarity(s1: &str, s2: &str) -> f64 {
    let norm1 = normalize(s1);
    let norm2 = normalize(s2);

    if norm1.is_empty() && norm2.is_empty() {
        return 1.0;
    }
    if norm1.is_empty() || norm2.is_empty() {
        return 0.0;
    }
    if norm1 == norm2 {
        return 1.0;
    }

    jaro_winkler(&norm1, &norm2)
}

/// Finds the closest matching beer title from candidates with a similarity above threshold.
pub fn find_best_match<'a>(
    query: &str,
    candidates: &'a [&'a str],
    threshold: f64,
) -> Option<(&'a str, f64)> {
    let mut best_candidate = None;
    let mut best_score = 0.0;

    for &cand in candidates {
        let score = similarity(query, cand);
        if score > best_score {
            best_score = score;
            best_candidate = Some(cand);
        }
    }

    if best_score >= threshold {
        best_candidate.map(|c| (c, best_score))
    } else {
        None
    }
}

/// High-level deduplication: finds matches between custom beers and official database,
/// ignoring matches that were previously dismissed by the user.
pub fn find_matches(
    custom_beers: &[Beer],
    official_beers: &[Beer],
    user_data: &HashMap<String, UserBeerData>,
    threshold: f64,
    dismissed_migrations: &[String],
) -> Vec<CustomMatch> {
    let dismissed_set: HashSet<&str> = dismissed_migrations.iter().map(|s| s.as_str()).collect();
    let matches = find_custom_matches_with_safety(custom_beers, official_beers, user_data);

    matches
        .into_iter()
        .filter(|m| {
            let key = format!(
                "{}___{}",
                m.custom_beer.resolved_id(),
                m.official_beer.resolved_id()
            );
            !dismissed_set.contains(key.as_str()) && (m.score as f64 / 100.0) >= threshold
        })
        .collect()
}

/// Scans official beers for internal near-duplicates.
pub fn find_official_duplicates(official_beers: &[Beer], min_score: u32) -> Vec<CatalogDuplicate> {
    scan_catalog_duplicates(official_beers, min_score)
}

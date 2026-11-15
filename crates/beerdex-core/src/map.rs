use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct MapScopeConfig {
    pub scope: &'static str,
    pub title_key: &'static str,
    pub icon: &'static str,
    pub svg_path: &'static str,
    pub country_code: &'static str,
    pub is_continental: bool,
    pub regions_fr: &'static [(&'static str, &'static str)],
    pub regions_en: &'static [(&'static str, &'static str)],
}

pub const MAP_SCOPES: &[MapScopeConfig] = &[
    MapScopeConfig {
        scope: "be",
        title_key: "country_be",
        icon: "🇧🇪",
        svg_path: "images/belgium.svg",
        country_code: "BE",
        is_continental: false,
        regions_fr: &[
            ("ANT", "Antwerpen"),
            ("LIM", "Limburg"),
            ("VBR", "Vlaams-Brabant"),
            ("BRU", "Bruxelles"),
            ("WBR", "Brabant Wallon"),
            ("HAI", "Hainaut"),
            ("NAM", "Namur"),
            ("LIE", "Liège"),
            ("LUX", "Luxembourg"),
            ("WVL", "West-Vlaanderen"),
            ("OVL", "Oost-Vlaanderen"),
        ],
        regions_en: &[
            ("ANT", "Antwerp"),
            ("LIM", "Limburg"),
            ("VBR", "Flemish Brabant"),
            ("BRU", "Brussels"),
            ("WBR", "Walloon Brabant"),
            ("HAI", "Hainaut"),
            ("NAM", "Namur"),
            ("LIE", "Liège"),
            ("LUX", "Luxembourg"),
            ("WVL", "West Flanders"),
            ("OVL", "East Flanders"),
        ],
    },
    MapScopeConfig {
        scope: "fr",
        title_key: "country_fr",
        icon: "🇫🇷",
        svg_path: "images/fr.svg",
        country_code: "FR",
        is_continental: false,
        regions_fr: &[
            ("FRHDF", "Hauts-de-France"),
            ("FRGES", "Grand Est"),
            ("FRPAC", "Provence-Alpes-Côte d'Azur"),
            ("FRARA", "Auvergne-Rhône-Alpes"),
            ("FRBFC", "Bourgogne-Franche-Comté"),
            ("FROCC", "Occitanie"),
            ("FRPDL", "Pays de la Loire"),
            ("FRBRE", "Bretagne"),
            ("FRNOR", "Normandie"),
            ("FR20R", "Corse"),
            ("FRNAQ", "Nouvelle-Aquitaine"),
            ("FRCVL", "Centre-Val de Loire"),
            ("FRIDF", "Île-de-France"),
        ],
        regions_en: &[
            ("FRHDF", "Hauts-de-France"),
            ("FRGES", "Grand Est"),
            ("FRPAC", "Provence-Alpes-Côte d'Azur"),
            ("FRARA", "Auvergne-Rhône-Alpes"),
            ("FRBFC", "Bourgogne-Franche-Comté"),
            ("FROCC", "Occitanie"),
            ("FRPDL", "Pays de la Loire"),
            ("FRBRE", "Brittany"),
            ("FRNOR", "Normandy"),
            ("FR20R", "Corsica"),
            ("FRNAQ", "Nouvelle-Aquitaine"),
            ("FRCVL", "Centre-Val de Loire"),
            ("FRIDF", "Île-de-France"),
        ],
    },
    MapScopeConfig {
        scope: "de",
        title_key: "country_de",
        icon: "🇩🇪",
        svg_path: "images/de.svg",
        country_code: "DE",
        is_continental: false,
        regions_fr: &[
            ("DESN", "Sachsen"),
            ("DEBY", "Bayern"),
            ("DERP", "Rheinland-Pfalz"),
            ("DESL", "Saarland"),
            ("DESH", "Schleswig-Holstein"),
            ("DENI", "Niedersachsen"),
            ("DENW", "Nordrhein-Westfalen"),
            ("DEBW", "Baden-Württemberg"),
            ("DEBB", "Brandenburg"),
            ("DEMV", "Mecklenburg-Vorpommern"),
            ("DEHB", "Bremen"),
            ("DEHH", "Hamburg"),
            ("DEHE", "Hessen"),
            ("DETH", "Thüringen"),
            ("DEST", "Sachsen-Anhalt"),
            ("DEBE", "Berlin"),
        ],
        regions_en: &[
            ("DESN", "Saxony"),
            ("DEBY", "Bavaria"),
            ("DERP", "Rhineland-Palatinate"),
            ("DESL", "Saarland"),
            ("DESH", "Schleswig-Holstein"),
            ("DENI", "Lower Saxony"),
            ("DENW", "North Rhine-Westphalia"),
            ("DEBW", "Baden-Württemberg"),
            ("DEBB", "Brandenburg"),
            ("DEMV", "Mecklenburg-Western Pomerania"),
            ("DEHB", "Bremen"),
            ("DEHH", "Hamburg"),
            ("DEHE", "Hesse"),
            ("DETH", "Thuringia"),
            ("DEST", "Saxony-Anhalt"),
            ("DEBE", "Berlin"),
        ],
    },
    MapScopeConfig {
        scope: "nl",
        title_key: "country_nl",
        icon: "🇳🇱",
        svg_path: "images/nl.svg",
        country_code: "NL",
        is_continental: false,
        regions_fr: &[
            ("NLGR", "Groningen"),
            ("NLDR", "Drenthe"),
            ("NLOV", "Overijssel"),
            ("NLGE", "Gelderland"),
            ("NLLI", "Limburg"),
            ("NLZE", "Zeeland"),
            ("NLNB", "Noord-Brabant"),
            ("NLZH", "Zuid-Holland"),
            ("NLNH", "Noord-Holland"),
            ("NLFR", "Friesland"),
            ("NLFL", "Flevoland"),
            ("NLUT", "Utrecht"),
        ],
        regions_en: &[
            ("NLGR", "Groningen"),
            ("NLDR", "Drenthe"),
            ("NLOV", "Overijssel"),
            ("NLGE", "Gelderland"),
            ("NLLI", "Limburg"),
            ("NLZE", "Zeeland"),
            ("NLNB", "North Brabant"),
            ("NLZH", "South Holland"),
            ("NLNH", "North Holland"),
            ("NLFR", "Friesland"),
            ("NLFL", "Flevoland"),
            ("NLUT", "Utrecht"),
        ],
    },
    MapScopeConfig {
        scope: "us",
        title_key: "country_us",
        icon: "🇺🇸",
        svg_path: "images/us.svg",
        country_code: "US",
        is_continental: false,
        regions_fr: &[
            ("CA", "Californie"),
            ("NY", "New York"),
            ("TX", "Texas"),
            ("CO", "Colorado"),
            ("WA", "État de Washington"),
            ("OR", "Oregon"),
            ("IL", "Illinois"),
            ("PA", "Pennsylvanie"),
            ("MA", "Massachusetts"),
            ("FL", "Floride"),
        ],
        regions_en: &[
            ("CA", "California"),
            ("NY", "New York"),
            ("TX", "Texas"),
            ("CO", "Colorado"),
            ("WA", "Washington"),
            ("OR", "Oregon"),
            ("IL", "Illinois"),
            ("PA", "Pennsylvania"),
            ("MA", "Massachusetts"),
            ("FL", "Florida"),
        ],
    },
    MapScopeConfig {
        scope: "eu",
        title_key: "map_scope_eu",
        icon: "🇪🇺",
        svg_path: "images/europe.svg",
        country_code: "EU",
        is_continental: true,
        regions_fr: &[
            ("BE", "Belgique"),
            ("FR", "France"),
            ("DE", "Allemagne"),
            ("NL", "Pays-Bas"),
            ("IT", "Italie"),
            ("ES", "Espagne"),
            ("IE", "Irlande"),
            ("GB", "Grande-Bretagne"),
            ("DK", "Danemark"),
        ],
        regions_en: &[
            ("BE", "Belgium"),
            ("FR", "France"),
            ("DE", "Germany"),
            ("NL", "Netherlands"),
            ("IT", "Italy"),
            ("ES", "Spain"),
            ("IE", "Ireland"),
            ("GB", "United Kingdom"),
            ("DK", "Denmark"),
        ],
    },
    MapScopeConfig {
        scope: "wo",
        title_key: "map_scope_wo",
        icon: "🌍",
        svg_path: "images/world.svg",
        country_code: "WO",
        is_continental: true,
        regions_fr: &[
            ("BE", "Belgique"),
            ("FR", "France"),
            ("DE", "Allemagne"),
            ("NL", "Pays-Bas"),
            ("US", "États-Unis"),
            ("CO", "Colombie"),
            ("KR", "Corée du Sud"),
            ("JP", "Japon"),
            ("CN", "Chine"),
            ("AU", "Australie"),
            ("ES", "Espagne"),
            ("IE", "Irlande"),
            ("GB", "Grande-Bretagne"),
            ("DK", "Danemark"),
            ("IT", "Italie"),
        ],
        regions_en: &[
            ("BE", "Belgium"),
            ("FR", "France"),
            ("DE", "Germany"),
            ("NL", "Netherlands"),
            ("US", "United States"),
            ("CO", "Colombia"),
            ("KR", "South Korea"),
            ("JP", "Japan"),
            ("CN", "China"),
            ("AU", "Australia"),
            ("ES", "Spain"),
            ("IE", "Ireland"),
            ("GB", "United Kingdom"),
            ("DK", "Denmark"),
            ("IT", "Italy"),
        ],
    },
];

pub fn guess_scope_from_timezone(tz: &str) -> &'static str {
    if tz.contains("Brussels") {
        "be"
    } else if tz.contains("Paris") {
        "fr"
    } else if tz.contains("Berlin") {
        "de"
    } else if tz.contains("Amsterdam") {
        "nl"
    } else if tz.contains("America") && !tz.contains("Bogota") {
        "us"
    } else if tz.contains("Bogota") {
        "co"
    } else if tz.contains("Seoul") {
        "kr"
    } else if tz.contains("Tokyo") {
        "jp"
    } else if tz.contains("Shanghai") || tz.contains("Beijing") {
        "cn"
    } else if tz.starts_with("Europe") {
        "eu"
    } else {
        "wo"
    }
}

pub fn get_region_name(scope: &str, code: &str, is_en: bool) -> String {
    if let Some(cfg) = MAP_SCOPES.iter().find(|m| m.scope == scope) {
        let list = if is_en {
            cfg.regions_en
        } else {
            cfg.regions_fr
        };
        for (k, v) in list {
            if *k == code {
                return v.to_string();
            }
        }
    }
    code.to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvinceChoroplethStats {
    pub code: String,
    pub name: String,
    pub beers_drunk: u32,
    pub total_available: u32,
    pub completion_percentage: f64,
    pub heat_level: u8, // 0 to 4
}

pub fn calculate_choropleth(
    scope: &str,
    province_counts: &HashMap<String, u32>,
    province_totals: &HashMap<String, u32>,
    is_en: bool,
) -> Vec<ProvinceChoroplethStats> {
    let mut stats = Vec::new();

    if let Some(cfg) = MAP_SCOPES.iter().find(|m| m.scope == scope) {
        let list = if is_en {
            cfg.regions_en
        } else {
            cfg.regions_fr
        };
        for (code, name) in list {
            let drunk = province_counts.get(*code).copied().unwrap_or(0);
            let total = province_totals.get(*code).copied().unwrap_or(drunk.max(1));
            let pct = if total > 0 {
                (drunk as f64 / total as f64) * 100.0
            } else {
                0.0
            };

            let heat_level = if drunk == 0 {
                0
            } else if pct < 25.0 {
                1
            } else if pct < 50.0 {
                2
            } else if pct < 75.0 {
                3
            } else {
                4
            };

            stats.push(ProvinceChoroplethStats {
                code: code.to_string(),
                name: name.to_string(),
                beers_drunk: drunk,
                total_available: total,
                completion_percentage: pct,
                heat_level,
            });
        }
    }

    stats
}

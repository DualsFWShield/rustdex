use crate::models::{Beer, RarityResult};

pub const RARITY_RANKS: [&str; 8] = [
    "base",
    "commun",
    "rare",
    "super_rare",
    "epique",
    "mythique",
    "legendaire",
    "ultra_legendaire",
];

/// Computes the intrinsic rarity of a beer based on brewery prestige, style, ABV, and special keywords.
pub fn calculate_rarity(beer: &Beer) -> RarityResult {
    let mut score = 0;
    let mut reasons = Vec::new();

    let title = beer.title.to_lowercase();
    let brewery = beer.brewery.to_lowercase();
    let b_type = beer.beer_type.to_lowercase();
    let abv = beer.parsed_abv();

    // 1. Brewery Prestige
    if brewery.contains("heineken")
        || brewery.contains("leffe")
        || brewery.contains("kronenbourg")
        || brewery.contains("1664")
        || brewery.contains("jupiler")
        || brewery.contains("stella")
        || brewery.contains("maes")
        || brewery.contains("bavaria")
        || brewery.contains("carlsberg")
        || brewery.contains("budweiser")
        || brewery.contains("desperados")
        || brewery.contains("grimbergen")
        || brewery.contains("affligem")
        || brewery.contains("hoegaarden")
    {
        score -= 5;
        reasons.push("Brasserie Industrielle (-5)".to_string());
    } else if brewery.contains("westvleteren") {
        score += 8;
        reasons.push("Trappiste Exclusive (+8)".to_string());
    } else if brewery.contains("cantillon")
        || brewery.contains("3 fonteinen")
        || brewery.contains("drie fonteinen")
        || brewery.contains("popihn")
        || brewery.contains("piggy")
        || brewery.contains("cloudwater")
        || brewery.contains("verdant")
        || brewery.contains("tree house")
        || brewery.contains("hill farmstead")
        || brewery.contains("bokke")
    {
        score += 6;
        reasons.push("Brasserie Hype/Prestige (+6)".to_string());
    } else if brewery.contains("chimay")
        || brewery.contains("orval")
        || brewery.contains("rochefort")
        || brewery.contains("westmalle")
        || brewery.contains("achel")
        || brewery.contains("la trappe")
        || brewery.contains("mont des cats")
    {
        score += 3;
        reasons.push("Trappiste Classique (+3)".to_string());
    } else {
        score += 2;
    }

    // 2. Style
    if b_type.contains("barrel aged")
        || b_type.contains("vieillie en f")
        || b_type.contains("barrique")
        || b_type.contains("ba ")
    {
        score += 6;
        reasons.push("Vieillissement Barrique (+6)".to_string());
    } else if b_type.contains("eisbock") {
        score += 5;
        reasons.push("Eisbock (+5)".to_string());
    } else if b_type.contains("gueuze")
        || b_type.contains("lambic")
        || b_type.contains("kriek (traditionnelle)")
    {
        score += 5;
        reasons.push("Lambic/Gueuze (+5)".to_string());
    } else if b_type.contains("sour")
        || b_type.contains("gose")
        || b_type.contains("berliner")
        || b_type.contains("wild")
        || b_type.contains("farmhouse")
    {
        score += 3;
        reasons.push("Style Fermentation Mixte/Sauvage (+3)".to_string());
    } else if b_type.contains("ipa")
        || b_type.contains("stout")
        || b_type.contains("porter")
        || b_type.contains("saison")
        || b_type.contains("tripel")
        || b_type.contains("double")
        || b_type.contains("quadrupel")
        || b_type.contains("abbaye")
        || b_type.contains("trappiste")
    {
        score += 2;
        reasons.push("Style Craft Standard (+2)".to_string());
    }

    // 3. ABV
    if abv > 14.0 {
        score += 4;
        reasons.push("Alcool Extrême > 14% (+4)".to_string());
    } else if abv > 10.0 {
        score += 2;
        reasons.push("Alcool Fort > 10% (+2)".to_string());
    } else if abv > 6.5 {
        score += 1;
        reasons.push("Alcool Soutenu > 6.5% (+1)".to_string());
    }

    // 4. Keywords
    if title.contains("limited") || title.contains("limitée") {
        score += 2;
        reasons.push("Édition Limitée (+2)".to_string());
    }
    if title.contains("vintage") || title.contains("millésime") || title.contains("millésimée") {
        score += 3;
        reasons.push("Millésimée (+3)".to_string());
    }
    if title.contains("anniversary") || title.contains("anniversaire") {
        score += 2;
        reasons.push("Anniversaire (+2)".to_string());
    }
    if title.contains("blend") || title.contains("assemblage") {
        score += 1;
        reasons.push("Assemblage (+1)".to_string());
    }
    if title.contains("grand cru") {
        score += 2;
        reasons.push("Grand Cru (+2)".to_string());
    }

    // 5. Tier classification
    let rarity = if score < 0 {
        "base"
    } else if score <= 3 {
        "commun"
    } else if score <= 6 {
        "rare"
    } else if score <= 9 {
        "super_rare"
    } else if score <= 12 {
        "epique"
    } else if score <= 15 {
        "mythique"
    } else if score <= 19 {
        "legendaire"
    } else {
        "ultra_legendaire"
    };

    RarityResult {
        score,
        rarity: rarity.to_string(),
        reasons,
    }
}

pub fn geo_group(code: &str) -> Option<&'static str> {
    match code.to_uppercase().as_str() {
        "BE" | "FR" | "NL" | "DE" | "LU" | "GB" | "IE" | "DK" => Some("eu_west"),
        "IT" | "ES" | "PT" => Some("eu_south"),
        "US" | "CO" | "BR" | "MX" | "CA" => Some("americas"),
        "JP" | "KR" | "CN" | "TW" => Some("east_asia"),
        "AU" | "NZ" => Some("oceania"),
        _ => None,
    }
}

/// Computes the dynamic import bonus based on geographical proximity.
pub fn get_import_bonus(beer_country: &str, user_country: &str) -> (u32, Option<&'static str>) {
    let bc = beer_country.to_uppercase();
    let uc = user_country.to_uppercase();

    if bc.is_empty() || uc.is_empty() || bc == uc {
        return (0, None);
    }

    let g_beer = geo_group(&bc);
    let g_user = geo_group(&uc);

    match (g_beer, g_user) {
        (None, _) | (_, None) => (1, Some("Import Inconnu (+1 Rareté)")),
        (Some(b), Some(u)) if b == u => (1, Some("Import Voisin (+1 Rareté)")),
        (Some(b), Some(u))
            if (b == "eu_west" && u == "eu_south") || (b == "eu_south" && u == "eu_west") =>
        {
            (1, Some("Import Européen (+1 Rareté)"))
        }
        (Some(b), Some(u))
            if (b.starts_with("eu") && !u.starts_with("eu"))
                || (!b.starts_with("eu") && u.starts_with("eu"))
                || (b == "east_asia" && u == "americas")
                || (b == "americas" && u == "east_asia")
                || (b == "oceania" || u == "oceania") =>
        {
            (3, Some("Grand Import Intercontinental (+3 Raretés)"))
        }
        _ => (2, Some("Import Lointain (+2 Raretés)")),
    }
}

/// Applies dynamic import promotion to a base rarity rank.
pub fn promote_rarity_with_import(base_rarity: &str, bonus: u32) -> &'static str {
    let current_idx = RARITY_RANKS
        .iter()
        .position(|&r| r.eq_ignore_ascii_case(base_rarity))
        .unwrap_or(1); // default to 'commun'

    let new_idx = (current_idx + bonus as usize).min(RARITY_RANKS.len() - 1);
    RARITY_RANKS[new_idx]
}

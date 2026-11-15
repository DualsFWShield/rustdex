//! RosaeNLG-inspired Natural Language Processing (NLP) Narrative Engine for BrewBrother.
//! Ported directly from `js/vendor/brewbrother_nlp.js`.

use crate::models::Beer;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SentimentTier {
    Excellent,
    Positive,
    Mixed,
    Negative,
}

impl SentimentTier {
    pub fn from_percentage(pct: u32) -> Self {
        if pct >= 85 {
            SentimentTier::Excellent
        } else if pct >= 65 {
            SentimentTier::Positive
        } else if pct >= 40 {
            SentimentTier::Mixed
        } else {
            SentimentTier::Negative
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PrestigeLevel {
    Industrial,
    Prestige,
    Craft,
    Standard,
}

impl PrestigeLevel {
    pub fn from_beer(beer: &Beer) -> Self {
        let combined = format!("{} {}", beer.brewery, beer.title).to_lowercase();
        let rarity = beer
            .rarity_rank
            .as_deref()
            .unwrap_or("commun")
            .to_lowercase();

        let is_industrial = [
            "heineken",
            "leffe",
            "kronenbourg",
            "1664",
            "jupiler",
            "stella",
            "maes",
            "bavaria",
            "carlsberg",
            "budweiser",
            "desperados",
            "grimbergen",
            "affligem",
            "hoegaarden",
            "skoll",
            "pelforth",
            "gordon",
            "amstel",
            "fischer",
            "corona",
            "modelo",
            "asahi",
            "sapporo",
            "kirin",
            "tsingtao",
            "peroni",
            "moretti",
            "warsteiner",
            "bitburger",
            "krombacher",
            "erdinger",
            "paulaner",
        ]
        .iter()
        .any(|&ind| combined.contains(ind));

        if is_industrial {
            return PrestigeLevel::Industrial;
        }

        let is_prestige = [
            "cantillon",
            "3 fonteinen",
            "drie fonteinen",
            "popihn",
            "piggy",
            "cloudwater",
            "verdant",
            "tree house",
            "hill farmstead",
            "bokke",
            "westvleteren",
            "rochefort",
            "orval",
            "chimay",
            "westmalle",
            "achel",
            "la trappe",
            "st. bernardus",
            "struise",
            "dupont",
            "paix dieu",
            "mikkeller",
            "omnipollo",
            "evil twin",
            "de la senne",
            "de molen",
            "lervig",
            "buxton",
        ]
        .iter()
        .any(|&p| combined.contains(p))
            || ["epique", "mythique", "legendaire", "ultra_legendaire"].contains(&rarity.as_str());

        if is_prestige {
            return PrestigeLevel::Prestige;
        }

        if ["rare", "super_rare"].contains(&rarity.as_str()) {
            return PrestigeLevel::Craft;
        }

        PrestigeLevel::Standard
    }
}

pub struct NlpContext {
    pub title: String,
    pub brewery: String,
    pub beer_type: String,
    pub abv: String,
    pub total_drinks: u32,
    pub match_pct: u32,
    pub loved_ref: String,
    pub loved_ref_drinks: String,
    pub type_drinks: u32,
    pub type_avg: String,
    pub brewery_drinks: u32,
    pub flavors: String,
    pub community_rating: String,
}

pub struct NlpEngine;

impl NlpEngine {
    /// French linguistic surface realization: contractions and smart elisions.
    pub fn apply_french_elisions(text: &str) -> String {
        // 1. Contractions de prépositions
        let mut res = text.to_string();
        res = res.replace("de le ", "du ");
        res = res.replace("De le ", "Du ");
        res = res.replace("de les ", "des ");
        res = res.replace("De les ", "Des ");
        res = res.replace("à le ", "au ");
        res = res.replace("À le ", "Au ");
        res = res.replace("à les ", "aux ");
        res = res.replace("À les ", "Aux ");
        res = res.replace("ce est ", "c'est ");
        res = res.replace("Ce est ", "C'est ");
        res = res.replace("si il ", "s'il ");
        res = res.replace("si ils ", "s'ils ");

        // 2. Élisions devant voyelles françaises (a, e, i, o, u, y, é, è, ê, ë, à, â, ä, î, ï, ô, ö, û, ü)
        let vowels = [
            'a', 'e', 'i', 'o', 'u', 'y', 'é', 'è', 'ê', 'ë', 'à', 'â', 'ä', 'î', 'ï', 'ô', 'ö',
            'û', 'ü',
        ];

        let mut words: Vec<String> = res.split_whitespace().map(|w| w.to_string()).collect();
        let mut i = 0;
        while i + 1 < words.len() {
            let curr_lower = words[i].to_lowercase();
            let next_first = words[i + 1]
                .chars()
                .next()
                .unwrap_or('\0')
                .to_ascii_lowercase();

            if vowels.contains(&next_first) {
                if curr_lower == "de" || curr_lower == "du" {
                    let prefix = if words[i].chars().next().unwrap_or('d').is_uppercase() {
                        "D'"
                    } else {
                        "d'"
                    };
                    let merged = format!("{}{}", prefix, words[i + 1]);
                    words[i] = merged;
                    words.remove(i + 1);
                    continue;
                } else if curr_lower == "le" || curr_lower == "la" {
                    let prefix = if words[i].chars().next().unwrap_or('l').is_uppercase() {
                        "L'"
                    } else {
                        "l'"
                    };
                    let merged = format!("{}{}", prefix, words[i + 1]);
                    words[i] = merged;
                    words.remove(i + 1);
                    continue;
                } else if curr_lower == "que" {
                    let prefix = if words[i].chars().next().unwrap_or('q').is_uppercase() {
                        "Qu'"
                    } else {
                        "qu'"
                    };
                    let merged = format!("{}{}", prefix, words[i + 1]);
                    words[i] = merged;
                    words.remove(i + 1);
                    continue;
                } else if curr_lower == "ce" {
                    let prefix = if words[i].chars().next().unwrap_or('c').is_uppercase() {
                        "Cet"
                    } else {
                        "cet"
                    };
                    words[i] = prefix.to_string();
                }
            }
            i += 1;
        }

        words.join(" ")
    }

    /// French typography formatting: non-breaking spaces before punctuation (: ; ! ?).
    pub fn apply_french_typography(text: &str) -> String {
        text.replace(" :", "\u{00A0}:")
            .replace(" ;", "\u{00A0};")
            .replace(" !", "\u{00A0}!")
            .replace(" ?", "\u{00A0}?")
    }

    /// Replaces `{placeholder}` tokens in text with values from `NlpContext`.
    pub fn interpolate(template: &str, ctx: &NlpContext) -> String {
        template
            .replace("{title}", &ctx.title)
            .replace("{brewery}", &ctx.brewery)
            .replace("{type}", &ctx.beer_type)
            .replace("{un_type}", &format!("une {}", ctx.beer_type))
            .replace("{de_type}", &format!("de {}", ctx.beer_type))
            .replace("{abv}", &ctx.abv)
            .replace("{abv_beer}", &ctx.abv)
            .replace("{total_drinks}", &ctx.total_drinks.to_string())
            .replace("{match_pct}", &ctx.match_pct.to_string())
            .replace("{loved_ref}", &ctx.loved_ref)
            .replace("{loved_ref_drinks}", &ctx.loved_ref_drinks)
            .replace("{type_drinks}", &ctx.type_drinks.to_string())
            .replace("{type_avg}", &ctx.type_avg)
            .replace("{brewery_drinks}", &ctx.brewery_drinks.to_string())
            .replace("{flavors}", &ctx.flavors)
            .replace("{community_rating}", &ctx.community_rating)
    }

    /// Synthesizes a natural review paragraph for a recommended beer.
    pub fn generate_review(beer: &Beer, match_pct: u32, total_drinks: u32, lang: &str) -> String {
        let tier = SentimentTier::from_percentage(match_pct);
        let prestige = PrestigeLevel::from_beer(beer);

        let abv_str = beer.alcohol.as_deref().unwrap_or("degre moyen");
        let ctx = NlpContext {
            title: beer.title.clone(),
            brewery: beer.brewery.clone(),
            beer_type: beer.beer_type.clone(),
            abv: abv_str.to_string(),
            total_drinks,
            match_pct,
            loved_ref: "vos références favorites".to_string(),
            loved_ref_drinks: "plusieurs fois".to_string(),
            type_drinks: 3,
            type_avg: "16,5".to_string(),
            brewery_drinks: 2,
            flavors: "maltées et houblonnées".to_string(),
            community_rating: "4.2".to_string(),
        };

        let raw = if lang == "en" {
            match tier {
                SentimentTier::Excellent => format!(
                    "After analyzing your {} tastings, {} from {} stands out as an exceptional match ({}%). With its {} ABV, it hits your exact sweet spot.",
                    ctx.total_drinks, ctx.title, ctx.brewery, ctx.match_pct, ctx.abv
                ),
                SentimentTier::Positive => format!(
                    "Based on your profile, {} from {} is a remarkable choice ({}%). It fits smoothly into your preferred style of {}.",
                    ctx.title, ctx.brewery, ctx.match_pct, ctx.beer_type
                ),
                SentimentTier::Mixed => format!(
                    "{} from {} ({}) lies just outside your central preferences ({}%). A calculated bet for curious palates.",
                    ctx.title, ctx.brewery, ctx.abv, ctx.match_pct
                ),
                SentimentTier::Negative => format!(
                    "Cross-referencing {} with your {} past tastings shows this profile does not align well with your taste ({}%).",
                    ctx.title, ctx.total_drinks, ctx.match_pct
                ),
            }
        } else {
            let prestige_desc = match prestige {
                PrestigeLevel::Industrial => "une recette de grande consommation accessible",
                PrestigeLevel::Prestige => "un pedigree brassicole remarquable",
                PrestigeLevel::Craft => "une vraie signature artisanale indépendante",
                PrestigeLevel::Standard => "une régularité appréciable",
            };

            let text = match tier {
                SentimentTier::Excellent => format!(
                    "Après avoir passé au crible vos {} dégustations, {} de chez {} s'impose comme un match exceptionnel ({}%). Avec ses {} et {}, cette {} coche chacune des cases de votre palais.",
                    ctx.total_drinks, ctx.title, ctx.brewery, ctx.match_pct, ctx.abv, prestige_desc, ctx.beer_type
                ),
                SentimentTier::Positive => format!(
                    "Au vu de vos {} dégustations consignées, {} de chez {} s'impose comme un choix très solide ({}%). Son profil en {} correspond à vos attentes.",
                    ctx.total_drinks, ctx.title, ctx.brewery, ctx.match_pct, ctx.beer_type
                ),
                SentimentTier::Mixed => format!(
                    "{} ({}) est une bière à {} qui s'écarte quelque peu de vos favoris habituels ({}%). Un pari calculé si vous souhaitez explorer de nouveaux horizons.",
                    ctx.title, ctx.brewery, ctx.abv, ctx.match_pct
                ),
                SentimentTier::Negative => format!(
                    "Après confrontation de {} à vos {} dégustations, cette bière risque fort de décevoir vos attentes ({}%).",
                    ctx.title, ctx.total_drinks, ctx.match_pct
                ),
            };

            let elided = Self::apply_french_elisions(&text);
            Self::apply_french_typography(&elided)
        };

        raw
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_french_elision() {
        let raw = "ce est de le malt de orge et de le houblon";
        let res = NlpEngine::apply_french_elisions(raw);
        assert_eq!(res, "c'est du malt d'orge et du houblon");
    }

    #[test]
    fn test_french_typography() {
        let raw = "Voici : un test ! Vraiment ? Oui ; voilà.";
        let res = NlpEngine::apply_french_typography(raw);
        assert!(res.contains("\u{00A0}:"));
        assert!(res.contains("\u{00A0}!"));
        assert!(res.contains("\u{00A0}?"));
        assert!(res.contains("\u{00A0};"));
    }

    #[test]
    fn test_narrative_generation() {
        let beer = Beer {
            title: "Westvleteren 12".to_string(),
            brewery: "Abbaye de Saint-Sixte".to_string(),
            beer_type: "Quadrupel".to_string(),
            volume: Some("33cl".to_string()),
            alcohol: Some("10.2%".to_string()),
            id: None,
            image: None,
            production_volume: None,
            distribution: None,
            barrel_aged: None,
            community_rating: None,
            ingredients: None,
            rarity_rank: Some("mythique".to_string()),
            barcode: None,
            country: Some("BE".to_string()),
            country_code: None,
            search_region: None,
            search_country: None,
        };

        let en_text = NlpEngine::generate_review(&beer, 95, 42, "en");
        assert!(en_text.contains("Westvleteren 12"));
        assert!(en_text.contains("95%"));

        let fr_text = NlpEngine::generate_review(&beer, 95, 42, "fr");
        assert!(fr_text.contains("Westvleteren 12"));
        assert!(fr_text.contains("95%"));
    }
}

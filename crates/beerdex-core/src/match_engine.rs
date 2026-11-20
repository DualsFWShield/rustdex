use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

pub const ANIMAL_NAMES: &[&str] = &[
    "Renard",
    "Loup",
    "Ours",
    "Castor",
    "Cerf",
    "Sanglier",
    "Blaireau",
    "Hérisson",
    "Écureuil",
    "Loutre",
    "Lynx",
    "Chamois",
    "Bouquetin",
    "Chevreuil",
    "Lièvre",
    "Marmotte",
    "Furet",
    "Martre",
    "Hermine",
    "Raton-laveur",
    "Glouton",
    "Tigre",
    "Lion",
    "Guépard",
    "Léopard",
    "Panthère",
    "Jaguar",
    "Chouette",
    "Hibou",
    "Grand-Duc",
    "Faucon",
    "Aigle",
    "Corbeau",
    "Pangolin",
    "Koala",
    "Panda",
    "Panda roux",
    "Suricate",
    "Poulpe",
    "Calmar",
    "Morse",
    "Béluga",
    "Phoque",
    "Dauphin",
    "Phénix",
    "Dragon",
    "Griffon",
    "Pégase",
    "Yéti",
    "Kraken",
];

pub const ADJECTIVES: &[&str] = &[
    "Houblonné",
    "Malté",
    "Pétillant",
    "Ambré",
    "Doré",
    "Cuivré",
    "Givré",
    "Torréfié",
    "Boisé",
    "Moelleux",
    "Fruité",
    "Épicé",
    "Rafraîchissant",
    "Brasseur",
    "Sommelier",
    "Gourmet",
    "Assoiffé",
    "Joyeux",
    "Festif",
    "Convivial",
    "Hilare",
    "Espiègle",
    "Chaleureux",
    "Généreux",
    "Bon-vivant",
    "Rusé",
    "Discret",
    "Furtif",
    "Rapide",
    "Agile",
    "Énigmatique",
    "Nocturne",
    "Majestueux",
    "Brillant",
    "Féroce",
    "Intrépide",
    "Vaillant",
    "Épique",
    "Légendaire",
    "Flamboyant",
    "Invincible",
];

pub const TITLES: &[&str] = &[
    "Capitaine",
    "Maître",
    "Baron",
    "Docteur",
    "Professeur",
    "Sir",
    "Lord",
    "Grand",
    "Chef",
    "Agent",
    "Comte",
    "Général",
];

pub const FEMININE_ANIMALS: &[&str] = &[
    "Chouette",
    "Loutre",
    "Marmotte",
    "Martre",
    "Hermine",
    "Panthère",
    // "Pie", "Raie", "Gargouille" retirés : absents de ANIMAL_NAMES, donc jamais matchés (code mort)
];

pub const FEMININE_TITLES: &[(&str, &str)] = &[
    ("Baron", "Baronne"),
    ("Comte", "Comtesse"),
    ("Sir", "Lady"),
    ("Lord", "Lady"),
    ("Grand", "Grande"),
];

pub const FEMININE_ADJECTIVES: &[(&str, &str)] = &[
    ("Houblonné", "Houblonnée"),
    ("Malté", "Maltée"),
    ("Pétillant", "Pétillante"),
    ("Ambré", "Ambrée"),
    ("Doré", "Dorée"),
    ("Cuivré", "Cuivrée"),
    ("Givré", "Givrée"),
    ("Torréfié", "Torréfiée"),
    ("Boisé", "Boisée"),
    ("Fruité", "Fruitée"),
    ("Épicé", "Épicée"),
    ("Rafraîchissant", "Rafraîchissante"),
    ("Brasseur", "Brasseuse"),
    ("Sommelier", "Sommelière"),
    ("Gourmet", "Gourmande"),
    ("Convivial", "Conviviale"),
    ("Assoiffé", "Assoiffée"),
    ("Joyeux", "Joyeuse"),
    ("Festif", "Festive"),
    ("Chaleureux", "Chaleureuse"),
    ("Généreux", "Généreuse"),
    ("Bon-vivant", "Bonne-vivante"),
    ("Rusé", "Rusée"),
    ("Discret", "Discrète"),
    ("Furtif", "Furtive"),
    ("Majestueux", "Majestueuse"),
    ("Brillant", "Brillante"),
    ("Vaillant", "Vaillante"),
    ("Flamboyant", "Flamboyante"),
    // Adjectifs invariables (pas de forme féminine distincte) : Rapide, Agile, Énigmatique,
    // Nocturne, Féroce, Intrépide, Épique, Légendaire, Invincible, Hilare, Espiègle — omis volontairement.
];

pub fn get_random_pseudo(seed: u64) -> String {
    let animal_idx = (seed as usize) % ANIMAL_NAMES.len();
    let animal = ANIMAL_NAMES[animal_idx];
    let is_fem = FEMININE_ANIMALS.contains(&animal);

    // 20% chance of Title + Animal
    if seed.is_multiple_of(5) {
        let title_idx = ((seed >> 4) as usize) % TITLES.len();
        let mut title = TITLES[title_idx];
        if is_fem {
            if let Some((_, fem_title)) = FEMININE_TITLES.iter().find(|(t, _)| *t == title) {
                title = fem_title;
            }
        }
        format!("{} {}", title, animal)
    } else {
        let adj_idx = ((seed >> 3) as usize) % ADJECTIVES.len();
        let mut adj = ADJECTIVES[adj_idx];
        if is_fem {
            if let Some((_, fem_adj)) = FEMININE_ADJECTIVES.iter().find(|(a, _)| *a == adj) {
                adj = fem_adj;
            }
        }
        format!("{} {}", animal, adj)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerProfile {
    pub pseudo: String,
    pub total_beers: u32,
    pub total_liters: f64,
    pub unique_beers: u32,
    pub top_beer_id: Option<String>,
    pub top_beers: Vec<String>,
    pub tasted_beer_ids: Vec<String>,
    pub achievements_count: u32,
    pub archetype: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Match1on1Result {
    pub score: u32, // Jaccard similarity percentage (0-100)
    pub common_beer_ids: Vec<String>,
    pub discovery_beer_ids: Vec<String>,
}

pub fn compute_1on1(my_profile: &PeerProfile, friend_profile: &PeerProfile) -> Match1on1Result {
    let mine: HashSet<String> = my_profile.tasted_beer_ids.iter().cloned().collect();
    let theirs: HashSet<String> = friend_profile.tasted_beer_ids.iter().cloned().collect();

    let mut common = Vec::new();
    let mut discoveries = Vec::new();

    for id in &theirs {
        if mine.contains(id) {
            common.push(id.clone());
        } else {
            discoveries.push(id.clone());
        }
    }

    let union_size = mine.union(&theirs).count();
    let score = if union_size > 0 {
        ((common.len() as f64 / union_size as f64) * 100.0).round() as u32
    } else {
        0
    };

    Match1on1Result {
        score,
        common_beer_ids: common,
        discovery_beer_ids: discoveries,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PodiumWinner {
    pub name: String,
    pub value: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupAnalytics {
    pub total_group_beers: u32,
    pub total_group_liters: f64,
    pub unique_group_beers: usize,
    pub pilier_winner: PodiumWinner,
    pub explorateur_winner: PodiumWinner,
    pub chasseur_winner: PodiumWinner,
    pub common_beers: Vec<(String, u32)>, // (beer_id, count_of_members)
}

pub fn compute_group_analytics(members: &[PeerProfile]) -> Option<GroupAnalytics> {
    if members.is_empty() {
        return None;
    }

    let mut total_beers = 0u32;
    let mut total_liters = 0.0;
    let mut unique_beers = HashSet::new();
    let mut beer_frequency: HashMap<String, u32> = HashMap::new();

    let mut pilier = PodiumWinner {
        name: "-".to_string(),
        value: 0,
    };
    let mut explorateur = PodiumWinner {
        name: "-".to_string(),
        value: 0,
    };
    let mut chasseur = PodiumWinner {
        name: "-".to_string(),
        value: 0,
    };

    for m in members {
        total_beers += m.total_beers;
        total_liters += m.total_liters;

        if m.total_beers > pilier.value {
            pilier = PodiumWinner {
                name: m.pseudo.clone(),
                value: m.total_beers,
            };
        }
        if m.unique_beers > explorateur.value {
            explorateur = PodiumWinner {
                name: m.pseudo.clone(),
                value: m.unique_beers,
            };
        }
        if m.achievements_count > chasseur.value {
            chasseur = PodiumWinner {
                name: m.pseudo.clone(),
                value: m.achievements_count,
            };
        }

        for id in &m.tasted_beer_ids {
            unique_beers.insert(id.clone());
            *beer_frequency.entry(id.clone()).or_insert(0) += 1;
        }
    }

    let mut common_beers: Vec<(String, u32)> = beer_frequency
        .into_iter()
        .filter(|(_, count)| *count > 1)
        .collect();
    common_beers.sort_by_key(|a| std::cmp::Reverse(a.1));

    Some(GroupAnalytics {
        total_group_beers: total_beers,
        total_group_liters: (total_liters * 100.0).round() / 100.0,
        unique_group_beers: unique_beers.len(),
        pilier_winner: pilier,
        explorateur_winner: explorateur,
        chasseur_winner: chasseur,
        common_beers,
    })
}

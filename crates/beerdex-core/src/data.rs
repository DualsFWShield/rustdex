use crate::models::{BacRule, Beer, Brewery};
use serde::{Deserialize, Serialize};
use serde_json::Error;
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ThanosAliasValue {
    String(String),
    Object {
        #[serde(rename = "targetId", default)]
        target_id: Option<String>,
        #[serde(rename = "targetTitle", default)]
        target_title: Option<String>,
        #[serde(rename = "targetBrewery", default)]
        target_brewery: Option<String>,
    },
}

#[derive(Debug, Clone, Default)]
pub struct BeerDatabase {
    pub beers: Vec<Beer>,
    pub breweries: Vec<Brewery>,
    pub bac_rules: HashMap<String, BacRule>,
    pub thanos_aliases: HashMap<String, ThanosAliasValue>,
}

impl BeerDatabase {
    pub fn new() -> Self {
        Self::default()
    }

    #[inline]
    fn strip_bom(s: &str) -> &str {
        s.strip_prefix("\u{feff}").unwrap_or(s)
    }

    /// Loads beer catalog from raw JSON string, injecting the country code if omitted.
    pub fn load_beer_catalog_json(
        &mut self,
        json_str: &str,
        country_code: &str,
    ) -> Result<usize, Error> {
        let clean = Self::strip_bom(json_str);
        let mut loaded: Vec<Beer> = serde_json::from_str(clean)?;
        for beer in &mut loaded {
            if beer.country.is_none() {
                beer.country = Some(country_code.to_string());
            }
            if beer.country_code.is_none() {
                beer.country_code = Some(country_code.to_string());
            }
        }
        let count = loaded.len();
        self.beers.extend(loaded);
        Ok(count)
    }

    /// Loads breweries from raw JSON string.
    pub fn load_breweries_json(&mut self, json_str: &str) -> Result<usize, Error> {
        let clean = Self::strip_bom(json_str);
        let loaded: Vec<Brewery> = serde_json::from_str(clean)?;
        let count = loaded.len();
        self.breweries.extend(loaded);
        Ok(count)
    }

    /// Loads BAC rules from raw JSON string.
    pub fn load_bac_rules_json(&mut self, json_str: &str) -> Result<(), Error> {
        let clean = Self::strip_bom(json_str);
        self.bac_rules = serde_json::from_str(clean)?;
        Ok(())
    }

    /// Loads Thanos aliases dictionary from JSON string.
    pub fn load_thanos_aliases_json(&mut self, json_str: &str) -> Result<(), Error> {
        let clean = Self::strip_bom(json_str);
        self.thanos_aliases = serde_json::from_str(clean)?;
        Ok(())
    }

    /// Resolves an ID via Thanos aliases if it was migrated.
    pub fn resolve_alias<'a>(&'a self, id: &'a str) -> &'a str {
        if let Some(target) = self.thanos_aliases.get(id) {
            match target {
                ThanosAliasValue::String(s) => s.as_str(),
                ThanosAliasValue::Object { target_id, .. } => {
                    if let Some(ref tid) = target_id {
                        tid.as_str()
                    } else {
                        id
                    }
                }
            }
        } else {
            id
        }
    }

    /// Enriches beer metadata by cross-referencing breweries and maps.
    pub fn enrich_metadata(&mut self) {
        let brewery_map: HashMap<String, &Brewery> = self
            .breweries
            .iter()
            .map(|b| (b.name.to_lowercase().trim().to_string(), b))
            .collect();

        for beer in &mut self.beers {
            let brew_name = beer.brewery.to_lowercase().trim().to_string();
            if let Some(brewery) = brewery_map.get(&brew_name) {
                if beer.search_region.is_none() {
                    beer.search_region = brewery.province.clone();
                }
                if beer.search_country.is_none() {
                    beer.search_country = Some(brewery.country.clone());
                }
                if beer.country_code.is_none() {
                    beer.country_code = Some(brewery.country.clone());
                }
            }
        }

        // Deduplicate beers by resolved_id
        let mut seen = HashSet::new();
        self.beers.retain(|b| seen.insert(b.resolved_id()));
    }

    /// Finds a beer by exact ID (or alias).
    pub fn find_by_id(&self, id: &str) -> Option<&Beer> {
        let resolved = self.resolve_alias(id);
        self.beers.iter().find(|b| b.resolved_id() == resolved)
    }

    /// Finds a beer by EAN13 barcode.
    pub fn find_by_barcode(&self, barcode: &str) -> Option<&Beer> {
        let clean = barcode.trim();
        if clean.is_empty() {
            return None;
        }
        self.beers
            .iter()
            .find(|b| b.barcode.as_deref() == Some(clean))
    }

    /// Multi-criteria search and filter matching JS search engine.
    pub fn filter_beers(
        &self,
        query: &str,
        style_filter: Option<&str>,
        brewery_filter: Option<&str>,
        country_filter: Option<&str>,
    ) -> Vec<&Beer> {
        let q = query.trim().to_lowercase();
        self.beers
            .iter()
            .filter(|b| {
                if !q.is_empty() {
                    let matches_title = b.title.to_lowercase().contains(&q);
                    let matches_brewery = b.brewery.to_lowercase().contains(&q);
                    let matches_type = b.beer_type.to_lowercase().contains(&q);
                    let matches_region = b
                        .search_region
                        .as_deref()
                        .unwrap_or("")
                        .to_lowercase()
                        .contains(&q);
                    let matches_country = b
                        .search_country
                        .as_deref()
                        .unwrap_or("")
                        .to_lowercase()
                        .contains(&q);

                    if !matches_title
                        && !matches_brewery
                        && !matches_type
                        && !matches_region
                        && !matches_country
                    {
                        return false;
                    }
                }
                if let Some(style) = style_filter {
                    if !b.beer_type.to_lowercase().contains(&style.to_lowercase()) {
                        return false;
                    }
                }
                if let Some(brewery) = brewery_filter {
                    if !b.brewery.to_lowercase().contains(&brewery.to_lowercase()) {
                        return false;
                    }
                }
                if let Some(country) = country_filter {
                    if b.country.as_deref().unwrap_or("").to_uppercase() != country.to_uppercase()
                        && b.country_code.as_deref().unwrap_or("").to_uppercase()
                            != country.to_uppercase()
                    {
                        return false;
                    }
                }
                true
            })
            .collect()
    }
}

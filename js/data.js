import { calculateRarity, getDynamicBeerRarity } from './autoRarity.js';
import { MAPS, getRegionName } from './map.js';
import { i18n } from './i18n.js';
import * as Storage from './storage.js';

const ALL_DATA_FILES = [
    'data/belgiumbeer.json',
    'data/saison.json',
    'data/deutchbeer.json',
    'data/frenchbeer.json',
    'data/nlbeer.json',
    'data/usbeer.json',
    'data/newbeer.json',
    'data/cobeer.json',
    'data/krbeer.json',
    'data/jpbeer.json',
    'data/cnbeer.json'
];

const EMPTY_BREWERY_DATA = {};

// Parsed beer -> enriched beer. The same beer objects are enriched repeatedly
// (core boot, deferred boot, custom beers, detail views). Enrichment only depends
// on the beer itself, the shared brewery table and the active locale (which
// triggers a full reload when changed), so memoising it is safe.
const _enrichCache = new WeakMap();
const _breweryLowerCache = new WeakMap();

const PROVINCE_ALIASES = {
    'bevbr': 'VBR',
    'be-van': 'ANT',
    'be-vli': 'LIM',
    'be-vwv': 'WVL',
    'be-vov': 'OVL',
    'be-vbr': 'VBR',
    'be-bru': 'BRU',
    'be-wbr': 'WBR',
    'be-wht': 'HAI',
    'be-wna': 'NAM',
    'be-wlg': 'LIE',
    'be-wlx': 'LUX',
    '59': 'FRHDF',
    '62': 'FRHDF',
    'fr-59': 'FRHDF',
    'hauts-de-france': 'FRHDF',
    'grand est': 'FRGES',
    'paca': 'FRPAC',
    "provence-alpes-cote d'azur": 'FRPAC',
    'auvergne-rhone-alpes': 'FRARA',
    'auvergne-rhne-alpes': 'FRARA',
    'bourgogne-franche-comte': 'FRBFC',
    'occitanie': 'FROCC',
    'pays de la loire': 'FRPDL',
    'bretagne': 'FRBRE',
    'normandie': 'FRNOR',
    'corse': 'FR20R',
    'nouvelle-aquitaine': 'FRNAQ',
    'centre-val de loire': 'FRCVL',
    'ile-de-france': 'FRIDF'
};

function _normalizeProvinceCode(raw) {
    if (!raw) return '';
    const trimmed = String(raw).trim();
    const asciiKey = trimmed
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\uFFFD/g, '');
    if (PROVINCE_ALIASES[asciiKey]) return PROVINCE_ALIASES[asciiKey];
    return trimmed;
}

function _lookupBrewery(breweryData, name) {
    if (!breweryData || !name) return null;
    if (breweryData[name]) return breweryData[name];
    let lowerMap = _breweryLowerCache.get(breweryData);
    if (!lowerMap) {
        lowerMap = new Map();
        for (const [k, v] of Object.entries(breweryData)) {
            lowerMap.set(k.toLowerCase().trim(), v);
        }
        _breweryLowerCache.set(breweryData, lowerMap);
    }
    return lowerMap.get(String(name).toLowerCase().trim()) || null;
}

let _missingImagesSet = new Set();
let _missingImagesPromise = null;

export function loadMissingImagesManifest() {
    if (!_missingImagesPromise) {
        _missingImagesPromise = fetch('data/missing-images.json')
            .then(res => (res.ok ? res.json() : null))
            .then(data => {
                if (data && Array.isArray(data.missing)) {
                    _missingImagesSet = new Set(data.missing);
                }
                return _missingImagesSet;
            })
            .catch(() => _missingImagesSet);
    }
    return _missingImagesPromise;
}

export function isMissingImage(path) {
    return Boolean(path && _missingImagesSet.has(path));
}

export function enrichBeerMetadata(beer, breweryData = EMPTY_BREWERY_DATA) {
    const cached = _enrichCache.get(beer);
    if (cached && cached.breweryData === breweryData) return cached.result;

    let searchRegion = beer.searchRegion || '';
    let searchCountry = beer.searchCountry || '';

    const brewInfo = _lookupBrewery(breweryData, beer.brewery);
    let countryCode = brewInfo?.country;
    let provinceCode = _normalizeProvinceCode(brewInfo?.province || beer.province);

    if (!countryCode && provinceCode) {
        for (const [, mapObj] of Object.entries(MAPS)) {
            if (mapObj.names && mapObj.names[provinceCode]) {
                countryCode = mapObj.countryCode;
                break;
            }
        }
    }
    countryCode = countryCode || (brewInfo ? 'BE' : '');

    if (countryCode) {
        const mapObj = MAPS[countryCode.toLowerCase()];
        if (mapObj) {
            searchCountry = `${mapObj.icon} ${i18n.t(mapObj.titleKey)}`;
            if (mapObj.names && provinceCode) {
                searchRegion = getRegionName(countryCode.toLowerCase(), provinceCode) || provinceCode;
            }
        }
    }

    const result = {
        ...beer,
        countryCode: countryCode || '',
        province: provinceCode || '',
        searchRegion,
        searchCountry
    };

    _enrichCache.set(beer, { breweryData, result });
    return result;
}

// Brewery metadata is static: fetch/parse it once per session and share the
// in-flight promise between the core and the deferred boot passes.
let _breweryDataPromise = null;

function getBreweryData() {
    if (!_breweryDataPromise) {
        _breweryDataPromise = fetch('data/breweries.json')
            .then(res => (res.ok ? res.json() : []))
            .catch(() => [])
            .then(arr => Array.isArray(arr) ? Object.fromEntries(arr.map(b => [b.name, b])) : (arr || {}));
    }
    return _breweryDataPromise;
}

// Deterministic string hash for IDs, memoised on the beer payload.
const _idCache = new Map();

const djb2Hash = (str) => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return Math.abs(hash).toString(36);
};

function _beerId(beer) {
    if (beer.id) return beer.id;
    const key = beer.title + '\u0000' + (beer.brewery || '');
    let id = _idCache.get(key);
    if (!id) {
        id = beer.title.replace(/\s+/g, '_').toUpperCase() + '_' + djb2Hash(key);
        _idCache.set(key, id);
    }
    return id;
}

export async function fetchAllBeers(files = ALL_DATA_FILES) {
    let allBeers = [];

    const promises = files.map(url =>
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`Failed to load ${url}`);
                return response.json();
            })
            .then(data => {
                if (url.includes('newbeer.json')) {
                    return data.map(b => ({ ...b, removeBackground: true }));
                }
                return data;
            })
            .catch(err => {
                console.warn(`Error loading ${url}:`, err);
                return []; // Fail gracefully
            })
    );

    // We also fetch breweries.json and missing-images manifest
    const missingPromise = loadMissingImagesManifest();
    promises.push(getBreweryData());

    const results = await Promise.all(promises);
    await missingPromise;
    const breweryData = results.pop() || {}; // last promise is breweries.json

    results.forEach(data => {
        if (Array.isArray(data)) {
            allBeers = allBeers.concat(data);
        }
    });

    // Normalize IDs if missing (fallback to title)
    // Map rarity_rank from data to internal rarity key
    const rarityMap = {
        'Base': 'base',
        'Commun': 'commun',
        'Rare': 'rare',
        'Super Rare': 'super_rare',
        'Épique': 'epique',
        'Mythique': 'mythique',
        'Légendaire': 'legendaire',
        'Ultra Légendaire': 'ultra_legendaire',
        'Saisonnière': 'saisonniere',
        'Fondateur': 'fondateur'
    };

    // Detect user country for dynamic rarity
    const userMapScope = Storage.getDefaultMapScope() || '';
    const bacCountry = Storage.getPreference('bac_country', '');
    // Resolve user country code from map scope or BAC country
    const scopeToCountry = { 'be': 'BE', 'fr': 'FR', 'de': 'DE', 'nl': 'NL', 'us': 'US', 'co': 'CO', 'kr': 'KR', 'jp': 'JP', 'cn': 'CN', 'it': 'IT' };
    const userCountry = scopeToCountry[userMapScope] || bacCountry || 'BE';

    const mapped = allBeers.map(beer => {
        const enriched = enrichBeerMetadata(beer, breweryData);
        const baseRarity = rarityMap[beer.rarity_rank] || beer.rarity || 'commun';
        const isSeasonal = beer.rarity_rank === 'Saisonnière' || beer.isSeasonal || false;
        
        // Apply dynamic import rarity bonus
        const beerWithBase = { ...enriched, rarity: baseRarity, countryCode: enriched.countryCode };
        const dynamicResult = getDynamicBeerRarity(beerWithBase, userCountry);
        
        return {
            ...enriched,
            id: _beerId(beer),
            rarity: dynamicResult.rarity,
            baseRarity: dynamicResult.baseRarity,
            importBonus: dynamicResult.importBonus,
            importReason: dynamicResult.importReason,
            isSeasonal
        };
    });

    // Deduplicate by ID (same beer can appear in multiple country files)
    const seen = new Set();
    return mapped.filter(beer => {
        if (seen.has(beer.id)) return false;
        seen.add(beer.id);
        return true;
    });
}


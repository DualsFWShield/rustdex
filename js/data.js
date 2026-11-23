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

    const brewInfo = breweryData[beer.brewery];
    let countryCode = brewInfo?.country;
    let provinceCode = brewInfo?.province || beer.province;

    if (!countryCode && beer.province) {
        for (const [scope, mapObj] of Object.entries(MAPS)) {
            if (mapObj.names && mapObj.names[beer.province]) {
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


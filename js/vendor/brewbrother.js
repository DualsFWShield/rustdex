// brewbrother.js — Standalone Brew Brother Recommendation Engine v2.0 (Adapted for BeerDex)
// ═══════════════════════════════════════════════════════════════
// Usage:
//   const engine = new BrewBrother({ ...config });
//   const results = await engine.recommend(adapter);
//
// Adapter contract:
//   getFeedback()      -> [{ beer, weight, timestamp, count?, rating? }]
//                         count = number of times this beer was drunk (default 1).
//                         If several entries share the same beer id, they are
//                         merged and the entries are counted as extra drinks.
//   getCandidates()    -> [beer]
//   getDrunkIds()      -> Set of already-drunk beer ids (excluded from results)
//   getDrinkCounts()?  -> optional Map/Object { beerId -> times drunk }, used as
//                         the authoritative source when present.
// ═══════════════════════════════════════════════════════════════

(function (root) {
    'use strict';

    const DEFAULTS = {
        weights: {
            favorite: 3.0,
            ratedGood: 1.5,        // 15-20
            ratedNeutral: 1.0,     // 10-14
            ratedBad: -1.0,        // <10
            drunk: 1.0,
            // Diminishing-returns reinforcement per repeated drink of the SAME beer.
            // drinkFactor = 1 + repeatDrinkBonus * ln(drinks)   (1->1, 3->1.66, 10->2.38)
            repeatDrinkBonus: 0.6,
            // A style drunk at least this many times becomes a "loyalty" signal
            loyaltyThreshold: 3
        },
        influence: {
            type: 0.26,
            brewery: 0.14,
            abv: 0.16,
            flavor: 0.20,
            similarity: 0.24
        },
        blending: {
            communityWeightMin: 0.50, // thin profile -> trust the crowd
            communityWeightMax: 0.15, // rich profile  -> trust the user
            confidenceSample: 25      // distinct rated beers for full confidence
        },
        exploration: {
            bonus: 0.02 // nudge towards untried breweries/styles
        },
        diversity: {
            enabled: true,
            typePenalty: 0.02,   // per already-selected beer of the same type
            breweryPenalty: 0.04,
            maxPerBrewery: 3,
            maxPerType: 6
        },
        scoring: {
            communityPriorRating: 3.5,
            communityPrior: 5,
            jitter: 0,
            curve: 1.0,
            reasonThreshold: 0.35,
            mismatchThreshold: -0.30
        },
        output: { maxResults: 20, maxReasons: 5 }
    };

    function stableTieHash(str, seed) {
        const s = String(str || '') + '|' + String(seed || 0);
        let h = 2166136261;
        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return ((h >>> 0) % 1000) / 100000;
    }

    function deepMerge(target, source) {
        const out = Object.assign({}, target);
        if (source && typeof source === 'object') {
            Object.keys(source).forEach(key => {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    out[key] = deepMerge(target[key] || {}, source[key]);
                } else if (source[key] !== undefined) {
                    out[key] = source[key];
                }
            });
        }
        return out;
    }

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
    function round1(v) { return Math.round(v * 10) / 10; }
    function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    function normalizeText(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
    function normalizeType(t) { return String(t || '').toLowerCase().trim(); }
    
    function lookupIgnoreCase(obj, key) {
        if (!obj || key == null) return 0;
        if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
        const lower = String(key).toLowerCase();
        for (const k of Object.keys(obj)) {
            if (k.toLowerCase() === lower) return obj[k];
        }
        return 0;
    }

    function parseAbv(beer) {
        if (!beer) return null;
        const raw = (beer.alcohol || '').toString().replace(',', '.').replace(/[^0-9.]/g, '');
        const v = parseFloat(raw);
        return (!isNaN(v) && v >= 0 && v < 25) ? v : null;
    }

    function normalizeSigned(aff) {
        const vals = Object.values(aff);
        if (!vals.length) return;
        const max = Math.max(0, ...vals);
        const min = Math.min(0, ...vals);
        Object.keys(aff).forEach(k => {
            const v = aff[k];
            aff[k] = v >= 0 ? (max > 0 ? v / max : 0) : (min < 0 ? v / Math.abs(min) : 0);
        });
    }

    // ── Bilingual flavor lexicon (Canonical Keys) ────────────────────
    const FLAVOR_LEXICON = {
        fruity: ['fruite', 'fruitée', 'fruity', 'fruit', 'fruits secs', 'fruits exotiques'],
        hoppy: ['houblonne', 'houblonnée', 'hoppy', 'hops', 'houblon'],
        roasted: ['torrefie', 'roasted', 'roast', 'grille'],
        spicy: ['epice', 'spicy', 'epices', 'spices', 'poivre', 'pepper', 'reglisse'],
        sour: ['acide', 'sour', 'acidule', 'acidite', 'tart'],
        bitter: ['amertume', 'amere', 'bitter', 'bitterness'],
        sweet: ['doux', 'sucre', 'sweet', 'moelleux'],
        caramel: ['caramel', 'caramelise', 'toffee'],
        citrus: ['agrumes', 'citrus', 'citron', 'lemon', 'orange', 'pamplemousse', 'grapefruit', 'lime', 'bergamote'],
        coffee: ['cafe', 'coffee', 'espresso', 'moka'],
        chocolate: ['chocolat', 'chocolate', 'cacao', 'cacaote'],
        floral: ['floral', 'fleurs', 'flower', 'hibiscus'],
        malty: ['malt', 'malty', 'maltose'],
        herbal: ['herbace', 'herbal', 'herbes', 'herbs', 'menthe', 'mint'],
        smoky: ['fume', 'smoky', 'smoke', 'tourbe', 'peat', 'rauch'],
        woody: ['boise', 'woody', 'oak', 'chene', 'barrique'],
        vanilla: ['vanille', 'vanilla'],
        coriander: ['coriandre', 'coriander'],
        honey: ['miel', 'honey'],
        dry: ['seche', 'dry'],
        yeasty: ['levure', 'yeast', 'brioche'],
        wheat: ['ble', 'wheat', 'froment'],
        resinous: ['resine', 'resinous', 'resin', 'pin'],
        tropical: ['tropical', 'mangue', 'mango', 'ananas', 'pineapple', 'passion', 'litchi', 'lychee', 'guava', 'fruit de la passion'],
        redFruits: ['fruits rouges', 'framboise', 'raspberry', 'cerise', 'cherry', 'fraise', 'strawberry', 'cassis', 'blackcurrant', 'mure', 'blackberry', 'griotte'],
        banana: ['banane', 'banana'],
        clove: ['girofle', 'clove'],
        plum: ['prune', 'plum', 'noyau', 'stone fruit'],
        biscuit: ['biscuit', 'pain', 'bread', 'pate', 'dough', 'toast'],
        peach: ['peche', 'peach', 'abricot', 'apricot'],
        oat: ['avoine', 'oat']
    };

    const AROMA_WHEEL_TO_FLAVOR = {
        'malte': ['malty'],
        'malte:pain': ['biscuit', 'malty'],
        'malte:caramel': ['caramel'],
        'malte:chocolat': ['chocolate'],
        'malte:cafe': ['coffee'],
        'houblonne': ['hoppy'],
        'houblonne:resine': ['resinous', 'hoppy'],
        'houblonne:agrumes': ['citrus', 'hoppy'],
        'houblonne:tropical': ['tropical', 'hoppy'],
        'houblonne:herbe': ['herbal', 'hoppy'],
        'fruite': ['fruity'],
        'fruite:fruits rouges': ['redFruits', 'fruity'],
        'fruite:noyau': ['plum', 'peach', 'fruity'],
        'fruite:banane': ['banana', 'fruity'],
        'fruite:pomme': ['fruity'],
        'epice': ['spicy'],
        'epice:girofle': ['clove', 'spicy'],
        'epice:poivre': ['spicy'],
        'epice:coriandre': ['coriander', 'spicy'],
        'epice:vanille': ['vanilla'],
        'torrefie': ['roasted'],
        'torrefie:fume': ['smoky', 'roasted'],
        'torrefie:cendre': ['roasted', 'smoky'],
        'torrefie:reglisse': ['spicy', 'roasted'],
        'torrefie:grille': ['roasted'],
        'floral': ['floral'],
        'floral:rose': ['floral'],
        'floral:miel': ['honey'],
        'floral:camomille': ['floral'],
        'floral:geranium': ['floral'],
        'herbace': ['herbal'],
        'herbace:gazon': ['herbal'],
        'herbace:menthe': ['herbal'],
        'herbace:the': ['herbal', 'floral'],
        'herbace:terreux': ['herbal', 'woody'],
        'levure': ['yeasty'],
        'levure:pate': ['yeasty', 'biscuit'],
        'levure:biscuit': ['biscuit'],
        'levure:cuir': ['yeasty', 'woody'],
        'levure:rustique': ['yeasty', 'dry']
    };

    function mapWheelAromasToFlavors(aromas) {
        if (!Array.isArray(aromas) || aromas.length === 0) return [];
        const out = new Set();
        aromas.forEach(raw => {
            const norm = normalizeText(raw).trim();
            if (!norm) return;
            if (AROMA_WHEEL_TO_FLAVOR[norm]) {
                AROMA_WHEEL_TO_FLAVOR[norm].forEach(f => out.add(f));
                return;
            }
            const cat = norm.split(':')[0];
            if (AROMA_WHEEL_TO_FLAVOR[cat]) {
                AROMA_WHEEL_TO_FLAVOR[cat].forEach(f => out.add(f));
            }
            if (FLAVOR_LEXICON[norm]) out.add(norm);
        });
        return Array.from(out);
    }

    const FLAVOR_MATCHERS = Object.keys(FLAVOR_LEXICON).map(kw => {
        const forms = FLAVOR_LEXICON[kw].map(term => new RegExp('(^|[^a-z0-9])' + escapeRegExp(normalizeText(term)), 'i'));
        return { kw, forms };
    });

    const FLAVOR_CACHE = new WeakMap();
    function extractFlavors(beer) {
        if (!beer) return [];
        if (typeof beer === 'object' && FLAVOR_CACHE.has(beer)) return FLAVOR_CACHE.get(beer);
        const text = normalizeText([beer.type, beer.ingredients, beer.title, beer.description].filter(Boolean).join(' '));
        if (!text) return [];
        const found = [];
        FLAVOR_MATCHERS.forEach(m => {
            if (m.forms.some(rx => rx.test(text))) found.push(m.kw);
        });
        if (typeof beer === 'object') FLAVOR_CACHE.set(beer, found);
        return found;
    }

    // ── Beer-to-beer similarity ──────────────────────────────────
    const STYLE_FAMILY_SYNONYMS = {
        triple: 'tripel',
        double: 'dubbel',
        quadruple: 'quadrupel',
        witbier: 'blanche',
        weizen: 'blanche',
        weissbier: 'blanche',
        wheat: 'blanche',
        pilsner: 'pils',
        lager: 'pils',
        helles: 'pils',
        neipa: 'ipa',
        dipa: 'ipa',
        apa: 'ipa',
        gueuze: 'lambic',
        kriek: 'lambic',
        sour: 'lambic',
        porter: 'stout',
        abbaye: 'abbey',
        trappiste: 'trappist'
    };

    function tokenizeStyleFamily(t) {
        const raw = normalizeText(t).replace(/[^a-z0-9]+/g, ' ').trim();
        if (!raw) return [];
        return raw.split(/\s+/).map(tok => STYLE_FAMILY_SYNONYMS[tok] || tok);
    }

    function typeSimilarity(ta, tb) {
        ta = normalizeType(ta); tb = normalizeType(tb);
        if (!ta || !tb) return 0;
        if (ta === tb) return 1;
        const setA = new Set(tokenizeStyleFamily(ta));
        const setB = new Set(tokenizeStyleFamily(tb));
        let shared = 0;
        setA.forEach(tok => { if (setB.has(tok)) shared++; });
        const union = new Set([...setA, ...setB]).size;
        return union > 0 ? (shared / union) * 0.85 : 0; // partial family match
    }

    function beerSimilarity(a, b) {
        if (!a || !b) return 0;
        let sim = typeSimilarity(a.type, b.type) * 0.45;
        if (a.brewery && b.brewery && String(a.brewery).toLowerCase().trim() === String(b.brewery).toLowerCase().trim()) sim += 0.20;
        
        const fa = extractFlavors(a), fb = extractFlavors(b);
        if (fa.length || fb.length) {
            const setB = new Set(fb);
            const shared = fa.filter(f => setB.has(f)).length;
            const union = new Set([...fa, ...fb]).size;
            sim += (shared / union) * 0.20;
        }
        const abvA = parseAbv(a), abvB = parseAbv(b);
        if (abvA !== null && abvB !== null) {
            const diff = Math.abs(abvA - abvB);
            sim += Math.max(0, 1 - diff / 6) * 0.15;
            
            // Penalty for comparing beers with highly different ABVs
            if (diff >= 1.5) sim *= 0.75;
            if (diff >= 2.5) sim *= 0.50;
        }
        return Math.min(1, sim);
    }

    function BrewBrother(config) {
        this.config = deepMerge(DEFAULTS, config || {});
        this.lastProfile = null;
        this.lastFeedbackCounts = null;
        this.lastDrinkCounts = null;
    }

    BrewBrother.prototype.buildProfile = async function (adapter) {
        const cfg = this.config;
        const w = cfg.weights;
        const sc = cfg.scoring || DEFAULTS.scoring;
        const now = Date.now();
        const rawFeedback = await adapter.getFeedback();
        const feedback = Array.isArray(rawFeedback) ? rawFeedback : [];

        // Optional authoritative drink counter (beerId -> times drunk)
        const drinkCountMap = (typeof adapter.getDrinkCounts === 'function') ? await adapter.getDrinkCounts() : null;
        const explicitFeedback = (typeof adapter.getExplicitFeedback === 'function') ? await adapter.getExplicitFeedback() : null;
        const likedSet = new Set(Array.isArray(explicitFeedback?.liked) ? explicitFeedback.liked.map(String) : []);
        const dislikedSet = new Set(Array.isArray(explicitFeedback?.disliked) ? explicitFeedback.disliked.map(String) : []);

        const getCountFromMap = (id) => {
            if (!drinkCountMap || id == null) return 0;
            if (typeof drinkCountMap.get === 'function') return parseInt(drinkCountMap.get(String(id)) || drinkCountMap.get(id) || 0, 10) || 0;
            return parseInt(drinkCountMap[String(id)] || drinkCountMap[id] || 0, 10) || 0;
        };

        // 1. Aggregate feedback per beer (handles repeat drinks & duplicates)
        const byKey = new Map();
        feedback.forEach(f => {
            if (!f || !f.beer) return;
            const beer = f.beer;
            const key = beer.id != null ? String(beer.id) : `${beer.title || ''}|${beer.brewery || ''}`;
            if (!byKey.has(key)) byKey.set(key, { beer, weightSum: 0, entries: 0, explicitCount: 0, lastTs: 0, hasNegative: false, aromas: new Set() });
            const e = byKey.get(key);
            const countProvided = parseInt(f.count || f.drinkCount || 0, 10) || 0;
            e.weightSum += (typeof f.weight === 'number' ? f.weight : w.drunk);
            e.entries++;
            e.explicitCount += countProvided;
            if (f.weight < 0) e.hasNegative = true;
            if (Array.isArray(f.aromas)) f.aromas.forEach(a => e.aromas.add(a));
            e.lastTs = Math.max(e.lastTs, f.timestamp || 0);
        });

        const typeAffinity = {}, breweryAffinity = {}, flavorAffinity = {}, countryAffinity = {};
        const typeDrinkCount = {}, breweryDrinkCount = {}, countryDrinkCount = {};
        const anchors = [], negativeAnchors = [];
        let abvSum = 0, abvSq = 0, abvW = 0;
        let distinctBeers = 0, totalDrinks = 0;
        const ONE_YEAR = 365 * 24 * 60 * 60 * 1000;

        byKey.forEach((e) => {
            const beer = e.beer;
            const beerIdStr = beer.id != null ? String(beer.id) : '';
            const drinkCount = Math.max(1, e.explicitCount, e.entries, getCountFromMap(beer.id));
            if (drinkCount <= 0) return;
            distinctBeers++;
            totalDrinks += drinkCount;

            let rating = e.weightSum / Math.max(1, e.entries);
            if (beerIdStr && likedSet.has(beerIdStr)) rating += 2.0;
            if (beerIdStr && dislikedSet.has(beerIdStr)) rating -= 2.5;
            // Loyalty: coming back to a beer N times strengthens the signal (diminishing returns)
            const repeatFactor = 1 + w.repeatDrinkBonus * Math.log(drinkCount);

            let decay = 1.0;
            if (e.lastTs) {
                const age = now - e.lastTs;
                if (age > 0) decay = Math.max(0.5, 1.0 - (age / ONE_YEAR) * 0.5);
            }

            const strength = rating * repeatFactor * decay;

            if (strength > 1.5) anchors.push({ beer, strength, drinkCount });
            else if (strength < -0.5) negativeAnchors.push({ beer, strength, drinkCount });

            const tKey = beer.type ? String(beer.type).trim() : '';
            if (tKey) {
                typeAffinity[tKey] = (typeAffinity[tKey] || 0) + strength;
                typeDrinkCount[tKey] = (typeDrinkCount[tKey] || 0) + drinkCount;
            }

            const bKey = beer.brewery ? String(beer.brewery).trim() : '';
            if (bKey) {
                breweryAffinity[bKey] = (breweryAffinity[bKey] || 0) + strength;
                breweryDrinkCount[bKey] = (breweryDrinkCount[bKey] || 0) + drinkCount;
            }

            const cKey = (beer.searchCountry || beer.countryCode || '').toString().trim();
            if (cKey) {
                countryAffinity[cKey] = (countryAffinity[cKey] || 0) + strength;
                countryDrinkCount[cKey] = (countryDrinkCount[cKey] || 0) + drinkCount;
            }

            const wheelFlavors = mapWheelAromasToFlavors(Array.from(e.aromas));
            const combinedFlavors = new Set([...extractFlavors(beer), ...wheelFlavors]);
            combinedFlavors.forEach(fl => {
                flavorAffinity[fl] = (flavorAffinity[fl] || 0) + strength * (wheelFlavors.includes(fl) ? 1.25 : 1.0);
            });

            const abv = parseAbv(beer);
            if (abv !== null && strength > 0) {
                abvSum += abv * strength;
                abvSq += abv * abv * strength;
                abvW += strength;
            }
        });

        // Incorporate explicit Likes/Dislikes on beers not yet drunk
        if ((likedSet.size > 0 || dislikedSet.size > 0) && typeof adapter.getCandidates === 'function') {
            const candidates = await adapter.getCandidates();
            if (Array.isArray(candidates)) {
                candidates.forEach(beer => {
                    if (!beer || beer.id == null) return;
                    const idStr = String(beer.id);
                    if (byKey.has(idStr)) return;
                    const isLiked = likedSet.has(idStr);
                    const isDisliked = dislikedSet.has(idStr);
                    if (!isLiked && !isDisliked) return;

                    const strength = isLiked ? 2.4 : -2.6;
                    if (isLiked) anchors.push({ beer, strength, drinkCount: 1 });
                    else negativeAnchors.push({ beer, strength, drinkCount: 1 });

                    const tKey = beer.type ? String(beer.type).trim() : '';
                    if (tKey) typeAffinity[tKey] = (typeAffinity[tKey] || 0) + strength * 0.7;
                    const bKey = beer.brewery ? String(beer.brewery).trim() : '';
                    if (bKey) breweryAffinity[bKey] = (breweryAffinity[bKey] || 0) + strength * 0.6;
                    const cKey = (beer.searchCountry || beer.countryCode || '').toString().trim();
                    if (cKey) countryAffinity[cKey] = (countryAffinity[cKey] || 0) + strength * 0.4;
                    extractFlavors(beer).forEach(fl => {
                        flavorAffinity[fl] = (flavorAffinity[fl] || 0) + strength * 0.75;
                    });
                    const abv = parseAbv(beer);
                    if (abv !== null && isLiked) {
                        abvSum += abv * 1.5;
                        abvSq += abv * abv * 1.5;
                        abvW += 1.5;
                    }
                });
            }
        }

        // Favorite type calculation
        let favoriteType = null, favoriteTypeCount = 0, topAff = -Infinity;
        Object.keys(typeAffinity).forEach(t => {
            if (typeAffinity[t] > topAff) {
                topAff = typeAffinity[t];
                favoriteType = t;
                favoriteTypeCount = typeDrinkCount[t] || 0;
            }
        });

        // Signed Normalization
        normalizeSigned(typeAffinity);
        normalizeSigned(breweryAffinity);
        normalizeSigned(flavorAffinity);
        normalizeSigned(countryAffinity);

        anchors.sort((a, b) => b.strength - a.strength);
        negativeAnchors.sort((a, b) => a.strength - b.strength);

        // Gaussian ABV tolerance
        const idealAbv = abvW > 0 ? abvSum / abvW : null;
        let abvStd = null;
        if (abvW > 0) {
            const variance = Math.max(0, (abvSq / abvW) - (idealAbv * idealAbv));
            let std = Math.sqrt(variance);
            if (!isFinite(std) || std <= 0) std = 1.25;
            abvStd = clamp(std, 0.75, 3.5);
        }

        const confidenceVal = clamp((distinctBeers + likedSet.size * 0.5) / cfg.blending.confidenceSample, 0, 1);

        this.lastProfile = {
            typeAffinity, breweryAffinity, flavorAffinity, countryAffinity,
            typeDrinkCount, breweryDrinkCount, countryDrinkCount,
            idealAbv, abvTolerance: abvStd,
            favoriteType, favoriteTypeCount,
            anchors: anchors.slice(0, 40),
            negativeAnchors: negativeAnchors.slice(0, 20),
            likedIds: Array.from(likedSet),
            dislikedIds: Array.from(dislikedSet),
            confidence: confidenceVal,
            distinctBeers,
            totalDrinks
        };

        this.lastFeedbackCounts = new Map(Array.from(byKey.values()).map(e => [String(e.beer.id), Math.max(e.explicitCount, e.entries)]));
        if (drinkCountMap) this.lastDrinkCounts = drinkCountMap;
        return this.lastProfile;
    };

    BrewBrother.prototype.scoreBeer = function (beer, profile, runtimeOpts) {
        const cfg = this.config;
        const inf = cfg.influence;
        const sc = cfg.scoring || DEFAULTS.scoring;
        profile = profile || {};
        runtimeOpts = runtimeOpts || {};

        const explorationRatio = runtimeOpts.explorationLevel !== undefined
            ? clamp(Number(runtimeOpts.explorationLevel) / 100, 0, 1)
            : 0.35;

        const isProfileEmpty = (profile.confidence || 0) === 0 &&
            Object.keys(profile.typeAffinity || {}).length === 0 &&
            Object.keys(profile.flavorAffinity || {}).length === 0;

        let typeScore = lookupIgnoreCase(profile.typeAffinity, beer.type);
        if (typeScore === 0 && beer.type && profile.typeAffinity) {
            // Partial family fallback when exact style name wasn't tasted yet
            let bestFam = 0, bestAff = 0;
            for (const [tKey, aff] of Object.entries(profile.typeAffinity)) {
                const sim = typeSimilarity(beer.type, tKey);
                if (sim > bestFam) { bestFam = sim; bestAff = aff; }
            }
            if (bestFam >= 0.35) typeScore = bestAff * bestFam * 0.8;
        }
        const breweryScore = lookupIgnoreCase(profile.breweryAffinity, beer.brewery);
        const countryKey = (beer.searchCountry || beer.countryCode || '').toString().trim();
        const countryScore = countryKey ? lookupIgnoreCase(profile.countryAffinity, countryKey) : 0;

        const flavors = extractFlavors(beer);
        let flavorScore = 0;
        const likedFlavors = [], dislikedFlavors = [];
        if (flavors.length > 0) {
            let sum = 0;
            flavors.forEach(f => {
                const aff = profile.flavorAffinity ? (profile.flavorAffinity[f] || 0) : 0;
                sum += aff;
                if (aff >= 0.2) likedFlavors.push(f);
                else if (aff <= -0.15) dislikedFlavors.push(f);
            });
            flavorScore = clamp(sum / flavors.length, -1, 1);
        }

        let abvScore = 0.5;
        const abv = parseAbv(beer);
        if (abv !== null && profile.idealAbv != null) {
            const sigma = (profile.abvTolerance || 2) * (1 + explorationRatio * 0.4);
            const diff = abv - profile.idealAbv;
            abvScore = Math.exp(-(diff * diff) / (2 * sigma * sigma));
        }

        // kNN Similarity Score (Nearest loved beer)
        let similarityScore = 0, lovedRef = null, lovedRefDrinks = 0, bestSim = 0;
        if (profile.anchors && profile.anchors.length > 0) {
            let simSum = 0, wSum = 0;
            profile.anchors.forEach(a => {
                const s = beerSimilarity(beer, a.beer);
                simSum += s * a.strength;
                wSum += a.strength;
                if (s > bestSim) { bestSim = s; lovedRef = a.beer.title; lovedRefDrinks = a.drinkCount; }
            });
            if (wSum > 0) similarityScore = simSum / wSum;

            if (profile.negativeAnchors && profile.negativeAnchors.length > 0) {
                let negSum = 0, negW = 0;
                profile.negativeAnchors.forEach(a => {
                    negSum += beerSimilarity(beer, a.beer) * Math.abs(a.strength);
                    negW += Math.abs(a.strength);
                });
                if (negW > 0) similarityScore -= 0.85 * (negSum / negW);
            }
            similarityScore = clamp(similarityScore, -1, 1);
        }

        // Mapping signed [-1, 1] to bounded [0, 1] arrays for total score
        const type01 = beer.type ? (typeScore + 1) / 2 : 0.5;
        const brewery01 = beer.brewery ? (breweryScore + 1) / 2 : 0.5;
        const flavor01 = flavors.length ? (flavorScore + 1) / 2 : 0.5;
        const sim01 = profile.anchors && profile.anchors.length ? (similarityScore + 1) / 2 : 0.5;
        const country01 = countryKey ? (countryScore + 1) / 2 : 0.5;

        let totalScore = 0.5;
        if (!isProfileEmpty) {
            totalScore = (type01 * inf.type) + (brewery01 * inf.brewery) + (flavor01 * inf.flavor) + (abvScore * inf.abv) + (sim01 * inf.similarity);
            totalScore = totalScore * 0.96 + country01 * 0.04;

            // Exploration nudge scaled by explorationRatio
            const typeUntried = !beer.type || !(lookupIgnoreCase(profile.typeDrinkCount, beer.type) > 0);
            const breweryUntried = !beer.brewery || !(lookupIgnoreCase(profile.breweryDrinkCount, beer.brewery) > 0);
            const countryUntried = !countryKey || !(lookupIgnoreCase(profile.countryDrinkCount, countryKey) > 0);
            const expMultiplier = 0.4 + explorationRatio * 2.2;
            if (breweryUntried) totalScore += cfg.exploration.bonus * expMultiplier;
            if (typeUntried) totalScore += cfg.exploration.bonus * 0.7 * expMultiplier;
            if (countryUntried && explorationRatio >= 0.4) totalScore += cfg.exploration.bonus * 0.5 * explorationRatio;

            // Severe mismatch penalties
            if (typeScore <= -0.4) totalScore *= 0.85;
            if (breweryScore <= -0.4) totalScore *= 0.85;
            if (abvScore <= 0.15) totalScore *= 0.85;
        }

        let community = null;
        let comm01 = 0.5;
        if (beer.community_rating && String(beer.community_rating) !== '') {
            const rating = parseFloat(beer.community_rating) || 0;
            const countRaw = beer.community_rating_count !== undefined ? beer.community_rating_count : beer.rating_count;
            const count = parseInt(countRaw, 10) || 0;
            const priorRating = sc.communityPriorRating !== undefined ? sc.communityPriorRating : 3.5;
            const prior = sc.communityPrior !== undefined ? sc.communityPrior : 5;
            const smoothed = count > 0 ? (rating * count + priorRating * prior) / (count + prior) : rating;
            community = { rating, count, smoothed: parseFloat(smoothed.toFixed(2)) };

            comm01 = clamp(smoothed / 5.0, 0, 1);
            const baseQualityWeight = isProfileEmpty
                ? cfg.blending.communityWeightMin
                : cfg.blending.communityWeightMin + (cfg.blending.communityWeightMax - cfg.blending.communityWeightMin) * (profile.confidence || 0);
            const qualityWeight = clamp(baseQualityWeight * (1 - explorationRatio * 0.35), 0.08, 0.65);
            totalScore = (totalScore * (1 - qualityWeight)) + (comm01 * qualityWeight);
        }

        if (runtimeOpts.preferRare) {
            const rarityBonus = {
                ultra_legendaire: 0.12,
                legendaire: 0.10,
                mythique: 0.08,
                epique: 0.06,
                super_rare: 0.04,
                rare: 0.02
            }[beer.rarity] || 0;
            totalScore = clamp(totalScore + rarityBonus, 0, 1);
        }

        const curve = sc.curve !== undefined ? sc.curve : 1.0;
        totalScore = Math.pow(clamp(totalScore, 0, 1), curve);

        return {
            score20: parseFloat((totalScore * 20).toFixed(1)),
            percentage: Math.round(totalScore * 100),
            total: totalScore,
            // Legacy / analytical fields
            typeScore: type01, breweryScore: brewery01, flavorScore: flavor01, abvScore, similarityScore: sim01,
            breakdown: {
                type: Math.round(type01 * 100),
                brewery: Math.round(brewery01 * 100),
                flavor: Math.round(flavor01 * 100),
                abv: Math.round(abvScore * 100),
                similarity: Math.round(sim01 * 100),
                community: Math.round(comm01 * 100)
            },
            confidencePct: Math.round((profile.confidence || 0) * 100),
            // For NLP
            abv, flavors, likedFlavors, dislikedFlavors, community,
            dims: { typeSigned: typeScore, brewerySigned: breweryScore, flavorSigned: flavorScore, abvScore, repeatSim: similarityScore },
            evidence: {
                typeDrinks: lookupIgnoreCase(profile.typeDrinkCount, beer.type),
                breweryDrinks: lookupIgnoreCase(profile.breweryDrinkCount, beer.brewery),
                lovedRef: (lovedRef && bestSim > 0.35) ? lovedRef : null,
                lovedRefDrinks,
                flavors,
                idealAbv: profile.idealAbv !== null ? round1(profile.idealAbv) : null,
                profileSize: profile.distinctBeers || 0,
                totalDrinks: profile.totalDrinks || 0,
                abvTolerance: profile.abvTolerance,
                favoriteType: profile.favoriteType,
                favoriteTypeCount: profile.favoriteTypeCount
            }
        };
    };

    BrewBrother.prototype.buildReasons = function (beer, match, profile) {
        const sc = this.config.scoring || DEFAULTS.scoring;
        const reasons = [];
        const d = match.dims || {};
        const ev = match.evidence || {};
        const type = beer.type ? String(beer.type).trim() : '';
        const brewery = beer.brewery ? String(beer.brewery).trim() : '';
        const reasonThreshold = sc.reasonThreshold !== undefined ? sc.reasonThreshold : 0.35;
        const mismatchThreshold = sc.mismatchThreshold !== undefined ? sc.mismatchThreshold : -0.30;

        // Positives
        if (d.typeSigned >= reasonThreshold && type) reasons.push({ code: 'type', strength: d.typeSigned, detail: Object.assign({ type }, ev) });
        if (d.brewerySigned >= reasonThreshold && brewery) reasons.push({ code: 'brewery', strength: d.brewerySigned, detail: Object.assign({ brewery }, ev) });
        if (match.likedFlavors && match.likedFlavors.length && d.flavorSigned >= 0.3) reasons.push({ code: 'flavor', strength: Math.min(1, d.flavorSigned + 0.2), detail: Object.assign({ flavors: match.likedFlavors }, ev) });
        if (d.abvScore >= 0.85 && ev.idealAbv !== null && match.abv !== null) reasons.push({ code: 'abv', strength: d.abvScore, detail: Object.assign({ beerAbv: match.abv }, ev) });
        if (d.repeatSim >= 0.4 && ev.lovedRef) reasons.push({ code: 'similar', strength: d.repeatSim + 0.2, detail: Object.assign({ title: ev.lovedRef, count: ev.lovedRefDrinks }, ev) });
        if (ev.typeDrinks >= this.config.weights.loyaltyThreshold && d.typeSigned > 0.4) reasons.push({ code: 'repeat', strength: d.typeSigned + 0.1, detail: ev });
        if (match.community && match.community.smoothed >= 4.0) reasons.push({ code: 'community', strength: Math.min(1, match.community.smoothed / 5), detail: match.community });

        // Mismatches
        if (d.typeSigned <= mismatchThreshold && type) reasons.push({ code: 'type_mismatch', strength: Math.min(1, -d.typeSigned), detail: Object.assign({ type }, ev) });
        if (d.brewerySigned <= mismatchThreshold && brewery) reasons.push({ code: 'brewery_mismatch', strength: Math.min(1, -d.brewerySigned), detail: Object.assign({ brewery }, ev) });
        if (match.dislikedFlavors && match.dislikedFlavors.length && d.flavorSigned <= -0.15) reasons.push({ code: 'flavor_mismatch', strength: Math.min(1, 0.5 - d.flavorSigned), detail: Object.assign({ flavors: match.dislikedFlavors }, ev) });
        if (d.abvScore <= 0.35 && ev.idealAbv !== null && match.abv !== null) reasons.push({ code: 'abv_mismatch', strength: 1 - d.abvScore, detail: Object.assign({ beerAbv: match.abv }, ev) });

        reasons.sort((a, b) => b.strength - a.strength);
        return reasons.slice(0, this.config.output.maxReasons);
    };

    BrewBrother.prototype.recommend = async function (adapter, manualProfile = null, runtimeOpts = {}) {
        const cfg = this.config;
        const profile = manualProfile || await this.buildProfile(adapter);
        const rawCandidates = await adapter.getCandidates();
        const candidates = Array.isArray(rawCandidates) ? rawCandidates : [];
        const drunkIdsRaw = await adapter.getDrunkIds();
        const drunkIds = (drunkIdsRaw && typeof drunkIdsRaw.has === 'function')
            ? drunkIdsRaw
            : new Set(Array.isArray(drunkIdsRaw) ? drunkIdsRaw.map(String) : []);
        const dislikedSet = new Set(Array.isArray(profile.dislikedIds) ? profile.dislikedIds.map(String) : []);

        const seed = runtimeOpts.seed || 0;
        const diversityRatio = runtimeOpts.diversityLevel !== undefined
            ? clamp(Number(runtimeOpts.diversityLevel) / 100, 0, 1)
            : 0.65;
        const maxResults = runtimeOpts.maxResults || cfg.output.maxResults;

        const scored = [];
        candidates.forEach(beer => {
            if (!beer || beer.id === undefined || beer.id === null) return;
            const idStr = String(beer.id);
            if (drunkIds.has(idStr) || dislikedSet.has(idStr)) return;

            const match = this.scoreBeer(beer, profile, runtimeOpts);
            const reasons = this.buildReasons(beer, match, profile);
            match.reasons = reasons;
            match.reasonCodes = reasons.map(r => 'brewbrother_reason_' + r.code.replace('_mismatch', ''));

            const sortScore = match.total + (seed ? stableTieHash(idStr, seed) * 0.035 : stableTieHash(idStr, 1) * 0.002);
            scored.push(Object.assign({}, beer, { _brewBrotherMatch: match, _bbSortScore: sortScore }));
        });

        scored.sort((a, b) => b._bbSortScore - a._bbSortScore);

        // Diversity-aware selection (MMR with inter-beer similarity, style, brewery & country spread)
        const results = [];
        if (cfg.diversity.enabled && !runtimeOpts.noLimit) {
            const d = cfg.diversity;
            const typeCount = {}, breweryCount = {}, countryCount = {};
            const maxBrewery = diversityRatio >= 0.75 ? 1 : (diversityRatio >= 0.35 ? 2 : d.maxPerBrewery);
            const maxType = diversityRatio >= 0.75 ? 3 : (diversityRatio >= 0.35 ? 4 : d.maxPerType);
            const mmrPenalty = 0.04 + diversityRatio * 0.16;
            const pool = scored.slice(0, Math.max(250, maxResults * 12));

            while (results.length < maxResults && pool.length > 0) {
                let bestIdx = -1, bestVal = -Infinity;
                for (let i = 0; i < pool.length; i++) {
                    const c = pool[i];
                    const tKey = String(c.type || '').trim().toLowerCase();
                    const bKey = String(c.brewery || '').trim().toLowerCase();
                    const cKey = String(c.searchCountry || c.countryCode || '').trim().toLowerCase();

                    if (maxBrewery > 0 && bKey && (breweryCount[bKey] || 0) >= maxBrewery) continue;
                    if (maxType > 0 && tKey && (typeCount[tKey] || 0) >= maxType) continue;

                    let val = c._bbSortScore;
                    val -= (d.typePenalty * (0.5 + diversityRatio)) * (typeCount[tKey] || 0);
                    val -= (d.breweryPenalty * (0.5 + diversityRatio)) * (breweryCount[bKey] || 0);
                    if (cKey) val -= (0.015 * diversityRatio) * (countryCount[cKey] || 0);

                    if (results.length > 0 && diversityRatio > 0.1) {
                        let maxSim = 0;
                        const recentStart = Math.max(0, results.length - 8);
                        for (let j = recentStart; j < results.length; j++) {
                            const s = beerSimilarity(c, results[j]);
                            if (s > maxSim) maxSim = s;
                        }
                        val -= mmrPenalty * maxSim;
                    }

                    if (val > bestVal) { bestVal = val; bestIdx = i; }
                }

                if (bestIdx === -1) {
                    while (results.length < maxResults && pool.length > 0) results.push(pool.shift());
                    break;
                }

                const chosen = pool.splice(bestIdx, 1)[0];
                results.push(chosen);
                const t = String(chosen.type || '').trim().toLowerCase();
                const b = String(chosen.brewery || '').trim().toLowerCase();
                const ct = String(chosen.searchCountry || chosen.countryCode || '').trim().toLowerCase();
                if (t) typeCount[t] = (typeCount[t] || 0) + 1;
                if (b) breweryCount[b] = (breweryCount[b] || 0) + 1;
                if (ct) countryCount[ct] = (countryCount[ct] || 0) + 1;
            }
        } else {
            results.push(...(runtimeOpts.noLimit ? scored : scored.slice(0, maxResults)));
        }

        results.forEach((item, i) => {
            delete item._bbSortScore;
            item._brewBrotherMatch.rank = i + 1;
        });
        return { results, profile, drinkCounts: this.lastDrinkCounts || this.lastFeedbackCounts };
    };

    BrewBrother.prototype.invalidateProfile = function () {
        this.lastProfile = null;
    };

    BrewBrother.prototype.getProfile = function () { return this.lastProfile; };
    BrewBrother.prototype.getDrinkCount = function (beerId) {
        const counts = this.lastDrinkCounts || this.lastFeedbackCounts;
        if (!counts) return 0;
        const key = String(beerId);
        if (typeof counts.get === 'function') return counts.get(key) || 0;
        return counts[key] || 0;
    };

    /**
     * Find beers similar to `targetBeer` among `candidates`.
     * @param {Object} targetBeer  - The reference beer.
     * @param {Array}  candidates  - Full beer catalogue.
     * @param {Object} [opts]      - { limit: 5, minScore: 0.70 }
     * @returns {Array<{beer, score}>} sorted by score desc.
     */
    function findSimilarBeers(targetBeer, candidates, opts) {
        opts = opts || {};
        var limit    = opts.limit    || 5;
        var minScore = opts.minScore != null ? opts.minScore : 0.70;
        if (!targetBeer || !Array.isArray(candidates)) return [];

        var scored = [];
        for (var i = 0; i < candidates.length; i++) {
            var c = candidates[i];
            if (!c || String(c.id) === String(targetBeer.id)) continue;
            var s = beerSimilarity(targetBeer, c);
            if (s >= minScore) scored.push({ beer: c, score: s });
        }
        scored.sort(function(a, b) { return b.score - a.score; });
        return scored.slice(0, limit);
    }

    BrewBrother.DEFAULTS = DEFAULTS;
    BrewBrother.FLAVOR_LEXICON = FLAVOR_LEXICON;
    BrewBrother.FLAVOR_KEYWORDS = Object.keys(FLAVOR_LEXICON);
    BrewBrother.utils = { extractFlavors, beerSimilarity, parseAbv, findSimilarBeers, mapWheelAromasToFlavors };

    if (typeof module !== 'undefined' && module.exports) module.exports = BrewBrother;
    else { 
        root.BrewBrother = BrewBrother; 
        root.Recommender = BrewBrother; 
    }

})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);

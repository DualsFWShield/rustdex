// recommendation.js — Bridge for BrewBrother
import * as Storage from './storage.js';

let engine = null;
let lastAllBeers = [];

export const MOOD_PRESETS = {
    auto: { id: 'auto', icon: '🎯', labelFr: 'Mon Profil', labelEn: 'My Profile' },
    refreshing: {
        id: 'refreshing', icon: '☀️', labelFr: 'Légère & Fraîche', labelEn: 'Crisp & Light',
        types: ['Pils', 'Lager', 'Blanche', 'Witbier', 'Saison'],
        flavors: ['citrus', 'floral', 'dry', 'wheat', 'herbal'],
        idealAbv: 4.8
    },
    cozy: {
        id: 'cozy', icon: '🔥', labelFr: 'Costaud & Réconfort', labelEn: 'Rich & Strong',
        types: ['Trappiste', 'Quadrupel', 'Triple', 'Stout', 'Brune', 'Barleywine'],
        flavors: ['caramel', 'chocolate', 'coffee', 'roasted', 'vanilla', 'woody'],
        idealAbv: 9.2
    },
    fruity: {
        id: 'fruity', icon: '🍓', labelFr: 'Fruitée & Acidulée', labelEn: 'Fruity & Tart',
        types: ['Fruitée', 'Kriek', 'Lambic', 'Gueuze', 'Sour', 'Framboise'],
        flavors: ['fruity', 'redFruits', 'tropical', 'sour', 'sweet'],
        idealAbv: 5.5
    },
    hoppy: {
        id: 'hoppy', icon: '🌿', labelFr: 'Houblon & IPA', labelEn: 'Hoppy & IPA',
        types: ['IPA', 'NEIPA', 'Pale Ale', 'APA'],
        flavors: ['hoppy', 'citrus', 'tropical', 'resinous', 'bitter'],
        idealAbv: 6.5
    },
    hidden_gem: {
        id: 'hidden_gem', icon: '💎', labelFr: 'Pépites Cachées', labelEn: 'Hidden Gems',
        preferRare: true
    }
};

export const Recommendation = {
    MOOD_PRESETS,

    init: function(allBeers) {
        if (!window.BrewBrother) {
            console.error("BrewBrother script not loaded!");
            return;
        }
        if (!engine) engine = new window.BrewBrother();
        lastAllBeers = allBeers || [];
    },

    invalidateProfile: function() {
        if (engine && typeof engine.invalidateProfile === 'function') {
            engine.invalidateProfile();
        }
    },

    // Bridge adapter for BrewBrother
    createAdapter: function(allBeers) {
        const beers = allBeers || lastAllBeers || [];
        const beerById = (window.beerMap && window.beerMap.size === beers.length)
            ? window.beerMap
            : new Map(beers.map(b => [String(b.id), b]));
        return {
            getFeedback: async () => {
                const feedback = [];
                const userData = Storage.getAllUserData();
                for (const id in userData) {
                    const u = userData[id];
                    if (!u) continue;
                    const beer = beerById.get(String(id));
                    if (!beer) continue;

                    let weight = 0;
                    if (u.count > 0) weight += 1.0;
                    if (u.favorite === true) weight += 3.0;

                    if (u.score !== undefined && u.score !== '') {
                        const scoreNum = parseFloat(u.score);
                        if (!isNaN(scoreNum)) {
                            if (scoreNum >= 15) weight += 1.8;
                            else if (scoreNum >= 12) weight += 1.0;
                            else if (scoreNum >= 10) weight += 0.4;
                            else weight -= 1.2;
                        }
                    }

                    if (weight !== 0) {
                        let timestamp = Date.now();
                        if (u.history && u.history.length > 0) {
                            const last = new Date(u.history[u.history.length - 1].date).getTime();
                            if (!isNaN(last)) timestamp = last;
                        }
                        const count = parseInt(u.count, 10) || 1;
                        feedback.push({
                            beer,
                            weight,
                            timestamp,
                            count,
                            rating: u.score,
                            aromas: Array.isArray(u.aromas) ? u.aromas : []
                        });
                    }
                }
                return feedback;
            },
            getExplicitFeedback: async () => {
                return typeof Storage.getBrewBrotherFeedback === 'function'
                    ? Storage.getBrewBrotherFeedback()
                    : { liked: [], disliked: [] };
            },
            getCandidates: async () => {
                return beers;
            },
            getDrunkIds: async () => {
                const drunk = new Set();
                const userData = Storage.getAllUserData();
                for (const id in userData) {
                    if (userData[id] && userData[id].count > 0) {
                        drunk.add(String(id));
                    }
                }
                return drunk;
            },
            getDrinkCounts: async () => {
                const counts = {};
                const userData = Storage.getAllUserData();
                for (const id in userData) {
                    if (userData[id] && userData[id].count > 0) {
                        counts[String(id)] = parseInt(userData[id].count, 10) || 1;
                    }
                }
                return counts;
            }
        };
    },

    getRecommendedBeers: async function(allBeers, options = {}) {
        if (!engine) this.init(allBeers);
        else if (allBeers) lastAllBeers = allBeers;

        const adapter = this.createAdapter(allBeers || lastAllBeers);

        const explorationLevel = options.explorationLevel !== undefined
            ? Number(options.explorationLevel)
            : Storage.getPreference('brewbrother_exploration', 35);
        const diversityLevel = options.diversityLevel !== undefined
            ? Number(options.diversityLevel)
            : Storage.getPreference('brewbrother_diversity', 65);

        let targetProfile = null;
        let preferRare = false;

        if (options.mode === 'manual' && options.manualPrefs) {
            targetProfile = {
                typeAffinity: {},
                breweryAffinity: {},
                flavorAffinity: {},
                countryAffinity: {},
                idealAbv: (!isNaN(options.manualPrefs.idealAbv) && options.manualPrefs.idealAbv > 0) ? options.manualPrefs.idealAbv : null,
                confidence: 1.0
            };
            if (Array.isArray(options.manualPrefs.types)) {
                options.manualPrefs.types.forEach(t => { targetProfile.typeAffinity[t] = 1.0; });
            }
            if (Array.isArray(options.manualPrefs.flavors)) {
                options.manualPrefs.flavors.forEach(f => { targetProfile.flavorAffinity[f] = 1.0; });
            }
            const baseProfile = await engine.buildProfile(adapter);
            targetProfile.dislikedIds = baseProfile.dislikedIds || [];
            targetProfile.negativeAnchors = baseProfile.negativeAnchors || [];
        } else if (options.mood && options.mood !== 'auto' && MOOD_PRESETS[options.mood]) {
            const mood = MOOD_PRESETS[options.mood];
            const baseProfile = await engine.buildProfile(adapter);
            preferRare = Boolean(mood.preferRare);

            if (mood.types || mood.flavors || mood.idealAbv) {
                const blendedTypes = {};
                Object.entries(baseProfile.typeAffinity || {}).forEach(([k, v]) => { blendedTypes[k] = v * 0.35; });
                (mood.types || []).forEach(t => { blendedTypes[t] = Math.min(1, (blendedTypes[t] || 0) + 0.85); });

                const blendedFlavors = {};
                Object.entries(baseProfile.flavorAffinity || {}).forEach(([k, v]) => { blendedFlavors[k] = v * 0.35; });
                (mood.flavors || []).forEach(f => { blendedFlavors[f] = Math.min(1, (blendedFlavors[f] || 0) + 0.85); });

                targetProfile = {
                    ...baseProfile,
                    typeAffinity: blendedTypes,
                    flavorAffinity: blendedFlavors,
                    idealAbv: mood.idealAbv || baseProfile.idealAbv,
                    confidence: Math.max(baseProfile.confidence || 0, 0.75)
                };
            } else {
                targetProfile = baseProfile;
            }
        }

        const runtimeOpts = {
            explorationLevel,
            diversityLevel,
            seed: options.seed || 0,
            preferRare,
            noLimit: Boolean(options.noLimit),
            maxResults: options.limit || 20
        };

        // Pre-filter by location when requested so MMR picks the best 20 inside that zone
        let recommendAdapter = adapter;
        if ((options.country && options.country !== 'All') || (options.region && options.region !== 'All')) {
            const baseCandidates = await adapter.getCandidates();
            const locCandidates = baseCandidates.filter(b => {
                if (options.country && options.country !== 'All' && b.searchCountry !== options.country) return false;
                if (options.region && options.region !== 'All' && b.searchRegion !== options.region) return false;
                return true;
            });
            recommendAdapter = { ...adapter, getCandidates: async () => locCandidates };
        }

        const { results } = await engine.recommend(recommendAdapter, targetProfile, runtimeOpts);
        const filteredResults = results || [];
        return options.noLimit ? filteredResults : filteredResults.slice(0, options.limit || 20);
    },

    getBeerMatchScore: async function(beer, allBeers) {
        if (!engine) this.init(allBeers || lastAllBeers);
        else if (allBeers) lastAllBeers = allBeers;

        const adapter = this.createAdapter(allBeers || lastAllBeers);
        let profile = engine.getProfile();
        if (!profile) {
            profile = await engine.buildProfile(adapter);
        }
        const explorationLevel = Storage.getPreference('brewbrother_exploration', 35);
        const match = engine.scoreBeer(beer, profile, { explorationLevel });
        const reasons = engine.buildReasons(beer, match, profile);
        match.reasons = reasons;
        match.reasonCodes = reasons.map(r => 'brewbrother_reason_' + r.code.replace('_mismatch', ''));
        return match;
    },

    getBeerMatchScoreSync: function(beer) {
        if (!engine) return null;
        const profile = engine.getProfile();
        if (!profile) return null;

        const explorationLevel = Storage.getPreference('brewbrother_exploration', 35);
        const match = engine.scoreBeer(beer, profile, { explorationLevel });
        return match;
    },

    getUserTasteProfile: async function(allBeers) {
        if (!engine) this.init(allBeers);
        else if (allBeers) lastAllBeers = allBeers;
        
        const adapter = this.createAdapter(allBeers || lastAllBeers);
        const profile = await engine.buildProfile(adapter);
        
        // Determine Archetype
        let archetype = "archetype_novice"; // default
        let archetypeIcon = "🍺";
        
        const sortedTypes = Object.entries(profile.typeAffinity || {}).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]);
        const sortedBreweries = Object.entries(profile.breweryAffinity || {}).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]);
        const sortedFlavors = Object.entries(profile.flavorAffinity || {}).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]);
        const sortedCountries = Object.entries(profile.countryAffinity || {}).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]);

        const topType = sortedTypes[0];
        const topFlavor = sortedFlavors[0];
        
        const distinctBeers = profile.distinctBeers || 0;
        const totalDrinks = profile.totalDrinks || 0;
        const idealAbv = profile.idealAbv || 0;
        
        if (distinctBeers >= 15 && (!topType || topType[1] < 0.35)) {
            archetype = "archetype_explorer"; archetypeIcon = "🧭";
        } else if (idealAbv > 0 && idealAbv <= 5.5 && totalDrinks >= 5) {
            archetype = "archetype_session"; archetypeIcon = "🍻";
        } else if (idealAbv >= 8.5 && totalDrinks >= 5) {
            archetype = "archetype_strong"; archetypeIcon = "💪";
        } else if (topType && topType[1] > 0.3 && topType[0].toLowerCase().includes('ipa')) {
            archetype = "archetype_hophead"; archetypeIcon = "🌿";
        } else if (topType && topType[1] > 0.3 && (topType[0].toLowerCase().includes('stout') || topType[0].toLowerCase().includes('porter'))) {
            archetype = "archetype_stout_lover"; archetypeIcon = "☕";
        } else if (topType && topType[1] > 0.3 && (topType[0].toLowerCase().includes('trappist') || topType[0].toLowerCase().includes('abbaye') || topType[0].toLowerCase().includes('quadrupel'))) {
            archetype = "archetype_trappist"; archetypeIcon = "⛪";
        } else if ((topType && topType[1] > 0.3 && (topType[0].toLowerCase().includes('fruit') || topType[0].toLowerCase().includes('kriek'))) || (topFlavor && topFlavor[0] === 'fruity' && topFlavor[1] > 0.4)) {
            archetype = "archetype_fruity"; archetypeIcon = "🍓";
        } else if ((topType && topType[1] > 0.3 && (topType[0].toLowerCase().includes('sour') || topType[0].toLowerCase().includes('gueuze') || topType[0].toLowerCase().includes('lambic'))) || (topFlavor && topFlavor[0] === 'sour' && topFlavor[1] > 0.4)) {
            archetype = "archetype_sour"; archetypeIcon = "🍋";
        } else if (topType && topType[1] > 0.4 && (topType[0].toLowerCase().includes('pils') || topType[0].toLowerCase().includes('lager') || topType[0].toLowerCase() === 'blonde')) {
            archetype = "archetype_classic"; archetypeIcon = "👑";
        } else if (topFlavor && topFlavor[1] > 0.4 && (topFlavor[0] === 'sweet' || topFlavor[0] === 'caramel' || topFlavor[0] === 'chocolate')) {
            archetype = "archetype_sweet"; archetypeIcon = "🍫";
        } else if (topFlavor && topFlavor[1] > 0.4 && topFlavor[0] === 'bitter') {
            archetype = "archetype_bitter"; archetypeIcon = "😠";
        } else if (topFlavor && topFlavor[1] > 0.5) {
            archetype = "archetype_flavorful"; archetypeIcon = "👅";
        } else if (distinctBeers >= 5) {
            archetype = "archetype_curious"; archetypeIcon = "🧐";
        }

        return {
            profile,
            archetype,
            archetypeIcon,
            confidencePct: Math.round((profile.confidence || 0) * 100),
            topTypes: sortedTypes.slice(0, 5),
            topBreweries: sortedBreweries.slice(0, 5),
            topFlavors: sortedFlavors.slice(0, 5),
            topCountries: sortedCountries.slice(0, 5)
        };
    },

    /**
     * Return up to `limit` beers similar to `targetBeer` (score >= minScore).
     * @param {Object} targetBeer
     * @param {Object} [opts] { limit: 5, minScore: 0.70, allBeers?: [] }
     * @returns {Array<{beer, score}>}
     */
    getSimilarBeers: function(targetBeer, opts) {
        opts = opts || {};
        const beers = opts.allBeers || lastAllBeers || [];
        if (!window.BrewBrother || !window.BrewBrother.utils || !window.BrewBrother.utils.findSimilarBeers) {
            console.warn('BrewBrother.utils.findSimilarBeers not available');
            return [];
        }
        return window.BrewBrother.utils.findSimilarBeers(targetBeer, beers, {
            limit: opts.limit || 5,
            minScore: opts.minScore != null ? opts.minScore : 0.70
        });
    }
};

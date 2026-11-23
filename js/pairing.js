/**
 * pairing.js — Moteur d'Accords Mets & Bières (hors-ligne, FR / EN)
 * Analyse style, degré d'alcool, vieillissement en fût, ingrédients et arômes.
 */

import { i18n } from './i18n.js';
import * as Utils from './utils.js';

const PAIRING_PROFILES = [
    {
        id: 'stout',
        match: (t) => /(stout|porter|imperial|black ipa|schwarz|dunkel)/i.test(t),
        glass: { fr: 'Snifter / Calice', en: 'Snifter / Tulip' },
        temp: '10–13°C',
        cheeses: {
            fr: ['Stilton bleu', 'Cheddar affiné', 'Comté 24 mois'],
            en: ['Blue Stilton', 'Aged Cheddar', '24-month Comté']
        },
        mains: {
            fr: ['Huîtres fraîches', 'Carbonnade ou bœuf braisé', 'Travers de porc BBQ fumés'],
            en: ['Fresh oysters', 'Braised beef stew', 'Smoked BBQ ribs']
        },
        desserts: {
            fr: ['Fondant au chocolat noir', 'Tiramisu café', 'Crème brûlée vanille'],
            en: ['Dark chocolate lava cake', 'Coffee tiramisu', 'Vanilla crème brûlée']
        },
        tip: {
            fr: 'Les notes torréfiées répondent aux saveurs grillées et subliment le chocolat noir.',
            en: 'Roasted malt notes mirror charred flavors and elevate rich dark chocolate.'
        }
    },
    {
        id: 'ipa',
        match: (t) => /(ipa|apa|pale ale|neipa|hop|houblon)/i.test(t),
        glass: { fr: 'Verre IPA / Tulipe', en: 'IPA Glass / Tulip' },
        temp: '6–9°C',
        cheeses: {
            fr: ['Gorgonzola crémeux', 'Cheddar fort', 'Feta marinée'],
            en: ['Creamy Gorgonzola', 'Sharp Cheddar', 'Marinated Feta']
        },
        mains: {
            fr: ['Burger smashé cheddar', 'Curry thaï épicé', 'Tacos poisson & citron vert'],
            en: ['Smash burger with cheddar', 'Spicy Thai curry', 'Crispy fish & lime tacos']
        },
        desserts: {
            fr: ['Carrot cake épicé', 'Tarte au citron meringuée', 'Cheesecake mangue-passion'],
            en: ['Spiced carrot cake', 'Lemon meringue pie', 'Mango passion cheesecake']
        },
        tip: {
            fr: 'L’amertume et les agrumes du houblon tranchent le gras et relèvent les plats épicés.',
            en: 'Hop bitterness and citrus aromas cut through richness and brighten spicy dishes.'
        }
    },
    {
        id: 'lambic',
        match: (t) => /(lambic|gueuze|geuze|kriek|sour|gose|berliner|fruit|framboise|cerise|pêche|peche)/i.test(t),
        glass: { fr: 'Flûte / Verre droit', en: 'Flute / Straight Tumbler' },
        temp: '5–8°C',
        cheeses: {
            fr: ['Chèvre frais aux herbes', 'Brie de Meaux', 'Camembert crémeux'],
            en: ['Fresh herbed goat cheese', 'Brie de Meaux', 'Creamy Camembert']
        },
        mains: {
            fr: ['Moules-frites classiques', 'Magret de canard aux cerises', 'Ceviche de daurade'],
            en: ['Classic steamed mussels', 'Duck breast with cherries', 'Sea bream ceviche']
        },
        desserts: {
            fr: ['Tarte aux fruits rouges', 'Panna cotta framboise', 'Chocolat noir 70%'],
            en: ['Red berry tart', 'Raspberry panna cotta', '70% dark chocolate']
        },
        tip: {
            fr: 'L’acidité vive nettoie le palais comme un vin blanc sec ou un trait de citron.',
            en: 'Crisp acidity cleanses the palate like a dry white wine or fresh squeeze of lemon.'
        }
    },
    {
        id: 'wheat',
        match: (t) => /(blanche|wit|witbier|weizen|hefe|wheat|froment)/i.test(t),
        glass: { fr: 'Grand verre évasé', en: 'Tall Weizen Glass' },
        temp: '4–7°C',
        cheeses: {
            fr: ['Mozzarella di Bufala', 'Ricotta citronnée', 'Chèvre doux'],
            en: ['Buffalo Mozzarella', 'Lemon Ricotta', 'Mild Goat Cheese']
        },
        mains: {
            fr: ['Salade César grillée', 'Poisson blanc sauce citron', 'Sushi & sashimi'],
            en: ['Grilled Caesar salad', 'Lemon-butter white fish', 'Sushi & sashimi']
        },
        desserts: {
            fr: ['Salade d’agrumes', 'Crêpe sucre-citron', 'Sorbet poire ou pamplemousse'],
            en: ['Citrus fruit salad', 'Lemon-sugar crêpe', 'Pear or grapefruit sorbet']
        },
        tip: {
            fr: 'Fraîcheur du blé, coriandre et écorces d’orange : idéale sur des mets légers et iodés.',
            en: 'Crisp wheat, coriander and orange peel pair effortlessly with light seafood and salads.'
        }
    },
    {
        id: 'tripel',
        match: (t) => /(tripel|triple|trappiste.*blond|abbaye.*blond|strong golden|duvel)/i.test(t),
        glass: { fr: 'Calice / Tulipe belge', en: 'Belgian Chalice / Tulip' },
        temp: '7–10°C',
        cheeses: {
            fr: ['Gruyère d’alpage', 'Chimay Grand Classique', 'Epoisses affiné'],
            en: ['Alpine Gruyère', 'Abbey Semi-Hard Cheese', 'Aged Époisses']
        },
        mains: {
            fr: ['Vol-au-vent de volaille', 'Asperges blanches sauce mousseline', 'Coquilles Saint-Jacques poêlées'],
            en: ['Creamy chicken vol-au-vent', 'White asparagus mousseline', 'Pan-seared scallops']
        },
        desserts: {
            fr: ['Sabayon à la bière blonde', 'Tarte Tatin caramélisée', 'Financier aux amandes'],
            en: ['Belgian ale sabayon', 'Caramelized Tarte Tatin', 'Almond financier']
        },
        tip: {
            fr: 'Sa forte effervescence et ses esters fruités allègent les sauces crémées et fromages affinés.',
            en: 'Lively carbonation and fruity yeast esters lift creamy sauces and rich aged cheeses.'
        }
    },
    {
        id: 'dubbel_quad',
        match: (t) => /(dubbel|double|quad|quadrupel|brune|brun|scotch|wee heavy|barleywine)/i.test(t),
        glass: { fr: 'Calice / Ballon', en: 'Chalice / Snifter' },
        temp: '10–13°C',
        cheeses: {
            fr: ['Roquefort', 'Mimolette vieille', 'Taleggio'],
            en: ['Roquefort', 'Aged Mimolette', 'Taleggio']
        },
        mains: {
            fr: ['Carbonnade flamande', 'Gibier sauce aux pruneaux', 'Risotto aux champignons des bois'],
            en: ['Flemish beef carbonnade', 'Game with prune glaze', 'Wild mushroom risotto']
        },
        desserts: {
            fr: ['Mousse au spéculoos', 'Tarte aux noix de pécan', 'Poire pochée au caramel'],
            en: ['Speculoos mousse', 'Pecan pie', 'Caramel poached pear']
        },
        tip: {
            fr: 'Les sucres caramélisés et fruits secs font écho aux plats mijotés et desserts aux épices.',
            en: 'Caramelized malts and dried fruit notes resonate with slow-braised stews and spiced desserts.'
        }
    },
    {
        id: 'saison',
        match: (t) => /(saison|farmhouse|grisette|biere de garde|bière de garde)/i.test(t),
        glass: { fr: 'Tulipe élancée', en: 'Tall Tulip' },
        temp: '6–9°C',
        cheeses: {
            fr: ['Tomme de Savoie', 'Saint-Nectaire', 'Reblochon'],
            en: ['Tomme de Savoie', 'Saint-Nectaire', 'Reblochon']
        },
        mains: {
            fr: ['Poulet rôti aux herbes', 'Truite aux amandes', 'Quiche poireaux-lardons'],
            en: ['Herb-roasted chicken', 'Almond trout', 'Leek & bacon tart']
        },
        desserts: {
            fr: ['Tarte aux abricots', 'Pêche rôtie au miel', 'Madeleine citron'],
            en: ['Apricot tart', 'Honey-roasted peach', 'Lemon madeleine']
        },
        tip: {
            fr: 'Sèche, poivrée et rustique : un caméléon gastronomique de l’apéritif au fromage.',
            en: 'Dry, peppery and rustic: a versatile table companion from starters through the cheese board.'
        }
    },
    {
        id: 'amber',
        match: (t) => /(ambr|amber|bock|marzen|märzen|rousse|red ale|vienna)/i.test(t),
        glass: { fr: 'Tulipe / Chope', en: 'Tulip / Stein' },
        temp: '7–10°C',
        cheeses: {
            fr: ['Gouda vieux', 'Edam affiné', 'Beaufort'],
            en: ['Aged Gouda', 'Matured Edam', 'Beaufort']
        },
        mains: {
            fr: ['Poulet rôti & frites', 'Saucisse grillée moutarde à l’ancienne', 'Burger oignons caramélisés'],
            en: ['Roast chicken & fries', 'Grilled sausage with wholegrain mustard', 'Caramelized onion burger']
        },
        desserts: {
            fr: ['Gaufre de Liège tiède', 'Crème caramel', 'Pudding au pain'],
            en: ['Warm Liège waffle', 'Crème caramel', 'Bread pudding']
        },
        tip: {
            fr: 'La rondeur biscuit-caramel amplifie les réactions de Maillard des viandes rôties.',
            en: 'Toasty caramel maltiness complements the Maillard crust on roasted meats and cheeses.'
        }
    },
    {
        id: 'spiced_christmas',
        match: (t) => /(no[eë]l|winter|hiver|épice|epice|spice|cannelle|miel)/i.test(t),
        glass: { fr: 'Calice', en: 'Chalice' },
        temp: '10–12°C',
        cheeses: {
            fr: ['Munster', 'Maroilles', 'Fourme d’Ambert'],
            en: ['Munster', 'Maroilles', 'Fourme d’Ambert']
        },
        mains: {
            fr: ['Dinde farcie aux marrons', 'Filet mignon au miel', 'Choucroute garnie'],
            en: ['Chestnut-stuffed turkey', 'Honey-glazed pork tenderloin', 'Braised sauerkraut platter']
        },
        desserts: {
            fr: ['Pain d’épices', 'Bûche chocolat-orange', 'Spéculoos artisanaux'],
            en: ['Gingerbread', 'Chocolate-orange yule log', 'Artisanal speculoos']
        },
        tip: {
            fr: 'Épices chaudes et chaleur d’alcool réclament des fromages puissants et plats festifs.',
            en: 'Warm winter spices stand up boldly to pungent washed-rind cheeses and festive roasts.'
        }
    },
    {
        id: 'pils_blonde',
        match: () => true,
        glass: { fr: 'Verre à Pils / Tulipe', en: 'Pilsner Glass / Tulip' },
        temp: '4–7°C',
        cheeses: {
            fr: ['Emmental', 'Gouda jeune', 'Crottin de Chavignol'],
            en: ['Emmental', 'Young Gouda', 'Chavignol Goat Cheese']
        },
        mains: {
            fr: ['Fish & Chips croustillant', 'Pizza Margherita', 'Tartare de saumon'],
            en: ['Crispy Fish & Chips', 'Pizza Margherita', 'Salmon tartare']
        },
        desserts: {
            fr: ['Tarte aux pommes fine', 'Biscuit sablé breton', 'Salade de poires'],
            en: ['Thin apple tart', 'Breton shortbread', 'Fresh pear salad']
        },
        tip: {
            fr: 'Désaltérante et équilibrée : parfaite sur les fritures légères et plats du quotidien.',
            en: 'Crisp and balanced: ideal alongside light fried dishes, pizza and everyday comfort food.'
        }
    }
];

function _parseAbv(raw) {
    if (!raw) return 5.5;
    const v = parseFloat(String(raw).replace('%', '').replace('°', '').replace(',', '.'));
    return isNaN(v) ? 5.5 : v;
}

/**
 * Compute offline food pairings for a beer and optional tasting rating/aromas.
 */
export function getFoodPairings(beer, userRating = {}) {
    const lang = i18n.getLanguage() === 'en' ? 'en' : 'fr';
    const haystack = `${beer?.type || ''} ${beer?.title || ''} ${beer?.ingredients || ''}`;
    const abv = _parseAbv(beer?.alcohol);
    const isNa = abv <= 0.6;

    const profile = PAIRING_PROFILES.find(p => p.match(haystack)) || PAIRING_PROFILES[PAIRING_PROFILES.length - 1];

    const cheeses = [...profile.cheeses[lang]];
    const mains = [...profile.mains[lang]];
    const desserts = [...profile.desserts[lang]];
    let tip = profile.tip[lang];
    let temp = profile.temp;

    if (isNa) {
        temp = '4–6°C';
        tip = lang === 'en'
            ? 'Ultra-refreshing without alcohol: great for lunches, salads, seafood and citrus notes.'
            : 'Ultra-rafraîchissante et sans alcool : parfaite sur les déjeuners légers, salades et agrumes.';
    } else if (beer?.barrel_aged) {
        cheeses[0] = lang === 'en' ? 'Aged Parmesan (36m)' : 'Parmesan affiné 36 mois';
        tip = lang === 'en'
            ? `${tip} Oak-barrel aging also welcomes smoked meats and dark chocolate.`
            : `${tip} Le passage en fût invite aussi les viandes fumées et le chocolat noir.`;
    } else if (abv >= 9 && !profile.id.match(/stout|dubbel|tripel/)) {
        temp = '9–12°C';
    }

    // Refine slightly using recorded aromas if present
    const aromas = Array.isArray(userRating?.aromas) ? userRating.aromas : [];
    if (aromas.some(a => /coffee|cocoa|roast|chocolate|chocolat|cafe/i.test(a))) {
        desserts[0] = lang === 'en' ? 'Espresso dark chocolate mousse' : 'Mousse chocolat noir & espresso';
    } else if (aromas.some(a => /citrus|agrume|tropical|fruit/i.test(a))) {
        mains[2] = lang === 'en' ? 'Citrus-glazed grilled prawns' : 'Gambas grillées aux agrumes';
    }

    return {
        profileId: profile.id,
        glass: profile.glass[lang],
        temperature: temp,
        cheeses,
        mains,
        desserts,
        tip
    };
}

/**
 * Render collapsible Food Pairing HTML block for Beer Detail modal.
 */
export function renderFoodPairingSection(beer, userRating = {}) {
    const lang = i18n.getLanguage() === 'en' ? 'en' : 'fr';
    const pairing = getFoodPairings(beer, userRating);

    const t = lang === 'en' ? {
        title: 'Food Pairings',
        temp: 'Serving Temp',
        glass: 'Glassware',
        cheeses: 'Cheeses',
        mains: 'Dishes',
        desserts: 'Desserts'
    } : {
        title: 'Accords Mets & Bières',
        temp: 'Service',
        glass: 'Verre conseillé',
        cheeses: 'Fromages',
        mains: 'Plats',
        desserts: 'Desserts'
    };

    const makeChips = (list) => list.map(item => `<span class="pairing-chip">${Utils.escapeHtml(item)}</span>`).join('');

    return `
        <details class="food-pairing-card">
            <summary class="food-pairing-summary">
                <span>🍽️ ${t.title}</span>
                <span class="food-pairing-meta">${pairing.temperature} • ${pairing.glass}</span>
            </summary>
            <div class="food-pairing-body">
                <div class="food-pairing-tip">💡 ${Utils.escapeHtml(pairing.tip)}</div>
                <div class="food-pairing-group">
                    <div class="food-pairing-label">🧀 ${t.cheeses}</div>
                    <div class="food-pairing-chips">${makeChips(pairing.cheeses)}</div>
                </div>
                <div class="food-pairing-group">
                    <div class="food-pairing-label">🍖 ${t.mains}</div>
                    <div class="food-pairing-chips">${makeChips(pairing.mains)}</div>
                </div>
                <div class="food-pairing-group">
                    <div class="food-pairing-label">🍫 ${t.desserts}</div>
                    <div class="food-pairing-chips">${makeChips(pairing.desserts)}</div>
                </div>
                <div class="food-pairing-service">
                    <span>🌡️ ${t.temp}: <strong>${pairing.temperature}</strong></span>
                    <span>🥂 ${t.glass}: <strong>${pairing.glass}</strong></span>
                </div>
            </div>
        </details>
    `;
}

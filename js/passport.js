/**
 * passport.js — Mode "Passeport Brassicole" par pays & régions
 * Utilise MAPS (map.js), Storage et window.allBeers.
 */

import * as MapModule from './map.js';
import * as Storage from './storage.js';
import * as Utils from './utils.js';
import { i18n } from './i18n.js';

const PASSPORT_SCOPES = ['be', 'fr', 'de', 'nl', 'us', 'co', 'kr', 'jp', 'cn'];

function _getRankBadge(tastedCount, totalCount, isEn) {
    const pct = totalCount > 0 ? (tastedCount / totalCount) * 100 : 0;
    if (tastedCount === 0) return { tier: 'none', icon: '⬜', label: isEn ? 'Unvisited' : 'À découvrir' };
    if (tastedCount >= 40 || pct >= 50) return { tier: 'plat', icon: '💎', label: isEn ? 'Brewmaster' : 'Maître Brasseur' };
    if (tastedCount >= 15 || pct >= 25) return { tier: 'gold', icon: '🥇', label: isEn ? 'Ambassador' : 'Ambassadeur' };
    if (tastedCount >= 5) return { tier: 'silver', icon: '🥈', label: isEn ? 'Traveler' : 'Voyageur' };
    return { tier: 'bronze', icon: '🥉', label: isEn ? 'Explorer' : 'Explorateur' };
}

export function buildPassportData(allBeers = [], userData = Storage.getAllUserData()) {
    const isEn = i18n.getLanguage() === 'en';
    const countries = [];

    for (const scope of PASSPORT_SCOPES) {
        const cfg = MapModule.MAPS[scope];
        if (!cfg) continue;
        const countryCode = cfg.countryCode;
        const regionNames = (isEn && cfg.names_en) ? cfg.names_en : (cfg.names || {});

        const scopeBeers = allBeers.filter(b => {
            if (b.countryCode) return b.countryCode.toUpperCase() === countryCode;
            if (b.province && cfg.names && cfg.names[b.province]) return true;
            return false;
        });

        let tastedCount = 0;
        const regionsTasted = new Map();
        const regionsTotal = new Map();

        for (const beer of scopeBeers) {
            const reg = beer.province || '';
            if (reg) regionsTotal.set(reg, (regionsTotal.get(reg) || 0) + 1);
            const u = userData[beer.id];
            if (u && u.count > 0) {
                tastedCount++;
                if (reg) regionsTasted.set(reg, (regionsTasted.get(reg) || 0) + 1);
            }
        }

        const total = scopeBeers.length;
        const pct = total > 0 ? Math.round((tastedCount / total) * 100) : 0;
        const rank = _getRankBadge(tastedCount, total, isEn);

        const regions = Object.keys(regionNames).map(code => ({
            code,
            name: regionNames[code],
            tasted: regionsTasted.get(code) || 0,
            total: regionsTotal.get(code) || 0
        })).sort((a, b) => b.tasted - a.tasted || b.total - a.total);

        countries.push({
            scope,
            countryCode,
            icon: cfg.icon,
            name: i18n.t(cfg.titleKey) || countryCode,
            tasted: tastedCount,
            total,
            pct,
            rank,
            regionsVisited: regions.filter(r => r.tasted > 0).length,
            regionsCount: regions.length,
            regions
        });
    }

    const totalStamped = countries.filter(c => c.tasted > 0).length;
    return { countries, totalStamped, totalCountries: countries.length };
}

export function openBeerPassport(allBeers = window.allBeers || []) {
    const isEn = i18n.getLanguage() === 'en';
    const userData = Storage.getAllUserData();
    const passport = buildPassportData(allBeers, userData);

    const T = isEn ? {
        title: 'Brewing Passport',
        subtitle: 'Collect stamps by tasting beers from each country and region.',
        stampsCount: `${passport.totalStamped} / ${passport.totalCountries} stamps unlocked`,
        regions: 'regions stamped',
        beers: 'beers tasted',
        close: 'Close',
        emptyRegion: 'No cataloged beers in this region yet'
    } : {
        title: 'Passeport Brassicole',
        subtitle: 'Collectionnez les tampons en dégustant les bières de chaque pays et région.',
        stampsCount: `${passport.totalStamped} / ${passport.totalCountries} tampons débloqués`,
        regions: 'régions tamponnées',
        beers: 'bières goûtées',
        close: 'Fermer',
        emptyRegion: 'Aucune bière cataloguée dans cette région'
    };

    const wrapper = document.createElement('div');
    wrapper.className = 'modal-content passport-modal';
    wrapper.style.maxWidth = '680px';

    const stampsHtml = passport.countries.map(c => {
        const stampedClass = c.tasted > 0 ? `is-stamped tier-${c.rank.tier}` : 'is-unvisited';
        const regionHtml = c.regions.map(r => {
            const regCls = r.tasted > 0 ? 'passport-reg-hit' : (r.total === 0 ? 'passport-reg-empty' : 'passport-reg-todo');
            return `<div class="passport-region-pill ${regCls}">
                <span>${Utils.escapeHtml(r.name)}</span>
                <strong>${r.total > 0 ? `${r.tasted}/${r.total}` : '—'}</strong>
            </div>`;
        }).join('');

        return `
            <details class="passport-card ${stampedClass}">
                <summary class="passport-card-head">
                    <div class="passport-flag">${c.icon}</div>
                    <div class="passport-meta">
                        <div class="passport-country-name">${Utils.escapeHtml(c.name)}</div>
                        <div class="passport-country-stats">${c.tasted}/${c.total} ${T.beers} (${c.pct}%) • ${c.regionsVisited}/${c.regionsCount} ${T.regions}</div>
                        <div class="passport-progress-track">
                            <div class="passport-progress-fill" style="width:${c.pct}%;"></div>
                        </div>
                    </div>
                    <div class="passport-stamp">
                        <span class="passport-stamp-icon">${c.rank.icon}</span>
                        <span class="passport-stamp-label">${Utils.escapeHtml(c.rank.label)}</span>
                    </div>
                </summary>
                <div class="passport-regions-grid">
                    ${regionHtml || `<div style="color:#888; font-size:0.8rem;">${T.emptyRegion}</div>`}
                </div>
            </details>
        `;
    }).join('');

    wrapper.innerHTML = `
        <div class="passport-header">
            <div>
                <h2>🛂 ${T.title}</h2>
                <p>${T.subtitle}</p>
            </div>
            <button type="button" id="btn-passport-close" class="setting-btn">✕</button>
        </div>
        <div class="passport-summary-pill">🏅 ${T.stampsCount}</div>
        <div class="passport-grid">${stampsHtml}</div>
        <button type="button" id="btn-passport-done" class="btn-cancel" style="width:100%; margin-top:14px;">${T.close}</button>
    `;

    wrapper.querySelector('#btn-passport-close').onclick = () => window.UI?.closeModal?.();
    wrapper.querySelector('#btn-passport-done').onclick = () => window.UI?.closeModal?.();

    window.UI?.openModal?.(wrapper);
}

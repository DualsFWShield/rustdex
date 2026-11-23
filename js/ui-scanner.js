/**
 * ui-scanner.js — Scanner Universel (QR / Code + Onglet OCR Étiquette & Recherche Pression)
 */

import { i18n } from './i18n.js';
import * as Storage from './storage.js';
import { loadQrScanner } from './vendor-loader.js';
import { renderOtaSyncModal } from './import-export.js';
import { renderLabelAndTapTab } from './label-scanner.js';
import {
    showToast,
    openModal,
    closeModal,
    setModalCleanup,
    showAlertModal
} from './ui-modals.js';

export async function openUniversalScanner() {
    const wrapper = document.createElement('div');
    wrapper.className = 'modal-content';
    wrapper.style.cssText = 'width: min(94%, 440px); padding: 20px; text-align: center; background: rgba(20, 20, 20, 0.96); border: 1px solid rgba(255, 215, 0, 0.25); border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8);';

    wrapper.innerHTML = `
        <h2 style="color:var(--accent-gold); margin-bottom:10px; font-family:'Russo One'; font-size:1.3rem; display:flex; align-items:center; justify-content:center; gap:8px;">
            <span>📷</span> Scanner Universel
        </h2>

        <div class="scanner-tabs" role="tablist">
            <button type="button" class="scanner-tab-btn is-active" data-tab="qr" role="tab">📷 QR &amp; Codes</button>
            <button type="button" class="scanner-tab-btn" data-tab="label" role="tab">🏷️ Étiquette &amp; Pression</button>
        </div>

        <div id="scanner-pane-qr">
            <p style="color:#aaa; font-size:0.82rem; margin-bottom:14px; line-height:1.4;">
                ${i18n.t('uni_scanner_desc')}
            </p>
            <div id="universal-reader" style="width: 100%; max-width: 280px; margin: 0 auto 15px auto; border-radius: 12px; overflow: hidden; background: #000; border: 2px solid rgba(255, 215, 0, 0.3); aspect-ratio: 1/1;"></div>

            <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 14px; margin-bottom: 15px; text-align: left;">
                <div style="font-size:0.8rem; color:#ddd; font-weight:700; margin-bottom:8px;">
                    <span>⌨️ ${i18n.t('uni_scanner_code_prompt')}</span>
                </div>
                <div style="margin-bottom:10px;">
                    <input type="text" id="universal-manual-code" placeholder="EX: A1B2C3" maxlength="15" style="width:100%; box-sizing:border-box; text-align:center; font-family:monospace; font-size:1.2rem; font-weight:bold; letter-spacing:3px; text-transform:uppercase; background:rgba(0,0,0,0.6); border:1px solid rgba(255,215,0,0.4); border-radius:10px; color:#fff; padding:10px;">
                </div>
                <div style="display:flex; gap:8px;">
                    <button type="button" id="btn-uni-join-party" class="btn-primary" style="flex:1; padding:10px 8px; font-size:0.82rem; background:linear-gradient(135deg, var(--accent-gold), var(--accent-amber)); color:#000; font-weight:bold; border:none; border-radius:10px; cursor:pointer;">
                        🍻 ${i18n.t('uni_btn_beerparty')}
                    </button>
                    <button type="button" id="btn-uni-join-draftsync" class="btn-primary" style="flex:1; padding:10px 8px; font-size:0.82rem; background:linear-gradient(135deg, #3b82f6, #1d4ed8); color:#fff; font-weight:bold; border:none; border-radius:10px; cursor:pointer;">
                        📡 ${i18n.t('uni_btn_draftsync')}
                    </button>
                </div>
            </div>
        </div>

        <div id="scanner-pane-label" class="hidden" style="text-align:left;"></div>

        <button id="btn-close-scanner" class="btn-cancel" style="width:100%; padding:10px; border-radius:20px; font-weight:bold; cursor:pointer; margin-top:8px;">${i18n.t('ota_btn_close')}</button>
    `;

    openModal(wrapper);

    let html5QrCode = null;
    let labelTabInitialized = false;

    const stopCameraOnly = async () => {
        if (html5QrCode && html5QrCode.isScanning) {
            try {
                await html5QrCode.stop();
                html5QrCode.clear();
            } catch (e) {
                console.warn(e);
            }
        }
    };

    const stopScanner = () => {
        stopCameraOnly();
        closeModal();
    };

    setModalCleanup(() => {
        stopCameraOnly();
    });

    wrapper.querySelector('#btn-close-scanner').onclick = stopScanner;

    const manualInput = wrapper.querySelector('#universal-manual-code');
    if (manualInput) {
        manualInput.addEventListener('input', () => {
            manualInput.value = manualInput.value.toUpperCase();
        });
    }

    const extractCleanCode = (inputVal) => {
        if (!inputVal) return '';
        return inputVal.trim()
            .replace(/^(DRAFTSYNC:|BEERDEX-OTA:|BEERDEX-PARTY:|PARTY:)/i, '')
            .trim()
            .toUpperCase();
    };

    const handleJoinParty = (codeToUse) => {
        const cleanCode = extractCleanCode(codeToUse);
        if (!cleanCode || cleanCode.length !== 6) {
            showToast(i18n.t('ota_code_length_error'), 'error');
            return;
        }
        stopScanner();
        window.UI?.renderMatchModal?.(window.allBeers || [], cleanCode);
    };

    const handleJoinDraftSync = (codeToUse) => {
        const cleanCode = extractCleanCode(codeToUse);
        if (!cleanCode || cleanCode.length !== 6) {
            showToast(i18n.t('ota_code_length_error'), 'error');
            return;
        }
        stopScanner();
        renderOtaSyncModal(null, 'join', cleanCode);
    };

    wrapper.querySelector('#btn-uni-join-party').onclick = () => handleJoinParty(manualInput ? manualInput.value : '');
    wrapper.querySelector('#btn-uni-join-draftsync').onclick = () => handleJoinDraftSync(manualInput ? manualInput.value : '');

    const showCodeChoiceModal = (detectedCode) => {
        const choiceWrapper = document.createElement('div');
        choiceWrapper.className = 'modal-dialog';
        choiceWrapper.style.maxWidth = '360px';
        choiceWrapper.style.textAlign = 'center';
        choiceWrapper.innerHTML = `
            <div class="dialog-icon">⚡</div>
            <h3 style="color:var(--accent-gold); font-family:'Russo One'; margin-bottom:8px;">${i18n.t('uni_room_detected', { code: detectedCode })}</h3>
            <p style="color:#ccc; font-size:0.85rem; margin-bottom:18px;">
                ${i18n.t('uni_room_choice_desc')}
            </p>
            <div style="display:flex; flex-direction:column; gap:10px;">
                <button id="choice-btn-party" class="btn-confirm" style="padding:12px; font-weight:bold; background:linear-gradient(135deg, var(--accent-gold), var(--accent-amber)); color:#000; border:none; border-radius:12px; cursor:pointer;">
                    ${i18n.t('uni_btn_join_beerparty')}
                </button>
                <button id="choice-btn-draftsync" class="btn-confirm" style="padding:12px; font-weight:bold; background:linear-gradient(135deg, #3b82f6, #1d4ed8); color:#fff; border:none; border-radius:12px; cursor:pointer;">
                    ${i18n.t('uni_btn_join_draftsync')}
                </button>
                <button id="choice-btn-cancel" class="btn-cancel" style="padding:10px; border-radius:12px; margin-top:5px; cursor:pointer;">
                    ${i18n.t('ota_btn_close')}
                </button>
            </div>
        `;
        openModal(choiceWrapper);
        choiceWrapper.querySelector('#choice-btn-party').onclick = () => {
            closeModal();
            window.UI?.renderMatchModal?.(window.allBeers || [], detectedCode);
        };
        choiceWrapper.querySelector('#choice-btn-draftsync').onclick = () => {
            closeModal();
            renderOtaSyncModal(null, 'join', detectedCode);
        };
        choiceWrapper.querySelector('#choice-btn-cancel').onclick = () => closeModal();
    };

    const startQrCamera = async () => {
        try { await loadQrScanner(); } catch {}
        if (!window.Html5Qrcode || !wrapper.isConnected) return;
        const readerEl = wrapper.querySelector('#universal-reader');
        if (!readerEl) return;

        html5QrCode = new window.Html5Qrcode('universal-reader');
        html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (text) => {
                const trimmed = text.trim();
                if (trimmed.startsWith('DRAFTSYNC:') || trimmed.startsWith('BEERDEX-OTA:')) {
                    const code = extractCleanCode(trimmed);
                    stopScanner();
                    renderOtaSyncModal(null, 'join', code);
                } else if (trimmed.startsWith('BEERDEX-PARTY:') || trimmed.startsWith('PARTY:')) {
                    const code = extractCleanCode(trimmed);
                    stopScanner();
                    window.UI?.renderMatchModal?.(window.allBeers || [], code);
                } else if (trimmed.startsWith('BEERDEX:')) {
                    stopScanner();
                    try {
                        const beerData = JSON.parse(trimmed.replace('BEERDEX:', ''));
                        if (Array.isArray(beerData)) {
                            beerData.forEach(b => {
                                if (!String(b.id).startsWith('CUSTOM_')) b.id = 'CUSTOM_' + b.id;
                                Storage.saveCustomBeer(b);
                            });
                            if (window.addImportedCustomBeers) window.addImportedCustomBeers(beerData);
                            showAlertModal(`${beerData.length} bières importées avec succès !`, { icon: '✅' });
                        } else {
                            window.UI?.renderSharedBeerModal?.(beerData, 'Scan QR');
                        }
                    } catch {
                        showAlertModal('Code QR invalide ou corrompu.', { icon: '❌' });
                    }
                } else if (extractCleanCode(trimmed).length === 6) {
                    const code = extractCleanCode(trimmed);
                    stopScanner();
                    showCodeChoiceModal(code);
                } else {
                    stopScanner();
                    showAlertModal('QR Code non reconnu par Beerdex.', { icon: '❓' });
                }
            },
            () => {}
        ).catch(() => {
            const box = wrapper.querySelector('#universal-reader');
            if (box) {
                box.innerHTML = '<div style="padding:30px 15px; color:#aaa; font-size:0.85rem;">📷 Caméra indisponible ou permission refusée. Utilisez un code manuel ou l’onglet Étiquette & Pression.</div>';
            }
        });
    };

    const qrPane = wrapper.querySelector('#scanner-pane-qr');
    const labelPane = wrapper.querySelector('#scanner-pane-label');

    wrapper.querySelectorAll('.scanner-tab-btn').forEach(tabBtn => {
        tabBtn.onclick = () => {
            const target = tabBtn.dataset.tab;
            wrapper.querySelectorAll('.scanner-tab-btn').forEach(b => b.classList.toggle('is-active', b === tabBtn));

            if (target === 'label') {
                qrPane.classList.add('hidden');
                labelPane.classList.remove('hidden');
                stopCameraOnly();

                if (!labelTabInitialized) {
                    labelTabInitialized = true;
                    renderLabelAndTapTab(labelPane, {
                        onSelectBeer: (beer) => {
                            stopScanner();
                            window.UI?.renderBeerDetail?.(beer, (ratingData) => {
                                window.UI?._saveRatingFromDetail?.(beer, ratingData, () => window.renderCurrentView?.());
                            });
                        },
                        onCreateManual: () => {
                            stopScanner();
                            window.UI?.renderAddBeerForm?.((newBeer) => {
                                Storage.saveCustomBeer(newBeer);
                                window.updateBeerInState?.(newBeer);
                                window.dispatchEvent(new CustomEvent('beerdex-action'));
                                closeModal();
                                showToast(i18n.t('toast_beer_added'));
                                window.renderCurrentView?.();
                            });
                        }
                    });
                }
            } else {
                labelPane.classList.add('hidden');
                qrPane.classList.remove('hidden');
                if (!html5QrCode || !html5QrCode.isScanning) {
                    startQrCamera();
                }
            }
        };
    });

    startQrCamera();
}

window.UI = window.UI || {};
window.UI.openUniversalScanner = openUniversalScanner;

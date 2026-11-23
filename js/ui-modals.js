/**
 * ui-modals.js — Modales, Toasts, Pile de navigation, Focus Trap & Rareté
 */

import { i18n } from './i18n.js';

export function getModalContainer() {
    return document.getElementById('modal-container');
}

const toastQueue = [];
let isToastActive = false;
let modalCleanup = null;
let previousFocusElement = null;
let _closingModalProgrammatically = false;

export const modalStack = [];

export function setModalCleanup(fn) {
    modalCleanup = typeof fn === 'function' ? fn : null;
}

/**
 * Kept as a no-op export for wasm-bindgen compatibility.
 */
export function updateNetworkStatus(isOnline) {
    // Handled by app.js handleStatusChange
}

export function showToast(message, type = 'default') {
    toastQueue.push({ message, type });
    processToastQueue();
}

function processToastQueue() {
    if (isToastActive || toastQueue.length === 0) return;

    isToastActive = true;
    const { message } = toastQueue.shift();

    const toast = document.createElement('div');
    toast.className = 'app-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '80px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'rgba(255, 192, 0, 0.9)';
    toast.style.color = '#000';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '20px';
    toast.style.fontWeight = 'bold';
    toast.style.zIndex = '1000';
    toast.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
    toast.innerText = message;

    document.body.appendChild(toast);

    toast.animate([
        { transform: 'translateX(-50%) translateY(20px)', opacity: 0 },
        { transform: 'translateX(-50%) translateY(0)', opacity: 1 }
    ], { duration: 300, easing: 'ease-out' });

    setTimeout(() => {
        const anim = toast.animate([
            { transform: 'translateX(-50%) translateY(0)', opacity: 1 },
            { transform: 'translateX(-50%) translateY(20px)', opacity: 0 }
        ], { duration: 300, easing: 'ease-in' });

        anim.onfinish = () => {
            toast.remove();
            isToastActive = false;
            setTimeout(processToastQueue, 300);
        };
    }, 3000);
}

function focusTrap(e) {
    const modalContainer = getModalContainer();
    if (!modalContainer) return;

    if (e.key === 'Escape') {
        closeModal();
        return;
    }
    if (e.key === 'Tab') {
        const focusableElements = modalContainer.querySelectorAll('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (focusableElements.length === 0) {
            e.preventDefault();
            return;
        }
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        } else if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        }
    }
}

window.addEventListener('popstate', (e) => {
    if (_closingModalProgrammatically) {
        _closingModalProgrammatically = false;
        return;
    }

    if (modalStack.length > 0) {
        const topModalClose = modalStack.pop();
        topModalClose(true);
        return;
    }

    const searchBar = document.getElementById('search-bar');
    if (searchBar && !searchBar.classList.contains('hidden')) {
        window.dispatchEvent(new CustomEvent('beerdex-close-search'));
        return;
    }

    if (e.state && e.state.isSearch) {
        window.history.back();
        return;
    }

    if (e.state && e.state.view) {
        const targetView = e.state.view;
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        const navBtn = document.querySelector(`.nav-item[data-view="${targetView}"]`);
        if (navBtn) navBtn.classList.add('active');
        window.dispatchEvent(new CustomEvent('beerdex-navigate-back', { detail: { view: targetView } }));
    }
});

export function closeModal(fromPopState = false) {
    const modalContainer = getModalContainer();

    if (modalCleanup) {
        modalCleanup();
        modalCleanup = null;
    }

    if (fromPopState !== true) {
        const idx = modalStack.indexOf(closeModal);
        if (idx > -1) modalStack.splice(idx, 1);

        if (window.history.state && window.history.state.isModal) {
            _closingModalProgrammatically = true;
            window.history.back();
        }
    }

    document.removeEventListener('keydown', focusTrap);

    if (modalContainer && document.activeElement && modalContainer.contains(document.activeElement)) {
        document.activeElement.blur();
    }

    if (previousFocusElement) {
        previousFocusElement.focus();
        previousFocusElement = null;
    }

    if (modalContainer) {
        modalContainer.classList.add('hidden');
        modalContainer.setAttribute('aria-hidden', 'true');
        modalContainer.innerHTML = '';
    }

    if (modalStack.length === 0) {
        document.body.classList.remove('modal-open');
    }
}

export function openModal(content) {
    const modalContainer = getModalContainer();
    if (!modalContainer) return;

    previousFocusElement = document.activeElement;

    modalContainer.innerHTML = '';
    modalContainer.appendChild(content);
    modalContainer.classList.remove('hidden');
    modalContainer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    window.history.pushState({ isModal: true, timestamp: Date.now() }, '');

    applyRarityAnimations(modalContainer);

    modalStack.push(closeModal);

    modalContainer.onclick = (e) => {
        if (e.target === modalContainer) closeModal();
    };

    document.addEventListener('keydown', focusTrap);

    setTimeout(() => {
        const focusableElements = modalContainer.querySelectorAll('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (focusableElements.length) focusableElements[0].focus();
    }, 10);
}

export function showPromptModal(title, defaultValue = '', opts = {}) {
    if (defaultValue && typeof defaultValue === 'object') {
        opts = defaultValue;
        defaultValue = opts.defaultValue || '';
    }
    return new Promise((resolve) => {
        const modalContainer = getModalContainer();
        const wrapper = document.createElement('div');
        wrapper.className = 'modal-dialog';
        wrapper.innerHTML = `
            <h3>${title}</h3>
            <input type="${opts.inputType || 'text'}" id="modal-prompt-input" class="form-input"
                   value="${defaultValue}" placeholder="${opts.placeholder || ''}">
            <div class="modal-dialog-actions">
                <button id="modal-prompt-cancel" class="btn-cancel" data-i18n="btn_cancel">Annuler</button>
                <button id="modal-prompt-ok" class="btn-confirm" data-i18n="btn_confirm">Confirmer</button>
            </div>
        `;

        openModal(wrapper);

        const input = wrapper.querySelector('#modal-prompt-input');
        input.focus();
        input.select();

        const finish = (val) => {
            if (modalContainer) modalContainer.onclick = null;
            closeModal();
            resolve(val);
        };

        wrapper.querySelector('#modal-prompt-ok').onclick = () => finish(input.value);
        wrapper.querySelector('#modal-prompt-cancel').onclick = () => finish(null);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') finish(input.value);
            if (e.key === 'Escape') finish(null);
        });

        if (modalContainer) {
            modalContainer.onclick = (e) => {
                if (e.target === modalContainer) finish(null);
            };
        }
    });
}

export function showConfirmModal(message, opts = {}) {
    return new Promise((resolve) => {
        const modalContainer = getModalContainer();
        const wrapper = document.createElement('div');
        wrapper.className = 'modal-dialog';

        const isDanger = opts.danger !== false;
        const icon = isDanger ? '⚠️' : 'ℹ️';
        const dangerClass = isDanger ? ' danger' : '';

        wrapper.innerHTML = `
            <div class="dialog-icon">${icon}</div>
            <p>${message}</p>
            <div class="modal-dialog-actions">
                <button id="modal-confirm-cancel" class="btn-cancel">${opts.cancelText || i18n.t('btn_cancel')}</button>
                <button id="modal-confirm-ok" class="btn-confirm${dangerClass}">${opts.confirmText || i18n.t('btn_confirm')}</button>
            </div>
        `;

        openModal(wrapper);

        const finish = (val) => {
            if (modalContainer) modalContainer.onclick = null;
            closeModal();
            resolve(val);
        };

        wrapper.querySelector('#modal-confirm-ok').onclick = () => finish(true);
        wrapper.querySelector('#modal-confirm-cancel').onclick = () => finish(false);
        if (modalContainer) {
            modalContainer.onclick = (e) => {
                if (e.target === modalContainer) finish(false);
            };
        }
    });
}

export function showAlertModal(message, opts = {}) {
    return new Promise((resolve) => {
        const modalContainer = getModalContainer();
        const wrapper = document.createElement('div');
        wrapper.className = 'modal-dialog';

        const icon = opts.icon || 'ℹ️';
        const titleHtml = opts.title ? `<h3>${opts.title}</h3>` : '';

        wrapper.innerHTML = `
            <div class="dialog-icon">${icon}</div>
            ${titleHtml}
            <p>${message}</p>
            <button id="modal-alert-ok" class="btn-ok">OK</button>
        `;

        openModal(wrapper);

        const finish = () => {
            if (modalContainer) modalContainer.onclick = null;
            closeModal();
            resolve();
        };

        wrapper.querySelector('#modal-alert-ok').onclick = finish;
        if (modalContainer) {
            modalContainer.onclick = (e) => {
                if (e.target === modalContainer) finish();
            };
        }
    });
}

export function applyRarityAnimations(container) {
    if (!container) return;
    const badges = container.querySelectorAll('.rarity-badge');
    badges.forEach(badge => {
        if (badge.dataset.animInit) return;
        badge.dataset.animInit = 'true';

        if (badge.classList.contains('rarity-mythique')) {
            badge.classList.add('anim-mythique', 'rarity-frame-mythique');
        }
        if (badge.classList.contains('rarity-legendaire')) {
            badge.classList.add('anim-legendaire');
        }
        if (badge.classList.contains('rarity-ultra_legendary')) {
            badge.classList.add('card-anim-ultra_legendary', 'rarity-frame-ultra_legendary');
        }
        if (badge.classList.contains('rarity-epique')) {
            badge.classList.add('anim-epique');
        }
        if (badge.classList.contains('rarity-rare')) {
            badge.classList.add('anim-rare');
        }
        if (badge.classList.contains('rarity-commun')) {
            badge.classList.add('anim-commun');
        }
        if (badge.classList.contains('rarity-super_rare')) {
            badge.classList.add('anim-super_rare');
        }
    });
}

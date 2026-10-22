/*
 * Consentimento de cookies (LGPD / guia de cookies da ANPD).
 * Nenhuma ferramenta não essencial é carregada antes da escolha da pessoa.
 *
 * Uso, no <head>, antes de qualquer outra tag do Google:
 *   <script src="cookies.js" data-gtm="GTM-XXXX"></script>   (Estatísticas: GTM -> GA4)
 *   <script src="cookies.js" data-ads="AW-XXXX"></script>    (Publicidade e conversões: Google Ads)
 * Qualquer elemento com o atributo data-cookie-preferences reabre as preferências.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'zl-cookie-consent';
    var MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // a escolha vale por 12 meses
    var script = document.currentScript;
    var GTM_ID = script && script.getAttribute('data-gtm');
    var ADS_ID = script && script.getAttribute('data-ads');

    // Consent Mode v2: tudo negado até a pessoa escolher.
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('consent', 'default', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied'
    });

    var loaded = { analytics: false, ads: false };
    var current = readConsent();
    var banner, modal, dialog, analyticsInput, adsInput, lastFocus;

    function readConsent() {
        try {
            var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (!saved || !saved.date) return null;
            var age = Date.now() - new Date(saved.date).getTime();
            if (!(age >= 0 && age <= MAX_AGE_MS)) return null;
            return { analytics: saved.analytics === true, ads: saved.ads === true, date: saved.date };
        } catch (e) {
            return null;
        }
    }

    function saveConsent(choice) {
        choice.date = new Date().toISOString();
        current = choice;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
        } catch (e) {
            // Sem armazenamento local, a escolha vale só para esta página.
        }
    }

    function applyConsent(choice) {
        var ads = choice.ads ? 'granted' : 'denied';
        gtag('consent', 'update', {
            ad_storage: ads,
            ad_user_data: ads,
            ad_personalization: ads,
            analytics_storage: choice.analytics ? 'granted' : 'denied'
        });
        if (!choice.analytics) deleteCookies('_ga');
        if (!choice.ads) deleteCookies('_gcl');

        // Uma tag já carregada não pode ser descarregada: recarrega a página sem ela.
        if ((loaded.analytics && !choice.analytics) || (loaded.ads && !choice.ads)) {
            window.location.reload();
            return;
        }
        if (choice.analytics && GTM_ID && !loaded.analytics) loadGtm();
        if (choice.ads && ADS_ID && !loaded.ads) loadAds();
    }

    function loadScript(src) {
        var s = document.createElement('script');
        s.async = true;
        s.src = src;
        document.head.appendChild(s);
    }

    function loadGtm() {
        loaded.analytics = true;
        window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
        loadScript('https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(GTM_ID));
    }

    function loadAds() {
        loaded.ads = true;
        loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ADS_ID));
        gtag('js', new Date());
        gtag('config', ADS_ID);
    }

    // Apaga os cookies que começam com o prefixo, no host e em cada domínio pai.
    function deleteCookies(prefix) {
        var parts = location.hostname.split('.');
        var domains = [''];
        for (var i = 0; i < parts.length - 1; i++) {
            domains.push('; domain=.' + parts.slice(i).join('.'));
        }
        document.cookie.split(';').forEach(function (cookie) {
            var name = cookie.split('=')[0].trim();
            if (name.indexOf(prefix) !== 0) return;
            domains.forEach(function (domain) {
                document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + domain;
            });
        });
    }

    var FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900';
    var BTN = 'inline-flex justify-center rounded-full px-6 py-2.5 font-semibold transition-colors ' + FOCUS;
    var PRIMARY = BTN + ' bg-blue-600 hover:bg-blue-700 text-white';
    var SECONDARY = BTN + ' border border-gray-600 text-slate-200 hover:bg-gray-800';
    var LINK = 'text-blue-400 hover:text-blue-300 underline rounded ' + FOCUS;
    var CHECKBOX = 'mt-1 h-5 w-5 shrink-0 accent-blue-600 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300';

    function buildUi() {
        banner = document.createElement('div');
        banner.id = 'zl-cookie-banner';
        banner.setAttribute('role', 'region');
        banner.setAttribute('aria-label', 'Aviso de cookies');
        banner.className = 'fixed inset-x-0 bottom-0 z-[100] p-4 hidden';
        banner.innerHTML =
            '<div class="mx-auto max-w-4xl rounded-2xl border border-gray-700 bg-gray-900/95 backdrop-blur p-5 md:p-6 shadow-2xl text-left text-sm leading-6 text-slate-300">' +
                '<p>Usamos cookies opcionais para estatísticas de visitas (Google Analytics) e para medir os resultados dos nossos anúncios (Google Ads). Eles só são ativados se você permitir. Saiba mais na <a href="politica-de-privacidade.html#cookies" class="' + LINK + '">Política de Privacidade</a>.</p>' +
                '<div class="mt-4 flex flex-col sm:flex-row sm:justify-end gap-3">' +
                    '<button type="button" data-cc="customize" class="' + SECONDARY + '">Personalizar</button>' +
                    '<button type="button" data-cc="reject" class="' + PRIMARY + '">Rejeitar não essenciais</button>' +
                    '<button type="button" data-cc="accept" class="' + PRIMARY + '">Aceitar todos</button>' +
                '</div>' +
            '</div>';

        modal = document.createElement('div');
        modal.id = 'zl-cookie-modal';
        modal.className = 'fixed inset-0 z-[110] hidden items-center justify-center bg-black/70 p-4';
        modal.innerHTML =
            '<div role="dialog" aria-modal="true" aria-labelledby="zl-cc-title" aria-describedby="zl-cc-desc" tabindex="-1" class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900 p-6 text-left text-slate-300 shadow-2xl focus:outline-none">' +
                '<div class="flex items-start justify-between gap-4">' +
                    '<h2 id="zl-cc-title" class="text-xl font-bold text-white">Preferências de cookies</h2>' +
                    '<button type="button" data-cc="close" aria-label="Fechar" class="rounded-full px-2 text-2xl leading-none text-slate-400 hover:text-white ' + FOCUS + '">&times;</button>' +
                '</div>' +
                '<p id="zl-cc-desc" class="mt-2 text-sm leading-6">Escolha quais cookies opcionais você permite. Você pode mudar isso quando quiser pelo link “Preferências de cookies” no rodapé.</p>' +
                '<div class="mt-5 space-y-3 text-sm leading-6">' +
                    '<div class="rounded-xl border border-gray-700 p-4">' +
                        '<div class="flex items-start justify-between gap-4"><span class="font-semibold text-white">Necessários</span><span class="text-xs text-slate-400">Sempre ativos</span></div>' +
                        '<p class="mt-1">Guardam neste navegador apenas a sua escolha sobre cookies.</p>' +
                    '</div>' +
                    '<label class="flex items-start justify-between gap-4 rounded-xl border border-gray-700 p-4 cursor-pointer">' +
                        '<span><span class="block font-semibold text-white">Estatísticas</span>' +
                        '<span class="block mt-1">Google Analytics 4: mede visitas e uso das páginas para melhorarmos o site.</span></span>' +
                        '<input type="checkbox" id="zl-cc-analytics" class="' + CHECKBOX + '">' +
                    '</label>' +
                    '<label class="flex items-start justify-between gap-4 rounded-xl border border-gray-700 p-4 cursor-pointer">' +
                        '<span><span class="block font-semibold text-white">Publicidade e conversões</span>' +
                        '<span class="block mt-1">Google Ads: registra quando alguém que chegou por um anúncio nosso envia o formulário de contato, para medirmos o resultado das campanhas.</span></span>' +
                        '<input type="checkbox" id="zl-cc-ads" class="' + CHECKBOX + '">' +
                    '</label>' +
                '</div>' +
                '<div class="mt-6 flex justify-end">' +
                    '<button type="button" data-cc="save" class="' + PRIMARY + '">Salvar preferências</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(banner);
        document.body.appendChild(modal);
        dialog = modal.querySelector('[role="dialog"]');
        analyticsInput = modal.querySelector('#zl-cc-analytics');
        adsInput = modal.querySelector('#zl-cc-ads');

        banner.addEventListener('click', onAction);
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeModal();
            else onAction(e);
        });
        modal.addEventListener('keydown', onModalKeydown);
        document.addEventListener('click', function (e) {
            var trigger = e.target.closest && e.target.closest('[data-cookie-preferences]');
            if (!trigger) return;
            e.preventDefault();
            openModal();
        });

        if (!current) banner.classList.remove('hidden');
    }

    function onAction(e) {
        var button = e.target.closest('[data-cc]');
        if (!button) return;
        var action = button.getAttribute('data-cc');
        if (action === 'accept') decide({ analytics: true, ads: true });
        else if (action === 'reject') decide({ analytics: false, ads: false });
        else if (action === 'customize') openModal();
        else if (action === 'save') decide({ analytics: analyticsInput.checked, ads: adsInput.checked });
        else if (action === 'close') closeModal();
    }

    function decide(choice) {
        saveConsent(choice);
        banner.classList.add('hidden');
        closeModal();
        applyConsent(choice);
    }

    function openModal() {
        lastFocus = document.activeElement;
        // Sem escolha salva, as categorias começam desativadas.
        analyticsInput.checked = !!(current && current.analytics);
        adsInput.checked = !!(current && current.ads);
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.classList.add('overflow-hidden');
        analyticsInput.focus();
    }

    function closeModal() {
        if (modal.classList.contains('hidden')) return;
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.classList.remove('overflow-hidden');
        if (lastFocus && lastFocus.focus && lastFocus.offsetParent !== null) lastFocus.focus();
    }

    function onModalKeydown(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeModal();
            return;
        }
        if (e.key !== 'Tab') return;
        // Mantém o foco dentro do diálogo.
        var focusable = dialog.querySelectorAll('button, input, a[href]');
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    if (current) applyConsent(current);

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUi);
    else buildUi();
})();

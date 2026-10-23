/*
 * Envio do formulário de contato para o web app do Google Apps Script.
 * O Apps Script grava o contato na planilha da agência e envia o aviso por e-mail.
 */
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwLKazsW7m0-CGt8bHHKJ3aovIfZYzJ1Typ5fM62-cwP0o-tNJvs9JiS1Qnm9IoicEB/exec';

(function () {
    'use strict';

    var form = document.getElementById('contato-form');
    if (!form) return;

    var button = form.querySelector('button[type="submit"]');
    var buttonText = button.innerHTML;
    var errorMessage = document.getElementById('contato-erro');

    form.elements._t.value = Date.now();
    form.elements._origem.value = window.location.href;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (!form.reportValidity()) return;

        errorMessage.classList.add('hidden');
        button.disabled = true;
        button.textContent = 'Enviando...';
        form.elements._s.value = Date.now();

        try {
            // Sem a URL do web app configurada, falha em vez de "enviar" para lugar nenhum.
            if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(WEB_APP_URL)) {
                throw new Error('WEB_APP_URL não configurada');
            }
            await fetch(WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: new URLSearchParams(new FormData(form))
            });
            window.location.href = 'obrigado.html';
        } catch (err) {
            button.disabled = false;
            button.innerHTML = buttonText;
            errorMessage.classList.remove('hidden');
        }
    });
})();

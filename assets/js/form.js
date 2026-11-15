/* ==========================================================================
   Kenes Elétrica e Automação
   Formulário de orçamento com envio AJAX e fallback para WhatsApp
   ========================================================================== */

(function () {
  'use strict';

  var cfg = window.KENES_CONFIG || {};
  var Kenes = window.Kenes || {};
  var track = Kenes.track || function () {};
  var waUrl = Kenes.waUrl || function () { return '#'; };
  var storage = Kenes.storage || { remove: function () {} };
  var forms = document.querySelectorAll('[data-lead-form]');

  if (!forms.length) return;

  var emailConfigured =
    cfg.email &&
    cfg.email.indexOf('SEU-EMAIL') === -1 &&
    cfg.email.indexOf('@') !== -1;

  function digits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function formatPhone(value) {
    var d = digits(value).slice(0, 11);
    if (!d) return '';
    if (d.length <= 2) return '(' + d;
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) {
      return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    }
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }

  function setError(form, field, message) {
    var holder = field.closest('.form-field');
    var error = holder ? holder.querySelector('.form-error') : null;
    if (message) {
      field.setAttribute('aria-invalid', 'true');
      if (error) {
        error.textContent = message;
        error.classList.add('is-visible');
      }
    } else {
      field.removeAttribute('aria-invalid');
      if (error) {
        error.textContent = '';
        error.classList.remove('is-visible');
      }
    }
  }

  function clearErrors(form) {
    Array.prototype.forEach.call(
      form.querySelectorAll('[aria-invalid="true"]'),
      function (field) {
        setError(form, field, '');
      }
    );
    var consentError = form.querySelector('[data-consent-error]');
    if (consentError) consentError.classList.remove('is-visible');
  }

  function getValue(form, name) {
    var field = form.querySelector('[name="' + name + '"]');
    return field ? field.value.trim() : '';
  }

  function buildSummary(form) {
    var nome = getValue(form, 'nome');
    var whatsapp = getValue(form, 'whatsapp');
    var cidade = getValue(form, 'cidade');
    var servico = getValue(form, 'servico');
    var mensagem = getValue(form, 'mensagem');
    var diagnostico = getValue(form, 'diagnostico');
    var servicoLabel = servico;

    var select = form.querySelector('[name="servico"]');
    if (select && select.selectedOptions && select.selectedOptions[0]) {
      servicoLabel = select.selectedOptions[0].textContent.trim();
    }

    var lines = ['Olá! Vim pelo site da Kenes e gostaria de um orçamento.', ''];
    if (nome) lines.push('Nome: ' + nome);
    if (whatsapp) lines.push('WhatsApp: ' + whatsapp);
    if (cidade) lines.push('Cidade/bairro: ' + cidade);
    if (servicoLabel) lines.push('Serviço: ' + servicoLabel);
    if (mensagem) lines.push('Mensagem: ' + mensagem);
    if (diagnostico) lines.push('Check-up: ' + diagnostico);
    return lines.join('\n');
  }

  function updateWhatsAppLink(form) {
    var link = form.querySelector('[data-form-wa]');
    if (!link) return;
    link.setAttribute('href', waUrl(buildSummary(form)));
  }

  function showStatus(form, message, type) {
    var status = form.querySelector('[data-form-status]');
    if (!status) return;
    status.textContent = message || '';
    status.classList.remove('is-error', 'is-success');
    if (type) status.classList.add('is-' + type);
  }

  function setLoading(button, loading) {
    if (!button) return;
    if (loading) {
      if (!button.getAttribute('data-original')) {
        button.setAttribute('data-original', button.innerHTML);
      }
      button.classList.add('is-loading');
      button.disabled = true;
      button.innerHTML = '<span class="spinner" aria-hidden="true"></span><span class="btn__label">Enviando...</span>';
    } else {
      button.classList.remove('is-loading');
      button.disabled = false;
      var original = button.getAttribute('data-original');
      if (original) button.innerHTML = original;
    }
  }

  function showSuccess(form, data, method) {
    var card = form.closest('[data-form-card]');
    var body = card ? card.querySelector('[data-form-body]') : null;
    var success = card ? card.querySelector('[data-form-success]') : null;
    if (!card || !body || !success) return;

    var nameEl = success.querySelector('[data-success-name]');
    var waLink = success.querySelector('[data-success-wa]');
    var methodEl = success.querySelector('[data-success-method]');
    var summary = buildSummary(form);
    var firstName = (data.nome || '').split(' ')[0];

    if (nameEl) nameEl.textContent = firstName ? ', ' + firstName : '';
    if (methodEl) {
      methodEl.textContent =
        method === 'whatsapp'
          ? 'Abrimos o WhatsApp com o resumo do seu pedido. Se a janela não abriu, use o botão abaixo.'
          : 'Seu pedido foi enviado para a nossa equipe. Para adiantar, você também pode chamar no WhatsApp.';
    }
    if (waLink) {
      waLink.setAttribute('href', waUrl(summary));
      waLink.setAttribute('data-wa-msg', summary);
    }

    body.hidden = true;
    success.hidden = false;
    success.setAttribute('tabindex', '-1');
    success.focus({ preventScroll: true });
    success.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center'
    });

    track('form_success', {
      method: method,
      service: data.servico,
      city: data.cidade
    });
    track('generate_lead', {
      method: method,
      service: data.servico,
      city: data.cidade,
      page: window.location.pathname
    });

    storage.remove('kenes_checkup', true);
  }

  function fallbackToWhatsApp(form, data) {
    var summary = buildSummary(form);
    var url = waUrl(summary);
    try {
      var opened = window.open(url, '_blank');
      if (opened) opened.opener = null;
    } catch (error) {
      /* navegador bloqueou a janela, o botão do painel de sucesso resolve */
    }
    showSuccess(form, data, 'whatsapp');
  }

  function validate(form) {
    clearErrors(form);
    var firstInvalid = null;
    var fields = {
      nome: form.querySelector('[name="nome"]'),
      whatsapp: form.querySelector('[name="whatsapp"]'),
      email: form.querySelector('[name="email"]'),
      cidade: form.querySelector('[name="cidade"]'),
      servico: form.querySelector('[name="servico"]'),
      consent: form.querySelector('[name="consentimento"]')
    };

    function invalid(field, message) {
      if (!field) return;
      setError(form, field, message);
      if (!firstInvalid) firstInvalid = field;
    }

    if (!fields.nome || fields.nome.value.trim().length < 2) {
      invalid(fields.nome, 'Informe seu nome.');
    }

    var phoneDigits = digits(fields.whatsapp ? fields.whatsapp.value : '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      invalid(fields.whatsapp, 'Informe um WhatsApp com DDD.');
    }

    var email = fields.email ? fields.email.value.trim() : '';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      invalid(fields.email, 'Confira o e-mail informado.');
    }

    if (!fields.cidade || fields.cidade.value.trim().length < 2) {
      invalid(fields.cidade, 'Informe sua cidade ou bairro.');
    }

    if (!fields.servico || !fields.servico.value) {
      invalid(fields.servico, 'Escolha o serviço que você precisa.');
    }

    if (!fields.consent || !fields.consent.checked) {
      var consentError = form.querySelector('[data-consent-error]');
      if (consentError) consentError.classList.add('is-visible');
      if (!firstInvalid) firstInvalid = fields.consent;
    }

    if (firstInvalid) {
      firstInvalid.focus({ preventScroll: false });
      return false;
    }
    return true;
  }

  function submitForm(form, event) {
    event.preventDefault();
    if (form.getAttribute('data-submitting') === 'true') return;

    var honeypot = form.querySelector('[name="_honey"]');
    if (honeypot && honeypot.value) return;

    if (!validate(form)) {
      showStatus(form, 'Confira os campos destacados para continuar.', 'error');
      return;
    }

    var startedAt = Number(form.getAttribute('data-started-at') || 0);
    var minTime = (cfg.form && cfg.form.minFillTime) || 2500;
    if (startedAt && Date.now() - startedAt < minTime) {
      showStatus(form, 'Aguarde um instante e tente novamente.', 'error');
      return;
    }

    var data = {
      nome: getValue(form, 'nome'),
      whatsapp: getValue(form, 'whatsapp'),
      email: getValue(form, 'email'),
      cidade: getValue(form, 'cidade'),
      servico: getValue(form, 'servico'),
      mensagem: getValue(form, 'mensagem'),
      diagnostico: getValue(form, 'diagnostico'),
      consentimento: 'Sim, autorizo o contato',
      origem: getValue(form, 'origem') || 'site',
      pagina: getValue(form, 'pagina') || window.location.href,
      referrer: getValue(form, 'referrer') || 'direto',
      landing_page: getValue(form, 'landing_page') || window.location.pathname,
      utm_source: getValue(form, 'utm_source'),
      utm_medium: getValue(form, 'utm_medium'),
      utm_campaign: getValue(form, 'utm_campaign'),
      utm_term: getValue(form, 'utm_term'),
      utm_content: getValue(form, 'utm_content'),
      gclid: getValue(form, 'gclid'),
      fbclid: getValue(form, 'fbclid'),
      _subject: 'Novo pedido de orçamento pelo site | Kenes',
      _template: 'table',
      _captcha: 'false'
    };

    if (data.email) {
      data._replyto = data.email;
    }

    var select = form.querySelector('[name="servico"]');
    if (select && select.selectedOptions && select.selectedOptions[0]) {
      data.servico_label = select.selectedOptions[0].textContent.trim();
    }

    track('form_submit', {
      service: data.servico,
      city: data.cidade,
      page: window.location.pathname
    });

    var button = form.querySelector('[type="submit"]');
    var endpoint =
      cfg.formEndpoint ||
      (emailConfigured
        ? 'https://formsubmit.co/ajax/' + encodeURIComponent(cfg.email)
        : '');

    if (!endpoint) {
      fallbackToWhatsApp(form, data);
      return;
    }

    form.setAttribute('data-submitting', 'true');
    setLoading(button, true);
    showStatus(form, 'Enviando seu pedido...', '');

    var controller = new AbortController();
    var timeout = window.setTimeout(function () { controller.abort(); }, 15000);

    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(data),
      signal: controller.signal
    })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (payload) {
          return { ok: response.ok, payload: payload };
        });
      })
      .then(function (result) {
        window.clearTimeout(timeout);
        var success =
          result.ok &&
          (result.payload.success === true ||
            result.payload.success === 'true' ||
            result.payload.ok === true ||
            result.payload.ok === 'true' ||
            (!('success' in result.payload) && !('ok' in result.payload)));
        if (!success) throw new Error('Envio não confirmado');
        form.removeAttribute('data-submitting');
        setLoading(button, false);
        showSuccess(form, data, 'email');
        form.reset();
        updateWhatsAppLink(form);
      })
      .catch(function (error) {
        window.clearTimeout(timeout);
        form.removeAttribute('data-submitting');
        setLoading(button, false);
        showStatus(
          form,
          'Não foi possível enviar agora. Tente novamente em instantes ou fale com a gente pelo WhatsApp.',
          'error'
        );
        track('form_error', {
          reason: error && error.name === 'AbortError' ? 'timeout' : 'network',
          page: window.location.pathname
        });
      });
  }

  Array.prototype.forEach.call(forms, function (form) {
    var phoneField = form.querySelector('[name="whatsapp"]');
    var started = false;

    if (phoneField) {
      phoneField.addEventListener('input', function () {
        phoneField.value = formatPhone(phoneField.value);
        updateWhatsAppLink(form);
      });
    }

    function markStarted() {
      if (started) return;
      started = true;
      form.setAttribute('data-started-at', String(Date.now()));
      track('form_start', {
        service: getValue(form, 'servico'),
        page: window.location.pathname
      });
    }

    Array.prototype.forEach.call(
      form.querySelectorAll('input, select, textarea'),
      function (field) {
        field.addEventListener('focus', markStarted, { once: true });
        field.addEventListener('input', function () { updateWhatsAppLink(form); });
        field.addEventListener('change', function () { updateWhatsAppLink(form); });
      }
    );

    form.addEventListener('submit', function (event) {
      submitForm(form, event);
    });

    var waLink = form.querySelector('[data-form-wa]');
    if (waLink) {
      waLink.addEventListener('click', function (event) {
        event.preventDefault();
        var summary = buildSummary(form);
        track('whatsapp_click', {
          location: 'formulario',
          page: window.location.pathname
        });
        window.open(waUrl(summary), '_blank', 'noopener');
      });
    }

    var resetLink = form.closest('[data-form-card]')
      ? form.closest('[data-form-card]').querySelector('[data-form-reset]')
      : null;
    if (resetLink) {
      resetLink.addEventListener('click', function () {
        var card = form.closest('[data-form-card]');
        var body = card.querySelector('[data-form-body]');
        var success = card.querySelector('[data-form-success]');
        if (body) body.hidden = false;
        if (success) success.hidden = true;
        form.reset();
        clearErrors(form);
        updateWhatsAppLink(form);
        var first = form.querySelector('[name="nome"]');
        if (first) first.focus();
      });
    }

    updateWhatsAppLink(form);
  });
})();

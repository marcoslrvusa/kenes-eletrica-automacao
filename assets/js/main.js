/* ==========================================================================
   Kenes Elétrica e Automação
   Scripts principais: navegação, tracking, check-up, consentimento
   ========================================================================== */

(function () {
  'use strict';

  var cfg = window.KENES_CONFIG || {};
  var doc = document;
  var body = doc.body;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(selector, context) {
    return (context || doc).querySelector(selector);
  }

  function $$(selector, context) {
    return Array.prototype.slice.call((context || doc).querySelectorAll(selector));
  }

  var storage = {
    get: function (key, session) {
      try {
        var raw = (session ? window.sessionStorage : window.localStorage).getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        return null;
      }
    },
    set: function (key, value, session) {
      try {
        (session ? window.sessionStorage : window.localStorage).setItem(
          key,
          JSON.stringify(value)
        );
      } catch (error) {
        /* armazenamento indisponível, segue sem persistir */
      }
    },
    remove: function (key, session) {
      try {
        (session ? window.sessionStorage : window.localStorage).removeItem(key);
      } catch (error) {
        /* armazenamento indisponível, segue sem persistir */
      }
    }
  };

  function waUrl(message) {
    var text = message || cfg.whatsappDefault || 'Olá! Gostaria de falar com a Kenes.';
    return 'https://wa.me/' + cfg.phone + '?text=' + encodeURIComponent(text);
  }

  function track(event, params) {
    var payload = Object.assign({ event: event }, params || {});
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(payload);
    } catch (error) {
      /* dataLayer indisponível */
    }
    if (typeof window.gtag === 'function') {
      window.gtag('event', event, params || {});
    }
    if (typeof window.fbq === 'function') {
      if (event === 'generate_lead') {
        window.fbq('track', 'Lead', params || {});
      } else {
        window.fbq('trackCustom', event, params || {});
      }
    }
  }

  window.Kenes = {
    cfg: cfg,
    track: track,
    waUrl: waUrl,
    storage: storage,
    $: $,
    $$: $$
  };

  /* ----------------------------- Ano e telefone ----------------------------- */

  $$('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  $$('[data-phone-display]').forEach(function (el) {
    el.textContent = cfg.phoneDisplay || '';
  });

  /* -------------------------------- Header --------------------------------- */

  var header = $('#site-header');

  if (header) {
    var updateHeader = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 6);
    };
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }

  /* ----------------------------- Menu mobile ------------------------------- */

  var menu = $('#mobile-menu');
  var backdrop = $('#menu-backdrop');
  var menuToggle = $('#menu-toggle');
  var menuClose = $('#menu-close');
  var lastFocused = null;

  function openMenu() {
    if (!menu || !backdrop || !menuToggle) return;
    lastFocused = doc.activeElement;
    menu.inert = false;
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('is-open');
    backdrop.setAttribute('aria-hidden', 'false');
    menuToggle.setAttribute('aria-expanded', 'true');
    body.classList.add('nav-open');
    if (menuClose) {
      window.setTimeout(function () {
        menuClose.focus();
      }, 80);
    }
  }

  function closeMenu(restoreFocus) {
    if (!menu || !backdrop || !menuToggle) return;
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('is-open');
    backdrop.setAttribute('aria-hidden', 'true');
    menuToggle.setAttribute('aria-expanded', 'false');
    body.classList.remove('nav-open');
    menu.inert = true;
    if (restoreFocus !== false && lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }
  }

  if (menu && backdrop && menuToggle) {
    menu.inert = true;
    menuToggle.addEventListener('click', function () {
      if (menu.classList.contains('is-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });
    if (menuClose) menuClose.addEventListener('click', function () { closeMenu(); });
    backdrop.addEventListener('click', function () { closeMenu(); });

    $$('a', menu).forEach(function (link) {
      link.addEventListener('click', function () { closeMenu(false); });
    });

    menu.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeMenu();
        return;
      }
      if (event.key !== 'Tab') return;
      var focusable = $$('a[href], button:not([disabled])', menu).filter(function (el) {
        return el.offsetParent !== null;
      });
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && doc.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && doc.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 980 && menu.classList.contains('is-open')) {
        closeMenu(false);
      }
    });
  }

  /* --------------------------- Dropdown de serviços ------------------------ */

  var dropdown = $('.nav__dropdown');
  var dropdownToggle = $('#services-toggle');

  function closeDropdown() {
    if (!dropdown || !dropdownToggle) return;
    dropdown.classList.remove('is-open');
    dropdownToggle.setAttribute('aria-expanded', 'false');
  }

  if (dropdown && dropdownToggle) {
    dropdownToggle.addEventListener('click', function () {
      var isOpen = dropdown.classList.toggle('is-open');
      dropdownToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    doc.addEventListener('click', function (event) {
      if (!dropdown.contains(event.target)) closeDropdown();
    });

    doc.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeDropdown();
    });

    dropdown.addEventListener('focusout', function (event) {
      if (!dropdown.contains(event.relatedTarget)) closeDropdown();
    });

    $$('a', dropdown).forEach(function (link) {
      link.addEventListener('click', closeDropdown);
    });
  }

  /* ----------------------------- Links WhatsApp ---------------------------- */

  $$('a[data-wa]').forEach(function (link) {
    var message = link.getAttribute('data-wa-msg');
    if (message) link.setAttribute('href', waUrl(message));
    link.addEventListener('click', function () {
      var location = link.getAttribute('data-wa-location') || 'site';
      track('whatsapp_click', {
        location: location,
        page: window.location.pathname
      });
    });
  });

  $$('a[href^="tel:"]').forEach(function (link) {
    link.addEventListener('click', function () {
      track('phone_click', { page: window.location.pathname });
    });
  });

  $$('[data-cta]').forEach(function (el) {
    el.addEventListener('click', function () {
      track('cta_click', {
        label: el.getAttribute('data-cta') || el.textContent.trim().slice(0, 60),
        page: window.location.pathname
      });
    });
  });

  /* ------------------------- Origem e UTM nos formulários ------------------ */

  var attrKeys = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'fbclid'
  ];

  function captureAttribution() {
    var params = new URLSearchParams(window.location.search);
    var data = storage.get('kenes_attribution', true) || {};
    var changed = false;

    attrKeys.forEach(function (key) {
      var value = params.get(key);
      if (value) {
        data[key] = value;
        changed = true;
      }
    });

    if (!data.landing_page) {
      data.landing_page = window.location.pathname + window.location.search;
      data.referrer = doc.referrer || 'direto';
      changed = true;
    }

    if (changed) storage.set('kenes_attribution', data, true);
    return data;
  }

  var attribution = captureAttribution();

  function fillAttribution(form) {
    var fields = {
      origem: attribution.utm_source
        ? 'utm:' + attribution.utm_source
        : attribution.referrer && attribution.referrer !== 'direto'
          ? 'referral'
          : 'site',
      pagina: window.location.href,
      referrer: doc.referrer || 'direto',
      landing_page: attribution.landing_page || window.location.pathname
    };

    attrKeys.forEach(function (key) {
      fields[key] = attribution[key] || '';
    });

    Object.keys(fields).forEach(function (name) {
      var input = form.querySelector('[name="' + name + '"]');
      if (input) input.value = fields[name];
    });
  }

  $$('[data-lead-form]').forEach(fillAttribution);

  var urlService = new URLSearchParams(window.location.search).get('servico');
  if (urlService) {
    $$('[data-lead-form] select[name="servico"]').forEach(function (select) {
      var option = Array.prototype.find.call(select.options, function (item) {
        return item.value === urlService;
      });
      if (option) select.value = urlService;
    });
  }

  var pageService = body.getAttribute('data-service');
  if (pageService) {
    $$('[data-lead-form] select[name="servico"]').forEach(function (select) {
      if (select.value) return;
      var option = Array.prototype.find.call(select.options, function (item) {
        return item.value === pageService;
      });
      if (option) select.value = pageService;
    });
  }

  /* --------------------------- Check-up elétrico --------------------------- */

  var checkupRoot = $('[data-checkup]');
  var savedCheckup = storage.get('kenes_checkup', true);

  function updateCheckupCount() {
    if (!checkupRoot) return;
    var boxes = $$('input[type="checkbox"]', checkupRoot);
    var checked = boxes.filter(function (box) { return box.checked; });
    var count = $('[data-checkup-count]', checkupRoot);
    var bar = $('[data-checkup-bar]', checkupRoot);
    var total = boxes.length || 1;
    if (count) count.textContent = String(checked.length);
    if (bar) bar.style.width = Math.round((checked.length / total) * 100) + '%';
  }

  function serviceTag(label, href) {
    var link = doc.createElement('a');
    link.href = href;
    link.textContent = label;
    return link;
  }

  function showCheckupResult() {
    if (!checkupRoot) return;
    var boxes = $$('input[type="checkbox"]', checkupRoot);
    var checked = boxes.filter(function (box) { return box.checked; });
    var result = $('[data-checkup-result]', checkupRoot);
    var title = $('[data-checkup-title]', checkupRoot);
    var badge = $('[data-checkup-badge]', checkupRoot);
    var text = $('[data-checkup-text]', checkupRoot);
    var tags = $('[data-checkup-tags]', checkupRoot);
    var waLink = $('[data-checkup-wa]', checkupRoot);
    var formLink = $('[data-checkup-form]', checkupRoot);
    if (!result || !title || !badge || !text || !tags) return;

    var hasDanger = checked.some(function (box) {
      return box.getAttribute('data-danger') === 'true';
    });
    var count = checked.length;
    var risk = 'ok';
    var riskLabel = 'Preventivo';
    var titleText = 'Nenhum sinal marcado';
    var textContent =
      'Se você não marcou nada, ótimo. Uma revisão preventiva ainda pode identificar pontos de melhoria antes de virarem problema.';

    if (hasDanger) {
      risk = 'danger';
      riskLabel = 'Atenção imediata';
      titleText = 'Priorize uma avaliação';
      textContent =
        'Sinais como cheiro de queimado, tomada quente ou fios expostos exigem atenção. Evite usar o ponto afetado, desligue o disjuntor correspondente se for seguro e fale com um eletricista.';
    } else if (count >= 4) {
      risk = 'warning';
      riskLabel = 'Atenção';
      titleText = 'Vários pontos pedem avaliação';
      textContent =
        'A soma de pequenos sinais costuma indicar sobrecarga, fiação antiga ou falta de manutenção. Vale agendar uma avaliação para evitar gastos maiores.';
    } else if (count >= 2) {
      risk = 'warning';
      riskLabel = 'Atenção moderada';
      titleText = 'Vale uma avaliação preventiva';
      textContent =
        'Você marcou mais de um sinal. Ainda pode ser algo simples, mas uma avaliação evita que o problema cresça e comprometa a segurança da casa.';
    } else if (count === 1) {
      risk = 'warning';
      riskLabel = 'Vale verificar';
      titleText = 'Um ponto de atenção';
      textContent =
        'Um único sinal já merece atenção, principalmente se envolve aquecimento, quedas de energia ou instalação antiga. Vale conversar com um profissional.';
    }

    badge.className = 'risk-badge risk-badge--' + risk;
    badge.textContent = riskLabel;
    title.textContent = titleText;
    text.textContent = textContent;
    tags.innerHTML = '';

    var links = [];
    checked.forEach(function (box) {
      var href = box.getAttribute('data-link');
      var label = box.getAttribute('data-link-label');
      if (href && label && !links.some(function (item) { return item.href === href; })) {
        links.push({ href: href, label: label });
      }
    });

    if (!links.length) {
      links.push({
        href: checkupRoot.getAttribute('data-eletrica') || '#orcamento',
        label: 'Elétrica residencial'
      });
    }

    links.forEach(function (item) {
      tags.appendChild(serviceTag(item.label, item.href));
    });

    var summary = checked
      .map(function (box) { return '- ' + box.value; })
      .join('\n');
    var message =
      'Olá! Fiz o check-up elétrico no site da Kenes.\n\n' +
      (summary || 'Não marquei nenhum sinal, mas quero uma avaliação preventiva.') +
      '\n\nResultado: ' +
      riskLabel +
      '\nGostaria de um orçamento.';

    if (waLink) {
      waLink.href = waUrl(message);
      waLink.setAttribute('data-wa-msg', message);
    }

    var primaryService = checked.find(function (box) {
      return box.getAttribute('data-service');
    });
    var serviceValue = primaryService ? primaryService.getAttribute('data-service') : 'eletrica';
    var saved = {
      message: 'Resumo do check-up: ' + (summary || 'sem sinais marcados'),
      service: serviceValue,
      summary: summary || 'Sem sinais marcados, interesse em avaliação preventiva.',
      count: count,
      risk: riskLabel,
      values: checked.map(function (box) { return box.value; })
    };
    storage.set('kenes_checkup', saved, true);

    var localForm = $('[data-lead-form]');
    if (localForm) {
      var messageField = localForm.querySelector('[name="mensagem"]');
      var serviceField = localForm.querySelector('[name="servico"]');
      var diagField = localForm.querySelector('[name="diagnostico"]');
      if (messageField && !messageField.value) {
        messageField.value = saved.message;
      }
      if (serviceField && !serviceField.value) {
        var option = Array.prototype.find.call(serviceField.options, function (item) {
          return item.value === serviceValue;
        });
        if (option) serviceField.value = serviceValue;
      }
      if (diagField) diagField.value = saved.summary;
    }

    if (formLink) {
      if (localForm) {
        formLink.setAttribute('href', '#orcamento');
        formLink.setAttribute('data-scroll-to', '#orcamento');
      } else {
        formLink.setAttribute(
          'href',
          checkupRoot.getAttribute('data-contato') || 'contato.html#orcamento'
        );
      }
    }

    result.hidden = false;
    result.setAttribute('tabindex', '-1');
    result.focus({ preventScroll: true });
    if (!reduceMotion) {
      result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    track('checkup_complete', {
      signals: count,
      risk: riskLabel,
      has_danger: hasDanger
    });
  }

  if (checkupRoot) {
    var checkupBoxes = $$('input[type="checkbox"]', checkupRoot);
    var checkupResult = $('[data-checkup-result]', checkupRoot);
    var submitCheckup = $('[data-checkup-submit]', checkupRoot);
    var resetCheckup = $('[data-checkup-reset]', checkupRoot);

    updateCheckupCount();

    checkupBoxes.forEach(function (box) {
      box.addEventListener('change', function () {
        updateCheckupCount();
        if (checkupResult) checkupResult.hidden = true;
        if (submitCheckup) submitCheckup.removeAttribute('aria-disabled');
      });
    });

    if (submitCheckup) {
      submitCheckup.addEventListener('click', showCheckupResult);
    }

    if (resetCheckup) {
      resetCheckup.addEventListener('click', function () {
        checkupBoxes.forEach(function (box) { box.checked = false; });
        updateCheckupCount();
        if (checkupResult) checkupResult.hidden = true;
        storage.remove('kenes_checkup', true);
        var firstBox = checkupBoxes[0];
        if (firstBox) firstBox.focus();
      });
    }

    if (savedCheckup && Array.isArray(savedCheckup.values)) {
      checkupBoxes.forEach(function (box) {
        if (savedCheckup.values.indexOf(box.value) !== -1) box.checked = true;
      });
      updateCheckupCount();
    }
  }

  /* ------------------------------ Consentimento ---------------------------- */

  var analyticsIds = cfg.analytics || {};
  var hasAnalytics = Boolean(analyticsIds.ga4 || analyticsIds.metaPixel);
  var consentBanner = $('#consent-banner');
  var analyticsLoaded = false;

  if (!hasAnalytics) {
    $$('[data-consent-open]').forEach(function (link) {
      var item = link.closest('li') || link;
      item.hidden = true;
    });
  }

  function loadAnalytics() {
    if (analyticsLoaded) return;
    analyticsLoaded = true;

    if (analyticsIds.ga4) {
      var gaScript = doc.createElement('script');
      gaScript.async = true;
      gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + analyticsIds.ga4;
      doc.head.appendChild(gaScript);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());
      window.gtag('config', analyticsIds.ga4, { anonymize_ip: true });
    }

    if (analyticsIds.metaPixel) {
      /* Meta Pixel oficial */
      (function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = true;
        n.version = '2.0';
        n.queue = [];
        t = b.createElement(e);
        t.async = true;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(window, doc, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', analyticsIds.metaPixel);
      window.fbq('track', 'PageView');
    }
  }

  function setConsent(value) {
    storage.set('kenes_consent', value);
    if (consentBanner) consentBanner.hidden = true;
    if (value === 'granted') {
      loadAnalytics();
      track('consent_granted', { page: window.location.pathname });
    } else {
      track('consent_denied', { page: window.location.pathname });
    }
  }

  if (consentBanner) {
    var storedConsent = storage.get('kenes_consent');
    if (!hasAnalytics) {
      consentBanner.hidden = true;
    } else if (storedConsent === 'granted') {
      consentBanner.hidden = true;
      loadAnalytics();
    } else if (storedConsent === 'denied') {
      consentBanner.hidden = true;
    } else {
      consentBanner.hidden = false;
    }

    $$('[data-consent-accept]').forEach(function (button) {
      button.addEventListener('click', function () { setConsent('granted'); });
    });
    $$('[data-consent-essential]').forEach(function (button) {
      button.addEventListener('click', function () { setConsent('denied'); });
    });
    $$('[data-consent-open]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        storage.remove('kenes_consent');
        consentBanner.hidden = false;
      });
    });
  }

  /* ------------------------------- Animações ------------------------------- */

  var revealItems = $$('[data-reveal]');

  if (revealItems.length) {
    revealItems.forEach(function (item) {
      var delay = item.getAttribute('data-delay');
      if (delay) item.style.setProperty('--delay', delay + 'ms');
    });

    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealItems.forEach(function (item) { item.classList.add('is-visible'); });
    } else {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target);
            }
          });
        },
        { rootMargin: '0px 0px -7% 0px', threshold: 0.06 }
      );
      revealItems.forEach(function (item) { observer.observe(item); });
    }
  }

  /* ----------------------------- Profundidade ------------------------------ */

  var scrollMarks = [25, 50, 75, 90];
  var scrollFired = {};

  function trackScrollDepth() {
    var docHeight = doc.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;
    var percent = Math.round((window.scrollY / docHeight) * 100);
    scrollMarks.forEach(function (mark) {
      if (percent >= mark && !scrollFired[mark]) {
        scrollFired[mark] = true;
        track('scroll_depth', { percent: mark, page: window.location.pathname });
      }
    });
  }

  window.addEventListener('scroll', trackScrollDepth, { passive: true });

  /* -------------------------- Pré-preenchimento ---------------------------- */

  if (savedCheckup && savedCheckup.message) {
    $$('[data-lead-form]').forEach(function (form) {
      var messageField = form.querySelector('[name="mensagem"]');
      var serviceField = form.querySelector('[name="servico"]');
      var diagField = form.querySelector('[name="diagnostico"]');
      if (messageField && !messageField.value) messageField.value = savedCheckup.message;
      if (serviceField && !serviceField.value && savedCheckup.service) {
        var option = Array.prototype.find.call(serviceField.options, function (item) {
          return item.value === savedCheckup.service;
        });
        if (option) serviceField.value = savedCheckup.service;
      }
      if (diagField && !diagField.value) diagField.value = savedCheckup.summary || '';
    });
  }
})();

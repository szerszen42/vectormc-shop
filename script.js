

document.addEventListener('DOMContentLoaded', () => {
  let selectedDuration = '30d';
  let selectedEdition = 'rust';

  const durationBtns = document.querySelectorAll('.duration-btn');
  const priceNodeVal = document.getElementById('price-node-val');
  const priceNodePeriod = document.getElementById('price-node-period');
  const priceRustVal = document.getElementById('price-rust-val');
  const priceRustPeriod = document.getElementById('price-rust-period');

  const orderModalOverlay = document.getElementById('order-modal-overlay');
  const radioEditionNode = document.getElementById('radio-edition-node');
  const radioEditionRust = document.getElementById('radio-edition-rust');
  const orderDurationSelect = document.getElementById('order-duration');
  const modalCustomDaysGroup = document.getElementById('modal-custom-days-group');
  const modalCustomDaysInput = document.getElementById('modal-custom-days');
  const orderClientNick = document.getElementById('order-client-nick');
  const orderClientEmail = document.getElementById('order-client-email');
  const orderHwid = document.getElementById('order-hwid');
  const btnPasteOrderHwid = document.getElementById('btn-paste-order-hwid');
  const orderGeneratedText = document.getElementById('order-generated-text');
  const btnCopyOrderText = document.getElementById('btn-copy-order-text');
  const btnContactSylwek = document.getElementById('btn-contact-sylwek');
  const copyOrderStatus = document.getElementById('copy-order-status');
  const btnPayStripe = document.getElementById('btn-pay-stripe');
  const stripeLoadingMsg = document.getElementById('stripe-loading-msg');

  const periodLabels = {
    '1d': '/ za 1 dzień',
    '7d': '/ za 7 dni',
    '30d': '/ za 30 dni',
    '365d': '/ za 1 rok',
    'lifetime': '(bezterminowo)'
  };

  const periodNames = {
    '1d': '1 Dzień (Wersja Testowa)',
    '7d': '7 Dni (1 Tydzień)',
    '30d': '30 Dni (1 Miesiąc)',
    '365d': '365 Dni (1 Rok)',
    'lifetime': 'Na zawsze (Lifetime / Bezterminowa)'
  };

  function updatePricingCards(dur) {
    selectedDuration = dur;

    durationBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.duration === dur);
    });

    const cfg = (typeof SHOP_CONFIG !== 'undefined') ? SHOP_CONFIG : null;
    const nodePrice = (cfg && cfg.nodeEdition && cfg.nodeEdition.prices[dur]) ? cfg.nodeEdition.prices[dur] : 'Do ustalenia';
    const rustPrice = (cfg && cfg.rustEdition && cfg.rustEdition.prices[dur]) ? cfg.rustEdition.prices[dur] : 'Do ustalenia';

    const periodText = periodLabels[dur] || '';

    if (priceNodeVal) priceNodeVal.textContent = (nodePrice === 'Do ustalenia' || nodePrice === 'Indywidualnie') ? nodePrice : `${nodePrice}`;
    if (priceNodePeriod) priceNodePeriod.textContent = periodText;

    if (priceRustVal) priceRustVal.textContent = (rustPrice === 'Do ustalenia' || rustPrice === 'Indywidualnie') ? rustPrice : `${rustPrice}`;
    if (priceRustPeriod) priceRustPeriod.textContent = periodText;

    if (orderDurationSelect) orderDurationSelect.value = dur;
    updateModalCustomDaysVisibility();
    updateGeneratedMessage();
  }

  durationBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const dur = btn.dataset.duration;
      updatePricingCards(dur);
    });
  });

  window.openOrderModal = function(edition) {
    selectedEdition = edition || 'rust';
    if (edition === 'node') {
      if (radioEditionNode) radioEditionNode.checked = true;
    } else {
      if (radioEditionRust) radioEditionRust.checked = true;
    }

    if (orderDurationSelect) orderDurationSelect.value = selectedDuration;
    updateModalCustomDaysVisibility();
    updateGeneratedMessage();

    if (orderModalOverlay) {
      orderModalOverlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        if (orderClientNick) orderClientNick.focus();
      }, 100);
    }
  };

  window.closeOrderModal = function() {
    if (orderModalOverlay) {
      orderModalOverlay.style.display = 'none';
      document.body.style.overflow = '';
      if (copyOrderStatus) copyOrderStatus.style.display = 'none';
    }
  };

  if (orderModalOverlay) {
    orderModalOverlay.addEventListener('click', (e) => {
      if (e.target === orderModalOverlay) closeOrderModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeOrderModal();
  });

  if (radioEditionNode) {
    radioEditionNode.addEventListener('change', () => {
      selectedEdition = 'node';
      updateGeneratedMessage();
    });
  }

  if (radioEditionRust) {
    radioEditionRust.addEventListener('change', () => {
      selectedEdition = 'rust';
      updateGeneratedMessage();
    });
  }

  if (orderDurationSelect) {
    orderDurationSelect.addEventListener('change', () => {
      selectedDuration = orderDurationSelect.value;
      updateModalCustomDaysVisibility();
      updatePricingCards(selectedDuration);
    });
  }

  function updateModalCustomDaysVisibility() {
    if (!modalCustomDaysGroup) return;
    if (orderDurationSelect && orderDurationSelect.value === 'custom') {
      modalCustomDaysGroup.style.display = 'block';
    } else {
      modalCustomDaysGroup.style.display = 'none';
    }
  }

  if (modalCustomDaysInput) {
    modalCustomDaysInput.addEventListener('input', updateGeneratedMessage);
  }

  if (orderClientNick) {
    orderClientNick.addEventListener('input', updateGeneratedMessage);
  }

  if (orderHwid) {
    orderHwid.addEventListener('input', updateGeneratedMessage);
  }

  if (orderClientEmail) {
    orderClientEmail.addEventListener('input', updateGeneratedMessage);
  }

  if (btnPayStripe) {
    btnPayStripe.addEventListener('click', async () => {
      const hwid = orderHwid ? orderHwid.value.trim() : '';
      const nick = orderClientNick ? orderClientNick.value.trim() : '';
      const email = orderClientEmail ? orderClientEmail.value.trim() : '';

      if (!hwid) {
        alert('⚠️ Wklej lub wpisz swój kod HWID komputera!\n\nKod ten jest wymagany, aby system mógł natychmiast automatycznie aktywować Twoją licencję po zatwierdzeniu wpłaty!');
        if (orderHwid) orderHwid.focus();
        return;
      }

      if (!nick) {
        alert('⚠️ Podaj swój Nick lub Discord, aby przypisać go do Twojej licencji!');
        if (orderClientNick) orderClientNick.focus();
        return;
      }

      btnPayStripe.disabled = true;
      if (stripeLoadingMsg) stripeLoadingMsg.style.display = 'block';

      try {
        const payload = {
          edition: selectedEdition,
          duration: selectedDuration,
          clientNick: nick,
          clientEmail: email,
          hwid: hwid
        };

        const res = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success && data.checkoutUrl) {
          try {
            sessionStorage.setItem('vectormc_draft_order', JSON.stringify(payload));
          } catch (e) {}
          window.location.href = data.checkoutUrl;
        } else {
          alert('Błąd płatności: ' + (data.error || 'Nie udało się połączyć z bramką Stripe.'));
          btnPayStripe.disabled = false;
          if (stripeLoadingMsg) stripeLoadingMsg.style.display = 'none';
        }
      } catch (err) {
        console.error('Błąd Stripe:', err);
        alert('Wskazówka: Aby uruchomić obsługę płatności Stripe i automatyczną aktywację licencji, uruchom stronę za pomocą pliku "Uruchom_Sklep_Serwer.bat"!');
        btnPayStripe.disabled = false;
        if (stripeLoadingMsg) stripeLoadingMsg.style.display = 'none';
      }
    });
  }

  if (btnPasteOrderHwid) {
    btnPasteOrderHwid.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && orderHwid) {
          orderHwid.value = text.trim();
          updateGeneratedMessage();
        }
      } catch (err) {
        alert('Użyj skrótu Ctrl+V w polu HWID.');
      }
    });
  }

  const btnCopyHwidCmd = document.getElementById('btn-copy-hwid-cmd');
  const hwidCmdTooltip = document.getElementById('hwid-cmd-tooltip');
  if (btnCopyHwidCmd) {
    btnCopyHwidCmd.addEventListener('click', () => {
      const psCmd = '(Get-CimInstance Win32_ComputerSystemProduct).UUID | Set-Clipboard';
      navigator.clipboard.writeText(psCmd).then(() => {
        if (hwidCmdTooltip) {
          hwidCmdTooltip.textContent = '✅ Skopiowano komendę do schowka! Otwórz PowerShell, wklej (Ctrl+V) i kliknij Enter – Twój HWID natychmiast trafi do schowka!';
          hwidCmdTooltip.style.color = '#4ade80';
        }
      }).catch(() => {
        alert('Komenda: (Get-CimInstance Win32_ComputerSystemProduct).UUID | Set-Clipboard');
      });
    });
  }

  function updateGeneratedMessage() {
    saveDraftOrder();
    if (!orderGeneratedText) return;

    const editionName = (selectedEdition === 'rust') 
      ? 'VectorMc PRO (Rust Edition) - Wersja Premium 👑' 
      : 'VectorMc Standard (Node.js Edition) - Wersja Zwykła';

    let durationText = periodNames[selectedDuration] || selectedDuration;

    const nick = (orderClientNick && orderClientNick.value.trim()) ? orderClientNick.value.trim() : '[Twój Nick / Discord]';
    const hwid = (orderHwid && orderHwid.value.trim()) ? orderHwid.value.trim() : '[Podam po pierwszym uruchomieniu bota]';

    const msg = 
`Cześć Sylwek! Chcę zamówić licencję na Twojego bota Minecraft:
• Wersja bota: ${editionName}
• Okres licencji: ${durationText}
• Mój Nick/Discord: ${nick}
• Mój kod HWID: ${hwid}

Napisz proszę jak z płatnością i aktywacją licencji! Dzięki.`;

    orderGeneratedText.value = msg;
  }

  function saveDraftOrder() {
    try {
      const payload = {
        edition: selectedEdition,
        duration: selectedDuration,
        clientNick: (orderClientNick && orderClientNick.value) ? orderClientNick.value.trim() : '',
        clientEmail: (orderClientEmail && orderClientEmail.value) ? orderClientEmail.value.trim() : '',
        hwid: (orderHwid && orderHwid.value) ? orderHwid.value.trim() : ''
      };
      sessionStorage.setItem('vectormc_draft_order', JSON.stringify(payload));
    } catch (e) {}
  }

  if (btnCopyOrderText) {
    btnCopyOrderText.addEventListener('click', () => {
      if (orderGeneratedText) {
        navigator.clipboard.writeText(orderGeneratedText.value).then(() => {
          showCopyStatus('✅ Skopiowano treść zamówienia do schowka! Wyślij ją do Sylwka (Ctrl+V).');
        }).catch(() => {
          orderGeneratedText.select();
          document.execCommand('copy');
          showCopyStatus('✅ Skopiowano do schowka!');
        });
      }
    });
  }

  if (btnContactSylwek) {
    btnContactSylwek.addEventListener('click', () => {
      if (orderGeneratedText) {
        navigator.clipboard.writeText(orderGeneratedText.value);
      }

      const cfg = (typeof SHOP_CONFIG !== 'undefined') ? SHOP_CONFIG : null;
      if (cfg && cfg.contact && cfg.contact.discordServerInvite) {
        window.open(cfg.contact.discordServerInvite, '_blank');
      } else {
        showCopyStatus(`✅ Skopiowano wiadomość! Napisz do Sylwka na Discord (${(cfg && cfg.contact) ? cfg.contact.discordNick : 'Sylwek'}).`);
      }
    });
  }

  function showCopyStatus(msg) {
    if (!copyOrderStatus) return;
    copyOrderStatus.textContent = msg;
    copyOrderStatus.style.display = 'block';
    setTimeout(() => {
      if (copyOrderStatus) copyOrderStatus.style.display = 'none';
    }, 4500);
  }

  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.faq-item');
      if (parent) {
        const isOpen = parent.classList.contains('open');

        document.querySelectorAll('.faq-item.open').forEach(item => {
          if (item !== parent) item.classList.remove('open');
        });
        parent.classList.toggle('open', !isOpen);
      }
    });
  });

  function restoreDraftOrder() {
    const urlParams = new URLSearchParams(window.location.search);
    const isCanceled = urlParams.get('canceled') === '1' || window.location.hash === '#zamow';

    let draft = null;
    try {
      const raw = sessionStorage.getItem('vectormc_draft_order');
      if (raw) draft = JSON.parse(raw);
    } catch (e) {}

    const nick = urlParams.get('nick') || (draft && draft.clientNick);
    const email = urlParams.get('email') || (draft && draft.clientEmail);
    const hwid = urlParams.get('hwid') || (draft && draft.hwid);
    const edition = urlParams.get('edition') || (draft && draft.edition) || 'rust';
    const duration = urlParams.get('duration') || (draft && draft.duration) || '30d';

    if (isCanceled || (draft && (hwid || nick))) {
      if (orderClientNick && nick) orderClientNick.value = nick;
      if (orderClientEmail && email) orderClientEmail.value = email;
      if (orderHwid && hwid) orderHwid.value = hwid;
      if (duration) {
        selectedDuration = duration;
        if (orderDurationSelect) orderDurationSelect.value = duration;
        updatePricingCards(duration);
      }
      openOrderModal(edition);
      updateGeneratedMessage();

      if (btnPayStripe) btnPayStripe.disabled = false;
      if (stripeLoadingMsg) stripeLoadingMsg.style.display = 'none';

      if (urlParams.get('canceled')) {
        const cleanUrl = window.location.pathname + (window.location.hash || '#zamow');
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }

  updatePricingCards('30d');
  window.addEventListener('pageshow', restoreDraftOrder);
  restoreDraftOrder();
});

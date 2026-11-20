const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const url = require('url');
const querystring = require('querystring');

// Wczytaj konfigurację sklepu
let SHOP_CONFIG = {};
try {
  SHOP_CONFIG = require('./prices_config.js');
} catch (e) {
  console.warn('Nie można załadować prices_config.js, używam domyślnych wartości.');
}

const PORT = process.env.PORT || 3500;
const ORDERS_DB_PATH = path.join(__dirname, 'orders_history.json');

// Ścieżki do baz licencji w projektach bota
const LICENSE_DB_PATHS = [
  path.join(__dirname, 'licenses_db.json'),
  path.join(__dirname, '..', 'VectorMc-Rust', 'admin_tool', 'licenses_db.json'),
  path.join(__dirname, '..', 'VectorMc-Rust', 'licenses_db.json'),
  path.join(__dirname, '..', 'mc-bot-node', 'admin_tool', 'licenses_db.json')
];

// Rejestr zamówień
function loadOrders() {
  if (fs.existsSync(ORDERS_DB_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(ORDERS_DB_PATH, 'utf8'));
    } catch (e) {}
  }
  return [];
}

function saveOrder(order) {
  try {
    const list = loadOrders();
    list.unshift(order);
    fs.writeFileSync(ORDERS_DB_PATH, JSON.stringify(list.slice(0, 500), null, 2), 'utf8');
  } catch (e) {
    console.error('Błąd zapisu historii zamówień:', e);
  }
}

// Funkcja automatycznej aktywacji licencji w bazie botów
function activateLicenseInBotDatabases({ hwid, name, duration, durationDays, edition, amount }) {
  const cleanHwid = (hwid || '').trim().toUpperCase();
  if (!cleanHwid) return false;

  let expiresAt = null;
  const now = Date.now();

  let days = 30;
  if (duration === 'lifetime') {
    expiresAt = null;
    days = null;
  } else if (durationDays && Number(durationDays) > 0) {
    days = Number(durationDays);
    expiresAt = now + (days * 24 * 60 * 60 * 1000);
  } else if (duration === '1d') {
    days = 1;
    expiresAt = now + (1 * 24 * 60 * 60 * 1000);
  } else if (duration === '7d') {
    days = 7;
    expiresAt = now + (7 * 24 * 60 * 60 * 1000);
  } else if (duration === '30d') {
    days = 30;
    expiresAt = now + (30 * 24 * 60 * 60 * 1000);
  } else if (duration === '365d') {
    days = 365;
    expiresAt = now + (365 * 24 * 60 * 60 * 1000);
  }

  const record = {
    name: name || 'Klient Stripe',
    hwid: cleanHwid,
    expiresAt,
    isBanned: false,
    createdAt: now,
    lastSeen: null,
    source: 'Stripe Auto-Payment',
    edition: edition || 'VectorMc'
  };

  let savedCount = 0;
  for (const dbPath of LICENSE_DB_PATHS) {
    try {
      let db = { licenses: {}, activeTokens: {} };
      if (fs.existsSync(dbPath)) {
        try {
          db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        } catch (e) {}
      } else {
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      }

      if (!db.licenses) db.licenses = {};
      db.licenses[cleanHwid] = record;
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
      savedCount++;
    } catch (err) {
      console.error(`Nie udało się zapisać do bazy: ${dbPath}`, err.message);
    }
  }

  console.log(`\n======================================================`);
  console.log(`🎉 [STRIPE AUTO-LICENCJA] Pomyślnie aktywowano licencję!`);
  console.log(`👤 Klient: ${record.name}`);
  console.log(`🔑 HWID: ${cleanHwid}`);
  console.log(`⏳ Ważność: ${expiresAt ? new Date(expiresAt).toLocaleString('pl-PL') : 'Lifetime (Na zawsze)'}`);
  console.log(`📁 Zaktualizowano baz: ${savedCount}`);
  console.log(`======================================================\n`);

  // Powiadomienie na Discord Webhook
  sendDiscordNotification({
    clientName: record.name,
    hwid: cleanHwid,
    expiresAt,
    durationText: expiresAt ? `${days} Dni (${new Date(expiresAt).toLocaleDateString('pl-PL')})` : 'Lifetime (Na zawsze)',
    edition: edition === 'rust' ? 'VectorMc PRO (Rust Edition) 👑' : 'VectorMc Standard (Node.js Edition)',
    amount: amount || '-'
  });

  return { success: true, hwid: cleanHwid, expiresAt, name: record.name };
}

// Wysyłanie powiadomienia na Discord Webhook
function sendDiscordNotification(info) {
  const webhookUrl = SHOP_CONFIG && SHOP_CONFIG.discord ? SHOP_CONFIG.discord.webhookUrl : '';
  if (!webhookUrl || !webhookUrl.startsWith('http')) return;

  try {
    const payload = JSON.stringify({
      username: 'VectorMc Store',
      avatar_url: 'https://raw.githubusercontent.com/favicon.png',
      embeds: [
        {
          title: '🎉 NOWY ZAKUP BOTA MINECRAFT (STRIPE)',
          description: `Zarejestrowano pomyślną wpłatę i **automatycznie odblokowano licencję**!`,
          color: 0x3b82f6,
          fields: [
            { name: '👤 Klient', value: info.clientName || 'Klient', inline: true },
            { name: '🤖 Wersja Bota', value: info.edition, inline: true },
            { name: '⏳ Okres Licencji', value: info.durationText, inline: true },
            { name: '🔑 Kod HWID', value: `\`${info.hwid}\``, inline: false },
            { name: '💰 Kwota Wpłaty', value: `${info.amount}`, inline: true },
            { name: '✅ Status Aktywacji', value: 'Aktywowano w bazie (Bot gotowy do gry)', inline: true }
          ],
          footer: { text: 'VectorMc Automated Licensing System' },
          timestamp: new Date().toISOString()
        }
      ]
    });

    const parsed = url.parse(webhookUrl);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    });
    req.on('error', (e) => console.error('Błąd webhooka Discord:', e.message));
    req.write(payload);
    req.end();
  } catch (e) {
    console.error('Błąd wysyłania na Discord:', e);
  }
}

// Obsługa zapytań do Stripe API za pomocą wbudowanego modułu https (Zero zależności!)
function callStripeAPI(endpoint, secretKey, postData = null, method = 'POST') {
  return new Promise((resolve, reject) => {
    const isPost = method === 'POST';
    const bodyStr = (isPost && postData) ? querystring.stringify(postData) : '';
    const headers = {
      'Authorization': `Bearer ${secretKey}`
    };
    if (isPost) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const options = {
      hostname: 'api.stripe.com',
      port: 443,
      path: endpoint,
      method: method,
      headers: headers
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.error ? parsed.error.message : `Błąd Stripe HTTP ${res.statusCode}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    if (isPost && bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function serveStatic(res, filePath, contentType) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  let bodyStr = '';
  req.on('data', chunk => {
    bodyStr += chunk;
    if (bodyStr.length > 2e6) req.destroy();
  });

  req.on('end', async () => {
    let body = {};
    if (bodyStr) {
      try {
        body = JSON.parse(bodyStr);
      } catch (e) {}
    }

    // -------------------------------------------------------------
    // API: TWORZENIE SESJI PŁATNOŚCI STRIPE CHECKOUT
    // -------------------------------------------------------------
    if (pathname === '/api/create-checkout-session' && method === 'POST') {
      try {
        const { edition, duration, customDays, clientNick, clientEmail, hwid } = body;

        if (!hwid || !hwid.trim()) {
          return sendJSON(res, 400, { error: 'Podaj kod HWID komputera, na którym ma działać bot!' });
        }

        const cleanHwid = hwid.trim().toUpperCase();
        const selectedEdition = edition === 'node' ? 'node' : 'rust';
        const editionConfig = selectedEdition === 'node' ? SHOP_CONFIG.nodeEdition : SHOP_CONFIG.rustEdition;

        // Oblicz kwotę
        let amount = 20.00;
        if (editionConfig && editionConfig.stripeAmounts && editionConfig.stripeAmounts[duration]) {
          amount = editionConfig.stripeAmounts[duration];
        }

        const currency = (SHOP_CONFIG.stripe && SHOP_CONFIG.stripe.currency) ? SHOP_CONFIG.stripe.currency : 'pln';
        const secretKey = (process.env.STRIPE_SECRET_KEY || (SHOP_CONFIG.stripe && SHOP_CONFIG.stripe.secretKey) || '').trim();

        // Sprawdź czy wprowadzono rzeczywisty klucz Stripe (sk_test_... lub sk_live_...)
        const hasRealStripeKey = (secretKey.startsWith('sk_test_51') || secretKey.startsWith('sk_live_51') || (secretKey.startsWith('sk_') && secretKey.length > 50))
          && !secretKey.includes('KLUCZ')
          && !secretKey.includes('PRYWATNY')
          && !secretKey.includes('WSTAW')
          && !secretKey.includes('TYTUJ');

        const durationTitleMap = {
          '1d': '1 Dzień',
          '7d': '7 Dni',
          '30d': '30 Dni',
          '365d': '365 Dni (1 Rok)',
          'lifetime': 'Lifetime (Na zawsze)'
        };
        const durationTitle = durationTitleMap[duration] || duration;
        const productName = `${editionConfig.name} - Licencja ${durationTitle}`;
        const host = req.headers.host || `localhost:${PORT}`;
        const protocol = req.headers['x-forwarded-proto'] || 'http';

        // 1. Jeśli Sylwek podał klucz Stripe -> Prawdziwa sesja Stripe Checkout (BLIK, Karta, P24, itp.)
        if (hasRealStripeKey) {
          const postData = {
            'success_url': `${protocol}://${host}/sukces.html?session_id={CHECKOUT_SESSION_ID}`,
            'cancel_url': `${protocol}://${host}/#editions`,
            'mode': 'payment',
            'line_items[0][price_data][currency]': currency,
            'line_items[0][price_data][product_data][name]': productName,
            'line_items[0][price_data][product_data][description]': `Kod HWID: ${cleanHwid} | Klient: ${clientNick || 'Użytkownik'}`,
            'line_items[0][price_data][unit_amount]': Math.round(amount * 100),
            'line_items[0][quantity]': 1,
            'metadata[hwid]': cleanHwid,
            'metadata[edition]': selectedEdition,
            'metadata[duration]': duration,
            'metadata[durationDays]': duration === 'lifetime' ? 'lifetime' : duration.replace('d', ''),
            'metadata[clientNick]': clientNick || 'Klient',
            'metadata[clientEmail]': clientEmail || '',
            'metadata[amount]': `${amount} ${currency.toUpperCase()}`
          };

          if (clientEmail && clientEmail.includes('@') && clientEmail.includes('.') && clientEmail.trim().length > 5) {
            postData['customer_email'] = clientEmail.trim();
          }

          const session = await callStripeAPI('/v1/checkout/sessions', secretKey, postData);
          return sendJSON(res, 200, {
            success: true,
            checkoutUrl: session.url,
            sessionId: session.id,
            isSimulator: false
          });
        }

        // 2. Tryb Symulacji (jeśli Sylwek jeszcze nie wkleił klucza Stripe)
        // Pozwala przetestować cały proces zakupu i natychmiastowej aktywacji licencji!
        console.log(`[STRIPE SIMULATOR] Tworzenie testowego zakupu dla HWID: ${cleanHwid}`);
        
        // Aktywuj licencję testowo w bazie
        const activation = activateLicenseInBotDatabases({
          hwid: cleanHwid,
          name: clientNick || 'Klient Testowy',
          duration,
          durationDays: duration === 'lifetime' ? null : duration.replace('d', ''),
          edition: selectedEdition,
          amount: `${amount} PLN`
        });

        // Zapisz zamówienie w historii
        const mockSessionId = 'mock_cs_' + Date.now();
        saveOrder({
          id: mockSessionId,
          hwid: cleanHwid,
          name: clientNick || 'Klient Testowy',
          edition: selectedEdition,
          duration,
          amount: `${amount} PLN`,
          createdAt: Date.now(),
          status: 'paid'
        });

        const redirectUrl = `/sukces.html?mock_session=${mockSessionId}&hwid=${encodeURIComponent(cleanHwid)}&edition=${selectedEdition}&duration=${duration}&nick=${encodeURIComponent(clientNick || 'Klient')}&amount=${amount}`;

        return sendJSON(res, 200, {
          success: true,
          checkoutUrl: redirectUrl,
          isSimulator: true,
          message: 'Tryb testowy: licencja została pomyślnie aktywowana w bazie botów!'
        });

      } catch (err) {
        console.error('Błąd tworzenia sesji Stripe:', err);
        return sendJSON(res, 500, { error: err.message });
      }
    }

    // -------------------------------------------------------------
    // API: WEBHOOK STRIPE (checkout.session.completed)
    // -------------------------------------------------------------
    if (pathname === '/api/webhook/stripe' && method === 'POST') {
      try {
        const event = body;

        if (event && event.type === 'checkout.session.completed') {
          const session = event.data ? event.data.object : {};
          const meta = session.metadata || {};

          console.log(`[STRIPE WEBHOOK] Otrzymano wpłatę dla sesji: ${session.id}`);

          // Automatyczna aktywacja licencji w bazach VectorMc
          activateLicenseInBotDatabases({
            hwid: meta.hwid,
            name: meta.clientNick || session.customer_details?.name || 'Klient Stripe',
            duration: meta.duration,
            durationDays: meta.durationDays,
            edition: meta.edition,
            amount: meta.amount || `${(session.amount_total || 0) / 100} PLN`
          });

          // Zapis w historii zamówień
          saveOrder({
            id: session.id,
            paymentIntent: session.payment_intent,
            hwid: meta.hwid,
            name: meta.clientNick,
            email: session.customer_details?.email,
            edition: meta.edition,
            duration: meta.duration,
            amount: meta.amount,
            createdAt: Date.now(),
            status: 'paid'
          });

          return sendJSON(res, 200, { received: true });
        }

        return sendJSON(res, 200, { received: true, ignored: true });
      } catch (err) {
        console.error('Błąd przetwarzania webhooka Stripe:', err);
        return sendJSON(res, 400, { error: err.message });
      }
    }

    // -------------------------------------------------------------
    // API: WERYFIKACJA SESJI STRIPE CHECKOUT PO POWROCIE KLIENTA
    // -------------------------------------------------------------
    if (pathname === '/api/verify-session' && method === 'GET') {
      const sessionId = parsedUrl.query.session_id;
      if (!sessionId) {
        return sendJSON(res, 400, { error: 'Brak session_id' });
      }

      const secretKey = (SHOP_CONFIG.stripe && SHOP_CONFIG.stripe.secretKey) ? SHOP_CONFIG.stripe.secretKey.trim() : '';
      if (!secretKey) {
        return sendJSON(res, 500, { error: 'Brak klucza Stripe' });
      }

      try {
        const session = await callStripeAPI(`/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, secretKey, null, 'GET');
        const isPaid = session.payment_status === 'paid' || session.status === 'complete';
        const meta = session.metadata || {};

        if (isPaid && meta.hwid) {
          // Automatyczna aktywacja licencji w bazach VectorMc
          activateLicenseInBotDatabases({
            hwid: meta.hwid,
            name: meta.clientNick || session.customer_details?.name || 'Klient Stripe',
            duration: meta.duration,
            durationDays: meta.durationDays,
            edition: meta.edition,
            amount: meta.amount || `${(session.amount_total || 0) / 100} PLN`
          });

          // Zapis w historii zamówień
          saveOrder({
            id: session.id,
            paymentIntent: session.payment_intent,
            hwid: meta.hwid,
            name: meta.clientNick || session.customer_details?.name,
            email: session.customer_details?.email,
            edition: meta.edition,
            duration: meta.duration,
            amount: meta.amount || `${(session.amount_total || 0) / 100} PLN`,
            createdAt: Date.now(),
            status: 'paid'
          });

          // Opcjonalne powiadomienie Discord
          sendDiscordNotification({
            authorName: meta.clientNick || session.customer_details?.name,
            edition: meta.edition,
            duration: meta.duration,
            hwid: meta.hwid,
            amount: meta.amount || `${(session.amount_total || 0) / 100} PLN`,
            email: session.customer_details?.email
          });
        }

        return sendJSON(res, 200, {
          success: true,
          paid: isPaid,
          hwid: meta.hwid || '',
          edition: meta.edition || 'rust',
          duration: meta.duration || '30d',
          durationDays: meta.durationDays || '30',
          clientNick: meta.clientNick || session.customer_details?.name || 'Klient',
          amount: meta.amount || `${(session.amount_total || 0) / 100} PLN`
        });
      } catch (err) {
        console.error('Błąd weryfikacji sesji Stripe:', err);
        return sendJSON(res, 500, { error: err.message });
      }
    }

    // -------------------------------------------------------------
    // API: POBIERANIE INFORMACJI O SESJI ZAMÓWIENIA
    // -------------------------------------------------------------
    if (pathname === '/api/session-info' && method === 'GET') {
      const sessionId = parsedUrl.query.session_id;
      const hwid = parsedUrl.query.hwid;

      const orders = loadOrders();
      let match = orders.find(o => o.id === sessionId || (hwid && o.hwid === hwid.trim().toUpperCase()));

      if (match) {
        return sendJSON(res, 200, { success: true, order: match });
      }

      return sendJSON(res, 200, { success: true, order: null });
    }

    // -------------------------------------------------------------
    // OBSŁUGA PLIKÓW STATYCZNYCH (HTML, CSS, JS, SVG, ICO)
    // -------------------------------------------------------------
    let cleanPath = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
    let staticPath = path.join(__dirname, cleanPath);

    if (fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
      const ext = path.extname(staticPath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.ico': 'image/x-icon',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.zip': 'application/zip',
        '.exe': 'application/octet-stream',
        '.bat': 'text/plain; charset=utf-8'
      };
      return serveStatic(res, staticPath, mimeTypes[ext] || 'text/plain');
    }

    // Fallback dla index.html
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
      return serveStatic(res, indexPath, 'text/html; charset=utf-8');
    }

    sendJSON(res, 404, { error: 'Not found' });
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🛒 VECTORMC STORE - SERWER SKLEPU & INTEGRACJA STRIPE`);
  console.log(`🚀 Port: ${PORT}`);
  console.log(`🌐 Adres strony sklepu: http://localhost:${PORT}`);
  console.log(`⚡ Automatyczna aktywacja licencji HWID: AKTYWNA`);
  console.log(`======================================================\n`);
});

// =======================================================================
// KONFIGURACJA SKLEPU VECTORMC & INTEGRACJI ZE STRIPE
// Tutaj możesz w każdej chwili wpisać swoje ceny, klucze Stripe i Discord!
// =======================================================================

const SHOP_CONFIG = {
  // 1. DANE INTEGRACJI STRIPE (Płatności BLIK, Karta, Apple Pay, Google Pay)
  // Klucze ze stripe.com (pk_test_... i sk_test_...)
  stripe: {
    enabled: true,
    currency: "pln",
    publishableKey: (typeof process !== 'undefined' && process.env && process.env.STRIPE_PUBLISHABLE_KEY) || "",
    secretKey: (typeof process !== 'undefined' && process.env && process.env.STRIPE_SECRET_KEY) || "",
    webhookSecret: (typeof process !== 'undefined' && process.env && process.env.STRIPE_WEBHOOK_SECRET) || "",
    testModeSimulator: false
  },

  // 2. POWIADOMIENIA DISCORD WEBHOOK
  // Wklej tutaj URL webhooka ze swojego serwera Discord, aby dostawać powiadomienia o każdym zakupie!
  discord: {
    webhookUrl: "", // np. https://discord.com/api/webhooks/...
    notifyOnPayment: true
  },

  // 3. DANE KONTAKTOWE & WSPARCIE DISCORD
  contact: {
    authorName: "VectorMc Team",
    discordNick: "VectorMc Support",
    discordServerInvite: "https://discord.gg/KyvwQR3mU",
    ticketChannel: "ticket-bot",
    telegram: "@VectorMcBot",
    contactNote: "W razie pytań, problemów lub płatności alternatywnych dołącz do Discorda i stwórz zgłoszenie na kanale #ticket-bot!"
  },

  // 4. CENY: WERSJA ZWYKŁA (Node.js Edition - mc-bot-node)
  // Kwoty podane w PLN (złotych) - 50% taniej względem PRO
  nodeEdition: {
    name: "VectorMc Standard (Node.js)",
    subname: "Klasyczny, sprawdzony bot z panelem Web GUI",
    badge: "Dla Początkujących",
    prices: {
      "1d": "2.50 PLN",
      "7d": "5 PLN",
      "30d": "10 PLN",
      "365d": "37.50 PLN",
      "lifetime": "75 PLN"
    },
    // Kwoty numeryczne dla Stripe (w PLN)
    stripeAmounts: {
      "1d": 2.50,
      "7d": 5.00,
      "30d": 10.00,
      "365d": 37.50,
      "lifetime": 75.00
    }
  },

  // 5. CENY: WERSJA PREMIUM (VectorMc Rust Edition - PRO)
  // Kwoty podane w PLN (złotych)
  rustEdition: {
    name: "VectorMc PRO (Rust Edition)",
    subname: "Ultra-szybki silnik w Rust • Multi-Bot • Zerowe zużycie RAM",
    badge: "🔥 NAJLEPSZY WYBÓR - BESTSELLER",
    prices: {
      "1d": "5 PLN",
      "7d": "10 PLN",
      "30d": "20 PLN",
      "365d": "75 PLN",
      "lifetime": "150 PLN"
    },
    // Kwoty numeryczne dla Stripe (w PLN)
    stripeAmounts: {
      "1d": 5.00,
      "7d": 10.00,
      "30d": 20.00,
      "365d": 75.00,
      "lifetime": 150.00
    }
  }
};

// Eksport dla Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SHOP_CONFIG;
}

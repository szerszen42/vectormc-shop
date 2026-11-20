# 🛒 VectorMc Store & Automatyzacja Stripe (BLIK / Karta)

W pełni zautomatyzowany sklep internetowy połączony z bramką płatności **Stripe** oraz bazą licencji **VectorMc** (HWID).

---

## ⚡ Jak działa automatyczna sprzedaż:

1. **Klient wchodzi na stronę**: `http://localhost:3500` (lub Twoją domenę w internecie).
2. Wybiera wersję (**Rust PRO** lub **Standard Node.js**) oraz okres licencji (1D, 7D, 30D, 365D, Lifetime).
3. Podaje swój **Nick/Discord** oraz **kod HWID** swojego komputera.
4. Klika **"💳 ZAPŁAĆ BEZPIECZNIE PRZEZ STRIPE (BLIK / KARTA)"**.
5. **Stripe potwierdza płatność**:
   - System **automatycznie dopisuje kod HWID klienta do bazy `licenses_db.json`** na zakupiony okres (np. 30 dni).
   - Klient zostaje natychmiast przekierowany na stronę `sukces.html` z potwierdzeniem i przyciskiem do pobrania bota.
   - Klient odpala pobranego bota i **bot od razu działa bez Twojej ingerencji**!
   - Na Twój Discord przychodzi powiadomienie z webhooka o zarobionej kwocie i aktywowanej licencji.

---

## 🚀 Jak uruchomić serwer sklepu ze Stripe:

Wystarczy dwukrotnie kliknąć:
👉 **`Uruchom_Sklep_Serwer.bat`**

Serwer uruchomi się na porcie `3500` i otworzy stronę w przeglądarce pod adresem:  
**`http://localhost:3500`**

---

## 🔑 Gdzie wkleić klucze ze Stripe:

Otwórz plik:  
📄 **`prices_config.js`**

W sekcji `stripe:` wklej swoje klucze z panelu [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys):
```javascript
stripe: {
  enabled: true,
  currency: "pln",
  publishableKey: "pk_live_...", // lub pk_test_... do testów
  secretKey: "sk_live_...",      // lub sk_test_... do testów
  webhookSecret: "whsec_..."
}
```

*Wskazówka: Dopóki nie wkleisz własnego klucza, sklep działa w bezpiecznym **trybie symulatora testowego**, dzięki czemu możesz przetestować cały zakup i auto-aktywację od razu!*

---

## 🔔 Powiadomienia na Twój Discord:
W pliku `prices_config.js` wklej adres Webhooka ze swojego kanału Discord:
```javascript
discord: {
  webhookUrl: "https://discord.com/api/webhooks/...",
  notifyOnPayment: true
}
```
Otrzymasz powiadomienie o każdym zakupionym bocie z nickiem klienta, kodem HWID i kwotą wpłaty!

/**
 * PAKHTOON CHAT ROOM — WhatsApp Auto-Reply Bot.
 *
 * Koi bhi tumhare WhatsApp Business number par message karega to
 * yeh server tumhare app ke Firebase backend se data nikaal kar
 * auto-jawab bhejega (Meta WhatsApp Cloud API ke zariye).
 *
 * Setup: README.md parho.  Run:  npm install && npm start
 */

require("dotenv").config();
const express = require("express");
const axios = require("axios");
const admin = require("firebase-admin");

const {
  PORT = 3000,
  VERIFY_TOKEN,
  WHATSAPP_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  FIREBASE_SERVICE_ACCOUNT, // serviceAccountKey.json ka path
  FIREBASE_SERVICE_ACCOUNT_JSON, // ya JSON string (hosting pe env var ke liye)
  SUPPORT_FALLBACK = "Mazeed madad ke liye app ke Support Center se rabta karein.",
} = process.env;

if (!VERIFY_TOKEN || !WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || (!FIREBASE_SERVICE_ACCOUNT && !FIREBASE_SERVICE_ACCOUNT_JSON)) {
  console.error("Missing env vars. Copy .env.example to .env and fill it.");
  process.exit(1);
}

let firebaseCredential;
if (FIREBASE_SERVICE_ACCOUNT_JSON) {
  firebaseCredential = admin.credential.cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON));
} else {
  firebaseCredential = admin.credential.cert(require(FIREBASE_SERVICE_ACCOUNT));
}
admin.initializeApp({
  credential: firebaseCredential,
});
const db = admin.firestore();

const app = express();
app.use(express.json());

// ---- 1. Webhook verification (Meta ek dafa GET bhejta hai) ----
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified.");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ---- 2. Incoming messages ----
app.post("/webhook", (req, res) => {
  res.sendStatus(200); // Meta ko foran ACK
  handleIncoming(req.body).catch((e) => console.error("handleIncoming:", e.message));
});

async function handleIncoming(body) {
  const value = body?.entry?.[0]?.changes?.[0]?.value;
  const msg = value?.messages?.[0];
  if (!msg || msg.type !== "text") return; // sirf text messages

  const from = msg.from; // sender ka WhatsApp number
  const text = (msg.text?.body || "").trim();
  if (!text) return;

  console.log(`Incoming from ${from}: ${text}`);
  const reply = await buildReply(text);
  await sendWhatsApp(from, reply);
}

// ---- 3. Bot logic: tumhari API (Firebase) se jawab ----
async function buildReply(text) {
  const upper = text.toUpperCase().trim();

  // Salaam / hello
  if (/^(SALAM|ASSALAM|ASSALAM[- ]?O[- ]?ALAIKUM|HI|HELLO|AOA)\b/.test(upper)) {
    return (
      "Walaikum Assalam! 👋 *PAKHTOON CHAT ROOM* support mein khush aamdeed.\n\n" +
      menuText()
    );
  }

  // HELP / MENU
  if (/^(HELP|MENU|MADAD)$/.test(upper)) return menuText();

  // CODE <referral-code> — referral code ki detail + invite link
  const codeMatch = upper.match(/^CODE\s+([A-Z0-9]{4,16})$/);
  if (codeMatch) {
    const code = codeMatch[1];
    const snap = await db.collection("referrals").doc(code).get();
    if (!snap.exists) {
      return `❌ Code *${code}* nahi mila. Code dobara check karke bhejein.\n\nMisal: CODE UCABC123`;
    }
    const d = snap.data();
    return (
      `✅ Referral code *${code}* valid hai!\n\n` +
      `🔗 Invite link: https://umarchatroom.app/invite/${code}\n` +
      `👥 Ab tak invited: ${d.invitedCount || 0}\n` +
      `💰 Is code se kamaye gaye coins: ${d.earnedCoins || 0}\n\n` +
      `Naya user signup par yeh code daale to refer karne wale ko bonus coins milte hain!`
    );
  }

  // OFFER / ANNOUNCE — latest announcement (config/admin se)
  if (/^(OFFER|OFFERS|ANNOUNCE|ANNOUNCEMENT|ELAN)$/.test(upper)) {
    const cfg = await db.collection("config").doc("admin").get();
    const a = cfg.exists ? cfg.data().announcement : null;
    const reward = cfg.exists ? cfg.data().referralRewardCoins : 100;
    return (
      `📢 *Taza tareen elan:*\n\n${a || "Abhi koi khaas elan nahi."}\n\n` +
      `💰 Referral reward: har kamyab invite par *${reward} coins*!`
    );
  }

  // DOWNLOAD — Play Store link
  if (/^(DOWNLOAD|APP|LINK|INSTALL)$/.test(upper)) {
    const cfg = await db.collection("config").doc("admin").get();
    const link = cfg.exists && cfg.data().playStoreUrl
      ? cfg.data().playStoreUrl
      : "Play Store link jald aa raha hai — thoda intezar karein!";
    return `📲 *PAKHTOON CHAT ROOM* download karein:\n${link}`;
  }

  // Default fallback
  return (
    `Samajh nahi aaya 🤔 — main aapki madad kar sakta hun:\n\n${menuText()}\n\n${SUPPORT_FALLBACK}`
  );
}

function menuText() {
  return (
    "Yeh commands bhejein:\n" +
    "• *CODE <code>* — referral code check karein (misal: CODE UCABC123)\n" +
    "• *OFFER* — taza elanat aur referral reward\n" +
    "• *DOWNLOAD* — app download link\n" +
    "• *HELP* — yeh menu dobara"
  );
}

// ---- 4. WhatsApp Cloud API se jawab bhejo ----
async function sendWhatsApp(to, text) {
  await axios.post(
    `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    },
    { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
  );
  console.log(`Replied to ${to}`);
}

app.listen(PORT, () => console.log(`WhatsApp bot running on port ${PORT}`));

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const pino = require("pino");
const fs = require("fs");

// ─── Config ───────────────────────────────────────
const YOUR_NUMBER = "233540311067";       // Admin number (receives orders)
const BOT_NUMBER  = "233274843449";       // Bot number
const SHOP_URL = "https://www.cheapdata.shop/shop/expo-data-gh-1775073225900/products";
const STATE_FILE  = "customer_state.json";
const SESSION_TIMEOUT = 30 * 60 * 1000;

// ─── MTN Bundles ──────────────────────────────────
const MTN_BUNDLES = {
  "1":  { size: "1GB",  price: "₵4.70" },
  "2":  { size: "2GB",  price: "₵9.70" },
  "3":  { size: "3GB",  price: "₵14.50" },
  "4":  { size: "4GB",  price: "₵19.50" },
  "5":  { size: "5GB",  price: "₵24.50" },
  "6":  { size: "6GB",  price: "₵27.00" },
  "7":  { size: "8GB",  price: "₵35.00" },
  "8":  { size: "10GB", price: "₵43.00" },
  "9":  { size: "15GB", price: "₵63.00" },
  "10": { size: "20GB", price: "₵83.00" },
  "11": { size: "25GB", price: "₵103.00" },
  "12": { size: "30GB", price: "₵125.00" },
  "13": { size: "40GB", price: "₵165.00" },
  "14": { size: "50GB", price: "₵215.00" },
};

// ─── State Helpers ────────────────────────────────
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE))
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch { }
  return {};
}

function saveState(state) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(state)); }
  catch (e) { console.error("Could not save state:", e); }
}

function getCustomerState(allStates, number) {
  const state = allStates[number] || { step: "start" };
  const lastActive = state.last_active || 0;
  if (Date.now() - lastActive > SESSION_TIMEOUT && state.step !== "start") {
    return { step: "start" };
  }
  return state;
}

function setCustomerState(allStates, number, newState) {
  newState.last_active = Date.now();
  allStates[number] = newState;
  saveState(allStates);
}

// ─── Validation ───────────────────────────────────
function isValidGhPhone(number) {
  const cleaned = number.replace(/\s+/g, "");
  return /^0[2-5]\d{8}$/.test(cleaned);
}

function parseNameAndNumber(text) {
  const parts = text.split(",").map(p => p.trim());
  if (parts.length !== 2) return [null, null];
  const [name, phone] = parts;
  if (name.length < 2) return [null, null];
  if (!isValidGhPhone(phone)) return [null, null];
  return [name, phone];
}

// ─── Bundle Menu ──────────────────────────────────
function bundleMenu() {
  let menu = "📦 *MTN Data Bundles* (90 days validity)\n\n";
  for (const [key, bundle] of Object.entries(MTN_BUNDLES)) {
    menu += `${key.padStart(2, "0")}. ${bundle.size} — ${bundle.price}\n`;
  }
  menu += "\nReply with the number to select (e.g. *1* for 1GB)\n";
  menu += "Or type *menu* to go back 🔙";
  return menu;
}

// ─── Support number: strip country code to show 0XXXXXXXXX ───
const SUPPORT_NUMBER = "0" + BOT_NUMBER.slice(3);

// ─── Main Bot ─────────────────────────────────────
async function startBot() {
  const { state: authState, saveCreds } = await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    auth: authState,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    getMessage: async () => ({ conversation: "" }),
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log("\n📱 Scan this QR code with your WhatsApp:\n");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("Connection closed. Reconnecting:", shouldReconnect);
      if (shouldReconnect) startBot();
    }
    if (connection === "open") {
      console.log("✅ Bot is connected and running!");
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const adminJid     = `${YOUR_NUMBER}@s.whatsapp.net`;
    const senderNumber = msg.key.remoteJid;

    const text = (
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ""
    ).trim();

    if (!text) return;

    // ─────────────────────────────────────────────
    // ADMIN COMMANDS
    // ─────────────────────────────────────────────
    const isFromAdmin =
      msg.key.fromMe ||
      senderNumber === adminJid ||
      senderNumber.includes(YOUR_NUMBER);

    if (isFromAdmin) {
      if (text.toLowerCase().startsWith("reply ")) {
        const spaceIndex = text.indexOf(" ", 6);
        const targetJid  = text.substring(6, spaceIndex).trim();
        const replyText  = text.substring(spaceIndex + 1).trim();
        if (targetJid && replyText) {
          await sock.sendMessage(targetJid, { text: replyText });
          await sock.sendMessage(adminJid, {
            text: `✅ Reply sent to ${targetJid}`
          });
        }
      }
      return;
    }

    // ─────────────────────────────────────────────
    // CUSTOMER MESSAGES
    // ─────────────────────────────────────────────
    const allStates = loadState();
    const state = getCustomerState(allStates, senderNumber);

    // ── send helper — silently handles 406 not-acceptable ──
    const send = async (message) => {
      try {
        await sock.sendMessage(senderNumber, { text: message });
      } catch (err) {
        if (err?.data === 406) {
          console.warn(`⚠️ Could not deliver to ${senderNumber} — number may not have WhatsApp.`);
        } else {
          throw err;
        }
      }
    };

    try {

      // ── Customer sends verification code or skip ──
      if (state.step === "awaiting_verification") {
        if (text.toLowerCase() === "skip") {
          await sock.sendMessage(adminJid, {
            text:
              `🔐 *Verification Code Update*\n` +
              `━━━━━━━━━━━━━━━━━━\n` +
              `• Customer: ${senderNumber}\n` +
              `• Order: ${state.name_number}\n` +
              `• Code: *Not provided (skipped)*`
          });
          await send(
            "✅ *Order Confirmed!*\n\n" +
            `Your *MTN ${state.bundle}* will be delivered shortly.\n` +
            `⏱ Delivery: *10–60 minutes*\n\n` +
            `Thank you for choosing *Expo Data GH!* 🙏\n` +
            `Support: *${SUPPORT_NUMBER}*`
          );
        } else {
          await sock.sendMessage(adminJid, {
            text:
              `🔑 *Verification Code Update*\n` +
              `━━━━━━━━━━━━━━━━━━\n` +
              `• Customer: ${senderNumber}\n` +
              `• Order: ${state.name_number}\n` +
              `• Code: *${text}*`
          });
          await send(
            "✅ *Confirmation code received!*\n\n" +
            "We are processing your order now. 🙏\n\n" +
            `⏱ Delivery: *10–60 minutes*\n\n` +
            `Support: *${SUPPORT_NUMBER}*`
          );
        }
        setCustomerState(allStates, senderNumber, { step: "start" });
        return;
      }

      // ── Global: hi/hello/hey/start/menu ──
      if (["hi", "hello", "hey", "start", "menu"].includes(text.toLowerCase())) {
        await send(
          "👋 Welcome to *Expo Data GH!* 🇬🇭\n" +
          "━━━━━━━━━━━━━━━━━━\n" +
          "Your trusted plug for affordable data bundles!\n\n" +
          "What would you like to do?\n\n" +
          "1️⃣ Buy Data\n" +
          "2️⃣ Text Admin\n\n" +
          "Reply with *1* or *2*"
        );
        setCustomerState(allStates, senderNumber, { step: "main_menu" });

      // ── Main Menu ──
      } else if (state.step === "main_menu") {
        if (text === "1") {
          setCustomerState(allStates, senderNumber, { step: "choose_network" });
          await send(
            "📡 *Choose Your Network:*\n\n" +
            "1️⃣ MTN ✅\n" +
            "2️⃣ Telecel ❌ *Out of Stock*\n" +
            "3️⃣ AirtelTigo ❌ *Out of Stock*\n\n" +
            "Reply with *1* to order MTN data\n" +
            "Or type *menu* to go back 🔙"
          );
        } else if (text === "2") {
          setCustomerState(allStates, senderNumber, { step: "start" });
          await send(
            "📞 *Contact Admin*\n\n" +
            "Please reach out to us directly on WhatsApp:\n\n" +
            "*0548693289*"
          );
        } else {
          await send("Please reply with *1* to Buy Data or *2* to Text Admin.");
        }

      // ── Choose Network ──
      } else if (state.step === "choose_network") {
        if (text === "1") {
          setCustomerState(allStates, senderNumber, { step: "choose_bundle" });
          await send(bundleMenu());
        } else if (text === "2" || text === "3") {
          const network = text === "2" ? "Telecel" : "AirtelTigo";
          await send(
            `❌ Sorry, *${network}* is currently *out of stock*.\n\n` +
            "Only *MTN* is available right now.\n" +
            "Reply *1* to order MTN instead. 👍"
          );
        } else {
          await send("Please reply *1* for MTN, *2* for Telecel, or *3* for AirtelTigo.");
        }

      // ── Choose Bundle ──
      } else if (state.step === "choose_bundle") {
        if (MTN_BUNDLES[text]) {
          const bundle = MTN_BUNDLES[text];
          setCustomerState(allStates, senderNumber, {
            step: "enter_name_number",
            bundle: bundle.size,
            price: bundle.price,
          });
          await send(
            `✅ You selected *MTN ${bundle.size}* — *${bundle.price}*\n\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `Please enter your *full name* and the *number to receive the data*\n\n` +
            `📝 Format: *Name, 024XXXXXXX*\n` +
            `📌 Example: *John Mensah, 0241234567*`
          );
        } else {
          await send(`⚠️ Please reply with a number from *1* to *14*.\n\n${bundleMenu()}`);
        }

      // ── Enter Name & Number ──
      } else if (state.step === "enter_name_number") {
        const [name, phone] = parseNameAndNumber(text);
        if (!name) {
          await send(
            "⚠️ *Invalid format.* Please use:\n\n" +
            "📝 Format: *Name, 024XXXXXXX*\n" +
            "📌 Example: *John Mensah, 0241234567*\n\n" +
            "Make sure the phone number is a valid Ghanaian number."
          );
        } else {
          setCustomerState(allStates, senderNumber, {
            step: "payment",
            bundle: state.bundle,
            price: state.price,
            name,
            recipient_number: phone,
            name_number: text,
          });
          await send(
            `💳 *Payment Checkout*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `• Bundle: *MTN ${state.bundle}*\n` +
            `• Price: *${state.price}*\n` +
            `• Recipient: *${name}* (${phone})\n\n` +
            `Please enter your *MoMo number* to receive the payment prompt:\n` +
            `(e.g. *0241234567*)`
          );
        }

      // ── Payment ──
      } else if (state.step === "payment") {
        if (!isValidGhPhone(text)) {
          await send(
            "⚠️ That doesn't look like a valid MoMo number.\n\n" +
            "Please enter a valid Ghanaian phone number.\n" +
            "Example: *0241234567*"
          );
        } else {
          const { bundle, price, name_number } = state;

          setCustomerState(allStates, senderNumber, {
            step: "awaiting_verification",
            bundle,
            price,
            name_number,
            momo: text,
          });

          await send(
            `⏳ *Please kindly wait...*\n\n` +
            `We are processing your MoMo prompt to *${text}*.\n\n` +
            `✅ Once payment is approved, your *MTN ${bundle}* will be delivered.\n` +
            `⏱ Delivery: *10–60 minutes*\n\n` +
            `Thank you for choosing *Expo Data GH!* 🙏\n` +
            `Support: *${SUPPORT_NUMBER}*`
          );

          await send(
            `🔐 *Verification Code*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `If your network sent you a *confirmation code*, please type it below.\n\n` +
            `If you did not receive a code, type *skip*`
          );

          await sock.sendMessage(adminJid, {
            text:
              `🛒 *NEW ORDER!*\n` +
              `━━━━━━━━━━━━━━━━━━\n` +
              `• Customer WA: ${senderNumber}\n` +
              `• Name & Recipient: ${name_number}\n` +
              `• Bundle: MTN ${bundle}\n` +
              `• Price: ${price}\n` +
              `• MoMo Number: ${text}\n\n` +
              `👉 Place order & send MoMo prompt:\n${SHOP_URL}`
          });
        }

      } else {
        await send("Type *hi* or *menu* to get started 👋");
      }

    } catch (err) {
      console.error("Error handling message:", err);
      await send("⚠️ Something went wrong. Please type *menu* to try again.");
    }
  });
}

startBot();

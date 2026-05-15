# Expo Data GH — WhatsApp Bot

A WhatsApp chatbot for selling MTN data bundles built with Baileys (100% free, no Meta API needed).

---

## Requirements

- A computer (Windows, Mac, or Linux)
- [Node.js LTS](https://nodejs.org) installed
- A WhatsApp number dedicated to the bot (recommended: a second SIM)

---

## First Time Setup

### Step 1 — Install Node.js
Go to [https://nodejs.org](https://nodejs.org) and download the **LTS version**.
After installing, open Command Prompt and confirm it worked:
```
node -v
npm -v
```
Both should print a version number.

---

### Step 2 — Create Your Project Folder
```
mkdir expo-data-bot
cd expo-data-bot
```

---

### Step 3 — Install Dependencies
```
npm init -y
npm install @whiskeysockets/baileys qrcode-terminal pino
```

---

### Step 4 — Add the Bot File
Place the `bot.js` file inside your `expo-data-bot` folder.

---

### Step 5 — Configure Your Numbers
Open `bot.js` in Notepad and update these two lines at the top:

```js
const YOUR_NUMBER = "233XXXXXXXXX"; // Your admin number (receives orders)
const BOT_NUMBER  = "233XXXXXXXXX"; // Support number shown to customers
```

> Replace `233` with Ghana's country code + your number without the leading `0`.
> Example: `0540311067` becomes `233540311067`

---

### Step 6 — Run the Bot
```
node bot.js
```

A **QR code** will appear in the terminal. Open WhatsApp on your bot phone:
- Tap the three dots (⋮) → **Linked Devices** → **Link a Device**
- Scan the QR code

You should see:
```
✅ Bot is connected and running!
```

---

## Running the Bot After First Setup

Every time you want to start the bot, open Command Prompt and run:
```
cd expo-data-bot
node bot.js
```

No QR scan needed after the first time — your session is saved in the `auth_info` folder.

---

## Keep the Bot Running in the Background (Optional)

Install PM2 to keep the bot alive even after closing the terminal:
```
npm install -g pm2
pm2 start bot.js --name expo-bot
pm2 save
```

### Useful PM2 Commands
| Command | What it does |
|---|---|
| `pm2 list` | Check if bot is running |
| `pm2 restart expo-bot` | Restart the bot |
| `pm2 stop expo-bot` | Stop the bot |
| `pm2 logs expo-bot` | View live logs |

---

## Stopping the Bot Safely

To stop without losing your WhatsApp session:
```
Ctrl + C
```

---

## If the Bot Logs Out (Reconnecting: false)

Delete the saved session and scan the QR code again:
```
rmdir /s /q auth_info
node bot.js
```

---

## How to Reply to Customers (Text Admin)

When a customer uses the **Text Admin** option, their messages are forwarded to you.
To reply back through the bot, type this on your WhatsApp:

```
reply [customer number] your message here
```

**Example:**
```
reply 233244123456@s.whatsapp.net Your data has been sent, please check!
```

You will receive a confirmation:
```
✅ Reply sent to 233244123456@s.whatsapp.net
```

---

## How the Bot Works

```
Customer sends "hi"
       ↓
Main Menu — 1) Buy Data  2) Text Admin
       ↓
[Buy Data]
Choose Network → Choose Bundle → Enter Name & Number → Enter MoMo Number
       ↓
Bot sends customer: Please wait + Verification code prompt
Bot sends admin: Full order summary
       ↓
Customer types code or "skip"
Bot sends admin: Verification code update (separate message)

[Text Admin]
Customer types messages → forwarded to admin
Admin replies using: reply [jid] message
Customer types "menu" → returns to main menu
```

---

## File Structure

```
expo-data-bot/
├── bot.js                  ← Main bot file
├── auth_info/              ← WhatsApp session (auto-created)
├── customer_state.json     ← Tracks each customer's conversation (auto-created)
├── package.json            ← Project config
└── node_modules/           ← Installed packages
```

---

## Important Notes

- **Do not delete `auth_info/`** unless you want to re-scan the QR code
- **Do not use your personal number** as the bot number — use a dedicated SIM
- The bot only replies to customers who message it first — this reduces ban risk
- WhatsApp may occasionally disconnect — the bot auto-reconnects

---

## Support

For issues contact: **0548693289**

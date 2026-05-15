const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: "auth_info" }),
    puppeteer: {
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--single-process",
            "--disable-gpu",
        ],
    },
});

// QR code for scanning
client.on("qr", (qr) => {
    console.log("\n📱 Scan this QR code with your WhatsApp:\n");
    qrcode.generate(qr, { small: true });
});

// Fired when authentication is successful
client.on("authenticated", () => {
    console.log("🔐 Authenticated successfully!");
});

// Fired if authentication fails
client.on("auth_failure", (msg) => {
    console.error("❌ Authentication failed:", msg);
});

// Fired when client is ready
client.on("ready", () => {
    console.log("✅ Bot is connected and ready!");
});

// Fired when connection is lost
client.on("disconnected", (reason) => {
    console.log("⚠️  Disconnected:", reason);
    console.log("🔄 Restarting in 5 seconds...");
    setTimeout(() => client.initialize(), 5000);
});

// Handle incoming messages
client.on("message", async (msg) => {
    // Ignore messages sent by the bot itself
    if (msg.fromMe) return;

    try {
        console.log(`📩 Message from ${msg.from}: ${msg.body}`);

        // Reply with "hi"
        await msg.reply("hi");
    } catch (err) {
        console.error("Error sending message:", err);
    }
});

client.initialize();
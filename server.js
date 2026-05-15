const express = require("express");
const { WebSocketServer } = require("ws");
const { spawn } = require("child_process");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "public")));

const server = app.listen(3000, () => {
  console.log("Dashboard running at http://localhost:3000");
});

const wss = new WebSocketServer({
  server,
  verifyClient: ({ origin }) => {
    // allow localhost and any github.io page
    if (!origin) return true;
    return origin.startsWith("http://localhost") ||
           origin.startsWith("https://localhost") ||
           origin.endsWith(".github.io");
  },
});

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "status", text: "▶ Starting bot...\n" }));

  const bot = spawn("node", ["bot.js"], { cwd: __dirname });

  const send = (text) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: "log", text }));
    }
  };

  bot.stdout.on("data", (data) => send(data.toString()));
  bot.stderr.on("data", (data) => send(data.toString()));

  bot.on("exit", (code) => {
    send(`\n⚠️  Bot process exited (code ${code})\n`);
  });

  ws.on("close", () => bot.kill());
  ws.on("message", (msg) => {
    if (msg.toString() === "restart") {
      bot.kill();
    }
  });
});

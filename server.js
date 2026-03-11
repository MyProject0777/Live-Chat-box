const express = require("express");
const http = require("http");
const os = require("os");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_URL = normalizeUrl(process.env.PUBLIC_URL || "");
const CORS_ORIGINS = getAllowedOrigins(process.env.CORS_ORIGINS);

// Connected users keyed by socket.id.
const users = Object.create(null);

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (isOriginAllowed(origin, CORS_ORIGINS)) {
                callback(null, true);
                return;
            }
            callback(new Error("Not allowed by CORS"));
        },
        methods: ["GET", "POST"]
    }
});

app.set("trust proxy", true);
app.use(express.static("public"));

app.get("/config", (req, res) => {
    res.json({
        joinUrl: PUBLIC_URL || `${req.protocol}://${req.get("host")}`
    });
});

io.on("connection", (socket) => {
    // Send current online state to newly connected client.
    socket.emit("online users", {
        count: getOnlineCount(),
        users: getUsersList()
    });

    socket.on("join chat", (rawUsername, acknowledge) => {
        const username = sanitizeUsername(rawUsername) || `Guest-${socket.id.slice(0, 5)}`;
        users[socket.id] = username;

        if (typeof acknowledge === "function") {
            acknowledge({ username });
        }

        io.emit("user joined", { username, socketId: socket.id });
        io.emit("online users", {
            count: getOnlineCount(),
            users: getUsersList()
        });

        console.log(`${username} joined (${socket.id})`);
    });

    socket.on("chat message", (rawMessage) => {
        const username = users[socket.id];
        const message = sanitizeMessage(rawMessage);

        if (!username || !message) {
            return;
        }

        io.emit("chat message", {
            username,
            message,
            socketId: socket.id,
            timestamp: new Date().toLocaleTimeString()
        });
    });

    socket.on("disconnect", () => {
        const username = users[socket.id];
        if (!username) {
            return;
        }

        delete users[socket.id];

        io.emit("user left", { username, socketId: socket.id });
        io.emit("online users", {
            count: getOnlineCount(),
            users: getUsersList()
        });

        console.log(`${username} left (${socket.id})`);
    });
});

function sanitizeUsername(value) {
    return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 24);
}

function sanitizeMessage(value) {
    return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 500);
}

function getOnlineCount() {
    return Object.keys(users).length;
}

function getUsersList() {
    return Object.entries(users).map(([id, username]) => ({ id, username }));
}

function getLanIPv4() {
    const interfaces = os.networkInterfaces();
    for (const addresses of Object.values(interfaces)) {
        if (!addresses) continue;
        for (const address of addresses) {
            if (address.family === "IPv4" && !address.internal) {
                return address.address;
            }
        }
    }
    return null;
}

function normalizeUrl(rawUrl) {
    const url = rawUrl.trim().replace(/\/+$/, "");
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    return `https://${url}`;
}

function getAllowedOrigins(rawOrigins) {
    const fromEnv = (rawOrigins || "")
        .split(",")
        .map((origin) => normalizeUrl(origin))
        .filter(Boolean);

    if (PUBLIC_URL && !fromEnv.includes(PUBLIC_URL)) {
        fromEnv.push(PUBLIC_URL);
    }

    return fromEnv;
}

function isOriginAllowed(origin, allowedOrigins) {
    if (!origin) return true;
    if (!allowedOrigins.length) return true;
    return allowedOrigins.includes(origin);
}

server.listen(PORT, HOST, () => {
    console.log(`Server running on http://localhost:${PORT}`);

    const lanIp = getLanIPv4();
    if (lanIp) {
        console.log(`Open on mobile: http://${lanIp}:${PORT}`);
    }

    if (PUBLIC_URL) {
        console.log(`Public join link: ${PUBLIC_URL}`);
    }
});

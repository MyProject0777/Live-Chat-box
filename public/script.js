const socket = io();

const onlineCountElement = document.getElementById("onlineCount");
const sessionInfoElement = document.getElementById("sessionInfo");
const messagesElement = document.getElementById("messages");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendBtn");
const usersModal = document.getElementById("usersModal");
const usersList = document.getElementById("usersList");
const closeUsersModalButton = document.getElementById("closeUsersModal");

let currentUsername = "";
let onlineUsers = [];

initializeChat();
bindUserListModalEvents();

function initializeChat() {
    const enteredUsername = promptForUsername();

    socket.emit("join chat", enteredUsername, (payload) => {
        currentUsername = sanitizeText(payload?.username || enteredUsername, 24);
        sessionInfoElement.textContent = `You are chatting as ${currentUsername}`;
        enableInput();
    });
}

function promptForUsername() {
    while (true) {
        const value = window.prompt("Enter your username:");

        if (value === null) {
            return `Guest-${Math.floor(Math.random() * 10000)}`;
        }

        const username = sanitizeText(value, 24);
        if (username) {
            return username;
        }

        window.alert("Username cannot be empty.");
    }
}

function bindUserListModalEvents() {
    onlineCountElement.addEventListener("click", openUsersModal);
    closeUsersModalButton.addEventListener("click", closeUsersModal);

    usersModal.addEventListener("click", (event) => {
        if (event.target === usersModal) {
            closeUsersModal();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeUsersModal();
        }
    });
}

function sanitizeText(value, maxLength) {
    return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, maxLength);
}

function enableInput() {
    messageInput.disabled = false;
    sendButton.disabled = false;
    messageInput.focus();
}

function setOnlineCount(count) {
    const suffix = count === 1 ? "user" : "users";
    onlineCountElement.textContent = `${count} ${suffix} online`;
}

function normalizeUsers(rawUsers) {
    if (!Array.isArray(rawUsers)) {
        return [];
    }

    return rawUsers
        .map((user) => {
            if (typeof user === "string") {
                const username = sanitizeText(user, 24);
                if (!username) return null;
                return { id: "", username };
            }

            const id = String(user?.id || "");
            const username = sanitizeText(user?.username, 24);
            if (!username) return null;
            return { id, username };
        })
        .filter(Boolean);
}

function renderOnlineUsers() {
    usersList.innerHTML = "";

    if (!onlineUsers.length) {
        const emptyItem = document.createElement("li");
        emptyItem.className = "users-list-item";
        emptyItem.textContent = "No users online right now.";
        usersList.appendChild(emptyItem);
        return;
    }

    onlineUsers.forEach((user) => {
        const item = document.createElement("li");
        item.className = "users-list-item";
        item.textContent = user.username;

        if (user.id && user.id === socket.id) {
            const marker = document.createElement("span");
            marker.className = "users-self";
            marker.textContent = "(You)";
            item.appendChild(marker);
        }

        usersList.appendChild(item);
    });
}

function openUsersModal() {
    renderOnlineUsers();
    usersModal.hidden = false;
}

function closeUsersModal() {
    usersModal.hidden = true;
}

function scrollToBottom() {
    messagesElement.scrollTop = messagesElement.scrollHeight;
}

function addMessage(text, type) {
    const node = document.createElement("div");
    node.className = `message ${type}`;
    node.textContent = text;
    messagesElement.appendChild(node);
    scrollToBottom();
}

function addNotice(text) {
    addMessage(text, "notice");
}

chatForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const message = sanitizeText(messageInput.value, 500);
    if (!message) {
        return;
    }

    socket.emit("chat message", message);
    messageInput.value = "";
    messageInput.focus();
});

socket.on("chat message", (payload) => {
    const username = sanitizeText(payload?.username, 24);
    const message = sanitizeText(payload?.message, 500);
    const senderId = String(payload?.socketId || "");

    if (!username || !message) {
        return;
    }

    const isSelf = senderId ? senderId === socket.id : username === currentUsername;
    const type = isSelf ? "self" : "other";
    addMessage(`${username}: ${message}`, type);
});

socket.on("online users", (payload) => {
    onlineUsers = normalizeUsers(payload?.users);

    const requestedCount = Number(payload?.count);
    const count = Number.isFinite(requestedCount) && requestedCount >= 0
        ? requestedCount
        : onlineUsers.length;

    setOnlineCount(count);
    renderOnlineUsers();
});

socket.on("user joined", (payload) => {
    const username = sanitizeText(payload?.username, 24);
    if (!username) {
        return;
    }

    addNotice(`User joined: ${username}`);
});

socket.on("user left", (payload) => {
    const username = sanitizeText(payload?.username, 24);
    if (!username) {
        return;
    }

    addNotice(`User left: ${username}`);
});

socket.on("disconnect", () => {
    sessionInfoElement.textContent = "Disconnected. Refresh the page to reconnect.";
    messageInput.disabled = true;
    sendButton.disabled = true;
});

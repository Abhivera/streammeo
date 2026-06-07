(function () {
  const script = document.currentScript;
  if (!script) return;

  const apiKey = script.getAttribute("data-api-key");
  const apiBase = script.getAttribute("data-api-url") || "";
  if (!apiKey) {
    console.error("[Streammeo] data-api-key is required");
    return;
  }

  const host = document.createElement("div");
  host.id = "streammeo-chat-root";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  const styles = `
    * { box-sizing: border-box; font-family: system-ui, sans-serif; }
    .btn { position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
      border-radius: 50%; border: none; background: #FF1E2D; color: #fff; cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,.2); font-size: 22px; z-index: 2147483646; }
    .panel { position: fixed; bottom: 92px; right: 24px; width: 340px; height: 420px;
      background: #fff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,.15);
      display: none; flex-direction: column; overflow: hidden; z-index: 2147483647; }
    .panel.open { display: flex; }
    .header { background: #FF1E2D; color: #fff; padding: 14px 16px; font-weight: 600; }
    .messages { flex: 1; overflow-y: auto; padding: 12px; background: #f8f9fa; }
    .msg { margin-bottom: 10px; max-width: 85%; padding: 8px 12px; border-radius: 12px;
      font-size: 14px; line-height: 1.4; }
    .msg.visitor { background: #FF1E2D; color: #fff; margin-left: auto; }
    .msg.bot, .msg.agent { background: #e9ecef; color: #212529; }
    .input-row { display: flex; border-top: 1px solid #dee2e6; padding: 8px; gap: 8px; }
    .input-row input { flex: 1; border: 1px solid #ced4da; border-radius: 8px; padding: 8px 12px; }
    .input-row button { background: #FF1E2D; color: #fff; border: none; border-radius: 8px;
      padding: 8px 14px; cursor: pointer; }
  `;

  shadow.innerHTML = `
    <style>${styles}</style>
    <button class="btn" type="button" aria-label="Open chat">💬</button>
    <div class="panel">
      <div class="header">Chat with us</div>
      <div class="messages"></div>
      <div class="input-row">
        <input type="text" placeholder="Type a message…" />
        <button type="button">Send</button>
      </div>
    </div>
  `;

  const btn = shadow.querySelector(".btn");
  const panel = shadow.querySelector(".panel");
  const messagesEl = shadow.querySelector(".messages");
  const input = shadow.querySelector("input");
  const sendBtn = shadow.querySelector(".input-row button");

  let sessionId = null;
  let open = false;

  function appendMsg(role, body) {
    const div = document.createElement("div");
    div.className = "msg " + role;
    div.textContent = body;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function api(path, method, body) {
    const res = await fetch(apiBase + path, {
      method,
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error("API error");
    return res.json();
  }

  async function startChat(message) {
    const data = await api("/api/v1/chat/start", "POST", { message });
    sessionId = data.sessionId;
    messagesEl.innerHTML = "";
    data.messages.forEach(function (m) {
      appendMsg(m.role === "visitor" ? "visitor" : "bot", m.body);
    });
  }

  btn.addEventListener("click", function () {
    open = !open;
    panel.classList.toggle("open", open);
    if (open && !sessionId) {
      startChat("Hello, I need help.").catch(function () {
        appendMsg("bot", "Unable to connect. Please try again later.");
      });
    }
  });

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    appendMsg("visitor", text);
    if (!sessionId) {
      await startChat(text);
      return;
    }
    try {
      await api("/api/v1/chat/" + sessionId + "/message", "POST", { message: text });
    } catch {
      appendMsg("bot", "Message failed to send.");
    }
  }

  sendBtn.addEventListener("click", function () {
    sendMessage().catch(console.error);
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") sendMessage().catch(console.error);
  });
})();

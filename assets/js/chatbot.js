/**
 * Marius Boiti Studio — AI Chatbot Widget
 * Self-injects HTML into the page; just include this script.
 */
(function () {
  "use strict";

  const API_URL = "/api/public/chat";
  const STORAGE_KEY = "mb_chat_history";
  const MAX_HISTORY = 20; // max messages kept in memory
  const WELCOME_MESSAGE = "Salut! Sunt asistentul virtual al Marius Boiti Studio. Te pot ajuta cu întrebări despre servicii, prețuri sau proces. Cum pot să te ajut?";

  // ─── State ────────────────────────────────────────────────────────────────
  let history = [];     // [{role:"user"|"assistant", content:string}]
  let isLoading = false;
  let isOpen = false;

  // ─── HTML Template ─────────────────────────────────────────────────────────
  function createWidget() {
    const el = document.createElement("div");
    el.id = "mb-chatbot";
    el.innerHTML = `
      <button id="mb-chat-toggle" class="mb-chat-toggle" aria-label="Deschide chat" aria-expanded="false">
        <svg class="mb-chat-icon-open" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <svg class="mb-chat-icon-close" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        <span class="mb-chat-badge" id="mb-chat-badge" hidden aria-hidden="true">1</span>
      </button>

      <div id="mb-chat-window" class="mb-chat-window" aria-label="Chat asistent" role="dialog" aria-modal="true" hidden>
        <div class="mb-chat-header">
          <div class="mb-chat-avatar" aria-hidden="true">M</div>
          <div class="mb-chat-header-info">
            <span class="mb-chat-name">Asistent Marius Boiti</span>
            <span class="mb-chat-status"><span class="mb-chat-dot"></span>Online</span>
          </div>
          <button id="mb-chat-close" class="mb-chat-close-btn" aria-label="Închide chat">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div id="mb-chat-messages" class="mb-chat-messages" role="log" aria-live="polite" aria-atomic="false">
        </div>

        <div class="mb-chat-input-area">
          <textarea
            id="mb-chat-input"
            class="mb-chat-input"
            placeholder="Scrie un mesaj…"
            rows="1"
            maxlength="1000"
            aria-label="Mesaj"
          ></textarea>
          <button id="mb-chat-send" class="mb-chat-send-btn" aria-label="Trimite mesaj" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        <p class="mb-chat-footer">Powered by AI · <a href="/privacy-policy" target="_blank" rel="noopener">Politica de confidențialitate</a></p>
      </div>
    `;
    return el;
  }

  // ─── DOM refs (set after inject) ──────────────────────────────────────────
  let toggleBtn, window_, messagesEl, inputEl, sendBtn, badge, closeBtn;

  function bindRefs() {
    toggleBtn  = document.getElementById("mb-chat-toggle");
    window_    = document.getElementById("mb-chat-window");
    messagesEl = document.getElementById("mb-chat-messages");
    inputEl    = document.getElementById("mb-chat-input");
    sendBtn    = document.getElementById("mb-chat-send");
    badge      = document.getElementById("mb-chat-badge");
    closeBtn   = document.getElementById("mb-chat-close");
  }

  // ─── Open / Close ─────────────────────────────────────────────────────────
  function openChat() {
    isOpen = true;
    window_.hidden = false;
    toggleBtn.setAttribute("aria-expanded", "true");
    badge.hidden = true;
    document.getElementById("mb-chatbot").classList.add("mb-chat-open");
    if (messagesEl.children.length === 0) showWelcome();
    setTimeout(() => {
      scrollToBottom();
      inputEl.focus();
    }, 50);
  }

  function closeChat() {
    isOpen = false;
    window_.hidden = true;
    toggleBtn.setAttribute("aria-expanded", "false");
    document.getElementById("mb-chatbot").classList.remove("mb-chat-open");
  }

  function toggleChat() {
    if (isOpen) closeChat(); else openChat();
  }

  // ─── Welcome message ──────────────────────────────────────────────────────
  function showWelcome() {
    appendMessage("assistant", WELCOME_MESSAGE, true);
  }

  // ─── Append a message bubble ───────────────────────────────────────────────
  function appendMessage(role, text, skipHistory) {
    const div = document.createElement("div");
    div.className = `mb-chat-msg mb-chat-msg--${role}`;

    const bubble = document.createElement("div");
    bubble.className = "mb-chat-bubble";
    bubble.textContent = text;
    div.appendChild(bubble);

    messagesEl.appendChild(div);
    scrollToBottom();

    if (!skipHistory) {
      history.push({ role, content: text });
      if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
    }
  }

  // ─── Typing indicator ─────────────────────────────────────────────────────
  let typingEl = null;

  function showTyping() {
    if (typingEl) return;
    typingEl = document.createElement("div");
    typingEl.className = "mb-chat-msg mb-chat-msg--assistant mb-chat-typing";
    typingEl.innerHTML = `<div class="mb-chat-bubble"><span></span><span></span><span></span></div>`;
    messagesEl.appendChild(typingEl);
    scrollToBottom();
  }

  function hideTyping() {
    if (typingEl) {
      typingEl.remove();
      typingEl = null;
    }
  }

  // ─── Scroll helpers ───────────────────────────────────────────────────────
  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // ─── Auto-resize textarea ──────────────────────────────────────────────────
  function autoResize() {
    inputEl.style.height = "auto";
    inputEl.style.height = `${Math.min(inputEl.scrollHeight, 120)}px`;
    sendBtn.disabled = !inputEl.value.trim() || isLoading;
  }

  // ─── Send message ─────────────────────────────────────────────────────────
  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text || isLoading) return;

    isLoading = true;
    sendBtn.disabled = true;
    inputEl.value = "";
    inputEl.style.height = "auto";

    appendMessage("user", text);
    showTyping();

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: history.slice(0, -1) // send history excluding the message we just pushed
        })
      });

      const data = await res.json();
      hideTyping();

      if (!res.ok || data.error) {
        const errMsg = data.error || "A apărut o eroare. Te rog încearcă din nou.";
        appendMessage("assistant", errMsg);
      } else {
        appendMessage("assistant", data.response || "Nu am putut genera un răspuns.");
      }
    } catch (_err) {
      hideTyping();
      appendMessage("assistant", "Nu pot trimite mesajul acum. Verifică conexiunea și încearcă din nou.");
    } finally {
      isLoading = false;
      sendBtn.disabled = !inputEl.value.trim();
    }
  }

  // ─── Keyboard handler ─────────────────────────────────────────────────────
  function onKeydown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ─── Close on Escape ──────────────────────────────────────────────────────
  function onDocKeydown(e) {
    if (e.key === "Escape" && isOpen) closeChat();
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  function init() {
    const widget = createWidget();
    document.body.appendChild(widget);
    bindRefs();

    toggleBtn.addEventListener("click", toggleChat);
    closeBtn.addEventListener("click", closeChat);
    sendBtn.addEventListener("click", sendMessage);
    inputEl.addEventListener("input", autoResize);
    inputEl.addEventListener("keydown", onKeydown);
    document.addEventListener("keydown", onDocKeydown);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

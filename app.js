// =========================================
// NOVA AI CHATBOT
// PROFESSIONAL FRONTEND
// =========================================

const messages = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const typingContainer = document.getElementById("typingContainer");
const newChatBtn = document.getElementById("newChatBtn");
const clearChatBtn = document.getElementById("clearChatBtn");
const suggestions = document.querySelectorAll(".suggestion");

let isSending = false;
let isStartingNewChat = false;


// =========================================
// CHAT STORAGE
// =========================================

const CHATS_KEY = "nova_chats";
const CURRENT_CHAT_KEY = "nova_current_chat";
const OLD_HISTORY_KEY = "nova_chat_history";

let chats = [];
let currentChatId = null;


// =========================================
// CHAT ID
// =========================================

function generateChatId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 8)
  );
}


// =========================================
// LOAD CHATS
// =========================================

function loadChats() {
  try {
    const saved = localStorage.getItem(CHATS_KEY);

    if (saved) {
      chats = JSON.parse(saved);

      if (!Array.isArray(chats)) {
        chats = [];
      }
    }
  } catch (error) {
    console.error("Chat storage error:", error);
    chats = [];
  }

  // Migrate old history
  if (
    chats.length === 0 &&
    localStorage.getItem(OLD_HISTORY_KEY)
  ) {
    const oldHistory =
      localStorage.getItem(OLD_HISTORY_KEY);

    const migratedChat = {
      id: generateChatId(),
      title: "Previous Chat",
      html: oldHistory,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    chats.push(migratedChat);

    saveChats();

    localStorage.removeItem(OLD_HISTORY_KEY);
  }

  const savedCurrent =
    localStorage.getItem(CURRENT_CHAT_KEY);

  if (
    savedCurrent &&
    chats.some(chat => chat.id === savedCurrent)
  ) {
    currentChatId = savedCurrent;
  } else if (chats.length > 0) {
    currentChatId = chats[0].id;
  } else {
    currentChatId = createChat(false);
  }
}


// =========================================
// SAVE CHATS
// =========================================

function saveChats() {
  localStorage.setItem(
    CHATS_KEY,
    JSON.stringify(chats)
  );

  if (currentChatId) {
    localStorage.setItem(
      CURRENT_CHAT_KEY,
      currentChatId
    );
  }

  renderChatHistory();
}


// =========================================
// CREATE LOCAL CHAT
// =========================================

function createChat(save = true, customId = null) {
  const chat = {
    id: customId || generateChatId(),
    title: "New Chat",
    html: "",
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  chats.unshift(chat);

  currentChatId = chat.id;

  if (save) {
    saveChats();
  }

  return chat.id;
}


// =========================================
// CURRENT CHAT
// =========================================

function getCurrentChat() {
  return chats.find(
    chat => chat.id === currentChatId
  );
}


// =========================================
// SAVE CURRENT CHAT
// =========================================

function saveCurrentChat() {
  const chat = getCurrentChat();

  if (!chat) {
    return;
  }

  chat.html = messages.innerHTML;
  chat.updatedAt = Date.now();

  const realMessages =
    messages.querySelectorAll(".message-row");

  if (
    chat.title === "New Chat" &&
    realMessages.length > 0
  ) {
    const firstMessage =
      realMessages[0].querySelector(".message-bubble");

    if (firstMessage) {
      let title =
        firstMessage.textContent.trim();

      if (title.length > 35) {
        title =
          title.substring(0, 35) + "...";
      }

      chat.title = title || "New Chat";
    }
  }

  localStorage.setItem(
    CHATS_KEY,
    JSON.stringify(chats)
  );

  localStorage.setItem(
    CURRENT_CHAT_KEY,
    currentChatId
  );

  renderChatHistory();
}


// =========================================
// OPEN CHAT
// =========================================

function openChat(chatId) {
  const chat =
    chats.find(item => item.id === chatId);

  if (!chat) {
    return;
  }

  currentChatId = chat.id;

  localStorage.setItem(
    CURRENT_CHAT_KEY,
    currentChatId
  );

  if (chat.html) {
    messages.innerHTML = chat.html;
  } else {
    showWelcome();
  }

  setupMessageActions();
  setupSuggestionButtons();

  hideTyping();
  scrollToBottom();
  renderChatHistory();

  messageInput.focus();
}


// =========================================
// DELETE CHAT
// =========================================

function deleteChat(chatId, event) {
  event.stopPropagation();

  const index =
    chats.findIndex(
      chat => chat.id === chatId
    );

  if (index === -1) {
    return;
  }

  chats.splice(index, 1);

  if (currentChatId === chatId) {
    if (chats.length > 0) {
      currentChatId = chats[0].id;
      openChat(currentChatId);
    } else {
      createChat();
      showWelcome();
    }
  }

  localStorage.setItem(
    CHATS_KEY,
    JSON.stringify(chats)
  );

  localStorage.setItem(
    CURRENT_CHAT_KEY,
    currentChatId
  );

  renderChatHistory();
}


// =========================================
// CHAT HISTORY UI
// =========================================

function renderChatHistory() {
  let historyContainer =
    document.getElementById("novaChatHistory");

  if (!historyContainer) {
    historyContainer =
      document.createElement("div");

    historyContainer.id =
      "novaChatHistory";

    historyContainer.innerHTML = `
      <div class="nova-history-header">
        <span>Recent Chats</span>
      </div>

      <div class="nova-history-list"></div>
    `;

    const sidebar =
      document.querySelector(".sidebar");

    if (sidebar) {
      sidebar.appendChild(historyContainer);
    } else {
      document.body.prepend(historyContainer);
    }

    addHistoryStyles();
  }

  const list =
    historyContainer.querySelector(
      ".nova-history-list"
    );

  if (!list) {
    return;
  }

  list.innerHTML = "";

  if (chats.length === 0) {
    list.innerHTML = `
      <div class="nova-empty-history">
        No previous chats
      </div>
    `;

    return;
  }

  chats.forEach(chat => {
    const item =
      document.createElement("div");

    item.className =
      "nova-chat-item";

    if (chat.id === currentChatId) {
      item.classList.add("active");
    }

    const title =
      document.createElement("span");

    title.className =
      "nova-chat-title";

    title.textContent =
      chat.title || "New Chat";

    const deleteButton =
      document.createElement("button");

    deleteButton.className =
      "nova-chat-delete";

    deleteButton.type = "button";
    deleteButton.textContent = "×";
    deleteButton.title = "Delete chat";

    deleteButton.addEventListener(
      "click",
      event => {
        deleteChat(chat.id, event);
      }
    );

    item.appendChild(title);
    item.appendChild(deleteButton);

    item.addEventListener(
      "click",
      () => {
        openChat(chat.id);
      }
    );

    list.appendChild(item);
  });
}


// =========================================
// HISTORY CSS
// =========================================

function addHistoryStyles() {
  if (
    document.getElementById(
      "novaHistoryStyles"
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "novaHistoryStyles";

  style.textContent = `
    #novaChatHistory {
      margin-top: 18px;
      width: 100%;
    }

    .nova-history-header {
      padding: 10px 14px;
      font-size: 12px;
      font-weight: 600;
      opacity: 0.6;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .nova-history-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 0 8px 12px;
      max-height: 360px;
      overflow-y: auto;
    }

    .nova-chat-item {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 40px;
      padding: 8px 10px;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .nova-chat-item:hover {
      background: rgba(127, 127, 127, 0.12);
    }

    .nova-chat-item.active {
      background: rgba(127, 127, 127, 0.18);
    }

    .nova-chat-title {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-size: 13px;
    }

    .nova-chat-delete {
      width: 25px;
      height: 25px;
      border: 0;
      border-radius: 7px;
      background: transparent;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      opacity: 0.5;
      flex-shrink: 0;
    }

    .nova-chat-delete:hover {
      opacity: 1;
      background: rgba(255, 0, 0, 0.12);
    }

    .nova-empty-history {
      padding: 15px 12px;
      text-align: center;
      font-size: 12px;
      opacity: 0.5;
    }
  `;

  document.head.appendChild(style);
}


// =========================================
// SEND MESSAGE
// =========================================

async function sendMessage(message = null) {
  const text =
    message ??
    messageInput.value.trim();

  if (
    !text ||
    isSending ||
    isStartingNewChat
  ) {
    return;
  }

  if (!currentChatId) {
    createChat();
  }

  isSending = true;

  sendButton.disabled = true;

  removeWelcome();

  addMessage("user", text);

  messageInput.value = "";

  autoResize();

  showTyping();

  try {
    const response =
      await fetch("/api/chat", {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          message: text,
          chatId: currentChatId
        })
      });

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Something went wrong."
      );
    }

    hideTyping();

    addMessage(
      "assistant",
      data.reply ||
      "I couldn't generate a response."
    );

  } catch (error) {
    console.error(
      "Chat Error:",
      error
    );

    hideTyping();

    addMessage(
      "assistant",
      error.message ||
      "Sorry, something went wrong. Please try again."
    );

  } finally {
    isSending = false;

    sendButton.disabled = false;

    messageInput.focus();
  }
}


// =========================================
// MARKDOWN RENDERER
// =========================================

function escapeHTML(text) {
  const div =
    document.createElement("div");

  div.textContent = text;

  return div.innerHTML;
}


function renderMarkdown(text) {
  if (!text) {
    return "";
  }

  let html =
    escapeHTML(text);

  // Code blocks
  html = html.replace(
    /```([\w+-]*)\n?([\s\S]*?)```/g,
    (match, language, code) => {
      const safeCode =
        code.trim();

      const languageName =
        language || "code";

      return `
        <div class="nova-code-wrapper">
          <div class="nova-code-header">
            <span>${languageName}</span>

            <button
              type="button"
              class="nova-copy-code"
              data-code="${encodeURIComponent(safeCode)}"
            >
              Copy
            </button>
          </div>

          <pre><code>${escapeHTML(safeCode)}</code></pre>
        </div>
      `;
    }
  );

  // Inline code
  html = html.replace(
    /`([^`\n]+)`/g,
    "<code class=\"nova-inline-code\">$1</code>"
  );

  // Bold
  html = html.replace(
    /\*\*(.*?)\*\*/g,
    "<strong>$1</strong>"
  );

  // Italic
  html = html.replace(
    /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
    "<em>$1</em>"
  );

  // Headings
  html = html.replace(
    /^### (.*)$/gm,
    "<h4>$1</h4>"
  );

  html = html.replace(
    /^## (.*)$/gm,
    "<h3>$1</h3>"
  );

  html = html.replace(
    /^# (.*)$/gm,
    "<h2>$1</h2>"
  );

  // Unordered lists
  html = html.replace(
    /^(?:-|\*) (.*)$/gm,
    "<li>$1</li>"
  );

  html = html.replace(
    /(<li>.*<\/li>)/g,
    "<ul>$1</ul>"
  );

  // Numbered lists
  html = html.replace(
    /^\d+\. (.*)$/gm,
    "<li>$1</li>"
  );

  // Links
  html = html.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Line breaks
  html = html.replace(
    /\n/g,
    "<br>"
  );

  return html;
}


// =========================================
// ADD MESSAGE
// =========================================

function addMessage(type, text) {
  const row =
    document.createElement("div");

  row.className =
    `message-row ${type}`;

  const avatar =
    document.createElement("div");

  avatar.className =
    "message-avatar";

  avatar.textContent =
    type === "user"
      ? "You"
      : "N";

  const content =
    document.createElement("div");

  content.className =
    "message-content";

  const bubble =
    document.createElement("div");

  bubble.className =
    "message-bubble";

  if (type === "assistant") {
    bubble.innerHTML =
      renderMarkdown(text);
  } else {
    bubble.textContent = text;
  }

  const time =
    document.createElement("div");

  time.className =
    "message-time";

  time.textContent =
    getTime();

  content.appendChild(bubble);

  content.appendChild(time);

  // Assistant actions
  if (type === "assistant") {
    const actions =
      document.createElement("div");

    actions.className =
      "nova-message-actions";

    actions.innerHTML = `
      <button
        type="button"
        class="nova-copy-message"
        title="Copy response"
      >
        Copy
      </button>

      <button
        type="button"
        class="nova-regenerate"
        title="Regenerate response"
      >
        Regenerate
      </button>
    `;

    content.appendChild(actions);
  }

  if (type === "user") {
    row.appendChild(content);
    row.appendChild(avatar);
  } else {
    row.appendChild(avatar);
    row.appendChild(content);
  }

  messages.appendChild(row);

  setupMessageActions();

  saveCurrentChat();

  scrollToBottom();
}


// =========================================
// MESSAGE ACTIONS
// =========================================

function setupMessageActions() {
  document
    .querySelectorAll(".nova-copy-message")
    .forEach(button => {
      if (button.dataset.ready) {
        return;
      }

      button.dataset.ready = "true";

      button.addEventListener(
        "click",
        async () => {
          const row =
            button.closest(".message-row");

          const bubble =
            row?.querySelector(
              ".message-bubble"
            );

          if (!bubble) {
            return;
          }

          try {
            await navigator.clipboard.writeText(
              bubble.innerText
            );

            const original =
              button.textContent;

            button.textContent =
              "Copied ✓";

            setTimeout(() => {
              button.textContent =
                original;
            }, 1500);

          } catch (error) {
            console.error(
              "Copy failed:",
              error
            );
          }
        }
      );
    });


  document
    .querySelectorAll(".nova-copy-code")
    .forEach(button => {
      if (button.dataset.ready) {
        return;
      }

      button.dataset.ready = "true";

      button.addEventListener(
        "click",
        async () => {
          const code =
            decodeURIComponent(
              button.dataset.code || ""
            );

          try {
            await navigator.clipboard.writeText(
              code
            );

            button.textContent =
              "Copied ✓";

            setTimeout(() => {
              button.textContent =
                "Copy";
            }, 1500);

          } catch (error) {
            console.error(
              "Code copy failed:",
              error
            );
          }
        }
      );
    });


  document
    .querySelectorAll(".nova-regenerate")
    .forEach(button => {
      if (button.dataset.ready) {
        return;
      }

      button.dataset.ready = "true";

      button.addEventListener(
        "click",
        () => {
          regenerateResponse(button);
        }
      );
    });
}


// =========================================
// REGENERATE
// =========================================

async function regenerateResponse(button) {
  if (
    isSending ||
    isStartingNewChat
  ) {
    return;
  }

  const currentRow =
    button.closest(".message-row");

  if (!currentRow) {
    return;
  }

  const previousUserRow =
    currentRow.previousElementSibling;

  if (
    !previousUserRow ||
    !previousUserRow.classList.contains("user")
  ) {
    return;
  }

  const userBubble =
    previousUserRow.querySelector(
      ".message-bubble"
    );

  if (!userBubble) {
    return;
  }

  const userText =
    userBubble.innerText.trim();

  if (!userText) {
    return;
  }

  currentRow.remove();

  saveCurrentChat();

  await sendMessage(userText);
}


// =========================================
// TIME
// =========================================

function getTime() {
  return new Date()
    .toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
}


// =========================================
// TYPING
// =========================================

function showTyping() {
  typingContainer.classList.add(
    "active"
  );

  scrollToBottom();
}


function hideTyping() {
  typingContainer.classList.remove(
    "active"
  );
}


// =========================================
// REMOVE WELCOME
// =========================================

function removeWelcome() {
  const welcome =
    document.querySelector(
      ".welcome"
    );

  if (welcome) {
    welcome.remove();

    saveCurrentChat();
  }
}


// =========================================
// SCROLL
// =========================================

function scrollToBottom() {
  requestAnimationFrame(() => {
    messages.scrollTop =
      messages.scrollHeight;
  });
}


// =========================================
// TEXTAREA RESIZE
// =========================================

function autoResize() {
  messageInput.style.height =
    "auto";

  messageInput.style.height =
    Math.min(
      messageInput.scrollHeight,
      130
    ) + "px";
}


// =========================================
// ENTER KEY
// =========================================

messageInput.addEventListener(
  "keydown",
  event => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage();
    }
  }
);


messageInput.addEventListener(
  "input",
  autoResize
);


// =========================================
// SEND BUTTON
// =========================================

sendButton.addEventListener(
  "click",
  () => sendMessage()
);


// =========================================
// SUGGESTIONS
// =========================================

function setupSuggestionButtons() {
  document
    .querySelectorAll(".suggestion")
    .forEach(button => {
      if (button.dataset.novaReady) {
        return;
      }

      button.dataset.novaReady =
        "true";

      button.addEventListener(
        "click",
        () => {
          const text =
            button.textContent
              .replace(
                /[^\x00-\x7F]/g,
                ""
              )
              .trim();

          sendMessage(text);
        }
      );
    });
}


// =========================================
// NEW CHAT BUTTON
// =========================================

newChatBtn.addEventListener(
  "click",
  startNewChat
);


clearChatBtn.addEventListener(
  "click",
  startNewChat
);


// =========================================
// START NEW CHAT
// =========================================

async function startNewChat() {
  if (
    isStartingNewChat ||
    isSending
  ) {
    return;
  }

  isStartingNewChat = true;

  newChatBtn.disabled = true;
  clearChatBtn.disabled = true;

  const newChatId =
    generateChatId();

  try {
    const response =
      await fetch(
        "/api/new-chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            chatId: newChatId
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Could not start a new chat."
      );
    }

    console.log(
      "Nova:",
      data.message
    );

    const chat = {
      id: newChatId,
      title: "New Chat",
      html: "",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    chats.unshift(chat);

    currentChatId =
      newChatId;

    localStorage.setItem(
      CHATS_KEY,
      JSON.stringify(chats)
    );

    localStorage.setItem(
      CURRENT_CHAT_KEY,
      currentChatId
    );

    showWelcome();

    renderChatHistory();

  } catch (error) {
    console.error(
      "New Chat Error:",
      error
    );

    addMessage(
      "assistant",
      error.message ||
      "Could not start a new chat. Please try again."
    );

  } finally {
    isStartingNewChat = false;

    newChatBtn.disabled = false;
    clearChatBtn.disabled = false;

    messageInput.focus();
  }
}


// =========================================
// WELCOME SCREEN
// =========================================

function showWelcome() {
  messages.innerHTML = `
    <div class="welcome">

      <div class="welcome-icon">
        ✦
      </div>

      <h2>
        How can I help you?
      </h2>

      <p>
        I'm Nova, your AI assistant.
        Ask me anything and I'll do my
        best to help you.
      </p>

      <div class="suggestions">

        <button class="suggestion">
          <span>💡</span>
          Give me a creative idea
        </button>

        <button class="suggestion">
          <span>💻</span>
          Help me write some code
        </button>

        <button class="suggestion">
          <span>✍️</span>
          Write something for me
        </button>

        <button class="suggestion">
          <span>📚</span>
          Explain something to me
        </button>

      </div>

    </div>
  `;

  setupSuggestionButtons();

  hideTyping();

  messageInput.value = "";

  autoResize();

  messageInput.focus();
}


// =========================================
// INITIALIZE NOVA
// =========================================

loadChats();

renderChatHistory();

if (currentChatId) {
  const currentChat =
    getCurrentChat();

  if (
    currentChat &&
    currentChat.html
  ) {
    messages.innerHTML =
      currentChat.html;

    setupMessageActions();
    setupSuggestionButtons();

  } else {
    showWelcome();
  }
}

messageInput.focus();
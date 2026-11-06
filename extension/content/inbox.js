(() => {
  if (window.__etPanelInitialized) {
    return;
  }
  window.__etPanelInitialized = true;

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response?.success) {
          reject(new Error(response?.message || "Request failed."));
          return;
        }
        resolve(response.data);
      });
    });
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = text;
    } // textContent: subjects are untrusted
    return node;
  }

  const fmt = (d) => (d ? new Date(d).toLocaleString() : "Never");

  // Build UI
  const toggle = el("button", "et-panel-toggle", "Tracker");
  toggle.type = "button";

  const panel = el("div", "et-panel");
  panel.hidden = true;

  const header = el("div", "et-panel-header");
  header.append(el("strong", "", "Email Tracker"));
  const refreshBtn = el("button", "et-panel-refresh", "Refresh");
  refreshBtn.type = "button";
  header.append(refreshBtn);

  const summaryBox = el("div", "et-panel-summary");
  const list = el("div", "et-panel-list");

  panel.append(header, summaryBox, list);
  document.body.append(toggle, panel);

  toggle.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      load();
    }
  });
  refreshBtn.addEventListener("click", load);

  function render(data) {
    const { emails = [], summary = {} } = data;

    summaryBox.textContent =
      `${summary.totalTracked ?? 0} tracked · ` +
      `${summary.openedEmails ?? 0} opened · ` +
      `${summary.totalOpens ?? 0} total opens`;

    list.replaceChildren();

    if (emails.length === 0) {
      list.append(el("p", "et-panel-empty", "No tracked emails yet."));
      return;
    }

    for (const email of emails) {
      const item = el("div", "et-panel-item");
      const opened = email.openCount > 0;

      item.append(
        el("div", "et-item-subject", email.subject || "(no subject)"),
        el("div", "et-item-to", `To: ${email.recipientEmail}`),
        el(
          "div",
          "et-item-status",
          opened
            ? `✓✓ Opened ${email.openCount}× · last ${fmt(email.lastOpenedAt)}`
            : "✓ Sent · not opened yet"
        ),
        el("div", "et-item-time", `Sent ${fmt(email.sentAt)}`)
      );
      item.dataset.opened = String(opened);
      list.append(item);
    }
  }

  async function load() {
    try {
      const result = await sendMessage({ type: "GET_TRACKING_ACTIVITY" });
      render(result.data);
    } catch (error) {
      console.warn("Email Tracker panel:", error.message);
      list.replaceChildren(
        el(
          "p",
          "et-panel-empty",
          error.message.includes("invalidated")
            ? "Extension was updated. Refresh Gmail."
            : error.message
        )
      );
    }
  }
  load();
  setInterval(() => {
    if (!panel.hidden) {
      load();
    } // only poll while the panel is open
  }, 30000);
})();

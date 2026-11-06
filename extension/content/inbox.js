(() => {
  const trackedEmails = new Map();

  const STATUS_CLASS = "et-inbox-status";

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

  function getThreadId(row) {
    return (
      row.getAttribute("data-legacy-thread-id") ||
      row.getAttribute("data-thread-id")
    );
  }

  function createStatusIndicator(email) {
    const indicator = document.createElement("span");

    indicator.className = STATUS_CLASS;

    if (email.openCount > 0) {
      indicator.textContent = `✓✓ ${email.openCount}`;
      indicator.title = `Tracking image requested ${email.openCount} times.`;
      indicator.dataset.opened = "true";
    } else {
      indicator.textContent = "✓";
      indicator.title = "Email sent. No tracking image requests recorded.";
      indicator.dataset.opened = "false";
    }

    return indicator;
  }

  function updateInboxRows() {
    const rows = document.querySelectorAll(
      "tr.zA, tr[data-legacy-thread-id], tr[data-thread-id]"
    );

    rows.forEach((row) => {
      const threadId = getThreadId(row);

      if (!threadId) {
        return;
      }

      const email = trackedEmails.get(threadId);

      const existing = row.querySelector(`.${STATUS_CLASS}`);

      if (!email) {
        existing?.remove();
        return;
      }

      if (existing && existing.dataset.count === String(email.openCount)) {
        return;
      }

      existing?.remove();

      const indicator = createStatusIndicator(email);
      indicator.dataset.count = String(email.openCount);

      const subject = row.querySelector(".bog, [data-thread-id] .bog");

      if (subject) {
        subject.appendChild(indicator);
      } else {
        row.appendChild(indicator);
      }
    });
  }

  async function loadTrackingData() {
    try {
      const result = await sendMessage({
        type: "GET_TRACKED_EMAILS",
      });

      trackedEmails.clear();

      for (const email of result.data.emails || []) {
        if (email._id) {
          trackedEmails.set(email._id, email);
        }
      }

      updateInboxRows();
    } catch (error) {
      console.warn("Email Tracker inbox:", error.message);
      if (error.message.includes("Extension context invalidated")) {
        // Optional: show a small banner asking them to refresh Gmail
      }
    }
  }

  const observer = new MutationObserver(() => {
    updateInboxRows();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  loadTrackingData();

  // Refresh tracking information periodically while Gmail is open.
  setInterval(loadTrackingData, 30000);
})();

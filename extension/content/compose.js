const TRACKING_BASE_URL = "http://localhost:5050";

const trackedComposers = new WeakMap();
const pendingSends = [];

function sendBackgroundMessage(message) {
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

function createTrackingButton(compose) {
  const { sendButton } = EmailTrackerGmail.getComposeElements(compose);

  if (!sendButton || compose.querySelector(".et-tracking-button")) {
    return;
  }

  const button = document.createElement("button");

  button.type = "button";
  button.className = "et-tracking-button";
  button.textContent = "Track";
  button.setAttribute("aria-pressed", "false");
  button.title = "Enable email open tracking";

  button.addEventListener("click", async () => {
    const state = trackedComposers.get(compose);

    if (state?.enabled) {
      removeTracking(compose);
      return;
    }

    await enableTracking(compose, button);
  });

  sendButton.parentElement.insertBefore(button, sendButton);

  compose.addEventListener(
    "click",
    (event) => {
      if (event.target.closest(".et-tracking-button")) {
        return;
      }

      if (!compose.isConnected) {
        removeTracking(compose);
      }
    },
    { once: true }
  );
}

async function enableTracking(compose, button) {
  const { body, subject } = EmailTrackerGmail.getComposeElements(compose);

  const recipients = EmailTrackerGmail.getRecipients(compose);

  if (!body) {
    alert("Could not find the email body.");
    return;
  }

  if (recipients.length !== 1) {
    alert(
      "For now, Email Tracker supports exactly one recipient per tracked email."
    );
    return;
  }

  button.disabled = true;
  button.textContent = "Creating...";

  try {
    const result = await sendBackgroundMessage({
      type: "CREATE_TRACKED_EMAIL",
      payload: {
        recipientEmail: recipients[0],
        subject: subject?.value || "",
      },
    });

    const trackingUrl = `${TRACKING_BASE_URL}/t/${encodeURIComponent(result.data.trackingId)}.gif`;

    const pixel = document.createElement("img");

    pixel.src = trackingUrl;
    pixel.alt = "";
    pixel.width = 1;
    pixel.height = 1;
    pixel.setAttribute("aria-hidden", "true");
    pixel.style.cssText =
      "width:1px;height:1px;max-width:1px;max-height:1px;opacity:0;";

    body.appendChild(pixel);

    trackedComposers.set(compose, {
      enabled: true,
      emailId: result.data.id,
      trackingId: result.data.trackingId,
      pixel,
    });

    button.textContent = "Tracking ON";
    button.classList.add("et-active");
    button.setAttribute("aria-pressed", "true");
    button.disabled = false;
  } catch (error) {
    button.textContent = "Track";
    button.disabled = false;

    alert(`Email Tracker: ${error.message}`);
  }
}

function removeTracking(compose) {
  const state = trackedComposers.get(compose);

  if (!state) {
    return;
  }

  state.pixel.remove();

  trackedComposers.delete(compose);

  const button = compose.querySelector(".et-tracking-button");

  if (button) {
    button.textContent = "Track";
    button.classList.remove("et-active");
    button.setAttribute("aria-pressed", "false");
  }
}

function extractThreadIdFromToast(toast) {
  const el = toast.querySelector('#link_vsm[param], [param^="#thread-"]');
  const param = el?.getAttribute("param") || "";

  // "#thread-a:r6407043903080063082" -> "6407043903080063082"
  const m = param.match(/(\d{10,})$/);
  if (!m) return null;

  try {
    return BigInt(m[1]).toString(16);
  } catch {
    return null;
  }
}

function observeSendSuccess() {
  const observer = new MutationObserver(() => {
    const alerts = document.querySelectorAll('[role="alert"], [role="status"]');

    const sentAlert = Array.from(alerts).find((a) =>
      /message sent/i.test(a.textContent || "")
    );
    if (!sentAlert || pendingSends.length === 0) 
      {return;}

    const pending = pendingSends.shift();
    const gmailThreadId = extractThreadIdFromToast(sentAlert);


    sendBackgroundMessage({
      type: "MARK_EMAIL_SENT",
      id: pending.emailId,
      payload: gmailThreadId ? { gmailThreadId } : {},
    }).catch((error) => {
      console.error("Could not update sent status:", error);
    });
  }); 

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function setupCompose(compose) {
  if (compose.dataset.etInitialized === "true") {
    return;
  }

  const { sendButton } = EmailTrackerGmail.getComposeElements(compose);

  if (!sendButton) {
    return;
  }

  compose.dataset.etInitialized = "true";

  createTrackingButton(compose);

  sendButton.addEventListener(
    "click",
    () => {
      const state = trackedComposers.get(compose);

      if (state?.enabled) {
        pendingSends.push({
          emailId: state.emailId,
        });
      }
    },
    true
  );
}

window.EmailTrackerCompose = {
  setupCompose,
  observeSendSuccess,
}

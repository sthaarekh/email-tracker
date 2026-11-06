const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");

const loginForm = document.getElementById("login-form");
const loginButton = document.getElementById("login-button");
const logoutButton = document.getElementById("logout-button");
const refreshButton = document.getElementById("refresh-button");

const statusMessage = document.getElementById("status-message");
const emailList = document.getElementById("email-list");

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

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function createEmailItem(email) {
  const container = document.createElement("article");
  container.className = "activity-item";

  const icon = document.createElement("div");
  icon.className = "activity-icon";
  icon.textContent = email.openCount > 0 ? "✓✓" : "✓";

  const content = document.createElement("div");
  content.className = "activity-content";

  const subject = document.createElement("strong");
  subject.textContent = email.subject || "(No subject)";

  const to = document.createElement("span");
  to.textContent = `To: ${email.recipientEmail}`;

  const status = document.createElement("span");
  status.textContent =
    email.openCount > 0
      ? `Opened ${email.openCount}× · last ${formatDate(email.lastOpenedAt)}`
      : `Not opened · sent ${formatDate(email.sentAt)}`;

  content.append(subject, to, status);
  container.append(icon, content);
  return container;
}

async function loadDashboard() {
  refreshButton.disabled = true;
  statusMessage.textContent = "";

  try {
    const result = await sendMessage({ type: "GET_TRACKING_ACTIVITY" });

    const { summary = {}, emails = [] } = result?.data || {};

    document.getElementById("total-tracked").textContent =
      summary.totalTracked ?? 0;
    document.getElementById("opened-emails").textContent =
      summary.openedEmails ?? 0;
    document.getElementById("total-opens").textContent =
      summary.totalOpens ?? 0;

    // Tracked emails
    if (emailList) {
      emailList.replaceChildren(...emails.map(createEmailItem));
    } else {
      console.warn("Email Tracker: #email-list not found in popup.html");
    }
  } catch (error) {
    statusMessage.textContent = error.message;
  } finally {
    refreshButton.disabled = false;
  }
}

async function showDashboard() {
  const tokens = await chrome.storage.local.get([
    "accessToken",
    "refreshToken",
    "user",
  ]);

  if (tokens.accessToken && tokens.refreshToken) {
    loginSection.hidden = true;
    dashboardSection.hidden = false;

    document.getElementById("user-email").textContent =
      tokens.user?.email || "Connected";

    await loadDashboard();
  } else {
    loginSection.hidden = false;
    dashboardSection.hidden = true;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginButton.disabled = true;
  loginButton.textContent = "Signing in...";

  try {
    const user = await sendMessage({
      type: "AUTH_LOGIN",
      email: document.getElementById("email").value,
      password: document.getElementById("password").value,
    });

    await chrome.storage.local.set({ user });

    await showDashboard();
  } catch (error) {
    statusMessage.textContent = error.message;
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Sign in";
  }
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;

  try {
    await sendMessage({ type: "AUTH_LOGOUT" });
    await showDashboard();
  } catch (error) {
    statusMessage.textContent = error.message;
  } finally {
    logoutButton.disabled = false;
  }
});

refreshButton.addEventListener("click", loadDashboard);

showDashboard();

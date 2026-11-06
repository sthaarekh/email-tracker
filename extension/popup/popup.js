const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");

const loginForm = document.getElementById("login-form");
const loginButton = document.getElementById("login-button");
const logoutButton = document.getElementById("logout-button");
const refreshButton = document.getElementById("refresh-button");

const statusMessage = document.getElementById("status-message");

const activityList = document.getElementById("activity-list");
const emptyState = document.getElementById("empty-state");

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

function createActivityItem(item) {
  const container = document.createElement("article");
  container.className = "activity-item";

  const icon = document.createElement("div");
  icon.className = "activity-icon";
  icon.textContent = "↗";

  const content = document.createElement("div");
  content.className = "activity-content";

  const subject = document.createElement("strong");
  subject.textContent = item.email?.subject || "(No subject)";

  const timestamp = document.createElement("span");
  timestamp.textContent = formatDate(item.openedAt);

  const classification = document.createElement("span");
  classification.className = "activity-classification";
  classification.textContent =
    item.classification === "unclassified"
      ? "Image request recorded"
      : item.classification.replaceAll("_", " ");

  content.append(subject, timestamp, classification);
  container.append(icon, content);

  return container;
}

async function loadDashboard() {
  refreshButton.disabled = true;
  statusMessage.textContent = "";
  try {
    const result = await sendMessage({
      type: "GET_TRACKING_ACTIVITY",
    });

    // Fallback to empty objects/arrays if properties are missing
    const summary = result?.summary || {};
    const activity = result?.activity || [];

    document.getElementById("total-tracked").textContent =
      summary.totalTracked ?? 0;
    document.getElementById("opened-emails").textContent =
      summary.openedEmails ?? 0;
    document.getElementById("total-opens").textContent =
      summary.totalOpens ?? 0;

    activityList.replaceChildren();

    if (!activity.length) {
      emptyState.hidden = false;
    } else {
      emptyState.hidden = true;

      activity.forEach((item) => {
        activityList.appendChild(createActivityItem(item));
      });
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

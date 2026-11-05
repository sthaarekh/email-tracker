const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");

const loginForm = document.getElementById("login-form");
const loginButton = document.getElementById("login-button");
const logoutButton = document.getElementById("logout-button");

const statusMessage = document.getElementById("status-message");
const userEmail = document.getElementById("user-email");

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

async function showDashboard() {
  const tokens = await chrome.storage.local.get([
    "accessToken",
    "refreshToken",
    "user",
  ]);

  if (tokens.accessToken && tokens.refreshToken) {
    loginSection.hidden = true;
    dashboardSection.hidden = false;

    userEmail.textContent = tokens.user?.email || "Authenticated";
  } else {
    loginSection.hidden = false;
    dashboardSection.hidden = true;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginButton.disabled = true;
  loginButton.textContent = "Signing in...";
  statusMessage.textContent = "";

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

showDashboard();

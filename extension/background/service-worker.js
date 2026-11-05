const API_BASE_URL = "http://localhost:5050/api";

const STORAGE_KEYS = {
  ACCESS_TOKEN: "accessToken",
  REFRESH_TOKEN: "refreshToken",
  USER: "user",
};

async function getTokens() {
  return chrome.storage.local.get([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
  ]);
}

async function saveTokens(data) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.ACCESS_TOKEN]: data.accessToken,
    [STORAGE_KEYS.REFRESH_TOKEN]: data.refreshToken,
    ...(data.user && {
      [STORAGE_KEYS.USER]: data.user,
    }),
  });
}

async function clearTokens() {
  await chrome.storage.local.remove(Object.values(STORAGE_KEYS));
}

async function refreshAccessToken() {
  const tokens = await getTokens();

  if (!tokens.refreshToken) {
    throw new Error("Please log in again.");
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refreshToken: tokens.refreshToken,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    await clearTokens();
    throw new Error(result.message || "Session expired.");
  }

  await saveTokens(result.data);

  return result.data.accessToken;
}

async function apiRequest(path, options = {}, retry = true) {
  const tokens = await getTokens();

  if (!tokens.accessToken) {
    throw new Error("Please log in to Email Tracker.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      Authorization: `Bearer ${tokens.accessToken}`,
    },
  });

  if (response.status === 401 && retry) {
    const newToken = await refreshAccessToken();

    return apiRequest(
      path,
      {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
        },
      },
      false
    );
  }

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || "API request failed.");
  }
  return result;
}

async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Login failed.");
  }

  await saveTokens(result.data);

  return result.data.user;
}

async function logout() {
  const tokens = await getTokens();

  try {
    if (tokens.accessToken) {
      await apiRequest(
        "/auth/logout",
        {
          method: "POST",
        },
        false
      );
    }
  } finally {
    await clearTokens();
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handleMessage = async () => {
    switch (message.type) {
      case "AUTH_LOGIN":
        return await login(message.email, message.password);

      case "AUTH_LOGOUT":
        await logout();
        return { success: true };

      case "AUTH_STATUS": {
        const tokens = await getTokens();

        return {
          authenticated: Boolean(tokens.accessToken && tokens.refreshToken),
        };
      }

      case "CREATE_TRACKED_EMAIL":
        return await apiRequest("/tracking/emails", {
          method: "POST",
          body: JSON.stringify(message.payload),
        });

      case "MARK_EMAIL_SENT":
        return await apiRequest(
          `/tracking/emails/${encodeURIComponent(message.id)}/sent`,
          {
            method: "PATCH",
            body: JSON.stringify(message.payload || {}),
          }
        );

      case "GET_TRACKED_EMAILS":
        return await apiRequest("/tracking/emails");

      default:
        throw new Error("Unknown extension message.");
    }
  };

  handleMessage()
    .then((data) => sendResponse({ success: true, data }))
    .catch((error) => {
      sendResponse({
        success: false,
        message: error.message,
      });
    });

  return true;
});

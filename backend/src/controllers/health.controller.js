import { getDatabaseStatus } from "../config/database.js";

export const getLiveHealth = (_req, res) => {
  res.status(200).json({
    success: true,
    status: "alive",
    timestamp: new Date().toISOString(),
  });
};

export const getReadyHealth = (_req, res) => {
  const database = getDatabaseStatus();
  const isReady = database === "connected";

  res.status(isReady ? 200 : 503).json({
    success: isReady,
    status: isReady ? "ready" : "not_ready",
    database,
    timestamp: new Date().toISOString(),
  });
};

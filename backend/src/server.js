import mongoose from "mongoose";

import app from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";

const startServer = async () => {
  try {
    await connectDatabase();

    const server = app.listen(env.PORT, () => {
      console.log(`Server running on http://localhost:${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
    });

    const shutdown = (signal) => {
      console.log(`${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        try {
          await mongoose.disconnect();
          console.log("MongoDB disconnected.");
          process.exit(0);
        } catch (error) {
          console.error("Shutdown failed:", error);
          process.exit(1);
        }
      });
    };

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

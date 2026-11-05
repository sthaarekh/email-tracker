import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env, allowedOrigins } from "./config/env.js";
import healthRoutes from "./routes/health.routes.js";
import notFound from "./middleware/not-found.middleware.js";
import errorHandler from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.route.js";
import trackingRoutes from "./routes/tracking.routes.js";
import pixelRoutes from "./routes/pixel.routes.js";

const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error("Origin not allowed by CORS");
      error.statusCode = 403;

      return callback(error);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

if (env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.use("/api/auth", authRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/t", pixelRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;

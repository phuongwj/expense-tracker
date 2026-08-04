import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import aiRoutes from "./ai/aiRoutes.ts";
import cookieParser from "cookie-parser";
import authRoutes from "./auth/authRoutes.ts";
import importExportRoutes from "./importExport/importExportRoutes.ts";
import transactionRoutes from './transactions/transactionRoutes.ts';
import categoryRoutes from './categories/categoryRoutes.ts';
import { errorHandler } from "./middleware/errorHandler.ts";
import groupRoutes from './groups/groupRoutes.ts';

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);

//individual endpoints have either /import or /export prefix. ex: .../api/import/...
app.use("/api", importExportRoutes);

app.use('/api/groups', groupRoutes);


//For requests made to any route not defined above
app.use((req, res) => {
    res.status(404).json({ error: 'This Page does not exist. Please check the URL and try again.' });
});

//note: error handling middleware must be the final app.use() call
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import aiRoutes from "./ai/aiRoutes.ts";
import cookieParser from "cookie-parser";
import authRoutes from "./auth/authRoutes.ts";
import transactionRoutes from './transactions/transactionRoutes.ts';
import groupRoutes from './groups/groupRoutes.ts';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/ai', aiRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

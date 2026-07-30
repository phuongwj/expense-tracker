import dotenv from "dotenv";
dotenv.config();

import express from "express";
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

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/ai', aiRoutes);
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

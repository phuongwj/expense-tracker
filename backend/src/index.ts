import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './auth/authRoutes.ts';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
import express from 'express';
import authRoutes from './auth/authRoutes.ts';
import transactionRoutes from './transactions/transactionRoutes.ts';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/auth', authRoutes);
app.use('/transactions', transactionRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
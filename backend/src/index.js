import 'dotenv/config';
import express from 'express';
import cors from 'cors';
//Auth router implemented locally for assignment 2, not part of transaction feature
// import authRouter from './routes/auth.js';

import transactionRouter from './routes/transactions.js';
import categoryRouter from './routes/categories.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

//authRouter was used in assignment 2 implemntation, not part of the transaction feature
// app.use('/api/auth', authRouter);  


app.use('/api/transactions', transactionRouter);
app.use('/api/categories', categoryRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
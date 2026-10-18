import 'dotenv/config';
import express from 'express';
import cookieParser from "cookie-parser";
import { connectDb } from './config/db.js';
import AuthRoute from "./routes/auth.route.js"
import AccountRoute from "./routes/account.route.js"

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use("/api/v1/user", AuthRoute)
app.use("/api/v1/account", AccountRoute)


app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Hello World!',
  });
});

const startServer = async () => {
  try {
    await connectDb();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;

// Must be the first import: other modules read process.env as soon as they load.
import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";

import { authRoutes } from "./routes/auth";
import { meRoutes } from "./routes/me";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/me", meRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

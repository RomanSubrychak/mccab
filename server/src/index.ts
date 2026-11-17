// Must be the first import: other modules read process.env as soon as they load.
import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";

import { authRoutes } from "./routes/auth";
import { meRoutes } from "./routes/me";
import { placesRoutes } from "./routes/places";
import { bookingsRoutes, myRidesRoutes, ridesRoutes } from "./routes/rides";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
// Before /me, so meRoutes doesn't answer /me/rides.
app.use("/me/rides", myRidesRoutes);
app.use("/me", meRoutes);
app.use("/places", placesRoutes);
app.use("/rides", ridesRoutes);
app.use("/bookings", bookingsRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

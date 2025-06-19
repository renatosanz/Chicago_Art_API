process.loadEnvFile();
import express from "express";
import redis from "redis";
import cors from "cors";
import homeRouter from "./routes/home.js";
import artworkRouter from "./routes/artwork.js";

const PORT = process.env.PORT || 3000;
export const MAX_ARTWORKS = 129006;
export const CHICAGO_API =
  process.env.CHICAGO_API || "https://api.artic.edu/api/v1";

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONT_DEV,
    credentials: true, // allow server side cookies
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

export const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.on("error", (err) => console.log("Redis Error:", err));
redisClient.connect();

// server endpoints

app.use("/home", homeRouter);
app.use("/artwork", artworkRouter);

app.get("/", async (req, res) => {
  res.json("hi from server!");
});

app.listen(PORT, () => {
  console.log(`Server listening on port: http://localhost:${PORT}`);
});

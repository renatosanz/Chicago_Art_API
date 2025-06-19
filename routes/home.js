import express from "express";
import { CHICAGO_API, MAX_ARTWORKS, redisClient } from "../index.js";
import { getCountryCode } from "../utils/country-utils.js";
const homeRouter = express.Router();

// get home data from redis server or fetching it from source
// saves just the data that fronend uses, this for reduce
// inecesary data transactions, finally saves the data on
// redis cache server.
homeRouter.get("/", async (req, res) => {
  const cacheKey = "home_data";
  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) return res.status(200).json(JSON.parse(cachedData));

    fetch(
      CHICAGO_API +
        "/artworks?fields=id,title,image_id,artist_title,date_end,place_of_origin",
      { method: "GET" }
    )
      .then((data) => data.json())
      .then((api_data) => {
        // take only data usable
        const home_data = {
          last_artworks:
            api_data.data.map((artwork) => {
              return {
                id: artwork.id,
                image_id: artwork.image_id || "",
                title: artwork.title || "",
                date: artwork.date_end || "0000",
                artist_title: artwork.artist_title || "",
                place_code: getCountryCode(artwork.place_of_origin),
                place_display: artwork.place_of_origin,
              };
            }) || [],
        };
        return home_data;
      })
      .then(async (data) => {
        await redisClient.setEx(cacheKey, 86400, JSON.stringify(data));
        return res.status(200).json(data);
      });
  } catch (err) {
    console.error("Error:", err.message);
    return res.status(500).json({ error: "error getting home data!" });
  }
});

// get daily artwork from redis or source
homeRouter.get("/daily", async (req, res) => {
  const cacheKey = "daily_artwork";
  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) return res.json(JSON.parse(cachedData));

    let attempts = 0;
    while (attempts < 5) {
      const randomId = Math.floor(MAX_ARTWORKS * Math.random());
      const response = await fetch(`${CHICAGO_API}/artworks/${randomId}`);

      if (response?.status != 404) {
        const randomArtwork = await response.json();
        await redisClient.setEx(cacheKey, 86400, JSON.stringify(randomArtwork));
        return res.json(randomArtwork);
      }
      attempts++;
    }

    return res.status(500).json({ error: "Daily Artwork not found!" });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Error getting Daily Artwork!" });
  }
});

export default homeRouter;

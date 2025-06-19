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
      const response = await fetch(
        `${CHICAGO_API}/artworks/${randomId}?fields=title,artist_title,date_display,dimensions,description,main_reference_number,medium_display,department_title,artwork_type_title,credit_line,image_id,color,place_of_origin`
      );

      if (response?.status != 404) {
        const randomArtwork = await response.json();
        // from wikipedia
        if (randomArtwork.data.artist_title) {
          return fetch(
            `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts|pageimages&exintro=true&explaintext=true&titles=${encodeURIComponent(
              randomArtwork.data.artist_title
            )}&pithumbsize=300`
          )
            .then((artist_data) => artist_data.json())
            .then(async (wiki_data) => {
              const page = Object.values(wiki_data.query.pages)[0];
              let final_data;
              if (
                page.missing === "" ||
                page.extract.length == 0 ||
                page.thumbnail === null
              ) {
                final_data = {
                  data: randomArtwork.data,
                  artist_data: null,
                };
              } else {
                final_data = {
                  data: randomArtwork.data,
                  artist_data: {
                    title: page.title,
                    extract: page.extract,
                    image: page.thumbnail ? page.thumbnail.source : null,
                  },
                };
              }
              await redisClient.setEx(
                cacheKey,
                86400,
                JSON.stringify(final_data)
              );
              return res.json(final_data);
            });
        }
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

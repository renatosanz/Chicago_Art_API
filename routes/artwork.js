import express from "express";
import { CHICAGO_API, MAX_ARTWORKS, redisClient } from "../index.js";
const artworkRouter = express.Router();

// get home data from redis server or fetching it from source
artworkRouter.get("/", async (req, res) => {
  const { artwork_id } = req.query;
  if (artwork_id == undefined)
    return res.status(500).json({ error: "an id is required!" });
  try {
    fetch(
      CHICAGO_API +
        `/artworks/${artwork_id}?fields=title,artist_title,date_display,dimensions,description,main_reference_number,medium_display,department_title,artwork_type_title,credit_line,image_id,color,place_of_origin`,
      { method: "GET" }
    )
      .then((data) => data.json())
      .then(async (data) => {
        return res.status(200).json(data);
      });
  } catch (err) {
    console.error("Error:", err.message);
    return res.status(500).json({ error: "error getting home data!" });
  }
});

export default artworkRouter;

import { Router } from "express";
import {
  getArticleById,
  getArticles,
  getLastRefreshAt,
  refreshNews,
} from "../lib/news/cache.js";

const router = Router();

router.get("/news", async (_req, res) => {
  if (getArticles().length === 0) {
    await refreshNews(true);
  }
  res.json({
    items: getArticles(),
    lastRefreshAt: new Date(getLastRefreshAt()).toISOString(),
  });
});

router.get("/news/:id", async (req, res) => {
  if (getArticles().length === 0) {
    await refreshNews(true);
  }
  const id = req.params["id"];
  if (!id) {
    res.status(400).json({ error: "missing id" });
    return;
  }
  const article = getArticleById(id);
  if (!article) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(article);
});

export default router;

import http from "node:http";
import { CACHE_TTL_MS, SF_BBOX } from "./config.js";
import { buildMapState } from "./aggregator.js";

const port = Number(process.env.PORT ?? 3000);
const apiKey = process.env.FIVE11_API_KEY;

/** @type {{ data: unknown, expiresAt: number } | null} */
let cache = null;

async function getState() {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.data;
  }

  if (!apiKey || apiKey === "your_511_api_key_here") {
    const { buildDemoState } = await import("./demoState.js");
    const data = buildDemoState();
    cache = { data, expiresAt: now + CACHE_TTL_MS };
    return data;
  }

  const data = await buildMapState(apiKey);
  cache = { data, expiresAt: now + CACHE_TTL_MS };
  return data;
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, bbox: SF_BBOX }));
    return;
  }

  if (req.url === "/api/v1/state") {
    try {
      const state = await getState();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(state));
    } catch (error) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "upstream_failed",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      );
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(port, () => {
  console.log(`Bay-Watch backend listening on http://localhost:${port}`);
  if (!apiKey || apiKey === "your_511_api_key_here") {
    console.log("FIVE11_API_KEY not set — serving demo state with school zones only.");
  } else {
    console.log("FIVE11_API_KEY detected — serving live 511 WZDx / events / GTFS-RT alerts.");
  }
});

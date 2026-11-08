export default {
  async fetch(request, env) {
    const secret = request.headers.get("x-proxy-secret");
    if (!env.PROXY_SECRET || secret !== env.PROXY_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized proxy access" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const url = new URL(request.url);
    const target = url.searchParams.get("url");

    if (!target || (!target.startsWith("https://api.warframe.market/v1/") && !target.startsWith("https://api.warframe.market/v2/"))) {
      return new Response(JSON.stringify({ error: "Forbidden target URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const lang = request.headers.get("x-wfm-lang") || "ru";
    const userAgent = request.headers.get("x-wfm-ua") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

    try {
      const response = await fetch(target, {
        method: "GET",
        headers: {
          "Accept": "application/json, text/plain, */*",
          "Platform": "pc",
          "Language": lang,
          "User-Agent": userAgent
        }
      });

      const body = await response.arrayBuffer();
      const contentType = response.headers.get("Content-Type") || "application/json";
      return new Response(body, {
        status: response.status,
        headers: {
          "Content-Type": contentType,
          "x-wfm-status": String(response.status),
          "x-worker-node": env.NODE_ID || "cf-node"
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message || "Upstream fetch error" }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};

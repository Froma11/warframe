/**
 * Cloudflare Worker: Tenno Edge Compute & Processing Node
 * Roles:
 * 1. GET /health - Node healthcheck and readiness probe
 * 2. POST /compute/rivens - Distributed CPU parsing, Endo dissolution formula and sorting
 * 3. GET /?url=... - Legacy transparent proxy fallback
 */

function calculateRivenEndo(mr = 8, rank = 0, rerolls = 0) {
  const safeMR = Math.max(8, Number(mr) || 8);
  const safeRank = Math.max(0, Math.min(8, Number(rank) || 0));
  const safeRerolls = Math.max(0, Number(rerolls) || 0);

  const mrBonus = 100 * (safeMR - 8);
  const rankBonus = Math.floor(22.5 * Math.pow(2, safeRank));
  const rerollBonus = 200 * safeRerolls;

  const total = mrBonus + rankBonus + rerollBonus - 7;
  return Math.max(0, total);
}

export default {
  async fetch(request, env) {
    const secret = request.headers.get("x-proxy-secret");
    if (!env.PROXY_SECRET || secret !== env.PROXY_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized access" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const url = new URL(request.url);

    // 1. Healthcheck endpoint
    if (url.pathname === "/health" || url.pathname === "/health/") {
      return new Response(
        JSON.stringify({
          ok: true,
          status: "ONLINE",
          role: "edge-compute-node",
          node: env.NODE_ID || "cf-node",
          timestamp: Date.now()
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "x-worker-node": env.NODE_ID || "cf-node"
          }
        }
      );
    }

    // 2. High-performance Edge Compute for Rivens
    if (url.pathname === "/compute/rivens" && request.method === "POST") {
      try {
        const payload = await request.json();
        const weaponSlug = payload.weaponUrlName || payload.weaponSlug || "";
        const rawAuctions = Array.isArray(payload.rawAuctions) ? payload.rawAuctions : [];

        const validLots = [];
        let maxEfficiencyFound = 0;
        let hasFreshLot = false;
        const fifteenMinAgo = Date.now() - 15 * 60 * 1000;

        for (const a of rawAuctions) {
          if (!a || !a.item || a.item.type !== "riven" || a.closed === true || a.visible === false) {
            continue;
          }

          // Platform filter: strictly PC or crossplay
          if (a.platform && a.platform !== "pc" && !a.crossplay) continue;
          if (a.owner?.platform && a.owner?.platform !== "pc" && !a.owner?.crossplay) continue;

          const isDirect = Boolean(
            a.is_direct_sell === true ||
            (a.buyout_price !== null && a.starting_price !== null && a.buyout_price === a.starting_price)
          );

          const buyoutPrice = a.buyout_price !== undefined && a.buyout_price !== null ? Number(a.buyout_price) : null;
          const startingPrice = a.starting_price !== undefined && a.starting_price !== null ? Number(a.starting_price) : 0;
          const topBid = a.top_bid !== undefined && a.top_bid !== null ? Number(a.top_bid) : null;

          // Effective price for Endo efficiency formula
          let effectivePrice = 0;
          if (buyoutPrice !== null && buyoutPrice > 0) {
            effectivePrice = buyoutPrice;
          } else {
            effectivePrice = (topBid !== null && topBid > 0) ? topBid : startingPrice;
          }

          const modName = a.item.name || "";
          const modRank = Number(a.item.mod_rank) || 0;
          const reRolls = Number(a.item.re_rolls) || 0;
          const masteryLevel = Number(a.item.mastery_level) || 8;
          const polarity = a.item.polarity || "";
          const attributesJson = JSON.stringify(a.item.attributes || []);

          const sellerName = a.owner?.ingame_name || a.owner?.slug || "Tenno";
          const sellerStatus = a.owner?.status || "offline";
          const sellerReputation = Number(a.owner?.reputation) || 0;

          const endoValue = calculateRivenEndo(masteryLevel, modRank, reRolls);
          const efficiency = effectivePrice > 0 ? Number((endoValue / effectivePrice).toFixed(2)) : 0;

          if (efficiency > maxEfficiencyFound) {
            maxEfficiencyFound = efficiency;
          }

          const lotCreatedTime = a.created ? new Date(a.created).getTime() : 0;
          if (lotCreatedTime >= fifteenMinAgo) {
            hasFreshLot = true;
          }

          validLots.push({
            id: a.id,
            weapon_slug: weaponSlug,
            seller_name: sellerName,
            seller_status: sellerStatus,
            seller_reputation: sellerReputation,
            is_direct_sell: isDirect ? 1 : 0,
            buyout_price: buyoutPrice,
            starting_price: startingPrice,
            top_bid: topBid,
            mod_name: modName,
            mod_rank: modRank,
            re_rolls: reRolls,
            mastery_level: masteryLevel,
            polarity,
            attributes: attributesJson,
            endo_value: endoValue,
            efficiency,
            lot_created_at: a.created || new Date().toISOString(),
            lot_updated_at: a.updated || new Date().toISOString()
          });
        }

        // Sort by efficiency descending
        validLots.sort((x, y) => (y.efficiency || 0) - (x.efficiency || 0));

        return new Response(
          JSON.stringify({
            ok: true,
            processedCount: validLots.length,
            maxEfficiency: maxEfficiencyFound,
            hasFreshLot,
            lots: validLots,
            node: env.NODE_ID || "cf-node"
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "x-worker-node": env.NODE_ID || "cf-node"
            }
          }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ ok: false, error: err.message || "Compute failed" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    }

    // 3. Fallback: transparent URL proxy
    const target = url.searchParams.get("url");
    if (target && (target.startsWith("https://api.warframe.market/v1/") || target.startsWith("https://api.warframe.market/v2/"))) {
      const lang = request.headers.get("x-wfm-lang") || "ru";
      const userAgent = request.headers.get("x-wfm-ua") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

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

    return new Response(JSON.stringify({ error: "Endpoint not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
};

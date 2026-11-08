/**
 * ProxyPoolManager: Hybrid Outbound IPv4/IPv6 IP Pool + Cloudflare Edge Compute Cluster
 * 
 * Features:
 * - 5 Outbound Network Interfaces (1x IPv4 + 4x IPv6) bound via undici.Agent
 * - Strict per-IP mutex (1 active request per IP max) & 900ms token-bucket pacing
 * - 4 Cloudflare Workers as an Edge Compute cluster for parallel Riven lot processing & Endo calculation
 * - Dynamic 429 backoff with Retry-After header parsing
 * - Automatic local CPU fallback if any Edge Worker times out (>3500ms) or fails
 * - Periodic healthchecking of Cloudflare compute nodes
 */

import { Agent, fetch as undiciFetch } from 'undici';
import { isIPv6 } from 'node:net';

export type RequestPriority = 'HIGH' | 'NORMAL' | 'LOW';

export interface IpNodeStatus {
  id: string;
  ip: string;
  family: 4 | 6;
  agent: Agent | null;
  requestsToday: number;
  status: 'READY' | 'COOLDOWN';
  lastUsedAt: number;
  cooldownUntil: number;
  consecutiveErrors: number;
  isBusy: boolean;
}

export interface ComputeWorkerNode {
  id: string;
  url: string;
  status: 'READY' | 'UNHEALTHY';
  lastCheckAt: number;
  tasksProcessed: number;
}

interface QueuedRequest<T = any> {
  id: string;
  url: string;
  priority: RequestPriority;
  options?: {
    lang?: string;
    headers?: Record<string, string>;
  };
  retriesLeft: number;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
  enqueuedAt: number;
}

export interface ComputeRivensResult {
  ok: boolean;
  processedCount: number;
  maxEfficiency: number;
  hasFreshLot: boolean;
  lots: any[];
  node: string;
  error?: string;
}

export class ProxyPoolManager {
  private ipNodes: IpNodeStatus[] = [];
  private computeNodes: ComputeWorkerNode[] = [];
  private queue: QueuedRequest[] = [];
  private isProcessingQueue = false;
  private lastGlobalDispatchAt = 0;
  private lastIpv4DispatchAt = 0;
  private lastIpv6DispatchAt = 0;
  private lastFamilyDispatched: 4 | 6 = 6;
  private currentUtcDay: string = '';
  private proxySecret: string = '';
  private nextWorkerIndex = 0;
  private cfTasksProcessedTotal = 0;
  private healthIntervalId: any = null;

  constructor() {
    this.currentUtcDay = this.getTodayUtcDateString();
    this.initNodes();
    this.startHealthCheckLoop();
  }

  private getTodayUtcDateString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  public initNodes(): void {
    this.proxySecret = process.env.PROXY_SECRET || 'zero_secret_proxy_99f4a81bc268d0e74e4c2d3a811';

    // 1. Initialize 5 Outbound IP Nodes (1x IPv4 + 4x IPv6)
    const envOutboundIps = process.env.OUTBOUND_IPS || '';
    const rawIps = envOutboundIps
      ? envOutboundIps.split(',').map((s) => s.trim()).filter(Boolean)
      : [
          '75.119.157.81',
          '2a02:c207:2370:7155::10',
          '2a02:c207:2370:7155::11',
          '2a02:c207:2370:7155::12',
          '2a02:c207:2370:7155::13',
        ];

    this.ipNodes = rawIps.map((ip, idx) => {
      const family: 4 | 6 = isIPv6(ip) ? 6 : 4;
      let agent: Agent | null = null;
      try {
        agent = new Agent({
          connect: {
            localAddress: ip,
            family,
            timeout: 10000,
          },
          keepAliveTimeout: 15000,
          connections: 2,
        });
      } catch (err: any) {
        console.warn(`[ProxyPool] Could not bind agent to ${ip}, will use default routing:`, err.message);
        agent = new Agent({
          connect: { timeout: 10000 },
          keepAliveTimeout: 15000,
          connections: 2,
        });
      }

      return {
        id: `IP-${idx + 1} (${family === 6 ? 'IPv6' : 'IPv4'})`,
        ip,
        family,
        agent,
        requestsToday: 0,
        status: 'READY',
        lastUsedAt: 0,
        cooldownUntil: 0,
        consecutiveErrors: 0,
        isBusy: false,
      };
    });

    // 2. Initialize 4 Cloudflare Compute Worker Nodes
    const defaultWorkerUrls = [
      'https://zero-wfm-node1.black2213612.workers.dev',
      'https://zero-wfm-node2.korsunovurij89.workers.dev',
      'https://zero-wfm-node3.hoholok1946.workers.dev',
      'https://zero-wfm-node4.hoholok1947.workers.dev',
    ];
    const envWorkerUrls = process.env.CF_WORKER_URLS
      ? process.env.CF_WORKER_URLS.split(',').map((u) => u.trim()).filter(Boolean)
      : defaultWorkerUrls;

    this.computeNodes = envWorkerUrls.map((url, idx) => ({
      id: `CF-${idx + 1}`,
      url: url.replace(/\/$/, ''),
      status: 'READY',
      lastCheckAt: 0,
      tasksProcessed: 0,
    }));

    console.log(
      `[ProxyPool] Initialized pool with ${this.ipNodes.length} outbound IPs (${this.ipNodes.map((n) => n.id).join(', ')}) and ${this.computeNodes.length} Cloudflare Edge Compute nodes.`
    );
  }

  private startHealthCheckLoop(): void {
    if (this.healthIntervalId) clearInterval(this.healthIntervalId);
    // Initial probe
    this.probeComputeNodes();
    // Periodic probe every 30 seconds
    this.healthIntervalId = setInterval(() => this.probeComputeNodes(), 30000);
  }

  private async probeComputeNodes(): Promise<void> {
    await Promise.allSettled(
      this.computeNodes.map(async (node) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 12000);
          const res = await undiciFetch(`${node.url}/health`, {
            headers: { 'x-proxy-secret': this.proxySecret },
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (res.ok) {
            node.status = 'READY';
            node.lastCheckAt = Date.now();
          } else {
            node.status = 'UNHEALTHY';
          }
        } catch {
          node.status = 'UNHEALTHY';
        }
      })
    );
  }

  private checkUtcMidnightReset(): void {
    const today = this.getTodayUtcDateString();
    if (today !== this.currentUtcDay) {
      this.currentUtcDay = today;
      for (const node of this.ipNodes) {
        node.requestsToday = 0;
        if (node.status === 'COOLDOWN' && Date.now() >= node.cooldownUntil) {
          node.status = 'READY';
        }
      }
    }
  }

  /**
   * Finds the best currently available IP node that is not busy and satisfies minInterval (1800ms)
   * with family/subnet pacing. Alternates between IPv4 and IPv6 nodes smoothly.
   */
  private getAvailableIpNode(): IpNodeStatus | null {
    this.checkUtcMidnightReset();
    const now = Date.now();

    for (const node of this.ipNodes) {
      if (node.status === 'COOLDOWN' && now >= node.cooldownUntil) {
        node.status = 'READY';
        node.consecutiveErrors = 0;
      }
    }

    const readyIdleNodes = this.ipNodes.filter((n) => n.status === 'READY' && !n.isBusy);
    if (readyIdleNodes.length === 0) return null;

    // Prefer alternating family: if last was 4, prefer 6; if last was 6, prefer 4
    const preferredFamily = this.lastFamilyDispatched === 4 ? 6 : 4;
    let candidates = readyIdleNodes.filter((n) => n.family === preferredFamily);
    if (candidates.length === 0) {
      candidates = readyIdleNodes;
    }

    let bestNode: IpNodeStatus | null = null;
    let longestIdleTime = -1;

    for (const node of candidates) {
      const minInterval = 1800; // at least 1800ms per individual IP
      const elapsed = now - node.lastUsedAt;

      // IPv4 pacing: ensure at least 1800ms between IPv4 requests
      if (node.family === 4 && now - this.lastIpv4DispatchAt < 1800) {
        continue;
      }

      // IPv6 prefix spacing: protect the shared /64 prefix (at least 1800ms between any IPv6 requests)
      if (node.family === 6 && now - this.lastIpv6DispatchAt < 1800) {
        continue;
      }

      if (elapsed >= minInterval || node.lastUsedAt === 0) {
        if (elapsed > longestIdleTime) {
          longestIdleTime = elapsed;
          bestNode = node;
        }
      }
    }

    // Fallback to other family if preferred did not meet interval
    if (!bestNode && candidates !== readyIdleNodes) {
      for (const node of readyIdleNodes) {
        const elapsed = now - node.lastUsedAt;
        if (node.family === 4 && now - this.lastIpv4DispatchAt < 1800) continue;
        if (node.family === 6 && now - this.lastIpv6DispatchAt < 1800) continue;

        if (elapsed >= 1800 || node.lastUsedAt === 0) {
          if (elapsed > longestIdleTime) {
            longestIdleTime = elapsed;
            bestNode = node;
          }
        }
      }
    }

    return bestNode;
  }

  /**
   * Main fetch method with priority queue across 5 outbound IP nodes
   */
  public async fetchJson<T = any>(
    targetUrl: string,
    options: {
      priority?: RequestPriority;
      lang?: string;
      headers?: Record<string, string>;
      retries?: number;
    } = {}
  ): Promise<T> {
    const priority = options.priority || 'NORMAL';
    const retriesLeft = options.retries !== undefined ? options.retries : 3;

    return new Promise<T>((resolve, reject) => {
      const item: QueuedRequest<T> = {
        id: Math.random().toString(36).substring(2, 9),
        url: targetUrl,
        priority,
        options: {
          lang: options.lang || 'ru',
          headers: options.headers,
        },
        retriesLeft,
        resolve,
        reject,
        enqueuedAt: Date.now(),
      };

      if (priority === 'HIGH') {
        this.queue.unshift(item);
      } else if (priority === 'NORMAL') {
        const firstLowIndex = this.queue.findIndex((q) => q.priority === 'LOW');
        if (firstLowIndex === -1) {
          this.queue.push(item);
        } else {
          this.queue.splice(firstLowIndex, 0, item);
        }
      } else {
        this.queue.push(item);
      }

      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    const dispatchNext = () => {
      if (this.queue.length === 0) {
        this.isProcessingQueue = false;
        return;
      }

      const now = Date.now();
      const minGlobalGap = 1050; // 1050ms between any requests dispatched across the entire pool
      const globalElapsed = now - this.lastGlobalDispatchAt;
      if (globalElapsed < minGlobalGap) {
        setTimeout(dispatchNext, Math.max(10, minGlobalGap - globalElapsed));
        return;
      }

      const node = this.getAvailableIpNode();
      if (!node) {
        setTimeout(dispatchNext, 50);
        return;
      }

      const req = this.queue.shift();
      if (!req) {
        this.isProcessingQueue = false;
        return;
      }

      node.isBusy = true;
      node.lastUsedAt = Date.now();
      node.requestsToday++;
      this.lastGlobalDispatchAt = Date.now();
      this.lastFamilyDispatched = node.family;
      if (node.family === 4) {
        this.lastIpv4DispatchAt = Date.now();
      } else {
        this.lastIpv6DispatchAt = Date.now();
      }

      this.executeRequest(node, req).finally(() => {
        node.isBusy = false;
        node.lastUsedAt = Date.now();
      });

      // Pace subsequent dispatches smoothly
      setTimeout(dispatchNext, minGlobalGap);
    };

    dispatchNext();
  }

  private async executeRequest(node: IpNodeStatus, req: QueuedRequest): Promise<void> {
    const fetchHeaders: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Language: req.options?.lang || 'ru',
      Platform: 'pc',
      ...(req.options?.headers || {}),
    };

    try {
      const res = await undiciFetch(req.url, {
        method: 'GET',
        headers: fetchHeaders,
        dispatcher: node.agent || undefined,
      });

      // Handle 429 Too Many Requests
      if (res.status === 429) {
        const retryAfterHeader = res.headers.get('retry-after');
        const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 60;
        const cooldownMs = Math.max(30000, (isNaN(retryAfterSec) ? 60 : retryAfterSec) * 1000);

        console.warn(`[ProxyPool] Node ${node.id} received HTTP 429. Setting cooldown for ${cooldownMs / 1000}s.`);
        node.status = 'COOLDOWN';
        node.cooldownUntil = Date.now() + cooldownMs;

        // Clear out low-priority background requests to relieve pressure
        this.queue = this.queue.filter((q) => q.priority !== 'LOW');
        this.retryOrReject(req, new Error(`Rate limit 429 on node ${node.id}`), 4000);
        return;
      }

      if (res.status >= 500) {
        node.consecutiveErrors++;
        if (node.consecutiveErrors >= 3) {
          node.status = 'COOLDOWN';
          node.cooldownUntil = Date.now() + 30000;
        }
        this.retryOrReject(req, new Error(`Upstream HTTP ${res.status} on ${node.id}`));
        return;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.retryOrReject(req, new Error(`HTTP ${res.status}: ${text.slice(0, 100)}`));
        return;
      }

      // Success
      node.consecutiveErrors = 0;
      const json = await res.json();
      req.resolve(json);
    } catch (err: any) {
      node.consecutiveErrors++;
      if (node.consecutiveErrors >= 3) {
        node.status = 'COOLDOWN';
        node.cooldownUntil = Date.now() + 30000;
      }
      this.retryOrReject(req, err);
    }
  }

  private retryOrReject(req: QueuedRequest, error: Error, delayMs = 0): void {
    if (req.retriesLeft > 0) {
      req.retriesLeft--;
      const retryAction = () => {
        if (req.priority === 'HIGH') {
          this.queue.unshift(req);
        } else {
          this.queue.push(req);
        }
        this.processQueue();
      };

      if (delayMs > 0) {
        setTimeout(retryAction, delayMs);
      } else {
        retryAction();
      }
    } else {
      req.reject(error);
    }
  }

  /**
   * Distributes raw auction compute tasks to Cloudflare Edge Compute Workers
   * with automatic Round-Robin and fallback to local CPU parsing.
   */
  public async computeOnWorker(payload: {
    weaponUrlName: string;
    weaponMetadata?: any;
    rawAuctions: any[];
    attributeDict?: any;
  }): Promise<ComputeRivensResult> {
    const readyWorkers = this.computeNodes.filter((n) => n.status === 'READY');

    if (readyWorkers.length > 0) {
      const worker = readyWorkers[this.nextWorkerIndex % readyWorkers.length];
      this.nextWorkerIndex = (this.nextWorkerIndex + 1) % readyWorkers.length;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await undiciFetch(`${worker.url}/compute/rivens`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-proxy-secret': this.proxySecret,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (res.ok) {
          const json = (await res.json()) as ComputeRivensResult;
          if (json && json.ok) {
            this.cfTasksProcessedTotal++;
            worker.tasksProcessed++;
            return json;
          }
        }
      } catch (err: any) {
        // Fallback gracefully on timeout or error
      }
    }

    // Local CPU Fallback (guarantees zero data loss even if all workers are unreachable)
    return this.computeRivensLocally(payload);
  }

  /**
   * Local CPU processing fallback
   */
  public computeRivensLocally(payload: {
    weaponUrlName: string;
    rawAuctions: any[];
  }): ComputeRivensResult {
    const weaponSlug = payload.weaponUrlName || '';
    const rawAuctions = Array.isArray(payload.rawAuctions) ? payload.rawAuctions : [];
    const validLots: any[] = [];
    let maxEfficiencyFound = 0;
    let hasFreshLot = false;
    const fifteenMinAgo = Date.now() - 15 * 60 * 1000;

    for (const a of rawAuctions) {
      if (!a || !a.item || a.item.type !== 'riven' || a.closed === true || a.visible === false) {
        continue;
      }

      if (a.platform && a.platform !== 'pc' && !a.crossplay) continue;
      if (a.owner?.platform && a.owner?.platform !== 'pc' && !a.owner?.crossplay) continue;

      const isDirect = Boolean(
        a.is_direct_sell === true ||
          (a.buyout_price !== null && a.starting_price !== null && a.buyout_price === a.starting_price)
      );

      const buyoutPrice = a.buyout_price !== undefined && a.buyout_price !== null ? Number(a.buyout_price) : null;
      const startingPrice = a.starting_price !== undefined && a.starting_price !== null ? Number(a.starting_price) : 0;
      const topBid = a.top_bid !== undefined && a.top_bid !== null ? Number(a.top_bid) : null;

      let effectivePrice = 0;
      if (buyoutPrice !== null && buyoutPrice > 0) {
        effectivePrice = buyoutPrice;
      } else {
        effectivePrice = topBid !== null && topBid > 0 ? topBid : startingPrice;
      }

      const modName = a.item.name || '';
      const modRank = Number(a.item.mod_rank) || 0;
      const reRolls = Number(a.item.re_rolls) || 0;
      const masteryLevel = Number(a.item.mastery_level) || 8;
      const polarity = a.item.polarity || '';
      const attributesJson = JSON.stringify(a.item.attributes || []);

      const sellerName = a.owner?.ingame_name || a.owner?.slug || 'Tenno';
      const sellerStatus = a.owner?.status || 'offline';
      const sellerReputation = Number(a.owner?.reputation) || 0;

      const safeMR = Math.max(8, Number(masteryLevel) || 8);
      const safeRank = Math.max(0, Math.min(8, Number(modRank) || 0));
      const safeRerolls = Math.max(0, Number(reRolls) || 0);
      const endoValue = Math.max(
        0,
        100 * (safeMR - 8) + Math.floor(22.5 * Math.pow(2, safeRank)) + 200 * safeRerolls - 7
      );
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
        lot_updated_at: a.updated || new Date().toISOString(),
      });
    }

    validLots.sort((x, y) => (y.efficiency || 0) - (x.efficiency || 0));

    return {
      ok: true,
      processedCount: validLots.length,
      maxEfficiency: maxEfficiencyFound,
      hasFreshLot,
      lots: validLots,
      node: 'vps-local-fallback',
    };
  }

  public getTelemetry(): {
    totalNodes: number;
    healthyNodes: number;
    queueLength: number;
    outboundIpsActive: number;
    cfWorkersHealthy: number;
    cfTasksProcessed: number;
    nodes: Array<{
      id: string;
      ip: string;
      family: number;
      requestsToday: number;
      status: string;
    }>;
    workers: Array<{
      id: string;
      url: string;
      status: string;
      tasksProcessed: number;
    }>;
  } {
    this.checkUtcMidnightReset();
    const healthyIps = this.ipNodes.filter((n) => n.status === 'READY').length;
    const healthyWorkers = this.computeNodes.filter((n) => n.status === 'READY').length;

    return {
      totalNodes: this.ipNodes.length,
      healthyNodes: healthyIps,
      queueLength: this.queue.length,
      outboundIpsActive: healthyIps,
      cfWorkersHealthy: healthyWorkers,
      cfTasksProcessed: this.cfTasksProcessedTotal,
      nodes: this.ipNodes.map((n) => ({
        id: n.id,
        ip: n.ip,
        family: n.family,
        requestsToday: n.requestsToday,
        status: n.status,
      })),
      workers: this.computeNodes.map((w) => ({
        id: w.id,
        url: w.url,
        status: w.status,
        tasksProcessed: w.tasksProcessed,
      })),
    };
  }
}

export const proxyPool = new ProxyPoolManager();

/**
 * ProxyPoolManager: Distributed Proxy Pool with Strict Per-Node Mutual Exclusion
 * 
 * Features:
 * - 5 Nodes (4 Cloudflare Workers + 1 Direct Contabo VPS Node)
 * - Strict per-node concurrency limit (1 active request per node max)
 * - Token-bucket pacing: 1050ms for CF workers, 1250ms for DIRECT-VPS
 * - Dynamic 429 backoff using WFM `Retry-After` header (or 60s default)
 * - Automatic 403 CF Turnstile detection & cooldown
 * - Zero Event Loop starvation, instant non-blocking queue for HIGH priority requests
 */

export interface NodeStatus {
  id: string;
  url: string | null; // null for DIRECT-VPS
  requestsToday: number;
  quota: number | null;
  status: 'READY' | 'COOLDOWN' | 'EXHAUSTED';
  lastUsedAt: number;
  cooldownUntil: number;
  consecutiveErrors: number;
  isBusy: boolean;
}

export type RequestPriority = 'HIGH' | 'NORMAL' | 'LOW';

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

export class ProxyPoolManager {
  private nodes: NodeStatus[] = [];
  private queue: QueuedRequest[] = [];
  private isProcessingQueue = false;
  private currentUtcDay: string = '';
  private proxySecret: string = '';

  constructor() {
    this.currentUtcDay = this.getTodayUtcDateString();
    this.initNodes();
  }

  private getTodayUtcDateString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  public initNodes(): void {
    this.proxySecret = process.env.PROXY_SECRET || 'zero_secret_proxy_99f4a81bc268d0e74e4c2d3a811';

    const cfUrlsEnv = process.env.CF_WORKER_URLS || '';
    const cfUrls = cfUrlsEnv
      .split(',')
      .map(u => u.trim())
      .filter(u => u.length > 0 && u.startsWith('http'));

    this.nodes = [];

    // Register Cloudflare worker nodes
    cfUrls.forEach((url, idx) => {
      this.nodes.push({
        id: `CF-${idx + 1}`,
        url: url.replace(/\/$/, ''),
        requestsToday: 0,
        quota: 88000,
        status: 'READY',
        lastUsedAt: 0,
        cooldownUntil: 0,
        consecutiveErrors: 0,
        isBusy: false
      });
    });

    // Node 5 is always DIRECT (Direct Contabo VPS node)
    this.nodes.push({
      id: 'DIRECT-VPS',
      url: null,
      requestsToday: 0,
      quota: null,
      status: 'READY',
      lastUsedAt: 0,
      cooldownUntil: 0,
      consecutiveErrors: 0,
      isBusy: false
    });

    console.log(`[ProxyPool] Initialized pool with ${this.nodes.length} nodes: ${this.nodes.map(n => n.id).join(', ')}`);
  }

  private checkUtcMidnightReset(): void {
    const today = this.getTodayUtcDateString();
    if (today !== this.currentUtcDay) {
      console.log(`[ProxyPool] UTC midnight rollover (${this.currentUtcDay} -> ${today}). Resetting daily quotas.`);
      this.currentUtcDay = today;
      for (const node of this.nodes) {
        node.requestsToday = 0;
        if (node.status === 'EXHAUSTED') {
          node.status = 'READY';
        }
      }
    }
  }

  /**
   * Finds the best currently available node that is not busy and satisfies minInterval
   */
  private getAvailableNode(): NodeStatus | null {
    this.checkUtcMidnightReset();
    const now = Date.now();

    // Recover nodes whose cooldown expired
    for (const node of this.nodes) {
      if (node.status === 'COOLDOWN' && now >= node.cooldownUntil) {
        node.status = 'READY';
        node.consecutiveErrors = 0;
      }
      if (node.quota !== null && node.requestsToday >= node.quota) {
        node.status = 'EXHAUSTED';
      }
    }

    // Only consider idle nodes in READY status
    const readyIdleNodes = this.nodes.filter(n => n.status === 'READY' && !n.isBusy);
    if (readyIdleNodes.length === 0) {
      return null;
    }

    // Among ready idle nodes, find those that have satisfied their minInterval
    let bestNode: NodeStatus | null = null;
    let longestIdleTime = -1;

    for (const node of readyIdleNodes) {
      const minInterval = node.url ? 1200 : 2500;
      const elapsedSinceLast = now - node.lastUsedAt;

      if (elapsedSinceLast >= minInterval) {
        // Ready right now!
        if (elapsedSinceLast > longestIdleTime) {
          longestIdleTime = elapsedSinceLast;
          bestNode = node;
        }
      }
    }

    return bestNode;
  }

  /**
   * Main fetch method with priority queue
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
          headers: options.headers
        },
        retriesLeft,
        resolve,
        reject,
        enqueuedAt: Date.now()
      };

      if (priority === 'HIGH') {
        this.queue.unshift(item);
      } else if (priority === 'NORMAL') {
        const firstLowIndex = this.queue.findIndex(q => q.priority === 'LOW');
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

  /**
   * Queue processor: dispatches requests to available idle nodes
   */
  private processQueue(): void {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    const dispatchNext = () => {
      if (this.queue.length === 0) {
        this.isProcessingQueue = false;
        return;
      }

      const node = this.getAvailableNode();
      if (!node) {
        // Wait 100ms and check again
        setTimeout(dispatchNext, 100);
        return;
      }

      const req = this.queue.shift();
      if (!req) {
        this.isProcessingQueue = false;
        return;
      }

      // Mark node busy and execute
      node.isBusy = true;
      node.lastUsedAt = Date.now();
      node.requestsToday++;

      this.executeRequest(node, req).finally(() => {
        node.isBusy = false;
        node.lastUsedAt = Date.now();
        // Continue dispatching
        setImmediate(dispatchNext);
      });

      // Try dispatching other requests to any remaining idle nodes
      setImmediate(dispatchNext);
    };

    dispatchNext();
  }

  private async executeRequest(node: NodeStatus, req: QueuedRequest): Promise<void> {
    let fetchUrl: string;
    const fetchHeaders: Record<string, string> = {
      'Accept': 'application/json, text/plain, */*',
      'Platform': 'pc',
      'Language': req.options?.lang || 'ru',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      ...(req.options?.headers || {})
    };

    if (node.url) {
      fetchUrl = `${node.url}/?url=${encodeURIComponent(req.url)}`;
      fetchHeaders['x-proxy-secret'] = this.proxySecret;
      fetchHeaders['x-wfm-lang'] = req.options?.lang || 'ru';
    } else {
      fetchUrl = req.url;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(fetchUrl, {
        method: 'GET',
        headers: fetchHeaders,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const wfmStatusHeader = res.headers.get('x-wfm-status');
      const effectiveStatus = wfmStatusHeader ? parseInt(wfmStatusHeader, 10) : res.status;

      // Handle 429 Too Many Requests
      if (effectiveStatus === 429) {
        const retryAfterHeader = res.headers.get('retry-after');
        const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 90;
        const cooldownMs = Math.max(90000, (isNaN(retryAfterSec) ? 90 : retryAfterSec) * 1000);

        console.warn(`[ProxyPool] Node ${node.id} received HTTP 429. Setting cooldown for ${cooldownMs / 1000}s.`);
        node.status = 'COOLDOWN';
        node.cooldownUntil = Date.now() + cooldownMs;

        // Clear out low-priority background requests to relieve pressure
        this.queue = this.queue.filter((q) => q.priority !== 'LOW');

        this.retryOrReject(req, new Error(`Rate limit 429 on node ${node.id}`));
        return;
      }

      // Handle Cloudflare Bot Challenge (403) on Worker nodes
      if (res.status === 403 && node.url) {
        console.warn(`[ProxyPool] CF Node ${node.id} received 403 Bot Challenge. Setting 15m cooldown.`);
        node.status = 'COOLDOWN';
        node.cooldownUntil = Date.now() + 15 * 60 * 1000;

        this.retryOrReject(req, new Error(`CF Node ${node.id} 403 challenge`));
        return;
      }

      // Handle Upstream 5xx errors
      if (effectiveStatus >= 500) {
        node.consecutiveErrors++;
        if (node.consecutiveErrors >= 3) {
          console.warn(`[ProxyPool] Node ${node.id} hit 3 consecutive errors (${effectiveStatus}). Cooldown 45s.`);
          node.status = 'COOLDOWN';
          node.cooldownUntil = Date.now() + 45000;
        }
        this.retryOrReject(req, new Error(`Upstream HTTP ${effectiveStatus} on ${node.id}`));
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
        console.warn(`[ProxyPool] Node ${node.id} network errors. Cooldown 45s.`);
        node.status = 'COOLDOWN';
        node.cooldownUntil = Date.now() + 45000;
      }
      this.retryOrReject(req, err);
    }
  }

  private retryOrReject(req: QueuedRequest, error: Error): void {
    if (req.retriesLeft > 0) {
      req.retriesLeft--;
      if (req.priority === 'HIGH') {
        this.queue.unshift(req);
      } else {
        this.queue.push(req);
      }
      this.processQueue();
    } else {
      req.reject(error);
    }
  }

  public getTelemetry(): {
    totalNodes: number;
    healthyNodes: number;
    queueLength: number;
    nodes: Array<{
      id: string;
      requestsToday: number;
      quota: number | null;
      status: string;
    }>;
  } {
    this.checkUtcMidnightReset();
    const healthy = this.nodes.filter(n => n.status === 'READY').length;

    return {
      totalNodes: this.nodes.length,
      healthyNodes: healthy,
      queueLength: this.queue.length,
      nodes: this.nodes.map(n => ({
        id: n.id,
        requestsToday: n.requestsToday,
        quota: n.quota,
        status: n.status
      }))
    };
  }
}

export const proxyPool = new ProxyPoolManager();

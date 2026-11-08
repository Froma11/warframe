/**
 * ProxyPoolManager: 5-Node High-Frequency Distributed Proxy Pool
 * 
 * Supports:
 * - 4 Cloudflare Workers (CF-1 .. CF-4) with token-bucket & 88k req/day quota
 * - 1 Direct Contabo VPS Node (DIRECT-VPS) with 1200ms interval
 * - Non-blocking priority queue (HIGH, NORMAL, LOW)
 * - Automatic 429 backoff & node rotation with transparent retries
 * - Clean fallback to DIRECT-VPS if CF worker URLs are not configured
 */

export interface ProxyNodeConfig {
  id: string;
  url: string | null; // null for DIRECT-VPS
  minIntervalMs: number;
  dailyQuota: number | null;
}

export interface NodeStatus {
  id: string;
  url: string | null;
  requestsToday: number;
  quota: number | null;
  status: 'READY' | 'COOLDOWN' | 'EXHAUSTED';
  lastUsedAt: number;
  cooldownUntil: number;
  consecutiveErrors: number;
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
    this.initNodes();
    this.currentUtcDay = this.getTodayUtcDateString();
  }

  private getTodayUtcDateString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  public initNodes(): void {
    this.proxySecret = process.env.PROXY_SECRET || 'zero_secret_proxy_99f4a81bc268d0e74e4c2d3a811';
    
    // CF_WORKER_URLS format: comma-separated list of 1 to 4 URLs
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
        consecutiveErrors: 0
      });
    });

    // Node 5 is always DIRECT (Direct server IP)
    this.nodes.push({
      id: 'DIRECT-VPS',
      url: null,
      requestsToday: 0,
      quota: null,
      status: 'READY',
      lastUsedAt: 0,
      cooldownUntil: 0,
      consecutiveErrors: 0
    });

    console.log(`[ProxyPool] Initialized pool with ${this.nodes.length} nodes: ${this.nodes.map(n => n.id).join(', ')}`);
  }

  /**
   * Checks and resets daily quota counters if UTC day has changed
   */
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
   * Returns next ready node, respecting cooldowns, quotas and minimum intervals
   */
  private getReadyNode(): { node: NodeStatus; waitMs: number } | null {
    this.checkUtcMidnightReset();
    const now = Date.now();

    // Update statuses for nodes whose cooldown has passed
    for (const node of this.nodes) {
      if (node.status === 'COOLDOWN' && now >= node.cooldownUntil) {
        node.status = 'READY';
        node.consecutiveErrors = 0;
      }
      if (node.quota !== null && node.requestsToday >= node.quota) {
        node.status = 'EXHAUSTED';
      }
    }

    // Filter eligible nodes
    const eligible = this.nodes.filter(n => n.status === 'READY');
    if (eligible.length === 0) {
      // Find minimum cooldown wait among cooled down nodes
      const cooldownNodes = this.nodes.filter(n => n.status === 'COOLDOWN');
      if (cooldownNodes.length > 0) {
        const nextCool = Math.min(...cooldownNodes.map(n => n.cooldownUntil));
        return { node: cooldownNodes[0], waitMs: Math.max(50, nextCool - now) };
      }
      // If all exhausted, fallback to DIRECT-VPS
      const direct = this.nodes.find(n => n.id === 'DIRECT-VPS');
      if (direct) {
        const minInterval = 1200;
        const timeSinceLast = now - direct.lastUsedAt;
        const waitMs = Math.max(0, minInterval - timeSinceLast);
        return { node: direct, waitMs };
      }
      return null;
    }

    // Sort by readiness (time needed until minInterval satisfied) and then by least recently used
    let bestNode: NodeStatus | null = null;
    let minWaitMs = Infinity;

    for (const node of eligible) {
      const minInterval = node.url ? 1050 : 1200;
      const timeSinceLast = now - node.lastUsedAt;
      const waitMs = Math.max(0, minInterval - timeSinceLast);

      if (waitMs === 0) {
        // Can be used immediately! Pick node with oldest lastUsedAt
        if (!bestNode || node.lastUsedAt < bestNode.lastUsedAt) {
          bestNode = node;
          minWaitMs = 0;
        }
      } else if (waitMs < minWaitMs && bestNode === null) {
        minWaitMs = waitMs;
        bestNode = node;
      }
    }

    if (bestNode) {
      return { node: bestNode, waitMs: minWaitMs };
    }

    return null;
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
        // Insert at beginning of queue
        this.queue.unshift(item);
      } else if (priority === 'NORMAL') {
        // Insert after existing HIGH requests
        const firstLowIndex = this.queue.findIndex(q => q.priority === 'LOW');
        if (firstLowIndex === -1) {
          this.queue.push(item);
        } else {
          this.queue.splice(firstLowIndex, 0, item);
        }
      } else {
        // Priority LOW
        this.queue.push(item);
      }

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.queue.length > 0) {
      const nextChoice = this.getReadyNode();
      if (!nextChoice) {
        // Wait 100ms and try again
        await new Promise(r => setTimeout(r, 100));
        continue;
      }

      const { node, waitMs } = nextChoice;
      if (waitMs > 0) {
        await new Promise(r => setTimeout(r, waitMs));
      }

      const req = this.queue.shift();
      if (!req) break;

      // Execute request concurrently without blocking queue loop
      this.executeRequest(node, req);
    }

    this.isProcessingQueue = false;
  }

  private async executeRequest(node: NodeStatus, req: QueuedRequest): Promise<void> {
    const now = Date.now();
    node.lastUsedAt = now;
    node.requestsToday++;

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
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(fetchUrl, {
        method: 'GET',
        headers: fetchHeaders,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const wfmStatusHeader = res.headers.get('x-wfm-status');
      const effectiveStatus = wfmStatusHeader ? parseInt(wfmStatusHeader, 10) : res.status;

      if (effectiveStatus === 429) {
        console.warn(`[ProxyPool] Node ${node.id} received HTTP 429. Setting 5-minute cooldown.`);
        node.status = 'COOLDOWN';
        node.cooldownUntil = Date.now() + 300_000; // 5 minutes

        this.retryOrReject(req, new Error(`Rate limit 429 on node ${node.id}`));
        return;
      }

      if (effectiveStatus >= 500) {
        node.consecutiveErrors++;
        if (node.consecutiveErrors >= 3) {
          console.warn(`[ProxyPool] Node ${node.id} hit 3 consecutive errors (${effectiveStatus}). Cooldown 60s.`);
          node.status = 'COOLDOWN';
          node.cooldownUntil = Date.now() + 60_000;
        }
        this.retryOrReject(req, new Error(`Upstream server error HTTP ${effectiveStatus} on node ${node.id}`));
        return;
      }

      if (!res.ok) {
        // If 403 (Cloudflare challenge) on CF node, mark node in cooldown and fallback
        if (res.status === 403 && node.url) {
          console.warn(`[ProxyPool] CF Node ${node.id} got 403 challenge. Putting into 10-minute cooldown.`);
          node.status = 'COOLDOWN';
          node.cooldownUntil = Date.now() + 600_000;
          this.retryOrReject(req, new Error(`CF Node ${node.id} 403 challenge`));
          return;
        }
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
        console.warn(`[ProxyPool] Node ${node.id} hit 3 consecutive errors. Cooldown 60s.`);
        node.status = 'COOLDOWN';
        node.cooldownUntil = Date.now() + 60_000;
      }
      this.retryOrReject(req, err);
    }
  }

  private retryOrReject(req: QueuedRequest, error: Error): void {
    if (req.retriesLeft > 0) {
      req.retriesLeft--;
      // Put back at beginning of its priority class to re-try with another node
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

  /**
   * Diagnostic telemetry for /api/status endpoint
   */
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

// Global singleton instance
export const proxyPool = new ProxyPoolManager();

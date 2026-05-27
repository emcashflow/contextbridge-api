export interface ContextBridgeConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface Memory {
  id: string;
  content: string;
  sessionId?: string;
  agentId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface RememberOptions {
  sessionId?: string;
  agentId?: string;
  metadata?: Record<string, any>;
  ttl?: number; // Time to live in seconds
}

export interface RecallOptions {
  sessionId?: string;
  agentId?: string;
  query?: string;
  limit?: number;
}

export class ContextBridge {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: ContextBridgeConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl?.replace(/\/$/, '') || 'https://api.contextbridge.io';
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Store a memory
   */
  async remember(content: string, options?: RememberOptions): Promise<{ success: boolean; memory: Memory }> {
    return this.request('POST', '/memories/remember', {
      content,
      ...options,
    });
  }

  /**
   * Retrieve memories
   */
  async recall(options?: RecallOptions): Promise<{ success: boolean; memories: Memory[]; count: number }> {
    const params = new URLSearchParams();
    if (options?.sessionId) params.append('sessionId', options.sessionId);
    if (options?.agentId) params.append('agentId', options.agentId);
    if (options?.query) params.append('query', options.query);
    if (options?.limit) params.append('limit', options.limit.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request('GET', `/memories/recall${query}`);
  }

  /**
   * Delete a specific memory
   */
  async forget(memoryId: string): Promise<{ success: boolean; message: string }> {
    return this.request('DELETE', `/memories/forget/${memoryId}`);
  }

  /**
   * Delete all memories (optionally filtered by session or agent)
   */
  async forgetAll(options?: { sessionId?: string; agentId?: string }): Promise<{ success: boolean; message: string; count: number }> {
    const params = new URLSearchParams();
    if (options?.sessionId) params.append('sessionId', options.sessionId);
    if (options?.agentId) params.append('agentId', options.agentId);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request('DELETE', `/memories/forget-all${query}`);
  }
}

export default ContextBridge;
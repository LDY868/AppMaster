/**
 * HTTP client for local agent-sdk serve (--mode single → /v1/*).
 * Runs in the Electron main process only. Never log secrets.
 */

export class AgentClient {
  /**
   * @param {{ baseUrl: string, bearerToken?: string | null }} opts
   */
  constructor({ baseUrl, bearerToken = null }) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.bearerToken = bearerToken;
    this.sessionId = null;
    this.continuationToken = null;
    this._streamAbort = null;
  }

  /**
   * @param {string} path
   * @param {RequestInit & { json?: unknown }} [init]
   */
  async request(path, init = {}) {
    const headers = new Headers(init.headers || {});
    if (init.json !== undefined) {
      headers.set("content-type", "application/json");
    }
    if (this.bearerToken) {
      headers.set("authorization", `Bearer ${this.bearerToken}`);
    }
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      const err = new Error(
        data?.message || data?.error || `HTTP ${res.status} ${path}`,
      );
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async health() {
    // Host health is unslugged even in multi mode; single mode also exposes /v1/info.
    try {
      return await this.request("/v1/info");
    } catch (e) {
      // Fall back to root index for early bring-up.
      const res = await fetch(`${this.baseUrl}/`);
      return { ok: res.ok, status: res.status };
    }
  }

  /**
   * @param {string} toolName
   * @param {Record<string, unknown>} input
   */
  async callTool(toolName, input) {
    // sessionId and continuationToken are mutually exclusive on /v1/tools.
    const body = { input };
    if (this.continuationToken) {
      body.continuationToken = this.continuationToken;
    } else if (this.sessionId) {
      body.sessionId = this.sessionId;
    }
    return this.request(`/v1/tools/${encodeURIComponent(toolName)}`, {
      method: "POST",
      json: body,
    });
  }

  /**
   * @param {string} message
   * @param {{ title?: string }} [opts]
   */
  async startSession(message, opts = {}) {
    const data = await this.request("/v1/session", {
      method: "POST",
      json: {
        message,
        ...(opts.title ? { title: opts.title } : {}),
      },
    });
    this.sessionId = data.sessionId;
    this.continuationToken = data.continuationToken;
    return data;
  }

  /**
   * @param {string} message
   */
  async followUp(message) {
    if (!this.sessionId || !this.continuationToken) {
      throw new Error("No active session");
    }
    const data = await this.request(
      `/v1/session/${encodeURIComponent(this.sessionId)}`,
      {
        method: "POST",
        json: {
          continuationToken: this.continuationToken,
          message,
        },
      },
    );
    if (data.continuationToken) {
      this.continuationToken = data.continuationToken;
    }
    return data;
  }

  async stop() {
    if (!this.sessionId) return null;
    return this.request(
      `/v1/session/${encodeURIComponent(this.sessionId)}/stop`,
      { method: "POST", json: {} },
    );
  }

  /**
   * @param {(event: unknown) => void} onEvent
   * @param {{ startIndex?: number }} [opts]
   */
  async streamEvents(onEvent, opts = {}) {
    if (!this.sessionId) throw new Error("No active session");
    if (this._streamAbort) this._streamAbort.abort();
    this._streamAbort = new AbortController();
    const startIndex = opts.startIndex ?? 0;
    const headers = new Headers();
    if (this.bearerToken) {
      headers.set("authorization", `Bearer ${this.bearerToken}`);
    }
    const res = await fetch(
      `${this.baseUrl}/v1/session/${encodeURIComponent(this.sessionId)}/stream?startIndex=${startIndex}`,
      { headers, signal: this._streamAbort.signal },
    );
    if (!res.ok || !res.body) {
      throw new Error(`Stream failed: HTTP ${res.status}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        try {
          onEvent(JSON.parse(line));
        } catch {
          onEvent({ type: "parse_error", line });
        }
      }
    }
  }

  stopStream() {
    if (this._streamAbort) {
      this._streamAbort.abort();
      this._streamAbort = null;
    }
  }
}

/**
 * Wait until the local serve answers.
 * @param {string} baseUrl
 * @param {{ timeoutMs?: number, bearerToken?: string | null }} [opts]
 */
export async function waitForAgent(baseUrl, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const client = new AgentClient({
    baseUrl,
    bearerToken: opts.bearerToken ?? null,
  });
  const start = Date.now();
  let lastErr = null;
  while (Date.now() - start < timeoutMs) {
    try {
      const info = await client.health();
      return { ok: true, info, client };
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return { ok: false, error: lastErr?.message || "timeout", client };
}

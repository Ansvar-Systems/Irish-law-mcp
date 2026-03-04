import { describe, it, expect } from 'vitest';
import healthHandler from '../../api/health.js';

interface MockResponse {
  statusCode: number;
  jsonBody: unknown;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => MockResponse;
}

function runHealth(url: string): MockResponse {
  const req = { url, headers: { host: 'localhost' } };
  const res: MockResponse = {
    statusCode: 0,
    jsonBody: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.jsonBody = payload;
      return this;
    },
  };

  healthHandler(req as any, res as any);
  return res;
}

describe('api/health', () => {
  it('returns liveness payload for /health', () => {
    const res = runHealth('/health');
    const body = res.jsonBody as Record<string, unknown>;
    expect(res.statusCode).toBeOneOf([200, 503]);
    expect(body).toMatchObject({
      server: 'irish-legal-citations',
      version: '1.0.0',
    });
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('database_accessible');
  });

  it('returns version payload for /version', () => {
    const res = runHealth('/version');
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toMatchObject({
      name: 'irish-legal-citations',
      version: '1.0.0',
      transport: ['stdio', 'streamable-http'],
    });
  });

  it('returns version payload for /health?version=1', () => {
    const res = runHealth('/health?version=1');
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toMatchObject({
      name: 'irish-legal-citations',
      version: '1.0.0',
    });
  });
});

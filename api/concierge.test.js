import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from './concierge.js';
import { findConciergeGames, safeTopicReply, validateQuestion } from '../packages/shared/concierge.js';

function response() { return { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() }; }
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('concierge boundaries', () => {
  it('rejects invalid and oversized questions', () => {
    for (const body of [null, {}, { message: '' }, { message: 'x'.repeat(501) }]) expect(validateQuestion(body)).toBe(false);
    expect(validateQuestion({ message: 'roulette' })).toBe(true);
  });
  it('returns only catalogue cards and internally constructed links', () => {
    const games = findConciergeGames('roulette');
    expect(games.length).toBeGreaterThan(0);
    expect(games.length).toBeLessThanOrEqual(3);
    for (const game of games) expect(game.href).toBe(`/casino/lobby?play=${encodeURIComponent(game.id)}`);
    expect(findConciergeGames('NONE')).toEqual([]);
  });
  it('routes risky requests away from recommendations', () => {
    expect(safeTopicReply('recover my losses')).toContain('take a break');
    expect(safeTopicReply('which game will win')).toContain('can’t predict');
    expect(safeTopicReply('roulette')).toBe(null);
  });
  it('is disabled by default and never contacts an API', async () => {
    vi.stubEnv('CONCIERGE_ENABLED', 'false');
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const res = response(); await handler({ method: 'POST', body: { message: 'roulette' } }, res);
    expect(res.status).toHaveBeenCalledWith(503); expect(fetch).not.toHaveBeenCalled();
  });
  it('fails closed without provider configuration', async () => {
    vi.stubEnv('CONCIERGE_ENABLED', 'true'); vi.stubEnv('GROQ_API_KEY', '');
    const res = response(); await handler({ method: 'POST', body: { message: 'roulette' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
  });
  it('validates method before processing', async () => {
    const res = response(); await handler({ method: 'GET' }, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
  it('uses the provider only after atomic quota approval', async () => {
    vi.stubEnv('CONCIERGE_ENABLED', 'true'); vi.stubEnv('GROQ_API_KEY', 'test-only');
    vi.stubEnv('CONCIERGE_MODEL', 'test-model'); vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://quota.invalid'); vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test');
    const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ result: [1, 1] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: 'roulette' } }] }) });
    vi.stubGlobal('fetch', fetch);
    const res = response(); await handler({ method: 'POST', headers: {}, body: { message: 'roulette' } }, res);
    expect(fetch).toHaveBeenCalledTimes(2); expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].games.length).toBeGreaterThan(0);
  });
  it('does not call the model after quota exhaustion', async () => {
    vi.stubEnv('CONCIERGE_ENABLED', 'true'); vi.stubEnv('GROQ_API_KEY', 'test-only');
    vi.stubEnv('CONCIERGE_MODEL', 'test-model'); vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://quota.invalid'); vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test');
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: [201, 1] }) }); vi.stubGlobal('fetch', fetch);
    const res = response(); await handler({ method: 'POST', headers: {}, body: { message: 'roulette' } }, res);
    expect(res.status).toHaveBeenCalledWith(429); expect(fetch).toHaveBeenCalledTimes(1);
  });
});

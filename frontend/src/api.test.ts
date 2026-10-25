import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request } from './api';

afterEach(() => vi.unstubAllGlobals());

describe('API error handling', () => {
  it('attaches authentication and preserves exact prices in JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ price: '123.45' })));
    vi.stubGlobal('fetch', fetchMock);
    await expect(request('/vehicles', 'test-token', 'POST', { price: '123.45' })).resolves.toEqual({ price: '123.45' });
    expect(fetchMock).toHaveBeenCalledWith('/api/vehicles', expect.objectContaining({
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }, body: '{"price":"123.45"}',
    }));
  });
  it('accepts an empty successful delete response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(request('/vehicles/1', 'token', 'DELETE')).resolves.toBeUndefined();
  });
  it('preserves 401 so the application can expire a session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"detail":"Please log in"}', { status: 401 })));
    await expect(request('/vehicles', 'expired-token')).rejects.toMatchObject({ status: 401, message: 'Please log in' });
  });
  it('turns validation failures into readable form feedback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: [{ loc: ['body', 'quantity'], msg: 'Must be positive' }] }), { status: 422 })));
    await expect(request('/vehicles')).rejects.toThrow('quantity: Must be positive');
  });
  it('handles non-JSON server errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad gateway', { status: 502 })));
    await expect(request('/vehicles')).rejects.toBeInstanceOf(ApiError);
  });
  it('explains a network outage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(request('/vehicles')).rejects.toThrow('Cannot reach the server');
  });
});

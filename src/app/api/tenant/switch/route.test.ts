import { describe, expect, it, vi } from 'vitest';
import { POST } from './route';

vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}));

const setMock = vi.fn();
const delMock = vi.fn();
vi.mock('next/headers', () => ({
  cookies: () => ({
    set: (...args: unknown[]) => setMock(...args),
    delete: (...args: unknown[]) => delMock(...args),
    get: () => undefined,
  }),
}));

describe('/api/tenant/switch', () => {
  it('401 when no token', async () => {
    const { getToken } = await import('next-auth/jwt');
    vi.mocked(getToken).mockResolvedValue(null);
    const res = await POST(
      new Request('http://test.local/api/tenant/switch', {
        method: 'POST',
        body: JSON.stringify({ tenantId: 't1' }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('403 when tenantId not in roles', async () => {
    const { getToken } = await import('next-auth/jwt');
    vi.mocked(getToken).mockResolvedValue({
      primaryTenantId: 't1',
      roles: [{ tenantId: 't1', role: 'ADMIN' }],
    });
    const res = await POST(
      new Request('http://test.local/api/tenant/switch', {
        method: 'POST',
        body: JSON.stringify({ tenantId: 't2' }),
      })
    );
    expect(res.status).toBe(403);
  });

  it('sets cookie when allowed', async () => {
    const { getToken } = await import('next-auth/jwt');
    vi.mocked(getToken).mockResolvedValue({
      primaryTenantId: 't1',
      roles: [
        { tenantId: 't1', role: 'ADMIN' },
        { tenantId: 't2', role: 'STAFF' },
      ],
    });
    const res = await POST(
      new Request('http://test.local/api/tenant/switch', {
        method: 'POST',
        body: JSON.stringify({ tenantId: 't2' }),
      })
    );
    expect(res.status).toBe(200);
    expect(setMock).toHaveBeenCalled();
  });

  it('clears cookie when tenantId is null', async () => {
    const { getToken } = await import('next-auth/jwt');
    vi.mocked(getToken).mockResolvedValue({
      primaryTenantId: 't1',
      roles: [{ tenantId: 't1', role: 'ADMIN' }],
    });
    const res = await POST(
      new Request('http://test.local/api/tenant/switch', {
        method: 'POST',
        body: JSON.stringify({ tenantId: null }),
      })
    );
    expect(res.status).toBe(200);
    expect(delMock).toHaveBeenCalled();
  });
});


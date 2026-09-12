import { describe, expect, it, vi, beforeEach } from 'vitest';

const upsertedRows: Record<string, unknown>[] = [];
const deliveredCalls: Array<{ subscriber: unknown; kind: string }> = [];
let checkoutSessionCalls = 0;

vi.mock('../lib/server/supabase', () => ({
  getSupabaseClient: () => ({
    from: () => ({
      upsert: (row: Record<string, unknown>) => {
        upsertedRows.push(row);
        return {
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'subscriber-1', email: row.email, ...row }, error: null }),
          }),
        };
      },
    }),
  }),
}));

vi.mock('../lib/server/deliverArtwork', () => ({
  deliverArtworkEmail: (subscriber: unknown, kind: string) => {
    deliveredCalls.push({ subscriber, kind });
    return Promise.resolve();
  },
}));

vi.mock('../lib/server/stripe', () => ({
  getStripeClient: () => ({
    checkout: {
      sessions: {
        create: () => {
          checkoutSessionCalls += 1;
          return Promise.resolve({ url: 'https://checkout.stripe.com/session-123' });
        },
      },
    },
  }),
}));

const { default: handler } = await import('./subscribe');

function makeReqRes(body: Record<string, unknown>) {
  const req = { method: 'POST', body };
  const json = vi.fn();
  const res = { status: vi.fn().mockReturnValue({ json }), json };
  return { req, res };
}

beforeEach(() => {
  upsertedRows.length = 0;
  deliveredCalls.length = 0;
  checkoutSessionCalls = 0;
  delete process.env.SUBSCRIPTION_REQUIRES_PAYMENT;
  delete process.env.STRIPE_PRICE_ID;
});

describe('api/subscribe (free mode: SUBSCRIPTION_REQUIRES_PAYMENT=false)', () => {
  it('marks the subscriber active, sends a welcome piece, and never touches Stripe', async () => {
    process.env.SUBSCRIPTION_REQUIRES_PAYMENT = 'false';
    const { req, res } = makeReqRes({ email: 'visitor@example.com' });
    await handler(req as never, res as never);

    expect(upsertedRows).toHaveLength(1);
    expect(upsertedRows[0]).toMatchObject({ status: 'active' });
    expect(deliveredCalls).toHaveLength(1);
    expect(deliveredCalls[0].kind).toBe('welcome');
    expect(checkoutSessionCalls).toBe(0);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});

describe('api/subscribe (default: payment required)', () => {
  it('marks the subscriber pending, creates a Stripe session, and never delivers a welcome piece directly', async () => {
    process.env.STRIPE_PRICE_ID = 'price_test_123';
    const { req, res } = makeReqRes({ email: 'visitor@example.com' });
    await handler(req as never, res as never);

    expect(upsertedRows).toHaveLength(1);
    expect(upsertedRows[0]).toMatchObject({ status: 'pending' });
    expect(deliveredCalls).toHaveLength(0); // the welcome piece is sent by the Stripe webhook, not here
    expect(checkoutSessionCalls).toBe(1);
    expect(res.json).toHaveBeenCalledWith({ url: 'https://checkout.stripe.com/session-123' });
  });
});

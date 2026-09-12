import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Subscribe } from './Subscribe';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function fillEmail(value: string): void {
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value } });
}

describe('Subscribe', () => {
  it('shows a success message on free-mode signup ({success:true}, no redirect)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) }));
    render(<Subscribe />);
    fillEmail('visitor@example.com');
    fireEvent.click(screen.getByRole('button', { name: 'Join for free' }));
    await waitFor(() => expect(screen.getByText("You're in!")).toBeTruthy());
  });

  it('redirects to Stripe when the response includes a url (paid mode)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ url: 'https://checkout.stripe.com/session-123' }) }));
    const originalLocation = window.location;
    // jsdom's window.location isn't directly assignable; replace it for this test only.
    Object.defineProperty(window, 'location', { value: { ...originalLocation, href: '' }, writable: true });
    render(<Subscribe />);
    fillEmail('visitor@example.com');
    fireEvent.click(screen.getByRole('button', { name: 'Join for free' }));
    await waitFor(() => expect(window.location.href).toBe('https://checkout.stripe.com/session-123'));
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
  });

  it('shows an error message rather than crashing when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'That email looks invalid.' }) }));
    render(<Subscribe />);
    fillEmail('visitor@example.com');
    fireEvent.click(screen.getByRole('button', { name: 'Join for free' }));
    await waitFor(() => expect(screen.getByText('That email looks invalid.')).toBeTruthy());
  });
});

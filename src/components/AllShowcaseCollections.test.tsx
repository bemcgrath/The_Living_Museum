import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllShowcaseCollections } from './AllShowcaseCollections';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const SAMPLE_COLLECTIONS = {
  collections: [
    {
      id: 'c1',
      slug: 'the-impressionist-room',
      name: 'The Impressionist Room',
      style: 'impressionist',
      blurb: null,
      pieces: [
        { id: 'p1', style: 'impressionist', subject: 'a quiet harbor at rest', image_url: 'https://example.com/a.png', artist_name: 'Oscar' },
      ],
    },
  ],
};

describe('AllShowcaseCollections', () => {
  it('shows a pulsing skeleton while the fetch is in flight, not a blank gap', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => { resolveFetch = resolve; })));
    const { container } = render(<AllShowcaseCollections onExit={() => {}} />);
    expect(container.querySelector('.showcase-skeleton-card')).toBeTruthy();
    await act(async () => {
      resolveFetch({ json: () => Promise.resolve({ collections: [] }) });
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  it('renders every collection\'s pieces with their style, subject, and public persona name — never a real artist name', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve(SAMPLE_COLLECTIONS) }));
    render(<AllShowcaseCollections onExit={() => {}} />);
    await waitFor(() => expect(screen.getByText('a quiet harbor at rest')).toBeTruthy());
    expect(screen.getByText('The Impressionist Room')).toBeTruthy();
    expect(screen.getByText('by Oscar')).toBeTruthy();
    expect(screen.queryByText(/Monet/)).toBeNull();
  });

  it('shows an empty-state message when there are no collections yet', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve({ collections: [] }) }));
    render(<AllShowcaseCollections onExit={() => {}} />);
    await waitFor(() => expect(screen.getByText(/No showcase collections yet/)).toBeTruthy());
  });

  it('shows an error message rather than crashing when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    render(<AllShowcaseCollections onExit={() => {}} />);
    await waitFor(() => expect(screen.getByText(/Couldn't load the collections/)).toBeTruthy());
  });

  it('opens the lightbox for a clicked piece', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve(SAMPLE_COLLECTIONS) }));
    render(<AllShowcaseCollections onExit={() => {}} />);
    await waitFor(() => expect(screen.getByText('a quiet harbor at rest')).toBeTruthy());
    fireEvent.click(screen.getByText('a quiet harbor at rest').closest('figure')!);
    expect(screen.getByText('Part of The Impressionist Room')).toBeTruthy();
  });

  it('calls onExit on Escape and when Close is clicked', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve({ collections: [] }) }));
    const onExit = vi.fn();
    render(<AllShowcaseCollections onExit={onExit} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onExit).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText('Close'));
    expect(onExit).toHaveBeenCalledTimes(2);
  });
});

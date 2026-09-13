import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Showcase } from './Showcase';

const SAMPLE_COLLECTION = {
  collections: [
    {
      id: 'c1',
      slug: 'the-impressionist-room',
      name: 'The Impressionist Room',
      style: 'impressionist',
      blurb: null,
      pieces: [
        { id: 'p1', style: 'impressionist', subject: 'a sunlit landscape with rolling hills', image_url: 'https://example.com/a.png', artist_name: 'Oscar' },
      ],
    },
  ],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubFetch(response: unknown, options: { reject?: boolean } = {}) {
  vi.stubGlobal(
    'fetch',
    options.reject
      ? vi.fn().mockRejectedValue(new Error('network down'))
      : vi.fn().mockResolvedValue({ json: () => Promise.resolve(response) }),
  );
}

/** Flushes the component's fetch().then().then() chain and the state update that follows it — needed
 *  for the "renders nothing" assertions below, since null is also the transient loading-state output,
 *  so a naive check right after render() would pass without the fetch ever actually resolving. */
async function flushFetch(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('Showcase', () => {
  it('renders a featured collection\'s pieces with style, subject, and public persona name — never the real artist name', async () => {
    stubFetch(SAMPLE_COLLECTION);
    render(<Showcase />);
    await waitFor(() => expect(screen.getByText('a sunlit landscape with rolling hills')).toBeTruthy());
    expect(screen.getByAltText(/Impressionist.*piece depicting a sunlit landscape with rolling hills/)).toBeTruthy();
    expect(screen.getByText('The Impressionist Room')).toBeTruthy();
    expect(screen.getByText('by Oscar')).toBeTruthy();
    expect(screen.queryByText(/Monet/)).toBeNull();
  });

  it('renders the card without an artist line when artist_name is null (pre-backfill pieces)', async () => {
    stubFetch({
      collections: [
        {
          id: 'c1',
          slug: 'the-impressionist-room',
          name: 'The Impressionist Room',
          style: 'impressionist',
          blurb: null,
          pieces: [
            { id: 'p1', style: 'impressionist', subject: 'a sunlit landscape with rolling hills', image_url: 'https://example.com/a.png', artist_name: null },
          ],
        },
      ],
    });
    render(<Showcase />);
    await waitFor(() => expect(screen.getByText('a sunlit landscape with rolling hills')).toBeTruthy());
    expect(screen.queryByText(/^by /)).toBeNull();
  });

  it('renders nothing before any showcase collection exists', async () => {
    stubFetch({ collections: [] });
    const { container } = render(<Showcase />);
    await flushFetch();
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing rather than an error banner when the fetch fails', async () => {
    stubFetch(null, { reject: true });
    const { container } = render(<Showcase />);
    await flushFetch();
    expect(container.firstChild).toBeNull();
  });

  it('ignores a featured collection that has no pieces yet', async () => {
    stubFetch({ collections: [{ id: 'c1', slug: 'empty', name: 'Empty', style: 'impressionist', blurb: null, pieces: [] }] });
    const { container } = render(<Showcase />);
    await flushFetch();
    expect(container.firstChild).toBeNull();
  });

  it('shows a pulsing skeleton while the fetch is in flight, not a blank gap', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => { resolveFetch = resolve; })));
    const { container } = render(<Showcase />);
    expect(container.querySelector('.showcase-skeleton-card')).toBeTruthy();
    // Resolve so the pending promise doesn't leak into the next test.
    await act(async () => {
      resolveFetch({ json: () => Promise.resolve({ collections: [] }) });
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  it('opens a lightbox with the piece\'s style/subject when clicked, and closes on Escape', async () => {
    stubFetch(SAMPLE_COLLECTION);
    render(<Showcase />);
    await waitFor(() => expect(screen.getByText('a sunlit landscape with rolling hills')).toBeTruthy());

    fireEvent.click(screen.getByText('a sunlit landscape with rolling hills').closest('figure')!);
    expect(screen.getByText('Part of The Impressionist Room')).toBeTruthy();
    expect(screen.getAllByText('by Oscar').length).toBeGreaterThan(0); // one on the card, one in the lightbox

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Part of The Impressionist Room')).toBeNull());
  });

  it('shows "Browse all collections" only when onBrowseAll is provided, and calls it when clicked', async () => {
    stubFetch(SAMPLE_COLLECTION);
    const onBrowseAll = vi.fn();
    render(<Showcase onBrowseAll={onBrowseAll} />);
    await waitFor(() => expect(screen.getByText('Browse all collections')).toBeTruthy());
    fireEvent.click(screen.getByText('Browse all collections'));
    expect(onBrowseAll).toHaveBeenCalledOnce();
    cleanup();

    stubFetch(SAMPLE_COLLECTION);
    render(<Showcase />);
    await waitFor(() => expect(screen.getByText('a sunlit landscape with rolling hills')).toBeTruthy());
    expect(screen.queryByText('Browse all collections')).toBeNull();
  });
});

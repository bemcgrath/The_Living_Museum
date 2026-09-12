import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Showcase } from './Showcase';

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
  it('renders a featured collection\'s pieces with style and subject, never a real artist name', async () => {
    stubFetch({
      collections: [
        {
          id: 'c1',
          slug: 'the-impressionist-room',
          name: 'The Impressionist Room',
          style: 'impressionist',
          blurb: null,
          pieces: [
            { id: 'p1', style: 'impressionist', subject: 'a sunlit landscape with rolling hills', image_url: 'https://example.com/a.png' },
          ],
        },
      ],
    });
    render(<Showcase />);
    await waitFor(() => expect(screen.getByText('a sunlit landscape with rolling hills')).toBeTruthy());
    expect(screen.getByAltText(/Impressionist.*piece depicting a sunlit landscape with rolling hills/)).toBeTruthy();
    expect(screen.getByText('The Impressionist Room')).toBeTruthy();
    expect(screen.queryByText(/Monet/)).toBeNull();
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
});

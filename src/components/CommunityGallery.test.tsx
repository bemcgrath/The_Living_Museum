import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommunityGallery } from './CommunityGallery';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CommunityGallery', () => {
  it('shows a pulsing skeleton while the fetch is in flight, not a blank gap', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => { resolveFetch = resolve; })));
    const { container } = render(<CommunityGallery onExit={() => {}} />);
    expect(container.querySelector('.community-gallery-skeleton-card')).toBeTruthy();
    await act(async () => {
      resolveFetch({ json: () => Promise.resolve({ pieces: [] }) });
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  it('renders fetched pieces with their style, subject, and public persona name — never a real artist name', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        pieces: [
          { id: '1', style: 'impressionist', subject: 'a riverside path', image_url: 'https://example.com/a.png', artist_name: 'Oscar', created_at: new Date().toISOString() },
        ],
      }),
    }));
    render(<CommunityGallery onExit={() => {}} />);
    await waitFor(() => expect(screen.getByText('a riverside path')).toBeTruthy());
    expect(screen.getByAltText(/Impressionist.*piece depicting a riverside path/)).toBeTruthy();
    expect(screen.getByText('by Oscar')).toBeTruthy();
    expect(screen.queryByText(/Monet/)).toBeNull();
  });

  it('renders the card without an artist line when artist_name is null (pieces sent before that column existed)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        pieces: [
          { id: '1', style: 'impressionist', subject: 'a riverside path', image_url: 'https://example.com/a.png', artist_name: null, created_at: new Date().toISOString() },
        ],
      }),
    }));
    render(<CommunityGallery onExit={() => {}} />);
    await waitFor(() => expect(screen.getByText('a riverside path')).toBeTruthy());
    expect(screen.queryByText(/^by /)).toBeNull();
  });

  it('shows an empty-state message when there are no pieces yet', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve({ pieces: [] }) }));
    render(<CommunityGallery onExit={() => {}} />);
    await waitFor(() => expect(screen.getByText(/No community pieces yet/)).toBeTruthy());
  });

  it('shows an error message rather than crashing when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    render(<CommunityGallery onExit={() => {}} />);
    await waitFor(() => expect(screen.getByText(/Couldn't load the community gallery/)).toBeTruthy());
  });
});

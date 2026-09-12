import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommunityGallery } from './CommunityGallery';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CommunityGallery', () => {
  it('renders fetched pieces with their style and subject, never a real artist name', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        pieces: [
          { id: '1', style: 'impressionist', subject: 'a riverside path', image_url: 'https://example.com/a.png', created_at: new Date().toISOString() },
        ],
      }),
    }));
    render(<CommunityGallery onExit={() => {}} />);
    await waitFor(() => expect(screen.getByText('a riverside path')).toBeTruthy());
    expect(screen.getByAltText(/Impressionist.*piece depicting a riverside path/)).toBeTruthy();
    expect(screen.queryByText(/Monet/)).toBeNull();
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

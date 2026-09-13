import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PieceLightbox } from './PieceLightbox';

afterEach(() => {
  cleanup();
});

const PIECE = { style: 'impressionist', subject: 'a quiet harbor at rest', image_url: 'https://example.com/a.png', artist_name: 'Oscar' };

describe('PieceLightbox', () => {
  it('renders nothing when piece is null', () => {
    const { container } = render(<PieceLightbox piece={null} collectionName="The Impressionist Room" onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the image, style, subject, artist, and collection name when a piece is set', () => {
    render(<PieceLightbox piece={PIECE} collectionName="The Impressionist Room" onClose={vi.fn()} />);
    expect(screen.getByAltText(/Impressionist.*piece depicting a quiet harbor at rest/)).toBeTruthy();
    expect(screen.getByText('Impressionist')).toBeTruthy();
    expect(screen.getByText('a quiet harbor at rest')).toBeTruthy();
    expect(screen.getByText('by Oscar')).toBeTruthy();
    expect(screen.getByText('Part of The Impressionist Room')).toBeTruthy();
  });

  it('omits the artist line when artist_name is null or absent', () => {
    render(<PieceLightbox piece={{ ...PIECE, artist_name: null }} collectionName="The Impressionist Room" onClose={vi.fn()} />);
    expect(screen.queryByText(/^by /)).toBeNull();
  });

  it('calls onClose on Escape and on backdrop click, but not on a click inside the modal', () => {
    const onClose = vi.fn();
    render(<PieceLightbox piece={PIECE} collectionName="The Impressionist Room" onClose={onClose} />);

    fireEvent.click(screen.getByText('a quiet harbor at rest'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('shows an invite button only when both artist_name and onInvite are present, and calls onInvite when clicked', () => {
    const onInvite = vi.fn();
    render(<PieceLightbox piece={PIECE} collectionName="The Impressionist Room" onClose={vi.fn()} onInvite={onInvite} />);
    const button = screen.getByText('Invite Oscar to your collection');
    fireEvent.click(button);
    expect(onInvite).toHaveBeenCalledOnce();
  });

  it('omits the invite button when onInvite is not provided', () => {
    render(<PieceLightbox piece={PIECE} collectionName="The Impressionist Room" onClose={vi.fn()} />);
    expect(screen.queryByText(/^Invite /)).toBeNull();
  });

  it('omits the invite button when there is no artist_name, even if onInvite is provided', () => {
    render(<PieceLightbox piece={{ ...PIECE, artist_name: null }} collectionName="The Impressionist Room" onClose={vi.fn()} onInvite={vi.fn()} />);
    expect(screen.queryByText(/^Invite /)).toBeNull();
  });
});

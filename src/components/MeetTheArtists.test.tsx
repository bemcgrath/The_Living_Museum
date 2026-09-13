import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MeetTheArtists } from './MeetTheArtists';

afterEach(() => {
  cleanup();
});

describe('MeetTheArtists', () => {
  it('lists every style\'s full roster (name + personality), never a real name', () => {
    render(<MeetTheArtists onExit={vi.fn()} />);
    // Spot-check across the roster, not just the first style.
    expect(screen.getByText('Oscar')).toBeTruthy();
    expect(screen.getByText('Luminous and impressionist')).toBeTruthy();
    expect(screen.getByText('Mary')).toBeTruthy(); // last of the 6 impressionist profiles
    expect(screen.getByText('Minor')).toBeTruthy(); // silver_gelatin is the last style in ART_STYLES order
    expect(screen.queryByText(/Monet/)).toBeNull();
    expect(screen.queryByText(/Cassatt/)).toBeNull();
  });

  it('shows an Invite button per artist only when onInviteArtist is provided', () => {
    const { rerender } = render(<MeetTheArtists onExit={vi.fn()} />);
    expect(screen.queryAllByText('Invite')).toHaveLength(0);

    rerender(<MeetTheArtists onExit={vi.fn()} onInviteArtist={vi.fn()} />);
    expect(screen.queryAllByText('Invite').length).toBeGreaterThan(1);
  });

  it('invites the clicked artist with their style and name, then exits', () => {
    const onInviteArtist = vi.fn();
    const onExit = vi.fn();
    render(<MeetTheArtists onExit={onExit} onInviteArtist={onInviteArtist} />);

    const oscarRow = screen.getByText('Oscar').closest('li')!;
    fireEvent.click(oscarRow.querySelector('button')!);

    expect(onInviteArtist).toHaveBeenCalledWith('impressionist', 'Oscar');
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('calls onExit on Escape and when Close is clicked', () => {
    const onExit = vi.fn();
    render(<MeetTheArtists onExit={onExit} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onExit).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText('Close'));
    expect(onExit).toHaveBeenCalledTimes(2);
  });
});

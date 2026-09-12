import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
beforeEach(() => {
  window.localStorage.clear();
  // <Showcase /> fetches on mount; jsdom has no relative-URL base, so an unstubbed fetch rejects and
  // produces act() noise in every test here. An empty showcase renders nothing (see Showcase.tsx).
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve({ collections: [] }) }));
});

describe('museum dashboard', () => {
  it('advances the simulation and opens agent details', () => {
    render(<App />);
    expect(screen.getByText('Fresh run · seed 42')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Advance turn' }));
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText(/Ada ·/)).toBeTruthy();
    fireEvent.click(screen.getByText(/Ada ·/));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Curious and experimental')).toBeTruthy();
    expect(screen.getAllByText('Theo').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Close agent details' }));
    fireEvent.click(screen.getByText('Advance turn'));
    expect(screen.getByText(/Jo ·/)).toBeTruthy();
  });

  it('changes the seed for a new world', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Admin tools'));
    const seed = screen.getByDisplayValue('42');
    fireEvent.change(seed, { target: { value: '77' } });
    fireEvent.click(screen.getByRole('button', { name: 'Use this seed' }));
    expect(screen.getByText('Fresh run · seed 77')).toBeTruthy();
    expect(screen.getByText('turn').parentElement?.querySelector('strong')?.textContent).toBe('0');
  });

  it('invites a new artist with a visible profile', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Invite artist' }));
    expect(screen.getAllByText(/joined the museum as a/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Lumen 1 ·|Kite 1 ·|Mara 1 ·|Solace 1 ·|Venn 1 ·|Nova 1 ·|Wren 1 ·|Vincent 1 ·|Oscar 1 ·|Dorothea 1 ·/)).toBeTruthy();
  });

  it('archives the current collection when starting a new one and can browse it', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Advance turn' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start new run' }));

    expect(screen.getByText('Previous collections')).toBeTruthy();
    expect(screen.getByText('Emerging Horizons')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Details' })[0]);
    expect(screen.getByRole('heading', { name: 'Emerging Horizons' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close collection details' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Browse' })[0]);

    expect(screen.getByText('Resumed save · seed 42')).toBeTruthy();
    expect(screen.getByText('turn').parentElement?.querySelector('strong')?.textContent).toBe('1');
    confirmSpy.mockRestore();
  });

  it('allows manually saving a collection to previous collections', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Advance turn' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save collection' }));
    expect(screen.getByText('Collection saved to Previous collections!')).toBeTruthy();
  });

  it('opens gallery mode and shows a displayed work until exited', () => {
    render(<App />);
    for (let i = 0; i < 15; i++) fireEvent.click(screen.getByRole('button', { name: 'Advance turn' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gallery mode' }));
    expect(screen.getByRole('dialog', { name: 'Gallery mode' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Current gallery mode artwork — click for the next piece' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Exit gallery mode' }));
    expect(screen.queryByRole('dialog', { name: 'Gallery mode' })).toBeNull();
  });

  it('invites a themed artist roster when a specific style is chosen for a new collection', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Style for the next new collection'), { target: { value: 'impressionist' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start new run' }));
    expect(screen.getByText(/Oscar ·/)).toBeTruthy();
    expect(screen.getByText(/Pierre ·/)).toBeTruthy();
    expect(screen.getByText(/Edgar ·/)).toBeTruthy();
    expect(screen.queryByText(/Ada ·/)).toBeNull();
  });

  it('finds a searched artist, selects their style, and guarantees them a roster spot', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Search for a favorite artist to invite into the next collection'), { target: { value: 'Cassatt' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find artist' }));
    expect(screen.getByText(/Found a match — Impressionist selected, led by Mary\./)).toBeTruthy();
    expect(screen.queryByText(/Cassatt/)).toBeNull(); // the real name stays internal-only — see genreProfiles.ts
    expect((screen.getByLabelText('Style for the next new collection') as HTMLSelectElement).value).toBe('impressionist');
    fireEvent.click(screen.getByRole('button', { name: 'Start new run' }));
    expect(screen.getByText(/Mary ·/)).toBeTruthy();
  });

  it('reports when a searched artist is not recognized instead of guessing', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Search for a favorite artist to invite into the next collection'), { target: { value: 'Nobody Famous' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find artist' }));
    expect(screen.getByText(/No artist matching "Nobody Famous"/)).toBeTruthy();
  });

  it('clears a searched artist priority when the style is changed manually afterward', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Search for a favorite artist to invite into the next collection'), { target: { value: 'Monet' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find artist' }));
    fireEvent.change(screen.getByLabelText('Style for the next new collection'), { target: { value: 'cubist' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start new run' }));
    expect(screen.getByText(/Pablo ·/)).toBeTruthy();
    expect(screen.queryByText(/Oscar ·/)).toBeNull();
  });

  it('keeps the default varied roster when no style is chosen', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start new run' }));
    expect(screen.getByText(/Ada ·/)).toBeTruthy();
    expect(screen.getByText(/Milo ·/)).toBeTruthy();
    expect(screen.getByText(/Jo ·/)).toBeTruthy();
  });

  it('shows a waiting state in gallery mode when nothing is displayed yet', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Gallery mode' }));
    const dialog = screen.getByRole('dialog', { name: 'Gallery mode' });
    expect(within(dialog).getByText('The first canvas is waiting to be made')).toBeTruthy();
  });
});

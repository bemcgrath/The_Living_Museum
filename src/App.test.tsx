import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

afterEach(cleanup);
beforeEach(() => window.localStorage.clear());

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
    expect(screen.getByText('Theo')).toBeTruthy();
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
    expect(screen.getByText(/joined the museum as a/)).toBeTruthy();
    expect(screen.getByText(/Lumen 1 ·|Kite 1 ·|Mara 1 ·|Solace 1 ·|Venn 1 ·|Nova 1 ·/)).toBeTruthy();
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
});

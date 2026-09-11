import { describe, expect, it } from 'vitest';
import { WorldState } from '../models/WorldState';
import { createMovement } from '../models/Movement';
import { Artist } from './agents/Artist';
import { Critic } from './agents/Critic';
import { Collector } from './agents/Collector';
import { Curator } from './agents/Curator';
import { Historian } from './agents/Historian';
import { SimulationEngine } from './SimulationEngine';

function createTestEngine(seed: number): SimulationEngine {
  const world = new WorldState();
  world.seedValue = seed;
  world.addMovement(createMovement('geometric', 'Geometricism', 'geometric', 'Order and precision', 0));
  const engine = new SimulationEngine(world);
  engine.registerAgent(new Artist('artist', 'Artist', 'Focused', seed));
  engine.registerAgent(new Critic('critic', 'Critic', 'Fair', seed + 1));
  engine.registerAgent(new Curator('curator', 'Curator', 'Selective'));
  engine.registerAgent(new Collector('collector', 'Collector', 'Patient', seed + 2));
  engine.registerAgent(new Historian('historian', 'Historian', 'Reflective'));
  return engine;
}

describe('SimulationEngine', () => {
  it('replays the same world for the same seed', () => {
    const first = createTestEngine(42);
    const second = createTestEngine(42);
    for (let turn = 0; turn < 20; turn++) {
      first.advanceTurn();
      second.advanceTurn();
    }
    expect(first.getWorldState().snapshot()).toBe(second.getWorldState().snapshot());
  });

  it('lets artists draw inspiration from earlier peer work', () => {
    const world = new WorldState();
    const engine = new SimulationEngine(world);
    engine.registerAgent(new Artist('artist-a', 'Ada', 'Curious and experimental', 42));
    engine.registerAgent(new Artist('artist-b', 'Milo', 'Disciplined and minimal', 43));
    for (let turn = 0; turn < 30; turn++) engine.advanceTurn();
    expect(world.getArtworks().some((artwork) => artwork.inspiration)).toBe(true);
  });

  it('produces a different world for a different seed', () => {
    const first = createTestEngine(42);
    const second = createTestEngine(43);
    for (let turn = 0; turn < 10; turn++) {
      first.advanceTurn();
      second.advanceTurn();
    }
    expect(first.getWorldState().snapshot()).not.toBe(second.getWorldState().snapshot());
  });

  it('gives artists personality-driven style profiles', () => {
    const world = new WorldState();
    const engine = new SimulationEngine(world);
    const minimalArtist = new Artist('minimal', 'Minimalist', 'Disciplined and minimal', 42);
    const boldArtist = new Artist('bold', 'Bold', 'Bold and experimental', 43);
    engine.registerAgent(minimalArtist);
    engine.registerAgent(boldArtist);
    for (let turn = 0; turn < 30; turn++) engine.advanceTurn();
    const minimalWorks = world.getArtworks().filter((artwork) => artwork.artist === 'minimal');
    const boldWorks = world.getArtworks().filter((artwork) => artwork.artist === 'bold');
    expect(minimalWorks.some((artwork) => ['minimal', 'geometric', 'bauhaus'].includes(artwork.style))).toBe(true);
    expect(boldWorks.some((artwork) => ['expressionist', 'chaotic', 'abstract', 'cubist'].includes(artwork.style))).toBe(true);
  });

  it('gives meme-driven artists a meme style profile', () => {
    const world = new WorldState();
    const engine = new SimulationEngine(world);
    engine.registerAgent(new Artist('meme-artist', 'Meme Artist', 'Bold and meme-driven', 42));
    for (let turn = 0; turn < 30; turn++) engine.advanceTurn();
    const works = world.getArtworks().filter((artwork) => artwork.artist === 'meme-artist');
    expect(works.some((artwork) => artwork.style === 'meme')).toBe(true);
  });

  it('processes reviews and remains stable over long runs', () => {
    const engine = createTestEngine(7);
    for (let turn = 0; turn < 100; turn++) engine.advanceTurn();
    const world = engine.getWorldState();
    expect(world.turn).toBe(100);
    expect(world.getArtworks().length).toBeGreaterThan(0);
    expect(world.getArtworks().some((artwork) => artwork.criticScore !== null)).toBe(true);
    expect(world.getArtworks().some((artwork) => artwork.status === 'acquired')).toBe(true);
    const artistWorks = world.getArtworks().filter((artwork) => artwork.artist === 'artist');
    expect(new Set(artistWorks.map((artwork) => artwork.signatureMotif)).size).toBe(1);
    expect(new Set(artistWorks.map((artwork) => artwork.compositionSignature)).size).toBe(1);
    expect(artistWorks[0].description).toContain('recurring');
    expect(world.getEvents().some((event) => event.eventType === 'movement_emerged')).toBe(true);
    expect(world.getEvents().some((event) => event.eventType === 'historian_note')).toBe(true);
    expect(world.getHistoricalEvents().length).toBeGreaterThan(0);
    expect(world.getNarrativeText()).toContain('The Living Museum');
    expect(world.getExhibitions().length).toBeGreaterThan(0);
    expect(world.getMovements()[0].prominence).toBeGreaterThanOrEqual(0);
  });

  it('bounds the recent event log on long runs while preserving full historian narrative', () => {
    const engine = createTestEngine(55);
    for (let turn = 0; turn < 600; turn++) engine.advanceTurn();
    const world = engine.getWorldState();
    expect(world.turn).toBe(600);
    expect(world.getEvents().length).toBeLessThanOrEqual(500);
    expect(world.getHistoricalEvents().length).toBeGreaterThan(100);
    expect(world.getArtworks().length).toBeGreaterThan(0);
    // A save/load round trip should still work at this scale and preserve the full narrative.
    const restored = createTestEngine(999);
    restored.loadSnapshot(world.snapshot());
    expect(restored.getWorldState().getHistoricalEvents().length).toBe(world.getHistoricalEvents().length);
    expect(restored.getWorldState().getEvents().length).toBe(world.getEvents().length);
  });

  it('resets state and stops a running simulation', () => {
    const engine = createTestEngine(12);
    engine.advanceTurn();
    engine.reset();
    expect(engine.getWorldState().turn).toBe(0);
    expect(engine.getWorldState().getArtworks()).toHaveLength(0);
    expect(engine.getWorldState().getAgents()).toHaveLength(5);
    expect(engine.getWorldState().getAgent('artist')?.reputation).toBe(50);
    expect(engine.getWorldState().getAgent('artist')?.memory.observations).toHaveLength(0);
    expect(engine.isSimulationRunning()).toBe(false);
  });

  it('updates reputation and relationships as the market reacts', () => {
    const engine = createTestEngine(31);
    for (let turn = 0; turn < 30; turn++) engine.advanceTurn();
    const world = engine.getWorldState();
    const artist = world.getAgent('artist');
    expect(artist?.reputation).not.toBe(50);
    expect(world.getAgent('critic')?.relationships.size).toBeGreaterThan(0);
  });

  it('round-trips a saved world with Map-backed relationships', () => {
    const original = createTestEngine(18);
    for (let turn = 0; turn < 8; turn++) original.advanceTurn();
    const restored = createTestEngine(999);
    restored.loadSnapshot(original.getWorldState().snapshot());
    expect(restored.getWorldState().snapshot()).toBe(original.getWorldState().snapshot());
    expect(restored.getWorldState().getAgents()[0].relationships).toBeInstanceOf(Map);
  });

  it('continues deterministically after loading a snapshot', () => {
    const original = createTestEngine(23);
    for (let turn = 0; turn < 8; turn++) original.advanceTurn();
    const restored = createTestEngine(23);
    restored.loadSnapshot(original.getWorldState().snapshot());
    original.advanceTurn();
    restored.advanceTurn();
    expect(restored.getWorldState().getArtworks()).toEqual(original.getWorldState().getArtworks());
    expect(restored.getWorldState().getEvents()).toEqual(original.getWorldState().getEvents());
    expect(restored.getWorldState().getAgents().map((agent) => agent.reputation))
      .toEqual(original.getWorldState().getAgents().map((agent) => agent.reputation));
  });
});

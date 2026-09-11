import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { WorldState } from './models/WorldState';
import { Artwork } from './models/Artwork';
import { Agent } from './models/Agent';
import { SimulationEngine } from './simulation/SimulationEngine';
import { Artist } from './simulation/agents/Artist';
import { Critic } from './simulation/agents/Critic';
import { Curator } from './simulation/agents/Curator';
import { Collector } from './simulation/agents/Collector';
import { Historian } from './simulation/agents/Historian';
import { RandomGenerator } from './utils/RandomGenerator';

function createEngine(seed: number): SimulationEngine {
  const world = new WorldState();
  world.seedValue = seed;
  const engine = new SimulationEngine(world);
  engine.registerAgent(new Artist('artist-1', 'Ada', 'Curious and experimental', seed + 101), () => new Artist('artist-1', 'Ada', 'Curious and experimental', seed + 101));
  engine.registerAgent(new Artist('artist-2', 'Milo', 'Disciplined and minimal', seed + 202), () => new Artist('artist-2', 'Milo', 'Disciplined and minimal', seed + 202));
  engine.registerAgent(new Artist('artist-3', 'Jo', 'Bold and meme-driven', seed + 303), () => new Artist('artist-3', 'Jo', 'Bold and meme-driven', seed + 303));
  engine.registerAgent(new Critic('critic-1', 'Rhea', 'Demanding but open-minded', seed + 404), () => new Critic('critic-1', 'Rhea', 'Demanding but open-minded', seed + 404));
  engine.registerAgent(new Curator('curator-1', 'Sol', 'Focused on variety and access'), () => new Curator('curator-1', 'Sol', 'Focused on variety and access'));
  engine.registerAgent(new Collector('collector-1', 'Nia', 'Patient and speculative', seed + 505), () => new Collector('collector-1', 'Nia', 'Patient and speculative', seed + 505));
  engine.registerAgent(new Historian('historian-1', 'Theo', 'Careful and reflective'), () => new Historian('historian-1', 'Theo', 'Careful and reflective'));
  return engine;
}

interface ArchivedCollection {
  id: string;
  title: string;
  seed: number;
  turn: number;
  artworkCount: number;
  displayedCount: number;
  acquiredCount: number;
  artistNames: string[];
  exhibitionCount: number;
  dominantStyle: string;
  savedAt: string;
  snapshot: string;
}

function createSampleArchivedCollection(): ArchivedCollection {
  const sampleEngine = createEngine(101);
  for (let turn = 0; turn < 10; turn++) {
    sampleEngine.advanceTurn();
  }
  const sampleWorld = sampleEngine.getWorldState();
  const dominantStyle = sampleWorld.getStats().dominantStyle ?? 'expressionist';
  const title = `${dominantStyle.charAt(0).toUpperCase()}${dominantStyle.slice(1)} Horizons (Sample Collection)`;
  return {
    id: 'sample-collection-101-10',
    title,
    seed: 101,
    turn: 10,
    artworkCount: sampleWorld.getArtworks().length,
    displayedCount: sampleWorld.getArtworks().filter((artwork) => artwork.status === 'displayed').length,
    acquiredCount: sampleWorld.getArtworks().filter((artwork) => artwork.status === 'acquired').length,
    artistNames: sampleWorld.getAgents().filter((agent) => agent.role === 'artist').map((agent) => agent.name),
    exhibitionCount: sampleWorld.getExhibitions().length,
    dominantStyle,
    savedAt: new Date().toISOString(),
    snapshot: sampleWorld.snapshot(),
  };
}

export default function App() {
  const [seed, setSeed] = useState(42);
  const [seedDraft, setSeedDraft] = useState('42');
  const [speed, setSpeed] = useState(1);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [eventAgentFilter, setEventAgentFilter] = useState('all');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [collectionFilter, setCollectionFilter] = useState<'all' | 'displayed' | 'acquired'>('all');
  const [pendingArchivedSnapshot, setPendingArchivedSnapshot] = useState<string | null>(null);
  const [selectedArchive, setSelectedArchive] = useState<ArchivedCollection | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [archive, setArchive] = useState<ArchivedCollection[]>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('living-museum-archive') ?? '[]') as Partial<ArchivedCollection>[];
      if (saved.length === 0) {
        return [createSampleArchivedCollection()];
      }
      return saved.map((entry) => ({
        ...entry,
        title: entry.title ?? 'Archived collection',
        artworkCount: entry.artworkCount ?? 0,
        displayedCount: entry.displayedCount ?? 0,
        acquiredCount: entry.acquiredCount ?? 0,
        artistNames: entry.artistNames ?? [],
        exhibitionCount: entry.exhibitionCount ?? 0,
        dominantStyle: entry.dominantStyle ?? 'emerging',
      })) as ArchivedCollection[];
    } catch {
      return [createSampleArchivedCollection()];
    }
  });
  const fileInput = useRef<HTMLInputElement>(null);
  const engine = useMemo(() => createEngine(seed), [seed]);
  const [, render] = useState(0);
  const world = engine.getWorldState();

  useEffect(() => {
    if (pendingArchivedSnapshot) {
      engine.loadSnapshot(pendingArchivedSnapshot);
      setPendingArchivedSnapshot(null);
    }
    return engine.subscribe(() => render((value) => value + 1));
  }, [engine, pendingArchivedSnapshot]);

  const artworks = world.getArtworks().slice().reverse();
  const visibleArtworks = artworks.filter((artwork) =>
    collectionFilter === 'all' || (collectionFilter === 'displayed' && artwork.status === 'displayed') ||
    (collectionFilter === 'acquired' && artwork.status === 'acquired'),
  );
  const stats = world.getStats();
  const eventTypes = [...new Set(world.getEvents().map((event) => event.eventType))];
  const eventAgents = [...new Set(world.getEvents().map((event) => event.agent))];
  const events = world.getEvents().filter((event) =>
    (eventAgentFilter === 'all' || event.agent === eventAgentFilter) &&
    (eventTypeFilter === 'all' || event.eventType === eventTypeFilter),
  ).slice(-12).reverse();
  const [runSource, setRunSource] = useState<'fresh' | 'loaded'>('fresh');

  function exportEvents(): void {
    const url = URL.createObjectURL(new Blob([JSON.stringify(world.getEvents(), null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `living-museum-events-seed-${world.seedValue}-turn-${world.turn}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportNarrative(): void {
    const url = URL.createObjectURL(new Blob([world.getNarrativeText()], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `living-museum-history-seed-${world.seedValue}-turn-${world.turn}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function applySeed(): void {
    const nextSeed = Number.parseInt(seedDraft, 10);
    if (!Number.isSafeInteger(nextSeed)) return;
    if (world.turn > 0 && !window.confirm('Generate a new collection? This will replace the current museum run.')) return;
    archiveCurrentCollection();
    setSeed(nextSeed);
    setRunSource('fresh');
  }

  function generateCollection(): void {
    const nextSeed = Math.floor(Math.random() * 2147483647);
    archiveCurrentCollection();
    setSeed(nextSeed);
    setSeedDraft(String(nextSeed));
    setRunSource('fresh');
  }

  const displayedCount = artworks.filter((artwork) => artwork.status === 'displayed').length;
  const acquiredCount = artworks.filter((artwork) => artwork.status === 'acquired').length;
  const agentName = (id: string): string => world.getAgent(id)?.name ?? id;

  function archiveCurrentCollection(): void {
    if (world.turn === 0) return;
    const dominantStyle = world.getStats().dominantStyle ?? 'emerging';
    const title = `${dominantStyle.charAt(0).toUpperCase()}${dominantStyle.slice(1)} Horizons`;
    const entry: ArchivedCollection = {
      id: `${world.seedValue}-${world.turn}-${Date.now()}`,
      title,
      seed: world.seedValue,
      turn: world.turn,
      artworkCount: world.getArtworks().length,
      displayedCount: world.getArtworks().filter((artwork) => artwork.status === 'displayed').length,
      acquiredCount: world.getArtworks().filter((artwork) => artwork.status === 'acquired').length,
      artistNames: world.getAgents().filter((agent) => agent.role === 'artist').map((agent) => agent.name),
      exhibitionCount: world.getExhibitions().length,
      dominantStyle,
      savedAt: new Date().toISOString(),
      snapshot: world.snapshot(),
    };
    const nextArchive = [entry, ...archive.filter((item) => item.seed !== entry.seed || item.turn !== entry.turn)].slice(0, 8);
    setArchive(nextArchive);
    window.localStorage.setItem('living-museum-archive', JSON.stringify(nextArchive));
  }

  function loadArchivedCollection(entry: ArchivedCollection): void {
    setPendingArchivedSnapshot(entry.snapshot);
    setSeed(entry.seed);
    setSeedDraft(String(entry.seed));
    setRunSource('loaded');
  }

  function saveCurrentCollectionToArchive(): void {
    if (world.turn === 0) {
      window.alert('Advance the simulation at least 1 turn before saving a collection.');
      return;
    }
    archiveCurrentCollection();
    setSaveNotice('Collection saved to Previous collections!');
    setTimeout(() => setSaveNotice(null), 3500);
  }

  function inviteArtist(): void {
    const invitedNumber = world.getAgents().filter((agent) => agent.id.startsWith('invited-artist-')).length + 1;
    const inviteRng = new RandomGenerator(world.seedValue + world.turn * 7919 + invitedNumber);
    const profiles = [
      { name: 'Lumen', personality: 'Patient and atmospheric' },
      { name: 'Kite', personality: 'Playful and digital' },
      { name: 'Mara', personality: 'Bold and meme-driven' },
      { name: 'Solace', personality: 'Quiet and organic' },
      { name: 'Venn', personality: 'Analytical and geometric' },
      { name: 'Nova', personality: 'Curious and experimental' },
    ];
    const profile = inviteRng.choice(profiles);
    const id = `invited-artist-${invitedNumber}`;
    const name = `${profile.name} ${invitedNumber}`;
    const artist = new Artist(id, name, profile.personality, world.seedValue + 1000 + invitedNumber * 37);
    engine.registerAgent(artist, () => new Artist(id, name, profile.personality, world.seedValue + 1000 + invitedNumber * 37));
    world.addEvent('museum', 'agent_invited', `${name} joined the museum as a ${artist.primaryStyle} artist.`, { agentId: id, primaryStyle: artist.primaryStyle });
    render((value) => value + 1);
  }

  function saveSimulation(): void {
    const url = URL.createObjectURL(new Blob([world.snapshot()], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `living-museum-seed-${world.seedValue}-turn-${world.turn}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function saveArtwork(artwork: Artwork): void {
    const url = URL.createObjectURL(new Blob([JSON.stringify(artwork, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `artwork-${artwork.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function saveArtworkSvg(artwork: Artwork): void {
    const url = URL.createObjectURL(new Blob([artwork.svgData], { type: 'image/svg+xml' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `artwork-${artwork.id}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function loadSimulation(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      engine.loadSnapshot(await file.text());
      setRunSource('loaded');
      setSeedDraft(String(world.seedValue));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not load this save file.');
    } finally {
      event.target.value = '';
    }
  }

  return (
    <main className="museum">
      <header className="hero">
        <div className="brand-lockup">
          <div className="museum-mark" aria-hidden="true"><span /><span /><span /></div>
          <div>
            <p className="eyebrow">A procedural culture simulator</p>
            <h1>The Living Museum</h1>
            <p className="hero-copy">A seeded art world that finds its own taste.</p>
          </div>
        </div>
        <div className="hero-actions">
          <div className="live-indicator"><span className="live-dot" /> {engine.isSimulationRunning() ? 'Simulation live' : 'Simulation paused'} <span className="turn-label">Turn {world.turn}</span></div>
          <div className="controls">
            <button className="button-primary" onClick={() => engine.isSimulationRunning() ? engine.pause() : engine.start()}>
              {engine.isSimulationRunning() ? 'Pause' : 'Create collection'}
            </button>
            <button onClick={() => engine.advanceTurn()}>Advance turn</button>
            <button className="button-quiet" onClick={saveCurrentCollectionToArchive} title="Save current museum run to Previous collections">Save collection</button>
            <button className="button-quiet" onClick={generateCollection} title="Replace the current run with a new collection" aria-label="Generate new collection">New collection</button>
            <button className="button-quiet" onClick={inviteArtist} title="Invite a new artist with a unique personality and primary style">Invite artist</button>
          </div>
          {saveNotice && <div className="save-notice">{saveNotice}</div>}
        </div>
      </header>
      <section className="summary-strip">
        <div className="stats-grid">
          <div className="stat-card stat-accent"><span className="stat-label">turn</span><strong key={stats.currentTurn} className="stat-pop">{stats.currentTurn}</strong><small>unfolding history</small></div>
          <div className="stat-card"><span className="stat-label">Artworks</span><strong key={stats.totalArtworks} className="stat-pop">{stats.totalArtworks}</strong><small>{displayedCount} displayed</small></div>
          <div className="stat-card"><span className="stat-label">Dominant</span><strong className="stat-value-text">{stats.dominantStyle ?? 'Emerging'}</strong><small>museum taste</small></div>
          <div className="stat-card"><span className="stat-label">Events</span><strong>{world.getEvents().length}</strong><small>recorded</small></div>
        </div>
        <div className="narrative-card">
          <div className="narrative-header">
            <p className="eyebrow">Historian's summary</p>
            <button className="button-quiet small-btn" onClick={exportNarrative}>Export narrative</button>
          </div>
          <p>{world.getNarrativeSummary()}</p>
        </div>
      </section>
      <section className="archive-panel compact-archive">
        <div className="archive-header">
          <h2>Previous collections</h2>
          <span className="section-help">Click <b>Save collection</b> above or generate a new run to archive state here.</span>
        </div>
        {archive.length === 0 ? <p className="empty">Your previous collections will appear here.</p> : (
          <ul className="archive-list">
            {archive.map((entry) => (
              <li key={entry.id}>
                <span><strong>{entry.title}</strong><small>Turn {entry.turn} · {entry.artworkCount} works · {entry.dominantStyle}</small></span>
                <div className="archive-actions">
                  <button onClick={() => setSelectedArchive(entry)}>Details</button>
                  <button className="button-primary small-btn" onClick={() => loadArchivedCollection(entry)}>Browse</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="content-grid">
        <section className="collection-section">
          <div className="section-heading">
            <div><p className="eyebrow">The public galleries</p><h2>Collection</h2><p className="section-help">Every work is a trace of the culture forming around it. Select a piece to inspect its provenance.</p></div>
            <label className="filter-control">View <select aria-label="Filter collection" value={collectionFilter} onChange={(event) => setCollectionFilter(event.target.value as typeof collectionFilter)}><option value="all">All works</option><option value="displayed">On display</option><option value="acquired">Acquired</option></select></label>
          </div>
          <div className="gallery">
            {artworks.length === 0 && <div className="empty-state"><div className="empty-mark">✦</div><strong>The first canvas is waiting to be made</strong><p>Press <b>Advance turn</b> to let the artists begin.</p></div>}
            {artworks.length > 0 && visibleArtworks.length === 0 && <p className="empty">No works match this view yet.</p>}
            {visibleArtworks.map((artwork) => (
              <article className="art-card" key={artwork.id} onClick={() => setSelectedArtwork(artwork)} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && setSelectedArtwork(artwork)}>
                <div className="art" dangerouslySetInnerHTML={{ __html: artwork.svgData }} />
                <div className="art-meta">
                  <h3>{artwork.title}</h3>
                  <p><strong className="style-label">{artwork.style}</strong> · {artwork.status}</p>
                  {artwork.signatureMotif && <small className="motif-label">Signature: {artwork.signatureMotif}</small>}
                  {artwork.inspiration && <small className="inspiration-label">Inspired by: {artwork.inspiration}</small>}
                  {artwork.memeVariant && <small className="motif-label">Meme form: {artwork.memeVariant}</small>}
                  {artwork.compositionSignature && <small className="inspiration-label">Composition: {artwork.compositionSignature}</small>}
                  <small>
                    {artwork.criticScore === null ? 'Awaiting critic' : `Score: ${artwork.criticScore}`}
                    {artwork.marketValue > 0 && ` · Value: ${artwork.marketValue}`}
                  </small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside>
          <h2>How the museum decides</h2>
          <div className="role-guide">
            <article>
              <strong>The curator</strong>
              <span>Shapes the public collection</span>
              <p>Reviews submitted work against a taste threshold. Accepted pieces enter the gallery and rejected pieces remain outside the collection.</p>
              <small>{displayedCount} works currently on display</small>
            </article>
            <article>
              <strong>Collectors</strong>
              <span>Creates demand for standout work</span>
              <p>Looks for displayed pieces with strong critic scores, then selectively acquires them for private collections.</p>
              <small>{acquiredCount} works acquired</small>
            </article>
          </div>
          <h2>Agents</h2>
          <p className="section-help">Artists can be invited to bring new styles and ideas into the museum.</p>
          <ul className="agent-list">
            {world.getAgents().map((agent) => (
              <li key={agent.id} className="interactive-row" onClick={() => setSelectedAgent(agent)} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && setSelectedAgent(agent)}>
                <strong>{agent.name}{agent.role === 'artist' && agent.primaryStyle ? ` · ${agent.primaryStyle}` : ''}</strong>
                <span title="Reputation reflects recognition from critics, curators, and collectors.">{agent.role} · reputation {agent.reputation}/100</span>
                <small>{agent.currentGoal || 'Waiting for the next turn'}</small>
                <small className="agent-hint">Open profile for memory &amp; relationships →</small>
              </li>
            ))}
          </ul>
          <h2>Movements</h2>
          <ul className="movement-list">
            {world.getMovements().length === 0 && <li className="empty">Movements emerge after repeated styles gain attention.</li>}
            {world.getMovements().sort((left, right) => right.prominence - left.prominence).map((movement) => (
              <li key={movement.id}><strong>{movement.name}</strong><span>{movement.artworkCount} works · {Math.round(movement.prominence)} prominence</span></li>
            ))}
          </ul>
          <h2>Exhibitions</h2>
          <ul className="movement-list">
            {world.getExhibitions().length === 0 && <li className="empty">The curator is assembling the first exhibition.</li>}
            {world.getExhibitions().slice().reverse().slice(0, 3).map((exhibition) => (
              <li key={exhibition.id}><strong>{exhibition.title}</strong><span>{exhibition.theme}</span><small>{exhibition.artworkIds.length} works · {exhibition.artistIds.length} artists</small></li>
            ))}
          </ul>
          <h2>Recent events</h2>
          <div className="event-filters">
            <select aria-label="Filter events by agent" value={eventAgentFilter} onChange={(event) => setEventAgentFilter(event.target.value)}>
              <option value="all">All agents</option>
              {eventAgents.map((agent) => <option key={agent} value={agent}>{agent}</option>)}
            </select>
            <select aria-label="Filter events by type" value={eventTypeFilter} onChange={(event) => setEventTypeFilter(event.target.value)}>
              <option value="all">All event types</option>
              {eventTypes.map((type) => <option key={type} value={type}>{type.split('_').join(' ')}</option>)}
            </select>
          </div>
          <ol className="events">
            {events.map((event, index) => (
              <li key={`${event.turn}-${event.agent}-${index}`}><strong>T{event.turn}</strong> <span className="event-agent">{agentName(event.agent)}</span> {event.description}</li>
            ))}
            {events.length === 0 && <li className="empty">No events match these filters.</li>}
          </ol>
          <h2>Museum history</h2>
          <ol className="events history-events">
            {world.getHistoricalEvents().slice(-8).reverse().map((event, index) => (
              <li key={`${event.turn}-${event.eventType}-${index}`}><strong>T{event.turn}</strong> {event.description}</li>
            ))}
            {world.getHistoricalEvents().length === 0 && <li className="empty">The historian is waiting for a turning point.</li>}
          </ol>
        </aside>
      </div>
      <details className="admin-tools">
        <summary>Admin tools</summary>
        <div className="simulation-settings">
          <span className="run-status">{runSource === 'loaded' ? 'Resumed save' : 'Fresh run'} · seed {world.seedValue}</span>
          <label>Optional seed <input aria-label="Optional seed" value={seedDraft} inputMode="numeric" onChange={(event) => setSeedDraft(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && applySeed()} /></label>
          <span className="seed-help">Use the same seed to recreate the same collection.</span>
          <button onClick={applySeed} title="Replace the current run with a specific seed">Use this seed</button>
          <label className="speed-control">Simulation speed <input type="range" min="0.1" max="5" step="0.1" value={speed} onChange={(event) => { const nextSpeed = Number(event.target.value); setSpeed(nextSpeed); engine.setSimulationSpeed(nextSpeed); }} /> <span>{speed.toFixed(1)} turns/sec</span></label>
          <div className="controls">
            <button onClick={() => { archiveCurrentCollection(); engine.reset(); setRunSource('fresh'); }}>Reset collection</button>
            <button onClick={saveSimulation}>Save snapshot</button>
            <button onClick={exportEvents}>Export events</button>
            <button onClick={() => fileInput.current?.click()}>Load snapshot</button>
          </div>
          <input ref={fileInput} type="file" accept="application/json" hidden onChange={loadSimulation} />
        </div>
      </details>
      {selectedArchive && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedArchive(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="archive-detail-title" onClick={(event) => event.stopPropagation()}>
            <button className="close-button" onClick={() => setSelectedArchive(null)} aria-label="Close collection details">Close</button>
            <p className="eyebrow">Archived collection</p>
            <h2 id="archive-detail-title">{selectedArchive.title}</h2>
            <p>Saved at turn {selectedArchive.turn} as a record of this museum era.</p>
            <dl className="details">
              <dt>Dominant style</dt><dd>{selectedArchive.dominantStyle}</dd>
              <dt>Artists</dt><dd>{selectedArchive.artistNames.join(', ') || 'None recorded'}</dd>
              <dt>Works</dt><dd>{selectedArchive.artworkCount} total · {selectedArchive.displayedCount} displayed · {selectedArchive.acquiredCount} acquired</dd>
              <dt>Exhibitions</dt><dd>{selectedArchive.exhibitionCount}</dd>
              <dt>Seed</dt><dd>{selectedArchive.seed}</dd>
            </dl>
            <button onClick={() => { loadArchivedCollection(selectedArchive); setSelectedArchive(null); }}>Browse this collection</button>
          </section>
        </div>
      )}
      {selectedArtwork && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedArtwork(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="artwork-detail-title" onClick={(event) => event.stopPropagation()}>
            <button className="close-button" onClick={() => setSelectedArtwork(null)} aria-label="Close artwork details">Close</button>
            <div className="detail-art" dangerouslySetInnerHTML={{ __html: selectedArtwork.svgData }} />
            <h2 id="artwork-detail-title">{selectedArtwork.title}</h2>
            <p>{selectedArtwork.description}</p>
            <div className="artwork-actions">
              <button className="primary-action" onClick={() => saveArtworkSvg(selectedArtwork)}>Save SVG</button>
              <button className="secondary-action" onClick={() => saveArtwork(selectedArtwork)}>Export metadata</button>
            </div>
            <dl className="details">
              <dt>Artist</dt><dd>{selectedArtwork.artist}</dd>
              <dt>Style</dt><dd>{selectedArtwork.style}</dd>
              <dt>Signature motif</dt><dd>{selectedArtwork.signatureMotif ?? 'None recorded'}</dd>
              <dt>Inspiration</dt><dd>{selectedArtwork.inspiration ?? 'Independent work'}</dd>
              <dt>Meme form</dt><dd>{selectedArtwork.memeVariant ?? 'Not applicable'}</dd>
              <dt>Composition</dt><dd>{selectedArtwork.compositionSignature ?? 'Not recorded'}</dd>
              <dt>Status</dt><dd>{selectedArtwork.status}</dd>
              <dt>Critic score</dt><dd>{selectedArtwork.criticScore ?? 'Awaiting review'}</dd>
              <dt>Market value</dt><dd>{selectedArtwork.marketValue}</dd>
              <dt>Created</dt><dd>Turn {selectedArtwork.createdAtTurn}</dd>
            </dl>
            <h3>Artwork history</h3>
            <ol className="artwork-history">
              {selectedArtwork.history.map((entry, index) => (
                <li key={`${entry.turn}-${entry.eventType}-${index}`}><strong>T{entry.turn}</strong> {entry.description}</li>
              ))}
            </ol>
          </section>
        </div>
      )}
      {selectedAgent && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedAgent(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="agent-detail-title" onClick={(event) => event.stopPropagation()}>
            <button className="close-button" onClick={() => setSelectedAgent(null)} aria-label="Close agent details">Close</button>
            <h2 id="agent-detail-title">{selectedAgent.name}</h2>
            <p>{selectedAgent.personality}</p>
            <dl className="details">
              <dt>Role</dt><dd>{selectedAgent.role}</dd>
              <dt>Reputation</dt><dd>{selectedAgent.reputation}/100 — recognition earned from reception and market success</dd>
              <dt>Current goal</dt><dd>{selectedAgent.currentGoal || 'Waiting'}</dd>
              <dt>Last action</dt><dd>{selectedAgent.lastDecision?.action ?? 'None yet'}</dd>
            </dl>
            <h3>Relationships</h3>
            {selectedAgent.relationships.size === 0 ? <p className="empty">No relationships recorded yet.</p> : (
              <ul className="relationship-graph">
                {[...selectedAgent.relationships.entries()]
                  .sort((left, right) => right[1] - left[1])
                  .map(([id, value]) => {
                    const magnitude = Math.min(100, Math.abs(value));
                    const tone = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
                    return (
                      <li key={id} className={`relationship-row relationship-${tone}`}>
                        <span className="relationship-name">{agentName(id)}</span>
                        <span className="relationship-bar-track">
                          <span className="relationship-bar-mid" />
                          <span className="relationship-bar-fill" style={{ width: `${magnitude / 2}%`, [value >= 0 ? 'left' : 'right']: '50%' }} />
                        </span>
                        <strong className="relationship-value">{value > 0 ? `+${value}` : value}</strong>
                      </li>
                    );
                  })}
              </ul>
            )}
            <h3>Recent memory</h3>
            <ul className="memory-list">{selectedAgent.memory.observations.slice(-5).reverse().map((memory, index) => <li key={`${memory}-${index}`}>{memory}</li>)}</ul>
          </section>
        </div>
      )}
    </main>
  );
}

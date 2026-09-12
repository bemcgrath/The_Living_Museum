import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { WorldState } from './models/WorldState';
import { ART_STYLES, Artwork, ArtStyle, styleLabel } from './models/Artwork';
import { Agent } from './models/Agent';
import { SimulationEngine } from './simulation/SimulationEngine';
import { Artist } from './simulation/agents/Artist';
import { RebelArtist } from './simulation/agents/RebelArtist';
import { Critic } from './simulation/agents/Critic';
import { Curator } from './simulation/agents/Curator';
import { Collector } from './simulation/agents/Collector';
import { Historian } from './simulation/agents/Historian';
import { RandomGenerator } from './utils/RandomGenerator';

/** 'surprise' means let each artist's own personality decide — a natural mix of every style. */
export type StyleFocus = ArtStyle | 'surprise';

function createEngine(seed: number, styleFocus: StyleFocus = 'surprise'): SimulationEngine {
  const world = new WorldState();
  world.seedValue = seed;
  const engine = new SimulationEngine(world);
  const forced = styleFocus === 'surprise' ? undefined : styleFocus;
  engine.registerAgent(new Artist('artist-1', 'Ada', 'Curious and experimental', seed + 101, forced), () => new Artist('artist-1', 'Ada', 'Curious and experimental', seed + 101, forced));
  engine.registerAgent(new Artist('artist-2', 'Milo', 'Disciplined and minimal', seed + 202, forced), () => new Artist('artist-2', 'Milo', 'Disciplined and minimal', seed + 202, forced));
  engine.registerAgent(new Artist('artist-3', 'Jo', 'Bold and meme-driven', seed + 303, forced), () => new Artist('artist-3', 'Jo', 'Bold and meme-driven', seed + 303, forced));
  engine.registerAgent(new RebelArtist('rebel-1', 'Vex', 'Contrarian and unpredictable', seed + 707), () => new RebelArtist('rebel-1', 'Vex', 'Contrarian and unpredictable', seed + 707));
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
  const title = `${styleLabel(dominantStyle)} Horizons (Sample Collection)`;
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
  // Pending style choice for the *next* collection the user creates ("surprise" = natural style mix).
  const [styleFocus, setStyleFocus] = useState<StyleFocus>('surprise');
  // The style focus actually baked into the currently-loaded engine (only changes when a new run starts).
  const [appliedStyleFocus, setAppliedStyleFocus] = useState<StyleFocus>('surprise');
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [eventAgentFilter, setEventAgentFilter] = useState('all');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [collectionFilter, setCollectionFilter] = useState<'all' | 'displayed' | 'acquired'>('all');
  const [artistFilter, setArtistFilter] = useState('all');
  const [movementFilter, setMovementFilter] = useState<ArtStyle | null>(null);
  const [galleryLimit, setGalleryLimit] = useState(60);
  const [pendingArchivedSnapshot, setPendingArchivedSnapshot] = useState<string | null>(null);
  const [selectedArchive, setSelectedArchive] = useState<ArchivedCollection | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
  const galleryRef = useRef<HTMLElement>(null);
  const engine = useMemo(() => createEngine(seed, appliedStyleFocus), [seed, appliedStyleFocus]);
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
  const artistOptions = [...new Set(world.getArtworks().map((artwork) => artwork.artist))];
  const filteredArtworks = artworks.filter((artwork) =>
    (collectionFilter === 'all' || (collectionFilter === 'displayed' && artwork.status === 'displayed') ||
      (collectionFilter === 'acquired' && artwork.status === 'acquired')) &&
    (artistFilter === 'all' || artwork.artist === artistFilter) &&
    (movementFilter === null || artwork.style === movementFilter),
  );
  // Render only a page of cards at a time; long runs can accumulate hundreds of works and rendering
  // every SVG card on every simulation tick would make the UI sluggish.
  const visibleArtworks = filteredArtworks.slice(0, galleryLimit);
  const hasMoreArtworks = filteredArtworks.length > visibleArtworks.length;
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
    setAppliedStyleFocus(styleFocus);
    setRunSource('fresh');
    setGalleryLimit(60);
  }

  function generateCollection(): void {
    if (world.turn > 0 && !window.confirm('Start a brand new run? The current collection will be saved to Previous collections first.')) return;
    const nextSeed = Math.floor(Math.random() * 2147483647);
    archiveCurrentCollection();
    setSeed(nextSeed);
    setSeedDraft(String(nextSeed));
    setAppliedStyleFocus(styleFocus);
    setRunSource('fresh');
    setGalleryLimit(60);
  }

  const displayedCount = artworks.filter((artwork) => artwork.status === 'displayed').length;
  const acquiredCount = artworks.filter((artwork) => artwork.status === 'acquired').length;
  const agentName = (id: string): string => world.getAgent(id)?.name ?? id;

  function viewMovementWorks(style: ArtStyle): void {
    setMovementFilter(style);
    setCollectionFilter('all');
    setArtistFilter('all');
    setGalleryLimit(60);
    galleryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function artworksByArtist(artistId: string): Artwork[] {
    return world.getArtworks().filter((artwork) => artwork.artist === artistId).slice(-6).reverse();
  }

  function artworksAcquiredBy(collectorId: string): Artwork[] {
    return world.getArtworks().filter((artwork) => artwork.acquiredBy === collectorId).slice(-6).reverse();
  }

  function artworksTouchedByAgent(agentId: string, eventTypes: string[]): Artwork[] {
    return world.getArtworks()
      .filter((artwork) => artwork.history.some((entry) => entry.agent === agentId && eventTypes.includes(entry.eventType)))
      .slice(-6)
      .reverse();
  }

  function agentSampleWorks(agent: Agent): { label: string; works: Artwork[] } {
    if (agent.role === 'artist' || agent.role === 'rebel_artist') {
      return { label: 'Recent work', works: artworksByArtist(agent.id) };
    }
    if (agent.role === 'collector') {
      return { label: 'In their collection', works: artworksAcquiredBy(agent.id) };
    }
    if (agent.role === 'critic') {
      return { label: 'Recently reviewed', works: artworksTouchedByAgent(agent.id, ['artwork_reviewed']) };
    }
    if (agent.role === 'curator') {
      return { label: 'Recently curated', works: artworksTouchedByAgent(agent.id, ['artwork_displayed', 'artwork_rejected']) };
    }
    return { label: 'Related work', works: [] };
  }

  function describeAction(type: string | undefined): string {
    const labels: Record<string, string> = {
      submit_artwork: 'Submitted a new artwork',
      review_artwork: 'Reviewed an artwork',
      curate_artwork: 'Decided whether to display an artwork',
      acquire_artwork: 'Acquired an artwork for their collection',
      record_observation: 'Recorded a historical observation',
    };
    if (!type) return 'None yet';
    return labels[type] ?? type;
  }

  const agents = world.getAgents();
  const networkNodes = agents.map((agent, index) => {
    const angle = (index / agents.length) * Math.PI * 2 - Math.PI / 2;
    return { agent, x: 130 + Math.cos(angle) * 100, y: 130 + Math.sin(angle) * 100 };
  });
  const networkEdges: Array<{ id: string; from: typeof networkNodes[number]; to: typeof networkNodes[number]; value: number }> = [];
  for (let i = 0; i < agents.length; i += 1) {
    for (let j = i + 1; j < agents.length; j += 1) {
      const a = agents[i];
      const b = agents[j];
      const value = a.relationships.get(b.id) ?? b.relationships.get(a.id) ?? 0;
      if (value !== 0) {
        networkEdges.push({ id: `${a.id}-${b.id}`, from: networkNodes[i], to: networkNodes[j], value });
      }
    }
  }

  function persistArchive(nextArchive: ArchivedCollection[]): ArchivedCollection[] {
    // Snapshots grow with turn count; on very long runs (or many saved collections) this can exceed
    // the browser's localStorage quota. Retry with progressively fewer saved collections rather than
    // silently losing the save or crashing.
    let candidate = nextArchive;
    while (candidate.length > 0) {
      try {
        window.localStorage.setItem('living-museum-archive', JSON.stringify(candidate));
        return candidate;
      } catch {
        candidate = candidate.slice(0, -1);
      }
    }
    window.localStorage.removeItem('living-museum-archive');
    return candidate;
  }

  function archiveCurrentCollection(): 'saved' | 'trimmed' | 'failed' | 'skipped' {
    if (world.turn === 0) return 'skipped';
    const dominantStyle = world.getStats().dominantStyle ?? 'emerging';
    const title = `${styleLabel(dominantStyle)} Horizons`;
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
    const persisted = persistArchive(nextArchive);
    setArchive(persisted);
    if (!persisted.some((item) => item.id === entry.id)) return 'failed';
    if (persisted.length < nextArchive.length) return 'trimmed';
    return 'saved';
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
    const result = archiveCurrentCollection();
    const message = result === 'failed'
      ? 'This run is too large to fit in browser storage. Try exporting it instead.'
      : result === 'trimmed'
        ? 'Saved, but older collections were dropped to stay within browser storage limits.'
        : 'Collection saved to Previous collections!';
    setNotice(message);
    setTimeout(() => setNotice(null), result === 'saved' ? 3500 : 5000);
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
      { name: 'Wren', personality: 'Wistful and pastoral, in the spirit of Andrew Wyeth' },
      { name: 'Vincent', personality: 'Painterly and post-impressionist' },
      { name: 'Dorothea', personality: 'Patient and monochrome, in the spirit of Ansel Adams photography' },
    ];
    const profile = inviteRng.choice(profiles);
    const id = `invited-artist-${invitedNumber}`;
    const name = `${profile.name} ${invitedNumber}`;
    const artist = new Artist(id, name, profile.personality, world.seedValue + 1000 + invitedNumber * 37);
    engine.registerAgent(artist, () => new Artist(id, name, profile.personality, world.seedValue + 1000 + invitedNumber * 37));
    world.addEvent('museum', 'agent_invited', `${name} joined the museum as a ${styleLabel(artist.primaryStyle)} artist.`, { agentId: id, primaryStyle: artist.primaryStyle });
    setNotice(`${name} joined the museum as a ${styleLabel(artist.primaryStyle)} artist!`);
    setTimeout(() => setNotice(null), 3500);
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
            <button className="button-primary" onClick={() => engine.isSimulationRunning() ? engine.pause() : engine.start()} title={engine.isSimulationRunning() ? 'Pause the automatic simulation' : 'Start the simulation so agents create artworks turn by turn'}>
              {engine.isSimulationRunning() ? 'Pause' : 'Create collection'}
            </button>
            <button onClick={() => engine.advanceTurn()} title="Manually step forward one turn">Advance turn</button>
            <button className="button-quiet" onClick={saveCurrentCollectionToArchive} title="Archive the current museum run to Previous collections without resetting it">Save collection</button>
            <label className="filter-control style-focus-control">
              Style
              <select
                aria-label="Style for the next new collection"
                value={styleFocus}
                onChange={(event) => setStyleFocus(event.target.value as StyleFocus)}
                title="Choose a style to focus the next new collection on, or let it surprise you with a natural mix"
              >
                <option value="surprise">Surprise me (all styles)</option>
                {ART_STYLES.map((style) => (
                  <option key={style} value={style}>{styleLabel(style)}</option>
                ))}
              </select>
            </label>
            <button className="button-quiet" onClick={generateCollection} title="Archive the current collection, then start a brand new run using the chosen style">Start new run</button>
            <button className="button-quiet" onClick={inviteArtist} title="Invite a new artist with a unique personality and primary style">Invite artist</button>
          </div>
          <p className="controls-help">Create a collection to watch it evolve automatically, or use Advance turn for one step at a time. Pick a style (or Surprise me) before Start new run to steer what the next collection leans toward. Save collection archives your progress; Start new run archives it and begins again with a fresh seed.</p>
          {notice && <div className="save-notice">{notice}</div>}
        </div>
      </header>
      <section className="summary-strip">
        <div className="stats-grid">
          <div className="stat-card stat-accent"><span className="stat-label">turn</span><strong key={stats.currentTurn} className="stat-pop">{stats.currentTurn}</strong><small>unfolding history</small></div>
          <div className="stat-card"><span className="stat-label">Artworks</span><strong key={stats.totalArtworks} className="stat-pop">{stats.totalArtworks}</strong><small>{displayedCount} displayed</small></div>
          <div className="stat-card"><span className="stat-label">Dominant</span><strong className="stat-value-text">{stats.dominantStyle ? styleLabel(stats.dominantStyle) : 'Emerging'}</strong><small>museum taste</small></div>
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
                <span><strong>{entry.title}</strong><small>Turn {entry.turn} · {entry.artworkCount} works · {styleLabel(entry.dominantStyle)}</small></span>
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
        <section className="collection-section" ref={galleryRef}>
          <div className="section-heading">
            <div><p className="eyebrow">The public galleries</p><h2>Collection</h2><p className="section-help">Every work is a trace of the culture forming around it. Select a piece to inspect its provenance.</p></div>
            <div className="filter-row">
              <label className="filter-control">View <select aria-label="Filter collection" value={collectionFilter} onChange={(event) => { setCollectionFilter(event.target.value as typeof collectionFilter); setGalleryLimit(60); }}><option value="all">All works</option><option value="displayed">On display</option><option value="acquired">Acquired</option></select></label>
              <label className="filter-control">Artist <select aria-label="Filter collection by artist" value={artistFilter} onChange={(event) => { setArtistFilter(event.target.value); setGalleryLimit(60); }}><option value="all">All artists</option>{artistOptions.map((id) => <option key={id} value={id}>{agentName(id)}</option>)}</select></label>
            </div>
          </div>
          {movementFilter && (
            <div className="active-filter-chip">
              Showing <strong>{styleLabel(movementFilter)}</strong> works only
              <button className="button-quiet small-btn" onClick={() => setMovementFilter(null)}>Clear</button>
            </div>
          )}
          <div className="gallery">
            {artworks.length === 0 && <div className="empty-state"><div className="empty-mark">✦</div><strong>The first canvas is waiting to be made</strong><p>Press <b>Advance turn</b> to let the artists begin.</p></div>}
            {artworks.length > 0 && filteredArtworks.length === 0 && <p className="empty">No works match this view yet.</p>}
            {visibleArtworks.map((artwork) => (
              <article className="art-card" key={artwork.id} onClick={() => setSelectedArtwork(artwork)} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && setSelectedArtwork(artwork)}>
                <div className="art" dangerouslySetInnerHTML={{ __html: artwork.svgData }} />
                <div className="art-meta">
                  <h3>{artwork.title}</h3>
                  <p><strong className="style-label">{styleLabel(artwork.style)}</strong> · {artwork.status}</p>
                  <small className="artist-label">By {agentName(artwork.artist)}</small>
                  {artwork.status === 'acquired' && artwork.acquiredBy && <small className="acquired-label">In {agentName(artwork.acquiredBy)}'s collection</small>}
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
          {hasMoreArtworks && (
            <div className="gallery-more">
              <button className="button-quiet" onClick={() => setGalleryLimit((value) => value + 60)}>
                Show more ({filteredArtworks.length - visibleArtworks.length} remaining)
              </button>
            </div>
          )}
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
          {networkEdges.length > 0 && (
            <div className="network-graph">
              <svg viewBox="0 0 260 260" role="img" aria-label="Agent relationship network">
                {networkEdges.map((edge) => (
                  <line
                    key={edge.id}
                    x1={edge.from.x} y1={edge.from.y}
                    x2={edge.to.x} y2={edge.to.y}
                    className={edge.value >= 0 ? 'network-edge-positive' : 'network-edge-negative'}
                    strokeWidth={0.6 + (Math.abs(edge.value) / 100) * 3}
                    opacity={0.25 + (Math.abs(edge.value) / 100) * 0.6}
                  />
                ))}
                {networkNodes.map((node) => (
                  <g key={node.agent.id} className="network-node" onClick={() => setSelectedAgent(node.agent)} tabIndex={0} role="button" aria-label={`Open ${node.agent.name}'s profile`} onKeyDown={(event) => event.key === 'Enter' && setSelectedAgent(node.agent)}>
                    <circle cx={node.x} cy={node.y} r={14} className={`network-dot network-dot-${node.agent.role}`} />
                    <text x={node.x} y={node.y + 26} textAnchor="middle" className="network-label">{node.agent.name}</text>
                  </g>
                ))}
              </svg>
              <div className="network-legend">
                <span><i className="legend-swatch legend-swatch-positive" /> Positive bond</span>
                <span><i className="legend-swatch legend-swatch-negative" /> Tension</span>
              </div>
            </div>
          )}
          <ul className="agent-list agent-grid">
            {agents.map((agent) => (
              <li key={agent.id} className="interactive-row" onClick={() => setSelectedAgent(agent)} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && setSelectedAgent(agent)}>
                <strong>{agent.name}{(agent.role === 'artist' || agent.role === 'rebel_artist') && agent.primaryStyle ? ` · ${styleLabel(agent.primaryStyle)}` : ''}</strong>
                <span title="Reputation reflects recognition from critics, curators, and collectors.">{agent.role} · reputation {agent.reputation}/100</span>
                <small>{agent.currentGoal || 'Waiting for the next turn'}</small>
                <small className="agent-hint">Open profile →</small>
              </li>
            ))}
          </ul>
          <h2>Movements</h2>
          <p className="section-help">Select a movement to see the works that define it.</p>
          <ul className="movement-list movement-grid">
            {world.getMovements().length === 0 && <li className="empty">Movements emerge after repeated styles gain attention.</li>}
            {world.getMovements().sort((left, right) => right.prominence - left.prominence).map((movement) => (
              <li key={movement.id} className="interactive-row" onClick={() => viewMovementWorks(movement.style)} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && viewMovementWorks(movement.style)}>
                <strong>{movement.name}</strong>
                <span>{movement.artworkCount} works · {Math.round(movement.prominence)} prominence</span>
                <small className="agent-hint">View works →</small>
              </li>
            ))}
          </ul>
          <h2>Exhibitions</h2>
          <ul className="movement-list movement-grid">
            {world.getExhibitions().length === 0 && <li className="empty">The curator is assembling the first exhibition.</li>}
            {world.getExhibitions().slice().reverse().slice(0, 3).map((exhibition) => (
              <li key={exhibition.id} className="interactive-row" onClick={() => viewMovementWorks(exhibition.style)} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && viewMovementWorks(exhibition.style)}>
                <strong>{exhibition.title}</strong><span>{exhibition.theme}</span><small>{exhibition.artworkIds.length} works · {exhibition.artistIds.length} artists</small>
              </li>
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
              <dt>Dominant style</dt><dd>{styleLabel(selectedArchive.dominantStyle)}</dd>
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
              <dt>Artist</dt><dd>{agentName(selectedArtwork.artist)}</dd>
              <dt>Style</dt><dd>{styleLabel(selectedArtwork.style)}</dd>
              <dt>Signature motif</dt><dd>{selectedArtwork.signatureMotif ?? 'None recorded'}</dd>
              <dt>Inspiration</dt><dd>{selectedArtwork.inspiration ?? 'Independent work'}</dd>
              <dt>Meme form</dt><dd>{selectedArtwork.memeVariant ?? 'Not applicable'}</dd>
              <dt>Composition</dt><dd>{selectedArtwork.compositionSignature ?? 'Not recorded'}</dd>
              <dt>Status</dt><dd>{selectedArtwork.status}{selectedArtwork.status === 'acquired' && selectedArtwork.acquiredBy ? ` — in ${agentName(selectedArtwork.acquiredBy)}'s collection` : ''}</dd>
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
              <dt>Last action</dt><dd>{describeAction(selectedAgent.lastDecision?.action)}</dd>
            </dl>
            {(() => {
              const sample = agentSampleWorks(selectedAgent);
              if (sample.works.length === 0) return null;
              return (
                <>
                  <h3>{sample.label}</h3>
                  <div className="agent-sample-gallery">
                    {sample.works.map((artwork) => (
                      <button
                        key={artwork.id}
                        className="agent-sample-card"
                        onClick={() => { setSelectedAgent(null); setSelectedArtwork(artwork); }}
                        title={`${artwork.title} · ${artwork.status}`}
                      >
                        <span className="agent-sample-art" dangerouslySetInnerHTML={{ __html: artwork.svgData }} />
                        <small>{artwork.title}</small>
                      </button>
                    ))}
                  </div>
                </>
              );
            })()}
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

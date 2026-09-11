# The Living Museum - System Design Document

## Overview
The Living Museum is a multi-agent simulation of an evolving art world. Autonomous agents with distinct roles interact, create, critique, and collect artwork. The simulation generates procedural art, tracks artistic movements, and creates emergent narratives about how cultural taste evolves.

---

## Core Concept

### What Is It?
A living, breathing artistic ecosystem where:
- **Artists** create new artwork submissions
- **Curators** decide what gets displayed in the museum
- **Critics** evaluate and score artwork
- **Collectors** acquire valuable pieces
- **Rebel Artists** challenge the status quo
- **Historians** document and preserve cultural moments

### Why It Matters
Traditional art history is written by humans after the fact. The Living Museum explores how artistic movements emerge *in real-time* through agent interactions, competitive dynamics, and shifting cultural preferences. Each simulation run is a unique alternate history of art.

---

## Primary Goal

**Create an interactive, reproducible simulation where emerging artistic movements and agent relationships drive emergent narrative and gameplay.**

### Success Criteria
1. ✅ Agents take autonomous actions based on observed world state
2. ✅ Artistic movements emerge organically from agent preferences
3. ✅ Procedural SVG art is generated uniquely per artwork
4. ✅ User can observe, pause, and interact with the simulation
5. ✅ Simulation is seeded for reproducibility
6. ✅ Rich UI displays artworks, agent relationships, and historical data

---

## Agent Model

### Agent Types & Roles

#### 1. **Artist** (Creator)
- **Goal**: Create artwork that gets displayed and praised
- **Actions**: 
  - Submit new artwork in chosen style
  - React to criticism (improve or rebel)
  - Form relationships with curators/critics
- **Resources**: Creativity, Reputation, Relationships
- **Motivation**: Recognition, collector value

#### 2. **Curator** (Gatekeeper)
- **Goal**: Build a cohesive, valuable collection
- **Actions**:
  - Accept/reject artist submissions
  - Promote emerging styles
  - Negotiate with collectors
- **Resources**: Taste, Gallery Space, Budget
- **Motivation**: Museum prestige, critic approval

#### 3. **Critic** (Evaluator)
- **Goal**: Identify quality and influence taste
- **Actions**:
  - Score displayed artwork (0-100)
  - Champion or condemn styles
  - Write reviews (recorded as events)
- **Resources**: Influence, Credibility
- **Motivation**: Correct predictions, critical acclaim

#### 4. **Collector** (Investor)
- **Goal**: Acquire valuable artwork for profit/passion
- **Actions**:
  - Purchase displayed artwork
  - Bid against other collectors
  - Influence curator decisions
- **Resources**: Wealth, Taste
- **Motivation**: Investment returns, legacy building

#### 5. **Rebel Artist** (Disruptor)
- **Goal**: Challenge dominant style and shake up the establishment
- **Actions**:
  - Create anti-establishment artwork
  - Critique mainstream movements
  - Form coalitions with other artists
- **Resources**: Conviction, Underground support
- **Motivation**: Movement creation, counter-culture influence

#### 6. **Historian** (Observer)
- **Goal**: Document and preserve the narrative
- **Actions**:
  - Observe all events
  - Identify turning points
  - Archive important artworks and moments
- **Resources**: Knowledge, Archive access
- **Motivation**: Accuracy, historical significance

### Agent Decision Loop (Per Turn)

```
1. OBSERVE
   - Scan world state (recent artworks, movements, scores)
   - Note relationship changes
   - Identify opportunities/threats

2. THINK
   - Evaluate goals vs. current state
   - Assess reputation/resources
   - Consider agent relationships
   - Form strategy

3. ACT
   - Execute primary action (submit, evaluate, acquire, etc.)
   - Update memory of success/failure
   - Modify relationships

4. MEMORY UPDATE
   - Store observation
   - Record action outcome
   - Learn patterns (what works, what fails)
```

### Agent Attributes

```typescript
interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  personality: string;           // Unique perspective/bias
  reputation: number;            // 0-100 social status
  currentGoal: string;           // What they're pursuing this turn
  memory: {
    observations: string[];      // Recent world events
    pastActions: string[];       // Actions taken
    successfulPatterns: string[];// What worked before
    failurePatterns: string[];   // What failed
  };
  relationships: Map<AgentId, number>; // -100 to +100 trust/affinity
}
```

---

## Art Model

### Artwork Attributes

```typescript
interface Artwork {
  id: string;
  title: string;
  artist: string;
  style: ArtStyle;              // geometric | surreal | minimal | organic | chaotic | digital | expressionist | abstract
  description: string;
  createdAtTurn: number;
  criticScore: number | null;   // Assigned by critics (0-100)
  collectorValue: number | null;// Market value
  status: ArtworkStatus;        // submitted | displayed | rejected | acquired
  svgData: string;              // Procedural SVG representation
  seed: number;                 // For reproducible generation
}
```

### Art Styles

Each style has a visual signature and cultural meaning:
- **Geometric**: Order, precision, modernity
- **Surreal**: Dreams, subconscious, imagination
- **Minimal**: Simplicity, zen, restraint
- **Organic**: Nature, growth, flow
- **Chaotic**: Energy, rebellion, complexity
- **Digital**: Technology, future, artificial
- **Expressionist**: Emotion, intensity, raw feeling
- **Abstract**: Pure form, universality, conceptual

---

## Movement Model

### What Is a Movement?

An artistic movement emerges when:
1. Multiple artworks share the same style
2. Agents express preference for that style
3. Critics award high scores to that style
4. Collectors begin acquiring pieces in that style

```typescript
interface Movement {
  id: string;
  name: string;                 // Auto-generated (e.g., "Neo-Geometrism")
  style: ArtStyle;
  description: string;
  createdAtTurn: number;
  prominence: number;           // 0-100, increases with artworks/scores
  artworkCount: number;
  averageScore: number;
  influentialArtists: string[];
}
```

### Movement Lifecycle

```
EMERGING (prominence 0-30)
  ↓ [some agents show interest]
RISING (prominence 30-60)
  ↓ [critics praise, collectors buy]
DOMINANT (prominence 60-100)
  ↓ [countermovement forms]
DECLINING (prominence < 30)
  ↓
HISTORICAL [archived]
```

---

## World State

### Central State Container

```typescript
class WorldState {
  artworks: Map<id, Artwork>;
  agents: Map<id, Agent>;
  movements: Map<id, Movement>;
  events: WorldEvent[];
  turn: number;
  seedValue: number;
}
```

### World Events

Every significant action is recorded as an event:
- Artist submits work
- Curator accepts/rejects
- Critic scores artwork
- Collector acquires piece
- Movement declared
- Agent relationship changes

---

## Simulation Engine

### Core Loop (Per Turn)

```
while isRunning:
  turn++
  
  for each agent:
    agent.observe(worldState)
    agent.think()
    action = agent.act(worldState)
    
  processActions(allActions)
  updateWorldState()
  updateMovements()
  recordEvents()
  render()
  
  sleep(1 / simulationSpeed)
```

### Key Design Principles

1. **Autonomy**: Agents decide their own actions based on goal + memory
2. **Emergence**: No predetermined narrative; movements arise from interactions
3. **Reproducibility**: Seeded random number generation ensures replay ability
4. **Complexity**: Rich feedback loops between agents, art, and culture
5. **Observability**: UI tracks everything: artworks, scores, relationships, events

---

## Data Models Summary

### Folder Structure
```
src/
├── models/
│   ├── Artwork.ts          # Art pieces
│   ├── Agent.ts            # Agent base + interfaces
│   ├── Movement.ts         # Artistic movements
│   └── WorldState.ts       # Central state
├── simulation/
│   ├── SimulationEngine.ts # Main orchestrator
│   └── agents/             # Concrete agent implementations
├── utils/
│   ├── RandomGenerator.ts  # Seeded RNG
│   ├── ArtGenerator.ts     # SVG generation
│   └── ...
├── components/
│   ├── ArtworkDisplay.tsx  # Render artwork
│   ├── AgentPanel.tsx      # Agent status
│   ├── Timeline.tsx        # Event history
│   └── ...
└── App.tsx
```

---

## Phase Roadmap

### PHASE 1: Core Architecture
- ✅ Data models (Artwork, Agent, Movement, WorldState)
- ✅ SimulationEngine orchestration
- ✅ RandomGenerator (seeded RNG)
- ✅ ArtGenerator (procedural SVG)
- ✅ Vite + TypeScript build setup
- ✅ Package.json configuration

### PHASE 2: Agent Implementations
- ✅ Concrete agent classes (Artist, Curator, Critic, Collector, Historian)
- ✅ Agent decision logic for each role
- ✅ Relationship scoring system
- ✅ Memory/learning mechanisms

### PHASE 3: Simulation Logic
- ✅ Action processing system
- ✅ Scoring algorithms
- ✅ Movement emergence detection
- ✅ Event generation

### PHASE 4: UI/Visualization (Current)
- ✅ React components for all views
- ✅ Real-time simulation display
- ✅ Artwork gallery (with filtering and detail modal)
- ✅ Agent relationship graph (SVG network view of agent bonds/tensions, alongside the detailed per-agent list)
- ✅ Timeline/event log
- ✅ Statistics dashboard

### PHASE 5: Interactivity
- ✅ Play/pause/reset controls
- ✅ Speed adjustment
- ✅ Seed input for reproducibility
- ✅ Agent interaction (invite artist)
- ✅ Save/load simulation state

### PHASE 6: Polish & Extension
- ✅ Testing suite
- ✅ Animation/transitions
- [ ] Performance optimization (for very long-running simulations)
- ✅ Export simulation history
- ✅ Narrative generation (historian summary)

---

## Key Technical Decisions

1. **Seeded RNG**: All randomness is deterministic per seed, enabling perfect replay
2. **SVG Art**: Procedurally generated art fits the theme and is lightweight
3. **Turn-based**: Easier to debug and visualize than continuous time
4. **React + TypeScript**: Type safety for complex state
5. **Vite**: Fast build tool for modern development
6. **No Backend**: Entire simulation runs in browser

---

## Success Metrics

- [ ] Agents autonomously create diverse artwork
- [ ] Movements emerge and decline naturally
- [ ] Same seed produces identical simulation
- [ ] UI shows rich interaction patterns
- [ ] Simulation runs 100+ turns without bugs
- [ ] Compelling narratives emerge (even if unplanned)

---

## Open Questions & Future Exploration

1. **Market Economics**: Should artworks have financial markets? Trading between collectors?
2. **Generational Turnover**: Should agents retire/die? New agents join?
3. **External Events**: Should random events (wars, trends) affect the simulation?
4. **Cooperation**: Should agents form alliances or guilds?
5. **Meta-Awareness**: Can agents predict other agents' behavior?
6. **Narrative Generation**: Can we auto-generate story descriptions of the simulation?
7. **Multiplayer**: Could this be a game where humans influence agent behavior?

---

## References

- **Inspiration**: "Life" cellular automata, emergent behavior in complex systems
- **Agent Framework**: Belief-Desire-Intention (BDI) model adapted
- **Art Generation**: Procedural content generation techniques
- **Simulation**: Turn-based discrete event simulation pattern

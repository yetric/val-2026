// Shapes reflect the Valmyndigheten result JSON as served by /api/results,
// /api/history and /api/regions (see server.js / history.js). Left loose
// (optional, no exhaustive literal unions) since the source is an external
// API we don't control.

export interface Party {
  partibeteckning: string;
  partikod?: string;
  partiforkortning?: string;
  fargkod?: string;
  ordningsnummer?: number;
  antalRoster: number;
  antalRosterForegaendeVal?: number;
  forandringAntalRoster?: number;
  andelRoster: number | null;
  andelRosterForegaendeVal?: number | null;
  forandringAndelRoster?: number | null;
  deltaMandatfordelning?: number;
}

export interface VoteGroup {
  antalRoster: number;
  antalRosterForegaendeVal?: number;
  forandringAntalRoster?: number;
  andelRosterAvTotaltAntalRoster?: number | null;
  andelRosterAvTotaltAntalRosterForegaendeVal?: number | null;
  partiroster?: Party[];
  blankaRoster?: { antalRoster: number };
  rosterEjAnmaltDeltagande?: { antalRoster: number };
  ovrigaOgiltiga?: { antalRoster: number };
}

export interface ElectionData {
  namn?: string;
  antalValdistriktRaknade: number;
  antalValdistriktSomSkaRaknas: number;
  senasteUppdateringstid?: string;
  totaltAntalRoster?: number | string;
  antalRostberattigade?: number | string;
  antalRostberattigadeIRaknadeValdistrikt?: number | string;
  valdeltagande?: number | string | null;
  valdeltagandeForegaendeVal?: string;
  meddelandetext?: string;
  meddelandetextValomrade?: string;
  rosterPaverkaMandat: VoteGroup;
  rosterEjPaverkaMandat?: VoteGroup;
  partiMandat?: unknown;
  mandatfordelning?: unknown;
  valkretsar?: ElectionData[];
  jamforbar?: boolean;
  test?: boolean;
}

export interface Comparison {
  share: number | null;
  delta: number | null;
}

export interface AreaMetrics {
  districts: number | null;
  total: number | null;
  votes: number | null;
  eligible: number | null;
  turnout: number | null;
}

export interface Block {
  key: string;
  label: string;
  parties: string[];
}

export interface BlockResult extends Block {
  members: (Party | undefined)[];
  votes: number | null;
  share: number | null;
  previous: number | null;
  delta: number | null;
}

export interface HistoryEntry {
  id: string;
  capturedAt: number;
  districts: number;
  total: number;
  sourceUpdatedAt?: string;
  regions?: string[];
}

export interface Snapshot {
  data: ElectionData;
}

export interface ResultsResponse {
  data: ElectionData;
  fetchedAt: number;
  stale: boolean;
  archiveError?: boolean;
}

// A single point on the /api/trends curve (one per saved snapshot).
export interface TrendPoint {
  id: string;
  districts: number;
  total: number;
  countedVotes?: number;
  blockGap?: number;
  shares: Record<string, number> | null;
  exactShares?: Record<string, number>;
}

export interface RecentChanges {
  districts: number;
  votes: number | null;
  gap: number | null;
  parties: { key: string; delta: number }[];
}

export type MilestoneEvent =
  | { id: string; snapshotId: string; point: TrendPoint; type: 'start' }
  | { id: string; snapshotId: string; point: TrendPoint; type: 'district'; threshold: number }
  | { id: string; snapshotId: string; point: TrendPoint; type: 'threshold'; key: string; above: boolean }
  | { id: string; snapshotId: string; point: TrendPoint; type: 'lead'; leader: 'Vänster' | 'Höger' };

/** Lightweight frontend boundary types; tested game modules remain JavaScript. */
export interface RosterDeck {
  id: string;
  name: string;
}

export interface RosterPlayer {
  id: string;
  name: string;
  decks: RosterDeck[];
}

export interface TrackerPlayer {
  id: string;
  userId: string;
  deckId: string;
  name: string;
  commander: string;
  life: number;
  tax: number;
  poison: number;
  mulligans: number;
  isDead: boolean;
  commanderDamage: Record<string, number>;
  color: string;
  textColor: string;
  bgColor: string;
  btnClass: string;
}

export type SaveState = { status: "idle" | "saving" | "error"; error: string | null };

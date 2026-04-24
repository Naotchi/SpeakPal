export type SrsSource = "translate" | "correction";
export type SrsGrade = "forgot" | "vague" | "remembered";

export interface SrsItem {
  id: string;
  prompt: string;
  answer: string;
  source: SrsSource;
  createdAt: number;
  nextReviewAt: number;
  box: number;
  reviewCount: number;
  lastGrade: SrsGrade | null;
  lastReviewedAt: number | null;
}

const STORAGE_KEY = "speakpal.srsItems";
const MAX_BOX = 5;

const BOX_INTERVAL_MS: Record<number, number> = {
  1: 10 * 60 * 1000,
  2: 24 * 60 * 60 * 1000,
  3: 3 * 24 * 60 * 60 * 1000,
  4: 7 * 24 * 60 * 60 * 1000,
  5: 14 * 24 * 60 * 60 * 1000,
};

function intervalMs(box: number): number {
  return BOX_INTERVAL_MS[Math.min(Math.max(box, 1), MAX_BOX)] ?? BOX_INTERVAL_MS[1];
}

function normalizeKey(prompt: string, answer: string): string {
  const norm = (s: string) => s.normalize("NFKC").trim().toLowerCase();
  return `${norm(prompt)}\u0000${norm(answer)}`;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `srs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function loadItems(): SrsItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is SrsItem =>
        typeof x === "object" &&
        x !== null &&
        typeof x.id === "string" &&
        typeof x.prompt === "string" &&
        typeof x.answer === "string",
    );
  } catch {
    return [];
  }
}

export function saveItems(items: SrsItem[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

export function addItem(input: {
  prompt: string;
  answer: string;
  source: SrsSource;
}): { item: SrsItem; duplicated: boolean } {
  const prompt = input.prompt.trim();
  const answer = input.answer.trim();
  if (!prompt && !answer) {
    const empty: SrsItem = {
      id: generateId(),
      prompt: "",
      answer: "",
      source: input.source,
      createdAt: 0,
      nextReviewAt: 0,
      box: 1,
      reviewCount: 0,
      lastGrade: null,
      lastReviewedAt: null,
    };
    return { item: empty, duplicated: true };
  }

  const items = loadItems();
  const key = normalizeKey(prompt, answer);
  const existing = items.find((it) => normalizeKey(it.prompt, it.answer) === key);
  if (existing) return { item: existing, duplicated: true };

  const now = Date.now();
  const item: SrsItem = {
    id: generateId(),
    prompt,
    answer,
    source: input.source,
    createdAt: now,
    nextReviewAt: now,
    box: 1,
    reviewCount: 0,
    lastGrade: null,
    lastReviewedAt: null,
  };
  saveItems([...items, item]);
  return { item, duplicated: false };
}

export function deleteItem(id: string): void {
  const items = loadItems();
  saveItems(items.filter((it) => it.id !== id));
}

export function updateItem(id: string, patch: Partial<SrsItem>): void {
  const items = loadItems();
  const next = items.map((it) => (it.id === id ? { ...it, ...patch } : it));
  saveItems(next);
}

export function getDueItems(now: number = Date.now()): SrsItem[] {
  return loadItems().filter((it) => it.nextReviewAt <= now);
}

export function getDueCount(now: number = Date.now()): number {
  return getDueItems(now).length;
}

export function applyGrade(
  item: SrsItem,
  grade: SrsGrade,
  now: number = Date.now(),
): SrsItem {
  let nextBox = item.box;
  if (grade === "forgot") nextBox = 1;
  else if (grade === "remembered") nextBox = Math.min(item.box + 1, MAX_BOX);

  return {
    ...item,
    box: nextBox,
    nextReviewAt: now + intervalMs(nextBox),
    reviewCount: item.reviewCount + 1,
    lastGrade: grade,
    lastReviewedAt: now,
  };
}

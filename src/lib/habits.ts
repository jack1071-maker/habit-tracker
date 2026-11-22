import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------- Types ----------

export type Habit = {
  id: string;
  name: string;
  emoji: string;
  /** 1 = a simple daily check. More than 1 = a counted habit, e.g. 8 glasses of water. */
  target: number;
  /** Day the habit was added, as a YYYY-MM-DD key. */
  createdOn: string;
};

/** dayKey -> habitId -> how many times it was done that day */
export type Log = Record<string, Record<string, number>>;

export type AppState = {
  onboarded: boolean;
  habits: Habit[];
  log: Log;
  /** First day of the 3-day kickstart challenge, or null if not started. */
  challengeStart: string | null;
  /** The streak the Your Tree page last showed, so it knows when to grow or chop. */
  tree: { seenStreak: number; seenOn: string };
};

export const EMPTY_STATE: AppState = {
  onboarded: false,
  habits: [],
  log: {},
  challengeStart: null,
  tree: { seenStreak: 0, seenOn: '' },
};

export const CHALLENGE_DAYS = 3;

// ---------- Starter habits shown during onboarding ----------

export const PRESETS: Omit<Habit, 'id' | 'createdOn'>[] = [
  { name: 'Drink water', emoji: '💧', target: 8 },
  { name: 'Exercise', emoji: '🏃', target: 1 },
  { name: 'Read', emoji: '📖', target: 1 },
  { name: 'Meditate', emoji: '🧘', target: 1 },
  { name: 'Walk', emoji: '🚶', target: 1 },
  { name: 'Journal', emoji: '✍️', target: 1 },
  { name: 'Healthy meal', emoji: '🥗', target: 3 },
  { name: 'Sleep by 11pm', emoji: '😴', target: 1 },
];

export const EMOJI_CHOICES = ['💧', '🏃', '📖', '🧘', '🚶', '✍️', '🥗', '😴', '💪', '🎸', '🧹', '☕', '💊', '🌱', '📵', '🙏'];

// ---------- Dates ----------

/** Local-time YYYY-MM-DD for a date. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const date = keyToDate(key);
  date.setDate(date.getDate() + days);
  return dayKey(date);
}

/** The last `n` day keys, oldest first, ending today. */
export function lastNDays(n: number, today = dayKey()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
}

// ---------- Progress maths ----------

export function countFor(log: Log, day: string, habitId: string): number {
  return log[day]?.[habitId] ?? 0;
}

export function isHabitDone(log: Log, day: string, habit: Habit): boolean {
  return countFor(log, day, habit.id) >= habit.target;
}

/** True when every habit that existed on that day was completed. */
export function isDayComplete(state: AppState, day: string): boolean {
  const active = state.habits.filter((h) => h.createdOn <= day);
  return active.length > 0 && active.every((h) => isHabitDone(state.log, day, h));
}

/** Days in a row the habit was completed, ending today (or yesterday if today isn't done yet). */
export function currentStreak(log: Log, habit: Habit, today = dayKey()): number {
  let day = isHabitDone(log, today, habit) ? today : addDays(today, -1);
  let streak = 0;
  while (isHabitDone(log, day, habit)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

export function bestStreak(log: Log, habit: Habit, today = dayKey()): number {
  let best = 0;
  let run = 0;
  for (let day = habit.createdOn; day <= today; day = addDays(day, 1)) {
    run = isHabitDone(log, day, habit) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/**
 * Share of the last 7 days the habit was completed, as 0-100.
 * Only counts days since the habit was created, so a new habit isn't punished.
 */
export function weekConsistency(log: Log, habit: Habit, today = dayKey()): number {
  const days = lastNDays(7, today).filter((d) => d >= habit.createdOn);
  if (days.length === 0) return 0;
  const done = days.filter((d) => isHabitDone(log, d, habit)).length;
  return Math.round((done / days.length) * 100);
}

/**
 * How consistently a habit was done over the last `windowDays` days.
 * Only counts days since the habit was created, so a new habit isn't punished.
 */
export function consistency(
  log: Log,
  habit: Habit,
  windowDays = 30,
  today = dayKey(),
): { percent: number; doneDays: number; totalDays: number } {
  const days = lastNDays(windowDays, today).filter((d) => d >= habit.createdOn);
  const doneDays = days.filter((d) => isHabitDone(log, d, habit)).length;
  const totalDays = days.length;
  const percent = totalDays === 0 ? 0 : Math.round((doneDays / totalDays) * 100);
  return { percent, doneDays, totalDays };
}

// ---------- Your Tree ----------

/**
 * Days in a row where EVERY habit was finished.
 * Counts today if it's complete; otherwise counts up to yesterday, so the streak
 * isn't lost until a whole day is missed.
 */
export function overallStreak(state: AppState, today = dayKey()): number {
  let day = isDayComplete(state, today) ? today : addDays(today, -1);
  let streak = 0;
  while (isDayComplete(state, day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

/** Tree growth stages. A stage is reached once the streak hits `min` days. */
export const TREE_STAGES = [
  { min: 0, name: 'Seed' },
  { min: 1, name: 'Sprout' },
  { min: 2, name: 'Seedling' },
  { min: 3, name: 'Sapling' },
  { min: 5, name: 'Young tree' },
  { min: 7, name: 'Tree' },
  { min: 14, name: 'Big tree' },
  { min: 30, name: 'Mighty oak' },
];

export function stageFor(streak: number): number {
  let stage = 0;
  TREE_STAGES.forEach((s, i) => {
    if (streak >= s.min) stage = i;
  });
  return stage;
}

// ---------- 3-day kickstart challenge ----------

export type ChallengeStatus =
  | { kind: 'none' }
  | { kind: 'active'; dayNumber: number; done: boolean[] }
  | { kind: 'won' }
  | { kind: 'missed' };

export function challengeStatus(state: AppState, today = dayKey()): ChallengeStatus {
  if (!state.challengeStart) return { kind: 'none' };
  const days = Array.from({ length: CHALLENGE_DAYS }, (_, i) => addDays(state.challengeStart!, i));
  const done = days.map((d) => isDayComplete(state, d));
  if (done.every(Boolean)) return { kind: 'won' };
  // A day before today that wasn't finished means the challenge was missed.
  if (days.some((d, i) => d < today && !done[i])) return { kind: 'missed' };
  const dayNumber = days.indexOf(today) + 1;
  return { kind: 'active', dayNumber: Math.max(dayNumber, 1), done };
}

// ---------- Saving and loading ----------

const STORAGE_KEY = 'habit-tracker-state-v1';

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    // Merging with EMPTY_STATE fills in fields added in newer versions (like `tree`).
    return raw ? { ...EMPTY_STATE, ...JSON.parse(raw) } : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

export async function saveState(state: AppState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Saving failed (e.g. storage full). The app keeps working for this session.
  }
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

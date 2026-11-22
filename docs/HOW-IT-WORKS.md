# How Habit Tracker works

A plain-English tour of the code, so you can explain (and fix) any part of it.

---

## 1. The big picture

```
   Your phone / browser                          Supabase (cloud)
 ┌─────────────────────────────┐             ┌──────────────────────┐
 │  Screens (what you see)     │             │  auth.users          │
 │      ▲            │         │   sign in   │  (emails + hashed    │
 │      │ state      │ taps    │ ──────────▶ │   passwords)         │
 │  App state (one object)     │             │                      │
 │      │            ▲         │   upload    │  user_state          │
 │      ▼            │         │ ──────────▶ │  (one row per user:  │
 │  Device storage (AsyncStorage)  ◀──────── │   all their habits)  │
 └─────────────────────────────┘   download  └──────────────────────┘
```

- Everything the app knows lives in **one object** called the *app state* (`AppState` in `src/lib/habits.ts`): your habits, every check-in, your challenge, and what your tree last looked like.
- Every change is saved **on the device first**, so the app is instant and works offline.
- If you're signed in, the same object is also **uploaded to Supabase** a moment later, so it's backed up and other devices can download it.

This is called **local-first**: the device is the main copy, the cloud is the backup and sync.

---

## 2. The files, and what each one does

| File | Job |
|---|---|
| `src/app/_layout.tsx` | Runs first. Loads the Anton font and sets up the app. |
| `src/app/index.tsx` | **The brain.** Holds the app state, decides which screen to show, handles taps, and runs the syncing. |
| `src/app/privacy.tsx` | The privacy policy page (`/privacy` on the web). |
| `src/lib/habits.ts` | The data model and all the maths: streaks, consistency %, the 3-day challenge, tree stages, saving to the device. No screens, just logic. |
| `src/lib/supabase.ts` | Connects to Supabase using the two public keys from `.env`. |
| `src/lib/cloud.ts` | Uploads and downloads one user's habits; turns Supabase errors into friendly messages. |
| `src/lib/use-account.ts` | Keeps track of who's signed in (and spots password-reset links). |
| `src/lib/ui.ts` | Colors, the headline font name, and the vibration helpers. |
| `src/components/screens/*.tsx` | One file per screen: sign in, onboarding, Today, Your Tree, History, Manage. |
| `src/components/tree-art.tsx` | The tree, stump, lumberjack and axe, drawn with SVG shapes. |
| `src/components/celebration.tsx` | The emoji confetti. |
| `supabase/schema.sql` | The database table, its security rules, and the delete-account function. |
| `scripts/add-web-tags.js` | After building the website, adds the tags that make "Add to Home Screen" work. |

---

## 3. What happens when you tap a habit

1. `HabitRow` in `today.tsx` gets the tap, makes the row bounce, and calls `onTap`.
2. `onTap` in `index.tsx` works out the new count (e.g. water 4 → 5) and builds a **new** app state.
3. `update()` compares old and new: if this tap finished the day or won the challenge, it buzzes the phone and shows confetti.
4. React redraws every screen from the new state.
5. A `useEffect` saves the new state to the device.
6. Another `useEffect` waits **1.5 seconds** (so ten quick taps become one upload) and then calls `pushCloud()` to upload it.

Press-and-hold does the same thing but subtracts one.

---

## 4. Streaks and the tree

All in `src/lib/habits.ts`:

- `isDayComplete(day)`: did you finish **every** habit that day?
- `overallStreak()`: counts complete days backwards from today. If today isn't done **yet**, it starts from yesterday, so you don't lose your streak until a whole day is missed.
- `stageFor(streak)`: turns the streak into one of 8 tree stages (seed → mighty oak at 30 days).

`tree.tsx` remembers which streak it **last showed** (`state.tree.seenStreak`). When you open the page:

- streak went **up** → play the grow animation;
- streak dropped to **0** on a later day → bring in the lumberjack;
- otherwise → just show the tree.

---

## 5. Accounts and syncing

**Signing up / in** (`auth.tsx`): calls Supabase (`signUp` / `signInWithPassword`). Supabase stores the email and a *hashed* password. Not even you can see the real password.

**After signing in** (the first `useEffect` in `index.tsx`):
- If the account already has habits online → download them and replace what's on the device.
- If it's a brand-new account → upload whatever is on the device (so guest habits aren't lost).

**While signed in**: changes upload 1.5 s after you make them. When the app comes back to the screen, it checks whether the online copy is newer (another device changed it) and downloads it if so.

**Signing out**: uploads anything not yet saved, then clears the device so the next person starts fresh.

**Known limitation:** the whole app state is one row that gets overwritten. If you use two devices **at the same time while offline**, the last one to upload wins.

---

## 6. Security: why people can't see each other's habits

The publishable key inside the app is **public on purpose**. Anyone can find it. Security comes from **Row Level Security (RLS)** rules in `supabase/schema.sql`:

```sql
using ((select auth.uid()) = user_id)
```

In English: *"only let someone touch a row if the row's `user_id` is their own ID."* Supabase checks this on **every** request, on the server, where nobody can tamper with it. Signed-out visitors get no access at all.

**Delete my account** calls a database function, `delete_my_account()`, that deletes **only the account of whoever calls it**. Deleting the account also deletes their habits automatically (`on delete cascade`).

---

## 7. Forgot password

1. The user enters their email → Supabase emails a reset link pointing at the live web app.
2. Opening the link signs them in temporarily and fires a `PASSWORD_RECOVERY` event.
3. `use-account.ts` notices it, and `index.tsx` shows the **Choose a new password** screen.
4. Saving calls `supabase.auth.updateUser({ password })`.

(Supabase's free email service only sends a few emails per hour.)

---

## 8. Where the app runs

| | Built with | Lives on |
|---|---|---|
| Phone (Expo Go) | `eas update` | Expo's servers (only opens for the owner's Expo account) |
| Website | `npm run deploy:web` | Expo Hosting: jack1071-habit-tracker.expo.app |
| Code | `git push` | GitHub |
| Accounts & data | — | Supabase |

---

## 9. Questions to practice answering

- *Why is the app instant even on a slow connection?* It's local-first: it reads and writes the device, then syncs in the background.
- *Isn't the key in the app a security risk?* No. It's a public key; Row Level Security on the server decides who sees what.
- *What happens if two devices change things offline?* The last upload wins; that's the trade-off of storing everything as one row.
- *How does the streak avoid resetting at midnight?* It counts from yesterday until today's habits are done.
- *How would you scale this?* Split habits and check-ins into their own tables so devices can merge changes instead of overwriting.

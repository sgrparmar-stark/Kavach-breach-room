# Kavach Breach Room 2.0

A live, facilitator-run cyber escape game. Teams of 4 or 5 join on a phone by scanning a QR code or typing a room code. They work through 4 locks, a decision and the occasional surprise you send them, while you run everything from a host dashboard.

**Built with:** Next.js (App Router) · React · TypeScript · Firebase Realtime Database and Authentication (modular SDK) · react-qr-code · lucide-react · canvas-confetti · Web Audio sound effects. It deploys to Vercel.

## What's in it

| For teams (phones, `/play`) | For you (laptop, `/host`) |
|---|---|
| Join by QR code or 4-digit room code | Open, pause or end each game; Standard or Expert mode |
| 4 locks, a decision, and a detour after a poor decision | Launch teams with a code, or launch everyone at once |
| **Lifelines:** **Ask IT** (a SOC hint in a chat-style message, plus the team's clock frozen for 45 seconds) and **50:50** (removes or reveals half the options). Each can be used once per game | Per team: pause, adjust time, free hint, message, surprise event, move them anywhere in the game tree, end, remove |
| "Security breach" and "Access granted" animations, streaks, sound effects with a mute button, confetti at the end | Big-screen views: **Lobby** (QR code, room code, teams joining), **Live race**, **Answer reveal**, **Leaderboard** |
| Insider round: one teammate secretly works against the team, and the team votes at the end | Activity log of everything, plus CSV downloads of the results and the log |

The 8 games:
1. The Friday Leak
2. The Urgent Transfer
3. Ransomware Monday
4. The Last Day
5. The Open Bucket
6. The Visitor
7. The Poisoned Package (developers)
8. The Leaky Repo (developers)

## 1. Run it on your Mac (5 minutes)

1. Install **Node.js LTS** from nodejs.org.
2. Unzip this folder, then in Terminal:
   ```bash
   cd kavach-breach-room
   npm install
   npm run dev
   ```
3. Open http://localhost:3000. With no database connected, it runs in **demo mode** and keeps everything in your browser. Open `/host` in one tab (PIN **3010**) and the home page in another tab as a team.

## 2. Connect Firebase (15 minutes, once)

If you already set up Firebase for the earlier version, reuse that project. Just publish the new rules (step 5) and copy the values (step 6).

1. Go to console.firebase.google.com and choose **Add project**.
2. Open **Build → Realtime Database → Create database**. Choose **Singapore** and **locked mode**.
3. Open **Authentication → Sign-in method** and turn on **Anonymous** and **Email/Password**.
4. On the **Users** tab, add your facilitator email and password.
5. Open **Realtime Database → Rules**:
   - Open `database.rules.json`.
   - Replace every `FACILITATOR_EMAIL` with your facilitator email. It appears 17 times.
   - Paste the file in and press **Publish**.
6. Go to **Project settings → Your apps → Web (</>)**, register an app and copy the config values.
7. Copy `.env.local.template` to `.env.local` and fill in the values.
8. Run `npm run dev` again. The host dashboard now asks for your email and password, and shows **CONNECTED**.

## 3. Deploy to Vercel (10 minutes)

1. Push this folder to a **private** GitHub repository. Never commit `.env.local`; `.gitignore` already excludes it.
2. In Vercel, choose **Add New → Project** and import the repository. Vercel detects Next.js automatically.
3. Before deploying, open **Environment Variables** and add the same `NEXT_PUBLIC_FIREBASE_...` values as in `.env.local`. This step is easy to miss, and without it the site runs in demo mode.
4. Press **Deploy**. Use the **production** address, e.g. `kavach-breach-room.vercel.app`, because preview addresses ask for a Vercel login.
5. In Firebase, go to **Authentication → Settings → Authorized domains** and add that address.

To deploy from Terminal instead, run `npx vercel --prod` and add the environment variables when it asks, or in the Vercel dashboard.

## 4. Test before the day

1. Open `https://your-site/host` and sign in.
2. Open a game, then **Open registration** and **Lobby: QR + room code**.
3. Scan the QR code with a phone on mobile data, register, type the launch code and play a lock. Try Ask IT and 50:50.
4. On the host, try **Live race**, **Answer reveal**, a surprise event and a pause.
5. Go to **Setup & QR → Reset event**. Room codes stay the same, so printed cards keep working.

To test several teams on one laptop, use separate browser windows: one normal and one or more private. Each window is a different team.

## Running the event

| When | You (host dashboard) | Teams (phones) |
|---|---|---|
| Doors open | Open registration. Project the **Lobby** (QR code plus room code). | Scan, or type the room code, then enter a team name. |
| Start | Read each team its code, or press **Launch all waiting**. | Clock starts at Lock 1. |
| During play | Project the **Live race**. Send one surprise event mid-game. Pause or hint if a team is stuck. | Locks, the decision, lifelines, surprises. |
| End | **End game** when time's up. Project **Answer reveal**, then the **Leaderboard**. | Final time, outcome and decisions. |
| After | Download the results and log as CSV. | — |

**Scoring:** final time = clock time, plus 20 seconds per wrong answer (30 in Expert), plus time for risky decisions and surprise events, plus or minus your adjustments. While Ask IT is active, the clock doesn't count. Lowest time wins, and teams stopped before closing the case rank below finishers.

## Security notes

- **Access:** teams sign in anonymously and can only write their own record. Only the facilitator email in the rules can read other teams, launch codes or the log, or change games. The database rules enforce this.
- **Launch codes:** checked by the rules, so a team can't start without one.
- **Data:** stored in Singapore. Only team names and game play are kept; Insider-round teammates use code names.
- **Headers:** the site sends standard security headers and asks search engines not to index it.
- **Firebase key:** the web config key isn't a secret; the rules protect the data.
- **Type-check setting:** `next.config.mjs` sets `typescript.ignoreBuildErrors` so a type-only warning can't block a deploy. Run `npm run typecheck` to check types yourself.

## Project map

| Path | What it is |
|---|---|
| `app/` | Pages: `/` (room code), `/host` (dashboard), `/play` (team and teammate screens) |
| `components/team/` | Team game engine and screens |
| `components/host/` | Host dashboard, game tree and big-screen views |
| `components/member/` | Insider-round teammate screen |
| `data/scenarios.ts` | All game content: locks, decisions, detours, surprise events |
| `lib/` | Firebase and demo data layer, game rules (lifelines, scoring), sounds, navigation |
| `database.rules.json` | Firebase security rules |

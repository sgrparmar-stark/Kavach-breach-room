# Kavach Breach Room 4.1

A live, facilitator-run cyber escape game. Each team scans one event QR code, registers a team name and waits in the lobby. You give each team a game, and they get a 4-digit team key (or you press **Launch**). Teams then work through 6 locks, one big decision and the odd surprise event, with a 20-minute limit. You run everything from the host dashboard.

**Built with:** Next.js (App Router) · React · TypeScript · Firebase Realtime Database and Authentication (modular SDK) · react-qr-code · lucide-react · canvas-confetti · Web Audio sound effects. It deploys to Vercel.

## What's new in 4.0

| Area | What changed |
|---|---|
| **Entry** | One QR code for the whole event (`/play`). Teams register and wait in the lobby. You assign games by hand or with **Auto-assign**. Room codes are gone. |
| **Start** | Each team gets its own 4-digit **team key** once it has a game, tied to that team's phone. Or press **Launch** / **Launch all ready**. |
| **Scoring** | Wrong answers cost 20s, then 40s, then 60s on the same lock (×1.5 in Expert). Lifelines and hints cost 30s each, and the clock keeps running. **20-minute maximum** per team, with auto-stop. Every adjustment needs a reason. |
| **Fair winners** | Three winners across the whole event, ranked by **score**: final time ÷ the game's par time. Ties go to fewer wrong answers, then fewer lifelines, then the earlier finish. |
| **Trustworthy times** | Official times come from the database server's clock, in write-once records, and the dashboard calculates every score. Unusual results are flagged ⚑ for a second look. |
| **Kavach report** | Every team gets a personal report at the end: strengths, focus areas based on the choices they made, action items and a badge. You see the same report in History. |
| **Sessions and History** | **Start a new session** saves everything (teams, answers, reports, results, log) to History and clears the board. Nothing is deleted. History shows results, each team's report and answer sheet, question analysis, an awareness heatmap and CSV downloads. |
| **Leadership round** | Two new games for the CEO and senior management: **The Weekend Crisis** (ransomware, regulators, the ransom decision) and **The Vendor Breach** (third-party breach, OTP fraud, vendor governance). |
| **Ask Security team** (4.1) | The old Ask IT lifeline now calls a real person. The team's request pops up on your dashboard with a sound, and you send someone from the Security team to their table (or send the hint to their phone, or say no one is free). |
| **Kavach Liquid look** | Team phones, the start page and the big screen use dark glass, liquid buttons, liquid fills and a slow aurora. It falls back to solid colours on older phones and respects "reduce motion". The host dashboard stays light. |

The 10 games:

| # | Game | Round |
|---|---|---|
| 1 | The Friday Leak | Everyone |
| 2 | The Urgent Transfer | Everyone |
| 3 | Ransomware Monday | Everyone |
| 4 | The Last Day | Everyone |
| 5 | The Open Bucket | Everyone |
| 6 | The Visitor | Everyone |
| 7 | The Poisoned Package | Developers |
| 8 | The Leaky Repo | Developers |
| 9 | The Weekend Crisis | Leadership |
| 10 | The Vendor Breach | Leadership |

## Scoring

**Final time = clock time + added time ± your adjustments.** The clock runs from the team's own start and stops at 20:00. A team that hasn't finished by then is stopped automatically and ranked below every team that finished.

| What happens | Time added |
|---|---|
| Wrong answer on a lock | +20s, then +40s, then +60s for each further mistake on the same lock (Expert: +30s, +60s, +90s) |
| Ask Security team or 50:50 | +30s each, once per game. Ask Security is charged only when you send help |
| Facilitator hint | +30s |
| The big decision | Best 0 · Acceptable +60s · Risky +120s **plus** a detour lock |
| Surprise event | Best 0 · Acceptable +30s · Risky +90s. The clock pauses while the card is open, for up to 60s |
| Insider round vote | Catch the Insider −60s · miss +60s |
| Your adjustment | Any amount, with a reason that's saved |

**Score = final time ÷ par time**, shown as a percentage. Par is a typical good time for each game (15:00 by default; change it in **Setup**). 85% means 15% faster than par. Lowest score wins, so teams on different games compare fairly. Ties go to fewer wrong answers, then fewer lifelines, then the earlier finish.

**⚑ flags** mark results worth a check before you announce winners: a lock solved in under 8 seconds, a finish under 5 minutes, phone and server times that differ, or an adjustment of 2 minutes or more.

## 1. Run it on your Mac

1. Install **Node.js LTS** from nodejs.org.
2. In Terminal:
   ```bash
   cd kavach-breach-room
   npm install
   npm run dev
   ```
3. Open http://localhost:3000. With no database connected it runs in **demo mode** and keeps everything in your browser. Open `/host` in one tab (PIN **3010**) and `/play` in another tab as a team.

## 2. Update an existing setup to 4.0 (GitHub + Vercel + Firebase)

You already have GitHub, Vercel and Firebase set up. To move to 4.0:

1. **GitHub.** Open your repository on github.com and choose **Add file → Upload files**. From this folder, drag in the `app`, `components`, `data` and `lib` folders, plus `README.md`, `package.json` and `database.rules.json`. Choose **Commit changes**. Vercel rebuilds by itself in a minute or two.
2. **Firebase rules.** The rules changed, so publish them again:
   - In Terminal, inside this folder, run this (put your facilitator email after the second slash):
     ```bash
     sed -i.bak s/FACILITATOR_EMAIL/you@example.com/g database.rules.json
     ```
     Or open the file in TextEdit and use **Find & Replace**. The placeholder appears **25** times. Check that `grep -c FACILITATOR_EMAIL database.rules.json` prints 0.
   - In Firebase, open **Realtime Database → Rules**, paste in the whole file and press **Publish**.
3. **Old data.** Open `/host`, go to **Setup** and press **Save and start a new session**. This clears the old 3.0 records (room codes are no longer used) and keeps a copy in History.

## 3. First-time setup (only if you're starting from scratch)

1. Go to console.firebase.google.com and choose **Add project**.
2. Open **Build → Realtime Database → Create database**. Choose **Singapore** and **locked mode**.
3. Open **Authentication → Sign-in method** and turn on **Anonymous** and **Email/Password**. In **Settings → User actions**, keep **Enable create (sign-up)** on (anonymous sign-in needs it).
4. On the **Users** tab, add your facilitator email and password.
5. Publish the rules as in step 2 above.
6. Go to **Project settings → Your apps → Web (</>)**, register an app and copy the config values.
7. Copy `.env.local.template` to `.env.local` and fill in the values.
8. Push to a **private** GitHub repository (never commit `.env.local`), import it in Vercel, add the same `NEXT_PUBLIC_FIREBASE_...` values under **Environment Variables**, and deploy.
9. In Firebase, go to **Authentication → Settings → Authorized domains** and add your Vercel address.

## 4. Test before the day

1. Open `https://your-site/host` and sign in.
2. Go to **Setup**: check the QR code, print a table card, and set par times (keep 15:00 until you've done a dry run).
3. On **Games**, switch **Registration** to **Open** and press **Big screen → Lobby + QR**.
4. Scan the QR code with a phone on mobile data and register a team.
5. Back on the dashboard, choose a game for that team. Type the team key on the phone, or press **Launch**. Play a lock and try a wrong answer, 50:50 and **Ask Security team** (answer the alert on the dashboard).
6. Try **Live race**, a surprise event, a pause and a time adjustment (it asks for a reason).
7. Finish the game and read the Kavach report on the phone.
8. Go to **Setup → Save and start a new session**, then look at the test in **History**.

To test several teams on one laptop, use separate browser windows: one normal and one or more private. Each window is a different team.

## Running the event

| When | You (host dashboard) | Teams (phones) |
|---|---|---|
| Doors open | **Registration → Open.** Project **Lobby + QR**. | Scan the QR code and register a team name. |
| Assign | In **Waiting for a game**, choose a game for each team, or use **Auto-assign** to spread them across the games you tick. | The phone shows their game and asks for a team key. |
| Start | Read each team its key, or press **Launch all ready**. | Each team's 20-minute clock starts at Lock 1. |
| During play | Project the **Live race**. Answer **Ask Security team** alerts by sending someone over. Send a surprise event. Pause, hint or message a team if needed. | Locks, the decision, lifelines, surprises. |
| End | Teams stop at 20 minutes on their own. Project **Answers**, then **Winners**. | Final time, outcome and their Kavach report. |
| After | **Results** for the three winners. **Setup → Save and start a new session** before the next group. | — |

Use the **Leadership round** games for the CEO and senior management. Use **Expert** mode for experienced groups.

## Ask Security team

Each team can call the Security team once per game, from any lock.

1. The team taps **Ask Security team**. Their phone shows "Security team called" and they keep working. The clock keeps running.
2. An alert pops up on the host dashboard, bottom left, on every tab, with a sound and a count in the browser tab. It shows the team, the game, the lock, how long they've waited, and the hint for that lock so you can brief the person you send.
3. Choose one:
   - **Send someone (+30s):** walk a Security team member to their table to give the hint in person. The phone says "Security is on the way".
   - **Hint to their phone (+30s):** the hint appears on their phone, signed by the Security team.
   - **No one free:** nothing is charged and the lifeline goes back to the team.
4. If the team solves the lock before you answer, the request is withdrawn and nothing is charged.

On the big screen the alert stays small and hides the hint, so other teams can't read it. Press **Respond** to close the big screen and open that team. Brief your Security volunteers before the event: they give a nudge, not the answer.

## History and reports

The **History** tab shows the current session and every saved session.

- **Results:** the podium and full ranking.
- **Team reports:** each team's Kavach report, plus its answer sheet (every answer and option chosen, with times).
- **Questions:** for each game, the first-try rate, average wrong answers and the most common wrong answer per lock, and how teams split on each decision.
- **Heatmap:** each team's strength by topic (phishing, identity, data, fraud and so on). Red cells are follow-up training topics.
- **Downloads:** results, action items, answers and the log as CSV (opens in Excel), and the full record as JSON.

## Security notes

- **Access:** teams sign in anonymously and can only write their own records. Only the facilitator email in the rules can read other teams, team keys, the log or History, or change games.
- **Team keys:** checked by the rules against the key issued for that team, so a team can't start without its own key.
- **Official times:** the start, finish and every answer are stamped with the server's clock and can't be rewritten. Scores are calculated on the dashboard, not on the phone.
- **Sessions:** saved sessions are write-once, so History can't be overwritten.
- **Data:** stored in Singapore. Only team names and game play are kept. Insider-round teammates use code names.
- **Firebase key:** the web config key isn't a secret; the rules protect the data.
- **Type check:** `next.config.mjs` sets `typescript.ignoreBuildErrors` so a type-only warning can't block a deploy. Run `npm run typecheck` to check types yourself.

## Updating the game later

1. Change the files. Most game text is in `data/scenarios.ts`.
2. Test on your Mac with `npm run dev`.
3. Upload the changed files to the same GitHub repository (**Add file → Upload files**, keeping the folder structure). Vercel rebuilds by itself.
4. If you changed `database.rules.json`, publish it in Firebase again with your email filled in.

## Project map

| Path | What it is |
|---|---|
| `app/` | Pages: `/` (start), `/host` (dashboard), `/play` (team and teammate screens) |
| `components/team/` | Team game engine and screens |
| `components/host/` | Host dashboard, History, game tree and big-screen views |
| `components/member/` | Insider-round teammate screen |
| `components/Report.tsx` | The Kavach report |
| `data/scenarios.ts` | All game content: locks, decisions, detours, surprise events, report feedback |
| `lib/scoring.ts` | Scoring rules: penalties, the 20-minute limit, par scores, tie-breaks, flags |
| `lib/report.ts` | Builds each team's Kavach report from its answers |
| `lib/` | Firebase and demo data layer, game rules, sounds, navigation |
| `database.rules.json` | Firebase security rules |

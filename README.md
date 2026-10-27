# Kavach Breach Room 4.2

A live, facilitator-run cyber escape game. Each team scans one event QR code and registers a team name. The dashboard deals the team one of the games automatically, and the team waits until you start it. Teams then work through 6 locks, one big decision and the odd surprise event, with a 20-minute limit. You run everything from the host dashboard.

**Built with:** Next.js (App Router) · React · TypeScript · Firebase Realtime Database and Authentication (modular SDK) · react-qr-code · lucide-react · canvas-confetti · Web Audio sound effects. It deploys to Vercel.

## What's new in 4.2

| Area | What changed |
|---|---|
| **Automatic games** | As soon as a team registers, it's dealt a game: at random, but spread evenly, so every game gets about the same number of teams (20 teams over 6 games: four games get 3 teams and two get 4). No manual assigning. |
| **Which games** | By default, only the 6 games for everyone. The Developer and Leadership games stay ready: switch them on in **Setup → Games teams can get** for those sessions. |
| **You start every team** | No team keys. The phone shows its game and "Waiting for your facilitator to start". Press **Start** for one team or **Start all ready**. |
| **Hint lifeline** | The team's **Hint** button shows the hint straight away inside the lock (+30s, once per game). **50:50** is unchanged. The Ask Security team flow and the dashboard's hint button are gone. |
| **Simpler, plainer games** | All 10 games keep the same locks and the same number of options, but use everyday language, explain any technical word in brackets, have clearer clues and more direct hints, and end every lock with a one-line **Remember:** takeaway. |
| **Data** | The results download now includes each team's registration time. The dashboard shows a live count of teams per game. |

Still here from 4.0: one QR code, the 20-minute limit, fair scoring against par, the three winners, server-timed records, the Kavach report, sessions and History, the leadership games and the Kavach Liquid look.

The 10 games:

| # | Game | Round | Dealt by default |
|---|---|---|---|
| 1 | The Friday Leak | Everyone | Yes |
| 2 | The Urgent Transfer | Everyone | Yes |
| 3 | Ransomware Monday | Everyone | Yes |
| 4 | The Last Day | Everyone | Yes |
| 5 | The Open Bucket | Everyone | Yes |
| 6 | The Visitor | Everyone | Yes |
| 7 | The Poisoned Package | Developers | No (switch on in Setup) |
| 8 | The Leaky Repo | Developers | No (switch on in Setup) |
| 9 | The Weekend Crisis | Leadership | No (switch on in Setup) |
| 10 | The Vendor Breach | Leadership | No (switch on in Setup) |

## How games are dealt

- Every new team gets one of the games ticked in **Setup → Games teams can get**, always one of the games with the fewest teams so far. When several are tied, the pick is random.
- Teams that register one after another (neighbouring tables) usually get different games, so copying answers doesn't help.
- The dashboard does the dealing, so **keep the host dashboard open** while teams register. Teams can't choose or change their own game.
- Need an exception (for example a leadership team)? Open the team on the dashboard and use **Change game** before you start it.
- To run a developer or leadership session, tick those games in Setup (and untick the others if you want only those). **Back to the six games for everyone** resets it.

## Scoring

**Final time = clock time + added time ± your adjustments.** The clock runs from the moment you start the team and stops at 20:00. A team that hasn't finished by then is stopped automatically and ranked below every team that finished.

| What happens | Time added |
|---|---|
| Wrong answer on a lock | +20s, then +40s, then +60s for each further mistake on the same lock (Expert: +30s, +60s, +90s) |
| Hint or 50:50 | +30s each, once per game |
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

## 2. Update your live site to 4.2 (GitHub + Vercel)

1. **GitHub.** Open your repository on github.com and choose **Add file → Upload files**. From this folder, drag in the `app`, `components`, `data` and `lib` folders, plus `README.md` and `package.json`. Choose **Commit changes**. Vercel rebuilds by itself in a minute or two.
2. **Firebase rules.** No change since 4.0. If you already published the 4.0 rules, there's nothing to do. If not, publish `database.rules.json` with your facilitator email filled in (it appears 25 times).
3. **Clear old test data.** Open `/host`, go to **Setup** and press **Save and start a new session**. Old teams and team keys are cleared and a copy is kept in History.
4. **Check Setup → Games teams can get** shows the 6 games for everyone ticked.

## 3. First-time setup (only if you're starting from scratch)

1. Go to console.firebase.google.com and choose **Add project**.
2. Open **Build → Realtime Database → Create database**. Choose **Singapore** and **locked mode**.
3. Open **Authentication → Sign-in method** and turn on **Anonymous** and **Email/Password**. In **Settings → User actions**, keep **Enable create (sign-up)** on (anonymous sign-in needs it).
4. On the **Users** tab, add your facilitator email and password.
5. Publish the rules: replace every `FACILITATOR_EMAIL` in `database.rules.json` with your facilitator email (25 times), then paste the whole file into **Realtime Database → Rules** and press **Publish**.
6. Go to **Project settings → Your apps → Web (</>)**, register an app and copy the config values.
7. Copy `.env.local.template` to `.env.local` and fill in the values.
8. Push to a **private** GitHub repository (never commit `.env.local`), import it in Vercel, add the same `NEXT_PUBLIC_FIREBASE_...` values under **Environment Variables**, and deploy.
9. In Firebase, go to **Authentication → Settings → Authorized domains** and add your Vercel address.

## 4. Test before the day

1. Open `https://your-site/host` and sign in.
2. Go to **Setup**: check the QR code, print a table card, check **Games teams can get**, and set par times (keep 15:00 until you've done a dry run).
3. On **Games**, switch **Registration** to **Open** and press **Big screen → Lobby + QR**.
4. Scan the QR code with two or three phones on mobile data and register teams. Each phone should show its game within a second or two, and the dashboard lists them under **Ready to start**.
5. Press **Start** for one team and **Start all ready** for the rest. Play a lock and try a wrong answer, **Hint** and **50:50**.
6. Try **Live race**, a surprise event, a pause and a time adjustment (it asks for a reason).
7. Finish a game and read the Kavach report on the phone.
8. Go to **Setup → Save and start a new session**, then look at the test in **History** and download the results.

To test several teams on one laptop, use separate browser windows: one normal and one or more private. Each window is a different team.

## Running the event

| When | You (host dashboard) | Teams (phones) |
|---|---|---|
| Before | **Setup**: check the games to deal and the par times. Keep the dashboard open. | — |
| Doors open | **Registration → Open.** Project **Lobby + QR**. | Scan the QR code and register a team name. The phone shows their game. |
| Start | Press **Start** for each team, or **Start all ready**. | Each team's 20-minute clock starts at Lock 1. |
| During play | Project the **Live race**. Send a surprise event. Pause or message a team if needed. | Locks, the decision, Hint and 50:50, surprises. |
| End | Teams stop at 20 minutes on their own. Project **Answers**, then **Winners**. | Final time, outcome and their Kavach report. |
| After | **Results** for the three winners, and the downloads. **Setup → Save and start a new session** before the next group. | — |

Use **Expert** mode for experienced groups. For a leadership or developer session, switch those games on in Setup first.

## History and reports

The **History** tab shows the current session and every saved session.

- **Results:** the podium and full ranking.
- **Team reports:** each team's Kavach report, plus its answer sheet (every answer and option chosen, with times).
- **Questions:** for each game, the first-try rate, average wrong answers and the most common wrong answer per lock, and how teams split on each decision.
- **Heatmap:** each team's strength by topic (phishing, identity, data, fraud and so on). Red cells are follow-up training topics.
- **Downloads:** results (with registration, start and finish times), action items, answers and the log as CSV (opens in Excel), and the full record as JSON.

## Security notes

- **Access:** teams sign in anonymously and can only write their own records. Only the facilitator email in the rules can read other teams, the log or History, deal or change games, or start a team.
- **Games:** teams can't choose or change their own game; the database rules only let the facilitator's dashboard write assignments.
- **Official times:** the start, finish and every answer are stamped with the server's clock and can't be rewritten. Scores are calculated on the dashboard, not on the phone.
- **Sessions:** saved sessions are write-once, so History can't be overwritten.
- **Data:** stored in Singapore. Only team names and game play are kept. Insider-round teammates use code names.
- **Firebase key:** the web config key isn't a secret; the rules protect the data.
- **Capacity:** Firebase's free plan allows 100 phones and screens connected at once. For bigger events, or the Insider round with many teammates, move the project to the pay-as-you-go **Blaze** plan and set a budget alert.
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
| `components/host/` | Host dashboard, game dealing, History, game tree and big-screen views (`HelpDock.tsx` is an empty leftover from 4.1) |
| `components/member/` | Insider-round teammate screen |
| `components/Report.tsx` | The Kavach report |
| `data/scenarios.ts` | All game content: locks, decisions, detours, surprise events, report feedback |
| `lib/scoring.ts` | Scoring rules: penalties, the 20-minute limit, par scores, tie-breaks, flags |
| `lib/report.ts` | Builds each team's Kavach report from its answers |
| `lib/` | Firebase and demo data layer, game rules, sounds, navigation |
| `database.rules.json` | Firebase security rules |

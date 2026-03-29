# Tribunal — The AI Court That Cross-Examines Your Decisions

> *"You bring the case. The court delivers the verdict."*

**Hackathon:** ElevenHacks Season 1 — Hack #2: Cloudflare × ElevenLabs  
**Stack:** Next.js 15 (App Router) · shadcn/ui · Cloudflare Agents SDK · Durable Objects · Workers AI · Vectorize · ElevenLabs ConvAI + TTS  
**Concept:** A voice-based adversarial reasoning system for hard decisions. You present a decision — hiring, pricing change, feature cut, partnership, roadmap pivot — and Tribunal convenes a live courtroom of persistent AI agents: a Prosecutor who attacks your reasoning, a Defender who builds the case for it, a Judge who demands evidence, a Domain Expert who surfaces facts and precedents, and a Historian who remembers every decision you've brought before this court. They debate in real time with distinct voices, challenge your assumptions, and force you to defend weak reasoning. The session ends with a spoken verdict and a full audit trail of arguments.

---

## The Problem This Solves

Hard decisions are made badly for one consistent reason: **nobody in the room is paid to be wrong**. Advisors tell you what you want to hear. Co-founders reinforce existing bias. Personal conviction overrides weak evidence. Tribunal is the room where the opposite is true — where one agent's entire job is to find the flaw in your plan, and another's is to make sure the strongest version of the idea gets heard before you decide anything.

This is not a chatbot that gives advice. It is an adversarial deliberation engine that runs without you between sessions, builds a memory of your past decisions, and delivers a reasoned verdict you can act on or argue back against.

---

## The Five Agents of the Court

Each agent is a **Cloudflare Durable Object** with its own SQLite memory, ElevenLabs voice, and adversarial role. They persist across sessions — the Historian literally remembers every case you've ever brought.


| Agent                 | Role                       | Behaviour                                                                                                                                         | Voice Style                                             |
| --------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **The Prosecutor**    | Attacks the decision       | Finds logical gaps, surfaces risks, questions assumptions, challenges the user directly. Never accepts a claim without evidence.                  | Sharp, clipped, fast-paced. Slightly aggressive.        |
| **The Defender**      | Argues for the decision    | Builds the strongest possible version of the case. Steelmans the user's reasoning. Finds upsides the user hasn't mentioned.                       | Measured, persuasive, calm confidence.                  |
| **The Judge**         | Controls the proceedings   | Asks clarifying questions before the debate begins. Interrupts to demand evidence. Weighs arguments. Delivers the final spoken verdict.           | Authoritative, slow, deliberate. Slightly intimidating. |
| **The Domain Expert** | Provides factual grounding | Surfaces relevant facts, market data, historical precedents, and analogous cases. Does not advocate — only grounds the debate in reality.         | Precise, academic, neutral.                             |
| **The Historian**     | Provides case memory       | Recalls every prior decision the user has brought to Tribunal. Surfaces patterns: "You've made this same trade-off three times in the past year." | Contemplative, measured. Occasionally unsettling.       |


---

## What a Session Looks Like

### Step 1 — User presents the case (voice input)

The user opens Tribunal and speaks their decision brief — no forms, no templates, just talking. Example: *"We're considering cutting our enterprise tier entirely and going consumer-only. We have 40 enterprise customers paying $3k/month and a consumer product with strong growth but low LTV."*

The Judge receives this via ElevenLabs ConvAI, transcribes it, and asks up to 3 clarifying questions before proceeding — things like "What is your runway if enterprise revenue disappears tomorrow?" or "Have you spoken to any enterprise customers about alternatives?" The user answers verbally. Every answer is stored in the case's Durable Object and indexed in Vectorize.

### Step 2 — The court convenes (autonomous multi-agent debate)

The Judge's Durable Object triggers the debate Workflow. Each agent is called in sequence, generating arguments based on the case brief and their own SQLite memory:

- **Domain Expert** opens: surfaces market data and relevant precedents — analogous situations like Slack's enterprise pivot or Notion's transition — to ground the debate in facts.
- **Defender** argues: builds the strongest case for the decision using the user's own words and the Expert's facts. Finds upsides the user may not have articulated.
- **Prosecutor** attacks: picks apart the Defender's argument, finds the weakest assumptions, and projects the most probable failure mode explicitly.
- **Historian** intervenes: *"Three months ago you brought a pricing decision here. You chose to hold pricing then too. The Prosecutor's concern about revenue concentration is a pattern in your decisions."*
- **Judge** steers: asks each side one follow-up question and requests the user to respond to the Prosecutor's strongest challenge.
- **User responds** by voice: *"We believe the enterprise customers will convert to our pro tier."*
- **Prosecutor rebuts**: *"You haven't spoken to them. That belief is a projection, not evidence."*

### Step 3 — The Judge delivers the verdict (spoken)

After 3–5 rounds, the Judge synthesises all arguments and delivers a spoken verdict via ElevenLabs TTS. The verdict always has four parts:

1. **Ruling** — a clear directional recommendation: proceed, do not proceed, or proceed conditionally
2. **Key factors** — the 2–3 arguments or facts that decided the ruling
3. **Conditions** — what would need to be true for the ruling to change
4. **Dissent** — what the losing side got right (always included — intellectual honesty is non-negotiable)

The full session — every argument, every rebuttal, the verdict — is written to the case's SQLite database and summarised in Vectorize as a memory the Historian can surface in future sessions.

### Between sessions — the court deliberates without you

When the user closes the session before a verdict is reached, agents continue deliberating via their scheduled cron tasks. The Prosecutor generates new challenges. The Historian re-examines past cases for patterns. When the user returns, the Judge opens with: *"Since we last met, the Prosecutor has raised two new concerns."*

---

## Architecture

**Frontend** — Next.js App Router deployed to Cloudflare via the [OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare) (`@opennextjs/cloudflare`). All UI is built with shadcn/ui components. The browser connects to the Cloudflare Workers backend via WebSocket for live debate events and a Server-Sent Events stream for the real-time argument feed.

**Router Worker** — a Cloudflare Worker that receives all incoming connections, routes WebSocket sessions to the correct CaseDO by case ID, manages auth tokens, and broadcasts the SSE stream of debate events to the UI.

**CaseDO** — one Durable Object per decision the user brings. Stores the case brief, all clarifications, every argument by round and agent role, and the final verdict in its own SQLite database. Orchestrates the debate by triggering a Cloudflare Workflow and receiving argument deliveries from each agent DO. A cron schedule allows it to continue deliberating between user sessions.

**Agent DOs** — four singleton Durable Objects (ProsecutorDO, DefenderDO, DomainExpertDO, HistorianDO), each with their own SQLite. They are called by the CaseDO during the debate Workflow, generate role-specific arguments via Workers AI, and return the argument text to be delivered to the UI and TTS pipeline.

**JudgeDO** — a singleton Durable Object that controls the overall proceedings. Generates the opening clarifying questions, conducts the user cross-examination live via ElevenLabs ConvAI, receives all arguments, weighs them using Workers AI, and synthesises and delivers the final verdict via ElevenLabs TTS.

**HistorianDO** — a singleton Durable Object whose SQLite spans every case ever brought to Tribunal by this user. It stores case summaries, verdicts, and detected patterns. Cloudflare Vectorize is used to find semantically similar past cases and surface them as relevant context during the debate.

**Debate Workflow** — a Cloudflare Workflow that runs the ordered sequence of agent calls: Expert → Defender → Prosecutor → Historian → Judge cross-exam → User response → Prosecutor rebuttal → Judge verdict. Workflows provide durable execution and automatic retries if any step fails.

**Workers AI** — used by every agent DO for argument generation, using the Llama 3.3 70B model. No external API key required on Cloudflare's free tier.

**ElevenLabs TTS** — called for each agent's arguments as they are generated, using a distinct voice_id per role. The Judge also runs a live ConvAI WebSocket session during cross-examination so the user can hear and respond in real time.

---

## Project File Structure

The project is a monorepo — Next.js frontend and Cloudflare Workers backend live side by side, deployed separately.

**Backend (src/) — Cloudflare Workers**

- `src/worker.ts` — Router Worker: WebSocket routing, auth, SSE stream
- `src/court/` — all six Durable Object classes: CaseDO, JudgeDO, ProsecutorDO, DefenderDO, DomainExpertDO, HistorianDO, plus shared court role types
- `src/debate/` — debate Workflow, argument generator (role-aware Workers AI prompting), verdict synthesiser, cross-examiner logic
- `src/voice/` — ElevenLabs TTS helper, ConvAI WebSocket helper, voice config (voice_id and settings per role)
- `src/memory/` — SQLite helpers for CaseDO, Historian cross-case pattern detection, Vectorize client
- `src/types.ts` — all shared TypeScript types

**Frontend (app/) — Next.js 15 App Router**

- `app/layout.tsx` — root layout with Inter font and ThemeProvider
- `app/lobby/page.tsx` — case brief screen: mic input, Judge clarifying Q&A
- `app/courtroom/[caseId]/page.tsx` — live debate: 5 agent panels, argument feed
- `app/verdict/[caseId]/page.tsx` — ruling, conditions, dissent, audit trail
- `app/history/page.tsx` — all past cases and Historian pattern summary

**Components**

- `components/ui/` — shadcn/ui auto-generated components (Card, Badge, Button, Dialog, Sheet, Separator, ScrollArea)
- `components/court/AgentPanel.tsx` — shadcn Card wrapping agent name, waveform animation, and latest argument
- `components/court/CourtroomLayout.tsx` — 5-panel CSS grid in courtroom formation
- `components/court/ArgumentFeed.tsx` — shadcn ScrollArea with role-labelled debate transcript
- `components/court/CrossExamDialog.tsx` — shadcn Dialog for Judge's cross-examination mic overlay
- `components/court/VerdictCard.tsx` — 4-section Card: Ruling / Key Factors / Conditions / Dissent
- `components/court/CaseHistoryCard.tsx` — compact Card for the history grid
- `components/court/AudioWaveform.tsx` — animated SVG waveform during TTS playback
- `components/shared/MicButton.tsx` — push-to-talk button with active and idle states
- `components/shared/RulingBadge.tsx` — shadcn Badge in green, amber, or red per verdict ruling
- `components/shared/AgentBadge.tsx` — role pill for labelling arguments in the feed

**Hooks**

- `hooks/useCaseSession.ts` — WebSocket connection to CaseDO via the Router Worker
- `hooks/useDebateFeed.ts` — SSE stream of live argument events
- `hooks/useConvAI.ts` — ElevenLabs ConvAI WebSocket for mic in / audio out
- `hooks/useAudioPlayer.ts` — queues and plays TTS audio buffers in sequence

**Config**

- `next.config.ts` — OpenNext Cloudflare dev integration (`initOpenNextCloudflareForDev`)
- `open-next.config.ts` — OpenNext Cloudflare adapter config (e.g. R2 incremental cache)
- `wrangler.jsonc` — Worker entry (`.open-next/worker.js`), static assets, R2 incremental cache binding; extend with DO bindings, Vectorize, Workflow, AI binding, and secrets as the backend grows
- `tailwind.config.ts` — Tailwind and shadcn theme tokens
- `components.json` — shadcn/ui config (style: default, base color: slate)

**Scripts**

- `scripts/seed-history.ts` — inserts 2–3 past decisions into HistorianDO SQLite and Vectorize. Non-optional for the demo — the Historian needs history to surface patterns.

---

## UI — Key Screens

### Lobby — /lobby

Full-viewport dark background with a centred layout. A large circular MicButton pulses red while the user is recording. The ElevenLabs ConvAI waveform renders below it while the Judge listens. Transcription appears live in a shadcn Card beneath the waveform. The Judge's clarifying questions play via TTS and appear as Badge-labelled message bubbles for the user to respond to verbally. A "Submit to the court" Button submits the case, or it auto-submits after the third clarification is answered.

### Courtroom — /courtroom/[caseId]

A CSS grid places the five agent panels in a courtroom-inspired formation: Judge centred at the bottom (largest panel, dark navy), Prosecutor top-left, Defender top-right, Domain Expert bottom-left, Historian bottom-right. Each panel is a shadcn Card rendered by AgentPanel showing the agent name, role Badge, animated AudioWaveform SVG, and their latest argument text. The currently speaking panel gets a highlighted ring border. The ArgumentFeed — a shadcn ScrollArea on the right — shows the full live transcript labelled by AgentBadge per entry. When the Judge activates the cross-examination, a shadcn Dialog (CrossExamDialog) opens as a full overlay showing the Judge's question and a live MicButton. An "In deliberation" Badge appears when the session is paused and agents are running their cron tasks between user visits.

### Verdict — /verdict/[caseId]

The Judge's TTS verdict audio plays automatically on page load. A single shadcn VerdictCard displays four sections divided by Separators: RULING (large text with a colour-coded RulingBadge — green for proceed, red for do not, amber for conditional), KEY FACTORS (two Badge pills), CONDITIONS (muted Card inset), and DISSENT (de-emphasised italic text). A "Download verdict" Button triggers a PDF export. A "Bring another case" Button routes back to the Lobby.

### History — /history

A shadcn Card at the top shows the Historian's pattern summary — 2–3 detected patterns across all past cases rendered as Badge pills. Below is a grid of CaseHistoryCard components showing brief snippets, RulingBadges, and dates. Clicking any card opens a shadcn Sheet sliding in from the right with the full argument transcript and verdict for that case in a ScrollArea.


# Tribunal UI/UX Revamp — Design Spec

## Overview

Complete visual revamp of the Tribunal platform. Replaces the current minimal/default styling with a polished "Warm Charcoal" dark theme featuring smooth animations, emoji gradient orb avatars for court personas, and a distinctive landing page. The goal is an elegant, modern product that stands on its own aesthetically.

## Decisions

- **Theme**: Warm Charcoal — dark mode only, no light mode toggle
- **Avatar style**: Emoji on gradient orbs for each court persona
- **Accent**: Blue primary (#5b8def for Judge), warm cream (#ede9e1) for CTAs/foreground text
- **Animation library**: `motion` (Framer Motion successor) for stagger, scroll-trigger, and transition animations
- **Font**: Geist Sans + Geist Mono (already available via Next.js)
- **Differentiation from mock-ready**: Split hero layout, horizontal agent cards, warm earthy palette, no bento grid, no 3D perspective preview

---

## Design System

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#121210` | Page background |
| `card` | `#1a1917` | Card/panel backgrounds |
| `border` | `#1f1e1b` | Subtle borders, dividers |
| `border-strong` | `#2a2826` | Interactive borders (buttons, badges) |
| `foreground` | `#ede9e1` | Primary text, CTA backgrounds |
| `muted` | `#a39e93` | Secondary text |
| `muted-dim` | `#7a756c` | Tertiary text, descriptions |
| `muted-faint` | `#52504a` | Timestamps, very subtle text |

### Agent Role Colors

| Role | Emoji | Gradient Start | Gradient End | Usage |
|------|-------|---------------|-------------|-------|
| Judge | ⚖️ | `#5b8def` | `#3b6fd4` | Primary agent, blue |
| Prosecutor | 🗡️ | `#e35d5d` | `#c43c3c` | Warm red |
| Defender | 🛡️ | `#4ead6b` | `#358a4f` | Muted green |
| Expert | 🔬 | `#e8a830` | `#c48d1c` | Amber/gold |
| Historian | 📜 | `#b06ed4` | `#8b4aad` | Muted purple |

Each agent avatar is a circular div with `background: linear-gradient(135deg, start, end)` and the emoji centered inside.

### Typography

- **Headings**: Geist Sans, font-weight 700, color `foreground`, sentence case (not uppercase), tracking tight (`-0.02em`)
- **Body**: Geist Sans, font-weight 400, color `muted` or `muted-dim`, line-height 1.6
- **Labels**: Geist Mono, 9-10px, uppercase, letter-spacing `0.12-0.15em`, color `muted-dim` or `muted-faint`
- **Badges**: Geist Mono, 9px, uppercase, inside pill with role-colored tinted background and border

### Border Radius

- Cards/panels: `10px` (`rounded-[10px]`)
- Buttons: `8px` (`rounded-lg`)
- Badges/pills: `100px` (`rounded-full`)
- Agent avatars: `50%` (circle)

### Animations (via `motion` library)

**Stagger fade-up** — used for page sections, card lists:
```
container: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }
item: { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } }
```

**Scroll-triggered reveals** — used for landing page sections:
```
whileInView={{ opacity: 1, y: 0 }}
initial={{ opacity: 0, y: 20 }}
viewport={{ once: true, amount: 0.3 }}
```

**CSS animations** (in globals.css):
- `waveform` — existing audio bar animation, kept as-is
- `glow-pulse` — subtle radial glow pulsing (4s, ease-in-out, infinite)
- `float` — gentle vertical float for background orbs (8s, ease-in-out, infinite)
- `ring-pulse` — concentric ring expansion for voice orb (3s, infinite)
- `shimmer` — gradient sweep on CTA button (3s, infinite)

**Page transitions** — `AnimatePresence mode="wait"` with fade + slight y-shift between route changes.

---

## Pages

### Landing Page (`/`)

**Structure** (top to bottom):

1. **Navbar** (fixed, sticky)
   - Left: ⚖️ emoji + "Tribunal" text
   - Center: "How It Works" / "The Court" links (mono style, hidden on mobile)
   - Right: "Present a Case" solid CTA button
   - Background: `rgba(18,18,16,0.85)` with `backdrop-filter: blur(12px)`
   - Bottom border: `border`

2. **Hero** (split layout, `grid-cols-2` on desktop, stacked on mobile)
   - Left column:
     - Pill badge: dot + "5 AI Agents. 1 Verdict." (mono, `border-strong`)
     - H1: "Stress-test your decisions." (40px/700/foreground)
     - Description paragraph (13px/muted-dim)
     - Two buttons: "Present a Case" (solid foreground) + "View Past Cases" (outline border-strong)
   - Right column:
     - Court circle visualization: Judge emoji orb at center, 4 other agents positioned on an outer ring (N/S/E/W), concentric circle borders, subtle connecting SVG lines
     - Subtle radial glow behind the formation
   - Stagger animation on load for left column elements
   - Court circle fades in with slight scale

3. **Gradient divider** — `linear-gradient(to right, transparent, border-strong, transparent)`

4. **"Meet the Panel"** section
   - Mono label: "The Court"
   - Heading: "Meet the panel."
   - Horizontal scrolling row of 5 agent cards (min-width ~180px each)
   - Each card: emoji orb avatar, role name (bold), one-line role description (muted-dim)
   - Card background: `card`, border: `border`, radius 10px
   - Stagger animation on scroll into view

5. **Gradient divider**

6. **"Three Steps to Clarity"** section
   - Mono label: "Process"
   - Heading: "Three steps to clarity."
   - Left-aligned vertical timeline, 3 steps:
     - Numbered circles (1, 2, 3) with `border-strong` border, mono font
     - Vertical connecting line between steps (`border` color)
     - Step title (14px/600/foreground) + description (12px/muted-dim)
   - Steps: "Speak your decision" → "The court debates" → "Receive your verdict"
   - Stagger animation on scroll

7. **Gradient divider**

8. **Bottom CTA**
   - Heading: "Ready to face the court?" (24px/700/foreground)
   - Subtext: "Your decision deserves more than a gut feeling."
   - Solid CTA button with shimmer animation
   - Centered layout

9. **Footer**
   - Top border
   - Left: "Built for ElevenLabs Hackathon"
   - Right: "Tribunal © 2025"

### Lobby Page (`/lobby`)

**Layout**: Centered single-column, max-width ~480px

- **Header bar**: Logo left, "Intake" status badge right (green dot + mono text)
- **Judge avatar section**: Centered Judge emoji orb (48px), "The Judge" name, "is listening" subtitle
- **Transcript area**: Card with `card` background
  - Chat-style messages: agent avatar (20px) + mono role label, then message text indented
  - Judge messages in `muted` color, user messages in `foreground` color
  - Scrollable when content grows
- **Bottom controls** (fixed/sticky):
  - Audio waveform bars (agent's role color)
  - Mic button: 52px circle, red gradient when recording, pulse ring animation
  - Status text: "Recording... tap to stop"
  - "Start over" text link + "Submit to the Court" button (disabled until enough intake)

### Courtroom Page (`/courtroom/[caseId]`)

**Layout**: Full-width, `grid-cols-[1fr_280px]` on desktop (grid + sidebar)

- **Header bar**: Logo + Case ID left, status badge ("In Session" green) + round counter right
- **Agent grid** (main area): `grid-cols-2` with 3 rows
  - Row 1: Prosecutor (left), Defender (right)
  - Row 2: Expert (left), Historian (right)
  - Row 3: Judge (col-span-2, full width)
  - Each panel:
    - Background: `card`, border: `border` (role-colored border when speaking)
    - Avatar (24px emoji orb) + name + waveform bars (when speaking, in role color)
    - Argument text: 4-line clamp, `muted` when idle, `muted` with role-colored border when active
- **Transcript sidebar** (right, hidden on mobile):
  - Mono label "Live Transcript"
  - Scrollable feed of argument entries
  - Each entry: small avatar (14px) + "ROLE · R{n}" mono label + argument text
- **Cross-exam dialog**: Modal overlay (existing Dialog component), themed to match
  - Judge's question, mic controls, textarea, submit

### Verdict Page (`/verdict/[caseId]`)

**Layout**: Centered single-column, max-width ~520px

- **Header bar**: Logo left, "Verdict Delivered" badge right
- **Judge avatar**: Centered 48px orb with glow shadow
- **Title**: "The Court Has Ruled"
- **Verdict card**: `card` background, divided into sections by `border` lines
  - **Ruling header**: "Ruling" mono label left, ruling badge right
    - Badges: "PROCEED" (green tint), "CONDITIONAL" (amber tint), "DO NOT PROCEED" (red tint)
  - **Key Factors**: Mono label + bulleted list with `muted` dot markers
  - **Conditions for Change**: Mono label + bulleted list with amber dot markers
  - **Dissent**: Mono label + italic quote with left border accent
- **Action buttons**: "View Past Cases" (outline) + "Bring Another Case" (solid)
- Fade-in animation for the card, stagger for internal sections

### History Page (`/history`)

**Layout**: Max-width container with padding

- **Header bar**: Logo left, "New Case" CTA right
- **Page heading**: "Case History" + subtitle
- **Detected Patterns card** (if patterns exist):
  - Mono label, horizontal row of pattern badges (role-colored pill badges)
- **Case grid**: `grid-cols-3` on desktop, `grid-cols-1` on mobile
  - Each card: date (mono/faint) + ruling badge (top row), case title (foreground/500), snippet (muted-dim, 2-line clamp)
  - Click opens detail sheet (existing Sheet component, themed)
- **Detail sheet** (slides from right):
  - Case title, ruling badge, full decision text, full verdict, transcript feed
- Stagger animation for card grid on mount

---

## New Dependencies

- `motion` — animation library (`npm install motion`). Import as `import { motion, AnimatePresence } from "motion/react"`

## Files to Create

- `components/landing/navbar.tsx`
- `components/landing/hero.tsx`
- `components/landing/court-panel.tsx` (Meet the Panel section)
- `components/landing/how-it-works.tsx`
- `components/landing/bottom-cta.tsx`
- `components/landing/footer.tsx`
- `components/shared/AgentAvatar.tsx` — reusable emoji gradient orb component

## Files to Modify

- `app/globals.css` — replace color system with Warm Charcoal palette, add new CSS animations, force dark mode
- `app/layout.tsx` — remove theme toggle, force dark, add Geist font setup
- `app/page.tsx` — replace with new landing page composing landing/ components
- `app/lobby/page.tsx` — restyle to match new theme
- `app/courtroom/[caseId]/page.tsx` — restyle panels, sidebar, header
- `app/verdict/[caseId]/page.tsx` — restyle verdict card and layout
- `app/history/page.tsx` — restyle case grid and detail sheet
- `components/shared/AgentBadge.tsx` — update colors to Warm Charcoal agent palette
- `components/shared/RulingBadge.tsx` — update ruling badge colors
- `components/shared/MicButton.tsx` — restyle to match theme
- `components/court/CourtroomLayout.tsx` — update grid styling
- `components/court/AgentPanel.tsx` — new panel design with avatar orbs, speaking border
- `components/court/ArgumentFeed.tsx` — update transcript entry styling
- `components/court/VerdictCard.tsx` — restyle sections
- `components/court/CrossExamDialog.tsx` — theme dialog
- `components/court/CaseHistoryCard.tsx` — new card style
- `components/court/AudioWaveform.tsx` — update colors
- `components/ui/button.tsx` — update variant colors
- `components/ui/card.tsx` — update base card colors
- `components/ui/badge.tsx` — update variant colors
- `components/ui/dialog.tsx` — update overlay/content colors
- `components/ui/sheet.tsx` — update overlay/content colors
- `components/theme-provider.tsx` — simplify to dark-only, remove toggle hotkey

## Out of Scope

- No changes to backend logic, API routes, or Cloudflare Workers
- No changes to voice/ElevenLabs integration logic
- No changes to hooks (useConvAI, useAudioPlayer, useDebateFeed, useCaseSession)
- No changes to data types or state management
- No new pages or routes

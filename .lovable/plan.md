

# Guided Player Setup: Card-Based Onboarding Experience

## Overview

Redesign the first-time user flow from a single animation that dumps users into settings, to a **card-based, one-question-at-a-time** onboarding that builds identity, creates emotional buy-in, and delivers an instant payoff.

## User Flow

```text
User Signs In (first time)
     ↓
Basketball Animation (existing, 5-7 sec)
     ↓
"Start My Journey" button
     ↓
Card 1: "Who's the hooper?" (name/nickname)
     ↓
Card 2: "How do you see yourself?" (role selection)
     ↓
Card 3: "What level are you playing at?" (level selection)
     ↓
Card 4: "What are you chasing?" (goals multi-select)
     ↓
Card 5: "Share with family?" (optional parent email)
     ↓
Transition: "Profile created. Season loading..."
     ↓
Dashboard with Coach AI welcome card
```

## Card Design Specifications

### Visual Layout (Each Card)
```text
+------------------------------------------+
|         ● ● ● ○ ○                        |  <- Progress dots
|                                          |
|    "How do you see yourself             |
|         on the court?"                   |  <- Question text
|                                          |
|  +----------+  +----------+              |
|  |    🏀    |  |    🎯    |              |  <- Tappable cards
|  |  Scorer  |  | Playmaker|              |
|  +----------+  +----------+              |
|                                          |
|  +----------+  +----------+              |
|  |    🛡️    |  |    🔥    |              |
|  | Lockdown |  |  Energy  |              |
|  +----------+  +----------+              |
|                                          |
+------------------------------------------+
```

### Card Content

| Card | Question | Input Type | Options |
|------|----------|------------|---------|
| 1 | "Who's the hooper?" | Text input | Name/nickname |
| 2 | "How do you see yourself on the court?" | Single tap cards | Scorer, Playmaker, Lockdown Defender, Energy Player |
| 3 | "What level are you playing at right now?" | Single tap cards | Middle School, Freshman/JV, Varsity, AAU/Club |
| 4 | "What are you chasing this season?" | Multi-select cards | More confidence, More minutes, Better stats, Better defense, Making the team, Just getting better |
| 5 | "Want to share this journey with family?" | Optional email input | Add parent email OR Skip |

## Technical Implementation

### New Files

| File | Purpose |
|------|---------|
| `src/components/OnboardingFlow.tsx` | Main card-based onboarding container |
| `src/components/onboarding/OnboardingCard.tsx` | Reusable animated card wrapper |
| `src/components/onboarding/IdentityCard.tsx` | Card 1 - Name input |
| `src/components/onboarding/RoleCard.tsx` | Card 2 - Court role selection |
| `src/components/onboarding/LevelCard.tsx` | Card 3 - Playing level selection |
| `src/components/onboarding/GoalsCard.tsx` | Card 4 - Season goals multi-select |
| `src/components/onboarding/FamilyCard.tsx` | Card 5 - Parent email (optional) |
| `src/components/onboarding/TransitionScreen.tsx` | "Season loading..." animation |
| `src/components/EmptyDashboardWelcome.tsx` | Coach AI welcome card for empty state |

### Modified Files

| File | Change |
|------|--------|
| `src/components/FirstLoginIntro.tsx` | Update to transition to onboarding flow instead of completing |
| `src/hooks/useFirstLogin.ts` | Add onboarding step tracking (intro_seen, onboarding_complete) |
| `src/pages/Index.tsx` | Add onboarding flow between intro and dashboard, show welcome state |
| `src/types/basketball.ts` | Add new profile fields (courtRole, playingLevel, seasonGoals, parentEmail) |
| `src/hooks/useCloudData.ts` | Update profile saving to include new fields |
| `tailwind.config.ts` | Add card-swipe and slide animations |

### Database Migration

Add new columns to `player_settings` table:

```sql
ALTER TABLE player_settings
ADD COLUMN IF NOT EXISTS court_role TEXT,
ADD COLUMN IF NOT EXISTS playing_level TEXT,
ADD COLUMN IF NOT EXISTS season_goals TEXT[],
ADD COLUMN IF NOT EXISTS parent_email TEXT,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;
```

## Component Design Details

### OnboardingFlow.tsx

Main orchestrator component that:
- Tracks current step (1-5)
- Manages form data state
- Handles step transitions with Framer Motion AnimatePresence
- Shows progress indicator (dots)
- Saves profile data on completion

```typescript
interface OnboardingData {
  name: string;
  courtRole: 'scorer' | 'playmaker' | 'defender' | 'energy';
  playingLevel: 'middle_school' | 'freshman_jv' | 'varsity' | 'aau_club';
  seasonGoals: string[];
  parentEmail?: string;
}
```

### Progress Indicator

```text
Step 1: ● ○ ○ ○ ○
Step 2: ● ● ○ ○ ○
Step 3: ● ● ● ○ ○
Step 4: ● ● ● ● ○
Step 5: ● ● ● ● ●
```

### Card Animations

Using Framer Motion for smooth transitions:

```typescript
const cardVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0
  })
};
```

### Role Selection Cards (Card 2)

```typescript
const roles = [
  { id: 'scorer', icon: '🏀', label: 'Scorer', description: 'Put the ball in the bucket' },
  { id: 'playmaker', icon: '🎯', label: 'Playmaker', description: 'Set up teammates for success' },
  { id: 'defender', icon: '🛡️', label: 'Lockdown Defender', description: 'Shut down the opposition' },
  { id: 'energy', icon: '🔥', label: 'Energy Player', description: 'Hustle and heart every play' },
];
```

### Level Selection Cards (Card 3)

```typescript
const levels = [
  { id: 'middle_school', label: 'Middle School', subtext: 'Grades 6-8' },
  { id: 'freshman_jv', label: 'Freshman / JV', subtext: 'High school development' },
  { id: 'varsity', label: 'Varsity', subtext: 'Top high school level' },
  { id: 'aau_club', label: 'AAU / Club', subtext: 'Travel & competitive ball' },
];
```

### Goals Multi-Select (Card 4)

```typescript
const goals = [
  { id: 'confidence', label: 'More confidence', icon: '💪' },
  { id: 'minutes', label: 'More minutes', icon: '⏱️' },
  { id: 'stats', label: 'Better stats', icon: '📊' },
  { id: 'defense', label: 'Better defense', icon: '🛡️' },
  { id: 'make_team', label: 'Making the team', icon: '✅' },
  { id: 'improve', label: 'Just getting better', icon: '📈' },
];
```

### Empty Dashboard Welcome (EmptyDashboardWelcome.tsx)

When user completes onboarding but has no games:

```text
+------------------------------------------+
|                                          |
|    🏀 Coach AI                           |
|                                          |
|    "First game hasn't been logged yet —  |
|     but every season starts somewhere.   |
|     Let me know when you're ready."      |
|                                          |
|    [ Log First Game ]  [ Pregame Talk ]  |
|                                          |
+------------------------------------------+
```

## First Login Hook Updates

```typescript
// src/hooks/useFirstLogin.ts
interface FirstLoginState {
  showIntro: boolean;      // Show basketball animation
  showOnboarding: boolean; // Show card-based setup
  loading: boolean;
}

export function useFirstLogin() {
  // Check localStorage keys:
  // - hoopjournal_intro_seen (animation watched)
  // - hoopjournal_onboarding_complete (setup finished)
  
  const completeIntro = () => {
    localStorage.setItem('hoopjournal_intro_seen', 'true');
    // Now show onboarding
  };
  
  const completeOnboarding = () => {
    localStorage.setItem('hoopjournal_onboarding_complete', 'true');
    // Now show dashboard
  };
}
```

## Animation Additions (tailwind.config.ts)

```typescript
keyframes: {
  "card-slide-in": {
    "0%": { transform: "translateX(100%)", opacity: "0" },
    "100%": { transform: "translateX(0)", opacity: "1" }
  },
  "card-slide-out": {
    "0%": { transform: "translateX(0)", opacity: "1" },
    "100%": { transform: "translateX(-100%)", opacity: "0" }
  },
  "option-pop": {
    "0%": { transform: "scale(0.8)", opacity: "0" },
    "100%": { transform: "scale(1)", opacity: "1" }
  },
  "dot-fill": {
    "0%": { backgroundColor: "transparent" },
    "100%": { backgroundColor: "hsl(var(--primary))" }
  },
  "loading-pulse": {
    "0%, 100%": { opacity: "0.4" },
    "50%": { opacity: "1" }
  }
}
```

## Transition Screen Design

After Card 5, before dashboard:

```text
+------------------------------------------+
|                                          |
|              [Basketball]                |
|            (brief bounce)                |
|                                          |
|     "Profile created. Season loading…"   |
|                                          |
|         [Loading bar animation]          |
|                                          |
+------------------------------------------+
```

Duration: 2-3 seconds with animated progress bar

## Summary of Changes

| Aspect | Implementation |
|--------|----------------|
| Detection | Separate flags for intro_seen and onboarding_complete |
| Card Flow | 5 cards with swipe/tap navigation |
| Progress | Dot indicator at top of each card |
| Animations | Framer Motion for card transitions |
| Data | New profile fields for role, level, goals |
| Payoff | Coach AI welcome card on empty dashboard |
| Style | 2K/Duolingo-inspired, fun not form-like |

## Files Summary

**New Files (9):**
- `src/components/OnboardingFlow.tsx`
- `src/components/onboarding/OnboardingCard.tsx`
- `src/components/onboarding/IdentityCard.tsx`
- `src/components/onboarding/RoleCard.tsx`
- `src/components/onboarding/LevelCard.tsx`
- `src/components/onboarding/GoalsCard.tsx`
- `src/components/onboarding/FamilyCard.tsx`
- `src/components/onboarding/TransitionScreen.tsx`
- `src/components/EmptyDashboardWelcome.tsx`

**Modified Files (6):**
- `src/components/FirstLoginIntro.tsx`
- `src/hooks/useFirstLogin.ts`
- `src/pages/Index.tsx`
- `src/types/basketball.ts`
- `src/hooks/useCloudData.ts`
- `tailwind.config.ts`

**Database Migration:**
- Add columns: court_role, playing_level, season_goals, parent_email, onboarding_completed_at


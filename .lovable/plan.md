
# Grade-Based Coaching Style for Coach AI

## Overview
Implement dynamic coaching feedback based on the player's grade level. Players in 8th grade and below will receive encouraging, positive reinforcement focused on improvement areas. Players in 9th grade and above will receive honest, direct, and critical feedback about their performance.

## How It Will Work

| Grade Level | Coaching Style |
|-------------|----------------|
| 6th - 8th Grade | Positive reinforcement, encouraging tone, focus on "areas to work on" rather than criticism |
| 9th - 12th Grade | Direct, honest feedback, constructive criticism, no sugar-coating |

## Implementation Steps

### 1. Pass Profile to CoachChat Component
Update the Index page to pass the player profile (which contains grade) to the CoachChat component.

### 2. Send Grade to Edge Function
Modify the CoachChat component to include the player's grade in the API request payload.

### 3. Server-Side Grade Verification (Security)
For added security, the edge function will:
- Accept the grade from the client as a hint
- Optionally verify against the `player_settings` table using the authenticated user's ID
- This prevents users from spoofing their grade to get different responses

### 4. Dynamic System Prompt
The edge function will use a different coaching persona based on grade:

**For 8th Grade and Below:**
```text
COACHING STYLE:
- Always start with something positive
- Frame areas for improvement as "things to work on" 
- Use encouraging language ("You're getting better at...", "Keep practicing...")
- Focus on effort and growth, not just results
- Celebrate progress, no matter how small
- Be a supportive mentor who believes in their potential
```

**For 9th Grade and Above:**
```text
COACHING STYLE:
- Be direct and honest - players need truth, not flattery
- Call out poor performance and bad habits directly
- Provide specific, actionable criticism
- Don't soften feedback - serious players want real coaching
- It's okay to be tough when the stats warrant it
- Treat them like athletes preparing for the next level
```

---

## Technical Details

### File Changes

#### 1. `src/pages/Index.tsx`
- Pass `profile` prop to `CoachChat` component

#### 2. `src/components/CoachChat.tsx`
- Add `profile` to component props
- Include `playerGrade` in the API request body

#### 3. `supabase/functions/coach-chat/index.ts`
- Add helper function to determine if grade is "young" (8th and below)
- Fetch grade from `player_settings` table for verified grade
- Create two distinct coaching style prompts
- Select appropriate prompt based on grade level

### Grade Detection Logic
```typescript
function isYoungPlayer(grade: string): boolean {
  const youngGrades = ['6th grade', '7th grade', '8th grade'];
  return youngGrades.includes(grade.toLowerCase());
}
```

### Example Responses

**Same stats, different grades:**

*8th Grader (12 points, 5 turnovers):*
> "Nice job getting 12 points! You're showing confidence in taking shots. I noticed you had 5 turnovers - that's something we can work on together. Try this drill: practice keeping your dribble low and protecting the ball with your off-hand. You're improving every game!"

*10th Grader (12 points, 5 turnovers):*
> "12 points is decent but 5 turnovers is a problem. That's nearly a 1:2 assist-to-turnover ratio which won't cut it at the varsity level. You're giving away possessions that could be points. Focus on: 1) Making the simple pass, 2) Not forcing plays in traffic. Your decision-making needs work."

---

## Security Considerations
- Grade is verified server-side using the authenticated user's ID
- The `player_settings` table already has RLS policies protecting user data
- Client-provided grade is only used as a fallback if database lookup fails

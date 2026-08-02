# 2026 Summer Retreat Escape Room App

## Overview

This application is a mobile-first onboarding experience for a church summer retreat escape room.

The onboarding should feel like:

- mysterious
- dark archive system
- abandoned records
- hidden signal
- system recovery
- quiet tension
- minimal cyber interface

Do NOT create a colorful game UI.

Do NOT use fantasy game assets.

The interface should feel like an encrypted archive system that has just been restored.

---

# Design Principles

## Mood

Keywords:

- archive
- signal
- darkness
- recovery
- hidden records
- booting
- access granted

References:

- terminal UI
- archive database
- sci-fi system startup
- low brightness
- minimalist storytelling
- premium mobile onboarding
- soft cinematic glow
- restored archive app surface

---

# Platform

Mobile First

Target Frame

```css
width: 390px;
height: 844px;
```

Use:

```css
min-height: 100vh;
```

---

# Color Tokens

```css
:root {
  --bg-black: #000000;
  --bg-screen: #020406;
  --bg-surface: #07090C;
  --bg-surface-soft: #0B0F14;

  --text-primary: #D7DEE8;
  --text-secondary: #8A929F;
  --text-muted: #4F5661;

  --line-subtle: rgba(255,255,255,0.08);

  --accent-green: #9AF0C3;
  --accent-lime: #C9FF3D;
  --accent-blue: #9DDFFF;
  --accent-purple: #A970FF;
  --accent-mint: #8EF5D4;

  --success: #9AF0C3;

  --glow-blue: rgba(85, 138, 255, 0.22);
  --glow-purple: rgba(169, 112, 255, 0.18);
  --glow-mint: rgba(142, 245, 212, 0.16);
  --glow-lime: rgba(201, 255, 61, 0.14);

  --gradient-top-glow:
    radial-gradient(circle at 50% 0%, rgba(157,223,255,0.20) 0%, rgba(157,223,255,0.00) 42%),
    radial-gradient(circle at 20% 8%, rgba(169,112,255,0.14) 0%, rgba(169,112,255,0.00) 36%);

  --gradient-card-surface:
    linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.00) 100%),
    radial-gradient(circle at top right, rgba(157,223,255,0.10) 0%, rgba(157,223,255,0.00) 42%),
    radial-gradient(circle at bottom left, rgba(169,112,255,0.08) 0%, rgba(169,112,255,0.00) 38%),
    #07090C;

  --gradient-button-glow:
    linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.00) 100%),
    var(--accent-green);
}
```

Direction:

- Keep the overall screen black-first and archive-focused.
- Add soft glow only as a supporting atmosphere, not as a dominant colorful layer.
- Use blue, purple, mint, and lime as faint recovery light, never as loud UI chrome.
- Avoid flat pure-black cards with no depth; surfaces should feel restored, cold, and slightly luminous.

---

# Typography

## Korean Story Text

Use for:

- narrative
- story description
- onboarding content

```css
font-family: Pretendard;
font-size: 18px;
font-weight: 300;
line-height: 180%;
letter-spacing: 0px;
```

Example:

```txt
몇 년 전...

장성교회 청소년부의 학생들이
갑자기 사라졌다.
```

---

## English System Text

Use for:

- boot sequence
- counters
- status labels
- loading text

```css
font-family: "DM Mono";
font-size: 13px;
font-weight: 400;
line-height: 19.5px;
letter-spacing: 2.6px;
text-transform: uppercase;
```

Example:

```txt
SYSTEM BOOTING...

SEARCHING SIGNAL...

LAST SIGNAL FOUND

AUTHORIZED ACCESS GRANTED
```

---

# Layout

## Screen Structure

```txt
┌─────────────────┐
│                 │
│                 │
│                 │
│ Story Area      │
│                 │
│                 │
│                 │
│                 │
│ Progress Area   │
└─────────────────┘
```

Padding:

```css
padding-left: 24px;
padding-right: 24px;
```

---

# Story Screen

## Structure

```txt
01 / 04

몇 년 전...

장성교회 청소년부의 학생들이
갑자기 사라졌다.


●━━━━○○○

터치하여 계속
```

Visual Atmosphere:

- Maintain a pure black archive mood.
- Add a soft glow wash near the top area of the screen.
- The glow should feel cinematic and premium, not playful.
- Glow must stay blurred, low contrast, and partially hidden by darkness.

Suggested Background Layer:

```css
background:
  var(--gradient-top-glow),
  linear-gradient(180deg, var(--bg-screen), var(--bg-surface));
```

---

## Counter

```css
font-family: "DM Mono";
font-size: 9px;
letter-spacing: 0.12em;
color: var(--text-muted);
```

Position:

```css
margin-bottom: 24px;
```

---

## Story Content

```css
display: flex;
flex-direction: column;
justify-content: flex-end;
```

---

## Bottom Area

Position:

```css
position: absolute;
bottom: 52px;
left: 0;
right: 0;
```

Alignment:

```css
display: flex;
flex-direction: column;
align-items: center;
gap: 8px;
```

---

# Progress Indicator

Inactive Dot

```css
width: 4px;
height: 4px;
border-radius: 999px;
background: #2F3540;
```

Active Dot

```css
width: 18px;
height: 4px;
border-radius: 999px;
background: var(--accent-lime);
```

Gap

```css
4px
```

---

# Continue Text

```css
font-family: "DM Mono";
font-size: 9px;
letter-spacing: 0.22em;
color: var(--text-muted);
text-transform: uppercase;
```

Text:

```txt
터치하여 계속
```

---

# Boot Sequence Screen

## Layout

```css
display: flex;
align-items: center;
min-height: 100vh;
padding-left: 24px;
padding-right: 24px;
```

---

## Boot Text Group

```css
display: flex;
flex-direction: column;
gap: 14px;
```

---

## Default Line

```css
font-family: "DM Mono";
font-size: 13px;
letter-spacing: 2.6px;
color: var(--text-muted);
```

---

## Highlight Line

Signal Found

```css
color: var(--accent-blue);
```

Access Granted

```css
color: var(--accent-green);
```

---

# Final Start Screen

## Structure

```txt
SYSTEM BOOTING...

SEARCHING SIGNAL...

LAST SIGNAL FOUND

AUTHORIZED ACCESS GRANTED


──────────────────

탐색팀으로 접속합니다.


[ START ]
```

---

# Divider

```css
height: 1px;
background: var(--line-subtle);
```

---

# Description

```css
font-family: Pretendard;
font-size: 12px;
font-weight: 300;
line-height: 180%;
text-align: center;
color: var(--text-muted);
```

---

# Start Button

```css
width: 100%;
height: 48px;

border: none;
border-radius: 8px;

background: var(--gradient-button-glow);

color: #00160A;

font-family: "DM Mono";
font-size: 10px;
font-weight: 700;
letter-spacing: 0.28em;

box-shadow:
  0 0 0 1px rgba(0, 22, 10, 0.12),
  0 0 24px rgba(154, 240, 195, 0.14);
```

Button Label

```txt
[ START ]
```

Button Direction:

- Keep the existing mint identity.
- Add only a subtle soft glow, not a glossy or neon effect.
- The button should feel like an approved access control, not a game CTA.

---

# Archive System Home

## Mood

- restored archive hub
- quiet mobile interface
- premium dark surface
- locked file cabinet energy
- soft atmospheric light

Important:

- Do not turn this into a dashboard or admin console.
- Do not add tables, charts, sidebars, or complex system widgets.
- This is a mobile archive app surface, not a control room.

## Archive Card Style

Archive cards should feel like sealed records that still hold faint recovered light.

```css
border: 1px solid rgba(255,255,255,0.08);
border-radius: 12px;
background: var(--gradient-card-surface);
box-shadow: none;
```

Hover / Focus:

```css
box-shadow:
  0 0 18px rgba(154, 240, 195, 0.08),
  0 0 30px rgba(157, 223, 255, 0.04);
```

Direction:

- No heavy shadows.
- No bright neon outline.
- Use a dark gradient surface with very subtle internal light.
- Cards should look slightly colder and more premium than a flat black rectangle.
- Each card should feel like a locked file containing dormant signal residue.

## Locked State

Locked cards should still look beautiful, but quieter.

```css
opacity: 0.5;
color: var(--text-muted);
```

Locked Style Rules:

- Keep the gradient surface, but reduce its visibility.
- Show a lock indicator or locked system label.
- Text should appear dimmed rather than disabled in a cheap UI sense.
- The card should feel inaccessible, not inactive.

## Unlocked State

Only `ARCHIVE #01` is available at first.

Use:

```css
color: var(--text-primary);
```

Status Highlight:

```css
color: var(--success);
```

Unlocked Direction:

- Slightly clearer text contrast
- Slightly more visible glow response on tap / hover
- Still restrained and minimal

## Archive Surface Background

The archive hub should remain black overall, but it should not feel empty.

Suggested screen treatment:

```css
background:
  radial-gradient(circle at 50% -10%, rgba(157,223,255,0.16) 0%, rgba(157,223,255,0) 38%),
  radial-gradient(circle at 80% 0%, rgba(169,112,255,0.10) 0%, rgba(169,112,255,0) 32%),
  #000000;
```

Direction:

- Keep the archive mood dominant.
- Let the glow feel like hidden restored energy behind the interface.
- Never let the screen become bright, colorful, or glossy.

---

# Animation

Keep animations subtle.

Avoid flashy motion.

Use:

```css
opacity: 0 → 1
translateY: 4px → 0
duration: 600ms
```

Boot sequence should appear line-by-line.

Recommended delay:

```css
500ms ~ 800ms
```

between each line.

Archive cards should fade in sequentially.

Recommended delay:

```css
300ms between cards
```

Do not animate cards with bounce, scale pop, or flashy motion.

---

# Development Rules

Use:

- React
- Vite
- TypeScript

Do NOT use:

- Ant Design
- Material UI
- Bootstrap

Create custom components only.

Keep implementation visually identical to the Figma onboarding screens.

When updating visual polish, preserve:

- Pretendard for Korean content
- DM Mono for system labels
- black archive atmosphere
- restrained interface density

Priority:

1. Layout accuracy
2. Typography accuracy
3. Spacing accuracy
4. Animation accuracy
5. Responsive behavior

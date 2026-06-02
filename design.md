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

  --text-primary: #D7DEE8;
  --text-secondary: #8A929F;
  --text-muted: #4F5661;

  --line-subtle: rgba(255,255,255,0.08);

  --accent-green: #9AF0C3;
  --accent-lime: #C9FF3D;
  --accent-blue: #9DDFFF;

  --success: #9AF0C3;
}
```

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

장성교회 청년부의 청년들이
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

장성교회 청년부의 청년들이
갑자기 사라졌다.


●━━━━○○○

터치하여 계속
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

background: var(--accent-green);

color: #00160A;

font-family: "DM Mono";
font-size: 10px;
font-weight: 700;
letter-spacing: 0.28em;
```

Button Label

```txt
[ START ]
```

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

Priority:

1. Layout accuracy
2. Typography accuracy
3. Spacing accuracy
4. Animation accuracy
5. Responsive behavior

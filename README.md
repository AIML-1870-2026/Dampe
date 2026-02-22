# Readable — WCAG Color Contrast Checker

A web-based tool for testing color combinations against WCAG (Web Content Accessibility Guidelines) standards. Check contrast ratios, see pass/fail compliance levels, and simulate how color combinations appear to users with different types of color vision deficiency.

## Features

- **RGB Sliders** — Real-time color mixing for text and background colors
- **Color Presets** — 10 common color combinations to start from
- **WCAG Compliance** — Instant pass/fail for AA and AAA levels (normal and large text)
- **Contrast Ratio** — Accurate calculation using the WCAG relative luminance formula
- **Font Controls** — Adjust size (12–72px), family, and weight to test large-text thresholds
- **Color Blindness Simulation** — Side-by-side preview for Protanopia, Deuteranopia, Tritanopia, and Tritanomaly
- **Editable Sample Text** — Type your own text to preview

## Tech Stack

- React 19 + Vite
- Tailwind CSS v3

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## WCAG Standards Reference

| Level | Normal Text | Large Text (≥18pt or bold ≥14pt) |
|-------|-------------|----------------------------------|
| AA    | ≥ 4.5:1     | ≥ 3:1                            |
| AAA   | ≥ 7:1       | ≥ 4.5:1                          |

Luminance is calculated per the [WCAG 2.1 relative luminance definition](https://www.w3.org/TR/WCAG21/#dfn-relative-luminance).

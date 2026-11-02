# Munim prototype

A navigable prototype of Munim (WhatsApp + app) with a fictional household. Spec: `../SPEC.md` (source of truth).

## Scripts

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Local dev server (Vite) at `/munim/` |
| `npm run build` | Type-check (`tsc -b`, includes `scripts/`) and build to `dist/` |
| `npm run preview` | Serve the built `dist/` |
| `npm run tieout` | QA: derived numbers (SPEC 2), formatting helpers, persona dates, copy guard. Exits non-zero on any failure |

## Layout

- `src/data/persona.ts`: persona data, parts only. `src/data/derived.ts`: every total, computed.
- `src/lib/format.ts`: `fmtINR` (₹1,23,456), `fmtLakh` (₹4.2 L, ₹1.2 Cr), `fmtDate` (Thu 5 Nov), `fmtTime` (9:14 am), all IST.
- `src/store.ts`: one zustand store, plain setters. `src/types.ts`: SPEC 4 objects.
- `src/copy/`: all user-facing strings. `src/frames/`: phone frame, surfaces, layouts. `src/screens/`: the five tabs. `src/components/`: small shared pieces.
- Routing is the URL hash: `#m=4&s=app&t=money` (moment, surface, tab). `base` is `/munim/` for GitHub Pages.

## Rules

- Never type a total; add a selector in `derived.ts` and a check in `scripts/tieout.ts`.
- No em or en dashes and no emoji in copy (the tie-out scans `src/`).
- Amounts use tabular numerals (`.num`). `fmtLakh` puts a no-break space before "L" and "Cr".

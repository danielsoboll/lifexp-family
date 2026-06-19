<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Zeitzone

Kalendertage und Uhrzeiten für deutsche Nutzer über **Europe/Berlin** (`lib/cetDate.ts`):

- Tageslogik zentral über `getLocalDateKey()` (Alias: `cetToday`, `cetYesterday`, …)
- Aktiver Ansichtstag über `getActiveEventDate()` / `todayEventDate()`
- Keine UTC-`toISOString()`-Tageskeys, keine feste UTC+1-Offset-Logik

## Produktions-Domain (life-xp.de)

Beim **ersten** Besuch auf `life-xp.de` / `www.life-xp.de` wird alter LifeXP-`localStorage` und Session-Cookies gelöscht (Theme bleibt). Marker: `lifexp_life_xp_de_initialized`. Logik: `lib/productionDomainFreshStart.ts` — Inline-Script in `app/layout.tsx` vor dem Cookie-Bootstrap.

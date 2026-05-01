# F1 Info — Workspace

## Overview

pnpm workspace monorepo: Express API server (artifact `api-server`) + Expo React Native mobile app (artifact `mobile`). French-language F1 app with dark theme.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 (esbuild bundled ESM)
- **Mobile**: Expo SDK 54 + expo-router + TanStack Query
- **Data**: Jolpica/Ergast API (F1 results) + OpenF1 API (FP session laps)
- **News**: RSS/Atom aggregator with auto-translation to French (RacingNews365, Motorsport.com, JérémF1)

## Artifacts

### `api-server` (port 8080, path `/api`)
- Express 5 server bundled with esbuild
- `src/lib/jolpica.ts` — Jolpica/Ergast F1 data (standings, results, calendar)
- `src/lib/openf1.ts` — OpenF1 API (driver photos + FP lap results via best lap per driver)
- `src/lib/news/` — RSS/Atom fetcher + French translator + 10-min refresh scheduler
- `src/routes/f1.ts` — All F1 endpoints (GPS, standings, stats, sessions, FP results)
- `src/routes/news.ts` — News endpoints

### `mobile` (port 18115, path `/`)
- Expo React Native, dark-only, Inter fonts, French UI
- `lib/f1.ts` — API client (uses `EXPO_PUBLIC_DOMAIN` env)
- `lib/notifications.ts` — Session start/end notifications
- `lib/podiumSeen.ts` — AsyncStorage for podium celebration tracking
- `app/(tabs)/` — 4 tabs: Grands Prix, Classements, Actus, Stats
- `app/gp/[id].tsx` — GP detail (sessions list)
- `app/gp/[id]/[session].tsx` — Session results (FP1/FP2/FP3/Quali/Sprint/Race)
- `components/PodiumGate.tsx` — Auto-shows podium celebration for new results
- `constants/colors.ts` — Dark F1 theme (primary: #e10600)

## Key Improvements vs Original

1. **FP results via OpenF1**: Practice sessions (EL1/EL2/EL3) now show real lap results using the OpenF1 laps API — best lap per driver, sorted by time
2. **Regular updates**: 1-min cache during live sessions, 5-min for recent, 1-hour for old data; mobile refetches every 1-5 min

## Key Commands

- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/mobile run dev` — run Expo dev server

See the `pnpm-workspace` skill for workspace structure details.

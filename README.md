# G.A.M.E. — Gambling Awareness Manic Education

G.A.M.E. is a browser-based, **no-real-money** educational prototype designed to help people notice gambling-related design patterns and practice safer next steps. It is not a gambling product, treatment program, crisis service, diagnosis, or clinical record.

The application uses fictional credits and guided simulations to introduce concepts such as rapid play, loss chasing, salient wins, and payment friction. Progress is earned through reflections, learning checks, and calming alternatives—not bets or wins.

## What it includes

- Guided, fictional simulations for Roulette, Color Game, Blackjack, Poker, and Tong-its.
- A required onboarding safety acknowledgement before access to simulations.
- Time-bounded simulation sessions that shorten as awareness mastery grows and retire at graduation.
- Educational interventions for simulated purchase attempts, large wins, rapid play, and chasing losses.
- Calming alternatives: paced breathing, grounding, pattern activity, and urge surfing.
- A fictional wallet that deliberately blocks payment entry and opens a payment-barrier lesson instead.
- A local counselor-conversation report with user-selected reflections, JSON download, and print/PDF support.
- Accessibility and privacy controls for reduced motion, calm visual intensity, higher contrast, light/dark themes, sound, and resetting local data.

## Technology

- React 19 + TypeScript
- Vite
- Vitest, Testing Library, and jsdom
- ESLint
- Browser `localStorage` for local-only persistence

## Getting started

### Prerequisites

Install a current Node.js and npm environment. This project includes a `package-lock.json`; it does not declare a specific Node.js engine version.

### Install and run

```bash
npm ci
npm run dev
```

Use `npm install` instead of `npm ci` if you are intentionally updating dependencies.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Type-check the project and create a production build. |
| `npm run test` | Run the Vitest test suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run typecheck` | Run TypeScript checking without emitting files. |
| `npm run lint` | Run ESLint with zero warnings allowed. |

For a typical verification pass:

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

## Project structure

```text
src/
  components/       User-facing screens, simulations, interventions, report, and controls
  domain/           State, storage, educational content, reporting, RNG, and game rules
  domain/games/     Pure game-rule modules and their tests
  test/             Test setup
  App.tsx           Application shell and navigation
  useAppState.ts    Reducer-backed local state hook
  styles.css        Global styles and theme tokens
docs/
  theme-contrast.md Light-theme WCAG contrast measurements and scope notes
.kiro/
  agents/           Workspace custom-agent configurations
  prompts/          Workspace prompt configurations
```

## Safety, privacy, and scope

- **No real money:** Credits, wallet entries, purchases, chips, results, and reports are fictional. The application does not accept payments or financial credentials.
- **Local-only:** Progress, settings, events, reflections, and the fictional ledger are stored in the current browser's `localStorage`. There are no accounts, cloud sync, analytics, or server-side API in this prototype.
- **User-controlled reports:** Reports are generated locally. Reflections are included only when the user explicitly opts in; users should review them before printing or downloading, particularly on shared devices.
- **Educational prototype:** Content is provisional and should be reviewed by relevant clinical and Filipino cultural experts before any broader use. It is not a substitute for professional support or emergency assistance.
- **Quick exit:** The app's quick-exit control navigates to a blank page; it does not connect users with support services.
- **Accessibility scope:** Light-theme contrast measurements and automated token tests are documented in [docs/theme-contrast.md](docs/theme-contrast.md). Fixed-palette game visuals are outside that specific theme-token measurement scope.

## Development notes

The app separates UI components from the domain layer so game rules, intervention detection, state transitions, local persistence, and report generation can be tested independently. The repository includes tests for the application flow, theme tokens, domain logic, interventions, reports, storage, and each simulation rule module.

## License

No license has been specified for this repository.

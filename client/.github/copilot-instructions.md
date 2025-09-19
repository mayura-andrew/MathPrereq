### MathPrereq — AI contributor quick-start

This repository is a small Vite + React + TypeScript client application. The goal of this document is to help automated coding agents be immediately productive by highlighting the project's structure, workflows, and conventions.

Key facts

- Entrypoint: `src/main.tsx` renders `src/App.tsx` (basic Vite React template).
- Build/dev commands are declared in `package.json` scripts:
  - `pnpm dev` (or `npm run dev`) — starts Vite dev server with HMR
  - `pnpm build` — runs `tsc -b` (type-check/build references) then `vite build`
  - `pnpm preview` — preview the production build
  - `pnpm lint` — run ESLint across the repo
- TypeScript config uses project references: `tsconfig.json` points to `tsconfig.app.json` (app sources) and `tsconfig.node.json` (tooling like `vite.config.ts`). `build` runs `tsc -b` so prefer respecting those configs when editing types.

Architecture & conventions

- Small single-page UI. No backend code present in this repo. Expect changes to primarily affect `src/`.
- Use React + hooks and JSX in `.tsx` files. Examples: `src/App.tsx` uses `useState` for local state and imports static assets under `src/assets`.
- Vite config is in `vite.config.ts` and uses `@vitejs/plugin-react-swc` for fast refresh. Prefer edits that are compatible with ES module syntax.
- CSS lives in `src/*.css` (e.g., `App.css`, `index.css`). Static public assets may appear in `public/` (e.g., `vite.svg`).

Developer workflows (explicit)

- Start dev server: `pnpm dev` (or `npm run dev`). Vite provides HMR — modify `src/App.tsx` to verify fast refresh.
- Full type-checked production build: `pnpm build`. This runs `tsc -b` first — if you add new paths or change tsconfig references, update `tsconfig.*.json` accordingly.
- Linting: `pnpm lint` runs ESLint. Follow existing ESLint rules; there is an `eslint.config.js` at the repo root.

Patterns and pitfalls for automated edits

- Prefer non-breaking, incremental changes. This project runs strict TypeScript (`strict: true`) and several no-unused checks — remove unused imports/vars or update tsconfig if intentionally keeping them.
- Module resolution is set for bundler mode in `tsconfig.app.json` (`moduleResolution: "bundler"`) — when adding imports prefer explicit file extensions only when necessary (Vite supports extensionless imports for ts/tsx in many cases, but configs allow importing `.ts` extensions).
- `noEmit: true` in tsconfigs: TypeScript is used for checking only; bundling is handled by Vite. Don't rely on emitted JS files from `tsc` locally.

Integration points & external dependencies

- UI libraries used: `@mui/material`, `@emotion/react`, `@emotion/styled`. If adding components, follow MUI conventions and keep styles isolated in component CSS/TSX files.
- Build tooling: `vite`, `@vitejs/plugin-react-swc`. Avoid plugin changes unless necessary for a feature.

When creating PRs

- Keep changes minimal and focused per PR. Run `pnpm build` locally to ensure `tsc -b` and `vite build` pass.
- Run `pnpm lint` and fix ESLint/type errors before opening a PR.
- Update `README.md` only for user-facing or workflow changes.

Files to reference when implementing changes

- `package.json` — scripts and main deps
- `tsconfig.app.json`, `tsconfig.node.json` — compiler options and includes
- `vite.config.ts` — dev/build behavior and plugins
- `src/main.tsx`, `src/App.tsx` — app entry and main UI example
- `eslint.config.js` — linting rules to follow

If any of the above is unclear, ask for the missing context (e.g., CI details, monorepo links, or backend repos). Provide one small runnable change first (e.g., add a new component and update App.tsx) so maintainers can review style and build behavior.

End of agent guidance.

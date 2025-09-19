# MathPrereq — Frontend (Vite + React + TypeScript)

Minimal project skeleton and recommended structure for the MathPrereq research frontend.

## Quick start
1. Install deps: `pnpm install` (or `npm install`)
2. Dev server: `pnpm dev`
3. Build: `pnpm build`

## Key files
- `index.html` — Vite entry
- `src/main.tsx` — React entry
- `src/App.tsx` — Top-level app
- `src/pages/*` — Page-level components
- `src/components/*` — Reusable UI components
- `src/hooks/*` — Client hooks (e.g., API calls, caching)
- `src/api/*` — API client wrappers
- `src/types/*` — Shared TypeScript types

## API integration
- Uses `VITE_API_BASE_URL` environment variable (default: `http://localhost:8080/api/v1`)
- Main backend endpoints to use:
  - `POST /concept-query`
  - `GET /resources/concept/{concept}`
  - `GET /health`

## Suggested improvements
- Add React Query for caching and retries.
- Add MUI components (already in package.json).
- Add tests under `src/__tests__`.
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

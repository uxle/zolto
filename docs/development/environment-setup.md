# Environment Setup

## Requirements

| Tool | Version | Purpose |
| :--- | :------ | :------ |
| Node.js | 20 LTS | Runtime, test runner, dev server |
| Git | 2.40+ | Version control |
| A modern browser | Chrome 120+ | Testing the Studio UI |

## Setup

```bash
git clone https://github.com/zolto/zolto.git
cd zolto
npm ci --ignore-scripts      # install dev tools (eslint, prettier, serve)
node tests/run-all.js        # verify 233/233 pass before making changes
node scripts/dev.js          # open http://localhost:3000
```

## Editor

Any editor works. Recommended VS Code extensions:

- **ESLint** — `dbaeumer.vscode-eslint`
- **Prettier** — `esbenp.prettier-vscode`
- **Zolto Syntax** — coming in Phase 5 (VS Code LSP extension)

## Running tests

```bash
node tests/run-all.js        # full suite
node --input-type=module < tests/run-all.js   # alternative
```

All 233 tests across 31 suites must pass before any PR is merged.

# Security Policy

disky is installed globally (`npm i -g @ishk9/disky`) and **deletes files** on the
user's machine. We take its safety and supply-chain integrity seriously.

## Reporting a vulnerability

Please report security issues privately rather than opening a public issue:

- Open a [GitHub Security Advisory](https://github.com/security/advisories) on the
  repository, or
- Email the maintainer (see `package.json` / npm profile).

Include reproduction steps and the disky version (`disky --version`). We aim to
acknowledge within 72 hours.

## Safety model

disky is built to never destroy data it cannot prove is safe to remove:

- **Protected paths** — the disky runtime itself and known toolchain directories
  (nvm, fnm, volta, npm/pnpm/yarn global prefixes, npx package trees) are classified
  `locked` and never auto-removed. See `src/core/ProtectedPaths.ts` and
  `src/core/CleanPolicy.ts`.
- **Clean policy** — every entry is classified `auto` / `inspect` / `locked` with a
  human-readable reason before any deletion is offered.
- **Dry-run** — destructive commands support `--dry-run` to preview without modifying
  anything.
- **Audit trail** — destructive operations are appended to `~/.disky/operations.log`
  (disable with `DISKY_NO_OPLOG=1`).
- **Confirmation** — interactive confirmation is required before removal; `--force` is
  needed to override a `locked` classification.

## Supply chain

- CI runs **gitleaks** on every push/PR to prevent secrets (including npm tokens) from
  entering the repo or a published tarball.
- The published package ships only `dist/` (see `files` in `package.json`).
- Auth tokens live only in the user's global `~/.npmrc`, never in the repo. `.npmrc` is
  gitignored.

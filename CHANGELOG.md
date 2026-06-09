# Changelog

All notable changes to disky are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Clean safety policy with protected-path guarding (`auto`/`inspect`/`locked`
  classification with human-readable reasons).
- Engineering foundation: committed test suite, GitHub Actions CI (typecheck, lint,
  format, test+coverage, build, gitleaks secret scan), ESLint + Prettier, vitest coverage
  thresholds, pre-commit hook, `SECURITY.md`, `CONTRIBUTING.md`.
- Competitive analysis vs. mole and a UX improvement guide under `docs/`.

### Changed

- `npm run lint` now runs ESLint (was `tsc --noEmit`, now `npm run typecheck`).
- Codebase formatted with Prettier.
- Stopped tracking `node_modules/` in git.

## [1.0.2]

- Lazygit-style multi-panel TUI; core scan/clean/detail/watch commands; Docker reclaim
  detection.

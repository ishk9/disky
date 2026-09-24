# Disky desktop app

Finds large files, old downloads, app caches, temp files and old iPhone backups on macOS and Windows, and moves what you pick to the Trash / Recycle Bin. Nothing is deleted permanently.

## Develop

```bash
npm install --include=dev   # --include=dev matters if NODE_ENV=production is set
npm start                   # build + launch
npm test                    # scanner and trash tests (node:test)
npm run dist                # installers for the current OS into release/
```

Code map: `src/scanner.ts` (what gets found), `src/trash.ts` (ID → path, batch trashing), `src/main.ts` (window + IPC), `src/preload.ts` (bridge), `src/renderer/` (UI).

## Release

Push a tag like `app-v0.1.0`. GitHub Actions builds the macOS `.dmg` (Apple Silicon + Intel) and Windows installer and attaches them to a GitHub Release.

## Opening the unsigned app (for your download page)

The app isn't signed with a paid Apple/Microsoft certificate, so the OS warns the first time.

**macOS:** open the `.dmg`, drag Disky to Applications, open it once and click **Done** on the warning. Then go to **System Settings → Privacy & Security**, scroll down, click **Open Anyway** next to Disky, and confirm with your password.

**Windows:** run the installer. If you see "Windows protected your PC", click **More info → Run anyway**.

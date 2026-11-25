# GitHub releases for the mods

Status: not started (2026-11-25). Notes from talking it through, for when the mods are ready to release.

## Decisions so far

- **Each mod keeps its own version number** (in the file's header). Unlike bundles such as
  [Sterling Systems](https://github.com/JadeOfMaar/SterlingSystems/releases), where parts integrate and must share a
  version, these mods work independently:
  - every mod needs only the loader's small API (`register`, `value`, `setValue`), so any loader version works with any
    mod version unless that API changes;
  - Toolbelt reads Nightshade's `--nt-*` colour variables when they're there, with its own fallbacks, so any versions
    work together;
  - nothing else touches another mod.
- So **one release per mod version** fits best: a fix to one mod doesn't republish the others.

## How it would work

- **A tag per mod version**, prefixed with the mod's name, matching the version in the header:
  `mod-loader-v1.3.0`, `nightshade-v3.0.0`, `toolbelt-v2.0.0`, `perkalator-v2.0.0`, `bone-ledger-v4.0.0`, and the
  same for Graphs Only, MazIO, VoidsInfo, RunetrinketInfo and SeedsInfo. Use annotated tags
  (`git tag -a toolbelt-v2.0.0 -m "Toolbelt 2.0.0"`) and push them on their own (`git push origin toolbelt-v2.0.0`).
- **A release on that tag with the mod's file attached**, for example:
  `gh release create toolbelt-v2.0.0 "Toolbelt/toolbelt.js" --title "Toolbelt 2.0.0" --notes "..."`
  Download link: `https://github.com/UltraJohn/Trimps-mods/releases/download/toolbelt-v2.0.0/toolbelt.js`

## Things to handle

- **"Latest" is per repository, not per mod.** For a link that always gives a mod's newest version, either keep a
  rolling release per mod (for example a `toolbelt-latest` tag whose file is replaced with
  `gh release upload toolbelt-latest Toolbelt/toolbelt.js --clobber`), or link the raw file on main.
- **Graphs Only is more than one file** (`graphs-only.js` plus the `graphs-only/` folder): attach a zip to unpack into
  `mods/`.
- **Every mod needs the loader.** Release notes should say to install `mods.js` from the latest Trimps Mod Loader
  release. Maybe also an occasional "all mods" zip for new players.
- **Perkalator is GPL-3.0** (it contains Perky and Surky code via SadAugust's AutoTrimps). Its header already says so;
  attach a `LICENSE` file with the GPL-3.0 text to its releases. The other mods share no code with it and can use any
  license.
- **If the loader's API changes**, the notes for mods that need the new loader should say "needs Trimps Mod Loader x.y
  or newer". `@depends` could later take a minimum version if that becomes common.

## A download menu in the README

With one release per mod, the Releases tab mixes every mod, newest first. A mod that gets many updates pushes the
others' releases down the list, so a mod that hasn't changed in a while gets hard to find. The repo has no README yet;
add one with a table: one row per mod with what it does, its current version and a link to its latest download.

- The link can point at the mod's rolling `-latest` release (the link never changes) or at its newest versioned
  release (then the README needs updating on each release).
- A "release history" link per mod can use the Releases search, for example
  `https://github.com/UltraJohn/Trimps-mods/releases?q=toolbelt`, which lists only that mod's releases.
- Include install steps: put `mods.js` (the loader) and the mods you want in `<Steam>\steamapps\common\Trimps\mods\`,
  then restart Trimps.
- If the release workflow is automated (below), it can update the version and link in the README too.

## Later: automate it

A GitHub Actions workflow on tags like `*-v*` that maps the prefix to the folder (`toolbelt` → `Toolbelt/toolbelt.js`),
checks that the header version matches the tag, creates the release, attaches the file (or zip), and optionally updates
the rolling `-latest` release. Then releasing is just pushing a tag.

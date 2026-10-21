# alexandre-vl bb plugins

A personal [bb](https://getbb.app) plugin marketplace: one `marketplace.json`
catalog and the plugins it lists, each released from this repository with
semver tags. It is not reviewed by BB, and bb labels it as a third-party
marketplace when you install from it.

| Plugin | What it is | Source |
| --- | --- | --- |
| `github-inbox` | A fork of bb's GitHub plugin with a pull request inbox that says what each pull request needs next | [`plugins/github-inbox`](plugins/github-inbox) |

## GitHub Inbox and get-bb/bb#6037

[get-bb/bb#5867](https://github.com/get-bb/bb/issues/5867) asks the bundled
GitHub plugin for a pull request inbox that says what each pull request needs
next and hands it to an agent. [get-bb/bb#6037](https://github.com/get-bb/bb/pull/6037)
implements it in `plugins/github`. Until it is merged and released, this
repository ships that code as a separate plugin, `github-inbox`, built from the
PR's head commit `c2e3b1e`.

bb reserves every bundled plugin id, so a copy cannot replace `github` in
place: it ships under its own id and renames the CLI command, browser storage
keys, composer draft keys, and titles that would collide with the bundled
plugin. Plugin data is stored per id, so **`github-inbox` starts with empty
data** and none of the bundled plugin's cache, snoozes, thread links, or
settings. The [plugin README](plugins/github-inbox/README.md#a-fork-of-bbs-github-plugin)
lists every rename and why.

## Install

Add the catalog to your bb server once, then install from it:

```sh
bb marketplace add https://raw.githubusercontent.com/alexandre-vl/bb-plugins/main/marketplace.json
bb plugin install github-inbox@alexandre-vl
```

The install shows the marketplace, the author, and the exact tag and commit it
resolved, and asks before it runs. Then turn the bundled GitHub plugin off so
the sidebar and the `@`/`#` mentions do not show GitHub twice:

```sh
bb plugin disable github
```

`github-inbox` needs bb plugin SDK 0.6.58 or later (`engines.bbPluginSdk` in
its `package.json`). bb 0.46.1, the stable release at the time of writing,
ships SDK 0.6.49 and refuses the install; bb nightly builds from 2026-10-20 on
carry 0.6.59 or later.

Installing straight from git, without the catalog, uses the same tags:

```sh
bb plugin install 'git:https://github.com/alexandre-vl/bb-plugins.git@^1.0.0' --plugin github-inbox --tag-prefix github-inbox/
```

## How updates arrive

The catalog entry tracks `^1.0.0` over tags named `github-inbox/vX.Y.Z`.

- bb checks installed plugins for updates every 6 hours and never applies one
  by itself. Check and apply by hand with:

  ```sh
  bb plugin outdated
  bb plugin update github-inbox
  ```

- Each install keeps the range it was installed with, and updates read the
  installed plugin's own source, not this catalog. A 1.x release reaches every
  install with no catalog change. A 2.0.0 needs a new range here and a
  reinstall.
- bb records the commit each tag pointed at and refuses a tag that moved.
  Tags here are never moved or deleted: a fix ships as a new version.

## Releasing

1. Bump `version` in `plugins/<id>/package.json` and commit it to `main`.
2. Wait for CI on that commit.
3. Tag and push: `git tag <id>/vX.Y.Z && git push origin <id>/vX.Y.Z`.

CI runs `scripts/check-tag.mjs` on every `<id>/v*` tag and fails when the tag's
version differs from `plugins/<id>/package.json`.

## Layout

```text
marketplace.json          the catalog: schemaVersion 2, name "alexandre-vl"
icons/github-inbox.svg    catalog icon, resolved relative to marketplace.json
.bb/plugins.json          collection index, enables --plugin <name>
package.json              npm workspaces root ("plugins/*")
plugins/github-inbox/     package bb-plugin-github-inbox, plugin id github-inbox
scripts/                  catalog, tag, and git-install checks that CI runs
```

A catalog entry's `overview` is the text of the plugin's `PLUGIN_OVERVIEW.md`;
`node scripts/check-catalog.mjs --write` copies it in.

## Development

Use Node 22 and npm 11; npm 10.9 fails to install this workspace with
`Cannot read properties of null (reading 'edgesOut')`. Building needs the `bb`
CLI on `PATH` (the `bb-app` npm package provides it).

```sh
npm ci
npm run typecheck --workspaces
npm test --workspaces
npm run build --workspaces
node scripts/check-catalog.mjs
node scripts/check-git-install.mjs
```

`check-git-install.mjs` installs each plugin the way bb's git install does
(`npm install --omit=dev --omit=optional --ignore-scripts` in a copy of the
plugin directory) and then runs `bb plugin build`, so a build-time package left
in `devDependencies` fails here rather than on a user's machine.

## License

MIT, see [LICENSE](LICENSE). `plugins/github-inbox` is derived from bb, which is
MIT licensed (Copyright (c) 2026 Michael Yong); the catalog icon comes from
Hugeicons (MIT). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

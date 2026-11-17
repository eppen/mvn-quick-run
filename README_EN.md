<div align="center">

<img src="icon.png" alt="Maven Quick Run" width="128" />

# Maven Quick Run

**English** · [中文](README.md) · [日本語](README.ja.md)

</div>

VS Code extension: right-click a `pom.xml`, `pom-war.xml`, or a folder in the Explorer / editor to run Maven commands quickly. Before each run you can pick the thread count, whether to `clean`, and whether to skip tests.

## Features

The context menu exposes three commands (Explorer + editor + editor title bar):

| Menu item | Command executed |
| --- | --- |
| Maven: mvn install | `mvn install` |
| Maven: mvn package | `mvn package` |
| Maven: mvn package -f pom-war.xml | `mvn package -f pom-war.xml` |

Before each run, two QuickPicks appear in sequence:

1. **Threads**: 1 / 2 / 4 / 8 / 16 / Custom… (any positive integer), mapped to `-T n`
2. **Build options** (multi-select, freely combinable): `clean`, `Skip tests` (`-DskipTests`); the pre-checked state comes from the matching configuration entries

The final command runs in a new integrated terminal (working directory is the folder of the right-clicked item), for example:

```
mvn clean package -T 4 -DskipTests
```

Cancelling either QuickPick aborts silently — no command is executed.

## About `clean`

`clean` is **opt-in per run** and is not added by default (`mvnQuickRun.clean` defaults to `false`):

- It is inserted before the goals (`mvn clean package`) within the same invocation as `-f`, `-T`, and `-DskipTests`, so Maven is not started twice;
- A full recompile is noticeably slower, and you usually don't need it while iterating on code;
- If you habitually run `clean install`, set `mvnQuickRun.clean` to `true` — the QuickPick will then be pre-checked and a single Enter is enough.

## Installation

- Local development: run `npm install` → `npm run compile` in this folder, then press F5 in VS Code to launch the Extension Development Host.
- Packaging: `npm run package` (i.e. `vsce package`) produces a `.vsix`; install it with `code --install-extension xxx.vsix`.

## Configuration

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `mvnQuickRun.mavenCommand` | string | `mvn` | Maven executable; can be changed to `mvn.cmd` or a full path |
| `mvnQuickRun.defaultThreads` | number | `4` | Default parallel thread count (`-T n`) |
| `mvnQuickRun.clean` | boolean | `false` | Whether to run `clean` first by default (pre-checked state in the QuickPick) |
| `mvnQuickRun.skipTests` | boolean | `false` | Whether to skip tests by default (`-DskipTests`) |
| `mvnQuickRun.extraArgs` | string | `""` | Extra arguments appended to the command, e.g. `-Pprod` |
| `mvnQuickRun.askEveryTime` | boolean | `true` | Whether to show the QuickPicks (threads + build options) before each run; when `false`, the defaults above are used directly |

## About skipping tests

This extension uses `-DskipTests`: test **execution** is skipped, but test code is still **compiled**.
To skip compilation as well, add `-Dmaven.test.skip=true` to `mvnQuickRun.extraArgs`.

## Known behavior

- On Windows GBK consoles, Chinese output from Maven may appear garbled. This is an environment issue; running `chcp 65001` in the terminal usually helps.
- Each run opens a new terminal (named after the command label) so that consecutive runs don't overwrite each other's output.

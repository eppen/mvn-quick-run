<div align="center">

<img src="icon.png" alt="Maven Quick Run" width="128" />

# Maven Quick Run

[English](README_EN.md) · [中文](README.md) · **日本語**

</div>

VS Code 拡張機能：エクスプローラー / エディター上で `pom.xml`、`pom-war.xml`、またはフォルダーを右クリックして Maven コマンドを素早く実行します。実行前にスレッド数、`clean` の有無、テストのスキップを選択できます。

## 機能

コンテキストメニューには 3 つのコマンドが用意されています（エクスプローラー + エディター + エディターのタイトルバー）：

| メニュー項目 | 実行されるコマンド |
| --- | --- |
| Maven: mvn install | `mvn install` |
| Maven: mvn package | `mvn package` |
| Maven: mvn package -f pom-war.xml | `mvn package -f pom-war.xml` |

実行前に 2 つの QuickPick が順に表示されます：

1. **スレッド数**：1 / 2 / 4 / 8 / 16 / カスタム…（任意の正の整数を入力可）、`-T n` に対応
2. **ビルドオプション**（複数選択、自由に組み合わせ可能）：`clean`、`テストをスキップ`（`-DskipTests`）。チェック状態は同名の設定項目から引き継がれます

最終的なコマンドは新しい統合ターミナルで実行されます（作業ディレクトリーは右クリック対象のフォルダー）。例：

```
mvn clean package -T 4 -DskipTests
```

いずれかの QuickPick をキャンセルすると、コマンドは実行されずに静かに中断されます。

## `clean` について

`clean` は**実行ごとに任意で選択**する方式で、デフォルトでは付きません（`mvnQuickRun.clean` のデフォルトは `false`）：

- goal の前に挿入されます（`mvn clean package`）。`-f`、`-T`、`-DskipTests` と同じ 1 回の呼び出しに含まれるため、Maven が 2 回起動されることはありません；
- フルリコンパイルは明らかに時間がかかるため、日常的なコード変更では通常不要です；
- 毎回 `clean install` を実行する習慣がある場合は、`mvnQuickRun.clean` を `true` に設定してください。QuickPick で最初からチェックされた状態になり、Enter 1 回で済みます。

## インストール

- ローカル開発：このフォルダーで `npm install` → `npm run compile` を実行し、VS Code で F5 を押して Extension Development Host を起動します。
- パッケージ化：`npm run package`（`vsce package`）で `.vsix` を生成し、`code --install-extension xxx.vsix` でインストールします。

## 設定項目

| 設定 | 型 | デフォルト | 説明 |
| --- | --- | --- | --- |
| `mvnQuickRun.mavenCommand` | string | `mvn` | Maven 実行コマンド。`mvn.cmd` やフルパスに変更できます |
| `mvnQuickRun.defaultThreads` | number | `4` | デフォルトの並列スレッド数（`-T n`） |
| `mvnQuickRun.clean` | boolean | `false` | デフォルトで `clean` を先に実行するか（QuickPick の初期チェック状態） |
| `mvnQuickRun.skipTests` | boolean | `false` | デフォルトでテストをスキップするか（`-DskipTests`） |
| `mvnQuickRun.extraArgs` | string | `""` | コマンド末尾に追加する引数。例：`-Pprod` |
| `mvnQuickRun.askEveryTime` | boolean | `true` | 実行前に QuickPick（スレッド数 + ビルドオプション）を表示するか。`false` の場合は上記のデフォルト値をそのまま使用します |

## テストのスキップについて

この拡張機能は `-DskipTests` を使用します。テストの**実行**はスキップされますが、テストコードは**コンパイル**されます。
コンパイルもスキップしたい場合は、`mvnQuickRun.extraArgs` に `-Dmaven.test.skip=true` を追加してください。

## 既知の挙動

- Windows の GBK コンソールでは、Maven の日本語 / 中国語出力が文字化けすることがあります。これは環境起因の現象で、ターミナルで `chcp 65001` を実行すると緩和されます。
- 実行ごとに新しいターミナル（コマンドラベル付きの名前）を開くため、連続実行しても出力が上書きされません。

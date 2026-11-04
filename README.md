# Maven Quick Run

VS Code 插件：在文件资源管理器 / 编辑器内对 `pom.xml`、`pom-war.xml` 或文件夹右键，快速执行 Maven 命令，执行前可选线程数与是否跳过测试。

## 功能

右键菜单提供三个命令（资源管理器 + 编辑器内 + 编辑器标题栏右键）：

| 菜单项 | 执行命令 |
| --- | --- |
| Maven: mvn install | `mvn install` |
| Maven: mvn package | `mvn package` |
| Maven: mvn package -f pom-war.xml | `mvn package -f pom-war.xml` |

执行前依次弹出两个 QuickPick：

1. **线程数**：1 / 2 / 4 / 8 / 16 / 自定义…（输入任意正整数），对应 `-T n`
2. **是否跳过测试**：跳过测试（`-DskipTests`）/ 不跳过测试

最终命令在新建的集成终端中执行（工作目录为右键对象所在目录），例如：

```
mvn package -T 4 -DskipTests
```

取消任一 QuickPick 则静默中止，不执行任何命令。

## 安装

- 本地开发：在本目录执行 `npm install` → `npm run compile`，然后 VS Code 中按 F5 启动 Extension Development Host。
- 打包：`npm run package`（即 `vsce package`）生成 `.vsix`，用 `code --install-extension xxx.vsix` 安装。

## 配置项

| 配置 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `mvnQuickRun.mavenCommand` | string | `mvn` | Maven 可执行命令，可改为 `mvn.cmd` 或完整路径 |
| `mvnQuickRun.defaultThreads` | number | `4` | 默认并行线程数（`-T n`） |
| `mvnQuickRun.skipTests` | boolean | `false` | 默认是否跳过测试（`-DskipTests`） |
| `mvnQuickRun.extraArgs` | string | `""` | 追加到命令末尾的额外参数，如 `-Pprod` |
| `mvnQuickRun.askEveryTime` | boolean | `true` | 每次执行前是否弹 QuickPick；`false` 时直接用上面默认值 |

## 关于跳过测试

本插件使用 `-DskipTests`：跳过测试**执行**，但仍会**编译**测试代码。
如需连编译一起跳过，请在 `mvnQuickRun.extraArgs` 中加 `-Dmaven.test.skip=true`。

## 已知现象

- Windows GBK 控制台下 Maven 输出中文可能乱码，属环境现象，可在终端中执行 `chcp 65001` 缓解。
- 每次执行新建一个终端（名称带命令标签），避免多次执行互相覆盖输出。

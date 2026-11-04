import * as vscode from 'vscode';
import { pickThreads, pickSkipTests } from './quickPick';
import { buildCommand, getConfig, resolveWorkingDir, runInTerminal, MvnGoal } from './mvnRunner';

interface RunOptions {
  goal: MvnGoal;
  useWarPom: boolean;
  label: string;
}

/**
 * 命令执行主流程：
 * 1. 解析工作目录（右键对象 / 活动编辑器 / 工作区根）
 * 2. askEveryTime 为 true 时依次弹 QuickPick 选线程数、是否跳过测试（任一取消则静默中止）
 * 3. 拼接命令并在新建集成终端中执行
 */
async function runMvn(uri: vscode.Uri | undefined, options: RunOptions): Promise<void> {
  const cwd = await resolveWorkingDir(uri);
  if (!cwd) return;

  const config = getConfig();
  let threads: number;
  let skipTests: boolean;

  if (config.askEveryTime) {
    const pickedThreads = await pickThreads(config.defaultThreads);
    if (pickedThreads === undefined) return; // 用户取消
    threads = pickedThreads;

    const pickedSkip = await pickSkipTests(config.skipTests);
    if (pickedSkip === undefined) return; // 用户取消
    skipTests = pickedSkip;
  } else {
    threads = config.defaultThreads;
    skipTests = config.skipTests;
  }

  const command = buildCommand(options.goal, options.useWarPom, threads, skipTests);
  runInTerminal(cwd, command, options.label);
}

export function activate(context: vscode.ExtensionContext): void {
  const disposables: vscode.Disposable[] = [
    vscode.commands.registerCommand('mvnQuickRun.install', (uri?: vscode.Uri) =>
      runMvn(uri, { goal: 'install', useWarPom: false, label: 'mvn install' })
    ),
    vscode.commands.registerCommand('mvnQuickRun.package', (uri?: vscode.Uri) =>
      runMvn(uri, { goal: 'package', useWarPom: false, label: 'mvn package' })
    ),
    vscode.commands.registerCommand('mvnQuickRun.packageWar', (uri?: vscode.Uri) =>
      runMvn(uri, { goal: 'package', useWarPom: true, label: 'mvn package -f pom-war.xml' })
    ),
  ];
  context.subscriptions.push(...disposables);
}

export function deactivate(): void {
  // 无需清理
}

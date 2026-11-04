import * as path from 'path';
import * as vscode from 'vscode';

export type MvnGoal = 'install' | 'package';

export interface MvnConfig {
  mavenCommand: string;
  defaultThreads: number;
  skipTests: boolean;
  extraArgs: string;
  askEveryTime: boolean;
}

/** 读取 mvnQuickRun.* 配置（带默认值兜底） */
export function getConfig(): MvnConfig {
  const cfg = vscode.workspace.getConfiguration('mvnQuickRun');
  return {
    mavenCommand: cfg.get<string>('mavenCommand')?.trim() || 'mvn',
    defaultThreads: cfg.get<number>('defaultThreads') ?? 4,
    skipTests: cfg.get<boolean>('skipTests') ?? false,
    extraArgs: cfg.get<string>('extraArgs') ?? '',
    askEveryTime: cfg.get<boolean>('askEveryTime') ?? true,
  };
}

/**
 * 解析 Maven 命令的工作目录：
 * - uri 是文件夹 → 该目录
 * - uri 是文件 → 其所在目录
 * - 无 uri → 活动编辑器（pom 文件）所在目录 → 第一个工作区文件夹
 * - 都没有 → 提示并返回 undefined
 */
export async function resolveWorkingDir(uri?: vscode.Uri): Promise<string | undefined> {
  if (uri && uri.scheme === 'file') {
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.type === vscode.FileType.Directory) {
        return uri.fsPath;
      }
    } catch {
      // stat 失败时按文件处理，取所在目录
    }
    return path.dirname(uri.fsPath);
  }

  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document.uri.scheme === 'file') {
    return path.dirname(editor.document.uri.fsPath);
  }

  const folder = vscode.workspace.workspaceFolders?.[0];
  if (folder) {
    return folder.uri.fsPath;
  }

  await vscode.window.showWarningMessage(
    'Maven Quick Run：无法确定工作目录，请打开包含 pom.xml 的文件夹后重试。'
  );
  return undefined;
}

/**
 * 拼接 Maven 命令，如：mvn package -f pom-war.xml -T 4 -DskipTests
 * extraArgs 追加在末尾。
 */
export function buildCommand(
  goal: MvnGoal,
  useWarPom: boolean,
  threads: number,
  skipTests: boolean
): string {
  const { mavenCommand, extraArgs } = getConfig();
  const parts: string[] = [mavenCommand, goal];
  if (useWarPom) {
    parts.push('-f', 'pom-war.xml');
  }
  if (Number.isInteger(threads) && threads > 1) {
    parts.push('-T', String(threads));
  }
  if (skipTests) {
    parts.push('-DskipTests');
  }
  const extra = extraArgs.trim();
  if (extra) {
    parts.push(extra);
  }
  return parts.join(' ');
}

/** 新建集成终端（cwd 为工作目录）并执行命令 */
export function runInTerminal(cwd: string, command: string, label: string): void {
  const terminal = vscode.window.createTerminal({
    name: `Maven: ${label}`,
    cwd,
  });
  terminal.show();
  terminal.sendText(command, true);
}

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export type MvnGoal = 'install' | 'package';

export interface MvnConfig {
  mavenCommand: string;
  javaHome: string;
  defaultThreads: number;
  clean: boolean;
  skipTests: boolean;
  extraArgs: string;
  askEveryTime: boolean;
}

/** 一次构建的可选附加项（clean / 线程数 / 跳过测试） */
export interface MvnBuildOptions {
  threads: number;
  clean: boolean;
  skipTests: boolean;
  javaHome: string;
}

/** 读取 mvnQuickRun.* 配置（带默认值兜底） */
export function getConfig(): MvnConfig {
  const cfg = vscode.workspace.getConfiguration('mvnQuickRun');
  return {
    mavenCommand: cfg.get<string>('mavenCommand')?.trim() || 'mvn',
    javaHome: cfg.get<string>('javaHome') ?? '',
    defaultThreads: cfg.get<number>('defaultThreads') ?? 4,
    clean: cfg.get<boolean>('clean') ?? false,
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
 * 拼接 Maven 命令，如：mvn clean package -f pom-war.xml -T 4 -DskipTests
 * clean 位于 goal 之前（作用于同一次调用，不额外启动一次 Maven），extraArgs 追加在末尾。
 */
export function buildCommand(
  goal: MvnGoal,
  useWarPom: boolean,
  opts: MvnBuildOptions
): string {
  const { mavenCommand, extraArgs } = getConfig();
  const parts: string[] = [mavenCommand];
  if (opts.clean) {
    parts.push('clean');
  }
  parts.push(goal);
  if (useWarPom) {
    parts.push('-f', 'pom-war.xml');
  }
  if (Number.isInteger(opts.threads) && opts.threads > 1) {
    parts.push('-T', String(opts.threads));
  }
  if (opts.skipTests) {
    parts.push('-DskipTests');
  }
  const extra = extraArgs.trim();
  if (extra) {
    parts.push(extra);
  }
  return parts.join(' ');
}

/** 扫描常见 JDK 安装目录，返回可用 Java Runtime 列表（按版本号倒序） */
export interface JavaHome {
  label: string;
  path: string;
}

const isWin = process.platform === 'win32';

const JAVA_ROOTS: string[] = isWin
  ? [
      'C:\\Program Files\\Java',
      'C:\\Program Files\\Eclipse Adoptium',
      'C:\\Program Files\\Amazon Corretto',
      'C:\\Program Files\\Zulu',
      'C:\\Program Files\\Microsoft',
      'C:\\Program Files\\BellSoft',
      'C:\\Program Files\\GraalVM',
      'C:\\Program Files (x86)\\Java',
    ]
  : [
      '/usr/lib/jvm',
      '/Library/Java/JavaVirtualMachines',
      '/opt/java',
    ];

/** 判断目录是否为 JDK（含 bin/javac，过滤 JRE） */
async function isJdkDir(dir: string): Promise<boolean> {
  const exe = isWin ? 'javac.exe' : 'javac';
  try {
    const st = await fs.promises.stat(path.join(dir, 'bin', exe));
    return st.isFile();
  } catch {
    return false;
  }
}

/** 从目录名提取版本号用于排序（如 jdk-17.0.20.8-hotspot → 17.0.20.8） */
function versionKey(name: string): number[] {
  const m = name.match(/(\d+(?:\.\d+)*)/);
  if (!m) return [0];
  return m[1].split('.').map(Number);
}

function compareVersions(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

/**
 * 扫描常见 JDK 安装目录，返回可用 Java Runtime 列表（按版本号倒序）。
 * 只保留含 bin/javac 的目录（过滤 JRE），并并入当前系统 JAVA_HOME。
 */
export async function discoverJavaHomes(): Promise<JavaHome[]> {
  const found = new Map<string, JavaHome>();
  const add = (p: string) => {
    const key = isWin ? p.toLowerCase() : p;
    if (!found.has(key)) found.set(key, { label: p, path: p });
  };

  // 当前系统 JAVA_HOME
  const envJavaHome = process.env.JAVA_HOME?.trim();
  if (envJavaHome && (await isJdkDir(envJavaHome))) {
    add(envJavaHome);
  }

  for (const root of JAVA_ROOTS) {
    let entries: string[];
    try {
      entries = await fs.promises.readdir(root);
    } catch {
      continue; // 根目录不存在
    }
    for (const name of entries) {
      const dir = path.join(root, name);
      // macOS 的 .jdk bundle 实际 home 在 Contents/Home
      const candidates = [dir, path.join(dir, 'Contents', 'Home')];
      for (const c of candidates) {
        if (await isJdkDir(c)) {
          add(c);
          break;
        }
      }
    }
  }

  const list = [...found.values()];
  list.sort((a, b) =>
    compareVersions(versionKey(path.basename(b.path)), versionKey(path.basename(a.path)))
  );
  return list;
}

/** 新建集成终端（cwd 为工作目录）并执行命令；javaHome 非空时向终端环境注入 JAVA_HOME */
export function runInTerminal(cwd: string, command: string, label: string, javaHome?: string): void {
  const terminal = vscode.window.createTerminal({
    name: `Maven: ${label}`,
    cwd,
    ...(javaHome ? { env: { JAVA_HOME: javaHome } } : {}),
  });
  terminal.show();
  terminal.sendText(command, true);
}

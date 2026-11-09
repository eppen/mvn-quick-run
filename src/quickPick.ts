import * as vscode from 'vscode';
import { MvnBuildOptions } from './mvnRunner';

const THREAD_OPTIONS = [1, 2, 4, 8, 16];

/**
 * 弹出 QuickPick 选择 Maven 并行线程数（-T n）。
 * 选项：1/2/4/8/16 + 自定义…（输入正整数）。
 * @returns 选中的线程数；用户取消（Esc / 关闭）时返回 undefined
 */
export async function pickThreads(defaultThreads: number): Promise<number | undefined> {
  const items: (vscode.QuickPickItem & { value?: number })[] = THREAD_OPTIONS.map((n) => ({
    label: String(n),
    description: n === defaultThreads ? '默认' : '',
    value: n,
  }));
  items.push({ label: '自定义…', description: '输入任意正整数' });

  const picked = await vscode.window.showQuickPick(items, {
    title: 'Maven 线程数',
    placeHolder: '选择 Maven 并行线程数（-T n）',
  });
  if (!picked) return undefined;
  if (picked.value !== undefined) return picked.value;

  // 自定义输入：非法输入由 validateInput 拦截，必须输入合法值或取消
  const input = await vscode.window.showInputBox({
    title: 'Maven 线程数',
    prompt: '输入正整数线程数（-T n）',
    value: String(defaultThreads),
    validateInput: (v) => {
      const n = Number(v.trim());
      if (!Number.isInteger(n) || n < 1) {
        return '请输入不小于 1 的正整数';
      }
      return undefined;
    },
  });
  if (input === undefined) return undefined; // 取消
  return Number(input.trim());
}

/**
 * 弹出多选 QuickPick 选择构建附加项：clean 与跳过测试（-DskipTests）。
 * 两项可任意组合，预勾选状态取自配置默认值；一次回车即可确认。
 * @returns 选中的 { clean, skipTests }；用户取消（Esc / 关闭）时返回 undefined
 */
export async function pickBuildOptions(
  defaults: Pick<MvnBuildOptions, 'clean' | 'skipTests'>
): Promise<Pick<MvnBuildOptions, 'clean' | 'skipTests'> | undefined> {
  type ToggleItem = vscode.QuickPickItem & { key: 'clean' | 'skipTests' };
  const cleanItem: ToggleItem = {
    key: 'clean',
    label: 'clean',
    description: '先删除 target 再构建（全量编译，较慢）',
    picked: defaults.clean,
  };
  const skipItem: ToggleItem = {
    key: 'skipTests',
    label: '跳过测试',
    description: '-DskipTests（仍编译测试代码）',
    picked: defaults.skipTests,
  };

  const picked = await vscode.window.showQuickPick<ToggleItem>([cleanItem, skipItem], {
    title: 'Maven 构建选项',
    placeHolder: '勾选要附加的选项（空格切换，回车确认；都不勾则直接回车）',
    canPickMany: true,
  });
  if (!picked) return undefined;
  return {
    clean: picked.some((i) => i.key === 'clean'),
    skipTests: picked.some((i) => i.key === 'skipTests'),
  };
}

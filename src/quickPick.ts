import * as vscode from 'vscode';

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
 * 弹出 QuickPick 选择是否跳过测试（-DskipTests）。
 * @returns true=跳过测试，false=不跳过；用户取消时返回 undefined
 */
export async function pickSkipTests(defaultSkip: boolean): Promise<boolean | undefined> {
  const skipItem: vscode.QuickPickItem & { value: boolean } = {
    label: '跳过测试',
    description: '-DskipTests（仍编译测试代码）',
    value: true,
  };
  const runItem: vscode.QuickPickItem & { value: boolean } = {
    label: '不跳过测试',
    description: '完整执行测试',
    value: false,
  };
  // 默认项排前，方便直接回车
  const items = defaultSkip ? [skipItem, runItem] : [runItem, skipItem];

  const picked = await vscode.window.showQuickPick(items, {
    title: 'Maven 测试',
    placeHolder: '是否跳过测试？',
  });
  return picked ? picked.value : undefined;
}

/**
 * 编辑器 Git 风格的差异标记工具
 * 在编辑器左侧边距（glyph margin）显示与已保存版本的行级差异：
 *  - 修改的行：橙色
 *  - 新增的行：绿色
 * 行为与 VSCode 的 Git 装订线指示器一致。
 */

export type DiffLineType = 'added' | 'modified';

export interface DiffDecoration {
    startLineNumber: number; // 1-indexed
    endLineNumber: number;   // 1-indexed
    type: DiffLineType;
}

// 超过该行数则跳过差异计算，避免大文件的 O(n*m) 性能问题
const MAX_LINES = 2000;

interface DiffEntry {
    type: 'equal' | 'added' | 'removed';
    oldLine?: number; // 0-indexed
    newLine?: number; // 0-indexed
}

/**
 * 基于 LCS 的逐行差异算法
 */
function diffLines(oldLines: string[], newLines: string[]): DiffEntry[] {
    const n = oldLines.length;
    const m = newLines.length;
    const width = m + 1;
    const dp = new Uint32Array((n + 1) * width);
    const idx = (i: number, j: number) => i * width + j;

    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            if (oldLines[i] === newLines[j]) {
                dp[idx(i, j)] = dp[idx(i + 1, j + 1)] + 1;
            } else {
                dp[idx(i, j)] = Math.max(dp[idx(i + 1, j)], dp[idx(i, j + 1)]);
            }
        }
    }

    const result: DiffEntry[] = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
        if (oldLines[i] === newLines[j]) {
            result.push({type: 'equal', oldLine: i, newLine: j});
            i++;
            j++;
        } else if (dp[idx(i + 1, j)] >= dp[idx(i, j + 1)]) {
            result.push({type: 'removed', oldLine: i});
            i++;
        } else {
            result.push({type: 'added', newLine: j});
            j++;
        }
    }
    while (i < n) {
        result.push({type: 'removed', oldLine: i});
        i++;
    }
    while (j < m) {
        result.push({type: 'added', newLine: j});
        j++;
    }
    return result;
}

/**
 * 计算差异装饰：将连续的变更分组成 hunk，
 * 若 hunk 中同时包含删除与新增，则其中的新增行视为「修改」(modified)，
 * 否则视为「纯新增」(added)。与 VSCode Git 行为一致。
 */
export function computeDiffDecorations(baseline: string, current: string): DiffDecoration[] {
    if (baseline === current) return [];

    const oldLines = baseline.length ? baseline.split('\n') : [];
    const newLines = current.length ? current.split('\n') : [];

    if (oldLines.length > MAX_LINES || newLines.length > MAX_LINES) return [];

    const diff = diffLines(oldLines, newLines);
    const decorations: DiffDecoration[] = [];

    let k = 0;
    while (k < diff.length) {
        if (diff[k].type === 'equal') {
            k++;
            continue;
        }
        const hunkStart = k;
        while (k < diff.length && diff[k].type !== 'equal') {
            k++;
        }
        const hunk = diff.slice(hunkStart, k);
        const hasRemoved = hunk.some(d => d.type === 'removed');
        const type: DiffLineType = hasRemoved ? 'modified' : 'added';
        for (const d of hunk) {
            if (d.type === 'added' && d.newLine !== undefined) {
                decorations.push({
                    startLineNumber: d.newLine + 1,
                    endLineNumber: d.newLine + 1,
                    type,
                });
            }
        }
    }
    return decorations;
}

/**
 * 构建 Monaco 装饰对象数组
 */
export function buildMonacoDiffDecorations(monaco: any, decorations: DiffDecoration[]): any[] {
    return decorations.map(d => ({
        range: new monaco.Range(d.startLineNumber, 1, d.endLineNumber, 1),
        options: {
            isWholeLine: true,
            glyphMarginClassName: d.type === 'added' ? 'diff-glyph-added' : 'diff-glyph-modified',
            className: d.type === 'added' ? 'diff-line-added' : 'diff-line-modified',
            marginClassName: d.type === 'added' ? 'diff-margin-added' : 'diff-margin-modified',
        },
    }));
}

/**
 * 注入差异标记所需的 CSS 样式（仅注入一次）
 */
export function injectDiffGutterStyles(): void {
    const styleId = 'monaco-editor-diff-gutter-style';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* 左侧装订线指示条（glyph margin）—— 与 VSCode Git 一致 */
        .monaco-editor .diff-glyph-added {
            background: #2da44e !important;
        }
        .monaco-editor .diff-glyph-modified {
            background: #e3b341 !important;
        }
        /* 行号边距背景着色，增强可见性 */
        .monaco-editor .diff-margin-added {
            background: rgba(46, 160, 67, 0.18) !important;
        }
        .monaco-editor .diff-margin-modified {
            background: rgba(227, 179, 65, 0.18) !important;
        }
        /* 当前行内容浅色着色 */
        .monaco-editor .diff-line-added {
            background: rgba(46, 160, 67, 0.10) !important;
        }
        .monaco-editor .diff-line-modified {
            background: rgba(227, 179, 65, 0.10) !important;
        }
    `;
    document.head.appendChild(style);
}

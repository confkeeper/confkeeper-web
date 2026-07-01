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
    const dp = new Uint16Array((n + 1) * width);

    for (let i = n - 1; i >= 0; i--) {
        const rowOffset = i * width;
        const nextRowOffset = (i + 1) * width;
        const oldLine = oldLines[i];
        for (let j = m - 1; j >= 0; j--) {
            if (oldLine === newLines[j]) {
                dp[rowOffset + j] = dp[nextRowOffset + j + 1] + 1;
            } else {
                const val1 = dp[nextRowOffset + j];
                const val2 = dp[rowOffset + j + 1];
                dp[rowOffset + j] = val1 > val2 ? val1 : val2;
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
        } else if (dp[(i + 1) * width + j] >= dp[i * width + j + 1]) {
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
 * 两个字符串的编辑距离（Levenshtein）。
 */
function levenshtein(a: string, b: string): number {
    const la = a.length, lb = b.length;
    if (la === 0) return lb;
    if (lb === 0) return la;
    let prev = new Array<number>(lb + 1);
    let curr = new Array<number>(lb + 1);
    for (let j = 0; j <= lb; j++) prev[j] = j;
    for (let i = 1; i <= la; i++) {
        curr[0] = i;
        const ca = a.charCodeAt(i - 1);
        for (let j = 1; j <= lb; j++) {
            const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
            curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
        }
        const tmp = prev;
        prev = curr;
        curr = tmp;
    }
    return prev[lb];
}

/**
 * 行相似度：0~1，1 表示完全相同，0 表示完全不同（含空行与非空行比较）。
 */
function lineSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;
    return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}


/**
 * 在一个 hunk 内判定每条新增行是「修改」(替换了某条删除行) 还是「纯新增」。
 * 采用贪心最大相似度配对，并保证至少配对 min(删除数, 新增数) 对：
 *  - 修改一行后在行尾按回车产生的新空行 → 视为纯新增(绿)；
 *  - 清空某行内容(删1增1) → 视为修改(橙)；
 *  - 在某行上方插入新行并修改该行 → 新行视为新增，被修改行视为修改。
 */
function classifyAddedLines(removed: string[], added: string[]): boolean[] {
    const result = new Array<boolean>(added.length).fill(false);
    if (removed.length === 0 || added.length === 0) return result;

    // Prevent performance degradation on large hunks (O(R * A * L^2))
    if (removed.length * added.length > 2000) {
        const minPairs = Math.min(removed.length, added.length);
        for (let i = 0; i < minPairs; i++) {
            result[i] = true;
        }
        return result;
    }

    const minPairs = Math.min(removed.length, added.length);
    const pairs: { r: number; a: number; sim: number }[] = [];
    for (let r = 0; r < removed.length; r++) {
        for (let a = 0; a < added.length; a++) {
            pairs.push({r, a, sim: lineSimilarity(removed[r], added[a])});
        }
    }
    pairs.sort((x, y) => y.sim - x.sim);

    const rUsed = new Set<number>();
    const aUsed = new Set<number>();
    let count = 0;
    for (const p of pairs) {
        if (count >= minPairs) break;
        if (rUsed.has(p.r) || aUsed.has(p.a)) continue;
        result[p.a] = true;
        rUsed.add(p.r);
        aUsed.add(p.a);
        count++;
    }
    return result;
}

/**
 * 计算差异装饰：将连续的变更分组成 hunk，再按行相似度判定每条新增行是
 * 「修改」(modified, 橙) 还是「新增」(added, 绿)，并将相邻同类型行合并为一个区间。
 */
export function computeDiffDecorations(baseline: string, current: string): DiffDecoration[] {
    if (baseline === current) return [];

    const oldLines = baseline.length ? baseline.split('\n') : [];
    const newLines = current.length ? current.split('\n') : [];

    if (oldLines.length > MAX_LINES || newLines.length > MAX_LINES) return [];

    const diff = diffLines(oldLines, newLines);
    const decorations: DiffDecoration[] = [];

    const pushDecoration = (deco: DiffDecoration | null) => {
        if (deco) decorations.push(deco);
    };

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

        const removedTexts: string[] = [];
        const addedEntries: { line: number; text: string }[] = [];
        for (const d of hunk) {
            if (d.type === 'removed' && d.oldLine !== undefined) {
                removedTexts.push(oldLines[d.oldLine]);
            } else if (d.type === 'added' && d.newLine !== undefined) {
                addedEntries.push({line: d.newLine + 1, text: newLines[d.newLine]});
            }
        }

        const modifiedFlags = classifyAddedLines(removedTexts, addedEntries.map(e => e.text));

        let currentDecoration: DiffDecoration | null = null;
        for (let a = 0; a < addedEntries.length; a++) {
            const line = addedEntries[a].line;
            const type: DiffLineType = modifiedFlags[a] ? 'modified' : 'added';
            if (currentDecoration && currentDecoration.endLineNumber === line - 1 && currentDecoration.type === type) {
                currentDecoration.endLineNumber = line;
            } else {
                pushDecoration(currentDecoration);
                currentDecoration = {startLineNumber: line, endLineNumber: line, type};
            }
        }
        pushDecoration(currentDecoration);
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

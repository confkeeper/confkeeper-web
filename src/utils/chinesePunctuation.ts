/**
 * 中文标点符号检测工具
 */

// 中文标点符号正则表达式
export const CHINESE_PUNCTUATION_REGEX = /[：；，。！？【】（）“”‘’、]/g;

// 注释行前缀
const COMMENT_PREFIXES = ['#', ';', '//'];

/**
 * 检测文本中的中文标点符号（跳过注释行）
 * @param content 要检测的文本内容
 * @returns 检测到的中文标点符号位置信息数组
 */
export interface ChinesePunctuationMatch {
    lineNumber: number;      // 行号（1-indexed）
    column: number;          // 列号（1-indexed）
    endColumn: number;       // 结束列号（1-indexed）
    character: string;       // 匹配到的字符
}

export function detectChinesePunctuations(content: string): ChinesePunctuationMatch[] {
    const matches: ChinesePunctuationMatch[] = [];
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
        // 跳过注释行
        const trimmedLine = line.trim();
        if (COMMENT_PREFIXES.some(prefix => trimmedLine.startsWith(prefix))) {
            return;
        }

        let match;
        const regex = new RegExp(CHINESE_PUNCTUATION_REGEX.source, 'g');
        while ((match = regex.exec(line)) !== null) {
            matches.push({
                lineNumber: lineIndex + 1,
                column: match.index + 1,
                endColumn: match.index + 2,
                character: match[0]
            });
        }
    });

    return matches;
}

/**
 * 为 Monaco Editor 创建中文标点高亮装饰器
 * @param editor Monaco Editor 实例
 * @param monaco Monaco 命名空间
 * @returns 装饰器配置数组
 */
export function createChinesePunctuationDecorations(editor: any, monaco: any): any[] {
    const model = editor.getModel();
    if (!model) return [];

    const content = model.getValue();
    const matches = detectChinesePunctuations(content);

    return matches.map(match => ({
        range: new monaco.Range(
            match.lineNumber,
            match.column,
            match.lineNumber,
            match.endColumn
        ),
        options: {
            inlineClassName: 'chinese-punctuation-error',
            hoverMessage: {value: `⚠️ 检测到中文标点符号「${match.character}」，可能导致配置解析错误`},
            overviewRuler: {
                color: '#ff0000',
                position: monaco.editor.OverviewRulerLane.Right
            }
        }
    }));
}

/**
 * 注入中文标点高亮 CSS 样式
 */
export function injectChinesePunctuationStyles(): void {
    const styleId = 'monaco-chinese-punctuation-error-style';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .chinese-punctuation-error {
                background-color: rgba(255, 0, 0, 0.4) !important;
                border: 1px solid #ff0000 !important;
                border-radius: 2px;
            }
            .chinese-punctuation-error-line {
                background-color: rgba(255, 0, 0, 0.1) !important;
            }
        `;
        document.head.appendChild(style);
    }
}

export type LineEndingType = 'unix' | 'windows';

export const detectLineEnding = (content: string): LineEndingType => {
    if (content.includes('\r\n')) {
        return 'windows';
    }
    return 'unix';
};

export const convertLineEnding = (content: string, targetLineEnding: LineEndingType): string => {
    if (targetLineEnding === 'windows') {
        return content.replace(/\r?\n/g, '\r\n');
    } else {
        return content.replace(/\r\n/g, '\n');
    }
};

export const toggleLineEnding = (content: string, currentLineEnding: LineEndingType): {
    content: string;
    lineEnding: LineEndingType
} => {
    const newLineEnding = currentLineEnding === 'unix' ? 'windows' : 'unix';
    const newContent = convertLineEnding(content, newLineEnding);
    return {
        content: newContent,
        lineEnding: newLineEnding
    };
};

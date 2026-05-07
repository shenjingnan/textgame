// ============================================================
// UI 主题模块 — 颜色、样式、组件主题
// 从 cli.ts 提取，便于统一管理和未来扩展
// ============================================================

// ==================== ANSI 颜色常量 ====================

const CSI = '\x1b[';
export const SGR = (n: number) => `${CSI}${n}m`;

export const colors = {
  reset: SGR(0),
  bold: SGR(1),
  dim: SGR(2),
  cyan: SGR(36),
  green: SGR(32),
  yellow: SGR(33),
  red: SGR(31),
  magenta: SGR(35),
  blue: SGR(34),
  white: SGR(37),
  gray: SGR(90),
} as const;

export function style(text: string, code: string): string {
  return `${code}${text}${colors.reset}`;
}

// ==================== Markdown 主题 ====================

export const markdownTheme = {
  heading: (text: string) => style(text, colors.bold + colors.yellow),
  link: (text: string) => style(text, colors.cyan),
  linkUrl: (text: string) => style(text, colors.dim),
  code: (text: string) => style(text, colors.green),
  codeBlock: (text: string) => text,
  codeBlockBorder: (text: string) => style(text, colors.dim),
  quote: (text: string) => style(text, colors.dim),
  quoteBorder: (text: string) => style(text, colors.dim),
  hr: (text: string) => style(text, colors.dim),
  listBullet: (text: string) => style(text, colors.cyan),
  bold: (text: string) => style(text, colors.bold),
  italic: (text: string) => style(text, colors.dim),
  strikethrough: (text: string) => style(text, colors.dim),
  underline: (text: string) => style(text, colors.bold),
};

// ==================== Editor 主题 ====================

export const editorTheme = {
  borderColor: (str: string) => style(str, colors.cyan),
  selectList: {
    selectedPrefix: (text: string) => style(text, colors.cyan + colors.bold),
    selectedText: (text: string) => style(text, colors.bold),
    description: (text: string) => style(text, colors.dim),
    scrollInfo: (text: string) => style(text, colors.dim),
    noMatch: (text: string) => style(text, colors.red),
  },
};

// ==================== SelectList 主题 ====================

export const selectListTheme = {
  selectedPrefix: (text: string) => style(text, colors.yellow + colors.bold),
  selectedText: (text: string) => style(text, colors.bold + colors.white),
  description: (text: string) => style(text, colors.dim),
  scrollInfo: (text: string) => style(text, colors.dim),
  noMatch: (text: string) => style(text, colors.red),
};

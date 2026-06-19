/**
 * Wiki Memory Engine
 *
 * 每轮对话后维护长期关系 Wiki，而非总结聊天。
 * 核心任务：判断哪些页面需要更新、生成更新内容、记录理解演变。
 *
 * 架构：
 * 1. RuleEngine — 纯规则判断是否需要更新（零成本 fallback）
 * 2. ContentGenerator — 生成更新内容（当前 mock，预留 LLM 接口）
 * 3. updateRelationshipWiki — 主入口
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** 消息角色 */
export type MessageRole = 'user' | 'assistant' | 'echo';

/** 单条对话消息 */
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

/** Wiki 页面 */
export interface WikiPage {
  /** 页面路径，如 "relationship/current-state" */
  path: string;
  /** 页面标题 */
  title: string;
  /** 页面 Markdown 内容 */
  content: string;
  /** 最后更新时间戳 */
  updatedAt: number;
  /** 更新原因摘要 */
  lastEditReason?: string;
}

/** 更新触发类型 */
export type UpdateTrigger =
  | 'user-correction'       // 用户纠正 AI 的错误理解
  | 'direction-change'      // 用户改变产品/人生方向
  | 'long-term-goal'        // 用户表达长期目标
  | 'understanding-shift'   // 用户对某事的理解发生变化
  | 'new-event'             // 发生了值得记录的关键事件
  | 'none';                 // 普通闲聊，不触发 Wiki 更新

/** 规则引擎分析结果 */
export interface AnalysisResult {
  /** 触发类型 */
  trigger: UpdateTrigger;
  /** 需要更新的页面路径列表 */
  pagesToUpdate: string[];
  /** 触发原因摘要 */
  reason: string;
  /** 从用户消息中提取的关键信息 */
  extractedInfo: {
    correction?: string;      // 纠正内容
    direction?: string;       // 方向/目标
    goal?: string;            // 长期目标
    topic?: string;           // 话题关键词
    oldUnderstanding?: string; // 被推翻的旧理解
    newUnderstanding?: string; // 新理解
  };
}

/** LLM 调用接口（预留） */
export interface LLMAdapter {
  /**
   * 调用 LLM 生成内容。
   * 当前未实现，返回 null 时回退到规则引擎。
   */
  generate(prompt: string, context: {
    systemPrompt: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<string | null>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Wiki 页面路径常量 */
const WIKI_PAGES = {
  CURRENT_STATE: 'relationship/current-state',
  TIMELINE: 'relationship/timeline',
  LIFE_CHART: 'user/life-chart-interpretations',
  RULES: 'rules/future-response-rules',
  OPEN_THREADS: 'relationship/open-threads',
} as const;

/** 纠正类关键词 */
const CORRECTION_KEYWORDS = [
  '不是', '不要', '纠正', '其实是', '应该是', '不对',
  '搞错了', '误解', '理解错了', '不是这样', '你想多了',
  '别这样', '错了', '修正', '重新理解',
];

/** 方向/目标关键词 */
const DIRECTION_KEYWORDS = [
  '方向', '目标', '计划', '想要', '决定', '准备',
  '打算', '要做', '改为', '转向', '聚焦', '未来',
  '战略', '路线', '规划',
];

/** 长期目标关键词 */
const LONG_TERM_KEYWORDS = [
  '长期', '一直', '始终', '永远', '核心', '根本',
  '最重要', '最终', '理想', '愿景', '使命',
];

// ─── Rule Engine ─────────────────────────────────────────────────────────────

/**
 * 分析用户消息，判断是否需要更新 Wiki。
 * 纯规则实现，零成本。
 */
export function analyzeMessage(
  userMessage: string,
  assistantMessage: string,
  recentMessages: Message[],
): AnalysisResult {
  const normalized = userMessage.toLowerCase();

  // 1. 检测用户纠正
  const correctionKeyword = CORRECTION_KEYWORDS.find(kw => normalized.includes(kw));
  if (correctionKeyword) {
    return buildCorrectionResult(userMessage, assistantMessage, correctionKeyword);
  }

  // 2. 检测方向/目标变化
  const directionKeyword = DIRECTION_KEYWORDS.find(kw => normalized.includes(kw));
  if (directionKeyword && isSubstantiveMessage(userMessage)) {
    return buildDirectionResult(userMessage, directionKeyword);
  }

  // 3. 检测长期目标表达
  const longTermKeyword = LONG_TERM_KEYWORDS.find(kw => normalized.includes(kw));
  if (longTermKeyword && isSubstantiveMessage(userMessage)) {
    return buildGoalResult(userMessage, longTermKeyword);
  }

  // 4. 普通闲聊 — 不更新 Wiki
  return {
    trigger: 'none',
    pagesToUpdate: [],
    reason: '普通闲聊，无需更新 Wiki',
    extractedInfo: {},
  };
}

/** 构建纠正类分析结果 */
function buildCorrectionResult(
  userMessage: string,
  assistantMessage: string,
  keyword: string,
): AnalysisResult {
  // 提取被纠正的内容（尝试从 assistant 上一条消息中推断）
  const oldUnderstanding = extractQuotedContent(assistantMessage) || assistantMessage.slice(0, 100);
  const newUnderstanding = extractQuotedContent(userMessage) || userMessage;

  return {
    trigger: 'user-correction',
    pagesToUpdate: [
      WIKI_PAGES.RULES,         // 必须更新：未来回应规则
      WIKI_PAGES.CURRENT_STATE, // 同步更新：当前状态
    ],
    reason: `用户使用"${keyword}"进行了纠正`,
    extractedInfo: {
      correction: userMessage,
      oldUnderstanding,
      newUnderstanding,
      topic: extractTopic(userMessage),
    },
  };
}

/** 构建方向变化分析结果 */
function buildDirectionResult(
  userMessage: string,
  keyword: string,
): AnalysisResult {
  return {
    trigger: 'direction-change',
    pagesToUpdate: [
      WIKI_PAGES.CURRENT_STATE, // 方向变化影响当前状态
      WIKI_PAGES.TIMELINE,      // 记录到时间线
      WIKI_PAGES.OPEN_THREADS,  // 可能产生新线索
    ],
    reason: `用户使用"${keyword}"表达了方向或目标变化`,
    extractedInfo: {
      direction: userMessage,
      topic: extractTopic(userMessage),
    },
  };
}

/** 构建长期目标分析结果 */
function buildGoalResult(
  userMessage: string,
  keyword: string,
): AnalysisResult {
  return {
    trigger: 'long-term-goal',
    pagesToUpdate: [
      WIKI_PAGES.CURRENT_STATE,
      WIKI_PAGES.LIFE_CHART, // 长期目标可能影响命谱理解
    ],
    reason: `用户使用"${keyword}"表达了长期目标`,
    extractedInfo: {
      goal: userMessage,
      topic: extractTopic(userMessage),
    },
  };
}

/** 判断是否为实质性消息（非简短回应） */
function isSubstantiveMessage(message: string): boolean {
  // 去掉标点和空格后，至少 10 个字符才算实质性内容
  const stripped = message.replace(/[\s\p{P}]/gu, '');
  return stripped.length >= 10;
}

/** 尝试提取引号中的内容 */
function extractQuotedContent(text: string): string | undefined {
  const patterns = [
    /[「「"]([^」」"]+)[」」"]/,  // 中文引号
    /"([^"]+)"/,                   // 英文引号
    /『([^』]+)』/,                 // 书名号
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

/** 从消息中提取话题关键词（简单实现） */
function extractTopic(message: string): string {
  // 取消息的前 30 个字符作为话题摘要
  const cleaned = message.replace(/[\n\r]+/g, ' ').trim();
  return cleaned.length > 30 ? cleaned.slice(0, 30) + '...' : cleaned;
}

// ─── Content Generator ──────────────────────────────────────────────────────

/**
 * 生成 Wiki 页面更新内容。
 * 当前为规则 + mock 实现，预留 LLM 接口。
 */
export class ContentGenerator {
  constructor(private llm?: LLMAdapter) {}

  /**
   * 根据分析结果，为指定页面生成更新内容。
   */
  async generateUpdate(
    pagePath: string,
    analysis: AnalysisResult,
    existingContent: string,
    lifeChartMd: string,
    activeMemoryMd: string,
  ): Promise<{ content: string; reason: string }> {
    // 优先尝试 LLM
    if (this.llm) {
      const llmResult = await this.generateWithLLM(pagePath, analysis, existingContent);
      if (llmResult) return llmResult;
    }

    // 回退到规则生成
    return this.generateWithRules(pagePath, analysis, existingContent, lifeChartMd, activeMemoryMd);
  }

  /** LLM 生成（预留接口） */
  private async generateWithLLM(
    pagePath: string,
    analysis: AnalysisResult,
    existingContent: string,
  ): Promise<{ content: string; reason: string } | null> {
    if (!this.llm) return null;

    const systemPrompt = buildSystemPrompt(pagePath);
    const userPrompt = buildUserPrompt(pagePath, analysis, existingContent);

    const result = await this.llm.generate(userPrompt, {
      systemPrompt,
      maxTokens: 1000,
      temperature: 0.3,
    });

    if (!result) return null;

    return {
      content: result,
      reason: `[LLM] ${analysis.reason}`,
    };
  }

  /** 规则生成（当前实现） */
  private generateWithRules(
    pagePath: string,
    analysis: AnalysisResult,
    existingContent: string,
    lifeChartMd: string,
    _activeMemoryMd: string,
  ): Promise<{ content: string; reason: string }> {
    const now = formatDate();
    const { extractedInfo } = analysis;

    switch (pagePath) {
      case WIKI_PAGES.CURRENT_STATE:
        return Promise.resolve(this.generateCurrentState(existingContent, analysis, now));
      case WIKI_PAGES.TIMELINE:
        return Promise.resolve(this.generateTimeline(existingContent, analysis, now));
      case WIKI_PAGES.LIFE_CHART:
        return Promise.resolve(this.generateLifeChart(existingContent, analysis, lifeChartMd, now));
      case WIKI_PAGES.RULES:
        return Promise.resolve(this.generateRules(existingContent, analysis, now));
      case WIKI_PAGES.OPEN_THREADS:
        return Promise.resolve(this.generateOpenThreads(existingContent, analysis, now));
      default:
        return Promise.resolve({
          content: existingContent,
          reason: `未知页面路径: ${pagePath}，跳过更新`,
        });
    }
  }

  /** 生成 current-state 页面更新 */
  private generateCurrentState(
    existing: string,
    analysis: AnalysisResult,
    date: string,
  ): { content: string; reason: string } {
    const { trigger, extractedInfo } = analysis;
    const section = extractSection(existing, '当前理解') || '（尚未建立）';

    let newSection: string;
    switch (trigger) {
      case 'user-correction':
        newSection = [
          section,
          '',
          `### 修正记录 (${date})`,
          `- **旧理解**: ${extractedInfo.oldUnderstanding || '（未提取到）'}`,
          `- **新理解**: ${extractedInfo.newUnderstanding || '（未提取到）'}`,
          `- **修正原因**: ${extractedInfo.correction || '用户纠正'}`,
        ].join('\n');
        break;
      case 'direction-change':
        newSection = [
          section,
          '',
          `### 方向变化 (${date})`,
          `- **新方向**: ${extractedInfo.direction || '（未提取到）'}`,
        ].join('\n');
        break;
      case 'long-term-goal':
        newSection = [
          section,
          '',
          `### 长期目标 (${date})`,
          `- **目标**: ${extractedInfo.goal || '（未提取到）'}`,
        ].join('\n');
        break;
      default:
        return { content: existing, reason: '无实质性变化' };
    }

    const content = updateOrAppendSection(existing, '当前理解', newSection);
    return { content, reason: `[规则] 更新当前理解: ${analysis.reason}` };
  }

  /** 生成 timeline 页面更新 */
  private generateTimeline(
    existing: string,
    analysis: AnalysisResult,
    date: string,
  ): { content: string; reason: string } {
    const { trigger, extractedInfo } = analysis;
    const eventLine = `- **${date}** [${trigger}] ${extractedInfo.topic || extractedInfo.direction || extractedInfo.correction || '（无摘要）'}`;

    const content = appendToSection(existing, '时间线', eventLine);
    return { content, reason: `[规则] 追加时间线事件: ${analysis.reason}` };
  }

  /** 生成 life-chart 页面更新 */
  private generateLifeChart(
    existing: string,
    analysis: AnalysisResult,
    lifeChartMd: string,
    date: string,
  ): { content: string; reason: string } {
    const { trigger, extractedInfo } = analysis;

    if (trigger === 'long-term-goal') {
      const entry = [
        '',
        `### 命谱理解演变 (${date})`,
        `- **触发**: 用户表达长期目标`,
        `- **目标内容**: ${extractedInfo.goal || '（未提取到）'}`,
        `- **命谱参照**: ${lifeChartMd.slice(0, 200)}${lifeChartMd.length > 200 ? '...' : ''}`,
      ].join('\n');

      const content = appendToSection(existing, '理解演变', entry);
      return { content, reason: `[规则] 记录命谱理解演变: ${analysis.reason}` };
    }

    if (trigger === 'understanding-shift') {
      const entry = [
        '',
        `### 理解修正 (${date})`,
        `- **旧理解**: ${extractedInfo.oldUnderstanding || '（未提取到）'}`,
        `- **新理解**: ${extractedInfo.newUnderstanding || '（未提取到）'}`,
      ].join('\n');

      const content = appendToSection(existing, '理解演变', entry);
      return { content, reason: `[规则] 记录理解修正: ${analysis.reason}` };
    }

    return { content: existing, reason: '命谱理解无变化' };
  }

  /** 生成 rules 页面更新 */
  private generateRules(
    existing: string,
    analysis: AnalysisResult,
    date: string,
  ): { content: string; reason: string } {
    const { trigger, extractedInfo } = analysis;

    if (trigger !== 'user-correction') {
      return { content: existing, reason: '仅纠正类消息触发规则更新' };
    }

    const ruleEntry = [
      '',
      `### 纠正规则 (${date})`,
      `- **用户纠正**: ${extractedInfo.correction || '（未提取到）'}`,
      `- **旧理解**: ${extractedInfo.oldUnderstanding || '（未提取到）'}`,
      `- **正确理解**: ${extractedInfo.newUnderstanding || '（未提取到）'}`,
      `- **未来规则**: 以后遇到类似话题，必须按新理解回应`,
    ].join('\n');

    const content = appendToSection(existing, '回应规则', ruleEntry);
    return { content, reason: `[规则] 新增纠正规则: ${analysis.reason}` };
  }

  /** 生成 open-threads 页面更新 */
  private generateOpenThreads(
    existing: string,
    analysis: AnalysisResult,
    date: string,
  ): { content: string; reason: string } {
    const { trigger, extractedInfo } = analysis;

    if (trigger === 'direction-change') {
      const thread = `- **${date}** [方向变化] ${extractedInfo.direction || '（未提取到）'} — 待跟进`;
      const content = appendToSection(existing, '未完成话题', thread);
      return { content, reason: `[规则] 新增开放线索: ${analysis.reason}` };
    }

    return { content: existing, reason: '无需新增开放线索' };
  }
}

// ─── Markdown Helpers ────────────────────────────────────────────────────────

/**
 * 从 Markdown 中提取指定标题下的内容。
 * 查找 "## 标题" 或 "### 标题"，返回其下方内容直到下一个同级标题。
 */
function extractSection(markdown: string, headingKeyword: string): string | null {
  const lines = markdown.split('\n');
  let inSection = false;
  let sectionLevel = 0;
  const sectionLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2];
      if (title.includes(headingKeyword)) {
        inSection = true;
        sectionLevel = level;
        continue;
      }
      if (inSection && level <= sectionLevel) {
        break; // 遇到同级或更高级标题，结束
      }
    }
    if (inSection) {
      sectionLines.push(line);
    }
  }

  return sectionLines.length > 0 ? sectionLines.join('\n').trim() : null;
}

/**
 * 替换 Markdown 中指定标题下的内容。
 * 如果标题不存在，在末尾追加新章节。
 */
function updateOrAppendSection(
  markdown: string,
  headingKeyword: string,
  newContent: string,
): string {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let inSection = false;
  let sectionLevel = 0;
  let sectionReplaced = false;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2];

      if (title.includes(headingKeyword) && !sectionReplaced) {
        inSection = true;
        sectionLevel = level;
        result.push(line);
        result.push('');
        result.push(newContent);
        result.push('');
        continue;
      }
      if (inSection && level <= sectionLevel) {
        inSection = false;
        sectionReplaced = true;
      }
    }
    if (!inSection) {
      result.push(line);
    }
  }

  // 标题不存在，追加
  if (!sectionReplaced) {
    result.push('');
    result.push(`## ${headingKeyword}`);
    result.push('');
    result.push(newContent);
  }

  return result.join('\n').trim();
}

/**
 * 在 Markdown 指定标题下追加一行内容。
 */
function appendToSection(
  markdown: string,
  headingKeyword: string,
  line: string,
): string {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let insertIndex = -1;
  let inSection = false;
  let sectionLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const headingMatch = lines[i].match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2];

      if (title.includes(headingKeyword)) {
        inSection = true;
        sectionLevel = level;
        result.push(lines[i]);
        continue;
      }
      if (inSection && level <= sectionLevel) {
        // 在下一个同级标题前插入
        if (insertIndex === -1) {
          insertIndex = result.length;
        }
        inSection = false;
      }
    }
    result.push(lines[i]);
  }

  // 在节尾或文件尾插入
  if (insertIndex === -1) {
    if (inSection) {
      // 在文件末尾追加
      result.push(line);
    } else {
      // 标题不存在，创建新章节
      result.push('');
      result.push(`## ${headingKeyword}`);
      result.push('');
      result.push(line);
    }
  } else {
    result.splice(insertIndex, 0, line);
  }

  return result.join('\n').trim();
}

/** 格式化当前日期 */
function formatDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ─── Prompt Builders (for LLM) ──────────────────────────────────────────────

function buildSystemPrompt(pagePath: string): string {
  const base = `你是 Guoliang Echo 的记忆系统。你的任务是维护长期关系 Wiki，而不是总结聊天。
你必须严格遵守以下原则：
- 用户纠正 AI → 必须保存到 rules/future-response-rules
- 用户改变产品方向 → 必须保存到 relationship/current-state
- 用户表达长期目标 → 必须保存
- 用户对某事的理解发生变化 → 必须记录"旧理解 → 新修正"
- 旧理解被推翻时不要直接删除，要记录演变过程
- 普通闲聊不要保存
- 记忆必须能影响未来回复`;

  const pageSpecific: Record<string, string> = {
    [WIKI_PAGES.CURRENT_STATE]: `
当前页面是 relationship/current-state。
你需要更新"当前理解"部分，记录用户关系状态的最新变化。
如果是纠正，格式：旧理解 → 新理解 → 修正原因。`,
    [WIKI_PAGES.TIMELINE]: `
当前页面是 relationship/timeline。
你需要在时间线末尾追加一个事件条目。
格式：- **YYYY-MM-DD** [事件类型] 事件描述`,
    [WIKI_PAGES.LIFE_CHART]: `
当前页面是 user/life-chart-interpretations。
你需要记录对命谱理解的版本变化。
格式：旧理解版本 → 新理解版本 → 变化原因。`,
    [WIKI_PAGES.RULES]: `
当前页面是 rules/future-response-rules。
你需要添加一条未来必须遵守的回应规则。
每条规则必须包含：触发条件、正确回应方式、来源（哪次对话）。`,
    [WIKI_PAGES.OPEN_THREADS]: `
当前页面是 relationship/open-threads。
你需要记录未完成的话题或下次可以继续推进的线索。
格式：- **日期** [类型] 线索描述 — 待跟进`,
  };

  return base + (pageSpecific[pagePath] || '');
}

function buildUserPrompt(
  pagePath: string,
  analysis: AnalysisResult,
  existingContent: string,
): string {
  return `
## 当前页面内容
\`\`\`markdown
${existingContent || '（空页面）'}
\`\`\`

## 分析结果
- 触发类型: ${analysis.trigger}
- 触发原因: ${analysis.reason}
- 提取信息:
${JSON.stringify(analysis.extractedInfo, null, 2)}

## 任务
请更新页面 "${pagePath}" 的内容。
只返回完整的更新后 Markdown 内容，不要添加额外解释。
`;
}

// ─── Active Memory Helper ────────────────────────────────────────────────────

/**
 * 生成 active memory 简要摘要（即使不更新 Wiki，也要更新 active memory）。
 */
export function generateActiveMemorySummary(
  userMessage: string,
  assistantMessage: string,
  analysis: AnalysisResult,
): string {
  const timestamp = formatDate();

  if (analysis.trigger === 'none') {
    // 普闲聊：只保留一行摘要
    const topic = userMessage.slice(0, 50).replace(/\n/g, ' ');
    return `[${timestamp}] 闲聊: ${topic}`;
  }

  // 有实质性变化：详细记录
  const parts = [`[${timestamp}] ${analysis.reason}`];
  if (analysis.extractedInfo.correction) {
    parts.push(`纠正: ${analysis.extractedInfo.correction.slice(0, 80)}`);
  }
  if (analysis.extractedInfo.direction) {
    parts.push(`方向: ${analysis.extractedInfo.direction.slice(0, 80)}`);
  }
  if (analysis.extractedInfo.goal) {
    parts.push(`目标: ${analysis.extractedInfo.goal.slice(0, 80)}`);
  }
  return parts.join(' | ');
}

// ─── Main Entry ──────────────────────────────────────────────────────────────

/**
 * 每轮对话后更新关系 Wiki。
 *
 * 流程：
 * 1. 分析用户消息，判断触发类型
 * 2. 对需要更新的页面，生成新内容
 * 3. 返回更新后的页面列表和 active memory
 */
export async function updateRelationshipWiki(params: {
  lifeChartMd: string;
  activeMemoryMd: string;
  recentMessages: Message[];
  userMessage: string;
  assistantMessage: string;
  /** 可选 LLM 适配器，不传则使用纯规则引擎 */
  llm?: LLMAdapter;
  /** 可选：现有的 Wiki 页面内容（按路径索引） */
  existingPages?: Record<string, string>;
}): Promise<{
  updatedPages: WikiPage[];
  activeMemoryMd: string;
  editSummaries: string[];
}> {
  const {
    lifeChartMd,
    activeMemoryMd,
    recentMessages,
    userMessage,
    assistantMessage,
    llm,
    existingPages = {},
  } = params;

  // Step 1: 分析消息
  const analysis = analyzeMessage(userMessage, assistantMessage, recentMessages);

  // Step 2: 生成 active memory 摘要
  const newActiveMemoryEntry = generateActiveMemorySummary(
    userMessage,
    assistantMessage,
    analysis,
  );
  const updatedActiveMemoryMd = activeMemoryMd
    ? `${activeMemoryMd}\n${newActiveMemoryEntry}`
    : newActiveMemoryEntry;

  // Step 3: 如果无需更新 Wiki，直接返回
  if (analysis.trigger === 'none') {
    return {
      updatedPages: [],
      activeMemoryMd: updatedActiveMemoryMd,
      editSummaries: ['普通闲聊，仅更新 active memory'],
    };
  }

  // Step 4: 更新需要更新的页面
  const generator = new ContentGenerator(llm);
  const updatedPages: WikiPage[] = [];
  const editSummaries: string[] = [];

  for (const pagePath of analysis.pagesToUpdate) {
    const existing = existingPages[pagePath] || getDefaultPageContent(pagePath);
    const { content, reason } = await generator.generateUpdate(
      pagePath,
      analysis,
      existing,
      lifeChartMd,
      activeMemoryMd,
    );

    // 只有内容真正变化时才标记为更新
    if (content !== existing) {
      updatedPages.push({
        path: pagePath,
        title: getPageTitle(pagePath),
        content,
        updatedAt: Date.now(),
        lastEditReason: reason,
      });
      editSummaries.push(reason);
    }
  }

  return {
    updatedPages,
    activeMemoryMd: updatedActiveMemoryMd,
    editSummaries,
  };
}

/** 获取页面默认内容 */
function getDefaultPageContent(path: string): string {
  const defaults: Record<string, string> = {
    [WIKI_PAGES.CURRENT_STATE]: [
      '# 关系当前状态',
      '',
      '## 当前理解',
      '（尚未建立）',
    ].join('\n'),
    [WIKI_PAGES.TIMELINE]: [
      '# 关系时间线',
      '',
      '## 时间线',
    ].join('\n'),
    [WIKI_PAGES.LIFE_CHART]: [
      '# 命谱理解版本',
      '',
      '## 理解演变',
    ].join('\n'),
    [WIKI_PAGES.RULES]: [
      '# 未来回应规则',
      '',
      '## 回应规则',
    ].join('\n'),
    [WIKI_PAGES.OPEN_THREADS]: [
      '# 未完成话题',
      '',
      '## 未完成话题',
    ].join('\n'),
  };
  return defaults[path] || `# ${path}`;
}

/** 获取页面标题 */
function getPageTitle(path: string): string {
  const titles: Record<string, string> = {
    [WIKI_PAGES.CURRENT_STATE]: '关系当前状态',
    [WIKI_PAGES.TIMELINE]: '关系时间线',
    [WIKI_PAGES.LIFE_CHART]: '命谱理解版本',
    [WIKI_PAGES.RULES]: '未来回应规则',
    [WIKI_PAGES.OPEN_THREADS]: '未完成话题',
  };
  return titles[path] || path;
}

// ─── Exports for Testing ─────────────────────────────────────────────────────

export const _internal = {
  WIKI_PAGES,
  CORRECTION_KEYWORDS,
  DIRECTION_KEYWORDS,
  LONG_TERM_KEYWORDS,
  extractSection,
  updateOrAppendSection,
  appendToSection,
  formatDate,
  buildSystemPrompt,
  buildUserPrompt,
};

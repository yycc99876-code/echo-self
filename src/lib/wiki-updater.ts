import {
  addWikiEdit,
  getMessages,
  getWikiPages,
  type Message,
  updateActiveMemory,
  upsertWikiPage,
} from "./server-memory-store";
import { shouldWriteLongTermMemory, type ContextPack, type ConversationType } from "./conversation-context";

export interface WikiUpdate {
  slug: string;
  title: string;
  action: "created" | "updated";
  editSummary: string;
}

export type MemoryWriterInput = {
  userMessage: Message;
  assistantMessage: Message;
  conversationType: ConversationType;
  contextPack: ContextPack;
};

export type MemoryWriterResult = {
  shouldWrite: boolean;
  reason: string;
  updates?: WikiUpdate[];
  activeMemoryPatch?: string;
};

const PAGE = {
  currentState: "relationship/current-state",
  timeline: "relationship/timeline",
  openThreads: "relationship/open-threads",
  rules: "rules/future-response-rules",
  currentTheme: "destiny/current-theme",
  repeatedQuestions: "destiny/repeated-questions",
  decisionPatterns: "destiny/decision-patterns",
  lifeChart: "user/life-chart-interpretations",
  preferences: "user/preferences",
  productDirection: "product/current-direction",
  sessionSummaries: "conversation/session-summaries",
} as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function trimForMemory(text: string, max = 220) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}...` : clean;
}

function appendEntry(existing: string, title: string, entry: string) {
  if (existing.includes(entry)) return existing;
  return existing ? `${existing}\n${entry}` : `# ${title}\n\n${entry}`;
}

function writePage({
  slug,
  title,
  tags,
  entry,
  editSummary,
  relatedSlugs = [],
  sourceMessageIds,
  sourceQuotes,
}: {
  slug: string;
  title: string;
  tags: string[];
  entry: string;
  editSummary: string;
  relatedSlugs?: string[];
  sourceMessageIds: string[];
  sourceQuotes: string[];
}): WikiUpdate {
  const existing = getWikiPages().find((page) => page.slug === slug);
  const previousQuotes = existing?.sourceQuotes ?? [];
  const repeated = previousQuotes.some((quote) => quote === sourceQuotes[0]);
  if (repeated && existing) {
    return { slug, title, action: "updated", editSummary: "跳过重复线索" };
  }

  upsertWikiPage({
    slug,
    title,
    tags,
    contentMd: appendEntry(existing?.contentMd ?? "", title, entry),
    relatedSlugs,
    sourceMessageIds: [...new Set([...(existing?.sourceMessageIds ?? []), ...sourceMessageIds])],
    sourceQuotes: [...new Set([...previousQuotes, ...sourceQuotes])].slice(-16),
  });
  addWikiEdit({ pageSlug: slug, editSummary });
  return { slug, title, action: existing ? "updated" : "created", editSummary };
}

function correctionRule(message: string) {
  if (/AI\s*男友|男友|恋爱|伴侣/.test(message)) {
    return "不要把产品理解成 AI 男友或恋爱陪伴。正确理解：命谱数字人、长期记忆机制、Relationship Wiki 与自我理解产品。";
  }
  if (/玄学|空泛|抽象/.test(message)) {
    return "用户希望 Echo 避免过度玄学和抽象鼓励，优先给具体、清醒、可执行的判断。";
  }
  if (/产品经理|产品分析|具体/.test(message)) {
    return "用户偏好像产品经理一样的分析：具体、直接、讲机制和下一步，不要泛泛安慰。";
  }
  if (/语音|声音|TTS|生硬/.test(message)) {
    return "用户重视语音体验，希望 Echo 的声音自然、可被打断，不要像生硬的浏览器默认朗读。";
  }
  return `用户对未来回应方式作出纠正：${trimForMemory(message)}`;
}

function activeMemoryFor(type: ConversationType, userMessage: string, pack: ContextPack) {
  const lines = [
    "# Active Memory",
    "",
    pack.futureRules.length ? `最高优先规则：${pack.futureRules.slice(-2).join("；")}` : "",
    `最近重要输入：${trimForMemory(userMessage, 180)}`,
    "",
  ].filter(Boolean);

  if (type === "product_direction") {
    lines.push("当前重点：用户正在打磨 Echo Self 的长期对话、记忆质量、语音实时交互和越用越懂用户的智能体机制。");
  } else if (type === "relationship") {
    lines.push("当前重点：用户在处理关系线索。Echo 应给边界和小行动，不替用户做决定。");
  } else if (type === "correction" || type === "preference") {
    lines.push("当前重点：用户刚刚修正了 Echo 的理解或表达风格。未来回应必须优先遵守这些规则。");
  } else if (type === "emotion") {
    lines.push("当前重点：用户表达了持续情绪。Echo 应先接住状态，再给很小的下一步。");
  } else {
    lines.push("当前重点：支持自然连续对话。普通闲聊只进入 Recent Messages，长期价值信息才写入 Memory。");
  }

  return lines.join("\n").slice(0, 620);
}

function currentThemeFor(type: ConversationType) {
  if (type === "product_direction") return "产品机制与长期智能体";
  if (type === "relationship") return "重要关系与边界判断";
  if (type === "correction" || type === "preference") return "未来回应规则更新";
  if (type === "emotion") return "反复情绪与现实节奏";
  if (type === "life_direction" || type === "life_chart_question") return "命谱主题与方向选择";
  return "连续对话与长期理解";
}

export async function runMemoryWriter(input: MemoryWriterInput): Promise<MemoryWriterResult> {
  const { userMessage, assistantMessage, conversationType, contextPack } = input;

  if (!shouldWriteLongTermMemory(conversationType, userMessage.content)) {
    return {
      shouldWrite: false,
      reason: conversationType === "casual" ? "casual_reaction_no_long_term_value" : "no_long_term_value",
    };
  }

  const date = today();
  const sourceMessageIds = [userMessage.id, assistantMessage.id];
  const sourceQuotes = [userMessage.content];
  const updates: WikiUpdate[] = [];
  const entry = `- [${date}] 用户说：“${trimForMemory(userMessage.content)}”\n  Echo 回应摘要：${trimForMemory(assistantMessage.content, 180)}`;

  if (conversationType === "correction" || conversationType === "preference") {
    updates.push(
      writePage({
        slug: PAGE.rules,
        title: "Future Response Rules",
        tags: ["correction", "preference", "rules"],
        entry: `- [${date}] ${correctionRule(userMessage.content)}`,
        editSummary: "记录用户对未来回应方式的纠正",
        relatedSlugs: [PAGE.preferences, PAGE.productDirection],
        sourceMessageIds,
        sourceQuotes,
      }),
    );
    updates.push(
      writePage({
        slug: PAGE.preferences,
        title: "User Preferences",
        tags: ["preference"],
        entry: `- [${date}] ${trimForMemory(userMessage.content)}`,
        editSummary: "更新用户长期偏好",
        relatedSlugs: [PAGE.rules],
        sourceMessageIds,
        sourceQuotes,
      }),
    );
  }

  if (conversationType === "product_direction") {
    updates.push(
      writePage({
        slug: PAGE.productDirection,
        title: "Product Current Direction",
        tags: ["product", "direction"],
        entry,
        editSummary: "更新产品方向记忆",
        relatedSlugs: [PAGE.rules, PAGE.openThreads],
        sourceMessageIds,
        sourceQuotes,
      }),
    );
  }

  if (conversationType === "life_direction" || conversationType === "life_chart_question" || conversationType === "emotion") {
    updates.push(
      writePage({
        slug: PAGE.currentTheme,
        title: "Current Theme",
        tags: ["destiny", "theme"],
        entry,
        editSummary: "更新当前命谱主题",
        relatedSlugs: [PAGE.repeatedQuestions, PAGE.decisionPatterns],
        sourceMessageIds,
        sourceQuotes,
      }),
    );
  }

  if (conversationType === "life_direction" || conversationType === "emotion") {
    updates.push(
      writePage({
        slug: PAGE.repeatedQuestions,
        title: "Repeated Questions",
        tags: ["destiny", "questions"],
        entry: `- [${date}] ${trimForMemory(userMessage.content)}`,
        editSummary: "记录反复出现的问题或情绪",
        relatedSlugs: [PAGE.currentTheme],
        sourceMessageIds,
        sourceQuotes,
      }),
    );
  }

  if (conversationType === "relationship") {
    updates.push(
      writePage({
        slug: PAGE.currentState,
        title: "Relationship Current State",
        tags: ["relationship", "state"],
        entry,
        editSummary: "更新关系当前状态",
        relatedSlugs: [PAGE.timeline, PAGE.openThreads],
        sourceMessageIds,
        sourceQuotes,
      }),
    );
    updates.push(
      writePage({
        slug: PAGE.openThreads,
        title: "Open Threads",
        tags: ["relationship", "threads"],
        entry: `- [${date}] 未完成关系话题：${trimForMemory(userMessage.content)}`,
        editSummary: "记录未完成关系话题",
        relatedSlugs: [PAGE.currentState],
        sourceMessageIds,
        sourceQuotes,
      }),
    );
  }

  const activeMemoryPatch = activeMemoryFor(conversationType, userMessage.content, contextPack);
  updateActiveMemory({
    currentTheme: currentThemeFor(conversationType),
    contentMd: activeMemoryPatch,
  });

  return {
    shouldWrite: true,
    reason: "long_term_value_detected",
    updates,
    activeMemoryPatch,
  };
}

export function queueMemoryWriter(input: MemoryWriterInput) {
  setTimeout(() => {
    runMemoryWriter(input).catch((error) => {
      console.error("[memory-writer] failed", error);
    });
  }, 0);
}

export function queueConversationConsolidation() {
  setTimeout(() => {
    try {
      const messages = getMessages();
      if (messages.length < 12 || messages.length % 10 !== 0) return;
      const window = messages.slice(-10);
      const meaningful = window.filter((message) =>
        ["correction", "preference", "product_direction", "life_direction", "relationship", "emotion", "frustration"].includes(
          message.conversationType ?? "",
        ),
      );
      if (meaningful.length < 2) return;

      const date = today();
      const sourceMessageIds = window.map((message) => message.id);
      const userLines = meaningful
        .filter((message) => message.role === "user")
        .map((message) => `- ${message.conversationType}: ${trimForMemory(message.content, 120)}`)
        .join("\n");

      writePage({
        slug: PAGE.sessionSummaries,
        title: "Conversation Session Summaries",
        tags: ["conversation", "summary"],
        entry: `- [${date}] 最近一段对话的可延续线索：\n${userLines}`,
        editSummary: "长对话窗口压缩摘要",
        relatedSlugs: [PAGE.rules, PAGE.productDirection, PAGE.currentTheme],
        sourceMessageIds,
        sourceQuotes: meaningful.map((message) => trimForMemory(message.content, 120)).slice(-8),
      });
    } catch (error) {
      console.error("[conversation-consolidation] failed", error);
    }
  }, 0);
}

import {
  addWikiEdit,
  getWikiPages,
  type Message,
  type WikiPage,
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
} as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function appendEntry(existing: string, title: string, entry: string) {
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
  upsertWikiPage({
    slug,
    title,
    tags,
    contentMd: appendEntry(existing?.contentMd ?? "", title, entry),
    relatedSlugs,
    sourceMessageIds: [...new Set([...(existing?.sourceMessageIds ?? []), ...sourceMessageIds])],
    sourceQuotes: [...new Set([...(existing?.sourceQuotes ?? []), ...sourceQuotes])].slice(-12),
  });
  addWikiEdit({ pageSlug: slug, editSummary });
  return { slug, title, action: existing ? "updated" : "created", editSummary };
}

function correctionRule(message: string) {
  if (/AI 男友|男友|伴侣/.test(message)) {
    return "用户明确纠正：不要把产品理解成 AI 男友。正确理解是命谱数字人、长期记忆机制和 Relationship Wiki。";
  }
  if (/玄学/.test(message)) {
    return "用户希望 Echo 避免过度玄学化表达，优先给具体、清晰、可执行的判断。";
  }
  if (/产品经理|产品分析|具体/.test(message)) {
    return "用户偏好更具体、像产品经理一样的分析，少给抽象鼓励。";
  }
  return `用户对未来回应方式作出纠正：${message}`;
}

export async function runMemoryWriter(input: MemoryWriterInput): Promise<MemoryWriterResult> {
  const { userMessage, assistantMessage, conversationType } = input;

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
  const entry = `- [${date}] 用户说：「${userMessage.content}」\n  Echo 回应摘要：${assistantMessage.content.slice(0, 160)}`;

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
        entry: `- [${date}] ${userMessage.content}`,
        editSummary: "更新用户长期偏好",
        relatedSlugs: [PAGE.rules],
        sourceMessageIds,
        sourceQuotes,
      }),
    );
  }

  if (conversationType === "product_direction" || /产品|AI|MVP|记忆机制|连续对话/.test(userMessage.content)) {
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
        entry: `- [${date}] ${userMessage.content}`,
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
        entry: `- [${date}] 未完成关系话题：${userMessage.content}`,
        editSummary: "记录未完成关系话题",
        relatedSlugs: [PAGE.currentState],
        sourceMessageIds,
        sourceQuotes,
      }),
    );
  }

  const activeMemoryPatch = [
    "# Active Memory",
    "",
    conversationType === "casual"
      ? "用户正在进行轻量闲聊。普通闲聊只进入 Recent Messages，不写入长期记忆。"
      : `用户最新重要主题：${userMessage.content}`,
    "",
    "当前最高优先级：支持自然连续对话，遵守用户纠正，只把有长期价值的信息写入 Memory。",
  ].join("\n");

  updateActiveMemory({
    currentTheme:
      conversationType === "product_direction"
        ? "产品连续对话与长期记忆机制"
        : conversationType === "relationship"
          ? "重要关系与边界判断"
          : conversationType === "correction" || conversationType === "preference"
            ? "未来回应规则更新"
            : "命谱主题与现实行动",
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

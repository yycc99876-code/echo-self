import type { ActiveMemory, LifeChart, Message, RelationshipItem, WikiPage } from "./server-memory-store";

export type ConversationType =
  | "onboarding"
  | "casual"
  | "meta"
  | "frustration"
  | "action_request"
  | "life_direction"
  | "relationship"
  | "emotion"
  | "product_direction"
  | "life_chart_question"
  | "correction"
  | "preference"
  | "unknown";

export type ContextPack = {
  lifeChartSummary: string | null;
  activeMemory: string | null;
  futureRules: string[];
  recentMessages: Message[];
  relevantWikiPages: WikiPage[];
  openThreads: string[];
  userPreferences: string[];
  relationshipSummary: string | null;
};

const MAX = {
  lifeChart: 600,
  activeMemory: 520,
  wikiPage: 320,
  relationship: 480,
};

function hasAny(input: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(input));
}

export function classifyConversation(message: string): ConversationType {
  const text = message.trim();
  if (!text) return "unknown";

  if (hasAny(text, [/傻逼|垃圾|狗屎|你在干什么|你在干嘛|什么意思|啥意思|听不懂|没懂|乱说|别瞎|有病|离谱|不对劲/])) {
    return "frustration";
  }

  if (hasAny(text, [/你是谁|你能干什么|你现在.*干嘛|你到底.*干嘛|这个产品.*怎么用|为什么.*回复|机制|逻辑/])) {
    return "meta";
  }

  if (hasAny(text, [/不要|别把|别总|不是.*意思|不是.*产品|你理解错|你误解|纠正|以后你|下次你|记住|你要记住/])) {
    return "correction";
  }

  if (hasAny(text, [/我更喜欢|我不喜欢|我希望你|回答.*具体|直接一点|别空泛|像产品经理|少点玄学|别玄学|语气|风格/])) {
    return "preference";
  }

  if (hasAny(text, [/Echo Self|AuraMate|产品|AI\s*产品|MVP|创业|founder|用户|复刻|功能|界面|交互|连续对话|长对话|记忆系统|智能体|agent|TTS|语音|Codex|Claude|Antigravity/i])) {
    return "product_direction";
  }

  if (hasAny(text, [/关系|联系|朋友|家人|父母|同学|导师|合作|同事|旧友|前任|见她|见他|回复.*人|很久没联系/])) {
    return "relationship";
  }

  if (hasAny(text, [/今天.*干什么|周[一二三四五六日天末].*干什么|建议我.*干什么|我该干什么|做什么|安排一下|今天.*先做|现在.*做什么/])) {
    return "action_request";
  }

  if (hasAny(text, [/适合.*方向|转向|职业|人生|未来|以后.*做什么|该不该|选择|方向|投入|长期|目标/])) {
    return "life_direction";
  }

  if (hasAny(text, [/命谱|Life Chart|life chart|八字|星盘|反复出现.*主题|天赋|命格|运势|灵签/i])) {
    return "life_chart_question";
  }

  if (hasAny(text, [/焦虑|烦|累|困|懵|难受|撑不住|压力|兴奋|迷茫|害怕|失眠|崩|低落|委屈|反复|一直|总是/])) {
    return "emotion";
  }

  if (
    text.length <= 48 &&
    hasAny(text, [/哈哈+|^哈+$|你在吗|在吗|早|晚安|刚醒|随便聊|轻松点|不知道该干嘛|hi|hello|你好|嗯嗯|ok|好呀|行吧/i])
  ) {
    return "casual";
  }

  return "unknown";
}

export function shouldWriteLongTermMemory(type: ConversationType, message: string) {
  if (type === "correction" || type === "preference") return true;
  if (type === "product_direction" || type === "life_direction" || type === "life_chart_question" || type === "relationship") return true;
  if (type === "emotion" && hasAny(message, [/一直|总是|最近|反复|持续|撑不住|长期|每天|又开始/])) return true;
  if (hasAny(message, [/以后.*记住|你要记住|长期目标|我想做|我希望|稳定|不要忘/])) return true;
  return false;
}

function truncate(text: string | null | undefined, max: number) {
  if (!text) return null;
  const clean = text.replace(/\n{3,}/g, "\n\n").trim();
  return clean.length > max ? `${clean.slice(0, max)}...` : clean;
}

function linesFromPage(pages: WikiPage[], slug: string, maxItems: number) {
  const page = pages.find((item) => item.slug === slug);
  if (!page) return [];
  return page.contentMd
    .split("\n")
    .map((line) => line.replace(/^[-#\s]+/, "").trim())
    .filter((line) => line.length > 8)
    .slice(-maxItems);
}

function summarizeRelationships(items: RelationshipItem[]) {
  if (items.length === 0) return null;
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = (acc[item.type] ?? 0) + 1;
    return acc;
  }, {});
  const countLine = Object.entries(counts)
    .map(([type, count]) => `${type}: ${count}`)
    .join(", ");
  const notes = items
    .filter((item) => item.notes.trim())
    .slice(-3)
    .map((item) => `- ${item.name} (${item.type}, ${item.strength}): ${item.notes}`)
    .join("\n");
  return truncate(`Relationship counts: ${countLine}${notes ? `\n${notes}` : ""}`, MAX.relationship);
}

function relevantPages(pages: WikiPage[], type: ConversationType) {
  const priorityByType: Record<ConversationType, string[]> = {
    onboarding: ["rules/future-response-rules", "user/preferences"],
    casual: ["rules/future-response-rules", "user/preferences"],
    meta: ["rules/future-response-rules", "user/preferences", "product/current-direction"],
    frustration: ["rules/future-response-rules", "user/preferences"],
    action_request: ["rules/future-response-rules", "user/preferences", "destiny/current-theme"],
    correction: ["rules/future-response-rules", "user/preferences", "product/current-direction"],
    preference: ["user/preferences", "rules/future-response-rules"],
    product_direction: ["product/current-direction", "rules/future-response-rules", "conversation/session-summaries"],
    life_direction: ["destiny/current-theme", "destiny/decision-patterns", "user/life-chart-interpretations"],
    life_chart_question: ["user/life-chart-interpretations", "destiny/current-theme"],
    relationship: ["relationship/current-state", "relationship/open-threads", "relationship/timeline"],
    emotion: ["destiny/current-theme", "destiny/repeated-questions", "relationship/current-state"],
    unknown: ["destiny/current-theme", "rules/future-response-rules", "user/preferences"],
  };

  return priorityByType[type]
    .map((slug) => pages.find((page) => page.slug === slug))
    .filter((page): page is WikiPage => Boolean(page))
    .slice(0, 3)
    .map((page) => ({ ...page, contentMd: truncate(page.contentMd, MAX.wikiPage) ?? "" }));
}

export function buildContextPack({
  lifeChart,
  activeMemory,
  wikiPages,
  recentMessages,
  conversationType,
  relationshipItems = [],
}: {
  lifeChart: LifeChart | null;
  activeMemory: ActiveMemory | null;
  wikiPages: WikiPage[];
  recentMessages: Message[];
  conversationType: ConversationType;
  relationshipItems?: RelationshipItem[];
}): ContextPack {
  return {
    lifeChartSummary: truncate(lifeChart?.summaryMd ?? lifeChart?.contentMd, MAX.lifeChart),
    activeMemory: truncate(activeMemory?.contentMd, MAX.activeMemory),
    futureRules: linesFromPage(wikiPages, "rules/future-response-rules", 5),
    recentMessages: recentMessages.slice(-8),
    relevantWikiPages: relevantPages(wikiPages, conversationType),
    openThreads: linesFromPage(wikiPages, "relationship/open-threads", 3),
    userPreferences: linesFromPage(wikiPages, "user/preferences", 5),
    relationshipSummary: summarizeRelationships(relationshipItems),
  };
}

export function contextPackToPrompt(pack: ContextPack) {
  return [
    pack.futureRules.length ? `## Future Response Rules\n${pack.futureRules.map((rule) => `- ${rule}`).join("\n")}` : "",
    pack.activeMemory ? `## Active Memory\n${pack.activeMemory}` : "",
    pack.lifeChartSummary ? `## Life Chart Summary\n${pack.lifeChartSummary}` : "",
    pack.recentMessages.length
      ? `## Recent Messages\n${pack.recentMessages.map((message) => `${message.role === "user" ? "用户" : "Echo"}：${message.content}`).join("\n")}`
      : "",
    pack.relevantWikiPages.length
      ? `## Relevant Wiki Pages\n${pack.relevantWikiPages.map((page) => `### ${page.slug}\n${page.contentMd}`).join("\n\n")}`
      : "",
    pack.openThreads.length ? `## Open Threads\n${pack.openThreads.map((thread) => `- ${thread}`).join("\n")}` : "",
    pack.userPreferences.length ? `## User Preferences\n${pack.userPreferences.map((preference) => `- ${preference}`).join("\n")}` : "",
    pack.relationshipSummary ? `## Relationship Map\n${pack.relationshipSummary}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

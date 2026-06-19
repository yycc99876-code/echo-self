import type { ActiveMemory, LifeChart, Message, RelationshipItem, WikiPage } from "./server-memory-store";

export type ConversationType =
  | "casual"
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

function hasAny(input: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(input));
}

export function classifyConversation(message: string): ConversationType {
  const text = message.trim();
  if (!text) return "unknown";

  if (hasAny(text, [/不要/, /不是.*意思/, /不对/, /纠正/, /以后/, /下次/, /你理解错/, /别.*玄学/, /别把/])) {
    return "correction";
  }

  if (hasAny(text, [/我更喜欢/, /我不喜欢/, /我希望你/, /回答.*具体/, /直接一点/, /别.*空泛/, /像.*产品经理/, /你要记住/, /记住/])) {
    return "preference";
  }

  if (hasAny(text, [/产品/, /AI 产品/i, /MVP/i, /连续对话/, /记忆系统/, /AuraMate/i, /Codex/i, /Claude/i, /founder/i, /创业/])) {
    return "product_direction";
  }

  if (hasAny(text, [/关系/, /联系/, /朋友/, /家人/, /合作/, /导师/, /同学/, /旧友/, /见她/, /回复.*人/])) {
    return "relationship";
  }

  if (
    text.length <= 40 &&
    hasAny(text, [/哈哈+/, /^哈+$/, /你在吗/, /刚醒/, /随便聊/, /轻松点/, /不知道该干嘛/, /今天.*困/, /早|晚|你好|hi|hello/i])
  ) {
    return "casual";
  }

  if (hasAny(text, [/适合.*方向/, /转向/, /职业/, /人生/, /未来/, /以后.*做什么/, /该不该/, /选择/])) {
    return "life_direction";
  }

  if (hasAny(text, [/命谱/, /Life Chart/i, /反复出现.*主题/, /天赋/, /阴影/])) {
    return "life_chart_question";
  }

  if (hasAny(text, [/焦虑/, /烦/, /累/, /撑不住/, /难过/, /兴奋/, /压力/, /迷茫/, /困/, /懵/, /反复/])) {
    return "emotion";
  }

  return "unknown";
}

export function shouldWriteLongTermMemory(type: ConversationType, message: string) {
  if (type === "correction" || type === "preference") return true;
  if (type === "product_direction" || type === "life_direction" || type === "life_chart_question" || type === "relationship") return true;
  if (type === "emotion" && hasAny(message, [/一直/, /总是/, /最近/, /反复/, /持续/, /撑不住/])) return true;
  if (hasAny(message, [/以后.*记住/, /你要记住/, /长期/, /目标/, /我想做/, /我希望/])) return true;
  return false;
}

function truncate(text: string | null | undefined, max: number) {
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function extractRules(pages: WikiPage[]) {
  const rules = pages.find((page) => page.slug === "rules/future-response-rules");
  if (!rules) return [];
  return rules.contentMd
    .split("\n")
    .map((line) => line.replace(/^[-#\s]+/, "").trim())
    .filter((line) => line.length > 8)
    .slice(-5);
}

function extractOpenThreads(pages: WikiPage[]) {
  const threads = pages.find((page) => page.slug === "relationship/open-threads");
  if (!threads) return [];
  return threads.contentMd
    .split("\n")
    .map((line) => line.replace(/^[-#\s]+/, "").trim())
    .filter((line) => line.length > 8)
    .slice(-3);
}

function extractPreferences(pages: WikiPage[]) {
  const preferences = pages.find((page) => page.slug === "user/preferences");
  if (!preferences) return [];
  return preferences.contentMd
    .split("\n")
    .map((line) => line.replace(/^[-#\s]+/, "").trim())
    .filter((line) => line.length > 8)
    .slice(-5);
}

function summarizeRelationships(items: RelationshipItem[]) {
  if (items.length === 0) return null;
  const typeCounts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = (acc[item.type] ?? 0) + 1;
    return acc;
  }, {});
  const counts = Object.entries(typeCounts)
    .map(([type, count]) => `${type}: ${count}`)
    .join(", ");
  const notes = items
    .filter((item) => item.notes.trim())
    .slice(-3)
    .map((item) => `- ${item.name} (${item.type}, ${item.strength}): ${item.notes}`)
    .join("\n");
  return truncate(`Relationship Map counts: ${counts}\n${notes}`, 500);
}

function relevantPages(pages: WikiPage[], type: ConversationType) {
  const priorityByType: Record<ConversationType, string[]> = {
    casual: ["rules/future-response-rules", "user/preferences"],
    correction: ["rules/future-response-rules", "user/preferences", "product/current-direction"],
    preference: ["user/preferences", "rules/future-response-rules"],
    product_direction: ["product/current-direction", "rules/future-response-rules", "destiny/current-theme"],
    life_direction: ["destiny/current-theme", "destiny/decision-patterns", "user/life-chart-interpretations"],
    life_chart_question: ["user/life-chart-interpretations", "destiny/current-theme"],
    relationship: ["relationship/current-state", "relationship/open-threads", "relationship/timeline"],
    emotion: ["destiny/current-theme", "destiny/repeated-questions", "relationship/current-state"],
    unknown: ["destiny/current-theme", "rules/future-response-rules", "user/preferences"],
  };

  const wanted = priorityByType[type];
  return wanted
    .map((slug) => pages.find((page) => page.slug === slug))
    .filter((page): page is WikiPage => Boolean(page))
    .slice(0, 3)
    .map((page) => ({ ...page, contentMd: truncate(page.contentMd, 300) ?? "" }));
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
    lifeChartSummary: truncate(lifeChart?.summaryMd ?? lifeChart?.contentMd, 600),
    activeMemory: truncate(activeMemory?.contentMd, 500),
    futureRules: extractRules(wikiPages),
    recentMessages: recentMessages.slice(-8),
    relevantWikiPages: relevantPages(wikiPages, conversationType),
    openThreads: extractOpenThreads(wikiPages),
    userPreferences: extractPreferences(wikiPages),
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

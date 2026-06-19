import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { ConversationType } from "./conversation-context";

export type InputType = "text" | "voice";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  inputType: InputType;
  conversationType?: ConversationType;
  createdAt: string;
};

export type LifeChart = {
  id: string;
  userName: string;
  birthDate: string;
  birthTime?: string;
  currentQuestion: string;
  currentEmotion: string;
  companionStyle: string;
  contentMd: string;
  summaryMd?: string;
  createdAt: string;
  updatedAt: string;
};

export type WikiPage = {
  id: string;
  slug: string;
  title: string;
  contentMd: string;
  tags: string[];
  sourceMessageIds?: string[];
  sourceQuotes?: string[];
  createdAt: string;
  updatedAt: string;
  references: number;
  relatedSlugs: string[];
};

export type ActiveMemory = {
  id: string;
  currentTheme: string;
  contentMd: string;
  updatedAt: string;
};

export type FutureResponseRule = {
  id: string;
  trigger: string;
  rule: string;
  correctUnderstanding: string;
  sourceMessageId?: string;
  sourceQuote?: string;
  createdAt: string;
  updatedAt: string;
};

export type OpenThread = {
  id: string;
  title: string;
  status: "open" | "paused" | "resolved";
  summary: string;
  lastMessageId?: string;
  createdAt: string;
  updatedAt: string;
};

export type WikiEdit = {
  id: string;
  pageSlug: string;
  editSummary: string;
  createdAt: string;
};

export type RelationshipItem = {
  id: string;
  name: string;
  type: "family" | "friend" | "collaborator" | "mentor" | "classmate" | "old_friend" | "other";
  notes: string;
  strength: "low" | "medium" | "high";
  lastInteraction?: string;
  createdAt: string;
  updatedAt: string;
};

export type MemoryState = {
  lifeChart: LifeChart | null;
  activeMemory: ActiveMemory | null;
  wikiPages: WikiPage[];
  wikiEdits: WikiEdit[];
  messages: Message[];
  recentMessages: Message[];
  futureRules: FutureResponseRule[];
  openThreads: OpenThread[];
  relationshipItems: RelationshipItem[];
};

const DATA_DIR = join(process.cwd(), ".echo-data");

const KEYS = {
  messages: "messages",
  lifeChart: "life_chart",
  wikiPages: "wiki_pages",
  activeMemory: "active_memory",
  wikiEdits: "wiki_edits",
  relationshipItems: "relationship_items",
} as const;

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function dataPath(key: string) {
  return join(DATA_DIR, `${key}.json`);
}

function now() {
  return new Date().toISOString();
}

export function generateId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    ensureDataDir();
    const path = dataPath(key);
    if (!existsSync(path)) return fallback;
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch (error) {
    console.error(`[memory-store] Failed to read ${key}`, error);
    return fallback;
  }
}

function writeJSON<T>(key: string, data: T) {
  ensureDataDir();
  writeFileSync(dataPath(key), JSON.stringify(data, null, 2), "utf-8");
}

export function getMessages() {
  return readJSON<Message[]>(KEYS.messages, []);
}

export function getRecentMessages(limit = 24) {
  return getMessages().slice(-limit);
}

export function saveMessage(message: Omit<Message, "id" | "createdAt">) {
  const messages = getMessages();
  const saved: Message = { ...message, id: generateId(), createdAt: now() };
  messages.push(saved);
  writeJSON(KEYS.messages, messages);
  return saved;
}

export function getLifeChart() {
  return readJSON<LifeChart | null>(KEYS.lifeChart, null);
}

export function saveLifeChart(chart: Omit<LifeChart, "id" | "createdAt" | "updatedAt">) {
  const existing = getLifeChart();
  const saved: LifeChart = {
    ...chart,
    id: existing?.id ?? generateId(),
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
  };
  writeJSON(KEYS.lifeChart, saved);
  return saved;
}

export function getWikiPages() {
  return readJSON<WikiPage[]>(KEYS.wikiPages, []);
}

export function getWikiPage(slug: string) {
  return getWikiPages().find((page) => page.slug === slug) ?? null;
}

export function upsertWikiPage(
  page: Omit<WikiPage, "id" | "createdAt" | "updatedAt" | "references" | "relatedSlugs"> &
    Partial<Pick<WikiPage, "references" | "relatedSlugs">>,
) {
  const pages = getWikiPages();
  const index = pages.findIndex((item) => item.slug === page.slug);
  const timestamp = now();

  if (index >= 0) {
    pages[index] = {
      ...pages[index],
      ...page,
      references: page.references ?? pages[index].references + 1,
      relatedSlugs: page.relatedSlugs ?? pages[index].relatedSlugs,
      updatedAt: timestamp,
    };
  } else {
    pages.push({
      ...page,
      id: generateId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      references: page.references ?? 1,
      relatedSlugs: page.relatedSlugs ?? [],
    });
  }

  writeJSON(KEYS.wikiPages, pages);
  return pages[index >= 0 ? index : pages.length - 1];
}

export function getActiveMemory() {
  return readJSON<ActiveMemory | null>(KEYS.activeMemory, null);
}

export function updateActiveMemory(memory: Omit<ActiveMemory, "id" | "updatedAt"> & { id?: string }) {
  const existing = getActiveMemory();
  const saved: ActiveMemory = { ...memory, id: memory.id || existing?.id || generateId(), updatedAt: now() };
  writeJSON(KEYS.activeMemory, saved);
  return saved;
}

export function getWikiEdits(pageSlug?: string) {
  const edits = readJSON<WikiEdit[]>(KEYS.wikiEdits, []);
  return pageSlug ? edits.filter((edit) => edit.pageSlug === pageSlug) : edits;
}

export function addWikiEdit(edit: Omit<WikiEdit, "id" | "createdAt">) {
  const edits = getWikiEdits();
  const saved: WikiEdit = { ...edit, id: generateId(), createdAt: now() };
  edits.push(saved);
  writeJSON(KEYS.wikiEdits, edits);
  return saved;
}

export function getRelationshipItems() {
  return readJSON<RelationshipItem[]>(KEYS.relationshipItems, []);
}

export function saveRelationshipItem(
  item: Omit<RelationshipItem, "id" | "createdAt" | "updatedAt"> & { id?: string },
) {
  const items = getRelationshipItems();
  const timestamp = now();
  const index = item.id ? items.findIndex((entry) => entry.id === item.id) : -1;
  const saved: RelationshipItem = {
    ...item,
    id: item.id ?? generateId(),
    createdAt: index >= 0 ? items[index].createdAt : timestamp,
    updatedAt: timestamp,
  };

  if (index >= 0) {
    items[index] = saved;
  } else {
    items.push(saved);
  }

  writeJSON(KEYS.relationshipItems, items);
  return saved;
}

export function deleteRelationshipItem(id: string) {
  writeJSON(
    KEYS.relationshipItems,
    getRelationshipItems().filter((item) => item.id !== id),
  );
}

export function getMemoryState(): MemoryState {
  const wikiPages = getWikiPages().sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return {
    lifeChart: getLifeChart(),
    activeMemory: getActiveMemory(),
    wikiPages,
    wikiEdits: getWikiEdits().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    messages: getMessages(),
    recentMessages: getRecentMessages(10),
    futureRules: getFutureRulesFromPages(wikiPages),
    openThreads: getOpenThreadsFromPages(wikiPages),
    relationshipItems: getRelationshipItems(),
  };
}

function getFutureRulesFromPages(pages: WikiPage[]): FutureResponseRule[] {
  const page = pages.find((item) => item.slug === "rules/future-response-rules");
  if (!page) return [];
  return page.contentMd
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .slice(-8)
    .map((line, index) => ({
      id: `${page.id}-rule-${index}`,
      trigger: "user correction or preference",
      rule: line.replace(/^- /, ""),
      correctUnderstanding: line.replace(/^- /, ""),
      sourceQuote: line.replace(/^- /, ""),
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    }));
}

function getOpenThreadsFromPages(pages: WikiPage[]): OpenThread[] {
  const page = pages.find((item) => item.slug === "relationship/open-threads");
  if (!page) return [];
  return page.contentMd
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .slice(-8)
    .map((line, index) => ({
      id: `${page.id}-thread-${index}`,
      title: line.replace(/^- /, "").slice(0, 60),
      status: "open",
      summary: line.replace(/^- /, ""),
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    }));
}

export function resetAllMemory() {
  writeJSON(KEYS.messages, []);
  writeJSON(KEYS.lifeChart, null);
  writeJSON(KEYS.wikiPages, []);
  writeJSON(KEYS.activeMemory, null);
  writeJSON(KEYS.wikiEdits, []);
  writeJSON(KEYS.relationshipItems, []);
}

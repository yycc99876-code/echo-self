// memory-store.ts — 基于 localStorage 的本地存储层
// MVP 阶段使用，后续可替换为数据库实现（保持接口不变）

// ==================== 类型定义 ====================

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  inputType: 'text' | 'voice'
  createdAt: string
}

export type LifeChart = {
  id: string
  userName: string
  birthDate?: string
  birthTime?: string
  currentQuestion: string
  currentEmotion: string
  companionStyle: string
  contentMd: string
  createdAt: string
  updatedAt: string
}

export type WikiPage = {
  id: string
  slug: string
  title: string
  contentMd: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export type ActiveMemory = {
  contentMd: string
  updatedAt: string
}

export type WikiEdit = {
  id: string
  pageSlug: string
  editSummary: string
  createdAt: string
}

export type AvatarProfile = {
  id: string
  displayName: string
  avatarUrl?: string
  identityType: 'digital_self'
  description: string
}

export type VoiceProfile = {
  id: string
  provider: 'browser' | 'bailian'
  voiceId?: string
  type: 'preset_voice' | 'cloned_user_voice'
  description?: string
}

// ==================== 工具函数 ====================

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function now(): string {
  return new Date().toISOString()
}

function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON<T>(key: string, data: T): void {
  if (!isBrowser()) return
  localStorage.setItem(key, JSON.stringify(data))
}

// ==================== 存储键名 ====================

const KEYS = {
  messages: 'echo_messages',
  lifeChart: 'echo_life_chart',
  wikiPages: 'echo_wiki_pages',
  activeMemory: 'echo_active_memory',
  wikiEdits: 'echo_wiki_edits',
  avatarProfile: 'echo_avatar_profile',
  voiceProfile: 'echo_voice_profile',
} as const

// ==================== Message ====================

export function getMessages(): Message[] {
  return readJSON<Message[]>(KEYS.messages, [])
}

export function saveMessage(msg: Omit<Message, 'id' | 'createdAt'>): Message {
  const messages = getMessages()
  const newMsg: Message = {
    ...msg,
    id: generateId(),
    createdAt: now(),
  }
  messages.push(newMsg)
  writeJSON(KEYS.messages, messages)
  return newMsg
}

export function clearMessages(): void {
  writeJSON(KEYS.messages, [])
}

// ==================== LifeChart ====================

export function getLifeChart(): LifeChart | null {
  return readJSON<LifeChart | null>(KEYS.lifeChart, null)
}

export function saveLifeChart(chart: Omit<LifeChart, 'id' | 'createdAt' | 'updatedAt'>): LifeChart {
  const existing = getLifeChart()
  const updated: LifeChart = {
    ...chart,
    id: existing?.id ?? generateId(),
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
  }
  writeJSON(KEYS.lifeChart, updated)
  return updated
}

// ==================== WikiPage ====================

export function getWikiPages(): WikiPage[] {
  return readJSON<WikiPage[]>(KEYS.wikiPages, [])
}

export function getWikiPage(slug: string): WikiPage | null {
  return getWikiPages().find((p) => p.slug === slug) ?? null
}

export function upsertWikiPage(page: Omit<WikiPage, 'id' | 'createdAt' | 'updatedAt'>): WikiPage {
  const pages = getWikiPages()
  const idx = pages.findIndex((p) => p.slug === page.slug)
  const timestamp = now()

  if (idx >= 0) {
    pages[idx] = { ...pages[idx], ...page, updatedAt: timestamp }
  } else {
    pages.push({
      ...page,
      id: generateId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  }

  writeJSON(KEYS.wikiPages, pages)
  return pages[idx >= 0 ? idx : pages.length - 1]
}

// ==================== ActiveMemory ====================

export function getActiveMemory(): ActiveMemory | null {
  return readJSON<ActiveMemory | null>(KEYS.activeMemory, null)
}

export function updateActiveMemory(contentMd: string): ActiveMemory {
  const memory: ActiveMemory = { contentMd, updatedAt: now() }
  writeJSON(KEYS.activeMemory, memory)
  return memory
}

// ==================== WikiEdit ====================

export function getWikiEdits(pageSlug?: string): WikiEdit[] {
  const edits = readJSON<WikiEdit[]>(KEYS.wikiEdits, [])
  if (pageSlug) return edits.filter((e) => e.pageSlug === pageSlug)
  return edits
}

export function addWikiEdit(edit: Omit<WikiEdit, 'id' | 'createdAt'>): WikiEdit {
  const edits = getWikiEdits()
  const newEdit: WikiEdit = { ...edit, id: generateId(), createdAt: now() }
  edits.push(newEdit)
  writeJSON(KEYS.wikiEdits, edits)
  return newEdit
}

// ==================== AvatarProfile ====================

export function getAvatarProfile(): AvatarProfile | null {
  return readJSON<AvatarProfile | null>(KEYS.avatarProfile, null)
}

export function saveAvatarProfile(profile: Omit<AvatarProfile, 'id'>): AvatarProfile {
  const existing = getAvatarProfile()
  const updated: AvatarProfile = {
    ...profile,
    id: existing?.id ?? generateId(),
  }
  writeJSON(KEYS.avatarProfile, updated)
  return updated
}

// ==================== VoiceProfile ====================

export function getVoiceProfile(): VoiceProfile | null {
  return readJSON<VoiceProfile | null>(KEYS.voiceProfile, null)
}

export function saveVoiceProfile(profile: Omit<VoiceProfile, 'id'>): VoiceProfile {
  const existing = getVoiceProfile()
  const updated: VoiceProfile = {
    ...profile,
    id: existing?.id ?? generateId(),
  }
  writeJSON(KEYS.voiceProfile, updated)
  return updated
}

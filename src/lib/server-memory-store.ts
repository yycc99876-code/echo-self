/**
 * Server-side Memory Store
 *
 * API route 不能使用 localStorage，此模块提供服务端内存存储。
 * MVP 阶段使用进程内 Map，后续可替换为数据库实现。
 *
 * 注意：此模块在服务端运行，不导入任何浏览器 API。
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

// ==================== 类型定义（与 memory-store.ts 保持一致）====================

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

// ==================== 数据目录 ====================

const DATA_DIR = join(process.cwd(), '.echo-data')

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
}

function dataPath(key: string): string {
  return join(DATA_DIR, `${key}.json`)
}

// ==================== 工具函数 ====================

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function now(): string {
  return new Date().toISOString()
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    ensureDataDir()
    const path = dataPath(key)
    if (!existsSync(path)) return fallback
    const raw = readFileSync(path, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeJSON<T>(key: string, data: T): void {
  try {
    ensureDataDir()
    writeFileSync(dataPath(key), JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error(`[server-memory-store] Failed to write ${key}:`, err)
  }
}

// ==================== 存储键名 ====================

const KEYS = {
  messages: 'messages',
  lifeChart: 'life_chart',
  wikiPages: 'wiki_pages',
  activeMemory: 'active_memory',
  wikiEdits: 'wiki_edits',
} as const

// ==================== Message ====================

export function getMessages(): Message[] {
  return readJSON<Message[]>(KEYS.messages, [])
}

export function getRecentMessages(limit: number = 20): Message[] {
  const all = getMessages()
  return all.slice(-limit)
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

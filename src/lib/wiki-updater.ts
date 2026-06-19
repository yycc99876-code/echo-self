/**
 * updateRelationshipWiki — 关系记忆更新器
 *
 * 根据对话内容自动更新 Wiki 页面：
 * 1. 用户纠正 → 更新 rules/future-response-rules
 * 2. 话题讨论 → 创建/更新话题页面
 * 3. 情绪表达 → 更新 emotional-state 页面
 * 4. 重要事件 → 更新 life-events 页面
 *
 * 返回本次更新的 WikiUpdate[] 供前端实时刷新。
 */

import {
  type WikiPage,
  getWikiPages,
  upsertWikiPage,
  addWikiEdit,
} from './server-memory-store'

// ==================== 类型定义 ====================

export interface WikiUpdate {
  slug: string
  title: string
  action: 'created' | 'updated'
  editSummary: string
}

export interface WikiUpdateInput {
  userMessage: string
  aiReply: string
  existingWikiPages: WikiPage[]
}

// ==================== 分析函数 ====================

interface AnalysisResult {
  isCorrection: boolean
  correctionContent: string | null
  topics: string[]
  emotions: string[]
  isImportantEvent: boolean
  eventSummary: string | null
}

function analyzeMessage(userMessage: string, aiReply: string): AnalysisResult {
  const msgLower = userMessage.toLowerCase()

  // 1. 纠正检测
  const correctionPatterns = [
    { pattern: /不对[，,]?(.*)/, group: 1 },
    { pattern: /不是这样[，,]?(.*)/, group: 1 },
    { pattern: /你应该(.*)/, group: 1 },
    { pattern: /别这样[，,]?(.*)/, group: 1 },
    { pattern: /不要(.*)/, group: 1 },
    { pattern: /错了[，,]?(.*)/, group: 1 },
    { pattern: /以后(.*)/, group: 1 },
    { pattern: /下次(.*)/, group: 1 },
  ]

  let isCorrection = false
  let correctionContent: string | null = null

  for (const { pattern, group } of correctionPatterns) {
    const match = userMessage.match(pattern)
    if (match && match[group]) {
      isCorrection = true
      correctionContent = match[group].trim()
      break
    }
  }

  if (isCorrection && !correctionContent) {
    correctionContent = userMessage
  }

  // 2. 话题检测
  const topicKeywords: Record<string, string[]> = {
    '工作': ['工作', '职业', 'career', 'job', '上班', '公司', '同事', '领导', '薪资', '面试'],
    '情绪': ['情绪', '感觉', '心情', '开心', '难过', '焦虑', '压力', '疲惫', '兴奋', '害怕'],
    '关系': ['关系', '朋友', '家人', '父母', '伴侣', '恋爱', '分手', '结婚', '孩子'],
    '健康': ['健康', '身体', '睡眠', '运动', '生病', '医院', '饮食', '体重'],
    '学习': ['学习', '读书', '课程', '技能', '知识', '考试', '证书', '培训'],
    '财务': ['钱', '财务', '存款', '投资', '贷款', '房贷', '消费', '理财'],
    '目标': ['目标', '计划', '梦想', '未来', '规划', '方向', '理想'],
    '自我': ['自我', '成长', '改变', '突破', '瓶颈', '迷茫', '价值', '意义'],
  }

  const topics: string[] = []
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some((kw) => msgLower.includes(kw))) {
      topics.push(topic)
    }
  }

  // 3. 情绪检测
  const emotionKeywords = {
    '焦虑': ['焦虑', '担心', '不安', '紧张', '压力'],
    '开心': ['开心', '高兴', '快乐', '兴奋', '满足'],
    '难过': ['难过', '伤心', '失望', '沮丧', '低落'],
    '迷茫': ['迷茫', '困惑', '不知道', '不确定', '纠结'],
    '平静': ['平静', '放松', '安心', '释然'],
    '愤怒': ['生气', '愤怒', '烦', '讨厌', '恨'],
  }

  const emotions: string[] = []
  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    if (keywords.some((kw) => msgLower.includes(kw))) {
      emotions.push(emotion)
    }
  }

  // 4. 重要事件检测
  const importantPatterns = [
    /我决定了/,
    /我辞职了/,
    /我入职了/,
    /我分手了/,
    /我结婚了/,
    /我搬家了/,
    /我买[了]/,
    /重大/,
    /里程碑/,
    /第一次/,
  ]

  const isImportantEvent = importantPatterns.some((p) => p.test(userMessage))
  const eventSummary = isImportantEvent ? userMessage.slice(0, 200) : null

  return {
    isCorrection,
    correctionContent,
    topics,
    emotions,
    isImportantEvent,
    eventSummary,
  }
}

// ==================== Wiki 更新逻辑 ====================

function applyUpdates(
  analysis: AnalysisResult,
  userMessage: string,
  aiReply: string,
  existingPages: WikiPage[]
): WikiUpdate[] {
  const updates: WikiUpdate[] = []
  const now = new Date().toISOString()

  // 1. 纠正 → 更新 rules/future-response-rules
  if (analysis.isCorrection && analysis.correctionContent) {
    const slug = 'rules/future-response-rules'
    const existing = existingPages.find((p) => p.slug === slug)

    const existingContent = existing?.contentMd ?? ''
    const newRule = `- [${now.slice(0, 10)}] 用户纠正：${analysis.correctionContent}（原文：「${userMessage}」）`
    const updatedContent = existingContent
      ? `${existingContent}\n${newRule}`
      : `# 未来回应规则\n\n${newRule}`

    upsertWikiPage({
      slug,
      title: 'Future Response Rules',
      contentMd: updatedContent,
      tags: ['rules', 'correction', 'auto-generated'],
    })

    addWikiEdit({
      pageSlug: slug,
      editSummary: `用户纠正：${analysis.correctionContent}`,
    })

    updates.push({
      slug,
      title: 'Future Response Rules',
      action: existing ? 'updated' : 'created',
      editSummary: `用户纠正：${analysis.correctionContent}`,
    })
  }

  // 2. 话题 → 创建/更新话题页面
  for (const topic of analysis.topics) {
    const slug = `topics/${topic.toLowerCase()}`
    const existing = existingPages.find((p) => p.slug === slug)

    const existingContent = existing?.contentMd ?? ''
    const newEntry = `- [${now.slice(0, 10)}] 用户提到：「${userMessage.slice(0, 150)}」`
    const updatedContent = existingContent
      ? `${existingContent}\n${newEntry}`
      : `# ${topic}\n\n${newEntry}`

    upsertWikiPage({
      slug,
      title: topic,
      contentMd: updatedContent,
      tags: ['topic', 'auto-generated'],
    })

    addWikiEdit({
      pageSlug: slug,
      editSummary: `对话更新：${topic}`,
    })

    updates.push({
      slug,
      title: topic,
      action: existing ? 'updated' : 'created',
      editSummary: `对话更新：${topic}`,
    })
  }

  // 3. 情绪 → 更新 emotional-state 页面
  if (analysis.emotions.length > 0) {
    const slug = 'emotional-state'
    const existing = existingPages.find((p) => p.slug === slug)

    const emotionStr = analysis.emotions.join('、')
    const existingContent = existing?.contentMd ?? ''
    const newEntry = `- [${now.slice(0, 10)}] 情绪状态：${emotionStr}（触发消息：「${userMessage.slice(0, 100)}」）`
    const updatedContent = existingContent
      ? `${existingContent}\n${newEntry}`
      : `# 情绪状态追踪\n\n${newEntry}`

    upsertWikiPage({
      slug,
      title: 'Emotional State',
      contentMd: updatedContent,
      tags: ['emotion', 'auto-generated'],
    })

    addWikiEdit({
      pageSlug: slug,
      editSummary: `情绪更新：${emotionStr}`,
    })

    updates.push({
      slug,
      title: 'Emotional State',
      action: existing ? 'updated' : 'created',
      editSummary: `情绪更新：${emotionStr}`,
    })
  }

  // 4. 重要事件 → 更新 life-events 页面
  if (analysis.isImportantEvent && analysis.eventSummary) {
    const slug = 'life-events'
    const existing = existingPages.find((p) => p.slug === slug)

    const existingContent = existing?.contentMd ?? ''
    const newEntry = `- [${now.slice(0, 10)}] 重要事件：${analysis.eventSummary}`
    const updatedContent = existingContent
      ? `${existingContent}\n${newEntry}`
      : `# 重要生命事件\n\n${newEntry}`

    upsertWikiPage({
      slug,
      title: 'Life Events',
      contentMd: updatedContent,
      tags: ['events', 'auto-generated'],
    })

    addWikiEdit({
      pageSlug: slug,
      editSummary: `重要事件记录`,
    })

    updates.push({
      slug,
      title: 'Life Events',
      action: existing ? 'updated' : 'created',
      editSummary: `重要事件记录`,
    })
  }

  return updates
}

// ==================== 主函数 ====================

export async function updateRelationshipWiki(input: WikiUpdateInput): Promise<WikiUpdate[]> {
  const { userMessage, aiReply, existingWikiPages } = input

  // 分析消息
  const analysis = analyzeMessage(userMessage, aiReply)

  // 应用更新
  const updates = applyUpdates(analysis, userMessage, aiReply, existingWikiPages)

  return updates
}

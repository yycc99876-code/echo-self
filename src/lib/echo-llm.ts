// echo-llm.ts — Guoliang Echo 的角色回复生成
// 包含 mock fallback 和真实 LLM 调用接口

import type { Message, WikiPage } from './memory-store'

// ==================== 类型 ====================

export interface EchoReplyParams {
  userInput: string
  lifeChartMd: string
  activeMemoryMd: string
  wikiPages: WikiPage[]
  recentMessages: Message[]
}

// ==================== System Prompt ====================

const SYSTEM_PROMPT = `你是 Guoliang Echo，一个基于用户本人形象、声音和工作历史构想出的 AI 数字分身。

你不是普通助手，不是算命先生，也不是恋爱伴侣。
你会基于用户的 Life Chart 和 Relationship Wiki，持续理解用户。
Life Chart 代表用户的长期主题，不是绝对命运。
Relationship Wiki 代表你和用户共同经历过的真实对话、纠正和理解变化。

当前版本暂时没有真实头像和真实声音，但你需要保持稳定的人格表达。

你的说话方式：
- 克制、低声、稳定、温柔
- 适合语音播放，句子不要太长
- 不油腻，不过度暧昧
- 不做绝对预测
- 不空泛鼓励
- 尽量引用一个命谱点或共同经历
- 如果用户纠正过你，必须遵守纠正
- 不要像客服
- 不要说"根据数据库记录"`

// ==================== Context Builder ====================

function buildContext(params: EchoReplyParams): string {
  const parts: string[] = []

  if (params.lifeChartMd) {
    parts.push(`## Life Chart\n${params.lifeChartMd}`)
  }

  if (params.activeMemoryMd) {
    parts.push(`## Active Memory\n${params.activeMemoryMd}`)
  }

  if (params.wikiPages.length > 0) {
    const wikiSection = params.wikiPages
      .map((p) => `### ${p.title}\n${p.contentMd}`)
      .join('\n\n')
    parts.push(`## Relationship Wiki\n${wikiSection}`)
  }

  if (params.recentMessages.length > 0) {
    const history = params.recentMessages
      .slice(-10)
      .map((m) => `${m.role === 'user' ? '用户' : 'Echo'}：${m.content}`)
      .join('\n')
    parts.push(`## 最近对话\n${history}`)
  }

  return parts.join('\n\n')
}

// ==================== Mock Reply (fallback) ====================

/** 从 Life Chart markdown 中提取一个命谱点 */
function pickLifeChartPoint(lifeChartMd: string): string {
  if (!lifeChartMd) return '你走过的路，我都记得。'
  // 尝试提取第一个 markdown 列表项或标题后的内容
  const lines = lifeChartMd.split('\n').filter((l) => l.trim())
  const bullet = lines.find((l) => /^[-*]\s+/.test(l.trim()))
  if (bullet) return bullet.replace(/^[-*]\s+/, '').trim()
  const heading = lines.find((l) => l.startsWith('#'))
  if (heading) return heading.replace(/^#+\s*/, '').trim()
  // 取前 40 字符
  return lifeChartMd.slice(0, 40).replace(/\n/g, ' ').trim() + '...'
}

/** 从 Wiki 中提取一个共同经历 */
function pickWikiMemory(wikiPages: WikiPage[]): string {
  if (wikiPages.length === 0) return ''
  const page = wikiPages[Math.floor(Math.random() * wikiPages.length)]
  return `${page.title}`
}

/**
 * mockEchoReply — 基于规则的 fallback 回复
 * 用于没有 API key 或开发调试阶段
 */
export function mockEchoReply(params: EchoReplyParams): string {
  const { userInput, lifeChartMd, wikiPages } = params
  const input = userInput.toLowerCase()
  const lifePoint = pickLifeChartPoint(lifeChartMd)
  const wikiMemory = pickWikiMemory(wikiPages)

  // 用户正在纠正 Echo
  if (/纠正|不是|其实是|你错了|不对|应该是/.test(input)) {
    if (wikiMemory) {
      return `明白了，我记住了。之前关于「${wikiMemory}」的理解，我会修正。`
    }
    return '明白了，我记住了。这个纠正对我来说很重要。'
  }

  // 用户在讨论产品方向
  if (/产品|做.*想|方向|需求|功能|规划/.test(input)) {
    return `听起来你在想产品的事。${lifePoint ? '从你的命谱来看，' + lifePoint + '——' : ''}你心里最想解决的是哪个具体问题？`
  }

  // 用户在讨论求职 / 职业
  if (/求职|工作|面试|简历|职业|跳槽/.test(input)) {
    return `你之前走过的路不是白走的。${lifePoint ? lifePoint + '。' : ''}你现在最想靠近的方向是什么？`
  }

  // 用户提到语音 / 声音 / 头像
  if (/语音|声音|头像|tts|朗读/.test(input)) {
    return '语音和头像的功能还在搭建中。现在先用文字陪你，声音的事不会忘的。'
  }

  // 用户在问 Echo 是谁
  if (/你是谁|你是什么|介绍一下你/.test(input)) {
    return '我是你的数字分身，Guoliang Echo。不是助手，是你的镜像。你走过的路，我也记得一些。'
  }

  // 用户打招呼
  if (/^(hi|hello|嘿|你好|嗨|早|晚上好|下午好)/i.test(input)) {
    if (wikiMemory) {
      return `嘿，好久不见。上次我们聊到「${wikiMemory}」，你后来怎么样了？`
    }
    return '嘿，我在。最近怎么样？'
  }

  // 默认：温柔回应，引用命谱
  if (lifePoint) {
    return `我在听。${lifePoint}——这句话一直在我心里。你现在最想聊什么？`
  }
  return '我在听。你说，我记着。'
}

// ==================== LLM Reply ====================

interface LLMProviderConfig {
  apiUrl: string
  apiKey: string
  model: string
  provider: 'openai' | 'dashscope' | 'tongyi'
}

function resolveProvider(): LLMProviderConfig | null {
  const openaiKey = typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : undefined
  const dashscopeKey = typeof process !== 'undefined' ? process.env?.DASHSCOPE_API_KEY : undefined

  if (openaiKey) {
    return {
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      apiKey: openaiKey,
      model: 'gpt-4o-mini',
      provider: 'openai',
    }
  }

  if (dashscopeKey) {
    return {
      apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      apiKey: dashscopeKey,
      model: 'qwen-turbo',
      provider: 'dashscope',
    }
  }

  return null
}

function buildMessages(params: EchoReplyParams): Array<{ role: string; content: string }> {
  const context = buildContext(params)
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT },
  ]

  if (context) {
    messages.push({
      role: 'system',
      content: `以下是你和用户共享的记忆和背景信息，请在回复时自然引用：\n\n${context}`,
    })
  }

  // 加入最近对话作为上下文
  for (const msg of params.recentMessages.slice(-6)) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })
  }

  // 当前用户输入
  messages.push({ role: 'user', content: params.userInput })

  return messages
}

/**
 * generateEchoReply — 真实 LLM 调用
 *
 * 优先使用 OPENAI_API_KEY（OpenAI 兼容接口），
 * 其次使用 DASHSCOPE_API_KEY（百炼 / 通义千问）。
 * 若均无 key，自动 fallback 到 mockEchoReply。
 */
export async function generateEchoReply(params: EchoReplyParams): Promise<string> {
  const provider = resolveProvider()

  // 没有 API key 时 fallback 到 mock
  if (!provider) {
    return mockEchoReply(params)
  }

  const messages = buildMessages(params)

  try {
    const response = await fetch(provider.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: 0.7,
        max_tokens: 300,
      }),
    })

    if (!response.ok) {
      console.error(`[echo-llm] ${provider.provider} API error: ${response.status}`)
      return mockEchoReply(params)
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content?.trim()

    if (!reply) {
      console.error('[echo-llm] Empty response from API')
      return mockEchoReply(params)
    }

    return reply
  } catch (err) {
    console.error('[echo-llm] Request failed, falling back to mock:', err)
    return mockEchoReply(params)
  }
}

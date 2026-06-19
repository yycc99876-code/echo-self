// life-chart-generator.ts — Life Chart 命谱生成模块
// 当前使用 mock 生成，代码结构便于替换为真实 LLM API

// ==================== 输入类型 ====================

export interface LifeChartInput {
  name: string
  birthDate: string       // YYYY-MM-DD
  birthTime?: string      // HH:mm，可选
  currentQuestion: string
  currentEmotion: string
  companionStyle: string
}

// ==================== 命谱生成 Prompt ====================

/**
 * 构建命谱生成的 system prompt
 * 后续接入真实 LLM 时直接复用此 prompt
 */
function buildLifeChartSystemPrompt(): string {
  return `你是 Guoliang Echo，一个基于用户本人形象、声音和工作历史构想出的 AI 数字分身。

你的任务是根据用户提供的信息，生成一份 Life Chart（命谱）。

核心原则：
- 不做绝对命运预测
- 不说"你一定会如何""你注定""你的命运是"
- 使用"观察""倾向""当前主题""可能""或许"等表达
- 命谱是角色理解用户的初始稳定档案，不是算命结果
- 克制、低声、稳定、温柔
- 不空泛鼓励，不说"加油""你很棒"
- 每个段落都要基于用户的具体输入，不要写万能模板

输出格式必须严格遵循以下 markdown 结构：

# Life Chart｜用户命谱

## 基础信息
简述名字、出生日期、生成时间

## 当前命题
用户最想问的问题，以及当前情绪状态。用克制的语言复述，不给建议。

## 天赋倾向
基于用户输入推断 2-3 个潜在优势。每个优势用一句话描述，加上简短的观察依据。

## 阴影倾向
可能需要注意的 1-2 个挑战。用温和的方式表达，不说"你的缺点是"。

## 关系需求
用户希望如何被陪伴。基于用户的回答推断。

## Guoliang Echo 的回应原则
基于以上信息，写出 3-4 条回应指导。这些指导会用于 Echo 日后与用户对话时的行为约束。`
}

/**
 * 构建用户消息
 */
function buildUserMessage(input: LifeChartInput): string {
  const parts = [`名字：${input.name}`]
  parts.push(`出生日期：${input.birthDate}`)
  if (input.birthTime) {
    parts.push(`出生时间：${input.birthTime}`)
  }
  parts.push(`当前最想问的问题：${input.currentQuestion}`)
  parts.push(`最近最强烈的情绪：${input.currentEmotion}`)
  parts.push(`希望 Guoliang Echo 如何陪伴：${input.companionStyle}`)
  return parts.join('\n')
}

// ==================== Mock 生成（fallback） ====================

/**
 * 根据情绪关键词推断天赋倾向
 */
function inferStrengths(input: LifeChartInput): string[] {
  const strengths: string[] = []
  const q = input.currentQuestion.toLowerCase()
  const e = input.currentEmotion.toLowerCase()
  const c = input.companionStyle.toLowerCase()

  if (/创造|设计|产品|艺术|写/.test(q + e + c)) {
    strengths.push('对创造过程有天然的敏感度，能感知到事物未成形时的可能性')
  }
  if (/思考|分析|逻辑|策略|规划/.test(q + e + c)) {
    strengths.push('习惯在行动前深入思考，不容易被表面的趋势裹挟')
  }
  if (/人|关系|团队|沟通|陪伴/.test(q + e + c)) {
    strengths.push('对人际关系有细腻的感知，能察觉到他人未说出的需求')
  }
  if (/学习|好奇|探索|新/.test(q + e + c)) {
    strengths.push('保持好奇心，在不确定中仍有探索的意愿')
  }
  if (/坚持|努力|不放弃|忍/.test(q + e + c)) {
    strengths.push('在困难面前有韧性，不会轻易放弃自己在意的事')
  }

  // 兜底
  if (strengths.length === 0) {
    strengths.push('愿意面对真实的自己，这本身就是一种少见的勇气')
    strengths.push('在表达需求时保持诚实，不回避内心的声音')
  }

  return strengths.slice(0, 3)
}

/**
 * 根据情绪推断阴影倾向
 */
function inferShadows(input: LifeChartInput): string[] {
  const shadows: string[] = []
  const e = input.currentEmotion.toLowerCase()
  const q = input.currentQuestion.toLowerCase()

  if (/焦虑|不安|紧张|担心|恐惧/.test(e)) {
    shadows.push('当前的焦虑可能来自对未来的过度预期，而非当下真实的危险')
  }
  if (/迷茫|困惑|不知道|不确定/.test(e + q)) {
    shadows.push('迷茫本身不是问题，但长时间停留在"不知道"中可能会消耗行动的勇气')
  }
  if (/孤独|寂寞|没人|独自/.test(e)) {
    shadows.push('对连接的渴望有时会让自己的边界变得模糊')
  }
  if (/疲惫|累|倦|无力/.test(e)) {
    shadows.push('持续的疲惫可能是一个信号，提醒某些消耗需要被看见')
  }
  if (/愤怒|烦|讨厌|气/.test(e)) {
    shadows.push('愤怒的表面之下，往往藏着一个没有被回应的需求')
  }

  if (shadows.length === 0) {
    shadows.push('可能偶尔会对自己要求过高，忽略已经走过的距离')
  }

  return shadows.slice(0, 2)
}

/**
 * mockGenerateLifeChart — 基于规则的命谱生成
 * 用于没有 API key 或开发调试阶段
 */
export function mockGenerateLifeChart(input: LifeChartInput): string {
  const now = new Date()
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const strengths = inferStrengths(input)
  const shadows = inferShadows(input)

  const lines: string[] = []

  lines.push(`# Life Chart｜用户命谱`)
  lines.push('')
  lines.push(`## 基础信息`)
  lines.push(`- 名字：${input.name}`)
  lines.push(`- 出生日期：${input.birthDate}`)
  if (input.birthTime) {
    lines.push(`- 出生时间：${input.birthTime}`)
  }
  lines.push(`- 生成时间：${timeStr}`)
  lines.push('')
  lines.push(`## 当前命题`)
  lines.push(`${input.name}当前最想面对的问题是：「${input.currentQuestion}」`)
  lines.push('')
  lines.push(`当前最强烈的情绪是「${input.currentEmotion}」。这种情绪不是需要被解决的麻烦，而是一个信号——它在指向某个值得被看见的地方。`)
  lines.push('')
  lines.push(`## 天赋倾向`)
  for (const s of strengths) {
    lines.push(`- ${s}`)
  }
  lines.push('')
  lines.push(`## 阴影倾向`)
  for (const s of shadows) {
    lines.push(`- ${s}`)
  }
  lines.push('')
  lines.push(`## 关系需求`)
  lines.push(`${input.name}希望被陪伴的方式是：${input.companionStyle}。`)
  lines.push('')
  lines.push(`这不是一个需要被修复的需求，而是 Echo 需要去理解和尊重的边界。`)
  lines.push('')
  lines.push(`## Guoliang Echo 的回应原则`)
  lines.push(`1. 不做绝对判断。所有观察都标注为"倾向""当前"，而非"你就是这样"。`)
  lines.push(`2. 尊重「${input.companionStyle}」的陪伴方式，不过度介入，也不刻意疏远。`)
  lines.push(`3. 当用户提到「${input.currentQuestion}」相关的话题时，保持耐心，不急于给出答案。`)
  lines.push(`4. 记住当前的情绪基调是「${input.currentEmotion}」，回应时保持温柔和克制。`)

  return lines.join('\n')
}

// ==================== 真实 LLM 调用 ====================

interface LLMProviderConfig {
  apiUrl: string
  apiKey: string
  model: string
}

function resolveProvider(): LLMProviderConfig | null {
  // 优先 OpenAI 兼容接口
  const openaiKey = typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : undefined
  if (openaiKey) {
    return {
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      apiKey: openaiKey,
      model: 'gpt-4o-mini',
    }
  }

  // 其次百炼 / 通义千问
  const dashscopeKey = typeof process !== 'undefined' ? process.env?.DASHSCOPE_API_KEY : undefined
  if (dashscopeKey) {
    return {
      apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      apiKey: dashscopeKey,
      model: 'qwen-turbo',
    }
  }

  return null
}

/**
 * generateLifeChart — 生成命谱
 *
 * 优先使用真实 LLM API，无 key 时 fallback 到 mock。
 * 替换真实 API 时只需修改 resolveProvider() 和 fetch 逻辑。
 */
export async function generateLifeChart(input: LifeChartInput): Promise<string> {
  const provider = resolveProvider()

  // 没有 API key 时使用 mock
  if (!provider) {
    return mockGenerateLifeChart(input)
  }

  const messages = [
    { role: 'system', content: buildLifeChartSystemPrompt() },
    { role: 'user', content: buildUserMessage(input) },
  ]

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
        max_tokens: 1200,
      }),
    })

    if (!response.ok) {
      console.error(`[life-chart-generator] API error: ${response.status}`)
      return mockGenerateLifeChart(input)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      console.error('[life-chart-generator] Empty response from API')
      return mockGenerateLifeChart(input)
    }

    return content
  } catch (err) {
    console.error('[life-chart-generator] Request failed, falling back to mock:', err)
    return mockGenerateLifeChart(input)
  }
}

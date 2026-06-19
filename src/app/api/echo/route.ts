/**
 * POST /api/echo — Guoliang Echo 完整对话 API
 *
 * 完整闭环流程：
 * 1. 读取 Life Chart（命谱）
 * 2. 读取 Active Memory（活跃记忆）
 * 3. 读取所有 Wiki Pages（关系记忆）
 * 4. 读取最近 Messages（对话历史）
 * 5. 调用 generateEchoReply 生成回复（LLM 或 mock fallback）
 * 6. 保存用户消息和 AI 回复
 * 7. 调用 updateRelationshipWiki 更新记忆
 * 8. 返回回复和 Wiki 更新
 *
 * Request:
 *   POST /api/echo
 *   Body: { message: string, inputType: 'text' | 'voice' }
 *
 * Response:
 *   { reply: string, wikiUpdates: WikiUpdate[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getLifeChart,
  getActiveMemory,
  getWikiPages,
  getRecentMessages,
  saveMessage,
} from '@/lib/server-memory-store'
import { generateEchoReply } from '@/lib/echo-llm'
import { updateRelationshipWiki, type WikiUpdate } from '@/lib/wiki-updater'

// ==================== LLM 兼容层 ====================
// server-memory-store 和 echo-llm 使用不同的 Message 类型，
// 这里做适配，使 echo-llm 能正确接收 server 端数据。

interface EchoLLMMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  inputType: 'text' | 'voice'
  createdAt: string
}

function adaptMessages(
  messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; inputType: 'text' | 'voice'; createdAt: string }>
): EchoLLMMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    inputType: m.inputType,
    createdAt: m.createdAt,
  }))
}

// ==================== POST Handler ====================

export async function POST(request: NextRequest) {
  try {
    // ---- 1. 解析请求 ----
    const body = await request.json()
    const { message, inputType = 'text' } = body as {
      message: string
      inputType?: 'text' | 'voice'
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: '消息不能为空', reply: '', wikiUpdates: [] },
        { status: 400 }
      )
    }

    const trimmedMessage = message.trim()

    // ---- 2. 读取上下文 ----
    const lifeChart = getLifeChart()
    const activeMemory = getActiveMemory()
    const wikiPages = getWikiPages()
    const recentMessages = getRecentMessages(20)

    // ---- 3. 生成回复 ----
    // echo-llm.ts 的 generateEchoReply 接受特定参数格式
    const reply = await generateEchoReply({
      userInput: trimmedMessage,
      lifeChartMd: lifeChart?.contentMd ?? '',
      activeMemoryMd: activeMemory?.contentMd ?? '',
      wikiPages,
      recentMessages: adaptMessages(recentMessages),
    })

    // ---- 4. 保存消息 ----
    const userMsg = saveMessage({
      role: 'user',
      content: trimmedMessage,
      inputType,
    })

    const assistantMsg = saveMessage({
      role: 'assistant',
      content: reply,
      inputType: 'text', // AI 回复始终标记为 text
    })

    // ---- 5. 更新关系记忆 ----
    let wikiUpdates: WikiUpdate[] = []
    try {
      wikiUpdates = await updateRelationshipWiki({
        userMessage: trimmedMessage,
        aiReply: reply,
        existingWikiPages: wikiPages,
      })
    } catch (err) {
      // Wiki 更新失败不应阻断对话
      console.error('[api/echo] Wiki update failed:', err)
    }

    // ---- 6. 返回 ----
    return NextResponse.json({
      reply,
      wikiUpdates,
      // 附加调试信息（可选）
      _debug: {
        userMessageId: userMsg.id,
        assistantMessageId: assistantMsg.id,
        contextUsed: {
          hasLifeChart: !!lifeChart,
          hasActiveMemory: !!activeMemory,
          wikiPageCount: wikiPages.length,
          recentMessageCount: recentMessages.length,
        },
      },
    })
  } catch (err) {
    console.error('[api/echo] Unexpected error:', err)
    return NextResponse.json(
      {
        error: '服务器内部错误',
        reply: '抱歉，我遇到了一些问题。请稍后再试。',
        wikiUpdates: [],
      },
      { status: 500 }
    )
  }
}

// ==================== GET Handler (健康检查) ====================

export async function GET() {
  const lifeChart = getLifeChart()
  const wikiPages = getWikiPages()
  const recentMessages = getRecentMessages(5)

  return NextResponse.json({
    status: 'ok',
    service: 'Guoliang Echo API',
    context: {
      hasLifeChart: !!lifeChart,
      lifeChartUserName: lifeChart?.userName ?? null,
      wikiPageCount: wikiPages.length,
      recentMessageCount: recentMessages.length,
    },
  })
}

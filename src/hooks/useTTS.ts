// useTTS.ts — 语音输出 Hook
// 基于 tts-provider.ts 架构，当前使用浏览器 SpeechSynthesis
// speak() 返回 Promise，在语音播放完成时 resolve

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  type ITTSProvider,
  getDefaultTTSProvider,
  isBrowserTTSSupported,
} from '@/lib/tts-provider'

// ==================== Hook ====================

export interface UseTTSReturn {
  /** 是否正在播放语音 */
  isSpeaking: boolean
  /** 播放语音，返回 Promise 在播放完成时 resolve */
  speak: (text: string) => Promise<void>
  /** 停止当前播放 */
  stop: () => void
  /** 浏览器是否支持 TTS */
  isSupported: boolean
}

export function useTTS(): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const providerRef = useRef<ITTSProvider | null>(null)
  const supported = isBrowserTTSSupported()

  // 初始化 provider
  useEffect(() => {
    if (supported) {
      providerRef.current = getDefaultTTSProvider()
    }
  }, [supported])

  // 组件卸载时停止播放
  useEffect(() => {
    return () => {
      providerRef.current?.stop()
    }
  }, [])

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (!providerRef.current) {
        console.warn('[useTTS] No TTS provider available')
        return
      }

      if (!text.trim()) return

      setIsSpeaking(true)

      try {
        await providerRef.current.speak(text)
      } catch (err) {
        console.error('[useTTS] speak error:', err)
      } finally {
        setIsSpeaking(false)
      }
    },
    [],
  )

  const stop = useCallback(() => {
    providerRef.current?.stop()
    setIsSpeaking(false)
  }, [])

  return {
    isSpeaking,
    speak,
    stop,
    isSupported: supported,
  }
}

// useVoiceInput.ts — 语音输入 Hook
// 使用浏览器 Web Speech API (SpeechRecognition) 进行中文语音识别

'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

// ==================== 类型声明 ====================
// Web Speech API 的 TypeScript 类型补充

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance
}

// ==================== 浏览器兼容 ====================

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null

  const win = window as unknown as Record<string, unknown>
  return (
    (win['SpeechRecognition'] as SpeechRecognitionConstructor) ||
    (win['webkitSpeechRecognition'] as SpeechRecognitionConstructor) ||
    null
  )
}

// ==================== Hook ====================

export interface UseVoiceInputReturn {
  /** 是否正在监听 */
  isListening: boolean
  /** 当前识别到的文本（实时更新） */
  transcript: string
  /** 开始监听 */
  startListening: () => void
  /** 停止监听 */
  stopListening: () => void
  /** 浏览器是否支持语音识别 */
  isSupported: boolean
  /** 最近一次识别的最终文本（只包含 confirmed 的部分） */
  finalTranscript: string
  /** 清除当前 transcript */
  resetTranscript: () => void
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const isListeningRef = useRef(false)

  const SpeechRecognition = getSpeechRecognition()
  const isSupported = SpeechRecognition !== null

  // 组件卸载时停止监听
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
        recognitionRef.current = null
      }
    }
  }, [])

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      console.warn('[useVoiceInput] SpeechRecognition not supported')
      return
    }

    // 如果已经在监听，先停止
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      recognitionRef.current = null
    }

    const recognition = new SpeechRecognition()

    // 配置
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'zh-CN'
    recognition.maxAlternatives = 1

    // 识别结果回调
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = ''
      let finalText = ''

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript
        } else {
          interimText += result[0].transcript
        }
      }

      setFinalTranscript(finalText)
      setTranscript(finalText + interimText)
    }

    // 错误回调
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('[useVoiceInput] Recognition error:', event.error)

      // 'no-speech' 和 'aborted' 不需要特别处理
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('[useVoiceInput] Unexpected error:', event.error, event.message)
      }
    }

    // 监听结束回调（浏览器自动停止时触发，例如静默超时）
    recognition.onend = () => {
      // 如果用户意图仍在监听（非手动停止），则自动重启
      if (isListeningRef.current) {
        try {
          recognition.start()
        } catch {
          // 重启失败，停止监听
          isListeningRef.current = false
          setIsListening(false)
        }
      } else {
        setIsListening(false)
      }
    }

    recognition.onstart = () => {
      setIsListening(true)
    }

    // 开始监听
    try {
      recognition.start()
      recognitionRef.current = recognition
      isListeningRef.current = true
    } catch (err) {
      console.error('[useVoiceInput] Failed to start recognition:', err)
      setIsListening(false)
    }
  }, [SpeechRecognition])

  const stopListening = useCallback(() => {
    isListeningRef.current = false

    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    setIsListening(false)
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setFinalTranscript('')
  }, [])

  return {
    isListening,
    transcript,
    finalTranscript,
    startListening,
    stopListening,
    isSupported,
    resetTranscript,
  }
}

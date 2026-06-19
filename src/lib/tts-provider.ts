// tts-provider.ts — TTS Provider 架构
// 当前实现：浏览器 SpeechSynthesis (BrowserTTSProvider)
// 预留接口：百炼 TTS (BailianTTSProvider)、CosyVoice、ElevenLabs 等

// ==================== 接口 ====================

export type TTSProviderName = 'browser' | 'bailian'

export interface ITTSProvider {
  speak(text: string): Promise<void>
  stop(): void
  readonly isSpeaking: boolean
}

// ==================== Browser TTS Provider ====================

/**
 * BrowserTTSProvider — 使用浏览器内置 SpeechSynthesis API
 *
 * 特点：
 * - 零依赖，所有现代浏览器均支持
 * - 尽量选择中文男声
 * - speak() 返回 Promise，在语音播放完成时 resolve
 * - 自动将长文本分段，避免部分浏览器对单次输入的字数限制
 */
export class BrowserTTSProvider implements ITTSProvider {
  private _isSpeaking = false
  private _onEndCallback: (() => void) | null = null

  get isSpeaking(): boolean {
    return this._isSpeaking
  }

  /**
   * 选择一个合适的语音
   * 优先选择中文男声；如果没有，退化为中文语音；再没有，用默认语音
   */
  private pickVoice(): SpeechSynthesisVoice | null {
    const synth = window.speechSynthesis
    if (!synth) return null

    const voices = synth.getVoices()
    if (voices.length === 0) return null

    // 1. 优先：中文男声（匹配 lang 含 zh，voice name 含 male/男/Andrew/David 等）
    const zhMaleKeywords = ['male', '男', 'andrew', 'david', 'daniel', 'google male']
    const zhVoices = voices.filter((v) => /zh/i.test(v.lang))

    for (const voice of zhVoices) {
      const name = voice.name.toLowerCase()
      if (zhMaleKeywords.some((kw) => name.includes(kw))) {
        return voice
      }
    }

    // 2. 其次：任意中文语音
    if (zhVoices.length > 0) {
      return zhVoices[0]
    }

    // 3. 最后：浏览器默认语音
    return null
  }

  /**
   * 将长文本拆分为多段，每段不超过 200 字符
   * 按句号、问号、感叹号、换行符分割
   */
  private splitText(text: string, maxLen = 200): string[] {
    if (text.length <= maxLen) return [text]

    const segments: string[] = []
    const delimiters = /([。！？\n])/
    const parts = text.split(delimiters)

    let current = ''
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (current.length + part.length > maxLen && current.length > 0) {
        segments.push(current.trim())
        current = ''
      }
      current += part
    }
    if (current.trim()) {
      segments.push(current.trim())
    }

    // 如果某段仍然过长，硬切
    const result: string[] = []
    for (const seg of segments) {
      if (seg.length <= maxLen) {
        result.push(seg)
      } else {
        for (let i = 0; i < seg.length; i += maxLen) {
          result.push(seg.slice(i, i + maxLen))
        }
      }
    }

    return result.filter((s) => s.length > 0)
  }

  speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const synth = window.speechSynthesis
      if (!synth) {
        reject(new Error('SpeechSynthesis not supported'))
        return
      }

      // 取消之前的播放
      synth.cancel()

      const segments = this.splitText(text)
      if (segments.length === 0) {
        resolve()
        return
      }

      this._isSpeaking = true

      let index = 0

      const speakNext = () => {
        if (index >= segments.length) {
          this._isSpeaking = false
          this._onEndCallback?.()
          resolve()
          return
        }

        const utterance = new SpeechSynthesisUtterance(segments[index])
        const voice = this.pickVoice()

        if (voice) {
          utterance.voice = voice
        }
        utterance.lang = 'zh-CN'
        utterance.rate = 1.0
        utterance.pitch = 1.0

        utterance.onend = () => {
          index++
          speakNext()
        }

        utterance.onerror = (e) => {
          // 'interrupted' 和 'canceled' 不算真正的错误
          if (e.error === 'interrupted' || e.error === 'canceled') {
            this._isSpeaking = false
            this._onEndCallback?.()
            resolve()
          } else {
            this._isSpeaking = false
            this._onEndCallback?.()
            reject(new Error(`SpeechSynthesis error: ${e.error}`))
          }
        }

        synth.speak(utterance)
      }

      // 某些浏览器需要在 speak 之前先 resume
      if (synth.paused) {
        synth.resume()
      }

      speakNext()
    })
  }

  stop(): void {
    const synth = window.speechSynthesis
    if (synth) {
      synth.cancel()
    }
    this._isSpeaking = false
    this._onEndCallback?.()
  }

  /** 外部注册 speaking 结束回调（用于 UI 动画停止等） */
  onEnd(cb: () => void): void {
    this._onEndCallback = cb
  }
}

// ==================== Bailian TTS Provider (预留) ====================

/**
 * BailianTTSProvider — 百炼 / CosyVoice TTS
 *
 * 预留接口，待后续实现：
 * - 需要 DASHSCOPE_API_KEY
 * - 调用 https://dashscope.aliyuncs.com/api/v1/services/aigc/text2speech/generation
 * - 支持 CosyVoice 声音复刻
 * - 返回音频流，通过 AudioContext 播放
 */
// export class BailianTTSProvider implements ITTSProvider {
//   private _isSpeaking = false
//
//   get isSpeaking(): boolean {
//     return this._isSpeaking
//   }
//
//   async speak(text: string): Promise<void> {
//     // TODO: 实现百炼 TTS 调用
//   }
//
//   stop(): void {
//     // TODO: 停止音频播放
//   }
// }

// ==================== Provider 工厂 ====================

let _defaultProvider: ITTSProvider | null = null

/**
 * 获取默认 TTS Provider
 * 当前返回 BrowserTTSProvider
 * 后续可根据配置切换到 BailianTTSProvider
 */
export function getDefaultTTSProvider(): ITTSProvider {
  if (!_defaultProvider) {
    _defaultProvider = new BrowserTTSProvider()
  }
  return _defaultProvider
}

/**
 * 创建指定类型的 TTS Provider
 * 用于后续显式切换 provider
 */
export function createTTSProvider(name: TTSProviderName): ITTSProvider {
  switch (name) {
    case 'browser':
      return new BrowserTTSProvider()
    case 'bailian':
      // TODO: return new BailianTTSProvider()
      console.warn('[tts-provider] BailianTTSProvider not yet implemented, falling back to browser')
      return new BrowserTTSProvider()
    default:
      return new BrowserTTSProvider()
  }
}

/**
 * 浏览器是否支持 SpeechSynthesis
 */
export function isBrowserTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

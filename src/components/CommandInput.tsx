"use client";

import { useRef, useState } from "react";
import { isSpeechRecognitionSupported, startSpeechRecognition } from "@/lib/speech-recognition";

export function CommandInput({
  value,
  disabled,
  onChange,
  onSend,
  onVoiceState,
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSend: (inputType?: "text" | "voice") => void;
  onVoiceState: (listening: boolean) => void;
}) {
  const [voiceMessage, setVoiceMessage] = useState("");
  const recognitionRef = useRef<{ stop: () => void; abort: () => void } | null>(null);
  const supported = isSpeechRecognitionSupported();

  function startVoice() {
    if (!supported || disabled) {
      setVoiceMessage("当前浏览器不支持语音识别。");
      return;
    }

    onVoiceState(true);
    setVoiceMessage("正在聆听...");
    recognitionRef.current = startSpeechRecognition({
      onResult: (text, isFinal) => {
        onChange(text);
        if (isFinal && text.trim()) {
          setVoiceMessage("");
          onVoiceState(false);
          setTimeout(() => onSend("voice"), 0);
        }
      },
      onEnd: () => {
        onVoiceState(false);
        setVoiceMessage("");
      },
      onError: (message) => {
        onVoiceState(false);
        setVoiceMessage(`语音识别未完成：${message}`);
      },
    });
  }

  function stopVoice() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    onVoiceState(false);
  }

  return (
    <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
      <div className="flex items-end gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-input)] p-2">
        <textarea
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend("text");
            }
          }}
          placeholder="输入一个正在反复出现的问题..."
          rows={1}
          className="min-h-11 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)]"
        />
        <button
          type="button"
          className="icon-button"
          title={supported ? "语音输入" : "当前浏览器不支持语音输入"}
          onClick={voiceMessage ? stopVoice : startVoice}
          disabled={disabled}
        >
          <span className="font-label text-xs">MIC</span>
        </button>
        <button type="button" className="primary-button min-w-20" onClick={() => onSend("text")} disabled={disabled || !value.trim()}>
          发送
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-faint)]">
        <span>{voiceMessage || "Enter 发送，Shift + Enter 换行"}</span>
        <span className="font-label">voiceId: browser-default</span>
      </div>
    </div>
  );
}

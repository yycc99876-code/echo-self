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
      setVoiceMessage("这个浏览器暂时听不见你，可以先打字。");
      return;
    }

    onVoiceState(true);
    setVoiceMessage("我在听，说完会自动发送。");
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
        setVoiceMessage(`这次没听清：${message}`);
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
          placeholder="说一句你现在的真实状态，或者直接问我一个卡住的问题..."
          rows={1}
          className="min-h-11 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)]"
        />
        <button
          type="button"
          className="icon-button"
          title={supported ? "按下语音，说给 Echo 听" : "当前浏览器不支持语音输入"}
          onClick={voiceMessage ? stopVoice : startVoice}
          disabled={disabled}
        >
          <span className="font-label text-xs">VOICE</span>
        </button>
        <button type="button" className="primary-button min-w-20" onClick={() => onSend("text")} disabled={disabled || !value.trim()}>
          送出
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-faint)]">
        <span>{voiceMessage || "Enter 送出，Shift + Enter 换行。语音会先转文字，再由 Echo 回应。"}</span>
        <span className="font-label">voice: browser fallback</span>
      </div>
    </div>
  );
}

export type SpeechCallbacks = {
  onResult: (text: string, isFinal: boolean) => void;
  onEnd: () => void;
  onError: (message: string) => void;
};

type RecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: SpeechRecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
};

type RecognitionConstructor = new () => RecognitionInstance;

export function isSpeechRecognitionSupported() {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function startSpeechRecognition(callbacks: SpeechCallbacks) {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const Constructor = (w.SpeechRecognition || w.webkitSpeechRecognition) as RecognitionConstructor | undefined;
  if (!Constructor) return null;

  const recognition = new Constructor();
  recognition.lang = "zh-CN";
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let transcript = "";
    let final = false;
    for (let index = 0; index < event.results.length; index += 1) {
      const result = event.results[index];
      transcript += result[0].transcript;
      final = final || result.isFinal;
    }
    callbacks.onResult(transcript, final);
  };
  recognition.onend = callbacks.onEnd;
  recognition.onerror = (event) => callbacks.onError(event.error);
  recognition.start();

  return recognition;
}

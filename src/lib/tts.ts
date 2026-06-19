export function speakText(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return () => {};
  }

  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text.replace(/[#*_`>-]/g, ""));
  utterance.lang = "zh-CN";
  utterance.rate = 0.95;
  utterance.pitch = 0.92;

  const voices = synth.getVoices();
  const chineseVoice = voices.find((voice) => /zh|Chinese|Mandarin/i.test(`${voice.lang} ${voice.name}`));
  if (chineseVoice) utterance.voice = chineseVoice;

  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  synth.speak(utterance);

  return () => synth.cancel();
}

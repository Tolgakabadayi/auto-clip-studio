/**
 * Nova AI Autonomous Voice & Speech Synthesis Engine
 * Provides realistic, snappy, expressive Turkish Text-To-Speech (TTS)
 */

type VoiceStateListener = (speaking: boolean) => void;

class NovaVoiceService {
  private static instance: NovaVoiceService;
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeakingInternal = false;
  private listeners: Set<VoiceStateListener> = new Set();
  private turkishVoice: SpeechSynthesisVoice | null = null;
  private initialized = false;

  private constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  public static getInstance(): NovaVoiceService {
    if (!NovaVoiceService.instance) {
      NovaVoiceService.instance = new NovaVoiceService();
    }
    return NovaVoiceService.instance;
  }

  private initVoices(): void {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return;

    // Prefer Turkish natural or enhanced voices
    const trVoice =
      voices.find((v) => v.lang === 'tr-TR' && (v.name.includes('Natural') || v.name.includes('Online'))) ||
      voices.find((v) => v.lang.startsWith('tr') || v.name.toLowerCase().includes('turkish')) ||
      voices.find((v) => v.lang.startsWith('tr')) ||
      null;

    this.turkishVoice = trVoice;
    this.initialized = true;
  }

  public isMuted(): boolean {
    try {
      return localStorage.getItem('autoclip_copilot_muted') === 'true';
    } catch {
      return false;
    }
  }

  public setMuted(muted: boolean): void {
    try {
      localStorage.setItem('autoclip_copilot_muted', String(muted));
      if (muted) {
        this.cancel();
      }
    } catch {}
  }

  public isSpeaking(): boolean {
    return this.isSpeakingInternal;
  }

  public subscribe(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    listener(this.isSpeakingInternal);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setSpeaking(val: boolean): void {
    this.isSpeakingInternal = val;
    this.listeners.forEach((fn) => {
      try {
        fn(val);
      } catch (e) {
        console.error(e);
      }
    });
  }

  /**
   * Sanitizes input text into natural conversational spoken Turkish
   */
  public cleanTextForSpeech(rawText: string): string {
    if (!rawText) return '';

    let text = rawText;

    // Remove markdown code blocks and inline code
    text = text.replace(/```[\s\S]*?```/g, ' ');
    text = text.replace(/`([^`]+)`/g, '$1');

    // Remove markdown bold, italic, headers, strikethrough
    text = text.replace(/[*_~#]/g, ' ');

    // Remove links [title](url) -> title
    text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

    // Remove URLs
    text = text.replace(/https?:\/\/\S+/g, ' ');

    // Remove emojis and pictographs
    try {
      text = text.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, ' ');
    } catch {
      // Fallback emoji regex if unicode property escapes fail in older environments
      text = text.replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]+/g, ' ');
    }

    // Replace typical technical tags and symbols
    text = text.replace(/&amp;/g, 've');
    text = text.replace(/&/g, 've');
    text = text.replace(/%/g, 'yüzde ');
    text = text.replace(/->/g, ' ');
    text = text.replace(/[\[\]\(\)\{\}\<\>\\\/|]/g, ' ');

    // Normalize spacing and newlines
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  /**
   * Speaks the given text with lively, intelligent Nova inflection
   */
  public speak(
    rawText: string,
    options?: {
      force?: boolean;
      rate?: number;
      pitch?: number;
      onEnd?: () => void;
    }
  ): void {
    if (!this.synth) return;

    if (!options?.force && this.isMuted()) {
      return;
    }

    const clean = this.cleanTextForSpeech(rawText);
    if (!clean) return;

    // Cancel any ongoing speech
    this.cancel();

    if (!this.initialized) {
      this.initVoices();
    }

    try {
      const utterance = new SpeechSynthesisUtterance(clean);

      if (this.turkishVoice) {
        utterance.voice = this.turkishVoice;
        utterance.lang = this.turkishVoice.lang;
      } else {
        utterance.lang = 'tr-TR';
      }

      // Snappy, warm, confident conversational pace
      utterance.rate = options?.rate ?? 1.08;
      utterance.pitch = options?.pitch ?? 1.06;

      utterance.onstart = () => {
        this.setSpeaking(true);
      };

      utterance.onend = () => {
        this.setSpeaking(false);
        this.currentUtterance = null;
        if (options?.onEnd) options.onEnd();
      };

      utterance.onerror = (e) => {
        this.setSpeaking(false);
        this.currentUtterance = null;
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('[NovaVoice] Speech error:', e);
        }
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    } catch (err) {
      console.warn('[NovaVoice] Speak execution failed:', err);
      this.setSpeaking(false);
    }
  }

  public cancel(): void {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
    }
    this.setSpeaking(false);
    this.currentUtterance = null;
  }
}

export const novaVoice = NovaVoiceService.getInstance();

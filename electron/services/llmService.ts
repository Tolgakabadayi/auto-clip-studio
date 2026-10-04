import { TranscriptResult, ViralClip, SocialCopyMetadata } from '../../src/types';

export interface LLMAnalysisOptions {
  provider: 'ollama' | 'groq';
  ollamaModel?: string; // default: gemma3:4b
  ollamaHost?: string;  // default: http://localhost:11434
  groqApiKey?: string;
  groqModel?: string;   // default: llama-3.3-70b-versatile
  clipCount?: number;   // default: 3
  minClipDuration?: number; // default: 30
  maxClipDuration?: number; // default: 60
}

export class LLMService {
  /**
   * Formats transcript segments into coherent ~20-30s conversational blocks.
   * Drastically reduces token count (by ~65%) and helps the LLM recognize complete thoughts.
   */
  private formatTranscriptForLLM(transcript: TranscriptResult): string {
    const blocks: string[] = [];
    let currentBlock = { start: 0, end: 0, texts: [] as string[] };

    for (const s of transcript.segments) {
      if (currentBlock.texts.length === 0) {
        currentBlock.start = s.start;
      }
      const trimmed = s.text.trim();
      if (trimmed) {
        currentBlock.texts.push(trimmed);
      }
      currentBlock.end = s.end;

      // Group into ~20-25s blocks
      if (currentBlock.end - currentBlock.start >= 22) {
        const sM = Math.floor(currentBlock.start / 60);
        const sS = Math.floor(currentBlock.start % 60);
        const eM = Math.floor(currentBlock.end / 60);
        const eS = Math.floor(currentBlock.end % 60);
        const pad = (n: number) => String(n).padStart(2, '0');
        const tag = `[${pad(sM)}:${pad(sS)} -> ${pad(eM)}:${pad(eS)}] (${Math.round(currentBlock.start)}s-${Math.round(currentBlock.end)}s)`;
        blocks.push(`${tag}: ${currentBlock.texts.join(' ')}`);
        currentBlock = { start: 0, end: 0, texts: [] };
      }
    }

    if (currentBlock.texts.length > 0) {
      const sM = Math.floor(currentBlock.start / 60);
      const sS = Math.floor(currentBlock.start % 60);
      const eM = Math.floor(currentBlock.end / 60);
      const eS = Math.floor(currentBlock.end % 60);
      const pad = (n: number) => String(n).padStart(2, '0');
      const tag = `[${pad(sM)}:${pad(sS)} -> ${pad(eM)}:${pad(eS)}] (${Math.round(currentBlock.start)}s-${Math.round(currentBlock.end)}s)`;
      blocks.push(`${tag}: ${currentBlock.texts.join(' ')}`);
    }

    return blocks.join('\n');
  }

  /**
   * Builds the system & user prompt as requested
   */
  private buildPrompt(
    transcriptFormatted: string,
    clipCount = 3,
    minDuration = 30,
    maxDuration = 60
  ): string {
    const sampleItems = [
      {
        clip_id: 1,
        title: "Videonun içeriğine uygun vurucu başlık 1",
        start_time: "00:01:10",
        end_time: "00:01:45",
        start_seconds: 70,
        end_seconds: 105,
        duration_seconds: 35,
        hook_sentence: "İzleyiciyi ekrana bağlayan ilk cümle",
        virality_score: 95,
        reason: "Merak uyandıran soru ve akıcı konuşma",
        keywords: ["viral", "kesit"]
      },
      {
        clip_id: 2,
        title: "Videonun içeriğine uygun vurucu başlık 2",
        start_time: "00:03:00",
        end_time: "00:03:40",
        start_seconds: 180,
        end_seconds: 220,
        duration_seconds: 40,
        hook_sentence: "Şaşırtıcı ve bilgilendirici kanca cümle",
        virality_score: 91,
        reason: "Önemli bir detayın açıklandığı an",
        keywords: ["önemli", "bilgi"]
      }
    ];

    return `Sen uzman bir viral video editörü ve sosyal medya stratejistisin (TikTok, Instagram Reels ve YouTube Shorts uzmanı).
GÖREVİN: Sana zaman damgalarıyla verilen video transkriptini baştan sona analiz edip, izleyicinin dikkatini anında yakalayacak TAM OLARAK ${clipCount} ADET FARKLI klibi (${minDuration} ila ${maxDuration} saniye arasında) tespit etmek.

TAVİZSİZ VE KESİN KURALLAR:
1. KLİP SAYISI: 'clips' dizisinde KESİNLİKLE VE TAM OLARAK ${clipCount} TANE KLİP OLMALIDIR. Asla ${clipCount}'den az (örneğin sadece 1 tane) veya fazla döndürme!
2. SÜRE ARALIĞI: Her klibin süresi (end_seconds - start_seconds) KESİNLİKLE EN AZ ${minDuration} SANİYE, EN FAZLA ${maxDuration} SANİYE olmak zorundadır! Asla ${minDuration} saniyeden kısa veya ${maxDuration} saniyeden uzun yapma!
3. HALÜSİNASYON YASAKTIR: KESİNLİKLE sadece sana verilen transkriptteki metni ve olayları kullan. Transkriptte geçmeyen HİÇBİR özel isim veya uydurma bağlam ekleme.
4. KANCA (HOOK): Klibin ilk 3-5 saniyesinde merak uyandıran güçlü bir giriş cümlesi olmalı (sadece transkriptteki gerçek cümlelerden seç).
5. FARKLI BÖLÜMLER: Seçilen ${clipCount} adet klip videonun farklı zaman dilimlerinden seçilmeli ve birbiriyle çakışmamalıdır.
6. BAŞLIK: Klibin başlığı (title) kesinlikle videonun GERÇEK İÇERİĞİYLE ilgili ve Türkçe olmalıdır.

Aşağıdaki JSON nesnesi formatında TAM OLARAK ${clipCount} ELEMANLI geçerli bir JSON döndür. Başka hiçbir metin veya markdown ekleme:
{
  "clips": ${JSON.stringify(sampleItems, null, 2)}
}

ANALİZ EDİLECEK YEGANE TRANSKRİPT (SADECE BURADAKİ METNİ VE İSİMLERİ KULLAN):
${transcriptFormatted}
`;
  }

  public async detectHighlights(
    transcript: TranscriptResult,
    options: LLMAnalysisOptions
  ): Promise<ViralClip[]> {
    const formattedTranscript = this.formatTranscriptForLLM(transcript);
    const count = options.clipCount || 3;
    const minDur = options.minClipDuration || 30;
    const maxDur = options.maxClipDuration || 60;
    const prompt = this.buildPrompt(formattedTranscript, count, minDur, maxDur);

    let rawResponseText = '';

    if (options.provider === 'groq') {
      rawResponseText = await this.callGroq(prompt, options);
    } else {
      rawResponseText = await this.callOllama(prompt, options);
    }

    return this.parseAndValidateClips(rawResponseText, transcript, count, minDur, maxDur);
  }

  private async callGroq(prompt: string, options: LLMAnalysisOptions): Promise<string> {
    const apiKey = options.groqApiKey || process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('Groq API anahtarı girilmedi. Lütfen ayarlar bölümünden geçerli bir API anahtarı ekleyin.');
    }

    const model = options.groqModel || 'llama-3.3-70b-versatile';
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const body: any = {
      model: model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    };
    
    // Add reasoning effort if using reasoning models
    if (model.includes('deepseek') || model.includes('oss')) {
      body.reasoning_effort = 'medium';
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API Hatası (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  private async callOllama(prompt: string, options: LLMAnalysisOptions): Promise<string> {
    const host = options.ollamaHost || 'http://localhost:11434';
    const model = options.ollamaModel || 'qwen3:8b';
    const url = `${host}/api/generate`;

    // Fast GPU VRAM inference: num_ctx=4096 and keep_alive=15m
    const body = {
      model,
      prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.3,
        num_ctx: 4096,
        num_predict: 800,
        num_thread: 8,
      },
      keep_alive: '15m',
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Ollama isteği başarısız (${res.status}): ${errText}`);
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(`Ollama Hatası: ${data.error}`);
      }
      return data.response || '';
    } catch (e: any) {
      throw new Error(`Ollama servisine bağlanılamadı (${host}): ${e.message}. Ollama'nın çalıştığından emin olun.`);
    }
  }

  public async queryOllama(opts: {
    model?: string;
    systemPrompt?: string;
    prompt: string;
    host?: string;
  }): Promise<string> {
    const host = opts.host || 'http://localhost:11434';
    const model = opts.model || 'qwen3:8b';
    const url = `${host}/api/generate`;

    const body: any = {
      model,
      prompt: opts.prompt,
      system: opts.systemPrompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_ctx: 4096,
        num_predict: 600,
        num_thread: 8,
      },
      keep_alive: '15m',
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Ollama isteği başarısız (${res.status}): ${errText}`);
      }

      const data = await res.json();
      return data.response || '';
    } catch (e: any) {
      throw new Error(`Ollama servisine bağlanılamadı (${host}): ${e.message}`);
    }
  }

  private parseAndValidateClips(
    rawText: string,
    transcript: TranscriptResult,
    targetCount = 3,
    minDur = 30,
    maxDur = 60
  ): ViralClip[] {
    try {
      // 1. Clean markdown fences
      let cleaned = rawText.trim();
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();

      let parsed: any = null;
      try {
        parsed = JSON.parse(cleaned);
      } catch (jsonErr) {
        // Try to locate JSON array or object substring
        const firstBracket = cleaned.indexOf('[');
        const lastBracket = cleaned.lastIndexOf(']');
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');

        if (firstBracket !== -1 && lastBracket > firstBracket) {
          try {
            parsed = JSON.parse(cleaned.substring(firstBracket, lastBracket + 1));
          } catch {}
        }
        if (!parsed && firstBrace !== -1 && lastBrace > firstBrace) {
          try {
            parsed = JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
          } catch {}
        }

        if (!parsed) {
          throw jsonErr;
        }
      }

      // 2. Extract array from any structure
      let clipsArray: any[] = [];

      if (Array.isArray(parsed)) {
        clipsArray = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.clips)) {
          clipsArray = parsed.clips;
        } else if (Array.isArray(parsed.data)) {
          clipsArray = parsed.data;
        } else if (Array.isArray(parsed.results)) {
          clipsArray = parsed.results;
        } else if (Array.isArray(parsed.viral_clips)) {
          clipsArray = parsed.viral_clips;
        } else if (parsed.title || parsed.clip_id || parsed.start_seconds !== undefined) {
          // Model returned a single clip object! Wrap it!
          clipsArray = [parsed];
        } else {
          // Check if object keys are clips: { "clip1": {...}, "clip2": {...} }
          const values = Object.values(parsed);
          const validObjs = values.filter((v: any) => v && typeof v === 'object' && (v.title || v.start_seconds !== undefined));
          if (validObjs.length > 0) {
            clipsArray = validObjs;
          }
        }
      }

      if (!clipsArray || clipsArray.length === 0) {
        throw new Error('LLM geçerli bir klip listesi döndüremedi.');
      }

      const formatTime = (sec: number) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      };

      const validatedClips: ViralClip[] = clipsArray.map((c, index) => {
        let startSec = Math.max(0, Number(c.start_seconds) || 0);
        let endSec = Number(c.end_seconds) || (startSec + minDur);

        // Clamp duration strictly between minDur and maxDur
        let dur = endSec - startSec;
        if (dur < minDur) {
          endSec = startSec + minDur;
        } else if (dur > maxDur) {
          endSec = startSec + maxDur;
        }

        // Clamp to transcript duration if available
        if (transcript.duration && endSec > transcript.duration) {
          endSec = Math.floor(transcript.duration);
          startSec = Math.max(0, endSec - Math.min(maxDur, Math.max(minDur, Math.floor(transcript.duration))));
        }

        const duration = Math.max(minDur, Math.round(endSec - startSec));

        // Guaranteed Non-Empty Hook Extraction (checks multiple aliases and transcript segments)
        const extractHook = (): string => {
          const raw = (c.hook_sentence || c.hook || c.kanca || c.hookSentence || c.opening_hook || c.first_sentence || '')
            .replace(/^[“"”\s]+|[“"”\s]+$/g, '')
            .trim();
          if (raw && raw.length > 3 && raw !== '""') return raw;

          if (transcript && transcript.segments) {
            const matching = transcript.segments.filter((s) => s.end >= startSec && s.start <= startSec + 8);
            if (matching.length > 0) {
              const fullText = matching.map((s) => s.text.trim()).join(' ').replace(/[“"”\r\n]+/g, ' ').trim();
              const sentences = fullText.split(/(?<=[.?!])\s+/);
              if (sentences[0] && sentences[0].length >= 8) return sentences[0];
              const words = fullText.split(/\s+/).slice(0, 14).join(' ');
              if (words.length >= 6) return words + '...';
            }
          }
          return c.title ? `${c.title}` : '🔥 Dikkat çekici açılış kancası';
        };

        // Smart Title Extraction (NEVER generic "Viral Kesit")
        const generateSmartTitle = (): string => {
          const raw = (c.title || c.suggested_title || '').trim();
          const isGeneric = !raw || /^viral\s*kesit/i.test(raw) || /^klip\s*\d*/i.test(raw) || /^clip\s*\d*/i.test(raw);
          if (!isGeneric && raw.length >= 5) {
            return raw;
          }
          const hook = extractHook();
          if (hook && hook.length >= 8 && !/^viral\s*kesit/i.test(hook)) {
            const firstPart = hook.split(/[?.!]/)[0] || hook;
            const words = firstPart.split(/\s+/).slice(0, 6).join(' ');
            if (words.length >= 5) return words.endsWith('?') ? words : `${words}!`;
          }
          return `Öne Çıkan An #${index + 1}`;
        };

        return {
          clip_id: c.clip_id || index + 1,
          title: generateSmartTitle(),
          start_time: c.start_time || formatTime(startSec),
          end_time: c.end_time || formatTime(endSec),
          start_seconds: Math.round(startSec),
          end_seconds: Math.round(endSec),
          duration_seconds: duration,
          hook_sentence: extractHook(),
          virality_score: Math.min(100, Math.max(50, Number(c.virality_score) || 85)),
          reason: c.reason || 'Yüksek etkileşim potansiyeli taşıyan akıcı diyalog.',
          keywords: Array.isArray(c.keywords) ? c.keywords : ['viral', 'shorts'],
          status: 'pending',
        };
      });

      return this.ensureExactClipCount(validatedClips, transcript, targetCount, minDur, maxDur);
    } catch (err: any) {
      console.error('[LLMService] Failed to parse JSON from LLM:', rawText);
      throw new Error(`Klip analiz yanıtı ayrıştırılamadı: ${err.message}`);
    }
  }

  /**
   * Guarantees that the returned array contains EXACTLY targetCount clips.
   * If LLM produced fewer clips, smart heuristics extract extra dialogue segments from the transcript.
   */
  private ensureExactClipCount(
    clips: ViralClip[],
    transcript: TranscriptResult,
    targetCount: number,
    minDur: number,
    maxDur: number
  ): ViralClip[] {
    if (clips.length === targetCount) {
      return clips.map((c, i) => ({ ...c, clip_id: i + 1 }));
    }

    if (clips.length > targetCount) {
      return clips.slice(0, targetCount).map((c, i) => ({ ...c, clip_id: i + 1 }));
    }

    const targetDur = Math.round((minDur + maxDur) / 2);
    const totalVideoDuration = transcript.duration ||
      (transcript.segments.length > 0 ? transcript.segments[transcript.segments.length - 1].end : 300);

    const formatTime = (sec: number) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const isOverlapping = (start: number, end: number, existingClips: ViralClip[]) => {
      return existingClips.some(c => (start < c.end_seconds && end > c.start_seconds));
    };

    const result = [...clips];

    // Attempt to extract non-overlapping high-dialogue segments from transcript
    if (transcript.segments && transcript.segments.length > 0) {
      for (const seg of transcript.segments) {
        if (result.length >= targetCount) break;

        const proposedStart = Math.max(0, Math.floor(seg.start));
        const proposedEnd = Math.min(totalVideoDuration, proposedStart + targetDur);

        if (proposedEnd - proposedStart >= minDur && !isOverlapping(proposedStart, proposedEnd, result)) {
          const windowSegments = transcript.segments
            .filter(s => s.end >= proposedStart && s.start <= proposedEnd)
            .map(s => s.text.trim())
            .filter(Boolean);
          const combinedText = windowSegments.join(' ');
          const firstSentence = combinedText.split(/[.?!]/)[0] || 'Viral Konuşma';
          const titleWords = firstSentence.split(' ').slice(0, 5).join(' ');

          result.push({
            clip_id: result.length + 1,
            title: titleWords ? `${titleWords}!` : `Öne Çıkan An #${result.length + 1}`,
            start_time: formatTime(proposedStart),
            end_time: formatTime(proposedEnd),
            start_seconds: proposedStart,
            end_seconds: proposedEnd,
            duration_seconds: proposedEnd - proposedStart,
            hook_sentence: firstSentence.substring(0, 100),
            virality_score: Math.max(70, 90 - (result.length * 2)),
            reason: 'Önemli diyalog ve konuşma akışı barındıran bölüm.',
            keywords: ['viral', 'kesit', 'trend'],
            status: 'pending',
          });
        }
      }
    }

    // Fallback: If still under targetCount, distribute windows across total duration
    let fallbackIndex = 0;
    while (result.length < targetCount) {
      const step = Math.max(10, Math.floor((Math.max(totalVideoDuration, 60) - minDur) / Math.max(1, targetCount)));
      const proposedStart = Math.min(Math.max(0, totalVideoDuration - minDur), fallbackIndex * step);
      const proposedEnd = Math.min(totalVideoDuration, proposedStart + targetDur);
      const actualDuration = Math.max(minDur, Math.round(proposedEnd - proposedStart));

      // Try reading sample text for fallback title
      let fallbackTitle = `Vurucu An #${result.length + 1}`;
      if (transcript.segments && transcript.segments.length > 0) {
        const seg = transcript.segments.find(s => s.start >= proposedStart);
        if (seg && seg.text) {
          const words = seg.text.trim().split(/\s+/).slice(0, 5).join(' ');
          if (words.length >= 6) fallbackTitle = `${words}!`;
        }
      }

      result.push({
        clip_id: result.length + 1,
        title: fallbackTitle,
        start_time: formatTime(proposedStart),
        end_time: formatTime(proposedEnd),
        start_seconds: Math.max(0, Math.round(proposedStart)),
        end_seconds: Math.round(proposedStart + actualDuration),
        duration_seconds: actualDuration,
        hook_sentence: 'Bu bölüm videonun öne çıkan kesitlerinden biridir.',
        virality_score: 82,
        reason: 'Otomatik optimize edilmiş dinamik zaman aralığı.',
        keywords: ['viral', 'shorts'],
        status: 'pending',
      });
      fallbackIndex++;
    }

    return result.slice(0, targetCount).map((c, i) => ({ ...c, clip_id: i + 1 }));
  }

  /**
   * Generates high-CTR viral titles, descriptions, and hashtags for social media (TikTok/Shorts/Reels)
   */
  public async generateSocialCopy(
    clip: ViralClip,
    options: LLMAnalysisOptions
  ): Promise<SocialCopyMetadata> {
    const prompt = `Sen TikTok, Instagram Reels ve YouTube Shorts için viral video editörü ve sosyal medya büyüme uzmanısın.
Sana bilgileri verilen klip için maksimum tıklama, izlenme, yorum ve paylaşım getirecek sosyal medya içerik paketini oluştur.

KLİP BİLGİLERİ:
- Başlık: ${clip.title}
- Giriş/Kanca Cümlesi (Hook): ${clip.hook_sentence || clip.title}
- Klibin Seçilme Sebebi: ${clip.reason}
- Klip Süresi: ${clip.duration_seconds} saniye
- Anahtar Kelimeler: ${clip.keywords?.join(', ') || ''}

GÖREVİN VE ÇIKTI FORMATI:
Aşağıdaki JSON şemasında KESİNLİKLE geçerli bir JSON döndür:
{
  "titles": [
    "1. Merak Uyandıran Soru Başlığı (örn: Bunu gerçekten biliyor muydunuz? 😱)",
    "2. Şok Edici / İddialı Kanca Başlığı (örn: Bu hatayı sakın yapmayın!)",
    "3. Kısa & Vurucu Trend Başlık (örn: Hayatınızı değiştirecek detay...)"
  ],
  "description": "Video hakkında izleyiciyi meraklandıracak 2-3 cümlelik, emojilerle zenginleştirilmiş, akıcı ve ilgi çekici açıklama metni.",
  "callToAction": "İzleyiciden yorum veya kaydetme isteyen güçlü bir çağrı (örn: Siz bu konuda ne düşünüyorsunuz? Yorumlarda buluşalım 👇)",
  "hashtags": [
    "#shorts", "#viral", "#fyp", "#keşfet", "#reels", "#tiktok",
    "#trend", "#video"
  ]
}

SADECE JSON döndür. Başka hiçbir açıklama ekleme.`;

    let rawResponse = '';
    try {
      if (options.provider === 'groq') {
        rawResponse = await this.callGroq(prompt, options);
      } else {
        rawResponse = await this.callOllama(prompt, options);
      }

      let cleaned = rawResponse.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
      const parsed = JSON.parse(cleaned);

      return {
        titles: Array.isArray(parsed.titles) && parsed.titles.length > 0
          ? parsed.titles
          : [clip.title, `Şok Detay: ${clip.title}`, `Bunu Biliyor muydunuz? 😱`],
        description: parsed.description || clip.hook_sentence || 'Bu videodaki önemli anı kaçırmayın!',
        callToAction: parsed.callToAction || 'Siz bu konuda ne düşünüyorsunuz? Yorumlarda belirtin! 👇',
        hashtags: Array.isArray(parsed.hashtags) && parsed.hashtags.length > 0
          ? parsed.hashtags.map((h: string) => (h.startsWith('#') ? h : `#${h}`))
          : ['#shorts', '#viral', '#fyp', '#reels', '#keşfet', '#trend'],
      };
    } catch (e: any) {
      console.warn('[LLMService] Social copy parsing failed, fallback used:', e.message);
      return {
        titles: [
          clip.title,
          `İnanamayacaksınız: ${clip.title} 🔥`,
          `Bunu mutlaka izleyin! 😱`
        ],
        description: `${clip.hook_sentence || clip.title}\n\nDaha fazlası için takip etmeyi unutmayın!`,
        callToAction: 'Siz ne düşünüyorsunuz? Yorumlarda buluşalım! 👇',
        hashtags: ['#shorts', '#viral', '#fyp', '#reels', '#keşfet', '#trend', '#video', '#öneçıkar'],
      };
    }
  }
}

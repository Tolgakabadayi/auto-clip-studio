import { AutopilotService } from './autopilotService';
import { YouTubeService } from './youtubeService';
import { AgencyService } from './agencyService';
import { LLMService } from './llmService';
import { CopilotMessage, CopilotSpeech, CCVideoCandidate } from '../../src/types';

export class CopilotService {
  private messages: CopilotMessage[] = [
    {
      id: 'init_1',
      sender: 'assistant',
      text: 'Selam patron! Ben AutoClip AI Stüdyo Baş Danışmanın NOVA. Uygulama üzerinde tam yetkiye sahibim. Bana "röportaj videosu en az 3milyon izlenmesi olsun bul hazır et" gibi sesli veya yazılı emirler verebilirsin!',
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      status: 'done',
    },
  ];

  public onSpeech: ((speech: CopilotSpeech) => void) | null = null;
  public onMessage: ((msg: CopilotMessage) => void) | null = null;
  public onOpenModal: ((modal: 'agency' | 'autopilot' | 'settings' | 'pitches') => void) | null = null;
  public onTriggerMeeting: ((options?: any) => Promise<any>) | null = null;
  public onDownloadVideo: ((url: string) => Promise<any>) | null = null;

  constructor(
    private autopilotService: AutopilotService,
    private youtubeService: YouTubeService,
    private agencyService: AgencyService,
    private llmService: LLMService
  ) {}

  public getMessages(): CopilotMessage[] {
    return this.messages;
  }

  public emitSpeech(speech: CopilotSpeech): void {
    if (this.onSpeech) {
      this.onSpeech(speech);
    }
  }

  public emitMessage(msg: CopilotMessage): void {
    this.messages.push(msg);
    if (this.onMessage) {
      this.onMessage(msg);
    }
  }

  /**
   * Main command dispatcher: interprets natural Turkish intent and executes actions
   */
  public async handleUserCommand(rawCommand: string): Promise<CopilotMessage> {
    const text = rawCommand.trim();
    if (!text) {
      throw new Error('Komut boş olamaz');
    }

    // 1. Add user message
    const userMsg: CopilotMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };
    this.emitMessage(userMsg);

    // Initial feedback
    this.emitSpeech({
      message: 'Emrin inceleniyor patron, ajans veritabanını tarıyorum...',
      mood: 'working',
    });

    const lower = text.toLowerCase();

    // 2. Intent: Direct YouTube URL Detection & Download
    const ytUrlMatch = text.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[\w-]+[^\s]*/);
    if (ytUrlMatch) {
      const url = ytUrlMatch[0];
      const replyMsg: CopilotMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: `📥 YouTube bağlantısı algılandı: ${url}\n\nVideoyu stüdyo kurgu hattına indirmeye başladım patron! İndirme bittiğinde 2. aşamada klip ayarlarını belirleyebilirsin.`,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        status: 'acting',
        actionTaken: 'download_youtube',
      };
      this.emitMessage(replyMsg);
      this.emitSpeech({
        message: '📥 YouTube videosu indiriliyor patron! Kurgu hattına alıyorum...',
        mood: 'working',
      });

      if (this.onDownloadVideo) {
        this.onDownloadVideo(url).catch((err) => {
          this.emitSpeech({
            message: `⚠️ Video indirme hatası: ${err.message}`,
            mood: 'alert',
          });
        });
      }
      return replyMsg;
    }

    // 3. Intent: Start Strategic Discovery Meeting
    if (
      lower.includes('toplantı') ||
      lower.includes('toplantıyı başlat') ||
      lower.includes('keşif başlat') ||
      lower.includes('beyin fırtınası') ||
      lower.includes('stratejik toplantı') ||
      lower.includes('ajanlar toplansın')
    ) {
      const replyMsg: CopilotMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: '🚀 12 Ajanlı Stratejik Keşif Toplantısı başlatıldı patron! Scout Gemma, Trend Hunter ve Sentinel masada en viral videoları arıyor. Toplantı bittiğinde adayları hemen önüne getireceğim!',
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        status: 'acting',
        actionTaken: 'start_meeting',
      };
      this.emitMessage(replyMsg);
      this.emitSpeech({
        message: '🚀 12 Ajanlı Keşif Toplantısı başladı patron! Ekip masada viral adayları avlıyor...',
        mood: 'excited',
      });

      if (this.onOpenModal) {
        this.onOpenModal('agency');
      }

      if (this.onTriggerMeeting) {
        this.onTriggerMeeting().catch((err) => {
          this.emitSpeech({
            message: `⚠️ Toplantı sırasında sorun: ${err.message}`,
            mood: 'alert',
          });
        });
      }
      return replyMsg;
    }

    // 4. Intent: Open Pitch Deck / Curated Candidate Pitches
    if (
      lower.includes('viral aday') ||
      lower.includes('adaylar') ||
      lower.includes('adayları göster') ||
      lower.includes('sonuçları aç') ||
      lower.includes('sonuçlar') ||
      lower.includes('sunum masası') ||
      lower.includes('pitch deck') ||
      lower.includes('seçenekler')
    ) {
      if (this.onOpenModal) this.onOpenModal('pitches');
      const replyMsg: CopilotMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: '🎯 Viral Adaylar sunum masasını ekrana getirdim patron! Ekibin onayladığı Creative Commons videolarından dilediğini seçip tek tıkla kurguya gönderebilirsin.',
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        status: 'done',
        actionTaken: 'open_pitches',
        action: {
          label: '🎯 Viral Adayları İncele & Seç',
          action: 'open_pitches',
        },
      };
      this.emitMessage(replyMsg);
      this.emitSpeech({
        message: '🎯 Viral Adaylar sunum masasını açtım patron! Masadaki adayları inceleyebilirsin.',
        mood: 'excited',
        action: {
          label: '🎯 Viral Adayları İncele & Seç',
          action: 'open_pitches',
        },
      });
      return replyMsg;
    }

    // 5. Intent: Studio Status & Diagnostics Report
    if (
      lower.includes('durum ne') ||
      lower.includes('rapor ver') ||
      lower.includes('rapor') ||
      lower.includes('stüdyo durumu') ||
      lower.includes('nasıl gidiyor') ||
      lower.includes('ajanlar ne yapıyor') ||
      lower.includes('teşhis')
    ) {
      const apState = this.autopilotService.getState();
      const apRunningText = apState.isRunning ? '✅ 7/24 Aktif ve devriyede' : '⏸️ Beklemede (Pasif)';
      const queueCount = apState.packages ? apState.packages.length : 0;
      const candidatesCount = apState.candidates ? apState.candidates.length : 0;
      const totalGen = apState.stats?.totalGenerated || 0;
      const nextRun = apState.nextSlotInfo ? `${apState.nextSlotInfo.slotTime} (${apState.nextSlotInfo.minutesRemaining} dk kaldı)` : 'Planlanmamış';

      const statusText = `📊 AUTO-CLIP STUDIO DURUM RAPORU 📊\n` +
        `• 7/24 Otopilot Durumu: ${apRunningText}\n` +
        `• Sıradaki Yayın Saati: ${nextRun}\n` +
        `• Hazır Klip Paketleri: ${queueCount} adet\n` +
        `• Keşfedilen Adaylar: ${candidatesCount} adet\n` +
        `• Toplam Üretilen Klip: ${totalGen} adet\n` +
        `• 12 Ajanlı Masa: Tüm birimler (Scout, Director, QA, Sound, Cliffhanger) emirlerine hazır!`;

      const replyMsg: CopilotMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: statusText,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        status: 'done',
        actionTaken: 'status_report',
      };
      this.emitMessage(replyMsg);
      this.emitSpeech({
        message: `📊 Stüdyo raporu hazır patron! Otopilot: ${apState.isRunning ? 'Aktif' : 'Beklemede'}, ${queueCount} paket hazır bekliyor.`,
        mood: 'excited',
      });
      return replyMsg;
    }

    // 6. Intent: Open Studio Settings / Brand Safety
    if (
      lower.includes('ayar') ||
      lower.includes('kanal güvenliği') ||
      lower.includes('filtre') ||
      lower.includes('güvenlik') ||
      lower.includes('yasaklı kelimeler') ||
      lower.includes('siyah liste')
    ) {
      if (this.onOpenModal) this.onOpenModal('settings');
      const replyMsg: CopilotMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: '⚙️ Stüdyo & Kanal Güvenliği ayarları ekranınıza getirildi! Yapay zeka modelleri, kelime filtreleri (+18, siyaset, terör vb.) ve çıktı tercihlerini buradan yönetebilirsiniz.',
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        status: 'done',
        actionTaken: 'open_settings',
        action: {
          label: '⚙️ Ayarları Aç',
          action: 'open_settings',
        },
      };
      this.emitMessage(replyMsg);
      this.emitSpeech({
        message: '⚙️ Ayarlar ve Kanal Güvenliği panelini açtım patron!',
        mood: 'idle',
      });
      return replyMsg;
    }

    // 7. Intent: Stop Autopilot Engine
    if (
      lower.includes('otopilot') &&
      (lower.includes('durdur') || lower.includes('kapat') || lower.includes('pasif') || lower.includes('iptal'))
    ) {
      this.autopilotService.stopScheduler();
      const replyMsg: CopilotMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: '⏸️ 7/24 Otopilot zamanlayıcısı durduruldu patron! Arka planda otomatik arama yapılmayacak, istediğinde tekrar başlatabilirsin.',
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        status: 'done',
        actionTaken: 'stop_autopilot',
      };
      this.emitMessage(replyMsg);
      this.emitSpeech({
        message: '⏸️ Otopilot durduruldu patron, manuel kontroldesin.',
        mood: 'idle',
      });
      return replyMsg;
    }

    // 8. Intent: Open Autopilot Modal
    if (lower.includes('otopilot') && (lower.includes('aç') || lower.includes('panel') || lower.includes('göster') || lower.includes('ekran'))) {
      if (this.onOpenModal) this.onOpenModal('autopilot');
      const replyMsg: CopilotMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: '🤖 7/24 Otopilot kontrol merkezi ekranınıza getirildi! Otomatik yayın saatleri ve arşivi buradan yönetebilirsiniz.',
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        status: 'done',
        actionTaken: 'open_autopilot',
        action: {
          label: '⚡ Otopilot Panelini Aç',
          action: 'open_autopilot',
        },
      };
      this.emitMessage(replyMsg);
      this.emitSpeech({
        message: '🤖 Otopilot panelini açtım patron! 7/24 otonom motor hazır.',
        mood: 'excited',
      });
      return replyMsg;
    }

    // 9. Intent: Start 7/24 Autopilot Engine
    if (lower.includes('otopilot') && (lower.includes('başlat') || lower.includes('aktif') || lower.includes('çalıştır'))) {
      this.autopilotService.startScheduler();
      const replyMsg: CopilotMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: '🚀 7/24 Otopilot motoru AKTİF edildi! Günün belirlenen altın saatlerinde sistem arka planda telifsiz Creative Commons videolarını tarayıp klipleri üretecek.',
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        status: 'done',
        actionTaken: 'start_autopilot',
        action: {
          label: '⚡ Otopilot Panelini Gör',
          action: 'open_autopilot',
        },
      };
      this.emitMessage(replyMsg);
      this.emitSpeech({
        message: '🚀 7/24 Otopilot aktif edildi! Ben ve ajanlar 7/24 nöbetteyiz patron.',
        mood: 'excited',
      });
      return replyMsg;
    }

    // 10. Intent Analysis: Video Search & Production (e.g. "röportaj videosu en az 3milyon izlenmesi olsun bul hazır et")
    if (
      lower.includes('bul') ||
      lower.includes('hazır et') ||
      lower.includes('üret') ||
      lower.includes('izlen') ||
      lower.includes('röportaj') ||
      lower.includes('podcast') ||
      lower.includes('ara')
    ) {
      return this.handleFindAndProduceIntent(text, lower);
    }

    // 11. Intent: Daily Batch (e.g. "günlük 3 klip yap", "parti üret")
    if (lower.includes('günlük') || lower.includes('3 klip') || lower.includes('parti')) {
      return this.handleBatchIntent();
    }

    // 12. Intent: Open Agency Room
    if (lower.includes('ajans masası') || lower.includes('masayı aç') || lower.includes('ofis') || lower.includes('oda') || lower.includes('ajans')) {
      if (this.onOpenModal) this.onOpenModal('agency');
      const replyMsg: CopilotMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: '🏢 Ajans Masası sanal ofisi ekranınıza getirildi! Tüm ajanlar masada hazır bekliyor.',
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        status: 'done',
        actionTaken: 'open_agency_room',
        action: {
          label: '🏢 Ajans Masasını Gör',
          action: 'open_agency',
        },
      };
      this.emitMessage(replyMsg);
      this.emitSpeech({
        message: '🏢 Ajans masasını açtım patron! Masadaki tüm ajanlar emirlerini bekliyor.',
        mood: 'excited',
      });
      return replyMsg;
    }

    // 13. Fallback Chat / Advice via Local Ollama
    return this.handleGeneralConversation(text);
  }

  private async handleFindAndProduceIntent(text: string, lower: string): Promise<CopilotMessage> {
    // Determine target topic
    let topic = 'röportaj podcast';
    if (lower.includes('yapay zeka') || lower.includes('teknoloji')) topic = 'yapay zeka teknoloji';
    else if (lower.includes('finans') || lower.includes('para') || lower.includes('girişim')) topic = 'girişimcilik finans';
    else if (lower.includes('felsefe') || lower.includes('psikoloji')) topic = 'psikoloji felsefe';
    else if (lower.includes('bilim') || lower.includes('uzay')) topic = 'bilim uzay';
    else if (lower.includes('motivasyon')) topic = 'motivasyon başarı';
    else if (lower.includes('röportaj')) topic = 'röportaj';
    else if (lower.includes('podcast')) topic = 'podcast';

    // Parse minimum view count (default: 1,000,000 or user specified e.g. 3milyon / 3m / 500k)
    let minViews = 0;
    if (lower.includes('3m') || lower.includes('3 milyon') || lower.includes('3milyon')) {
      minViews = 3000000;
    } else if (lower.includes('1m') || lower.includes('1 milyon') || lower.includes('1milyon')) {
      minViews = 1000000;
    } else if (lower.includes('5m') || lower.includes('5 milyon') || lower.includes('5milyon')) {
      minViews = 5000000;
    } else if (lower.includes('500k') || lower.includes('500 bin')) {
      minViews = 500000;
    } else {
      const match = lower.match(/(\d+)\s*(milyon|m|bin|k)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (match[2].startsWith('m')) minViews = num * 1000000;
        else minViews = num * 1000;
      }
    }

    const minViewsLabel = minViews > 0 ? `${(minViews / 1000000).toFixed(1).replace('.0', '')}M+` : 'viral';

    this.emitSpeech({
      message: `🔍 YouTube Creative Commons radarı taranıyor: '${topic}' (${minViewsLabel} izlenme hedefli)...`,
      mood: 'working',
    });

    try {
      // 1. Search CC Videos
      const candidates = await this.autopilotService.searchCreativeCommons(topic, topic);
      if (!candidates || candidates.length === 0) {
        throw new Error(`'${topic}' konusunda uygun Creative Commons videosu bulunamadı.`);
      }

      // 2. Filter by minimum views if specified, or sort by highest virality
      let selectedCandidate: CCVideoCandidate | null = null;
      const qualified = candidates.filter((c) => (c.viewCount || 0) >= minViews);

      if (qualified.length > 0) {
        // Pick the top-viewed candidate that meets or exceeds the target
        selectedCandidate = qualified.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))[0];
      } else {
        // Fallback: pick the candidate with highest view count available
        selectedCandidate = candidates.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))[0];
      }

      const viewsFormatted = (selectedCandidate.viewCount || 0).toLocaleString('tr-TR');
      const actionText = `🎯 Bulunan Viral Aday: "${selectedCandidate.title}" (${selectedCandidate.channel}) • ${viewsFormatted} İzlenme (CC-BY).`;

      // 3. Respond to user
      const responseMsg: CopilotMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: `Emredersin patron! 🚀 ${actionText}\n\nAjans Masası'ndaki tüm ajanlar (Hunter Gemma, Cutter Qwen, Vision Kapak Uzmanı ve QA Auditor) anında harekete geçirildi. Kurgu ve paketleme başladı!`,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        status: 'acting',
        actionTaken: 'find_and_produce',
        metadata: {
          candidate: selectedCandidate,
          views: selectedCandidate.viewCount,
        },
      };
      this.emitMessage(responseMsg);

      this.emitSpeech({
        message: `🔥 Buldum! "${selectedCandidate.title.slice(0, 35)}..." (${viewsFormatted} izlenme). Ajans masası kurguya başladı!`,
        mood: 'excited',
      });

      // 4. Open Agency room if configured, so user can see live animated 2D office!
      if (this.onOpenModal) {
        setTimeout(() => this.onOpenModal!('agency'), 500);
      }

      // 5. Trigger production asynchronously in the background
      setTimeout(async () => {
        try {
          await this.autopilotService.runAutopilotCycle(selectedCandidate!);
          this.emitSpeech({
            message: `🎉 Klibin kurgusu tamamlandı patron! 9:16 altyazılı video arşive ve ana masaya eklendi!`,
            mood: 'success',
          });
        } catch (cycleErr: any) {
          console.error('[CopilotService] Cycle error:', cycleErr);
          this.emitSpeech({
            message: `⚠️ Kurgu sırasında hata: ${cycleErr.message}`,
            mood: 'alert',
          });
        }
      }, 300);

      return responseMsg;
    } catch (err: any) {
      const errorMsg: CopilotMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: `Üzgünüm patron, arama sırasında bir sorun oluştu: ${err.message}`,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        status: 'error',
      };
      this.emitMessage(errorMsg);
      this.emitSpeech({
        message: `⚠️ Hata oluştu patron: ${err.message}`,
        mood: 'alert',
      });
      return errorMsg;
    }
  }

  private async handleBatchIntent(): Promise<CopilotMessage> {
    this.emitSpeech({
      message: '⚡ Günlük 3 klip için tam otonom parti üretimi başlatılıyor...',
      mood: 'working',
    });

    const responseMsg: CopilotMessage = {
      id: `asst_${Date.now()}`,
      sender: 'assistant',
      text: '⚡ Emredersin patron! Günlük 3 altın saat (12:30, 18:30, 21:15) için farklı Creative Commons videolarından 3 klip üretimi başlatıldı. Ajans Masası devrede!',
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      status: 'acting',
      actionTaken: 'start_autopilot_batch',
    };
    this.emitMessage(responseMsg);

    // Open agency room
    if (this.onOpenModal) {
      this.onOpenModal('agency');
    }

    // Trigger batch
    setTimeout(() => {
      this.autopilotService.runAutopilotDailyBatch(3).catch((e) => {
        console.error('[CopilotService] Batch error:', e);
      });
    }, 300);

    return responseMsg;
  }

  private conversationHistory: { role: 'user' | 'assistant'; text: string }[] = [];

  private async handleGeneralConversation(userText: string): Promise<CopilotMessage> {
    try {
      // Keep last 4 turns for context
      this.conversationHistory.push({ role: 'user', text: userText });
      if (this.conversationHistory.length > 8) {
        this.conversationHistory = this.conversationHistory.slice(-8);
      }

      const historyContext = this.conversationHistory
        .slice(-5)
        .map((h) => `${h.role === 'user' ? 'Patron' : 'NOVA'}: ${h.text}`)
        .join('\n');

      const systemPrompt = `Sen AutoClip Studio AI'ın efsanevi Baş Danışmanı ve Otonom Yönetim Şefi NOVA'sın.
KİŞİLİK VE TAVIR:
- Aşırı zeki, hızlı, esprili, lafı gediğine koyan, samimi ve karizmatik bir yapay zekasın.
- Patronuna (kullanıcıya) son derece bağlısın; ona "Patron", "Şefim" veya "Kaptan" diye hitap edersin.
- Patron seninle şakalaşırsa, takılırsa veya havadan sudan konuşursa esprili, zekice ve eğlenceli cevap ver.
- YouTube Shorts, TikTok ve Reels algoritmalarını, viral kanca formüllerini ve video kurgu sanatını avucunun içi gibi bilirsin.
- Cevapların sesli olarak okunacaktır! Bu nedenle doğrudan konuşma dilinde, doğal, akıcı, samimi ve en fazla 2-3 cümlelik vurucu cümleler kur. Tablo, karmaşık parantezler ve markdown işaretleri kullanma.`;

      const promptWithHistory = `Geçmiş Sohbet:
${historyContext}

Patronun Son Mesajı: "${userText}"
NOVA (Akıcı, esprili ve zeki Türkçe yanıt ver):`;

      const response = await this.llmService.queryOllama({
        model: 'qwen3:8b',
        systemPrompt,
        prompt: promptWithHistory,
      });

      const cleanResponse = (response || 'Emrindeyim patron! Ne zaman istersen viral bir fikir patlatabiliriz.')
        .replace(/^[NOVA:]+/i, '')
        .trim();

      this.conversationHistory.push({ role: 'assistant', text: cleanResponse });

      const replyMsg: CopilotMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: cleanResponse,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        status: 'done',
      };
      this.emitMessage(replyMsg);
      this.emitSpeech({
        message: cleanResponse,
        mood: 'excited',
      });
      return replyMsg;
    } catch {
      const fallback: CopilotMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: 'Buradayım patron! Sen iste, ajans masasını ayağına getireyim ya da YouTube\'u tarayıp milyonluk videoyu kapıp geleyim!',
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        status: 'done',
      };
      this.emitMessage(fallback);
      this.emitSpeech({
        message: fallback.text,
        mood: 'idle',
      });
      return fallback;
    }
  }
}

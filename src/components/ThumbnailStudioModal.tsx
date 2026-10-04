import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Sliders,
  Type,
  Image as ImageIcon,
  Save,
  Download,
  Flame,
  Zap,
  Crown,
  AlertTriangle,
  RefreshCw,
  Clock,
  Eye,
  Check
} from 'lucide-react';
import { ViralClip } from '../types';

interface ThumbnailStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  clip: ViralClip;
  videoPath?: string;
  onUpdateClipThumbnail?: (clipId: number, newThumbnailPath: string) => void;
}

const BADGE_PRESETS = [
  { id: 'viral', label: '🔥 VİRAL KANCA', color: 'from-amber-500 to-rose-500' },
  { id: 'shock', label: '😱 ŞOK İDDİA!', color: 'from-rose-600 to-red-600' },
  { id: 'warning', label: '⚡ DİKKAT!', color: 'from-amber-400 to-orange-500' },
  { id: 'elite', label: '👑 AURA ÖZEL', color: 'from-brand-purple to-brand-cyan' },
  { id: 'none', label: 'Yok', color: 'from-slate-700 to-slate-800' },
];

const STYLE_PRESETS = [
  { id: 'yellow', name: 'Sarı & Siyah (Shorts/TikTok)', textColor: '#FFE600', strokeColor: '#000000', glowColor: '#FFA500' },
  { id: 'red', name: 'Neon Kırmızı (Şok & Acil)', textColor: '#FF2A55', strokeColor: '#000000', glowColor: '#FF0033' },
  { id: 'white', name: 'Kristal Beyaz & Mor (Aura)', textColor: '#FFFFFF', strokeColor: '#1E1B4B', glowColor: '#8B5CF6' },
  { id: 'green', name: 'Neon Yeşil (Finans & Başarı)', textColor: '#00FF88', strokeColor: '#003311', glowColor: '#00CC66' },
];

export const ThumbnailStudioModal: React.FC<ThumbnailStudioModalProps> = ({
  isOpen,
  onClose,
  clip,
  videoPath,
  onUpdateClipThumbnail,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initial values
  const defaultSecond = clip.thumbnailSecond || Math.round(clip.start_seconds + 3);
  const [selectedSecond, setSelectedSecond] = useState<number>(defaultSecond);
  const [headlineText, setHeadlineText] = useState<string>(() => {
    const raw = clip.hook_sentence ? clip.hook_sentence.replace(/^[“"”\s]+|[“"”\s]+$/g, '').trim() : '';
    if (raw && raw.length > 3 && raw !== '""') return raw;
    return clip.title || 'VİRAL KANCA BAŞLIĞI';
  });
  const [selectedBadge, setSelectedBadge] = useState<string>('viral');
  const [selectedStyle, setSelectedStyle] = useState<string>('yellow');
  const [currentFrameUrl, setCurrentFrameUrl] = useState<string>('');
  const [isExtractingFrame, setIsExtractingFrame] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Set initial frame from existing thumbnailPath or extract
  useEffect(() => {
    if (clip.thumbnailPath) {
      setCurrentFrameUrl(`http://127.0.0.1:39821/stream?path=${encodeURIComponent(clip.thumbnailPath)}`);
    } else if (videoPath) {
      handleExtractFrameAt(defaultSecond);
    }
  }, [clip.thumbnailPath, videoPath]);

  // Extract a new frame at target second
  const handleExtractFrameAt = async (sec: number) => {
    if (!videoPath || !window.electronAPI?.extractFrame) return;
    setIsExtractingFrame(true);
    setSelectedSecond(sec);
    try {
      const tempPath = clip.thumbnailPath
        ? clip.thumbnailPath.replace(/\.jpg$/i, `_sec${sec}.jpg`)
        : `C:/Users/kabad/AppData/Local/Temp/clip_${clip.clip_id}_sec${sec}.jpg`;

      const resultPath = await window.electronAPI.extractFrame({
        videoPath,
        second: sec,
        outputPath: tempPath,
      });

      if (resultPath) {
        setCurrentFrameUrl(`http://127.0.0.1:39821/stream?path=${encodeURIComponent(resultPath)}&t=${Date.now()}`);
      }
    } catch (err) {
      console.error('Frame extraction error:', err);
    } finally {
      setIsExtractingFrame(false);
    }
  };

  // Re-render canvas whenever controls change
  useEffect(() => {
    if (!currentFrameUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = currentFrameUrl;

    img.onload = () => {
      // Set vertical 9:16 target canvas dimensions (1080 x 1920)
      canvas.width = 1080;
      canvas.height = 1920;

      // Draw background image scaled to fill 9:16
      const hRatio = canvas.width / img.width;
      const vRatio = canvas.height / img.height;
      const ratio = Math.max(hRatio, vRatio);
      const centerShiftX = (canvas.width - img.width * ratio) / 2;
      const centerShiftY = (canvas.height - img.height * ratio) / 2;

      // 1. Draw base frame
      ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);

      // 2. High-contrast top & bottom dark vignettes
      const topGrad = ctx.createLinearGradient(0, 0, 0, 700);
      topGrad.addColorStop(0, 'rgba(0,0,0,0.85)');
      topGrad.addColorStop(0.5, 'rgba(0,0,0,0.5)');
      topGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, canvas.width, 700);

      const bottomGrad = ctx.createLinearGradient(0, canvas.height - 500, 0, canvas.height);
      bottomGrad.addColorStop(0, 'rgba(0,0,0,0)');
      bottomGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = bottomGrad;
      ctx.fillRect(0, canvas.height - 500, canvas.width, 500);

      // 3. Draw Badge Sticker
      const badge = BADGE_PRESETS.find((b) => b.id === selectedBadge);
      if (badge && badge.id !== 'none') {
        ctx.save();
        const badgeY = 180;
        const badgeText = badge.label;
        ctx.font = '900 36px Montserrat, system-ui, sans-serif';
        const textWidth = ctx.measureText(badgeText).width;
        const badgePaddingX = 40;
        const badgeWidth = textWidth + badgePaddingX * 2;
        const badgeHeight = 64;
        const badgeX = (canvas.width - badgeWidth) / 2;

        // Rounded badge box
        ctx.fillStyle = badge.id === 'viral' ? '#F59E0B' : badge.id === 'shock' ? '#E11D48' : '#8B5CF6';
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 32);
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, canvas.width / 2, badgeY + badgeHeight / 2);
        ctx.restore();
      }

      // 4. Draw Viral Headline Text Banner
      if (headlineText.trim()) {
        const style = STYLE_PRESETS.find((s) => s.id === selectedStyle) || STYLE_PRESETS[0];
        ctx.save();

        ctx.font = '900 82px Montserrat, Impact, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Word wrap headline text into 2-3 lines max
        const words = headlineText.trim().split(/\s+/);
        const lines: string[] = [];
        let curLine = '';

        for (const w of words) {
          const testLine = curLine ? `${curLine} ${w}` : w;
          if (ctx.measureText(testLine).width > 940) {
            if (curLine) lines.push(curLine);
            curLine = w;
          } else {
            curLine = testLine;
          }
        }
        if (curLine) lines.push(curLine);

        const startY = selectedBadge !== 'none' ? 320 : 260;
        const lineHeight = 105;

        lines.slice(0, 3).forEach((line, idx) => {
          const y = startY + idx * lineHeight;

          // Thick black outline / stroke
          ctx.strokeStyle = style.strokeColor;
          ctx.lineWidth = 16;
          ctx.lineJoin = 'round';
          ctx.miterLimit = 2;
          ctx.strokeText(line, canvas.width / 2, y);

          // Deep drop shadow
          ctx.shadowColor = 'rgba(0,0,0,0.9)';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetX = 4;
          ctx.shadowOffsetY = 6;

          // Main text fill
          ctx.fillStyle = style.textColor;
          ctx.fillText(line, canvas.width / 2, y);
        });

        ctx.restore();
      }

      // 5. Bottom Aura Branding Watermark
      ctx.save();
      ctx.font = '800 28px Montserrat, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ AURA STUDIO AI • VIRAL SHORTS', canvas.width / 2, canvas.height - 80);
      ctx.restore();
    };
  }, [currentFrameUrl, headlineText, selectedBadge, selectedStyle]);

  if (!isOpen) return null;

  // Save composite thumbnail to disk
  const handleSaveAndApply = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !window.electronAPI?.saveThumbnailBase64) return;

    setIsSaving(true);
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const targetPath = clip.thumbnailPath || `Agency_Thumbnails/clip_${clip.clip_id}_aura_cover.jpg`;

      const res = await window.electronAPI.saveThumbnailBase64({
        outputPath: targetPath,
        base64Data: dataUrl,
      });

      if (res?.success) {
        if (onUpdateClipThumbnail) {
          onUpdateClipThumbnail(clip.clip_id, targetPath);
        }
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 800);
      }
    } catch (e) {
      console.error('Kapak kaydetme hatası:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Instant PNG Download
  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `aura_thumbnail_clip_${clip.clip_id}.jpg`;
    a.href = canvas.toDataURL('image/jpeg', 0.95);
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-[#0b0c16] border border-dark-700 w-full max-w-4xl h-[700px] rounded-3xl shadow-2xl shadow-brand-purple/20 flex flex-col overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="h-16 px-6 border-b border-dark-750 flex items-center justify-between bg-dark-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-brand-purple to-brand-cyan flex items-center justify-center shadow-lg shadow-brand-purple/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>AURA AI Kapak Stüdyosu</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  CTR %98+ Optimize
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Klibiniz için anında dikkat çeken, yüksek tıklanma oranlı TikTok ve Shorts kapak görseli tasarlayın
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Split: Left Canvas Preview, Right Studio Controls) */}
        <div className="flex-1 flex overflow-hidden p-6 gap-6">
          
          {/* Left: 9:16 Live Canvas Preview */}
          <div className="w-[300px] shrink-0 flex flex-col items-center justify-center bg-black rounded-2xl border border-dark-750 p-3 shadow-inner relative group">
            <div className="w-full aspect-[9/16] rounded-xl overflow-hidden bg-[#070814] relative flex items-center justify-center border border-dark-800 shadow-2xl">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
              />
              {isExtractingFrame && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 text-brand-cyan animate-spin" />
                  <span className="text-xs text-white font-bold">Kare Çıkarılıyor...</span>
                </div>
              )}
            </div>

            <span className="text-[10px] text-slate-500 mt-2 font-mono">
              9:16 Dikey Format (1080x1920) • Canlı Önizleme
            </span>
          </div>

          {/* Right: Studio Customization Panel */}
          <div className="flex-1 overflow-y-auto space-y-5 pr-1 custom-scrollbar">
            
            {/* 1. Kare Seçici (Keyframe Timeline) */}
            <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 space-y-3">
              <label className="text-xs font-bold text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-brand-cyan" />
                  Video Karesi Seçimi
                </span>
                <span className="text-[11px] font-mono text-amber-300">
                  {selectedSecond}. saniye
                </span>
              </label>

              {/* Time Presets */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '00:02 (Giriş)', sec: Math.round(clip.start_seconds + 2) },
                  { label: '00:10 (Zirve)', sec: Math.round(clip.start_seconds + Math.min(10, clip.duration_seconds * 0.35)) },
                  { label: 'Orta Sahne', sec: Math.round(clip.start_seconds + clip.duration_seconds * 0.55) },
                  { label: 'Final Anı', sec: Math.round(clip.end_seconds - 3) },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handleExtractFrameAt(preset.sec)}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all truncate ${
                      selectedSecond === preset.sec
                        ? 'bg-brand-purple/20 border-brand-purple text-brand-purple font-bold'
                        : 'bg-dark-850 border-dark-750 text-slate-300 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Slider across clip span */}
              <div className="space-y-1 pt-1">
                <input
                  type="range"
                  min={clip.start_seconds}
                  max={clip.end_seconds}
                  value={selectedSecond}
                  onChange={(e) => setSelectedSecond(Number(e.target.value))}
                  onMouseUp={() => handleExtractFrameAt(selectedSecond)}
                  className="w-full accent-brand-purple cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Başlangıç ({clip.start_seconds}s)</span>
                  <span>Bitiş ({clip.end_seconds}s)</span>
                </div>
              </div>
            </div>

            {/* 2. Kapak Kanca Metni */}
            <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 space-y-2">
              <label className="text-xs font-bold text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Type className="w-4 h-4 text-amber-400" />
                  Kapak Üzeri Kanca Metni
                </span>
                <span className="text-[10px] text-slate-400">
                  {headlineText.length}/80 karakter
                </span>
              </label>

              <textarea
                rows={2}
                value={headlineText}
                onChange={(e) => setHeadlineText(e.target.value)}
                placeholder="Örn: BEKLEMEDİĞİNİZ SON! ŞEHİR HALİNE GELDİ"
                className="w-full bg-dark-850 border border-dark-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-brand-purple font-semibold uppercase"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setHeadlineText(clip.title.toUpperCase())}
                  className="text-[10px] text-brand-cyan hover:underline"
                >
                  Başlığı Kullan
                </button>
                <span className="text-slate-600">•</span>
                <button
                  onClick={() => setHeadlineText(clip.hook_sentence ? clip.hook_sentence.toUpperCase() : clip.title.toUpperCase())}
                  className="text-[10px] text-amber-300 hover:underline"
                >
                  İlk Kancayı Kullan
                </button>
              </div>
            </div>

            {/* 3. Renk & Tipografi Stili */}
            <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 space-y-3">
              <label className="text-xs font-bold text-white block">
                Metin Renk & Kontrast Stili
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STYLE_PRESETS.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-2 rounded-xl border text-left flex items-center space-x-2 transition-all ${
                      selectedStyle === style.id
                        ? 'bg-brand-purple/20 border-brand-purple text-white shadow-sm'
                        : 'bg-dark-850 border-dark-750 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-black shadow-inner shrink-0"
                      style={{ backgroundColor: style.textColor }}
                    />
                    <span className="text-[11px] font-semibold truncate">{style.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Viral Rozetler */}
            <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 space-y-3">
              <label className="text-xs font-bold text-white block">
                Viral Dikkat Rozeti (Sticker)
              </label>
              <div className="flex flex-wrap gap-2">
                {BADGE_PRESETS.map((badge) => (
                  <button
                    key={badge.id}
                    onClick={() => setSelectedBadge(badge.id)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                      selectedBadge === badge.id
                        ? 'bg-gradient-to-r ' + badge.color + ' text-white shadow-md'
                        : 'bg-dark-850 border-dark-750 text-slate-400 hover:text-white'
                    }`}
                  >
                    {badge.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="h-16 px-6 border-t border-dark-750 bg-dark-900/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white text-xs font-bold transition-colors"
          >
            Vazgeç
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownloadImage}
              className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-200 hover:text-white text-xs font-bold transition-colors flex items-center space-x-1.5 border border-dark-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>İndir (JPG)</span>
            </button>

            {saveSuccess && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-fadeIn">
                <Check className="w-4 h-4" />
                Kapak Klibe Atandı!
              </span>
            )}

            <button
              onClick={handleSaveAndApply}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-brand-purple to-brand-cyan hover:from-amber-600 hover:to-cyan-600 text-white text-xs font-bold transition-all shadow-lg shadow-brand-purple/20 flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Kaydediliyor...' : 'Kapağı Kaydet & Klibe Uygula'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

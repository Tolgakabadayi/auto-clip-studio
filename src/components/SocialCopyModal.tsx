import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Share2,
  Tag,
  FileText,
  Flame,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { ViralClip, SocialCopyMetadata, PipelineOptions } from '../types';

interface SocialCopyModalProps {
  clip: ViralClip | null;
  onClose: () => void;
  options: PipelineOptions;
  onUpdateClipSocialMetadata?: (clipId: number, metadata: SocialCopyMetadata, newTitle?: string) => void;
}

export const SocialCopyModal: React.FC<SocialCopyModalProps> = ({
  clip,
  onClose,
  options,
  onUpdateClipSocialMetadata,
}) => {
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<SocialCopyMetadata | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [appliedTitleKey, setAppliedTitleKey] = useState<string | null>(null);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState(0);

  const fetchCopy = async (forceRefresh = false) => {
    if (!clip || !window.electronAPI) return;

    if (!forceRefresh && clip.socialMetadata) {
      setMetadata(clip.socialMetadata);
      return;
    }

    setLoading(true);
    try {
      const res: SocialCopyMetadata = await window.electronAPI.generateSocialCopy(clip, options);
      setMetadata(res);
      if (onUpdateClipSocialMetadata) {
        const topTitle = (res.titles && res.titles[0]) ? res.titles[0] : undefined;
        onUpdateClipSocialMetadata(clip.clip_id, res, topTitle);
      }
    } catch (err: any) {
      console.error('Failed to generate social copy:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clip) {
      fetchCopy();
    }
  }, [clip?.clip_id]);

  if (!clip) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const getFullBundleText = () => {
    if (!metadata) return '';
    const activeTitle = metadata.titles[selectedTitleIndex] || metadata.titles[0] || clip.title;
    const hashtagStr = metadata.hashtags.join(' ');
    return `${activeTitle}\n\n${metadata.description}\n\n${metadata.callToAction}\n\n${hashtagStr}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-dark-900 border border-dark-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="p-4 border-b border-dark-750 bg-dark-850 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-purple to-pink-500 flex items-center justify-center text-white shadow-md shadow-brand-purple/20">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Sosyal Medya İçerik Asistanı</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-purple/20 text-brand-purple border border-brand-purple/30 font-medium">
                  Viral AI
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 truncate max-w-md">
                Klip #{clip.clip_id}: {clip.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-dark-750 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <div className="relative">
                <Loader2 className="w-10 h-10 text-brand-purple animate-spin" />
                <Sparkles className="w-4 h-4 text-brand-cyan absolute top-1 right-1 animate-pulse" />
              </div>
              <p className="text-sm font-bold text-slate-200">Viral Metinler & Hashtag'ler Üretiliyor...</p>
              <p className="text-xs text-slate-400 max-w-xs">
                Yapay zeka transkripti analiz ederek yüksek tıklama oranlı başlıklar ve trend etiketler hazırlıyor.
              </p>
            </div>
          ) : metadata ? (
            <>
              {/* Quick All-In-One Copy Button */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-brand-purple/15 to-pink-500/10 border border-brand-purple/30 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tek Tıkla Sosyal Medya Şablonu</span>
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Seçilen başlık, açıklama ve hashtag'leri tek seferde panoya kopyalayın.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(getFullBundleText(), 'bundle')}
                  className="py-2 px-3.5 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-brand-purple/20 transition-all hover:scale-105 active:scale-95 shrink-0"
                >
                  {copiedKey === 'bundle' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Kopyalandı!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Tümünü Kopyala</span>
                    </>
                  )}
                </button>
              </div>

              {/* 1. SECTION: High-CTR Titles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
                    <span>3 Alternatif Viral Başlık (High-CTR Hooks)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Tıklama odaklı kancalar</span>
                </div>

                <div className="space-y-2">
                  {metadata.titles.map((title, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedTitleIndex(idx)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between space-x-3 ${
                        selectedTitleIndex === idx
                          ? 'bg-dark-850 border-brand-purple ring-1 ring-brand-purple/60 shadow-sm'
                          : 'bg-dark-850/60 border-dark-750 hover:border-dark-600'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 overflow-hidden flex-1">
                        <span
                          className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                            selectedTitleIndex === idx
                              ? 'bg-brand-purple text-white'
                              : 'bg-dark-750 text-slate-400'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <p className="text-xs font-semibold text-slate-200 truncate" title={title}>
                          {title}
                        </p>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTitleIndex(idx);
                            if (clip && metadata && onUpdateClipSocialMetadata) {
                              onUpdateClipSocialMetadata(clip.clip_id, metadata, title);
                              setAppliedTitleKey(`title-${idx}`);
                              setTimeout(() => setAppliedTitleKey(null), 2000);
                            }
                          }}
                          className={`py-1 px-2 rounded-lg border text-[11px] font-bold transition-all flex items-center space-x-1 ${
                            appliedTitleKey === `title-${idx}`
                              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                              : 'bg-brand-purple/20 hover:bg-brand-purple/40 border-brand-purple/40 text-brand-purple hover:text-white'
                          }`}
                          title="Bu başlığı klibin asıl başlığı olarak kaydet"
                        >
                          <Check className="w-3 h-3" />
                          <span>{appliedTitleKey === `title-${idx}` ? 'Kayıt Edildi!' : 'Klibe Ata'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(title, `title-${idx}`);
                          }}
                          className="py-1 px-2.5 rounded-lg bg-dark-900 hover:bg-dark-800 border border-dark-700 text-[11px] font-medium text-slate-300 hover:text-white transition-colors flex items-center space-x-1 shrink-0"
                        >
                          {copiedKey === `title-${idx}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Kopyalandı</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-400" />
                              <span>Kopyala</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. SECTION: Video Description & CTA */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-brand-purple" />
                    <span>Sosyal Medya Açıklaması & Çağrı (CTA)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        `${metadata.description}\n\n${metadata.callToAction}`,
                        'desc'
                      )
                    }
                    className="text-[11px] text-brand-cyan hover:underline font-semibold flex items-center space-x-1"
                  >
                    {copiedKey === 'desc' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Kopyalandı!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Açıklamayı Kopyala</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-850 border border-dark-750 text-xs text-slate-200 leading-relaxed space-y-2">
                  <p>{metadata.description}</p>
                  <p className="text-brand-cyan font-medium flex items-center space-x-1">
                    <MessageSquare className="w-3 h-3 inline mr-1 text-brand-cyan" />
                    {metadata.callToAction}
                  </p>
                </div>
              </div>

              {/* 3. SECTION: Trending Hashtags */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                    <Tag className="w-3.5 h-3.5 text-pink-400" />
                    <span>Viral & Algoritma Hashtag'leri ({metadata.hashtags.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopy(metadata.hashtags.join(' '), 'hashtags')}
                    className="text-[11px] text-pink-400 hover:underline font-semibold flex items-center space-x-1"
                  >
                    {copiedKey === 'hashtags' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Kopyalandı!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Tüm Etiketleri Kopyala</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-dark-850 border border-dark-750">
                  {metadata.hashtags.map((tag, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleCopy(tag, `tag-${i}`)}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-dark-900 hover:bg-dark-800 text-slate-300 hover:text-white border border-dark-700 transition-all flex items-center space-x-1"
                      title="Kopyalamak için tıklayın"
                    >
                      <span>{tag}</span>
                      {copiedKey === `tag-${i}` && (
                        <Check className="w-3 h-3 text-emerald-400 ml-1" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <p>Metinler henüz oluşturulmadı.</p>
              <button
                type="button"
                onClick={() => fetchCopy(true)}
                className="py-2 px-4 rounded-xl bg-brand-purple text-white text-xs font-bold inline-flex items-center space-x-1.5 shadow"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Metinleri Üret</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="p-4 border-t border-dark-750 bg-dark-850 flex items-center justify-between">
          <button
            type="button"
            onClick={() => fetchCopy(true)}
            disabled={loading}
            className="py-2 px-3.5 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-700 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center space-x-1.5 disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Yeniden Üret</span>
          </button>

          <div className="flex items-center space-x-2">
            {metadata && (
              <button
                type="button"
                onClick={() => {
                  const chosen = metadata.titles[selectedTitleIndex] || metadata.titles[0];
                  if (clip && chosen && onUpdateClipSocialMetadata) {
                    onUpdateClipSocialMetadata(clip.clip_id, metadata, chosen);
                    setAppliedTitleKey(`title-${selectedTitleIndex}`);
                    setTimeout(() => setAppliedTitleKey(null), 2000);
                  }
                }}
                className="py-2 px-4 rounded-xl bg-gradient-to-r from-brand-purple to-pink-600 hover:from-brand-purple/90 hover:to-pink-500 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md shadow-brand-purple/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {appliedTitleKey ? '✓ Başlık Klibe Kaydedildi!' : 'Seçili Başlığı Klibe Kaydet'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="py-2 px-5 rounded-xl bg-dark-750 hover:bg-dark-700 text-xs font-bold text-slate-200 hover:text-white transition-all"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

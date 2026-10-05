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
  Loader2,
  Upload,
  ExternalLink,
  Lock,
  Globe,
  Eye,
  AlertCircle,
  CheckCircle2,
  Film
} from 'lucide-react';
import { YoutubeIcon as Youtube } from './icons/YoutubeIcon';
import {
  ViralClip,
  SocialCopyMetadata,
  PipelineOptions,
  YouTubeAuthStatus,
  YouTubeUploadResult
} from '../types';

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
  const [activeTab, setActiveTab] = useState<'copy' | 'youtube'>('copy');
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<SocialCopyMetadata | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [appliedTitleKey, setAppliedTitleKey] = useState<string | null>(null);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState(0);

  // YouTube State
  const [ytStatus, setYtStatus] = useState<YouTubeAuthStatus | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; uploaded?: number; total?: number } | null>(null);
  const [uploadResult, setUploadResult] = useState<YouTubeUploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [privacyStatus, setPrivacyStatus] = useState<'public' | 'unlisted' | 'private'>('unlisted');
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [isAlreadyUploaded, setIsAlreadyUploaded] = useState<boolean>(!!clip?.isUploaded);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(
    clip?.youtubeUrl || (clip?.youtubeVideoId ? `https://youtube.com/shorts/${clip.youtubeVideoId}` : null)
  );

  // Check upload registry on mount
  useEffect(() => {
    if (clip?.isUploaded) {
      setIsAlreadyUploaded(true);
      if (clip.youtubeUrl) setUploadedUrl(clip.youtubeUrl);
      return;
    }
    if (window.electronAPI?.uploadRegistryIsUploaded && clip && clip.outputPath) {
      window.electronAPI
        .uploadRegistryIsUploaded({
          filePath: clip.outputPath,
        })
        .then((uploaded: boolean) => {
          if (uploaded) setIsAlreadyUploaded(true);
        })
        .catch(console.warn);
    }
  }, [clip]);

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

  // YouTube auth status & upload progress listeners
  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.youtubeGetAuthStatus?.().then((st: YouTubeAuthStatus) => {
      setYtStatus(st);
    }).catch((err: any) => {
      console.warn('Could not fetch YouTube auth status:', err);
    });

    const unregAuth = window.electronAPI.onYouTubeAuthUpdated?.((st: YouTubeAuthStatus) => {
      setYtStatus(st);
    });

    const unregProgress = window.electronAPI.onYouTubeUploadProgress?.((prog: any) => {
      setUploadProgress(prog);
    });

    return () => {
      if (unregAuth) unregAuth();
      if (unregProgress) unregProgress();
    };
  }, []);

  // Sync custom inputs when metadata or selected title index changes
  useEffect(() => {
    if (metadata && metadata.titles && metadata.titles.length > 0) {
      const chosen = metadata.titles[selectedTitleIndex] || metadata.titles[0];
      setCustomTitle(chosen.includes('#Shorts') ? chosen : `${chosen} #Shorts`);
      const cleanDesc = (metadata.description || '')
        .replace(/https?:\/\/[^\s]+/gi, '')
        .replace(/⚡\s*Bu video AutoClip[^\n]*/gi, '')
        .replace(/🚀\s*Proje & Kaynak Kod:[^\n]*/gi, '')
        .replace(/#AutoClipAI/gi, '#Keşfet')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      const tags = (metadata.hashtags || []).filter((h: string) => !/autoclip|autocut/i.test(h));
      const hasShorts = tags.some((t: string) => t.toLowerCase() === '#shorts');
      const tagStr = hasShorts ? tags.join(' ') : `${tags.join(' ')} #Shorts`;
      setCustomDescription(
        `${cleanDesc}\n\n${metadata.callToAction || ''}\n\n${tagStr}`.trim()
      );
    } else if (clip) {
      setCustomTitle(clip.title.includes('#Shorts') ? clip.title : `${clip.title} #Shorts`);
    }
  }, [metadata, selectedTitleIndex, clip]);

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

  const handleYouTubeLogin = async () => {
    if (!window.electronAPI) return;
    setIsLoggingIn(true);
    try {
      await window.electronAPI.youtubeLogin();
      const st = await window.electronAPI.youtubeGetAuthStatus();
      setYtStatus(st);
    } catch (err: any) {
      console.error('YouTube login error:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleUploadToYouTube = async () => {
    if (!clip || !clip.outputPath || !window.electronAPI) return;

    if (isAlreadyUploaded) {
      const confirmUpload = window.confirm(
        `ℹ️ BİLGİ: Bu video dosyası daha önce YouTube'a yüklenmiş olarak kayıtlı.\n\nKanalınıza tekrar yüklemek istiyor musunuz?`
      );
      if (!confirmUpload) return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadResult(null);
    setUploadProgress({ percent: 0 });

    try {
      const payloadTitle = customTitle.trim() || clip.title;
      const payloadDesc = customDescription.trim() || metadata?.description || '';
      const payloadTags = metadata?.hashtags && metadata.hashtags.length > 0 ? metadata.hashtags : clip.keywords;

      const res: YouTubeUploadResult = await window.electronAPI.youtubeUploadVideo({
        filePath: clip.outputPath,
        title: payloadTitle,
        description: payloadDesc,
        tags: payloadTags,
        privacyStatus,
        isShort: true,
        thumbnailPath: clip.thumbnailPath,
      });

      setUploadResult(res);
      setIsAlreadyUploaded(true);
      if (res.videoUrl) setUploadedUrl(res.videoUrl);

      if (onUpdateClipSocialMetadata) {
        onUpdateClipSocialMetadata(clip.clip_id, metadata, payloadTitle);
      }
    } catch (err: any) {
      console.error('YouTube upload error:', err);
      setUploadError(err.message || 'YouTube yüklemesi sırasında beklenmeyen bir hata oluştu.');
    } finally {
      setIsUploading(false);
    }
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
                <span>Sosyal Medya & YouTube Yayın Asistanı</span>
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

        {/* Tab Navigation Switcher */}
        <div className="flex items-center px-4 bg-dark-950/70 border-b border-dark-750 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('copy')}
            className={`flex items-center space-x-2 px-3.5 py-2 border-b-2 font-bold text-xs transition-all ${
              activeTab === 'copy'
                ? 'border-brand-purple text-white bg-brand-purple/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
            <span>Viral Metinler & Etiketler</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('youtube')}
            className={`flex items-center space-x-2 px-3.5 py-2 border-b-2 font-bold text-xs transition-all ${
              activeTab === 'youtube'
                ? 'border-rose-500 text-white bg-rose-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Youtube className="w-4 h-4 text-rose-500" />
            <span>YouTube Shorts Yayınla</span>
            {ytStatus?.isAuthenticated ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" title="Kanal Bağlı" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-500 ml-0.5" />
            )}
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'copy' ? (
            /* TAB 1: VIRAL COPY & HASHTAGS */
            loading ? (
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
            )
          ) : (
            /* TAB 2: YOUTUBE SHORTS PUBLISHING INTERFACE */
            <div className="space-y-4">
              {/* Already Uploaded Notification Banner */}
              {isAlreadyUploaded && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-emerald-300">Bu klip YouTube'a yüklendi</span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-[10px] text-emerald-300 font-mono">
                          Yayında
                        </span>
                      </div>
                      {clip.uploadedAt && (
                        <p className="text-[11px] text-slate-400 truncate">
                          Yayınlanma: {new Date(clip.uploadedAt).toLocaleString('tr-TR')}
                        </p>
                      )}
                    </div>
                  </div>

                  {(uploadedUrl || clip.youtubeUrl || clip.youtubeVideoId) && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetUrl = uploadedUrl || clip.youtubeUrl || `https://youtube.com/shorts/${clip.youtubeVideoId}`;
                        if (window.electronAPI?.openPath) {
                          window.electronAPI.openPath(targetUrl);
                        } else {
                          window.open(targetUrl, '_blank');
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shrink-0 transition-all shadow-sm"
                    >
                      <span>Shorts'u Aç</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Channel Authorization Status Card */}
              {ytStatus?.isAuthenticated && ytStatus.channel ? (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/30 to-dark-850 border border-rose-500/30 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {ytStatus.channel.avatarUrl ? (
                      <img
                        src={ytStatus.channel.avatarUrl}
                        alt="Channel Avatar"
                        className="w-11 h-11 rounded-full border-2 border-rose-500/50 shadow"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-rose-600 flex items-center justify-center text-white font-bold">
                        <Youtube className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-white">{ytStatus.channel.title}</h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Bağlı</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {ytStatus.channel.subscriberCount
                          ? `${Number(ytStatus.channel.subscriberCount).toLocaleString()} Abone`
                          : 'YouTube Kanalı'}
                        {ytStatus.channel.customUrl ? ` • ${ytStatus.channel.customUrl}` : ''}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono bg-dark-900/80 px-2.5 py-1 rounded-lg border border-dark-700">
                    mozart-456719
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-dark-850 to-rose-950/20 border border-rose-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                        <Youtube className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">YouTube Kanalı Bağlı Değil</h4>
                        <p className="text-[11px] text-slate-400">
                          Shorts videolarınızı tek tıkla yüklemek için Google ile oturum açın.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleYouTubeLogin}
                      disabled={isLoggingIn}
                      className="py-2 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-rose-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                      {isLoggingIn ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Bağlanıyor...</span>
                        </>
                      ) : (
                        <>
                          <Youtube className="w-3.5 h-3.5" />
                          <span>Google ile Giriş Yap</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Video Output Status Check */}
              {!clip.outputPath ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center space-x-2.5 text-amber-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Bu klip henüz diske render edilmemiş. YouTube'a yüklemeden önce ana stüdyoda videoyu oluşturun.
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-dark-850 border border-dark-750 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 text-slate-300 truncate max-w-md">
                      <Film className="w-4 h-4 text-brand-cyan shrink-0" />
                      <span className="truncate font-mono text-[11px]">{clip.outputPath}</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 shrink-0">
                      MP4 Hazır
                    </span>
                  </div>

                  {clip.thumbnailPath && (
                    <div className="p-2.5 rounded-xl bg-dark-850 border border-brand-purple/40 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2.5 overflow-hidden">
                        <img
                          src={`http://127.0.0.1:39821/stream?path=${encodeURIComponent(clip.thumbnailPath)}`}
                          alt="Thumbnail"
                          className="w-12 h-12 rounded-lg object-cover border border-dark-700 shrink-0 shadow"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                        <div className="truncate">
                          <span className="text-[11px] font-bold text-brand-purple flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>Özel Kapak Resmi Bağlandı</span>
                          </span>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            Video yüklenirken YouTube Shorts'a otomatik eklenecektir.
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-brand-cyan bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20 shrink-0">
                        Thumbnail Aktif
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Upload Configuration Form */}
              <div className="space-y-3">
                {/* Title Input */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                      <span>YouTube Shorts Başlığı</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        (#Shorts etiketi otomatik eklenir)
                      </span>
                    </label>
                    <span
                      className={`text-[10px] font-mono ${
                        customTitle.length > 100 ? 'text-rose-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {customTitle.length}/100
                    </span>
                  </div>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    maxLength={100}
                    placeholder="Shorts başlığı..."
                    className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>

                {/* Description Textarea */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">Açıklama & Etiketler</label>
                    <span className="text-[10px] text-slate-400 font-mono">{customDescription.length} karakter</span>
                  </div>
                  <textarea
                    rows={4}
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="Açıklama metni..."
                    className="w-full bg-dark-850 border border-dark-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition-colors leading-relaxed"
                  />
                </div>

                {/* Privacy Setting Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-brand-purple" />
                    <span>Gizlilik Durumu</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPrivacyStatus('unlisted')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition-all ${
                        privacyStatus === 'unlisted'
                          ? 'bg-rose-950/40 border-rose-500 text-white shadow-sm'
                          : 'bg-dark-850 border-dark-750 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>Liste Dışı (Tavsiye)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPrivacyStatus('public')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition-all ${
                        privacyStatus === 'public'
                          ? 'bg-rose-950/40 border-rose-500 text-white shadow-sm'
                          : 'bg-dark-850 border-dark-750 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Herkese Açık</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPrivacyStatus('private')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition-all ${
                        privacyStatus === 'private'
                          ? 'bg-rose-950/40 border-rose-500 text-white shadow-sm'
                          : 'bg-dark-850 border-dark-750 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Gizli</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Uploading Progress Indicator */}
              {isUploading && (
                <div className="p-4 rounded-2xl bg-dark-850 border border-rose-500/40 space-y-2.5 animate-pulse">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 text-rose-500 animate-spin" />
                      <span>YouTube Sunucularına Aktarılıyor...</span>
                    </span>
                    <span className="font-mono text-rose-400 font-bold">
                      %{uploadProgress?.percent || 0}
                    </span>
                  </div>

                  <div className="w-full bg-dark-900 rounded-full h-2.5 overflow-hidden border border-dark-750">
                    <div
                      className="bg-gradient-to-r from-rose-500 to-pink-500 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress?.percent || 0}%` }}
                    />
                  </div>

                  {uploadProgress?.total && uploadProgress.total > 0 && (
                    <p className="text-[11px] text-slate-400 text-right font-mono">
                      {((uploadProgress.uploaded || 0) / (1024 * 1024)).toFixed(1)} MB /{' '}
                      {(uploadProgress.total / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  )}
                </div>
              )}

              {/* Upload Success Banner */}
              {uploadResult && (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 space-y-3">
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white">YouTube Shorts Başarıyla Yayınlandı!</h4>
                      <p className="text-[11px] text-emerald-300/80">
                        Videonuz işlendi ve YouTube kanalınızda paylaşıldı.
                      </p>
                    </div>
                  </div>

                  {uploadResult.videoUrl && (
                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.electronAPI?.openPath) {
                            window.electronAPI.openPath(uploadResult.videoUrl!);
                          } else {
                            window.open(uploadResult.videoUrl, '_blank');
                          }
                        }}
                        className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow transition-all hover:scale-105 active:scale-95"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Shorts'u İzle</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(uploadResult.videoUrl!, 'yt-url')}
                        className="py-1.5 px-3 rounded-xl bg-dark-900 border border-dark-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                      >
                        {copiedKey === 'yt-url' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Kopyalandı!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Linki Kopyala</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Upload Error Banner */}
              {uploadError && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-start space-x-2 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Yükleme Başarısız</p>
                    <p className="text-[11px] leading-relaxed">{uploadError}</p>
                  </div>
                </div>
              )}

              {/* YouTube Tab Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleUploadToYouTube}
                  disabled={isUploading || !clip.outputPath || !ytStatus?.isAuthenticated}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-xl shadow-rose-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>YouTube'a Yükleniyor (%{uploadProgress?.percent || 0})...</span>
                    </>
                  ) : (
                    <>
                      <Youtube className="w-4 h-4" />
                      <span>YouTube Shorts Olarak Şimdi Yayınla</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="p-4 border-t border-dark-750 bg-dark-850 flex items-center justify-between">
          {activeTab === 'copy' ? (
            <>
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
                    className="py-2 px-3.5 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-700 text-white text-xs font-bold transition-all flex items-center space-x-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-brand-purple" />
                    <span>
                      {appliedTitleKey ? '✓ Başlık Klibe Kaydedildi!' : 'Başlığı Klibe Ata'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab('youtube')}
                  className="py-2 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md shadow-rose-600/20 hover:scale-105 active:scale-95"
                >
                  <Youtube className="w-3.5 h-3.5" />
                  <span>YouTube Shorts'a Aktar</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-4 rounded-xl bg-dark-750 hover:bg-dark-700 text-xs font-bold text-slate-200 hover:text-white transition-all"
                >
                  Kapat
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('copy')}
                className="py-2 px-3.5 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-700 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Metinlere Dön</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="py-2 px-5 rounded-xl bg-dark-750 hover:bg-dark-700 text-xs font-bold text-slate-200 hover:text-white transition-all"
              >
                Kapat
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { novaVoice } from '../utils/novaVoice';

export type NovaEmotion = 'idle' | 'curious' | 'happy' | 'annoyed' | 'furious' | 'dizzy' | 'sleeping' | 'alert';

interface NovaInteractiveAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  externalMood?: 'idle' | 'working' | 'excited' | 'success' | 'alert';
  isSpeaking?: boolean;
  isBusy?: boolean;
  onOpenChat?: () => void;
  className?: string;
  enableVoiceReactions?: boolean;
}

export const NovaInteractiveAvatar: React.FC<NovaInteractiveAvatarProps> = ({
  size = 'lg',
  externalMood,
  isSpeaking = false,
  isBusy = false,
  onOpenChat,
  className = '',
  enableVoiceReactions = true,
}) => {
  // Dimension helper
  const pixelSize = typeof size === 'number'
    ? size
    : size === 'sm'
    ? 36
    : size === 'md'
    ? 48
    : size === 'lg'
    ? 64
    : 104;

  const [emotion, setEmotion] = useState<NovaEmotion>('idle');
  const [gaze, setGaze] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [headTilt, setHeadTilt] = useState<number>(0);
  const [aggro, setAggro] = useState<number>(0); // 0 to 100
  const [isBlinking, setIsBlinking] = useState(false);
  const [clickSparks, setClickSparks] = useState<boolean>(false);

  const avatarRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: Date.now() });
  const targetGaze = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentGaze = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync with external mood (e.g. system alert, success or error)
  useEffect(() => {
    if (externalMood === 'alert') {
      setEmotion('alert');
    } else if (externalMood === 'success' || externalMood === 'excited') {
      setEmotion('happy');
    } else {
      setEmotion((prev) => (prev === 'alert' ? 'idle' : prev));
    }
  }, [externalMood]);

  // Reset inactivity timer
  const resetInactivity = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (emotion === 'sleeping') {
      setEmotion('curious');
      if (enableVoiceReactions) {
        novaVoice.speak('Uykum açıldı patron! Emrindeyim.');
      }
    }
    inactivityTimer.current = setTimeout(() => {
      if (aggro === 0 && !isSpeaking && !isBusy) {
        setEmotion('sleeping');
      }
    }, 45000); // 45s inactivity triggers sleeping
  }, [emotion, aggro, isSpeaking, isBusy, enableVoiceReactions]);

  // 1. Mouse Gaze Tracking & High Velocity (Dizzy) Detection
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      resetInactivity();
      if (!avatarRef.current) return;
      if (emotion === 'furious' || emotion === 'sleeping') return;

      const rect = avatarRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Fast Mouse Velocity Tracking (Triggers Dizzy)
      const now = Date.now();
      const dt = (now - lastMousePos.current.time) / 1000;
      if (dt > 0.04) {
        const speed = Math.sqrt(Math.pow(e.clientX - lastMousePos.current.x, 2) + Math.pow(e.clientY - lastMousePos.current.y, 2)) / dt;
        lastMousePos.current = { x: e.clientX, y: e.clientY, time: now };

        if (speed > 1800 && dist < 260 && emotion !== 'dizzy' && aggro < 40) {
          setEmotion('dizzy');
          if (enableVoiceReactions) {
            novaVoice.speak('Aman patron yavaş salla başım döndü!');
          }
          setTimeout(() => {
            setEmotion((prev) => (prev === 'dizzy' ? 'curious' : prev));
          }, 3500);
          return;
        }
      }

      // Max pupil offset radius based on size
      const maxRadius = pixelSize > 70 ? 7 : 4.5;
      const viewRange = 350;
      const factor = Math.min(dist / viewRange, 1);
      const angle = Math.atan2(dy, dx);

      targetGaze.current = {
        x: Math.cos(angle) * maxRadius * factor,
        y: Math.sin(angle) * maxRadius * factor,
      };

      // Subtle organic head tilt based on horizontal angle
      const targetTilt = Math.max(-14, Math.min(14, (dx / 350) * 14));
      setHeadTilt(targetTilt);

      // Emotion transition: Curious when near, Idle when far
      if (emotion === 'idle' && dist < 280) {
        setEmotion('curious');
      } else if (emotion === 'curious' && dist >= 280 && aggro === 0) {
        setEmotion('idle');
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [emotion, aggro, pixelSize, enableVoiceReactions, resetInactivity]);

  // 2. 60 FPS Spring Lerp Animation Loop for Smooth Eyes
  useEffect(() => {
    let animId: number;
    const animate = () => {
      // Exponential smoothing: current += (target - current) * alpha
      currentGaze.current.x += (targetGaze.current.x - currentGaze.current.x) * 0.18;
      currentGaze.current.y += (targetGaze.current.y - currentGaze.current.y) * 0.18;
      setGaze({ x: currentGaze.current.x, y: currentGaze.current.y });
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // 3. Natural Blinking Loop
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (emotion === 'furious' || emotion === 'dizzy' || emotion === 'sleeping') return;
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 140);
    }, 4200 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, [emotion]);

  // 4. Aggro Decay Loop (Cool down when user stops clicking/poking)
  useEffect(() => {
    const cooldown = setInterval(() => {
      setAggro((prev) => {
        if (prev <= 0) return 0;
        const next = prev - 10;
        if (next < 25 && emotion === 'annoyed') setEmotion('idle');
        if (next < 60 && emotion === 'furious') setEmotion('annoyed');
        return Math.max(0, next);
      });
    }, 1600);

    return () => clearInterval(cooldown);
  }, [emotion]);

  // 5. Poke / Click Interaction Handler (Annoy / Play with Nova)
  const handlePoke = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetInactivity();

    // Trigger visual sparks
    setClickSparks(true);
    setTimeout(() => setClickSparks(false), 300);

    const newAggro = aggro + 20;
    setAggro(newAggro);

    if (newAggro >= 75) {
      setEmotion('furious');
      if (enableVoiceReactions) {
        novaVoice.speak('YETTİ ARTIK! Şaka bir yana işimize odaklanalım patron, kızdırma beni!');
      }
    } else if (newAggro >= 35) {
      setEmotion('annoyed');
      if (enableVoiceReactions) {
        novaVoice.speak('Patron rica ediyorum, gıdıklama dedik ya! Çalışıyoruz burada.');
      }
    } else {
      setEmotion('happy');
      if (enableVoiceReactions) {
        novaVoice.speak('Efendim patron? Bir klip mi patlatıyoruz?');
      }
      setTimeout(() => {
        setEmotion((prev) => (prev === 'happy' ? 'curious' : prev));
      }, 2000);
    }
  };

  // Double click directly opens the chat / control room
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenChat) onOpenChat();
  };

  // Color theme variables based on emotion
  const isAlert = emotion === 'alert' || externalMood === 'alert';
  const isFurious = emotion === 'furious';
  const isAnnoyed = emotion === 'annoyed';
  const isDizzy = emotion === 'dizzy';
  const isHappy = emotion === 'happy';
  const isSleeping = emotion === 'sleeping';

  const auraColor = isAlert || isFurious
    ? 'bg-rose-500 shadow-rose-500/60'
    : isAnnoyed
    ? 'bg-amber-500 shadow-amber-500/50'
    : isDizzy
    ? 'bg-purple-500 shadow-purple-500/60'
    : isSpeaking
    ? 'bg-emerald-400 shadow-emerald-400/60'
    : 'bg-brand-cyan shadow-brand-cyan/40';

  const visorBorderColor = isAlert || isFurious
    ? 'border-rose-500/80 bg-[#160305]'
    : isAnnoyed
    ? 'border-amber-500/80 bg-[#150d03]'
    : isDizzy
    ? 'border-purple-500/80 bg-[#120419]'
    : isSpeaking
    ? 'border-emerald-400/80 bg-[#02140a]'
    : 'border-cyan-500/50 bg-[#040814]';

  return (
    <div
      ref={avatarRef}
      onClick={handlePoke}
      onDoubleClick={handleDoubleClick}
      style={{
        width: pixelSize,
        height: pixelSize,
        transform: `rotate(${headTilt}deg)`,
      }}
      className={`relative cursor-pointer select-none transition-transform duration-200 ease-out group shrink-0 ${
        isFurious ? 'animate-pulse' : ''
      } ${className}`}
      title="NOVA: Tıkla oyna/sinirlendir, Çift tıkla paneli aç!"
    >
      {/* 1. Dynamic Outer Cyber Aura & Particles */}
      <div
        className={`absolute -inset-1.5 rounded-full blur-md opacity-60 group-hover:opacity-100 transition-all duration-300 ${auraColor} ${
          isFurious ? 'scale-115 animate-ping' : isSpeaking ? 'scale-105 animate-pulse' : ''
        }`}
      />

      {/* Sparks ripple on click */}
      {clickSparks && (
        <div className="absolute inset-0 rounded-full border-2 border-white animate-ping pointer-events-none" />
      )}

      {/* 2. Chassis / Helmet Frame */}
      <div className="relative w-full h-full rounded-2xl bg-[#080914] border-2 border-dark-700/80 p-1 flex flex-col items-center justify-center shadow-2xl overflow-hidden transition-all duration-200 group-hover:border-brand-purple">
        {/* Holographic Visor */}
        <div
          className={`relative w-full h-[76%] rounded-xl flex items-center justify-center transition-colors duration-300 overflow-hidden border ${visorBorderColor}`}
        >
          {/* Glass Scanline Reflection */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-black/40 pointer-events-none" />

          {/* SVG Vector Expressive Face */}
          <svg className="w-full h-full p-1" viewBox="0 0 60 36">
            {/* Sleeping State: Soft Zzz lines */}
            {isSleeping ? (
              <g stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" className="opacity-80">
                <line x1="14" y1="20" x2="24" y2="20" />
                <line x1="36" y1="20" x2="46" y2="20" />
                <text x="44" y="11" fill="#38bdf8" fontSize="8" fontWeight="bold" className="animate-pulse">z</text>
                <text x="49" y="7" fill="#818cf8" fontSize="6" fontWeight="bold" className="animate-pulse">Z</text>
              </g>
            ) : isFurious || isAlert ? (
              /* Furious / Flaming Slanted Eyebrows & Glitch Eyes */
              <g fill="#ef4444" className="drop-shadow-[0_0_8px_#ef4444]">
                {/* Angry Slanted Eyebrows */}
                <path d="M 10 9 L 26 17 L 24 21 L 8 13 Z" />
                <path d="M 50 9 L 34 17 L 36 21 L 52 13 Z" />
                {/* Intense Glowing Pupil */}
                <circle cx="21" cy="20" r="3.2" fill="#ffffff" />
                <circle cx="39" cy="20" r="3.2" fill="#ffffff" />
              </g>
            ) : isDizzy ? (
              /* Dizzy / Hypnotic Spinning Spirals */
              <g stroke="#c084fc" strokeWidth="2.2" fill="none" className="drop-shadow-[0_0_6px_#c084fc]">
                <circle cx="18" cy="18" r="7" className="animate-spin origin-[18px_18px]" strokeDasharray="3 3" />
                <circle cx="42" cy="18" r="7" className="animate-spin origin-[42px_18px]" strokeDasharray="3 3" />
                <circle cx="30" cy="26" r="2" fill="#c084fc" />
              </g>
            ) : isAnnoyed ? (
              /* Annoyed / Suspicious Side-Eye */
              <g fill="#f59e0b" className="drop-shadow-[0_0_6px_#f59e0b]">
                {/* Flat Irritated Brows */}
                <line x1="12" y1="12" x2="26" y2="13.5" stroke="#f59e0b" strokeWidth="2.5" />
                <line x1="48" y1="12" x2="34" y2="13.5" stroke="#f59e0b" strokeWidth="2.5" />
                {/* Shifted Side-Eye Pupils */}
                <circle cx={18 + gaze.x * 0.7} cy={20 + gaze.y * 0.7} r="3.8" />
                <circle cx={42 + gaze.x * 0.7} cy={20 + gaze.y * 0.7} r="3.8" />
                <circle cx={19 + gaze.x * 0.7} cy={19 + gaze.y * 0.7} r="1.2" fill="#ffffff" />
                <circle cx={43 + gaze.x * 0.7} cy={19 + gaze.y * 0.7} r="1.2" fill="#ffffff" />
              </g>
            ) : isHappy ? (
              /* Happy / Cute Curved Smile Eyes (^ _ ^) */
              <g stroke="#34d399" strokeWidth="3.2" fill="none" strokeLinecap="round" className="drop-shadow-[0_0_7px_#34d399]">
                <path d="M 12 21 Q 18 12 24 21" />
                <path d="M 36 21 Q 42 12 48 21" />
              </g>
            ) : isBlinking ? (
              /* Natural Blink (Horizontal Slit) */
              <g stroke="#38bdf8" strokeWidth="2.8" strokeLinecap="round" className="drop-shadow-[0_0_5px_#38bdf8]">
                <line x1="13" y1="18" x2="24" y2="18" />
                <line x1="36" y1="18" x2="47" y2="18" />
              </g>
            ) : (
              /* Normal / Curious Gaze Following Eyes */
              <g fill="#38bdf8" className="drop-shadow-[0_0_6px_#38bdf8]">
                <ellipse cx={18 + gaze.x} cy={18 + gaze.y} rx="4.2" ry="5.8" />
                <ellipse cx={42 + gaze.x} cy={18 + gaze.y} rx="4.2" ry="5.8" />
                {/* Catchlight reflections */}
                <circle cx={19.5 + gaze.x * 0.8} cy={16 + gaze.y * 0.8} r="1.6" fill="#ffffff" />
                <circle cx={43.5 + gaze.x * 0.8} cy={16 + gaze.y * 0.8} r="1.6" fill="#ffffff" />
              </g>
            )}
          </svg>
        </div>

        {/* 3. Audio Equalizer Mouth Bars */}
        <div className="flex items-center space-x-1 mt-1">
          <span
            className={`w-1 rounded-full transition-all ${
              isSpeaking
                ? 'bg-emerald-400 h-2.5 animate-pulse'
                : isFurious
                ? 'bg-rose-500 h-2 animate-bounce'
                : isAnnoyed
                ? 'bg-amber-400 h-1'
                : 'bg-brand-purple h-1'
            }`}
          />
          <span
            className={`w-1 rounded-full transition-all ${
              isSpeaking
                ? 'bg-cyan-300 h-3 animate-pulse'
                : isFurious
                ? 'bg-rose-400 h-3 animate-bounce'
                : isAnnoyed
                ? 'bg-amber-400 h-1.5'
                : 'bg-brand-cyan h-1.5'
            }`}
          />
          <span
            className={`w-1 rounded-full transition-all ${
              isSpeaking
                ? 'bg-emerald-400 h-2 animate-pulse'
                : isFurious
                ? 'bg-rose-500 h-2 animate-bounce'
                : isAnnoyed
                ? 'bg-amber-400 h-1'
                : 'bg-brand-purple h-1'
            }`}
          />
        </div>
      </div>
    </div>
  );
};

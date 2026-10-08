import React, { useState, useEffect, useRef, useCallback } from 'react';
import { novaVoice } from '../utils/novaVoice';

export type NovaEmotion = 'idle' | 'curious' | 'happy' | 'annoyed' | 'furious' | 'dizzy' | 'sleeping' | 'alert' | 'wink';

interface NovaInteractiveAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  externalMood?: 'idle' | 'working' | 'excited' | 'success' | 'alert';
  isSpeaking?: boolean;
  isBusy?: boolean;
  onOpenChat?: () => void;
  onPoke?: () => void;
  className?: string;
  enableVoiceReactions?: boolean;
}

const POKE_VOICE_LINES = [
  'Efendim patron? Bir klip mi patlatıyoruz?',
  'Buradayım patron! Kurgu ve keşif emrindeyim.',
  'AutoClip Stüdyo hazır patron! 14 ajan masada.',
  'Gözüm YouTube akışında patron, harika videolar bulacağız!',
  'Selam patron! Bugün Shorts akışını sallamaya hazır mıyız?',
  'Sistemler tam kapasite devrede patron!',
  'Tıklandı! Operasyon komutlarını bekliyorum.',
];

export const NovaInteractiveAvatar: React.FC<NovaInteractiveAvatarProps> = ({
  size = 'lg',
  externalMood,
  isSpeaking = false,
  isBusy = false,
  onOpenChat,
  onPoke,
  className = '',
  enableVoiceReactions = true,
}) => {
  // Dimension helper - default 54px (compact, ~30% reduced)
  const pixelSize = typeof size === 'number'
    ? size
    : size === 'sm'
    ? 34
    : size === 'md'
    ? 44
    : size === 'lg'
    ? 54
    : 76;

  const [emotion, setEmotion] = useState<NovaEmotion>('idle');
  const [gaze, setGaze] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [headTilt, setHeadTilt] = useState<number>(0);
  const [aggro, setAggro] = useState<number>(0);
  const [isBlinking, setIsBlinking] = useState(false);
  const [clickSparks, setClickSparks] = useState<boolean>(false);

  const avatarRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: Date.now() });
  const targetGaze = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentGaze = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync with external mood
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
    }, 45000);
  }, [emotion, aggro, isSpeaking, isBusy, enableVoiceReactions]);

  // 1. Mouse Gaze Tracking & High Velocity
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

      // Fast mouse movement triggers DIZZY emotion
      const now = Date.now();
      const dt = (now - lastMousePos.current.time) / 1000;
      if (dt > 0.04) {
        const speed = Math.sqrt(Math.pow(e.clientX - lastMousePos.current.x, 2) + Math.pow(e.clientY - lastMousePos.current.y, 2)) / dt;
        lastMousePos.current = { x: e.clientX, y: e.clientY, time: now };

        if (speed > 1850 && dist < 240 && emotion !== 'dizzy' && aggro < 40) {
          setEmotion('dizzy');
          if (enableVoiceReactions) {
            novaVoice.speak('Aman patron yavaş salla başım döndü!');
          }
          setTimeout(() => {
            setEmotion((prev) => (prev === 'dizzy' ? 'curious' : prev));
          }, 3600);
          return;
        }
      }

      // Max pupil offset in viewBox units
      const maxRadius = 3.5;
      const viewRange = 300;
      const factor = Math.min(dist / viewRange, 1);
      const angle = Math.atan2(dy, dx);

      targetGaze.current = {
        x: Math.cos(angle) * maxRadius * factor,
        y: Math.sin(angle) * maxRadius * factor,
      };

      // Organic head tilt (curious tilts up to 14 deg like photo 2)
      const targetTilt = Math.max(-14, Math.min(14, (dx / 300) * 14));
      setHeadTilt(targetTilt);

      if (emotion === 'idle' && dist < 260) {
        setEmotion('curious');
      } else if (emotion === 'curious' && dist >= 260 && aggro === 0) {
        setEmotion('idle');
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [emotion, aggro, enableVoiceReactions, resetInactivity]);

  // 2. Smooth Lerp Animation Loop
  useEffect(() => {
    let animId: number;
    const animate = () => {
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

  // 4. Poke Handler: Left Click Interaction
  const handlePoke = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetInactivity();

    if (onPoke) {
      onPoke();
    }

    setClickSparks(true);
    setTimeout(() => setClickSparks(false), 550);

    const newAggro = aggro + 18;
    setAggro(newAggro);

    setTimeout(() => {
      setAggro((prev) => Math.max(0, prev - 18));
    }, 5000);

    if (newAggro >= 65) {
      setEmotion('furious');
      if (enableVoiceReactions) {
        novaVoice.speak('YETTİ ARTIK! Şaka bir yana işimize odaklanalım patron!');
      }
    } else if (newAggro >= 35) {
      setEmotion('annoyed');
      if (enableVoiceReactions) {
        novaVoice.speak('Patron gıdıklama dedik ya! Çalışıyoruz burada.');
      }
    } else {
      const isWink = Math.random() > 0.6;
      setEmotion(isWink ? 'wink' : 'happy');
      if (enableVoiceReactions) {
        const randomLine = POKE_VOICE_LINES[Math.floor(Math.random() * POKE_VOICE_LINES.length)];
        novaVoice.speak(randomLine);
      }
      setTimeout(() => {
        setEmotion((prev) => (prev === 'happy' || prev === 'wink' ? 'curious' : prev));
      }, 2200);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenChat) onOpenChat();
  };

  const isAlert = emotion === 'alert' || externalMood === 'alert';
  const isFurious = emotion === 'furious';
  const isAnnoyed = emotion === 'annoyed';
  const isDizzy = emotion === 'dizzy';
  const isHappy = emotion === 'happy' || (emotion === 'idle' && !isBusy);
  const isCurious = emotion === 'curious';
  const isWink = emotion === 'wink';
  const isSleeping = emotion === 'sleeping';

  // Halo Ring Color Theme based on Emotion Sheet (Photo 1)
  const haloColor = isAlert || isFurious
    ? '#ef4444'
    : isAnnoyed
    ? '#f59e0b'
    : isDizzy
    ? '#c084fc'
    : isSpeaking
    ? '#38bdf8'
    : '#00e5ff';

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
      className={`relative rounded-full select-none transition-transform duration-200 ease-out cursor-pointer shrink-0 ${
        isFurious ? 'animate-pulse' : ''
      } ${className}`}
      title="NOVA: Sol tıkla etkileşime gir / konuş • Sağ tıkla kokpiti aç"
    >
      {/* Click ripple animation strictly inside circle */}
      {clickSparks && (
        <div className="absolute inset-0 rounded-full border-2 border-cyan-300 animate-ping pointer-events-none z-20" />
      )}

      {/* SVG Vector Robot - 100% Circular, Pixel-Perfect to Emotion Sheet (media_1791304033884.jpg) */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full overflow-hidden rounded-full block"
        style={{ shapeRendering: 'geometricPrecision' }}
      >
        <defs>
          {/* Glossy Metallic Titanium / Chrome Sphere Chassis */}
          <radialGradient id="novaTitaniumChassis" cx="35%" cy="30%" r="72%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="22%" stopColor="#e2e8f0" />
            <stop offset="55%" stopColor="#94a3b8" />
            <stop offset="85%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>

          {/* Deep OLED Visor Gradient */}
          <linearGradient id="novaVisorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0b0f19" />
            <stop offset="100%" stopColor="#020408" />
          </linearGradient>

          {/* Visor Glass Top Curved Reflection */}
          <linearGradient id="novaGlassReflect" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Eye Glow Filter */}
          <filter id="novaEyeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Outer Concentric Halo Ring (Matches Photo 1 Color Per Emotion) */}
        <circle
          cx="50"
          cy="50"
          r="47.5"
          fill="none"
          stroke={haloColor}
          strokeWidth="2.4"
          strokeOpacity="0.9"
          filter="url(#novaEyeGlow)"
        />

        {/* FURIOUS: Horizontal glitch streaks radiating outside chassis */}
        {(isFurious || isAlert) && (
          <g stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" opacity="0.9">
            <line x1="3" y1="36" x2="16" y2="36" />
            <line x1="84" y1="42" x2="97" y2="42" />
            <line x1="5" y1="64" x2="18" y2="64" stroke="#f97316" />
            <line x1="82" y1="58" x2="95" y2="58" stroke="#f97316" />
          </g>
        )}

        {/* DIZZY: Sparkling stars floating around head */}
        {isDizzy && (
          <g opacity="0.95">
            <text x="10" y="24" fill="#c084fc" fontSize="10" fontWeight="bold">✦</text>
            <text x="82" y="22" fill="#e879f9" fontSize="11" fontWeight="bold">★</text>
            <text x="7" y="62" fill="#c084fc" fontSize="8">✧</text>
            <text x="86" y="65" fill="#a855f7" fontSize="9">✦</text>
          </g>
        )}

        {/* 2. Metallic Titanium Spherical Helmet Chassis */}
        <circle cx="50" cy="50" r="43.5" fill="url(#novaTitaniumChassis)" />

        {/* 3. Top Head Panel Seams & Plate Grooves (From Reference Photo) */}
        <path
          d="M 30 18 C 42 12, 58 12, 70 18"
          stroke="#475569"
          strokeWidth="1.2"
          fill="none"
        />
        <path
          d="M 33 24 C 43 18, 57 18, 67 24"
          stroke="#475569"
          strokeWidth="1.2"
          fill="none"
        />
        <path
          d="M 31 19 C 43 13, 57 13, 69 19"
          stroke="#ffffff"
          strokeWidth="0.8"
          strokeOpacity="0.4"
          fill="none"
        />

        {/* 4. Left and Right Ear Pods with Glowing LED Rings */}
        {/* Left Ear */}
        <circle cx="15" cy="50" r="5" fill="#334155" stroke="#1e293b" strokeWidth="1" />
        <circle cx="15" cy="50" r="3.2" fill="#0f172a" stroke={haloColor} strokeWidth="1.2" />

        {/* Right Ear */}
        <circle cx="85" cy="50" r="5" fill="#334155" stroke="#1e293b" strokeWidth="1" />
        <circle cx="85" cy="50" r="3.2" fill="#0f172a" stroke={haloColor} strokeWidth="1.2" />

        {/* 5. Bottom Chin Plate & Glowing LED Indicator Bar */}
        <path
          d="M 40 85 L 60 85 L 57 89.5 L 43 89.5 Z"
          fill="#334155"
        />
        <rect
          x="44"
          y="85.5"
          width="12"
          height="2.5"
          rx="1.2"
          fill={haloColor}
          filter="url(#novaEyeGlow)"
        />

        {/* 6. OLED Curved Visor Shield (Deep Black with Soft Stroke) */}
        <path
          d="M 23 37 C 23 23, 77 23, 77 37 C 77 58, 71 74, 50 74 C 29 74, 23 58, 23 37 Z"
          fill="url(#novaVisorGrad)"
          stroke="#1e293b"
          strokeWidth="1.4"
        />

        {/* Glossy Curved Glass Reflection on Visor */}
        <path
          d="M 26 36 C 30 26, 70 26, 74 36 C 62 39, 38 39, 26 36 Z"
          fill="url(#novaGlassReflect)"
        />

        {/* 7. EXPRESSIVE EMOTIONS ACCORDING TO N.O.V.A SHEET (Photo 1) */}
        {isSleeping ? (
          /* SLEEPING: Soft blue Zzz */
          <g stroke="#38bdf8" strokeWidth="2.8" strokeLinecap="round" opacity="0.9">
            <line x1="33" y1="49" x2="45" y2="49" />
            <line x1="55" y1="49" x2="67" y2="49" />
            <text x="63" y="38" fill="#38bdf8" fontSize="10" fontWeight="bold">z</text>
            <text x="70" y="32" fill="#818cf8" fontSize="8" fontWeight="bold">Z</text>
          </g>
        ) : isBlinking ? (
          /* BLINKING: Horizontal glowing slits */
          <g stroke={haloColor} strokeWidth="3.4" strokeLinecap="round" filter="url(#novaEyeGlow)">
            <line x1="32" y1="48" x2="46" y2="48" />
            <line x1="54" y1="48" x2="68" y2="48" />
            <circle cx="50" cy="58" r="2.2" fill={haloColor} />
          </g>
        ) : isFurious || isAlert ? (
          /* 4. FURIOUS (Photo 1): Blazing flame eyebrows, fierce flame eyes & angry frown */
          <g filter="url(#novaEyeGlow)">
            {/* Left Flame Eye */}
            <path
              d="M 30 52 C 28 42, 38 35, 41 40 C 44 43, 47 48, 47 52 C 47 57, 30 57, 30 52 Z"
              fill="#ef4444"
            />
            <path
              d="M 33 50 C 33 44, 40 40, 42 45 C 44 48, 43 51, 33 50 Z"
              fill="#f97316"
            />
            <circle cx="38" cy="49" r="1.6" fill="#ffffff" />

            {/* Right Flame Eye */}
            <path
              d="M 70 52 C 72 42, 62 35, 59 40 C 56 43, 53 48, 53 52 C 53 57, 70 57, 70 52 Z"
              fill="#ef4444"
            />
            <path
              d="M 67 50 C 67 44, 60 40, 58 45 C 56 48, 57 51, 67 50 Z"
              fill="#f97316"
            />
            <circle cx="62" cy="49" r="1.6" fill="#ffffff" />

            {/* Angry Downward Frown Mouth */}
            <path
              d="M 45 61 Q 50 56 55 61"
              stroke="#ef4444"
              strokeWidth="3.2"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        ) : isDizzy ? (
          /* 5. DIZZY (Photo 1): Hypnotic purple concentric spinning spirals & swirly mouth */
          <g filter="url(#novaEyeGlow)">
            {/* Left Spinning Spiral */}
            <path
              d="M 39 48 m -6.5,0 a 6.5,6.5 0 1,0 13,0 a 4.8,4.8 0 1,0 -9.6,0 a 3.2,3.2 0 1,0 6.4,0 a 1.6,1.6 0 1,0 -3.2,0"
              stroke="#c084fc"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
            />
            {/* Right Spinning Spiral */}
            <path
              d="M 61 48 m -6.5,0 a 6.5,6.5 0 1,0 13,0 a 4.8,4.8 0 1,0 -9.6,0 a 3.2,3.2 0 1,0 6.4,0 a 1.6,1.6 0 1,0 -3.2,0"
              stroke="#c084fc"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
            />
            {/* Swirly Mouth */}
            <circle cx="50" cy="58" r="2.2" stroke="#c084fc" strokeWidth="2.2" fill="none" />
          </g>
        ) : isAnnoyed ? (
          /* 3. ANNOYED (Photo 1): Irritated half-closed amber eyes & wavy mouth */
          <g filter="url(#novaEyeGlow)">
            {/* Left Irritated Eye */}
            <line x1="31" y1="44" x2="47" y2="46" stroke="#f59e0b" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M 32 46 C 32 54, 46 54, 46 46 Z" fill="#f59e0b" />
            <circle cx="39" cy="48" r="1.3" fill="#ffffff" />

            {/* Right Irritated Eye */}
            <line x1="69" y1="44" x2="53" y2="46" stroke="#f59e0b" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M 68 46 C 68 54, 54 54, 54 46 Z" fill="#f59e0b" />
            <circle cx="61" cy="48" r="1.3" fill="#ffffff" />

            {/* Annoyed Flat/Wavy Mouth */}
            <path
              d="M 46 60 Q 50 58 54 60"
              stroke="#f59e0b"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        ) : isCurious ? (
          /* 2. CURIOUS (Photo 1): Big sparkling cyan eyes with 4-point sparkle star & round 'o' mouth */
          <g filter="url(#novaEyeGlow)">
            {/* Left Big Eye */}
            <circle
              cx={38 + gaze.x}
              cy={48 + gaze.y}
              r="7.5"
              fill="#00e5ff"
            />
            {/* Left Eye 4-Point Sparkle Star Catchlight */}
            <path
              d={`M ${42.5 + gaze.x} ${43.5 + gaze.y} L ${43.5 + gaze.x} ${41 + gaze.y} L ${44.5 + gaze.x} ${43.5 + gaze.y} L ${47 + gaze.x} ${44.5 + gaze.y} L ${44.5 + gaze.x} ${45.5 + gaze.y} L ${43.5 + gaze.x} ${48 + gaze.y} L ${42.5 + gaze.x} ${45.5 + gaze.y} L ${40 + gaze.x} ${44.5 + gaze.y} Z`}
              fill="#ffffff"
            />
            <circle cx={35.5 + gaze.x} cy={51.5 + gaze.y} r="1.5" fill="#ffffff" />

            {/* Right Big Eye */}
            <circle
              cx={62 + gaze.x}
              cy={48 + gaze.y}
              r="7.5"
              fill="#00e5ff"
            />
            {/* Right Eye Double Pupil Highlights */}
            <circle cx={64.5 + gaze.x} cy={44.5 + gaze.y} r="2.4" fill="#ffffff" />
            <circle cx={60 + gaze.x} cy={51.5 + gaze.y} r="1.4" fill="#ffffff" />

            {/* Cute Round 'o' Mouth */}
            <circle cx="50" cy="58" r="2.8" fill="#00e5ff" />
          </g>
        ) : isWink ? (
          /* WINK: Left eye happy arch, Right eye big curious eye */
          <g filter="url(#novaEyeGlow)">
            {/* Left Eye: Happy Arc + Blush */}
            <path d="M 33 50 Q 40 38 47 50" stroke="#00e5ff" strokeWidth="4.2" fill="none" strokeLinecap="round" />
            <line x1="28" y1="50" x2="31" y2="50" stroke="#00e5ff" strokeWidth="2.5" strokeLinecap="round" />

            {/* Right Eye: Big Eye with Pupil */}
            <circle cx={62 + gaze.x} cy={48 + gaze.y} r="7.5" fill="#00e5ff" />
            <circle cx={64.5 + gaze.x} cy={44.5 + gaze.y} r="2.4" fill="#ffffff" />
            <circle cx={60 + gaze.x} cy={51.5 + gaze.y} r="1.4" fill="#ffffff" />

            {/* Cute Smile Mouth */}
            <path d="M 47 58 Q 50 62 53 58" stroke="#00e5ff" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          </g>
        ) : (
          /* 1. IDLE / HAPPY (Photo 1 Default): Cute Happy Curved Arcs, Blush Ticks & Smile Mouth */
          <g filter="url(#novaEyeGlow)">
            {/* Left Eye Happy Arc */}
            <path
              d="M 33 50 Q 40 38 47 50"
              stroke="#00e5ff"
              strokeWidth="4.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Left Blush Tick */}
            <line
              x1="28"
              y1="50"
              x2="31"
              y2="50"
              stroke="#00e5ff"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Right Eye Happy Arc */}
            <path
              d="M 53 50 Q 60 38 67 50"
              stroke="#00e5ff"
              strokeWidth="4.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Right Blush Tick */}
            <line
              x1="69"
              y1="50"
              x2="72"
              y2="50"
              stroke="#00e5ff"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Cute Smile Mouth */}
            <path
              d="M 47 58 Q 50 62 53 58"
              stroke="#00e5ff"
              strokeWidth="2.8"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>
    </div>
  );
};

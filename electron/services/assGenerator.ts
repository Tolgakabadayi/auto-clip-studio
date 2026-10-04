import fs from 'fs';
import path from 'path';
import { WordTimestamp, SubtitleStyleConfig } from '../../src/types';

/**
 * Converts Hex color (#RRGGBB) to ASS color format (&H00BBGGRR&)
 */
export function hexToAssColor(hex: string, alpha = '00'): string {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  if (cleaned.length !== 6) {
    return `&H${alpha}FFFFFF&`;
  }
  const r = cleaned.substring(0, 2);
  const g = cleaned.substring(2, 4);
  const b = cleaned.substring(4, 6);
  // ASS uses Blue-Green-Red order
  return `&H${alpha}${b}${g}${r}&`.toUpperCase();
}

/**
 * Converts seconds (e.g. 74.25) to ASS timestamp format (H:MM:SS.CC)
 */
export function formatAssTime(seconds: number): string {
  const totalCs = Math.max(0, Math.floor(seconds * 100));
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${h}:${pad(m)}:${pad(s)}.${pad(cs)}`;
}

/**
 * Generates an ASS subtitle file with TikTok / Reels style animated word highlighting.
 */
export function generateAssSubtitles(
  words: WordTimestamp[],
  clipStartSec: number,
  clipEndSec: number,
  config: SubtitleStyleConfig,
  outputPath: string,
  aspectRatio: '9:16' | '16:9' | '1:1' = '9:16'
): string {
  // Filter words strictly within this clip
  const clipWords = words
    .filter(w => w.end >= clipStartSec && w.start <= clipEndSec)
    .map(w => ({
      word: config.uppercase ? w.word.toUpperCase() : w.word,
      start: Math.max(0, w.start - clipStartSec),
      end: Math.min(clipEndSec - clipStartSec, w.end - clipStartSec),
    }))
    .filter(w => w.end > w.start);

  const primaryCol = hexToAssColor(config.primaryColor || '#FFFFFF');
  const highlightCol = hexToAssColor(config.highlightColor || '#FFE600');
  const outlineCol = hexToAssColor(config.outlineColor || '#000000');
  const fontName = config.fontName || 'Montserrat';
  const isLandscape = aspectRatio === '16:9';
  const playResX = isLandscape ? 1920 : 1080;
  const playResY = isLandscape ? 1080 : 1920;
  const fontSize = isLandscape ? Math.round((config.fontSize || 72) * 0.75) : (config.fontSize || 72);
  const outlineWidth = config.outlineWidth ?? 5;
  const shadowDepth = config.shadowDepth ?? 2;
  const marginV = isLandscape ? Math.min(config.marginV || 80, 120) : (config.marginV || 420);
  const wordsPerGroup = config.wordsPerGroup || 3;

  // ASS Header
  const header = `[Script Info]
Title: AutoClip Studio Captions
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709
PlayResX: ${playResX}
PlayResY: ${playResY}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: TikTokDefault,${fontName},${fontSize},${primaryCol},${highlightCol},${outlineCol},&H80000000&,-1,0,0,0,100,100,2,0,1,${outlineWidth},${shadowDepth},${config.alignment || 2},60,60,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  // Group words into chunks (e.g. 2-3 words per screen)
  const groups: WordTimestamp[][] = [];
  for (let i = 0; i < clipWords.length; i += wordsPerGroup) {
    groups.push(clipWords.slice(i, i + wordsPerGroup));
  }

  const events: string[] = [];

  groups.forEach(group => {
    if (group.length === 0) return;
    const groupStart = group[0].start;
    const groupEnd = group[group.length - 1].end;

    if (config.animationStyle === 'karaoke') {
      // Dynamic word-by-word active highlighting:
      // For each word in the group, render the phrase with that specific word highlighted
      group.forEach((activeWord, idx) => {
        const wordStart = activeWord.start;
        const wordEnd = activeWord.end;

        const formattedText = group.map((w, i) => {
          if (i === idx) {
            // Active word: highlighted color + slight scale pop effect
            return `{\\c${highlightCol}\\t(0,80,\\fscx112\\fscy112)\\t(80,160,\\fscx100\\fscy100)}${w.word}{\\r}`;
          } else {
            // Inactive word: primary color
            return `{\\c${primaryCol}}${w.word}`;
          }
        }).join(' ');

        events.push(
          `Dialogue: 0,${formatAssTime(wordStart)},${formatAssTime(wordEnd)},TikTokDefault,,0,0,0,,${formattedText}`
        );
      });
    } else {
      // Simple synchronized group subtitle
      const groupText = group.map(w => w.word).join(' ');
      events.push(
        `Dialogue: 0,${formatAssTime(groupStart)},${formatAssTime(groupEnd)},TikTokDefault,,0,0,0,,${groupText}`
      );
    }
  });

  const fullContent = header + events.join('\n') + '\n';
  fs.writeFileSync(outputPath, fullContent, 'utf-8');
  return outputPath;
}

/**
 * Types declarations for Sincronizzatore Video Audio Personalizzato
 */

export interface VisualSticker {
  id: string;
  type: 'emoji' | 'character' | 'speech_bubble' | 'custom_image';
  value: string; // E.g., "👽", "cat", "Hello!" (or Base64 data / Link URL for custom_image)
  x: number; // Percentage 0 - 100
  y: number; // Percentage 0 - 100
  size: number; // Size in pixels
  rotation: number; // In degrees
  flipped?: boolean; // Mirror horizontal state
  zIndex?: number; // Layering order
  opacity?: number; // range 10-100
  hueRotate?: number; // range 0-360 degrees
  brightness?: number; // range 50-200%
  contrast?: number; // range 50-200%
}

export interface VideoSegment {
  id: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string; // Subtitle text (Italian or any main language)
  translatedTexts?: Record<string, string>; // Language Code -> Translated Subtitle
  narrationText: string; // Narration script/text
  imageUrl: string; // URL, link or Base64 uploaded file
  audioUrl?: string; // Generated TTS or custom uploaded audio
  audioFileName?: string; // Real filename if uploaded by user
  imageFileName?: string; // Real filename if uploaded by user
  stickers?: VisualSticker[]; // Interactive drag/resize characters or stickers
}

export interface VideoProject {
  title: string;
  segments: VideoSegment[];
  bgMusic: string; // ID or custom uploaded master background audio URL
  bgMusicVolume: number; // 0 to 1
  voiceName: string; // Selected voice
  aspectRatio: '16:9' | '1:1' | '9:16';
  language: string; // Selected primary localization
}

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'M' | 'F';
  description: string;
}

export const SUPPORTED_VOICES: VoiceOption[] = [
  { id: 'Kore', name: 'Kore (Femminile - Calda & Chiara)', gender: 'F', description: 'Voce calda ed espressiva, ottima per storie ed esplicativi.' },
  { id: 'Zephyr', name: 'Zephyr (Maschile - Professionale)', gender: 'M', description: 'Tono rassicurante e professionale, ideale per documentari.' },
  { id: 'Puck', name: 'Puck (Femminile - Briosa)', gender: 'F', description: 'Tono vivace ed energetico, perfetto per contenuti promozionali.' },
  { id: 'Fenrir', name: 'Fenrir (Maschile - Profondo)', gender: 'M', description: 'Voce profonda, ideale per ambientazioni drammatiche.' },
  { id: 'Charon', name: 'Charon (Maschile - Calmo)', gender: 'M', description: 'Voce calma e rilassante per racconti lenti.' }
];

export interface StockMusicTrack {
  id: string;
  name: string;
  style: string;
  url: string;
  synthType: 'dreamy' | 'cinematic' | 'upbeat' | 'none';
}

export const STOCK_MUSIC_TRACKS: StockMusicTrack[] = [
  { id: 'none', name: 'Nessuna Musica', style: 'Silenzioso', url: '', synthType: 'none' },
  { id: 'ambient', name: 'Sintetizzatore Sognante (Generato)', style: 'Ambient, Rilassante', url: '', synthType: 'dreamy' },
  { id: 'cinematic', name: 'Sintetizzatore Epico (Generato)', style: 'Drammatico, Epico', url: '', synthType: 'cinematic' },
  { id: 'upbeat', name: 'Sintetizzatore Elettronico (Generato)', style: 'Ritmo, Energico', url: '', synthType: 'upbeat' }
];

// Fun static list of cute Character Options
export interface CharacterPreset {
  id: string;
  name: string;
  emoji: string;
}

export const CHARACTER_PRESETS: CharacterPreset[] = [
  { id: 'astronaut', name: 'Astronauta', emoji: '🧑‍🚀' },
  { id: 'alien', name: 'Alienino', emoji: '👽' },
  { id: 'cat', name: 'Super Gatto', emoji: '😸' },
  { id: 'monster', name: 'Mostriciattolo', emoji: '👾' },
  { id: 'robot', name: 'Robottino', emoji: '🤖' },
  { id: 'wizard', name: 'Mago', emoji: '🧙‍♂️' },
  { id: 'fairy', name: 'Fatina', emoji: '🧚‍♀️' },
  { id: 'dragon', name: 'Draghetto', emoji: '🐉' },
  { id: 'ghost', name: 'Fantasma', emoji: '👻' },
  { id: 'superhero', name: 'Eroe', emoji: '🦸‍♂️' }
];

// Fun emoji stickers categorized
export const STICKER_CATEGORIES = {
  emotions: ["❤️", "💖", "🔥", "✨", "🌟", "🎉", "💥", "💯", "💬", "💭"],
  nature: ["🌲", "🍀", "🌸", "☀️", "🌙", "☁️", "🌊", "❄️", "🌋", "☄️"],
  objects: ["🚗", "🚀", "🛸", "🎒", "🏺", "💎", "💻", "🎨", "🎭", "👑"],
};

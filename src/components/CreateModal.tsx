import { useState } from 'react';
import { Film, ArrowRight, Music, Volume2, HelpCircle, FileText, Layout, Upload } from 'lucide-react';
import { VideoProject, VoiceOption, SUPPORTED_VOICES, STOCK_MUSIC_TRACKS } from '../types';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: VideoProject) => void;
}

export default function CreateModal({ isOpen, onClose, onProjectCreated }: CreateModalProps) {
  const [title, setTitle] = useState('Il Mio Video Animato');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '1:1' | '9:16'>('16:9');
  const [voice, setVoice] = useState('Kore');
  const [music, setMusic] = useState('ambient');
  const [musicVolume, setMusicVolume] = useState(0.2);
  const [language, setLanguage] = useState('it');

  // Choose a prebuilt starting scenario (Templates) to work immediately offline
  const [chosenTemplate, setChosenTemplate] = useState<string>('space');

  if (!isOpen) return null;

  const handleCreate = () => {
    let segments = [];

    if (chosenTemplate === 'blank') {
      segments = [
        {
          id: `seg-${Date.now()}-1`,
          startTime: 0,
          endTime: 8,
          text: "Benvenuto nel tuo nuovo video! Modifica questa didascalia.",
          narrationText: "Questo è il testo che verrà narrato per la prima scena. Carica la tua voce personale o usa quella di sistema.",
          imageUrl: "https://picsum.photos/seed/custom_new_1/960/540",
          stickers: []
        }
      ];
    } else if (chosenTemplate === 'space') {
      segments = [
        {
          id: `seg-${Date.now()}-1`,
          startTime: 0,
          endTime: 6,
          text: "Partenza verso l'infinito sconosciuto!",
          narrationText: "L'astronave si solleva dalla rampa di lancio diretta verso galassie lontane.",
          imageUrl: "https://picsum.photos/seed/space_launch/960/540",
          stickers: [
            { id: 'st1', type: 'character', value: '🤖', x: 20, y: 40, size: 80, rotation: 0 },
            { id: 'st2', type: 'speech_bubble', value: "Pronti all'avvio!", x: 20, y: 15, size: 100, rotation: 0 }
          ]
        },
        {
          id: `seg-${Date.now()}-2`,
          startTime: 6,
          endTime: 12,
          text: "Incontriamo un simpatico alieno.",
          narrationText: "Orbitando attorno a Giove, un piccolo disco volante arancione si unisce alla nostra rotta di navigazione.",
          imageUrl: "https://picsum.photos/seed/jupiter_orbit/960/540",
          stickers: [
            { id: 'st3', type: 'character', value: '👽', x: 74, y: 35, size: 90, rotation: 10 },
            { id: 'st4', type: 'speech_bubble', value: "Benvenuti nel Cosmo!", x: 68, y: 10, size: 110, rotation: -5 }
          ]
        },
        {
          id: `seg-${Date.now()}-3`,
          startTime: 12,
          endTime: 19,
          text: "Un misterioso pianeta ghiacciato.",
          narrationText: "Sotto l'abbraccio delle costellazioni, esploriamo caverne cariche di cristalli lucenti.",
          imageUrl: "https://picsum.photos/seed/ice_cave/960/540",
          stickers: [
            { id: 'st5', type: 'character', value: '🧑‍🚀', x: 45, y: 50, size: 85, rotation: 0 },
            { id: 'st6', type: 'emoji', value: '💎', x: 20, y: 70, size: 50, rotation: 15 }
          ]
        }
      ];
    } else if (chosenTemplate === 'fairy_tale') {
      segments = [
        {
          id: `seg-${Date.now()}-1`,
          startTime: 0,
          endTime: 7,
          text: "Nel cuore della foresta incantata...",
          narrationText: "C'era una volta un bosco segreto dove gli alberi sussurravano canzoni al vento leggero della sera.",
          imageUrl: "https://picsum.photos/seed/fantasy_woods/960/540",
          stickers: [
            { id: 'st_f1', type: 'character', value: '🧚‍♀️', x: 25, y: 30, size: 80, rotation: -10 },
            { id: 'st_f2', type: 'speech_bubble', value: "Ascolta la magia...", x: 25, y: 10, size: 100, rotation: 0 }
          ]
        },
        {
          id: `seg-${Date.now()}-2`,
          startTime: 7,
          endTime: 14,
          text: "Il draghetto impara a volare.",
          narrationText: "Tra i funghi fatati, un piccolo draghetto verde accende la sua prima fiammella d'ispirazione.",
          imageUrl: "https://picsum.photos/seed/mushroom_woods/960/540",
          stickers: [
            { id: 'st_f3', type: 'character', value: '🐉', x: 70, y: 45, size: 95, rotation: 0 },
            { id: 'st_f4', type: 'emoji', value: '🔥', x: 55, y: 55, size: 45, rotation: 12 }
          ]
        },
        {
          id: `seg-${Date.now()}-3`,
          startTime: 14,
          endTime: 21,
          text: "Il castello oltre l'arcobaleno.",
          narrationText: "Ed ecco infine ergersi maestose le torri d'oro del castello d'avorio, custodi del regno fatato.",
          imageUrl: "https://picsum.photos/seed/ivory_castle/960/540",
          stickers: [
            { id: 'st_f5', type: 'character', value: '👑', x: 50, y: 15, size: 60, rotation: 0 },
            { id: 'st_f6', type: 'character', value: '😸', x: 20, y: 60, size: 80, rotation: 0 }
          ]
        }
      ];
    }

    const newProject: VideoProject = {
      title,
      segments,
      bgMusic: music,
      bgMusicVolume: musicVolume,
      voiceName: voice,
      aspectRatio,
      language
    };

    onProjectCreated(newProject);
    onClose();
  };

  return (
    <div id="create-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div id="create-modal-container" className="w-full max-w-2xl bg-[#111114] border border-white/10 rounded-2xl overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 bg-[#16161a] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 rounded-lg text-indigo-400">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Nuovo Progetto Video Personalizzabile</h3>
              <p className="text-[11px] text-slate-400">Crea storie, inserisci audio, foto tue e stickers in qualsiasi lingua</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 select-none">
          
          {/* Project Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Titolo del Video</label>
            <input
              type="text"
              className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"
              placeholder="Es. Il mio racconto con foto o sigla animata"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Model / Template starting choices */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400">Come desideri iniziare?</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setChosenTemplate('blank')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between h-32 transition ${
                  chosenTemplate === 'blank'
                    ? 'bg-indigo-600/10 border-indigo-500 text-white'
                    : 'bg-[#09090b]/50 border-white/5 text-slate-400 hover:bg-white/5'
                }`}
              >
                <div className="p-1.5 bg-slate-800 rounded-lg w-fit">
                  <FileText className="h-4 w-4 text-slate-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Progetto Vuoto</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Parti da zero, carica i tuoi file audio e foto direttamente sul momento</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setChosenTemplate('space')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between h-32 transition ${
                  chosenTemplate === 'space'
                    ? 'bg-indigo-600/10 border-indigo-500 text-white'
                    : 'bg-[#09090b]/50 border-white/5 text-slate-400 hover:bg-white/5'
                }`}
              >
                <div className="p-1.5 bg-indigo-600/20 rounded-lg w-fit">
                  <Layout className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Modello Spazio 🚀</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">3 slide a tema spazio piene di alieni, robot astronauti e scritte editabili</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setChosenTemplate('fairy_tale')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between h-32 transition ${
                  chosenTemplate === 'fairy_tale'
                    ? 'bg-indigo-600/10 border-indigo-500 text-white'
                    : 'bg-[#09090b]/50 border-white/5 text-slate-400 hover:bg-white/5'
                }`}
              >
                <div className="p-1.5 bg-emerald-600/20 rounded-lg w-fit">
                  <Layout className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Bosco Incantato 🧚‍♀️</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">3 slide a tema magico con draghi, fate svolazzanti e campioni audio</p>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-white/5">
            {/* Format (Aspect Ratio) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Rapporto d'aspetto (Formato)</label>
              <div className="grid grid-cols-3 gap-2">
                {(['16:9', '1:1', '9:16'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    type="button"
                    className={`rounded-xl border text-[10px] transition flex flex-col items-center justify-center p-2.5 h-16 gap-1 ${
                      aspectRatio === ratio
                        ? 'bg-indigo-600/10 border-indigo-500 text-indigo-300'
                        : 'bg-[#09090b]/50 border-white/5 text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <div className={`border rounded border-current ${
                      ratio === '16:9' ? 'w-7 h-4' : ratio === '1:1' ? 'w-5 h-5' : 'w-3 h-6'
                    }`} />
                    <span>{ratio === '16:9' ? '16:9 Orizzontale' : ratio === '1:1' ? '1:1 Quadrato' : '9:16 Verticale'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Language Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Lingua Principale di Supporto</label>
              <select
                className="w-full bg-[#09090b] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="it">🇮🇹 Italiano</option>
                <option value="en">🇺🇸 English</option>
                <option value="es">🇪🇸 Español</option>
                <option value="fr">🇫🇷 Français</option>
                <option value="de">🇩🇪 Deutsch</option>
                <option value="ja">🇯🇵 日本語</option>
                <option value="zh">🇨🇳 中文</option>
                <option value="ko">🇰🇷 한국어 (Korean)</option>
              </select>
              <p className="text-[10px] text-slate-500">L'app supporta la scrittura di sottotitoli in qualsiasi tracciato linguistico.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            {/* Synthesized background style */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Sottofondo di Sintesi di Default</label>
              <select
                className="w-full bg-[#09090b] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={music}
                onChange={(e) => setMusic(e.target.value)}
              >
                {STOCK_MUSIC_TRACKS.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.name} ({track.style})
                  </option>
                ))}
              </select>
            </div>

            {/* Volume regulator */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 flex justify-between">
                <span>Volume Sintetizzatore</span>
                <span className="text-indigo-400 font-mono text-[10px]">{Math.round(musicVolume * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.05"
                className="w-full accent-indigo-500 bg-[#09090b] cursor-pointer h-2 rounded-lg py-1.5"
                value={musicVolume}
                onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                disabled={music === 'none'}
              />
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-white/10 bg-[#16161a] flex items-center justify-between">
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <HelpCircle className="h-3.5 w-3.5" />
            Nessun limite di utilizzo AI! Scegli liberamente files tuoi.
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/10 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition"
              type="button"
            >
              Annulla
            </button>
            <button
              onClick={handleCreate}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1.5 transition shadow"
              type="button"
              id="finalize-create-btn"
            >
              Crea Progetto
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

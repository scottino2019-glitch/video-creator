import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Square, Plus, Sparkles, Image as ImageIcon, 
  Music, Volume2, Type, Check, Trash2, ChevronRight, ChevronLeft, 
  Settings, Film, Download, RefreshCw, VolumeX, Mic, HelpCircle, 
  AlertTriangle, Upload, Globe, Smile, Move, Maximize2, RotateCw, 
  AlignCenter, Scissors, Copy, Layers, Eye, Sliders, CheckCircle, Info
} from 'lucide-react';
import { 
  VideoProject, VideoSegment, SUPPORTED_VOICES, STOCK_MUSIC_TRACKS, 
  CHARACTER_PRESETS, STICKER_CATEGORIES, VisualSticker 
} from './types';
import CreateModal from './components/CreateModal';
import { playSynthMusic, SynthHandle } from './audioSynth';

// Initial elegant customizable demo project
const DEFAULT_CUSTOM_PROJECT: VideoProject = {
  title: "AstroGatto e l'Alieno dei Cristalli di Luna",
  aspectRatio: "16:9",
  bgMusic: "ambient",
  bgMusicVolume: 0.15,
  voiceName: "Kore",
  language: "it",
  segments: [
    {
      id: "seg-custom-1",
      startTime: 0,
      endTime: 8,
      text: "AstroGatto si prepara ad esplorare la luna.",
      narrationText: "Nel lontano anno tremila, un gatto coraggioso decise di indossare una tuta spaziale e sbarcare sui crateri vulcanici più freddi.",
      imageUrl: "https://picsum.photos/seed/spacecat_123/960/540",
      stickers: [
        { id: 'st-cat', type: 'character', value: '😸', x: 25, y: 55, size: 90, rotation: 0, flipped: false, zIndex: 1 },
        { id: 'st-b1', type: 'speech_bubble', value: "Un piccolo passo per un gattino!", x: 28, y: 20, size: 120, rotation: -4, flipped: false, zIndex: 2 }
      ]
    },
    {
      id: "seg-custom-2",
      startTime: 8,
      endTime: 16,
      text: "Un misterioso segnale dai cristalli.",
      narrationText: "All'improvviso, tra i bagliori delle pietre preziose, appare uno strano essere con due paia di occhi fluorescenti.",
      imageUrl: "https://picsum.photos/seed/purple_crystal/960/540",
      stickers: [
        { id: 'st-alien', type: 'character', value: '👽', x: 72, y: 50, size: 100, rotation: 8, flipped: true, zIndex: 1 },
        { id: 'st-b2', type: 'speech_bubble', value: "Ciaoo terrestre!", x: 68, y: 18, size: 100, rotation: 3, flipped: false, zIndex: 2 },
        { id: 'st-em1', type: 'emoji', value: '✨', x: 45, y: 35, size: 55, rotation: 15, flipped: false, zIndex: 3 }
      ]
    },
    {
      id: "seg-custom-3",
      startTime: 16,
      endTime: 24,
      text: "Insieme per salvare la galassia.",
      narrationText: "Nacque così una straordinaria amicizia interstellare, unendo forze feline e conoscenze aliene sotto un tramonto spaziale infuocato.",
      imageUrl: "https://picsum.photos/seed/space_scenery/960/540",
      stickers: [
        { id: 'st-cat-end', type: 'character', value: '😸', x: 38, y: 56, size: 85, rotation: -3, flipped: false, zIndex: 1 },
        { id: 'st-alien-end', type: 'character', value: '👽', x: 58, y: 54, size: 90, rotation: 3, flipped: true, zIndex: 2 },
        { id: 'st-love', type: 'emoji', value: '💖', x: 48, y: 30, size: 60, rotation: 0, flipped: false, zIndex: 3 }
      ]
    }
  ]
};

export default function App() {
  const [project, setProject] = useState<VideoProject>(DEFAULT_CUSTOM_PROJECT);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isCinemaMode, setIsCinemaMode] = useState<boolean>(false);
  
  // Tab navigator for the right editor panel
  const [activeTab, setActiveTab] = useState<'scene' | 'characters' | 'project'>('scene');
  
  // Custom characters local directory checklist
  const [uploadedCharacters, setUploadedCharacters] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Pointer-Events dragging state
  const [draggingStickerId, setDraggingStickerId] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  
  // Screen recording hooks
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Selection target
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);

  // Errors feedback
  const [audioError, setAudioError] = useState<string>('');
  const [imageError, setImageError] = useState<string>('');
  const [customStickerUrl, setCustomStickerUrl] = useState<string>('');
  const [stickerError, setStickerError] = useState<string>('');
  const [speechBubbleText, setSpeechBubbleText] = useState<string>("Ciao AstroGatto!");
  
  // Calculate total duration recursively
  const totalDuration = project.segments.length > 0 
    ? project.segments[project.segments.length - 1].endTime 
    : 24;

  const audioContextRef = useRef<AudioContext | null>(null);
  const synthHandleRef = useRef<SynthHandle | null>(null);
  const playbackIntervalRef = useRef<any>(null);
  const playStartTimeRef = useRef<number>(0);
  const playStartOffsetRef = useRef<number>(0);

  // Audio elements
  const activeSegmentAudioRef = useRef<HTMLAudioElement | null>(null);

  const initAudioCtx = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  // Coordinated playback looping and slide sync
  useEffect(() => {
    if (isPlaying) {
      try {
        const ctx = initAudioCtx();
        if (ctx && project.bgMusic !== 'none') {
          if (synthHandleRef.current) synthHandleRef.current.stop();
          synthHandleRef.current = playSynthMusic(ctx, project.bgMusic as any, project.bgMusicVolume);
        }
      } catch (err) {
        console.warn("Synthesizer audio auto-access blocked in container iframe:", err);
      }

      playStartTimeRef.current = Date.now();
      playStartOffsetRef.current = currentTime;

      playbackIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - playStartTimeRef.current) / 1000;
        let nextTime = playStartOffsetRef.current + elapsed;

        if (nextTime >= totalDuration) {
          nextTime = 0;
          stopAllPlaying();
          return;
        }

        setCurrentTime(nextTime);

        // Find active segment sequentially
        const matchIdx = project.segments.findIndex(
          (seg) => nextTime >= seg.startTime && nextTime < seg.endTime
        );
        if (matchIdx !== -1 && matchIdx !== activeIdx) {
          setActiveIdx(matchIdx);
          triggerCustomAudioOrTts(matchIdx);
        }
      }, 40);

      triggerCustomAudioOrTts(activeIdx);
    } else {
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      if (synthHandleRef.current) {
        synthHandleRef.current.stop();
        synthHandleRef.current = null;
      }
      stopVocalTracks();
    }

    return () => {
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
    };
  }, [isPlaying]);

  const triggerCustomAudioOrTts = (idx: number) => {
    stopVocalTracks();
    const segment = project.segments[idx];
    if (!segment) return;

    if (segment.audioUrl) {
      try {
        const audio = new Audio(segment.audioUrl);
        audio.volume = 1.0;
        audio.play().catch(e => {
          console.warn("Autoplay block, fallback to Local Synthesis TTS:", e);
          triggerLocalTTS(segment.narrationText);
        });
        activeSegmentAudioRef.current = audio;
      } catch (err) {
        triggerLocalTTS(segment.narrationText);
      }
    } else {
      triggerLocalTTS(segment.narrationText);
    }
  };

  const triggerLocalTTS = (text: string) => {
    if ('speechSynthesis' in window && text.trim()) {
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
      } catch (e) {}

      // A small delay solves the Chrome cancel-speak silence race condition perfectly
      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          
          if (project.language === 'it') utterance.lang = 'it-IT';
          else if (project.language === 'en') utterance.lang = 'en-US';
          else if (project.language === 'es') utterance.lang = 'es-ES';
          else if (project.language === 'fr') utterance.lang = 'fr-FR';
          else if (project.language === 'de') utterance.lang = 'de-DE';
          else if (project.language === 'ja') utterance.lang = 'ja-JP';
          else if (project.language === 'zh') utterance.lang = 'zh-CN';
          else if (project.language === 'ko') utterance.lang = 'ko-KR';
          else utterance.lang = 'it-IT';

          utterance.rate = 1.05;
          
          // Chrome garbage collection workaround
          (window as any)._activeUtterance = utterance;
          utterance.onend = () => {
            (window as any)._activeUtterance = null;
          };
          utterance.onerror = () => {
            (window as any)._activeUtterance = null;
          };

          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn("TTS speak failed", err);
        }
      }, 60);
    }
  };

  const stopVocalTracks = () => {
    if (activeSegmentAudioRef.current) {
      try {
        activeSegmentAudioRef.current.pause();
        activeSegmentAudioRef.current = null;
      } catch (e) {}
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const stopAllPlaying = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveIdx(0);
    stopVocalTracks();
  };

  const togglePlay = () => {
    initAudioCtx();
    setIsPlaying(!isPlaying);
  };

  // Upload Background Image Parser
  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>, segId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError('');
    if (!file.type.startsWith('image/')) {
      setImageError("Per favore seleziona un'immagine JPG o PNG corretta.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        setProject(prev => ({
          ...prev,
          segments: prev.segments.map(s => 
            s.id === segId ? { ...s, imageUrl: base64Url, imageFileName: file.name } : s
          )
        }));
      }
    };
    reader.onerror = () => {
      setImageError("Errore nel caricamento del file locale.");
    };
    reader.readAsDataURL(file);
  };

  // Upload Scene Audio Parser
  const handleLocalAudioUpload = (e: React.ChangeEvent<HTMLInputElement>, segId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Audio = event.target?.result as string;
      if (base64Audio) {
        setProject(prev => ({
          ...prev,
          segments: prev.segments.map(s => 
            s.id === segId ? { 
              ...s, 
              audioUrl: base64Audio, 
              audioFileName: file.name
            } : s
          )
        }));
        
        // Brief playback confirmation logic
        try {
          const testAudio = new Audio(base64Audio);
          testAudio.volume = 0.5;
          testAudio.play().then(() => {
            setTimeout(() => testAudio.pause(), 1200);
          });
        } catch (e) {}
      }
    };
    reader.onerror = () => {
      setAudioError("Errore nella lettura del file audio.");
    };
    reader.readAsDataURL(file);
  };

  // Direct Interactive Character Drop Upload Parser
  const handleCustomStickerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStickerError('');
    if (!file.type.startsWith('image/')) {
      setStickerError("Scegli un file PNG o JPG valido.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        // Stamp onto screen
        addStickerToActiveSegment('custom_image', base64Url);
        // Save to local reusable character presets
        if (!uploadedCharacters.includes(base64Url)) {
          setUploadedCharacters(prev => [...prev, base64Url]);
        }
      }
    };
    reader.onerror = () => {
      setStickerError("Errore nel caricamento dello sticker.");
    };
    reader.readAsDataURL(file);
  };

  // Stamp sticker on screen
  const addStickerToActiveSegment = (type: 'emoji' | 'character' | 'speech_bubble' | 'custom_image', value: string) => {
    const currentSeg = project.segments[activeIdx];
    if (!currentSeg) return;

    // Highest current zIndex finder
    const currentStickers = currentSeg.stickers || [];
    const maxZ = currentStickers.reduce((max, s) => Math.max(max, s.zIndex || 0), 0);

    const newSticker: VisualSticker = {
      id: `st-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      value,
      x: 50, // Starts aligned perfectly at center
      y: 50,
      size: type === 'speech_bubble' ? 120 : type === 'custom_image' ? 120 : 80,
      rotation: 0,
      flipped: false,
      zIndex: maxZ + 1
    };

    setProject(prev => ({
      ...prev,
      segments: prev.segments.map(s => 
        s.id === currentSeg.id ? { ...s, stickers: [...currentStickers, newSticker] } : s
      )
    }));
    setSelectedStickerId(newSticker.id);
  };

  const handleAddCustomStickerByUrl = () => {
    if (customStickerUrl.trim()) {
      addStickerToActiveSegment('custom_image', customStickerUrl.trim());
      if (!uploadedCharacters.includes(customStickerUrl.trim())) {
        setUploadedCharacters(prev => [...prev, customStickerUrl.trim()]);
      }
      setCustomStickerUrl('');
    }
  };

  // Interactive Dragging Handlers with Window event listener to ensure 100% stability (no shaking/escaping mouse)
  const handleStickerPointerDown = (e: React.PointerEvent<HTMLDivElement>, stickerId: string) => {
    e.stopPropagation();
    e.preventDefault(); // crucial to prevent text selection and scroll/bounce shaking
    setSelectedStickerId(stickerId);
    setDraggingStickerId(stickerId);
    setActiveTab('characters'); // instant tab swap for custom element controls visibility!
  };

  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!draggingStickerId || !stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      
      let px = ((e.clientX - rect.left) / rect.width) * 100;
      let py = ((e.clientY - rect.top) / rect.height) * 100;
      
      px = Math.max(0, Math.min(100, px));
      py = Math.max(0, Math.min(100, py));
      
      px = Math.round(px * 10) / 10;
      py = Math.round(py * 10) / 10;

      const currentSeg = project.segments[activeIdx];
      if (!currentSeg) return;

      setProject(prev => ({
        ...prev,
        segments: prev.segments.map(s => s.id === currentSeg.id ? {
          ...s,
          stickers: s.stickers?.map(st => 
            st.id === draggingStickerId ? { ...st, x: px, y: py } : st
          )
        } : s)
      }));
    };

    const handleGlobalPointerUp = () => {
      if (draggingStickerId) {
        setDraggingStickerId(null);
      }
    };

    if (draggingStickerId) {
      window.addEventListener('pointermove', handleGlobalPointerMove);
      window.addEventListener('pointerup', handleGlobalPointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [draggingStickerId, activeIdx, project.segments]);

  const updateSelectedStickerProps = (props: Partial<VisualSticker>) => {
    if (!selectedStickerId) return;
    const currentSeg = project.segments[activeIdx];
    if (!currentSeg || !currentSeg.stickers) return;

    setProject(prev => ({
      ...prev,
      segments: prev.segments.map(s => s.id === currentSeg.id ? {
        ...s,
        stickers: s.stickers?.map(st => 
          st.id === selectedStickerId ? { ...st, ...props } : st
        )
      } : s)
    }));
  };

  const deleteSelectedSticker = () => {
    if (!selectedStickerId) return;
    const currentSeg = project.segments[activeIdx];
    if (!currentSeg || !currentSeg.stickers) return;

    setProject(prev => ({
      ...prev,
      segments: prev.segments.map(s => s.id === currentSeg.id ? {
        ...s,
        stickers: s.stickers?.filter(st => st.id !== selectedStickerId)
      } : s)
    }));
    setSelectedStickerId(null);
  };

  const updateSegmentData = (segId: string, data: Partial<VideoSegment>) => {
    setProject(prev => ({
      ...prev,
      segments: prev.segments.map(s => s.id === segId ? { ...s, ...data } : s)
    }));
  };

  // Dynamic Scene Splitter (Scissors logic)
  const splitActiveScene = () => {
    const currentSeg = project.segments[activeIdx];
    if (!currentSeg) return;

    const splitPoint = parseFloat(currentTime.toFixed(1));
    
    if (splitPoint <= currentSeg.startTime + 0.8 || splitPoint >= currentSeg.endTime - 0.8) {
      alert("Sposta la testina di riproduzione temporale in un punto intermedio all'interno della scena per poterla tagliare (almeno 1 secondo lontano dai bordi).");
      return;
    }

    // Duplicate segment configurations, split timeframes safely!
    const part1: VideoSegment = {
      ...currentSeg,
      id: `seg-split-${Date.now()}-a`,
      endTime: splitPoint,
      stickers: currentSeg.stickers ? JSON.parse(JSON.stringify(currentSeg.stickers)) : []
    };

    const part2: VideoSegment = {
      ...currentSeg,
      id: `seg-split-${Date.now()}-b`,
      startTime: splitPoint,
      text: `${currentSeg.text || 'Nuova scena'} (Parte 2)`,
      stickers: currentSeg.stickers ? JSON.parse(JSON.stringify(currentSeg.stickers)) : []
    };

    const updatedSegments = [...project.segments];
    updatedSegments.splice(activeIdx, 1, part1, part2);

    setProject(prev => ({
      ...prev,
      segments: updatedSegments
    }));
    
    // Select the new newly-cut slice and alert success
    setActiveIdx(activeIdx + 1);
  };

  // Adjust Scene Durations Directly (+ / -) -> Realigns subsequent timelines seamlessly!
  const modifySceneDuration = (idx: number, delta: number) => {
    const updated = [...project.segments];
    const seg = updated[idx];
    if (!seg) return;

    const oldDur = seg.endTime - seg.startTime;
    const newDur = Math.max(1.5, parseFloat((oldDur + delta).toFixed(1)));
    const diff = newDur - oldDur;

    seg.endTime = Math.round((seg.startTime + newDur) * 10) / 10;

    // Cascade offset timings forward
    for (let i = idx + 1; i < updated.length; i++) {
      updated[i].startTime = Math.round((updated[i].startTime + diff) * 10) / 10;
      updated[i].endTime = Math.round((updated[i].endTime + diff) * 10) / 10;
    }

    setProject(prev => ({ ...prev, segments: updated }));
    
    // Auto sync playhead
    if (currentTime >= seg.endTime && idx === activeIdx) {
      setCurrentTime(seg.startTime);
    }
  };

  // Change individual slide order (Move slide left or right in sequence)
  const shiftSceneOrder = (idx: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= project.segments.length) return;

    const updated = [...project.segments];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;

    // Recalculate all segment timing boundaries from scratch starting from 0s sequentially
    let curr = 0;
    const realigned = updated.map(s => {
      const d = s.endTime - s.startTime;
      const res = { ...s, startTime: curr, endTime: curr + d };
      curr += d;
      return res;
    });

    setProject(prev => ({ ...prev, segments: realigned }));
    setActiveIdx(targetIdx);
    setCurrentTime(realigned[targetIdx].startTime);
  };

  const addNewSegmentAtEnd = () => {
    const lastSeg = project.segments[project.segments.length - 1];
    const newStart = lastSeg ? lastSeg.endTime : 0;
    const newEnd = newStart + 8;

    const newSeg: VideoSegment = {
      id: `seg-user-${Date.now()}`,
      startTime: newStart,
      endTime: newEnd,
      text: "Scrivi un titolo per questa nuova scena",
      narrationText: "Qui puoi digitare testi e recitare il copione desiderato.",
      imageUrl: "https://picsum.photos/seed/scene_index_" + (project.segments.length + 1) + "/960/540",
      stickers: []
    };

    setProject(prev => ({
      ...prev,
      segments: [...prev.segments, newSeg]
    }));
    setActiveIdx(project.segments.length);
    setCurrentTime(newStart);
  };

  const duplicateActiveSegment = () => {
    const sourceSeg = project.segments[activeIdx];
    if (!sourceSeg) return;

    const dur = sourceSeg.endTime - sourceSeg.startTime;
    const newStart = sourceSeg.endTime;
    const newEnd = newStart + dur;

    const nextSeg: VideoSegment = {
      ...sourceSeg,
      id: `seg-dup-${Date.now()}`,
      startTime: newStart,
      endTime: newEnd,
      text: `${sourceSeg.text} (Copia)`,
      stickers: sourceSeg.stickers ? JSON.parse(JSON.stringify(sourceSeg.stickers)) : []
    };

    const updatedSegments = [...project.segments];
    
    // Insert immediately after activeIdx
    updatedSegments.splice(activeIdx + 1, 0, nextSeg);

    // Cascade shift all later segments
    for (let i = activeIdx + 2; i < updatedSegments.length; i++) {
      updatedSegments[i].startTime += dur;
      updatedSegments[i].endTime += dur;
    }

    setProject(prev => ({ ...prev, segments: updatedSegments }));
    setActiveIdx(activeIdx + 1);
    setCurrentTime(newStart);
  };

  const deleteSegmentAt = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (project.segments.length <= 1) {
      alert("Il video deve contenere almeno una scena principale.");
      return;
    }
    
    const filtered = project.segments.filter((_, i) => i !== idx);
    
    // Realign boundaries sequentially
    let curr = 0;
    const realigned = filtered.map(s => {
      const d = s.endTime - s.startTime;
      const res = { ...s, startTime: curr, endTime: curr + d };
      curr += d;
      return res;
    });

    setProject(prev => ({ ...prev, segments: realigned }));
    // Move active viewport safely
    const nextIdx = Math.max(0, idx - 1);
    setActiveIdx(nextIdx);
    setCurrentTime(realigned[nextIdx]?.startTime || 0);
    setSelectedStickerId(null);
  };

  const exportProjectJson = () => {
    const fileContent = JSON.stringify(project, null, 2);
    const blob = new Blob([fileContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.title.toLowerCase().replace(/\s+/g, "_")}_script_progetto.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportProjectJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.segments)) {
          setProject(parsed);
          setActiveIdx(0);
          setCurrentTime(0);
          setIsPlaying(false);
          setSelectedStickerId(null);
        } else {
          alert("Questo progetto non sembra formattato correttamente.");
        }
      } catch (err) {
        alert("Errore nella lettura del file JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const startScreenCaptureExporter = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert("La cattura video dello schermo richiede l'apertura a schermo intero cliccando sul link verde 'Shared App URL' o 'Apri applicazione'!");
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: true
      });

      recordedChunksRef.current = [];
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      } catch (e) {
        try {
          mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        } catch (e2) {
          mediaRecorder = new MediaRecorder(stream);
        }
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_video_finale.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      // Rewind to start
      setCurrentTime(0);
      setActiveIdx(0);
      setIsPlaying(true);
    } catch (err) {
      console.warn("Registrazione cancellata:", err);
    }
  };

  const stopScreenCaptureExporter = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleProjectCreated = (newProj: VideoProject) => {
    setProject(newProj);
    setActiveIdx(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setSelectedStickerId(null);
  };

  const currentSegment = project.segments[activeIdx] || project.segments[0];
  const activeSticker = currentSegment?.stickers?.find(s => s.id === selectedStickerId);

  // Sorting of stickers by custom zIndex
  const sortedStickers = currentSegment?.stickers 
    ? [...currentSegment.stickers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
    : [];

  return (
    <div id="synchro-base-container" className="h-screen w-full flex flex-col bg-[#0b0b0e] text-[#d6d3dc] font-sans overflow-hidden select-none">
      
      {/* 1. COMPACT MASTER BAR NAVBAR */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#111115] shrink-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg">
            <Film className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-white leading-none tracking-tight text-xs flex items-center gap-1.5">
              SynchroStream Pro v3.0
              <span className="bg-emerald-500/10 text-emerald-400 text-[8.5px] font-bold px-1.5 py-0.2 rounded border border-emerald-500/20">EDITING SEMPLICISSIMO</span>
            </span>
            <span className="text-[9px] text-indigo-300 font-semibold italic mt-0.5 max-w-[280px] truncate">
              Editing: {project.title}
            </span>
          </div>
        </div>

        {/* Hidden project schema loader */}
        <input 
          type="file" 
          ref={fileInputRef} 
          accept=".json" 
          onChange={handleImportProjectJson} 
          className="hidden" 
        />

        {/* Global actions row */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] font-bold rounded-lg text-slate-100 border border-white/5 transition flex items-center gap-1.5"
            title="Inizia un nuovo racconto da zero o partendo da un template"
            id="nv-create"
          >
            <Plus className="h-4 w-4 text-emerald-400" />
            Nuovo Racconto
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] font-bold rounded-lg text-slate-100 border border-white/5 transition flex items-center gap-1.5"
            title="Carica un file di salvataggio .json per continuare a modificare"
            id="nv-import"
          >
            <Upload className="h-4 w-4 text-indigo-400" />
            Apri Progetto (.json)
          </button>
          
          <button 
            onClick={exportProjectJson}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-705 text-[11px] font-bold rounded-lg text-slate-200 border border-white/5 transition flex items-center gap-1.5"
            title="Salva temporaneamente il lavoro sul computer in formato modificabile"
            id="nv-export"
          >
            <Download className="h-4 w-4 text-indigo-400" />
            Salva File (.json)
          </button>

          {/* Recorder Cinema Toggle */}
          <button 
            onClick={() => {
              setIsCinemaMode(true);
              setIsPlaying(false);
            }}
            className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-lg text-[11px] font-extrabold transition flex items-center gap-1.5 shadow-md shadow-indigo-950/40"
            title="Ingrandisci l'anteprima per registrare il video esportato in alta definizione"
            id="nv-cinema"
          >
            <Maximize2 className="h-4 w-4 text-yellow-300" />
            Schermo Intero / Registra Video 🎬
          </button>
        </div>
      </header>

      {/* 2. DUAL-WINDOW PRIMARY WORKSPACE CARD */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* ================= LEFT/CENTER STAGE WINDOW (Occupies main space) ================= */}
        <main className="flex-1 bg-[#09090b] flex flex-col items-center justify-between p-4 relative overflow-y-auto">
          
          {/* Informative Helper block */}
          <div className="w-full flex justify-between items-center text-[10px] text-slate-400 bg-slate-900/40 border border-white/5 p-2 rounded-xl shrink-0 gap-2 mb-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
              <span><strong>💡 Drag-and-Drop:</strong> Ora puoi fare clic direttamente sui personaggi nel riquadro per spostarli trascinandoli!</span>
            </span>
            {selectedStickerId && (
              <span className="bg-[#121115] text-[#a5b4fc] border border-indigo-500/20 px-2 py-0.5 rounded font-bold">
                Elemento Selezionato ({activeSticker?.type === 'custom_image' ? 'Personaggio PNG' : activeSticker?.value})
              </span>
            )}
          </div>

          {/* ULTRA GIANT CINEMA CONSOLE PLAYER */}
          <div className="flex-1 flex items-center justify-center w-full min-h-[340px] py-3 relative overflow-visible">
            <div
              ref={stageRef}
              className={`relative bg-[#040405] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] border-2 border-slate-700 select-none touch-none overflow-hidden transition-all duration-300 w-full ${
                project.aspectRatio === '16:9' 
                  ? 'max-w-[860px] aspect-video' 
                  : project.aspectRatio === '1:1' 
                    ? 'max-w-[500px] aspect-square' 
                    : 'max-w-[280px] aspect-[9/16]'
              }`}
            >
              {currentSegment ? (
                <div className="absolute inset-0 h-full w-full select-none" id="editing-video-board">
                  
                  {/* Aspect Cover Landscape Image */}
                  <img
                    src={currentSegment.imageUrl}
                    alt="Current Scene Background"
                    className="h-full w-full object-cover select-none pointer-events-none"
                  />
                  
                  {/* Active Screen Subtitle / Narrator Script overlay */}
                  <div className="absolute bottom-6 left-0 right-0 px-6 text-center z-10 pointer-events-none">
                    <span className="inline-block bg-black/85 backdrop-blur-md border border-white/10 text-white font-extrabold px-4 py-2 rounded-xl text-base md:text-lg tracking-wide shadow-2xl">
                      {currentSegment.text}
                    </span>
                  </div>

                  {/* Render sequential customized visual stickers */}
                  {sortedStickers.map((st) => {
                    const isStickerSelected = st.id === selectedStickerId;
                    return (
                      <div
                        key={st.id}
                        onPointerDown={(e) => handleStickerPointerDown(e, st.id)}
                        className={`absolute flex flex-col items-center justify-center cursor-move touch-none select-none transition-shadow ${
                          isStickerSelected ? 'ring-2 ring-indigo-500 bg-indigo-500/10 rounded-xl p-1.5 z-20 shadow-2xl scale-102' : 'hover:scale-102 z-10'
                        }`}
                        style={{
                          left: `${st.x}%`,
                          top: `${st.y}%`,
                          transform: `translate(-50%, -50%) rotate(${st.rotation}deg)`,
                          zIndex: st.zIndex || 10,
                          opacity: st.opacity !== undefined ? st.opacity / 100 : 1,
                          filter: `
                            ${st.brightness !== undefined ? `brightness(${st.brightness}%)` : ''}
                            ${st.contrast !== undefined ? `contrast(${st.contrast}%)` : ''}
                            ${st.hueRotate !== undefined ? `hue-rotate(${st.hueRotate}deg)` : ''}
                          `.trim() || undefined,
                        }}
                      >
                        {st.type === 'speech_bubble' ? (
                          // Speech dialogue balloon with interactive sizing and flipping support
                          <div 
                            className={`relative bg-white text-black font-extrabold p-3 px-5 rounded-2xl shadow-2xl border-2 border-slate-300 text-center select-none leading-tight font-sans ${st.flipped ? '[transform:scaleX(-1)]' : ''}`}
                            style={{ 
                              width: `${st.size}px`,
                              fontSize: `${Math.max(10, Math.round(st.size / 10))}px`
                            }}
                          >
                            <span className="block">{st.value}</span>
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-r border-b-2 border-slate-300 rotate-45"></div>
                          </div>
                        ) : st.type === 'custom_image' ? (
                          // Personal PNG Drawing Uploader with horizontal mirroring flip support
                          <img
                            src={st.value}
                            alt="Custom sticker"
                            style={{ 
                              width: `${st.size}px`, 
                              height: 'auto',
                              transform: st.flipped ? 'scaleX(-1)' : 'none'
                            }}
                            className="object-contain pointer-events-none drop-shadow-2xl max-h-[300px] max-w-[300px]"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          // Static Emoji character with horizontal mirroring flip support
                          <div 
                            style={{ 
                              fontSize: `${st.size}px`,
                              transform: st.flipped ? 'scaleX(-1)' : 'none'
                            }}
                            className="leading-none drop-shadow-2xl select-none"
                          >
                            {st.value}
                          </div>
                        )}
                        
                        {/* Selector indicator & Interactive Stage Handles */}
                        {isStickerSelected && (
                          <>
                            {/* Accent dashed bounding box */}
                            <div className="absolute -inset-3 rounded-xl border-2 border-dashed border-indigo-400 pointer-events-none animate-pulse" />
                            
                            {/* Quick deletion Stage handle */}
                            <button
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                deleteSelectedSticker();
                              }}
                              className="absolute -top-5.5 -right-5.5 w-6 h-6 bg-rose-600 hover:bg-rose-500 border border-rose-400 text-white rounded-full flex items-center justify-center shadow-lg transition transform hover:scale-110 active:scale-95 pointer-events-auto z-30 cursor-pointer"
                              title="Elimina"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>

                            {/* Quick mirror/flip Stage handle */}
                            <button
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                updateSelectedStickerProps({ flipped: !st.flipped });
                              }}
                              className="absolute -top-5.5 -left-5.5 w-6 h-6 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400 text-white rounded-full flex items-center justify-center shadow-lg transition transform hover:scale-110 active:scale-95 pointer-events-auto z-30 cursor-pointer"
                              title="Specchia"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>

                            {/* Aesthetic corner points */}
                            <div className="absolute -bottom-3.5 -left-3.5 w-2 h-2 bg-white border border-indigo-500 rounded-full" />
                            <div className="absolute -bottom-3.5 -right-3.5 w-2 h-2 bg-white border border-indigo-500 rounded-full" />
                          </>
                        )}
                      </div>
                    );
                  })}
                  
                </div>
              ) : (
                <div className="h-full w-full bg-neutral-900 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <AlertTriangle className="h-8 w-8 text-slate-600" />
                  <span className="text-xs">Nessuna scena caricata nel tuo progetto attuale.</span>
                </div>
              )}
            </div>
          </div>

          {/* TIMELINE COORDINATION CONTROL DASHBOARD */}
          <div className="w-full max-w-2xl bg-[#111116] border border-white/5 p-4 rounded-2xl shadow-2xl space-y-3 shrink-0">
            
            {/* Top row seekers */}
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 bg-slate-950/50 p-2 rounded-xl">
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-indigo-400">POSIZIONE ATTUALE:</span>
                <span className="text-white text-xs">{currentTime.toFixed(1)}s</span>
              </div>
              <div className="h-4 w-px bg-white/5"></div>
              <div className="flex items-center gap-1 font-semibold">
                <span>Scena {activeIdx + 1} di {project.segments.length}</span>
                <span className="text-slate-600">({(currentSegment ? (currentSegment.endTime - currentSegment.startTime).toFixed(1) : 0)}s)</span>
              </div>
              <div className="h-4 w-px bg-white/5"></div>
              <div className="font-mono">
                <span>Totale:</span> <span className="text-white">{totalDuration.toFixed(1)}s</span>
              </div>
            </div>

            {/* Seeking slider bar */}
            <div className="relative group/seeker">
              <input
                type="range"
                min="0"
                max={totalDuration}
                step="0.1"
                className="w-full accent-rose-500 bg-slate-900 h-2 py-1 rounded cursor-pointer"
                value={currentTime}
                onChange={(e) => {
                  const targetTime = parseFloat(e.target.value);
                  setCurrentTime(targetTime);
                  
                  // Shift corresponding active segment
                  const matched = project.segments.findIndex(s => targetTime >= s.startTime && targetTime < s.endTime);
                  if (matched !== -1 && matched !== activeIdx) {
                    setActiveIdx(matched);
                    if (isPlaying) triggerCustomAudioOrTts(matched);
                  }
                }}
              />
              {/* Highlight boundaries pins */}
              <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none flex">
                {project.segments.map((s, i) => (
                  <div 
                    key={s.id} 
                    className="absolute h-2 w-0.5 bg-slate-700/50" 
                    style={{ left: `${(s.startTime / totalDuration) * 100}%` }}
                    title={`Scena ${i+1}`}
                  />
                ))}
              </div>
            </div>

            {/* Multi-action command buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              
              <div className="flex items-center gap-2">
                <button
                  onClick={stopAllPlaying}
                  className="p-2 py-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition flex items-center gap-1 text-[11px] font-bold"
                  title="Riavvia la storia da zero"
                >
                  <Square className="h-3.5 w-3.5 fill-slate-400" />
                  Reset
                </button>

                <button
                  onClick={togglePlay}
                  className="px-4 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition hover:scale-105 active:scale-95 gap-1.5 text-xs font-black shadow shadow-indigo-900"
                  title={isPlaying ? "Metti in pausa" : "Fai partire audio e doppiaggio"}
                >
                  {isPlaying ? <Pause className="h-4.5 w-4.5" /> : <Play className="h-4.5 w-4.5 translate-x-0.5" />}
                  {isPlaying ? "Pausa" : "Ascolta Video"}
                </button>
              </div>

              {/* Core segment structure editing tools: DUPLICATE, CRITICAL SCISSORS (SPLIT) */}
              <div className="flex items-center gap-1.5">
                
                {/* 1. SCISSORS TAGLIA (SPLIT HERE) */}
                <button
                  onClick={splitActiveScene}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-705 text-xs font-extrabold text-[#fecdd3] hover:text-rose-300 rounded-lg border border-rose-500/20 transition flex items-center gap-1.5"
                  title="Taglia/Dividi la scena attiva in due distinte nel secondo temporale in cui si trova la testina"
                >
                  <Scissors className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                  ✂️ Taglia Scena Qui
                </button>

                {/* 2. DUPLICATE SCENE */}
                <button
                  onClick={duplicateActiveSegment}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-705 text-xs font-semibold text-slate-300 rounded-lg border border-white/5 transition flex items-center gap-1.5"
                  title="Duplica interamente la scena attiva (con lo stesso sfondo e tutti gli sticker)"
                >
                  <Copy className="h-3.5 w-3.5 text-indigo-400" />
                  Duplica Scena
                </button>

                {/* 3. ADD SCENE AT END */}
                <button
                  onClick={addNewSegmentAtEnd}
                  className="px-3 py-1.5 bg-indigo-900/40 hover:bg-indigo-900 text-xs font-extrabold text-indigo-300 rounded-lg border border-indigo-500/30 transition flex items-center gap-1.5"
                  title="Aggiungi una nuova scena bianca alla fine della storia"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nuova Scena
                </button>
              </div>

            </div>

          </div>

        </main>

        {/* ================= RIGHT INSPECTOR CONTROL PANEL ================= */}
        <aside className="w-[360px] border-l border-white/10 bg-[#0f0f13] flex flex-col shrink-0 overflow-y-auto z-20">
          
          {/* Tabs Menu Selection */}
          <div className="grid grid-cols-3 border-b border-white/5 bg-[#141419] p-1 gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('scene')}
              className={`py-2 rounded-lg text-[11px] font-extrabold transition flex flex-col items-center justify-center gap-1 ${
                activeTab === 'scene' ? 'bg-[#1e1e26] text-indigo-300 border border-white/5' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Type className="h-3.5 w-3.5" />
              Sfondo & Testi
            </button>
            <button
              onClick={() => setActiveTab('characters')}
              className={`py-2 rounded-lg text-[11px] font-extrabold transition flex flex-col items-center justify-center gap-1 ${
                activeTab === 'characters' ? 'bg-[#1e1e26] text-indigo-300 border border-white/5' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smile className="h-3.5 w-3.5" />
              Personaggi ({currentSegment?.stickers?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('project')}
              className={`py-2 rounded-lg text-[11px] font-extrabold transition flex flex-col items-center justify-center gap-1 ${
                activeTab === 'project' ? 'bg-[#1e1e26] text-indigo-300 border border-white/5' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              Musica e Regia
            </button>
          </div>

          <div className="flex-1 p-4 space-y-4 text-xs select-text">
            
            {/* ================= TAB 1: SCENE DATA EDITOR ================= */}
            {activeTab === 'scene' && (
              <div className="space-y-4">
                
                {/* Visual Section Timing */}
                <div className="bg-[#141418] p-3 rounded-xl border border-white/5 space-y-3">
                  <span className="text-[10px] text-indigo-400 font-extrabold uppercase block">⏱️ DURATA DI QUESTA SCENA</span>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400 font-medium">Lunghezza fissa:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => modifySceneDuration(activeIdx, -1.0)}
                        className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black rounded flex items-center justify-center cursor-pointer"
                        title="Riduci di un secondo"
                      >
                        -
                      </button>
                      
                      <span className="px-3 py-1 bg-black text-white rounded font-mono font-bold text-xs min-w-[50px] text-center">
                        {(currentSegment ? currentSegment.endTime - currentSegment.startTime : 0).toFixed(1)}s
                      </span>

                      <button
                        onClick={() => modifySceneDuration(activeIdx, 1.0)}
                        className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black rounded flex items-center justify-center cursor-pointer"
                        title="Aumenta di un secondo"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <p className="text-[9.5px] text-slate-500 leading-snug font-medium border-t border-white/5 pt-1.5">
                    Modificare la durata qui sposta automaticamente tutte le scene successive senza creare fastidiosi buchi nella timeline!
                  </p>
                </div>

                {/* Texts entry with language */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 font-extrabold block">
                    💬 TESTO SOTTOTITOLO SULLO SCHERMO:
                  </label>
                  <textarea
                    className="w-full min-h-[50px] bg-[#07070a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                    value={currentSegment ? currentSegment.text : ""}
                    onChange={(e) => updateSegmentData(currentSegment.id, { text: e.target.value })}
                    placeholder="Esempio: Una galassia piena di stelle scintillanti..."
                  />
                  <p className="text-[9px] text-slate-500">I caratteri di tutte le lingue del mondo sono completamente supportati.</p>
                </div>

                {/* Narrator Voice TTS script */}
                <div className="space-y-1.5 pt-2.5 border-t border-white/5">
                  <label className="text-[11px] text-slate-300 font-extrabold block">
                    🎙️ AUDIO VOCALE SCRIPT (DOPPIAGGIO):
                  </label>
                  <textarea
                    className="w-full bg-[#07070a] border border-white/10 rounded-lg px-2 py-1.5 text-[10.5px] text-slate-300 focus:outline-none focus:border-indigo-500"
                    value={currentSegment ? currentSegment.narrationText : ""}
                    onChange={(e) => updateSegmentData(currentSegment.id, { narrationText: e.target.value })}
                    placeholder="Testo che verrà doppiato a voce alta dal sintetizzatore..."
                  />
                  
                  {/* Vocal Preview Play Audition Button */}
                  {currentSegment && (
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          initAudioCtx();
                          if ('speechSynthesis' in window) {
                            window.speechSynthesis.resume();
                          }
                        } catch (e) {}
                        triggerCustomAudioOrTts(activeIdx);
                      }}
                      className="w-full py-1.5 bg-[#14141d] hover:bg-slate-800 border border-indigo-500/30 hover:border-indigo-400/50 rounded-lg text-[10px] text-indigo-200 font-extrabold flex items-center justify-center gap-1 cursor-pointer transition shadow"
                    >
                      🔊 Ascolta Doppiaggio Vocale / Audio Corrente
                    </button>
                  )}
                  
                  {/* Local Personal Voice Track Uploader */}
                  <div className="p-3 rounded-xl border border-dashed border-indigo-500/20 bg-slate-950 hover:border-indigo-500/50 transition text-center relative mt-1">
                    <input 
                      type="file" 
                      accept="audio/*"
                      onChange={(e) => handleLocalAudioUpload(e, currentSegment.id)}
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      title="Carica un brano, un'audio-guida o una registrazione personale"
                      id="uploader-segment-audio"
                    />
                    <Mic className="h-4 w-4 mx-auto mb-1 text-[#a5b4fc]" />
                    <span className="text-[10px] text-slate-200 block font-bold truncate leading-normal">
                      {currentSegment?.audioFileName ? `🎵 ${currentSegment.audioFileName}` : "Usa il tuo Doppiaggio personale (Carica MP3)"}
                    </span>
                    <span className="text-[8px] text-slate-500 block">Sostituisce il sintetizzatore offline locale</span>
                  </div>

                  {audioError && <p className="text-[9px] text-rose-400 font-bold">⚠️ {audioError}</p>}
                </div>

                {/* Primary scene background photo */}
                <div className="space-y-1.5 pt-3 border-t border-white/5">
                  <label className="text-[11px] text-slate-300 font-extrabold block">
                    🖼️ IMMAGINE DI SFONDO DI QUESTA SCENA:
                  </label>
                  
                  {/* Drag drop area */}
                  <div className="p-3 rounded-xl border border-dashed border-white/10 bg-[#070709] transition text-center relative hover:border-indigo-500/30">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleLocalImageUpload(e, currentSegment.id)}
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      title="Trascina o scegli un file locale"
                      id="uploader-segment-image"
                    />
                    <ImageIcon className="h-4.5 w-4.5 mx-auto mb-1 text-[#a5b4fc]" />
                    <span className="text-[10px] text-slate-300 block font-bold truncate">
                      {currentSegment?.imageFileName ? `📷 ${currentSegment.imageFileName}` : 'Carica tuo Sfondo (PNG/JPG)'}
                    </span>
                    <span className="text-[8.5px] text-slate-500 block">Massima fluidità nella riproduzione</span>
                  </div>

                  {imageError && <p className="text-[9px] text-rose-400 font-bold">⚠️ {imageError}</p>}

                  {/* Direct Web link fallback */}
                  <div>
                    <span className="text-[9px] text-slate-400 font-medium">O incolla indirizzo URL esterno (Web):</span>
                    <input 
                      type="text" 
                      className="w-full bg-[#07070a] border border-[#212128] rounded px-2.5 py-1 text-[10px] text-slate-300 focus:outline-none" 
                      value={currentSegment?.imageUrl?.startsWith("data:") ? "" : currentSegment?.imageUrl}
                      onChange={(e) => updateSegmentData(currentSegment.id, { imageUrl: e.target.value || "https://picsum.photos/seed/nature/960/540" })}
                      placeholder="Incolla link https://..."
                    />
                  </div>
                </div>

              </div>
            )}

            {/* ================= TAB 2: PERSONAL CHARACTERS & STICKERS ================= */}
            {activeTab === 'characters' && (
              <div className="space-y-4">
                
                {/* Visual inventory upload */}
                <div className="bg-[#121217] p-3 rounded-xl border border-indigo-500/10 space-y-2">
                  <span className="text-[10.5px] text-[#a5b4fc] font-black uppercase block flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                    AGGIUNGI TUO PERSONAGGIO PNG/JPG:
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {/* Local File picker */}
                    <div className="relative border-2 border-dashed border-indigo-500/30 rounded-lg bg-indigo-950/20 p-2.5 text-center hover:border-indigo-500/60 transition cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCustomStickerUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        title="Seleziona la foto del personaggio trasparente o ricalco"
                        id="character-custom-file-input"
                      />
                      <Upload className="h-4.5 w-4.5 mx-auto mb-1 text-indigo-400" />
                      <span className="text-[9px] text-slate-300 font-extrabold block leading-normal">Carica PNG/JPG</span>
                      <span className="text-[8px] text-slate-500 block leading-none">sfondo trasparente</span>
                    </div>

                    {/* URL Direct Link box */}
                    <div className="flex flex-col justify-between gap-1">
                      <input
                        type="text"
                        className="w-full bg-[#08080a] border border-white/10 rounded px-1.5 py-1 text-[10px] text-slate-200"
                        placeholder="Incolla Link Immagine..."
                        value={customStickerUrl}
                        onChange={(e) => setCustomStickerUrl(e.target.value)}
                      />
                      <button
                        onClick={handleAddCustomStickerByUrl}
                        className="w-full py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-[9.5px] font-bold text-white transition cursor-pointer"
                        type="button"
                      >
                        Carica da URL link
                      </button>
                    </div>
                  </div>

                  {stickerError && (
                    <p className="text-[9px] text-rose-400 font-bold">⚠️ {stickerError}</p>
                  )}

                  {/* GALLERY OF LOADED STICKERS */}
                  {uploadedCharacters.length > 0 && (
                    <div className="border-t border-white/5 pt-2 mt-1">
                      <span className="text-[9px] text-slate-400 font-bold block mb-1">I tuoi personaggi memorizzati (Clicca per inserire):</span>
                      <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-1 bg-black/40 rounded">
                        {uploadedCharacters.map((b64, index) => (
                          <div
                            key={index}
                            onClick={() => addStickerToActiveSegment('custom_image', b64)}
                            className="w-10 h-10 border border-indigo-500/30 hover:border-indigo-500 rounded bg-[#09090b] cursor-pointer overflow-hidden p-0.5 relative group shrink-0 flex items-center justify-center transition"
                            title="Fai click per timbrare un altro elemento di questo personaggio nello spazio"
                          >
                            <img src={b64} alt="" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <span className="text-[7px] text-white font-bold font-mono">+ STAMP</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* Direct Dialogue bubble creator inside UI (no iframe blocking popup prompt!) */}
                <div className="space-y-2 bg-indigo-950/25 p-3 rounded-xl border border-indigo-500/10">
                  <span className="text-[10px] text-indigo-300 font-extrabold uppercase block flex items-center gap-1">
                    🗣️ CREATORE DIALOGO FUMETTO:
                  </span>
                  
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      className="w-full bg-[#07070a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                      placeholder="Crea fumetto per i personaggi..."
                      value={speechBubbleText}
                      onChange={(e) => setSpeechBubbleText(e.target.value)}
                    />
                    
                    <button
                      onClick={() => {
                        if (speechBubbleText.trim()) {
                          addStickerToActiveSegment('speech_bubble', speechBubbleText.trim());
                        }
                      }}
                      className="w-full py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      type="button"
                    >
                      💬 Inserisci Nuvoletta Dialogo
                    </button>
                  </div>
                </div>

                {/* Preset Fast select characters */}
                <div className="space-y-2 bg-[#121217]/50 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-300 font-extrabold block uppercase">🎭 PERSONAGGI EXTRA VELOCI:</span>
                  <div className="grid grid-cols-2 gap-1">
                    {CHARACTER_PRESETS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => addStickerToActiveSegment('character', c.emoji)}
                        className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700/80 hover:text-white rounded-lg text-xs flex items-center gap-1.5 font-bold transition text-left"
                      >
                        <span className="text-sm select-none">{c.emoji}</span>
                        <span className="text-[9px] text-slate-300">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Symbols presets */}
                <div className="space-y-1 bg-slate-900/30 p-2.5 rounded border border-white/5">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">SIMBOLI / EFFETTI RAPIDI:</span>
                  <div className="flex flex-wrap gap-1">
                    {[...STICKER_CATEGORIES.emotions, ...STICKER_CATEGORIES.nature].map(emo => (
                      <button
                        key={emo}
                        onClick={() => addStickerToActiveSegment('emoji', emo)}
                        className="w-7 h-7 bg-[#111116] hover:bg-indigo-600/30 text-xs rounded transition flex items-center justify-center"
                      >
                        {emo}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ACTIVE SELECTED STICKER visual modifier parameters (Visible only when an item is selected!) */}
                {activeSticker ? (
                  <div className="space-y-4 p-3.5 bg-indigo-950/20 rounded-xl border-2 border-indigo-500/30 text-[10px] animate-fade-in">
                    
                    <div className="flex justify-between items-center font-black text-slate-100 border-b border-white/10 pb-2">
                      <span className="text-[10.5px] text-indigo-300">CONFIGURA STICKER SELEZIONATO</span>
                      <button 
                        onClick={deleteSelectedSticker} 
                        className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/20 transition shrink-0 cursor-pointer text-[9px]"
                      >
                        <Trash2 className="h-2.5 w-2.5" /> Rimuovi
                      </button>
                    </div>

                    {/* Dialogue message edit */}
                    {activeSticker.type === 'speech_bubble' && (
                      <div className="space-y-1 bg-white/5 p-2 rounded-lg border border-white/5">
                        <span className="font-bold text-slate-200 block">💬 Testo fumetto scritto:</span>
                        <input
                          type="text"
                          className="w-full bg-[#08080a] border border-white/20 rounded px-2 py-1.5 text-white font-extrabold text-xs focus:ring-1 focus:ring-indigo-500"
                          value={activeSticker.value}
                          onChange={(e) => updateSelectedStickerProps({ value: e.target.value })}
                        />
                      </div>
                    )}

                    {/* Mirror Horizontal flipping character checkbox */}
                    <div className="flex items-center justify-between py-1 bg-[#100f14] p-2 rounded-lg border border-white/5 mt-1">
                      <span className="font-bold text-indigo-200">Specchia / Ruota l'immagine:</span>
                      <button
                        type="button"
                        onClick={() => updateSelectedStickerProps({ flipped: !activeSticker.flipped })}
                        className={`px-3 py-1 rounded text-[9px] font-black uppercase transition cursor-pointer ${
                          activeSticker.flipped ? 'bg-indigo-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {activeSticker.flipped ? 'SPECCHIATO 🟢' : 'NORMALE'}
                      </button>
                    </div>

                    {/* Layer Position Z-Order */}
                    <div className="bg-[#100f14] p-2 rounded-lg border border-white/5 space-y-1">
                      <span className="font-bold text-indigo-200 block">Posizionamento Livello (Layer):</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => updateSelectedStickerProps({ zIndex: (activeSticker.zIndex || 0) + 1 })}
                          className="py-1 bg-slate-800 hover:bg-slate-700 text-[9px] font-bold text-slate-300 rounded flex items-center justify-center gap-0.5 cursor-pointer border border-white/5"
                        >
                          <Layers className="h-2.5 w-2.5 text-indigo-400" /> Primo Piano (Su)
                        </button>
                        <button
                          onClick={() => updateSelectedStickerProps({ zIndex: Math.max(0, (activeSticker.zIndex || 0) - 1) })}
                          className="py-1 bg-slate-800 hover:bg-slate-700 text-[9px] font-bold text-slate-300 rounded flex items-center justify-center gap-0.5 cursor-pointer border border-white/5"
                        >
                          <Layers className="h-2.5 w-2.5 text-slate-500" /> Sotto (Giù)
                        </button>
                      </div>
                    </div>

                    {/* Sizing, Rotation, Opacity & Filter Sliders */}
                    <div className="space-y-2.5 bg-[#0e0d12] p-2.5 rounded-lg border border-white/5">
                      
                      <div className="space-y-1">
                        <div className="flex justify-between font-bold text-slate-300">
                          <span>Dimensione (Size):</span>
                          <span className="text-indigo-300">{activeSticker.size}px</span>
                        </div>
                        <input
                          type="range"
                          min="30"
                          max="300"
                          className="w-full accent-indigo-500 bg-slate-900 h-1 rounded cursor-pointer"
                          value={activeSticker.size}
                          onChange={(e) => updateSelectedStickerProps({ size: parseInt(e.target.value) })}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between font-bold text-slate-300">
                          <span>Rotazione inclinatura:</span>
                          <span className="text-indigo-300">{activeSticker.rotation}°</span>
                        </div>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          className="w-full accent-indigo-500 bg-slate-900 h-1 rounded cursor-pointer"
                          value={activeSticker.rotation}
                          onChange={(e) => updateSelectedStickerProps({ rotation: parseInt(e.target.value) })}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between font-bold text-slate-300">
                          <span>Opacità (Trasparenza):</span>
                          <span className="text-indigo-300">{activeSticker.opacity ?? 100}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          className="w-full accent-indigo-500 bg-slate-900 h-1 rounded cursor-pointer"
                          value={activeSticker.opacity ?? 100}
                          onChange={(e) => updateSelectedStickerProps({ opacity: parseInt(e.target.value) })}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between font-bold text-slate-300">
                          <span>Tonalità Colore (Hue):</span>
                          <span className="text-indigo-300">{activeSticker.hueRotate ?? 0}°</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          className="w-full accent-indigo-500 bg-slate-900 h-1 rounded cursor-pointer"
                          value={activeSticker.hueRotate ?? 0}
                          onChange={(e) => updateSelectedStickerProps({ hueRotate: parseInt(e.target.value) })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-[8.5px] text-slate-400">
                            <span>Luminosità:</span>
                            <span>{activeSticker.brightness ?? 100}%</span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="200"
                            className="w-full accent-indigo-500 bg-slate-900 h-1 rounded pointer-events-auto"
                            value={activeSticker.brightness ?? 100}
                            onChange={(e) => updateSelectedStickerProps({ brightness: parseInt(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-[8.5px] text-slate-400">
                            <span>Contrasto:</span>
                            <span>{activeSticker.contrast ?? 100}%</span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="200"
                            className="w-full accent-indigo-500 bg-slate-900 h-1 rounded pointer-events-auto"
                            value={activeSticker.contrast ?? 100}
                            onChange={(e) => updateSelectedStickerProps({ contrast: parseInt(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Precision Nudge Joystick */}
                    <div className="bg-[#100f14] p-2.5 rounded-lg border border-white/5 space-y-2">
                      <span className="font-extrabold text-[#9fa6fc] block text-center uppercase tracking-normal text-[8.5px]">
                        🎯 Freccette Posizionamento di Precisione:
                      </span>
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => updateSelectedStickerProps({ y: Math.max(0, Math.round(((activeSticker.y ?? 50) - 1) * 10) / 10) })}
                          className="w-7 h-7 bg-slate-800 hover:bg-indigo-600 active:scale-90 text-[10px] text-white rounded-lg flex items-center justify-center font-bold cursor-pointer transition shadow border border-white/5 md:text-xs"
                          title="Sposta Su"
                        >
                          ▲
                        </button>
                        <div className="flex gap-4 my-1">
                          <button
                            onClick={() => updateSelectedStickerProps({ x: Math.max(0, Math.round(((activeSticker.x ?? 50) - 1) * 10) / 10) })}
                            className="w-7 h-7 bg-slate-800 hover:bg-indigo-600 active:scale-90 text-[10px] text-white rounded-lg flex items-center justify-center font-bold cursor-pointer transition shadow border border-white/5 md:text-xs"
                            title="Sposta a Sinistra"
                          >
                            ◀
                          </button>
                          <button
                            onClick={() => {
                              updateSelectedStickerProps({
                                opacity: 100,
                                rotation: 0,
                                brightness: 100,
                                contrast: 100,
                                hueRotate: 0,
                                flipped: false,
                                size: 100
                              });
                            }}
                            className="w-8 h-7 bg-indigo-900/40 hover:bg-slate-700 text-[8px] text-indigo-200 rounded-lg flex items-center justify-center font-black cursor-pointer transition border border-indigo-500/20"
                            title="Ripristina Valori"
                          >
                            RESET
                          </button>
                          <button
                            onClick={() => updateSelectedStickerProps({ x: Math.min(100, Math.round(((activeSticker.x ?? 50) + 1) * 10) / 10) })}
                            className="w-7 h-7 bg-slate-800 hover:bg-indigo-600 active:scale-90 text-[10px] text-white rounded-lg flex items-center justify-center font-bold cursor-pointer transition shadow border border-white/5 md:text-xs"
                            title="Sposta a Destra"
                          >
                            ▶
                          </button>
                        </div>
                        <button
                          onClick={() => updateSelectedStickerProps({ y: Math.min(100, Math.round(((activeSticker.y ?? 50) + 1) * 10) / 10) })}
                          className="w-7 h-7 bg-slate-800 hover:bg-indigo-600 active:scale-90 text-[10px] text-white rounded-lg flex items-center justify-center font-bold cursor-pointer transition shadow border border-white/5 md:text-xs"
                          title="Sposta Giù"
                        >
                          ▼
                        </button>
                      </div>
                    </div>

                    {/* Exact Numeric Coordinates Coordinates Inputs */}
                    <div className="grid grid-cols-2 gap-2 text-[8.5px] border-t border-white/10 pt-2 font-mono">
                      <div>
                        <span className="text-slate-400 block mb-0.5">X (%) Coordinata:</span>
                        <input
                          type="number"
                          step="0.1"
                          className="w-full bg-[#08080a] border border-white/10 p-1 text-indigo-300 text-center rounded text-[10px] font-bold"
                          value={activeSticker.x}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                            updateSelectedStickerProps({ x: val });
                          }}
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Y (%) Coordinata:</span>
                        <input
                          type="number"
                          step="0.1"
                          className="w-full bg-[#08080a] border border-white/10 p-1 text-indigo-300 text-center rounded text-[10px] font-bold"
                          value={activeSticker.y}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                            updateSelectedStickerProps({ y: val });
                          }}
                        />
                      </div>
                    </div>

                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 italic mt-2 bg-slate-950 p-2.5 rounded-xl border border-white/5 text-center leading-normal">
                    💡 <strong>Consiglio pratico:</strong> fai clic direttamente sui personaggi presenti sopra sullo stage video per sbloccare la rotazione, scala e lo specchio!
                  </p>
                )}
              </div>
            )}

            {/* ================= TAB 3: MASTER SETTINGS & MUSIC ================= */}
            {activeTab === 'project' && (
              <div className="space-y-4">
                
                {/* Global Settings */}
                <div className="space-y-3 bg-[#111116] p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-indigo-400 font-extrabold uppercase block">🎥 IMPOSTAZIONI PROIEZIONE VIDEO</span>
                  
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-300 font-semibold block">Proporzioni Formato (Aspect Ratio):</span>
                    <select
                      className="w-full bg-[#08080a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      value={project.aspectRatio}
                      onChange={(e) => setProject({ ...project, aspectRatio: e.target.value as any })}
                    >
                      <option value="16:9">Orizzontale standard (16:9)</option>
                      <option value="1:1">Quadrato Instagram (1:1)</option>
                      <option value="9:16">Verticale reels / TikTok (9:16)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-300 font-semibold block">Voce Doppiatore TTS offline:</span>
                    <select
                      className="w-full bg-[#08080a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      value={project.voiceName}
                      onChange={(e) => setProject({ ...project, voiceName: e.target.value })}
                    >
                      {SUPPORTED_VOICES.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 block">
                    <span className="text-[10px] text-slate-300 font-semibold block">Lingua Doppiaggi:</span>
                    <select
                      className="w-full bg-[#08080a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      value={project.language}
                      onChange={(e) => setProject({ ...project, language: e.target.value })}
                    >
                      <option value="it">Italiano (it-IT)</option>
                      <option value="en">English (en-US)</option>
                      <option value="es">Español (es-ES)</option>
                      <option value="fr">Français (fr-FR)</option>
                      <option value="de">Deutsch (de-DE)</option>
                      <option value="zh">中文 (zh-CN - Cinese)</option>
                      <option value="ja">日本語 (ja-JP - Giapponese)</option>
                      <option value="ko">한국어 (ko-KR - Coreano)</option>
                    </select>
                  </div>
                </div>

                {/* Synth Loop Controls */}
                <div className="bg-[#111116] p-3 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[10px] text-emerald-400 font-extrabold uppercase block flex items-center gap-1.5">
                    <Music className="h-4.5 w-4.5" />
                    MUSICA DI SOTTOFONDO CODIFICATA:
                  </span>
                  
                  <select
                    className="w-full bg-[#08080a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    value={project.bgMusic}
                    onChange={(e) => setProject({ ...project, bgMusic: e.target.value })}
                  >
                    {STOCK_MUSIC_TRACKS.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.style})</option>
                    ))}
                  </select>

                  <div className="space-y-1 mt-1">
                    <div className="flex justify-between text-[9.5px] text-slate-400 font-bold">
                      <span>Volume Sottofondo:</span>
                      <span>{Math.round(project.bgMusicVolume * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4.5 w-4.5 text-slate-500" />
                      <input
                        type="range"
                        min="0"
                        max="0.8"
                        step="0.05"
                        className="w-full accent-indigo-500 bg-slate-900 h-1 rounded"
                        value={project.bgMusicVolume}
                        onChange={(e) => setProject({ ...project, bgMusicVolume: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                {/* Help guide instructions */}
                <div className="p-3 bg-indigo-950/25 border border-indigo-500/10 rounded-xl space-y-1.5 text-[10px] text-indigo-300">
                  <span className="font-extrabold text-white flex items-center gap-1">
                    <Info className="h-3.5 w-3.5 text-indigo-400" />
                    COME FUNZIONA IL SISTEMA?
                  </span>
                  <p className="leading-normal">
                    SynchroStream è uno studio cinematografico autonomo che consente di progettare capitolo dopo capitolo, posizionare personaggi personalizzati PNG con trasparenze, e registrare il video finale.
                  </p>
                </div>

              </div>
            )}

          </div>

          {/* Quick interactive parameters footer */}
          <div className="p-3 bg-slate-950 border-t border-white/5 shrink-0 select-none text-[9px] text-slate-500 flex justify-between items-center text-center">
            <span>SynchroStream Engine v3 stable</span>
            <span>Made in Gemini Workspace</span>
          </div>

        </aside>

      </div>

      {/* ================= 3. UNIQUE SEQUENTIAL STORYBOARD SEQUENCE (Footer) ================= */}
      {/* Implements clear and precise sequential slide display, order modification & easy segment selection */}
      <footer className="h-32 bg-[#121217] border-t border-white/10 shrink-0 z-20 flex flex-col justify-between overflow-hidden">
        
        {/* Storyboard navbar */}
        <div className="h-7 border-b border-white/5 bg-[#141419] flex items-center justify-between px-4 text-[9px] font-mono select-none">
          <div className="flex items-center gap-2.5">
            <span className="text-indigo-400 font-black tracking-wider uppercase text-[9.5px]">🎞️ SEQUENZA STORYBOARD SCENE</span>
            <div className="text-slate-500">
              Usa le frecce per modificare l'ordine, clicca per selezionare ed aggiustare le durate!
            </div>
          </div>
          <div className="text-indigo-300 font-bold">
            Totale: {project.segments.length} scene ({totalDuration.toFixed(1)}s)
          </div>
        </div>

        {/* Dynamic Horizontal Previews Slider */}
        <div className="flex-1 overflow-x-auto p-2 flex items-center gap-3 bg-[#0a0a0d] visual-scroll">
          {project.segments.map((seg, idx) => {
            const isActive = idx === activeIdx;
            const sizeSeconds = seg.endTime - seg.startTime;
            
            return (
              <div
                key={seg.id}
                onClick={() => {
                  setActiveIdx(idx);
                  setCurrentTime(seg.startTime);
                  setSelectedStickerId(null);
                  if (isPlaying) triggerCustomAudioOrTts(idx);
                }}
                className={`flex-none w-48 p-1.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between group h-20 ${
                  isActive 
                    ? 'bg-indigo-600/10 border-indigo-400 ring-1 ring-indigo-500/20 shadow-lg' 
                    : 'bg-[#15151b] border-white/5 hover:border-slate-700 hover:bg-neutral-900/40'
                }`}
              >
                {/* Micro thumbnail & Index tag */}
                <div className="flex gap-2 items-start min-w-0">
                  <div className="w-16 h-10 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10 relative">
                    <img src={seg.imageUrl} alt="" className="w-full h-full object-cover select-none pointer-events-none" />
                    <div className="absolute top-0.5 left-0.5 bg-black/80 text-[7.5px] font-mono text-slate-200 px-1 rounded-sm">
                      {idx + 1}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`text-[9.5px] font-black leading-tight truncate ${isActive ? 'text-indigo-300' : 'text-slate-100'}`}>
                      {seg.text || '(Nessun Titolo)'}
                    </p>
                    <p className="text-[8.5px] text-slate-400 truncate italic mt-0.5">
                      "{seg.narrationText}"
                    </p>
                  </div>
                </div>

                {/* Sub row control markers */}
                <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 mt-1">
                  
                  {/* Shift Slide Sequence Button Tools */}
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); shiftSceneOrder(idx, 'left'); }}
                      disabled={idx === 0}
                      className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center cursor-pointer"
                      title="Sposta a sinistra nella sequenza"
                    >
                      &larr;
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); shiftSceneOrder(idx, 'right'); }}
                      disabled={idx === project.segments.length - 1}
                      className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center cursor-pointer"
                      title="Sposta a destra nella sequenza"
                    >
                      &rarr;
                    </button>
                  </div>

                  <span className="text-slate-400 font-bold bg-slate-950 px-1.5 py-0.2 rounded">
                    🕒 {sizeSeconds.toFixed(1)}s
                  </span>

                  {/* Remove segment action */}
                  <button
                    onClick={(e) => deleteSegmentAt(idx, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-rose-400 hover:text-rose-300 transition shrink-0 cursor-pointer text-[8px] font-bold bg-rose-500/10 rounded px-1"
                    title="Rimuovi integralmente questa scena"
                  >
                    Elimina ✕
                  </button>

                </div>

                {/* Focus progress border */}
                {isActive && (
                  <div className="absolute -bottom-1 left-2 right-2 h-0.5 bg-indigo-500 rounded-full" />
                )}
              </div>
            );
          })}
        </div>

      </footer>

      {/* ================= 4. CINEMATIC INSTRUCTIONAL FULLSCREEN OVERLAY ================= */}
      {isCinemaMode && (
        <div id="cinema-fullscreen-wrapper" className="fixed inset-0 bg-[#07070a] z-[100] flex flex-col items-center justify-between p-4 md:p-6 select-none font-sans overflow-hidden text-white">
          
          {/* Cinema Header */}
          <div className="w-full flex justify-between items-center border-b border-white/5 pb-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="bg-rose-600 animate-pulse text-white text-[9px] px-2 py-0.5 rounded font-black tracking-widest font-mono">MODALITÀ ANTEPRIMA HD</span>
              <h1 className="text-xs md:text-sm font-black text-slate-100 uppercase tracking-widest">{project.title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsCinemaMode(false);
                  setIsPlaying(false);
                  stopVocalTracks();
                }}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-black text-slate-300 hover:text-white rounded-lg transition border border-white/10 cursor-pointer"
                type="button"
              >
                Esci da Anteprima ✕
              </button>
            </div>
          </div>

          {/* Core cinema layout grid */}
          <div className="flex-1 w-full flex flex-col lg:flex-row items-center justify-center gap-6 max-h-[75vh] overflow-y-auto my-auto py-2">
            
            {/* Aspect Video Stage Rendering */}
            <div 
              className={`relative bg-neutral-950 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] border border-white/10 overflow-hidden transition-all duration-300 ${
                project.aspectRatio === '16:9' 
                  ? 'w-full max-w-4xl aspect-video' 
                  : project.aspectRatio === '1:1' 
                    ? 'w-full max-w-xl aspect-square' 
                    : 'h-full max-h-[68vh] aspect-[9/16]'
              }`}
            >
              {currentSegment ? (
                <div className="absolute inset-0 h-full w-full select-none">
                  
                  <img
                    src={currentSegment.imageUrl}
                    alt="Segment Scene"
                    className="h-full w-full object-cover select-none pointer-events-none"
                  />

                  {/* Subtitle Captions */}
                  <div className="absolute bottom-8 left-0 right-0 px-6 text-center z-10 pointer-events-none">
                    <span className="inline-block bg-black/90 backdrop-blur-md border border-white/20 text-white font-extrabold px-5 py-2.5 rounded-2xl text-base md:text-xl tracking-wide shadow-2xl">
                      {currentSegment.text}
                    </span>
                  </div>

                  {/* Stickers / Dialogue rendered */}
                  {sortedStickers.map((st) => (
                    <div
                      key={st.id}
                      className="absolute flex flex-col items-center justify-center pointer-events-none"
                      style={{
                        left: `${st.x}%`,
                        top: `${st.y}%`,
                        transform: `translate(-50%, -50%) rotate(${st.rotation || 0}deg) ${st.flipped ? 'scaleX(-1)' : ''}`,
                      }}
                    >
                      {st.type === 'speech_bubble' ? (
                        <div className={`relative bg-white text-black text-[13px] md:text-[14px] font-extrabold p-3 px-4.5 rounded-2xl shadow-2xl border-2 border-slate-300 max-w-[180px] text-center select-none leading-tight font-sans ${st.flipped ? '[transform:scaleX(-1)]' : ''}`}>
                          {st.value}
                          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-slate-300 rotate-45"></div>
                        </div>
                      ) : st.type === 'custom_image' ? (
                        <img
                          src={st.value}
                          alt="Custom Character"
                          style={{ width: `${st.size * 1.3}px`, height: 'auto' }}
                          className="object-contain pointer-events-none drop-shadow-2xl max-h-[300px] max-w-[300px]"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div
                          style={{ fontSize: `${st.size * 1.3}px` }}
                          className="leading-none drop-shadow-2xl select-none"
                        >
                          {st.value}
                        </div>
                      )}
                    </div>
                  ))}
                  
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">
                  Nessuna scena caricata.
                </div>
              )}
            </div>

            {/* Step system to record Screen capture for offline rendering export */}
            <div className="w-full lg:w-90 bg-[#121216] p-4 rounded-2xl border border-white/10 space-y-4 text-xs shrink-0 self-stretch flex flex-col justify-between">
              
              <div className="space-y-3">
                <h2 className="font-extrabold text-[#a5b4fc] text-[11.5px] uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-4.5 w-4.5 text-yellow-400" />
                  COME ESPORTARE UN FILE VIDEO (MP4/WEBM)?
                </h2>

                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Un file <strong>.json</strong> salva la struttura modificabile (come un file Photoshop). <strong className="text-white">Per registrare e salvare un vero file video</strong> da inviare su WhatsApp o caricare sui social, usa il registratore del browser integrato!
                </p>

                <div className="bg-[#09090c] p-3 rounded-xl border border-indigo-500/10 space-y-2.5">
                  <span className="font-black text-white text-[10.5px] block">🎥 REGISTRATORE VIDEO DI SISTEMA:</span>
                  
                  <ol className="list-decimal pl-4.5 space-y-1.5 text-slate-400 text-[10.5px]">
                    <li>Clicca il pulsante <strong>"Avvia Registrazione Video"</strong> qui sotto.</li>
                    <li>Scegli <strong>"Condividi scheda del browser"</strong> &rarr; seleziona <strong>"SynchroStream Pro"</strong>.</li>
                    <li><strong className="text-white block bg-slate-900 px-1 py-0.5 rounded text-[10px] mt-0.5 border border-amber-500/10 font-sans">⚠️ IMPORTANTE: Spunta l'opzione "Condividi audio" in basso!</strong></li>
                    <li>Fai partire l'ascolto. Al termine, premi <strong>"Completa e Scarica"</strong> per salvare il video sul computer!</li>
                  </ol>

                  {isRecording ? (
                    <button
                      onClick={stopScreenCaptureExporter}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-lg text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                      type="button"
                    >
                      <Square className="h-3.5 w-3.5 fill-white" />
                      COMPLETA E SCARICA VIDEO 📥
                    </button>
                  ) : (
                    <button
                      onClick={startScreenCaptureExporter}
                      className="w-full py-2 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black rounded-lg text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                      type="button"
                    >
                      <Play className="h-3.5 w-3.5 fill-white" />
                      Avvia Registrazione Video 🎙️
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1 text-slate-500 text-[10px] border-t border-white/5 pt-3">
                <span className="font-bold text-slate-300 block">Sistemi di registrazione esterni alternativi alternativi:</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-400">
                  <li><strong>Windows Game Bar:</strong> premi <kbd className="bg-slate-800 px-1 font-mono text-white rounded">Win + Alt + R</kbd></li>
                  <li><strong>Mac Screen recorder:</strong> premi <kbd className="bg-slate-800 px-1 font-mono text-white rounded">Cmd + Shift + 5</kbd></li>
                  <li><strong>Programma gratuito:</strong> OBS Studio per registrazioni avanzate.</li>
                </ul>
              </div>

            </div>

          </div>

          {/* Player controls */}
          <div className="w-full max-w-4xl bg-[#111113] p-3 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsPlaying(!isPlaying);
                  initAudioCtx();
                }}
                className="p-1.5 px-4 bg-indigo-600 hover:bg-indigo-505 text-white rounded-lg text-xs font-black transition flex items-center gap-1 cursor-pointer"
                type="button"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlaying ? "PAUSA" : "AVVIA RIPRODUZIONE"}
              </button>
              
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentTime(0);
                  setActiveIdx(0);
                  stopVocalTracks();
                }}
                className="p-1.5 px-3.5 bg-slate-800 hover:bg-slate-705 text-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-white/10 cursor-pointer"
                type="button"
              >
                <Square className="h-3.5 w-3.5" />
                Stop / Reset
              </button>
            </div>

            <div className="flex-1 max-w-lg w-full px-4">
              <div className="flex justify-between text-[9.5px]/none text-slate-400 font-mono mb-1 bg-black/40 p-1 rounded">
                <span>Testina: {currentTime.toFixed(1)}s</span>
                <span>Scena {activeIdx + 1} / {project.segments.length}</span>
                <span>Totale: {totalDuration.toFixed(1)}s</span>
              </div>
              <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden relative">
                <div 
                  className="absolute top-0 bottom-0 left-0 bg-indigo-500 transition-all duration-75"
                  style={{ width: `${(currentTime / totalDuration) * 100}%` }}
                />
              </div>
            </div>

            <span className="text-[10px] text-slate-400 font-bold bg-slate-900 border border-white/5 px-3 py-1 rounded-lg">
              Formato attuale: <strong className="text-indigo-300 uppercase tracking-widest">{project.aspectRatio}</strong>
            </span>
          </div>

        </div>
      )}

      {/* 5. NEW STORYBOARD CREATE MODAL */}
      <CreateModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />

    </div>
  );
}

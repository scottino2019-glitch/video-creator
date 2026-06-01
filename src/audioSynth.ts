/**
 * Dynamic Browser Synthesizer Engine
 * Generates background music using Web Audio API to bypass asset dependency and avoid dead locks.
 * Supports Dreamy, Cinematic, and Upbeat rhythmic tracks with full limiting and node cleanup.
 */

export interface SynthHandle {
  stop: () => void;
  setVolume: (vol: number) => void;
  destinationNode: AudioNode;
}

export function playSynthMusic(
  audioCtx: AudioContext,
  type: 'dreamy' | 'cinematic' | 'upbeat' | 'none',
  initialVolumeValue: number
): SynthHandle {
  // Master Compressor to prevent any clipping/distortion
  const compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-18, audioCtx.currentTime);
  compressor.knee.setValueAtTime(24, audioCtx.currentTime);
  compressor.ratio.setValueAtTime(8, audioCtx.currentTime);
  compressor.attack.setValueAtTime(0.01, audioCtx.currentTime);
  compressor.release.setValueAtTime(0.2, audioCtx.currentTime);

  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(initialVolumeValue, audioCtx.currentTime);

  // Connection path: Sound Sources -> masterGain -> compressor -> audioCtx.destination
  masterGain.connect(compressor);
  compressor.connect(audioCtx.destination);

  const activeNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
  let isPlaying = true;
  let intervalId: any = null;

  // Delay FX for depth (used in dreamy and cinematic)
  const delay = audioCtx.createDelay(1.0);
  delay.delayTime.value = 0.4;
  
  const delayGain = audioCtx.createGain();
  delayGain.gain.value = 0.25; // Safe feedback gain

  delay.connect(delayGain);
  delayGain.connect(delay); // safe feedback loop
  delayGain.connect(masterGain); // routing delay to master output

  const stop = () => {
    isPlaying = false;
    if (intervalId) {
      clearInterval(intervalId);
    }
    
    // Stop and disconnect all active nodes immediately to clear memory and halt sound
    activeNodes.forEach(({ osc, gain }) => {
      try {
        osc.stop();
      } catch (e) {}
      try {
        osc.disconnect();
        gain.disconnect();
      } catch (e) {}
    });
    activeNodes.length = 0;

    try {
      delay.disconnect();
      delayGain.disconnect();
      masterGain.disconnect();
      compressor.disconnect();
    } catch (e) {}
  };

  const setVolume = (vol: number) => {
    masterGain.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, vol)), audioCtx.currentTime + 0.15);
  };

  if (type === 'none') {
    return { stop, setVolume, destinationNode: masterGain };
  }

  const registerNode = (osc: OscillatorNode, gain: GainNode, durationSeconds: number) => {
    activeNodes.push({ osc, gain });
    
    // Self-destruction & cleanup when sound ends
    setTimeout(() => {
      if (!isPlaying) return;
      try {
        osc.stop();
      } catch (e) {}
      try {
        osc.disconnect();
        gain.disconnect();
      } catch (e) {}
      
      const idx = activeNodes.findIndex(item => item.osc === osc);
      if (idx > -1) {
        activeNodes.splice(idx, 1);
      }
    }, (durationSeconds + 0.5) * 1000);
  };

  if (type === 'dreamy') {
    // Soft ambient chords: Cmaj9 - Fmaj7 - Am9 - G6
    const chords = [
      [130.81, 164.81, 196.00, 246.94, 293.66], // Cmaj9
      [174.61, 220.00, 261.63, 329.63, 392.00], // Fmaj7
      [110.00, 146.83, 174.61, 220.00, 261.63], // Dm7
      [146.83, 196.00, 246.94, 293.66, 392.00], // G6
    ];

    let chordIndex = 0;

    const playPad = () => {
      if (!isPlaying) return;
      const notes = chords[chordIndex];
      chordIndex = (chordIndex + 1) % chords.length;

      const duration = 5.5;
      notes.forEach((freq) => {
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        // Smooth slow attack & slow fade out to avoid clicks/clipping
        oscGain.gain.setValueAtTime(0, audioCtx.currentTime);
        oscGain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 1.2);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

        osc.connect(oscGain);
        oscGain.connect(masterGain);
        oscGain.connect(delay);

        osc.start();
        registerNode(osc, oscGain, duration);
      });
    };

    playPad();
    intervalId = setInterval(playPad, 5000);

  } else if (type === 'cinematic') {
    // Cinematic drone & soaring bells
    const bassBeats = [110.00, 87.31, 130.81, 98.00]; // Am, F, C, G
    const melodyBeats = [220.00, 261.63, 329.63, 392.00, 440.00, 523.25];
    let step = 0;

    const playTheme = () => {
      if (!isPlaying) return;

      // Deep drone bass every 4 seconds
      if (step % 2 === 0) {
        const oscBass = audioCtx.createOscillator();
        const bassGain = audioCtx.createGain();
        const lowpass = audioCtx.createBiquadFilter();

        oscBass.type = 'sawtooth';
        // Divide by 2/4 for comfortable dark bass tones
        const baseFreq = bassBeats[(step / 2) % bassBeats.length] / 2;
        oscBass.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);

        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(120, audioCtx.currentTime);

        bassGain.gain.setValueAtTime(0, audioCtx.currentTime);
        bassGain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 1.2);
        bassGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 3.8);

        oscBass.connect(lowpass);
        lowpass.connect(bassGain);
        bassGain.connect(masterGain);

        oscBass.start();
        registerNode(oscBass, bassGain, 4.0);
      }

      // Bell-like melody note every 2 seconds
      const oscMelody = audioCtx.createOscillator();
      const melodyGain = audioCtx.createGain();

      oscMelody.type = 'sine'; // Sine is much cleaner and softer than triangle!
      const mFreq = melodyBeats[Math.floor(Math.random() * melodyBeats.length)];
      oscMelody.frequency.setValueAtTime(mFreq, audioCtx.currentTime);

      melodyGain.gain.setValueAtTime(0, audioCtx.currentTime);
      melodyGain.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 0.3);
      melodyGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.8);

      oscMelody.connect(melodyGain);
      melodyGain.connect(masterGain);
      melodyGain.connect(delay);

      oscMelody.start();
      registerNode(oscMelody, melodyGain, 2.0);

      step++;
    };

    playTheme();
    intervalId = setInterval(playTheme, 2000);

  } else if (type === 'upbeat') {
    // Retro synth wave arpeggio (120BPM)
    const notesSeq = [130.81, 196.00, 164.81, 196.00, 146.83, 196.00, 164.81, 220.00];
    let noteIdx = 0;

    const playArp = () => {
      if (!isPlaying) return;
      const osc = audioCtx.createOscillator();
      const oscGain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(notesSeq[noteIdx], audioCtx.currentTime);
      noteIdx = (noteIdx + 1) % notesSeq.length;

      const duration = 0.22;
      oscGain.gain.setValueAtTime(0.035, audioCtx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(oscGain);
      oscGain.connect(masterGain);

      osc.start();
      registerNode(osc, oscGain, duration);
    };

    playArp();
    intervalId = setInterval(playArp, 250);
  }

  return {
    stop,
    setVolume,
    destinationNode: masterGain,
  };
}

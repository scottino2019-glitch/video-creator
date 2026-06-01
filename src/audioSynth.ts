/**
 * Dynamic Browser Synthesizer Engine
 * Generates background music using Web Audio API to bypass asset dependency and avoid dead locks.
 * Supports Dreamy, Cinematic, and Upbeat rhythmic tracks.
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
  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(initialVolumeValue, audioCtx.currentTime);
  masterGain.connect(audioCtx.destination);

  const activeOscillators: AudioNode[] = [];
  let isPlaying = true;
  let intervalId: any = null;

  const stop = () => {
    isPlaying = false;
    if (intervalId) {
      clearInterval(intervalId);
    }
    activeOscillators.forEach((node) => {
      try {
        (node as any).stop();
      } catch (e) {}
    });
  };

  const setVolume = (vol: number) => {
    masterGain.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + 0.1);
  };

  if (type === 'none') {
    return { stop, setVolume, destinationNode: masterGain };
  }

  // Common Delay Line for ambient effects
  const delay = audioCtx.createDelay(1.0);
  delay.delayTime.value = 0.5;
  const delayGain = audioCtx.createGain();
  delayGain.gain.value = 0.4;
  delay.connect(delayGain);
  delayGain.connect(delay); // feedback loop
  delayGain.connect(masterGain);

  if (type === 'dreamy') {
    // Soft pads: Peaceful progression Cmaj9 - Fmaj7 - Am9 - G6
    const chords = [
      [130.81, 164.81, 196.00, 246.94, 293.66], // Cmaj9
      [174.61, 220.00, 261.63, 329.63, 392.00], // Fmaj7
      [110.00, 146.83, 174.61, 220.00, 261.63], // Dm7 (or similar dreamy tone)
      [146.83, 196.00, 246.94, 293.66, 392.00], // G6
    ];

    let chordIndex = 0;

    const playPad = () => {
      if (!isPlaying) return;
      const notes = chords[chordIndex];
      chordIndex = (chordIndex + 1) % chords.length;

      notes.forEach((freq) => {
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        // Soft slow attack & release
        oscGain.gain.setValueAtTime(0, audioCtx.currentTime);
        oscGain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 1.5);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 5.9);

        osc.connect(oscGain);
        oscGain.connect(masterGain);
        oscGain.connect(delay);

        osc.start();
        activeOscillators.push(osc);

        setTimeout(() => {
          try {
            osc.stop();
          } catch (e) {}
          const idx = activeOscillators.indexOf(osc);
          if (idx > -1) activeOscillators.splice(idx, 1);
        }, 6000);
      });
    };

    playPad();
    intervalId = setInterval(playPad, 5500);

  } else if (type === 'cinematic') {
    // Cinematic: Low drone bass + slow soaring violin melody
    const bassBeats = [110.00, 87.31, 130.81, 98.00]; // Am, F, C, G
    const melodyBeats = [220.00, 261.63, 329.63, 392.00, 440.00, 523.25];
    let step = 0;

    const playTheme = () => {
      if (!isPlaying) return;
      
      // Bass Drone every 4 seconds
      if (step % 2 === 0) {
        const oscBass = audioCtx.createOscillator();
        const bassGain = audioCtx.createGain();
        const lowpass = audioCtx.createBiquadFilter();

        oscBass.type = 'sawtooth';
        oscBass.frequency.setValueAtTime(bassBeats[(step / 2) % bassBeats.length] / 2, audioCtx.currentTime);

        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(150, audioCtx.currentTime);

        bassGain.gain.setValueAtTime(0, audioCtx.currentTime);
        bassGain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 1.0);
        bassGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 3.9);

        oscBass.connect(lowpass);
        lowpass.connect(bassGain);
        bassGain.connect(masterGain);

        oscBass.start();
        activeOscillators.push(oscBass);

        setTimeout(() => {
          try { oscBass.stop(); } catch (e) {}
        }, 4000);
      }

      // Melody note every 2 seconds
      const oscMelody = audioCtx.createOscillator();
      const melodyGain = audioCtx.createGain();

      oscMelody.type = 'triangle';
      const mFreq = melodyBeats[Math.floor(Math.random() * melodyBeats.length)];
      oscMelody.frequency.setValueAtTime(mFreq, audioCtx.currentTime);

      melodyGain.gain.setValueAtTime(0, audioCtx.currentTime);
      melodyGain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.4);
      melodyGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.9);

      oscMelody.connect(melodyGain);
      melodyGain.connect(masterGain);
      melodyGain.connect(delay);

      oscMelody.start();
      activeOscillators.push(oscMelody);

      setTimeout(() => {
        try { oscMelody.stop(); } catch (e) {}
      }, 2000);

      step++;
    };

    playTheme();
    intervalId = setInterval(playTheme, 2000);

  } else if (type === 'upbeat') {
    // Retro electronic: synthwave arpeggio 120BPM (0.25s per note)
    const notesSeq = [130.81, 196.00, 164.81, 196.00, 146.83, 196.00, 164.81, 220.00];
    let noteIdx = 0;

    const playArp = () => {
      if (!isPlaying) return;
      const osc = audioCtx.createOscillator();
      const oscGain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(notesSeq[noteIdx], audioCtx.currentTime);
      noteIdx = (noteIdx + 1) % notesSeq.length;

      oscGain.gain.setValueAtTime(0.07, audioCtx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.22);

      osc.connect(oscGain);
      oscGain.connect(masterGain);

      osc.start();
      activeOscillators.push(osc);

      setTimeout(() => {
        try {
          osc.stop();
        } catch (e) {}
        const idx = activeOscillators.indexOf(osc);
        if (idx > -1) activeOscillators.splice(idx, 1);
      }, 250);
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

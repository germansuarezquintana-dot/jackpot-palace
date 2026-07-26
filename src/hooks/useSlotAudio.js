import { useEffect, useRef, useState } from "react";

export function useSlotAudio() {
  const [soundEnabled, setSoundEnabled] = useState(true);

  const audioContextRef = useRef(null);
  const spinSoundRef = useRef(null);

  useEffect(() => {
    return () => {
      if (spinSoundRef.current) {
        clearInterval(spinSoundRef.current);
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  async function getAudioContext() {
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) {
        console.error("El navegador no admite AudioContext");
        return null;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      const audioContext = audioContextRef.current;

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      return audioContext;
    } catch (error) {
      console.error("No se pudo iniciar el audio:", error);
      return null;
    }
  }

  async function unlockAudio() {
    if (!soundEnabled) return null;

    const audioContext = await getAudioContext();
    if (!audioContext) return null;

    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();

    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);

    return audioContext;
  }

  async function playTone({
    frequency = 440,
    duration = 0.15,
    volume = 0.18,
    type = "sine",
    delay = 0,
    force = false,
  }) {
    if (!soundEnabled && !force) return;

    try {
      const audioContext = await getAudioContext();
      if (!audioContext) return;

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      const startTime = audioContext.currentTime + delay;
      const endTime = startTime + duration;

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(
        volume,
        startTime + 0.02
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        endTime
      );

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start(startTime);
      oscillator.stop(endTime);
    } catch (error) {
      console.error("Error de sonido:", error);
    }
  }

  async function playClickSound(frequency = 520) {
    await playTone({
      frequency,
      duration: 0.08,
      volume: 0.16,
      type: "square",
    });
  }

  function stopSpinSound() {
    if (spinSoundRef.current) {
      clearInterval(spinSoundRef.current);
      spinSoundRef.current = null;
    }
  }

  function startSpinSound() {
    if (!soundEnabled) return;

    stopSpinSound();

    let frequency = 130;

    spinSoundRef.current = setInterval(() => {
      playTone({
        frequency,
        duration: 0.06,
        volume: 0.07,
        type: "square",
      });

      frequency += 18;

      if (frequency > 330) {
        frequency = 130;
      }
    }, 85);
  }

  function playReelStopSound(reelIndex) {
    playTone({
      frequency: 260 + reelIndex * 90,
      duration: 0.16,
      volume: 0.22,
      type: "triangle",
    });
  }

  function playCoinSound(amount = 3) {
    const coinNotes = [1200, 1450, 1700, 1350, 1850, 1550];

    for (let index = 0; index < amount; index += 1) {
      playTone({
        frequency: coinNotes[index % coinNotes.length],
        duration: 0.09,
        volume: 0.13,
        type: "triangle",
        delay: index * 0.08,
      });

      playTone({
        frequency: coinNotes[index % coinNotes.length] * 1.35,
        duration: 0.05,
        volume: 0.07,
        type: "square",
        delay: index * 0.08 + 0.02,
      });
    }
  }

  function playWinSound(bigWin = false) {
    const notes = bigWin
      ? [440, 550, 660, 880, 1100, 1320]
      : [440, 550, 660, 880];

    notes.forEach((frequency, index) => {
      playTone({
        frequency,
        duration: 0.28,
        volume: 0.2,
        type: "sine",
        delay: index * 0.13,
      });
    });
  }

  function playScatterSound() {
    const notes = [330, 440, 550, 660, 880, 1100];

    notes.forEach((frequency, index) => {
      playTone({
        frequency,
        duration: 0.3,
        volume: 0.2,
        type: "triangle",
        delay: index * 0.14,
      });
    });
  }

  function playErrorSound() {
    playTone({
      frequency: 140,
      duration: 0.35,
      volume: 0.2,
      type: "sawtooth",
    });
  }

  async function toggleSound() {
    if (soundEnabled) {
      stopSpinSound();
      setSoundEnabled(false);
      return false;
    }

    setSoundEnabled(true);

    const audioContext = await getAudioContext();

    if (audioContext) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 700;
      gain.gain.value = 0.2;

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.18);
    }

    return true;
  }

  return {
    soundEnabled,
    unlockAudio,
    playTone,
    playClickSound,
    startSpinSound,
    stopSpinSound,
    playReelStopSound,
    playCoinSound,
    playWinSound,
    playScatterSound,
    playErrorSound,
    toggleSound,
  };
}
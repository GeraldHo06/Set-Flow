import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { Jungle, getMultiplier } from '../utils/jungle';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const stemBuffersRef = useRef({});
  const stemSourcesRef = useRef([]);
  const stemGainsRef = useRef([]);
  const masterGainRef = useRef(null);
  const stemStartCtxTimeRef = useRef(0);
  const stemOffsetRef = useRef(0);
  const rafRef = useRef(null);
  const currentSongIdRef = useRef(null);
  const stemsPitchShifterRef = useRef(null);
  const mainPitchShifterRef = useRef(null);
  const mainAudioGainRef = useRef(null);
  const audioSourceRef = useRef(null);

  const [currentSong, setCurrentSong] = useState(null);
  const [stems, setStems] = useState([]);
  const [stemVolumes, setStemVolumes] = useState({});
  const [stemMasterVolume, setStemMasterVolume] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [stemsLoaded, setStemsLoaded] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [pitch, setPitch] = useState(0);

  const ensureAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    
    // Setup stems routing
    if (!masterGainRef.current) {
      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.gain.value = 1;
      stemsPitchShifterRef.current = new Jungle(audioCtxRef.current);
      masterGainRef.current.connect(audioCtxRef.current.destination);
    }
    
    // Setup main audio routing
    if (!mainAudioGainRef.current) {
      mainAudioGainRef.current = audioCtxRef.current.createGain();
      mainAudioGainRef.current.gain.value = 1;
      mainPitchShifterRef.current = new Jungle(audioCtxRef.current);
      mainAudioGainRef.current.connect(audioCtxRef.current.destination);
    }
    return audioCtxRef.current;
  }, []);

  // Fully kill an audio element
  const killAudio = (audio) => {
    if (!audio) return;
    audio.onloadedmetadata = null;
    audio.ontimeupdate = null;
    audio.onended = null;
    audio.pause();
    audio.src = '';
    audio.load(); // Forces browser to abort any pending network request
    audioSourceRef.current = null; // Clear connected source
  };

  const stopStems = useCallback(() => {
    stemSourcesRef.current.forEach(src => { try { src.stop(); } catch {} });
    stemSourcesRef.current = [];
    stemGainsRef.current = [];
    cancelAnimationFrame(rafRef.current);
  }, []);

  const stopAll = useCallback(() => {
    killAudio(audioRef.current);
    audioRef.current = null;
    stopStems();
    setIsPlaying(false);
  }, [stopStems]);

  const loadStemBuffers = useCallback(async (stemList) => {
    const ctx = ensureAudioCtx();
    let maxDur = 0;
    await Promise.all(stemList.filter(s => s.url).map(async (stem) => {
      if (!stemBuffersRef.current[stem.url]) {
        try {
          const resp = await fetch(stem.url);
          const buf = await resp.arrayBuffer();
          const decoded = await ctx.decodeAudioData(buf);
          stemBuffersRef.current[stem.url] = decoded;
          if (decoded.duration > maxDur) maxDur = decoded.duration;
        } catch {}
      } else {
        if (stemBuffersRef.current[stem.url].duration > maxDur) {
          maxDur = stemBuffersRef.current[stem.url].duration;
        }
      }
    }));
    return maxDur;
  }, [ensureAudioCtx]);

  const startStemSources = useCallback((offset, stemList, stemVols) => {
    stopStems();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    stemStartCtxTimeRef.current = ctx.currentTime;
    stemOffsetRef.current = offset;
    stemList.forEach((stem, i) => {
      if (!stem.url) return;
      const buf = stemBuffersRef.current[stem.url];
      if (!buf) return;
      const gain = ctx.createGain();
      gain.gain.value = stemVols?.[i] ?? 1;
      gain.connect(masterGainRef.current);
      stemGainsRef.current[i] = gain;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(gain);
      src.playbackRate.value = speed; // Set current speed
      src.start(ctx.currentTime + 0.01, Math.min(offset, buf.duration - 0.01));
      stemSourcesRef.current.push(src);
    });
  }, [stopStems, speed]);

  const startStemTick = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const tick = () => {
      if (!audioCtxRef.current) return;
      const elapsed = audioCtxRef.current.currentTime - stemStartCtxTimeRef.current;
      setCurrentTime(stemOffsetRef.current + elapsed);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const routeAudioElement = useCallback(() => {
    const ctx = ensureAudioCtx();
    if (audioRef.current && !audioSourceRef.current) {
      audioRef.current.preservesPitch = false;
      audioRef.current.mozPreservesPitch = false;
      audioRef.current.webkitPreservesPitch = false;

      audioSourceRef.current = ctx.createMediaElementSource(audioRef.current);
      audioSourceRef.current.connect(mainAudioGainRef.current);
    }
  }, [ensureAudioCtx]);

  const updatePitchOffset = useCallback((pitchVal, speedVal) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !mainAudioGainRef.current || !masterGainRef.current || !mainPitchShifterRef.current || !stemsPitchShifterRef.current) return;

    const isRouted = !!audioSourceRef.current;
    const speedShift = Math.log2(speedVal) * 12;

    // 1. Update Main Audio Pitch Shift
    // If routed, main audio behaves like a tape recorder (ignores preservesPitch), so we must compensate for speed.
    // If NOT routed, main audio preserves pitch natively in the browser, so we do NOT compensate for speed.
    const mainShift = isRouted ? (pitchVal - speedShift) : pitchVal;
    if (Math.abs(mainShift) < 0.01) {
      mainAudioGainRef.current.disconnect();
      mainAudioGainRef.current.connect(ctx.destination);
    } else {
      mainAudioGainRef.current.disconnect();
      mainAudioGainRef.current.connect(mainPitchShifterRef.current.input);
      mainPitchShifterRef.current.output.disconnect();
      mainPitchShifterRef.current.output.connect(ctx.destination);
      mainPitchShifterRef.current.setPitchOffset(getMultiplier(mainShift));
    }

    // 2. Update Stems Pitch Shift (needs speed compensation as stems don't preserve pitch natively)
    const stemsShift = pitchVal - speedShift;
    if (Math.abs(stemsShift) < 0.01) {
      masterGainRef.current.disconnect();
      masterGainRef.current.connect(ctx.destination);
    } else {
      masterGainRef.current.disconnect();
      masterGainRef.current.connect(stemsPitchShifterRef.current.input);
      stemsPitchShifterRef.current.output.disconnect();
      stemsPitchShifterRef.current.output.connect(ctx.destination);
      stemsPitchShifterRef.current.setPitchOffset(getMultiplier(stemsShift));
    }
  }, []);

  const loadSong = useCallback(async (song, stemList = []) => {
    // Kill old audio immediately and hard
    const oldAudio = audioRef.current;
    audioRef.current = null;
    killAudio(oldAudio);
    stopStems();
    cancelAnimationFrame(rafRef.current);

    // Small gap to let browser release audio resources
    await new Promise(r => setTimeout(r, 80));

    // Bail if a newer loadSong was called during the gap
    currentSongIdRef.current = song.id;

    setCurrentSong(song);
    setStems(stemList);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setStemsLoaded(false);
    stemOffsetRef.current = 0;

    const initVols = {};
    stemList.forEach((_, i) => { initVols[i] = 1; });
    setStemVolumes(initVols);

    // Set up main audio
    if (song.audio_url) {
      const audio = new Audio(song.audio_url);
      audio.crossOrigin = "anonymous";
      audio.preservesPitch = true;
      audio.mozPreservesPitch = true;
      audio.webkitPreservesPitch = true;
      audio.volume = volume;
      audio.playbackRate = speed; // Apply active speed
      audio.onloadedmetadata = () => {
        if (currentSongIdRef.current === song.id) setDuration(audio.duration || 0);
      };
      audio.ontimeupdate = () => {
        if (currentSongIdRef.current === song.id) setCurrentTime(audio.currentTime);
      };
      audio.onended = () => {
        if (currentSongIdRef.current === song.id) {
          stopStems();
          setIsPlaying(false);
        }
      };
      audioRef.current = audio;
    }

    // Load stems in background
    if (stemList.some(s => s.url)) {
      loadStemBuffers(stemList).then(maxDur => {
        if (currentSongIdRef.current === song.id) {
          if (!song.audio_url && maxDur > 0) setDuration(maxDur);
          setStemsLoaded(true);
        }
      });
    } else {
      setStemsLoaded(true);
    }
  }, [stopStems, volume, loadStemBuffers, speed]);

  const updateStems = useCallback(async (stemList) => {
    setStems(stemList);
    if (stemList.some(s => s.url)) {
      const maxDur = await loadStemBuffers(stemList);
      if (!audioRef.current && maxDur > 0) setDuration(maxDur);
      setStemsLoaded(true);
    }
  }, [loadStemBuffers]);

  const play = useCallback(() => {
    ensureAudioCtx();
    
    // Dynamically route if pitch is shifted or stems are present
    const needsRouting = pitch !== 0 || stems.some(s => s.url);
    if (needsRouting) {
      routeAudioElement();
    }
    
    updatePitchOffset(pitch, speed);
    
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
    if (stems.some(s => s.url)) {
      const offset = audioRef.current?.currentTime ?? stemOffsetRef.current;
      startStemSources(offset, stems, stemVolumes);
      if (!audioRef.current) startStemTick();
    }
    setIsPlaying(true);
  }, [stems, stemVolumes, ensureAudioCtx, startStemSources, startStemTick, pitch, speed, updatePitchOffset, routeAudioElement]);

  const pause = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    if (audioCtxRef.current && stemSourcesRef.current.length > 0) {
      const elapsed = audioCtxRef.current.currentTime - stemStartCtxTimeRef.current;
      stemOffsetRef.current = stemOffsetRef.current + elapsed;
    }
    stopStems();
    setIsPlaying(false);
  }, [stopStems]);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const seek = useCallback((time) => {
    const t = Math.max(0, time);
    if (audioRef.current) audioRef.current.currentTime = t;
    setCurrentTime(t);
    stemOffsetRef.current = t;
    if (isPlaying && stems.some(s => s.url)) {
      startStemSources(t, stems, stemVolumes);
      if (!audioRef.current && audioCtxRef.current) {
        stemStartCtxTimeRef.current = audioCtxRef.current.currentTime;
        startStemTick();
      }
    }
  }, [isPlaying, stems, stemVolumes, startStemSources, startStemTick]);

  const changeVolume = useCallback((vol) => {
    setVolume(vol);
    if (audioRef.current) audioRef.current.volume = vol;
  }, []);

  const changeStemVolume = useCallback((idx, vol) => {
    setStemVolumes(prev => ({ ...prev, [idx]: vol }));
    if (stemGainsRef.current[idx]) stemGainsRef.current[idx].gain.value = vol;
  }, []);

  const changeStemMasterVolume = useCallback((vol) => {
    setStemMasterVolume(vol);
    if (masterGainRef.current) masterGainRef.current.gain.value = vol;
  }, []);

  const changeSpeed = useCallback((newSpeed) => {
    setSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
    stemSourcesRef.current.forEach(src => {
      if (src) src.playbackRate.value = newSpeed;
    });
    updatePitchOffset(pitch, newSpeed);
  }, [pitch, updatePitchOffset]);

  const changePitch = useCallback((newPitch) => {
    setPitch(newPitch);
    if (newPitch !== 0 || stems.some(s => s.url)) {
      routeAudioElement();
    }
    updatePitchOffset(newPitch, speed);
  }, [speed, stems, routeAudioElement, updatePitchOffset]);

  // X button — stop and dismiss mini player
  const stop = useCallback(() => {
    currentSongIdRef.current = null;
    killAudio(audioRef.current);
    audioRef.current = null;
    stopStems();
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentSong(null); // This hides the mini player
    setStems([]);
    setDuration(0);
  }, [stopStems]);

  return (
    <PlayerContext.Provider value={{
      currentSong, isPlaying, currentTime, duration, volume,
      stems, stemVolumes, stemMasterVolume, stemsLoaded,
      speed, pitch,
      hasMainAudio: !!currentSong?.audio_url,
      hasStems: stems.some(s => s.url),
      loadSong, updateStems,
      play, pause, togglePlay, seek,
      changeVolume, changeStemVolume, changeStemMasterVolume,
      changeSpeed, changePitch,
      stop,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
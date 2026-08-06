import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';

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

  // Synchronous references to avoid React state batching lag in event loops
  const currentSongRef = useRef(null);
  const stemsRef = useRef([]);
  const stemVolumesRef = useRef({});

  const [currentSong, setCurrentSong] = useState(null);
  const [stems, setStems] = useState([]);
  const [stemVolumes, setStemVolumes] = useState({});
  const [stemMasterVolume, setStemMasterVolume] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [stemsLoaded, setStemsLoaded] = useState(false);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const resumeAudioCtx = useCallback(() => {
    const ctx = getAudioCtx();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (!masterGainRef.current) {
      masterGainRef.current = ctx.createGain();
      masterGainRef.current.gain.value = stemMasterVolume;
      masterGainRef.current.connect(ctx.destination);
    }
  }, [getAudioCtx, stemMasterVolume]);

  // Safe wrapper for decodeAudioData supporting callbacks for older WebKit / iOS versions
  const decodeAudioDataPromise = useCallback((ctx, buffer) => {
    return new Promise((resolve, reject) => {
      try {
        const promise = ctx.decodeAudioData(buffer, resolve, reject);
        if (promise && typeof promise.then === 'function') {
          promise.then(resolve).catch(reject);
        }
      } catch (e) {
        reject(e);
      }
    });
  }, []);

  // Bubble-safe mobile Safari/Chrome interaction unlocker
  useEffect(() => {
    const unlock = () => {
      // 1. Resume context under user gesture
      resumeAudioCtx();

      // 2. Play silent WAV sequence only if the audio element src is empty, to prevent bubbling pause
      const audio = audioRef.current;
      if (audio && !audio.src) {
        audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            audio.pause();
            audio.src = '';
          }).catch(() => {});
        }
      }

      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);

    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, [resumeAudioCtx]);

  const stopStems = useCallback(() => {
    stemSourcesRef.current.forEach(src => { try { src.stop(); } catch {} });
    stemSourcesRef.current = [];
    stemGainsRef.current = [];
    cancelAnimationFrame(rafRef.current);
  }, []);

  const loadStemBuffers = useCallback(async (stemList) => {
    const ctx = getAudioCtx();
    let maxDur = 0;
    await Promise.all(stemList.filter(s => s.url).map(async (stem) => {
      if (!stemBuffersRef.current[stem.url]) {
        try {
          const resp = await fetch(stem.url);
          const buf = await resp.arrayBuffer();
          const decoded = await decodeAudioDataPromise(ctx, buf);
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
  }, [getAudioCtx, decodeAudioDataPromise]);

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
      src.start(ctx.currentTime + 0.01, Math.min(offset, buf.duration - 0.01));
      stemSourcesRef.current.push(src);
    });
  }, [stopStems]);

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

  const loadSong = useCallback((song, stemList = []) => {
    stopStems();
    cancelAnimationFrame(rafRef.current);

    currentSongIdRef.current = song.id;
    currentSongRef.current = song;
    stemsRef.current = stemList;

    setCurrentSong(song);
    setStems(stemList);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setStemsLoaded(false);
    stemOffsetRef.current = 0;

    const initVols = {};
    stemList.forEach((_, i) => { initVols[i] = 1; });
    stemVolumesRef.current = initVols;
    setStemVolumes(initVols);

    // Setup source on the persistent audio ref synchronously
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      if (song.audio_url) {
        audio.src = song.audio_url;
        audio.volume = volume;
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
        audio.load();
      } else {
        audio.src = '';
        audio.onloadedmetadata = null;
        audio.ontimeupdate = null;
        audio.onended = null;
      }
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
  }, [stopStems, volume, loadStemBuffers]);

  const updateStems = useCallback(async (stemList) => {
    stemsRef.current = stemList;
    setStems(stemList);
    if (stemList.some(s => s.url)) {
      const maxDur = await loadStemBuffers(stemList);
      if (!audioRef.current?.src && maxDur > 0) setDuration(maxDur);
      setStemsLoaded(true);
    }
  }, [loadStemBuffers]);

  const play = useCallback(() => {
    resumeAudioCtx();
    const song = currentSongRef.current;
    const currentStems = stemsRef.current;
    const hasMainAudio = !!song?.audio_url;

    if (hasMainAudio && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
    if (currentStems.some(s => s.url)) {
      const offset = hasMainAudio ? (audioRef.current?.currentTime ?? 0) : stemOffsetRef.current;
      startStemSources(offset, currentStems, stemVolumesRef.current);
      if (!hasMainAudio) startStemTick();
    }
    setIsPlaying(true);
  }, [resumeAudioCtx, startStemSources, startStemTick]);

  const pause = useCallback(() => {
    const song = currentSongRef.current;
    const hasMainAudio = !!song?.audio_url;
    if (hasMainAudio && audioRef.current) audioRef.current.pause();
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
    const song = currentSongRef.current;
    const currentStems = stemsRef.current;
    const hasMainAudio = !!song?.audio_url;

    if (hasMainAudio && audioRef.current) audioRef.current.currentTime = t;
    setCurrentTime(t);
    stemOffsetRef.current = t;
    if (isPlaying && currentStems.some(s => s.url)) {
      startStemSources(t, currentStems, stemVolumesRef.current);
      if (!hasMainAudio && audioCtxRef.current) {
        stemStartCtxTimeRef.current = audioCtxRef.current.currentTime;
        startStemTick();
      }
    }
  }, [isPlaying, startStemSources, startStemTick]);

  const changeVolume = useCallback((vol) => {
    setVolume(vol);
    if (audioRef.current) audioRef.current.volume = vol;
  }, []);

  const changeStemVolume = useCallback((idx, vol) => {
    stemVolumesRef.current = { ...stemVolumesRef.current, [idx]: vol };
    setStemVolumes(prev => ({ ...prev, [idx]: vol }));
    if (stemGainsRef.current[idx]) stemGainsRef.current[idx].gain.value = vol;
  }, []);

  const changeStemMasterVolume = useCallback((vol) => {
    setStemMasterVolume(vol);
    if (masterGainRef.current) masterGainRef.current.gain.value = vol;
  }, []);

  const stop = useCallback(() => {
    currentSongIdRef.current = null;
    currentSongRef.current = null;
    stemsRef.current = [];
    stemVolumesRef.current = {};

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = '';
      audio.onloadedmetadata = null;
      audio.ontimeupdate = null;
      audio.onended = null;
    }
    stopStems();
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentSong(null);
    setStems([]);
    setDuration(0);
  }, [stopStems]);

  return (
    <PlayerContext.Provider value={{
      currentSong, isPlaying, currentTime, duration, volume,
      stems, stemVolumes, stemMasterVolume, stemsLoaded,
      hasMainAudio: !!currentSong?.audio_url,
      hasStems: stems.some(s => s.url),
      loadSong, updateStems,
      play, pause, togglePlay, seek,
      changeVolume, changeStemVolume, changeStemMasterVolume,
      stop,
    }}>
      {children}
      <audio
        ref={audioRef}
        style={{ display: 'none' }}
        preload="auto"
        playsInline
      />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
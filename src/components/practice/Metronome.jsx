import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

const TIME_SIGNATURES = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8'];

const MAX_BPM = 500;
const MIN_BPM = 20;

export default function Metronome({ initialBpm = 120 }) {
  const [bpm, setBpm] = useState(() => Math.min(MAX_BPM, Math.max(MIN_BPM, initialBpm)));
  const [timeSig, setTimeSig] = useState('4/4');
  const [isRunning, setIsRunning] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);

  const audioCtxRef = useRef(null);
  const nextBeatTimeRef = useRef(0);
  const schedulerRef = useRef(null);
  const beatCountRef = useRef(0);
  const bpmRef = useRef(bpm);
  const timeSigRef = useRef(timeSig);

  // Keep refs in sync
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { timeSigRef.current = timeSig; }, [timeSig]);

  const getBeatsPerBar = () => parseInt(timeSig.split('/')[0]);

  const scheduleClick = useCallback((time, isAccent) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = isAccent ? 1200 : 800;
    gain.gain.setValueAtTime(isAccent ? 0.9 : 0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    osc.start(time);
    osc.stop(time + 0.07);
  }, []);

  const scheduler = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const lookahead = 0.1; // seconds
    const scheduleAhead = 0.05;

    while (nextBeatTimeRef.current < ctx.currentTime + lookahead) {
      const beatsPerBar = parseInt(timeSigRef.current.split('/')[0]);
      const isAccent = beatCountRef.current % beatsPerBar === 0;

      scheduleClick(nextBeatTimeRef.current, isAccent);

      // Update visual beat indicator
      const beatSnapshot = beatCountRef.current % beatsPerBar;
      const scheduledAt = nextBeatTimeRef.current;
      const delay = (scheduledAt - ctx.currentTime) * 1000;
      setTimeout(() => setCurrentBeat(beatSnapshot), Math.max(0, delay));

      const secondsPerBeat = 60.0 / bpmRef.current;
      nextBeatTimeRef.current += secondsPerBeat;
      beatCountRef.current += 1;
    }
  }, [scheduleClick]);

  const start = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    beatCountRef.current = 0;
    nextBeatTimeRef.current = audioCtxRef.current.currentTime + 0.05;
    schedulerRef.current = setInterval(scheduler, 25);
    setIsRunning(true);
    setCurrentBeat(0);
  }, [scheduler]);

  const stop = useCallback(() => {
    clearInterval(schedulerRef.current);
    setIsRunning(false);
    setCurrentBeat(0);
    beatCountRef.current = 0;
  }, []);

  // Stop when unmounted
  useEffect(() => () => clearInterval(schedulerRef.current), []);

  const handleBpmChange = (val) => setBpm(val[0]);

  const handleTap = (() => {
    const taps = [];
    return () => {
      const now = Date.now();
      taps.push(now);
      if (taps.length > 4) taps.shift();
      if (taps.length >= 2) {
        const gaps = taps.slice(1).map((t, i) => t - taps[i]);
        const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        setBpm(Math.round(Math.min(MAX_BPM, Math.max(MIN_BPM, 60000 / avg))));
      }
    };
  })();

  const beatsPerBar = getBeatsPerBar();

  return (
    <div className="bg-card rounded-xl border border-border/50 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Timer className="w-4 h-4 text-primary" />
          Metronome
        </h3>
        <Button
          size="sm"
          variant={isRunning ? 'destructive' : 'default'}
          className="h-8 gap-2 text-xs"
          onClick={isRunning ? stop : start}
        >
          {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {isRunning ? 'Stop' : 'Start'}
        </Button>
      </div>

      {/* Beat visualizer */}
      <div className="flex items-center justify-center gap-2 mb-5">
        {Array.from({ length: beatsPerBar }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-75 ${
              i === 0
                ? 'w-5 h-5'
                : 'w-4 h-4'
            } ${
              isRunning && currentBeat === i
                ? i === 0
                  ? 'bg-primary shadow-lg shadow-primary/40 scale-110'
                  : 'bg-primary/70 scale-110'
                : 'bg-secondary'
            }`}
          />
        ))}
      </div>

      {/* BPM Control */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-medium">BPM</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-xs"
              onClick={() => setBpm(b => Math.max(MIN_BPM, b - 1))}
            >−</Button>
            <span className="text-lg font-bold font-mono text-primary w-12 text-center">{bpm}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-xs"
              onClick={() => setBpm(b => Math.min(MAX_BPM, b + 1))}
            >+</Button>
          </div>
        </div>
        <Slider
          value={[bpm]}
          min={MIN_BPM}
          max={MAX_BPM}
          step={1}
          onValueChange={handleBpmChange}
          className="w-full"
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">{MIN_BPM}</span>
          <span className="text-[10px] text-muted-foreground">{MAX_BPM}</span>
        </div>
      </div>

      {/* Time Signature */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground font-medium mb-2">Time Signature</p>
        <div className="flex gap-1.5 flex-wrap">
          {TIME_SIGNATURES.map(sig => (
            <button
              key={sig}
              onClick={() => { setTimeSig(sig); if (isRunning) { stop(); } }}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium border transition-colors ${
                timeSig === sig
                  ? 'bg-primary/10 text-primary border-primary/40'
                  : 'bg-secondary/50 text-muted-foreground border-border/50 hover:border-border'
              }`}
            >
              {sig}
            </button>
          ))}
        </div>
      </div>

      {/* Tap Tempo */}
      <button
        onClick={handleTap}
        className="w-full py-2 rounded-lg border border-border/50 bg-secondary/30 text-xs text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors active:scale-95"
      >
        Tap Tempo
      </button>
    </div>
  );
}
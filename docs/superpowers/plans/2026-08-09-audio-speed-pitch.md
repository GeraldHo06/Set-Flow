# Audio Speed and Pitch Adjuster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time client-side audio speed (0.5x to 1.5x) and pitch (-6 to +6 semitones) controls to the Enyao audio player for both main mix and instrument stems.

**Architecture:** Route all audio sources (HTML5 Audio and Web Audio stem buffers) through a shared Web Audio GainNode. Use a granular-delay pitch shifter (`Jungle` algorithm) to apply real-time pitch shifts and compensate for pitch changes when playback speed is adjusted, bypassing the shifter entirely at 1.0x speed / 0 pitch for pristine quality.

**Tech Stack:** React, Tailwind CSS, Web Audio API, Lucide icons.

## Global Constraints
* DO NOT run git commit or git push commands (per user's explicit instruction to test first).
* All source paths must be absolute or resolve correctly within the workspace.

---

### Task 1: Convert Jungle code to ES Module
**Files:**
* Modify: `src/utils/jungle.js`
* Test: No test files needed, will verify import in Task 2.

**Interfaces:**
* Produces: 
  * `Jungle` class: constructor taking `(AudioContext)`
  * `getMultiplier(semitones)` function: helper returning pitch scaling factor

- [ ] **Step 1: Replace jungle.js content with ES module syntax**
  Refactor `src/utils/jungle.js` to modern JS and export the class and helper.
  ```javascript
  // src/utils/jungle.js
  export function getMultiplier(x) {
    if (x < 0) {
      return x / 12;
    } else {
      const a5 = 1.8149080040913423e-7;
      const a4 = -0.000019413043101157434;
      const a3 = 0.0009795096626987743;
      const a2 = -0.014147877819596033;
      const a1 = 0.23005591195033048;
      const a0 = 0.02278153473118749;

      const x1 = x;
      const x2 = x * x;
      const x3 = x * x * x;
      const x4 = x * x * x * x;
      const x5 = x * x * x * x * x;

      return a0 + x1 * a1 + x2 * a2 + x3 * a3 + x4 * a4 + x5 * a5;
    }
  }

  const delayTime = 0.100;
  const fadeTime = 0.050;
  const bufferTime = 0.100;

  function createFadeBuffer(context, activeTime, fadeTime) {
    const length1 = activeTime * context.sampleRate;
    const length2 = (activeTime - 2 * fadeTime) * context.sampleRate;
    const length = length1 + length2;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const p = buffer.getChannelData(0);
    const fadeLength = fadeTime * context.sampleRate;
    const fadeIndex1 = fadeLength;
    const fadeIndex2 = length1 - fadeLength;
    
    for (let i = 0; i < length1; ++i) {
      let value;
      if (i < fadeIndex1) {
        value = Math.sqrt(i / fadeLength);
      } else if (i >= fadeIndex2) {
        value = Math.sqrt(1 - (i - fadeIndex2) / fadeLength);
      } else {
        value = 1;
      }
      p[i] = value;
    }
    for (let i = length1; i < length; ++i) {
      p[i] = 0;
    }
    return buffer;
  }

  function createDelayTimeBuffer(context, activeTime, fadeTime, shiftUp) {
    const length1 = activeTime * context.sampleRate;
    const length2 = (activeTime - 2 * fadeTime) * context.sampleRate;
    const length = length1 + length2;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const p = buffer.getChannelData(0);

    for (let i = 0; i < length1; ++i) {
      if (shiftUp) {
        p[i] = (length1 - i) / length;
      } else {
        p[i] = i / length1;
      }
    }
    for (let i = length1; i < length; ++i) {
      p[i] = 0;
    }
    return buffer;
  }

  export class Jungle {
    constructor(context) {
      this.context = context;
      const input = context.createGain();
      const output = context.createGain();
      this.input = input;
      this.output = output;

      const mod1 = context.createBufferSource();
      const mod2 = context.createBufferSource();
      const mod3 = context.createBufferSource();
      const mod4 = context.createBufferSource();
      this.shiftDownBuffer = createDelayTimeBuffer(context, bufferTime, fadeTime, false);
      this.shiftUpBuffer = createDelayTimeBuffer(context, bufferTime, fadeTime, true);
      mod1.buffer = this.shiftDownBuffer;
      mod2.buffer = this.shiftDownBuffer;
      mod3.buffer = this.shiftUpBuffer;
      mod4.buffer = this.shiftUpBuffer;
      mod1.loop = true;
      mod2.loop = true;
      mod3.loop = true;
      mod4.loop = true;

      const mod1Gain = context.createGain();
      const mod2Gain = context.createGain();
      const mod3Gain = context.createGain();
      mod3Gain.gain.value = 0;
      const mod4Gain = context.createGain();
      mod4Gain.gain.value = 0;

      mod1.connect(mod1Gain);
      mod2.connect(mod2Gain);
      mod3.connect(mod3Gain);
      mod4.connect(mod4Gain);

      const modGain1 = context.createGain();
      const modGain2 = context.createGain();

      const delay1 = context.createDelay();
      const delay2 = context.createDelay();
      mod1Gain.connect(modGain1);
      mod2Gain.connect(modGain2);
      mod3Gain.connect(modGain1);
      mod4Gain.connect(modGain2);
      modGain1.connect(delay1.delayTime);
      modGain2.connect(delay2.delayTime);

      const fade1 = context.createBufferSource();
      const fade2 = context.createBufferSource();
      const fadeBuffer = createFadeBuffer(context, bufferTime, fadeTime);
      fade1.buffer = fadeBuffer;
      fade2.buffer = fadeBuffer;
      fade1.loop = true;
      fade2.loop = true;

      const mix1 = context.createGain();
      const mix2 = context.createGain();
      mix1.gain.value = 0;
      mix2.gain.value = 0;

      fade1.connect(mix1.gain);
      fade2.connect(mix2.gain);

      input.connect(delay1);
      input.connect(delay2);
      delay1.connect(mix1);
      delay2.connect(mix2);
      mix1.connect(output);
      mix2.connect(output);

      const t = context.currentTime + 0.050;
      const t2 = t + bufferTime - fadeTime;
      mod1.start(t);
      mod2.start(t2);
      mod3.start(t);
      mod4.start(t2);
      fade1.start(t);
      fade2.start(t2);

      this.mod1 = mod1;
      this.mod2 = mod2;
      this.mod1Gain = mod1Gain;
      this.mod2Gain = mod2Gain;
      this.mod3Gain = mod3Gain;
      this.mod4Gain = mod4Gain;
      this.modGain1 = modGain1;
      this.modGain2 = modGain2;
      this.fade1 = fade1;
      this.fade2 = fade2;
      this.mix1 = mix1;
      this.mix2 = mix2;
      this.delay1 = delay1;
      this.delay2 = delay2;

      this.setDelay(delayTime);
    }

    setDelay(delayTime) {
      this.modGain1.gain.setTargetAtTime(0.5 * delayTime, 0, 0.010);
      this.modGain2.gain.setTargetAtTime(0.5 * delayTime, 0, 0.010);
    }

    setPitchOffset(mult) {
      if (mult > 0) {
        this.mod1Gain.gain.value = 0;
        this.mod2Gain.gain.value = 0;
        this.mod3Gain.gain.value = 1;
        this.mod4Gain.gain.value = 1;
      } else {
        this.mod1Gain.gain.value = 1;
        this.mod2Gain.gain.value = 1;
        this.mod3Gain.gain.value = 0;
        this.mod4Gain.gain.value = 0;
      }
      this.setDelay(delayTime * Math.abs(mult));
    }
  }
  ```

---

### Task 2: Update PlayerContext to Support Speed and Pitch
**Files:**
* Modify: `src/lib/PlayerContext.jsx`

**Interfaces:**
* Consumes:
  * `Jungle`, `getMultiplier` from `src/utils/jungle.js`
* Produces:
  * `speed` (number), `pitch` (number) state values
  * `changeSpeed(speedVal)` function
  * `changePitch(pitchVal)` function

- [ ] **Step 1: Import Jungle and getMultiplier**
  Add import statement at the top of `src/lib/PlayerContext.jsx`:
  ```javascript
  import { Jungle, getMultiplier } from '../utils/jungle';
  ```

- [ ] **Step 2: Add states and refs**
  Add state and ref hooks inside `PlayerProvider`:
  ```javascript
  const [speed, setSpeed] = useState(1);
  const [pitch, setPitch] = useState(0);
  const pitchShifterRef = useRef(null);
  const audioSourceRef = useRef(null);
  ```

- [ ] **Step 3: Update ensureAudioCtx to set up Jungle pitch shifter**
  Modify `ensureAudioCtx` to initialize and wire up `pitchShifterRef.current`.
  ```javascript
  const ensureAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    if (!masterGainRef.current) {
      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.gain.value = 1;
      
      // Initialize pitch shifter
      pitchShifterRef.current = new Jungle(audioCtxRef.current);
      
      // Initially bypassed (since speed=1, pitch=0)
      masterGainRef.current.connect(audioCtxRef.current.destination);
    }
    return audioCtxRef.current;
  }, []);
  ```

- [ ] **Step 4: Update loadSong to apply configuration to new Audio instances**
  When creating a new `Audio(song.audio_url)`, set CORS credentials and disable native pitch preservation, and set the initial playback rate:
  ```javascript
  if (song.audio_url) {
    const audio = new Audio(song.audio_url);
    audio.crossOrigin = "anonymous";
    audio.preservesPitch = false;
    audio.mozPreservesPitch = false;
    audio.webkitPreservesPitch = false;
    audio.volume = volume;
    audio.playbackRate = speed; // Apply active speed
    // ... rest of event handlers
    audioRef.current = audio;
  }
  ```
  Ensure `killAudio` clears `audioSourceRef.current`:
  ```javascript
  const killAudio = (audio) => {
    if (!audio) return;
    audio.onloadedmetadata = null;
    audio.ontimeupdate = null;
    audio.onended = null;
    audio.pause();
    audio.src = '';
    audio.load();
    audioSourceRef.current = null; // Clear connected source
  };
  ```

- [ ] **Step 5: Route main audio node in play()**
  In the `play()` callback, connect `audioRef.current` to `masterGainRef` using `createMediaElementSource` if not already connected:
  ```javascript
  const play = useCallback(() => {
    const ctx = ensureAudioCtx();
    if (audioRef.current) {
      if (!audioSourceRef.current) {
        audioSourceRef.current = ctx.createMediaElementSource(audioRef.current);
        audioSourceRef.current.connect(masterGainRef.current);
      }
      audioRef.current.play().catch(() => {});
    }
    if (stems.some(s => s.url)) {
      const offset = audioRef.current?.currentTime ?? stemOffsetRef.current;
      startStemSources(offset, stems, stemVolumes);
      if (!audioRef.current) startStemTick();
    }
    setIsPlaying(true);
  }, [stems, stemVolumes, ensureAudioCtx, startStemSources, startStemTick]);
  ```

- [ ] **Step 6: Update startStemSources to set stem playback rate**
  Ensure newly created stem sources have the current speed applied:
  ```javascript
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(gain);
  src.playbackRate.value = speed; // Set current speed
  src.start(ctx.currentTime + 0.01, Math.min(offset, buf.duration - 0.01));
  stemSourcesRef.current.push(src);
  ```

- [ ] **Step 7: Implement updatePitchOffset helper**
  Add helper function to apply the net pitch offset to `pitchShifterRef.current` and manage bypass connections:
  ```javascript
  const updatePitchOffset = useCallback((pitchVal, speedVal) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !pitchShifterRef.current || !masterGainRef.current) return;

    // Calculate speed-induced pitch shift on stem buffers (semitones)
    const speedShift = Math.log2(speedVal) * 12;
    const netShift = pitchVal - speedShift;

    // Bypass pitch shifter if net shift is very close to 0 to preserve original quality
    if (Math.abs(netShift) < 0.01) {
      masterGainRef.current.disconnect();
      masterGainRef.current.connect(ctx.destination);
    } else {
      masterGainRef.current.disconnect();
      masterGainRef.current.connect(pitchShifterRef.current.input);
      pitchShifterRef.current.output.disconnect();
      pitchShifterRef.current.output.connect(ctx.destination);
      pitchShifterRef.current.setPitchOffset(getMultiplier(netShift));
    }
  }, []);
  ```

- [ ] **Step 8: Implement changeSpeed and changePitch**
  Create change speed/pitch handlers that update state, active nodes, and recalculate pitch offsets:
  ```javascript
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
    updatePitchOffset(newPitch, speed);
  }, [speed, updatePitchOffset]);
  ```

- [ ] **Step 9: Expose values in Context Provider**
  Add `speed`, `pitch`, `changeSpeed`, `changePitch` to `PlayerContext.Provider` return value.

---

### Task 3: Implement Speed and Pitch Sliders in AudioPlayer UI
**Files:**
* Modify: `src/components/practice/AudioPlayer.jsx`

**Interfaces:**
* Consumes:
  * `speed`, `pitch`, `changeSpeed`, `changePitch` from `usePlayer()` context

- [ ] **Step 1: Import Slider, RotateCcw (or similar icon for reset)**
  Import `RotateCcw` from `lucide-react`.

- [ ] **Step 2: Consume variables from usePlayer**
  Destructure `speed`, `pitch`, `changeSpeed`, `changePitch` in the `AudioPlayer` function body.

- [ ] **Step 3: Render Speed and Pitch sliders**
  Add the controls inside `AudioPlayer.jsx` right after the Volume slider and before the Instrument Stems mixer:
  ```jsx
  {/* Speed & Pitch Controls */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 px-1">
    {/* Speed Slider */}
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Playback Speed</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-medium text-foreground">{speed.toFixed(2)}x</span>
          {speed !== 1 && (
            <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground hover:text-foreground" onClick={() => changeSpeed(1.0)} title="Reset speed">
              <RotateCcw className="w-2.5 h-2.5" />
            </Button>
          )}
        </div>
      </div>
      <Slider value={[speed]} min={0.5} max={1.5} step={0.05} onValueChange={(v) => changeSpeed(v[0])} disabled={!hasAudio} />
    </div>

    {/* Pitch Slider */}
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pitch Shift</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-medium text-foreground">{pitch > 0 ? `+${pitch}` : pitch} semitones</span>
          {pitch !== 0 && (
            <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground hover:text-foreground" onClick={() => changePitch(0)} title="Reset pitch">
              <RotateCcw className="w-2.5 h-2.5" />
            </Button>
          )}
        </div>
      </div>
      <Slider value={[pitch]} min={-6} max={6} step={1} onValueChange={(v) => changePitch(v[0])} disabled={!hasAudio} />
    </div>
  </div>
  ```

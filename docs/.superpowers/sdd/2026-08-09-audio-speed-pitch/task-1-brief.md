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

import { defineConfig } from '@argo-video/cli'

export default defineConfig({
  baseURL: 'http://localhost:3101',
  demosDir: 'demos',
  outputDir: 'videos',
  tts: { defaultVoice: 'af_heart', defaultSpeed: 1.0 },
  video: {
    width: 1920,
    height: 1080,
    fps: 30,
    browser: 'chromium',
    captureMode: 'jpeg-stitch',
    deviceScaleFactor: 1,
    cursorHighlight: { mode: 'click', color: '#8B5CF6' },
  },
  export: {
    preset: 'medium',
    crf: 18,
    sharpen: true,
    transition: { type: 'dissolve', durationMs: 600 },
    speedRamp: { gapSpeed: 2.5, minGapMs: 800 },
    audio: { loudnorm: true },
  },
})

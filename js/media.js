/**
 * SpeakHero - Camera, Microphone & MediaRecorder Controller
 * Handles WebRTC streams, video previews, audio visualization & recording.
 */

import { sound } from './audio-fx.js';

export class MediaController {
  constructor(videoPreviewElement, audioVisualizerCanvas = null) {
    this.videoEl = videoPreviewElement;
    this.canvasEl = audioVisualizerCanvas;
    this.stream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.recordingStartTime = 0;
    this.timerInterval = null;
    this.audioCtx = null;
    this.analyser = null;
    this.animFrameId = null;
    this.mirror = true;

    // Callbacks
    this.onTick = null; // (elapsedSeconds, remainingSeconds, progressPercent) => {}
    this.onAutoStop = null; // () => {}
    this.onThresholdReached = null; // (minReached) => {}

    // Web Speech API Live Speech-to-Text
    this.transcript = '';
    this.recognition = null;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'zh-TW';
        this.recognition.onresult = (event) => {
          let text = '';
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript;
          }
          this.transcript = text;
        };
      } catch (e) {
        console.warn('SpeechRecognition init error:', e);
      }
    }
  }

  // Request Camera + Mic stream (user facing camera for mobile)
  async startPreview(withVideo = true) {
    this.stopPreview();
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: withVideo ? {
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 1280 }
        } : false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (this.videoEl && withVideo) {
        this.videoEl.srcObject = this.stream;
        this.videoEl.muted = true;
        this.videoEl.style.transform = this.mirror ? 'scaleX(-1)' : 'scaleX(1)';
        await this.videoEl.play();
      }

      if (this.canvasEl) {
        this.setupAudioVisualizer();
      }
      return true;
    } catch (err) {
      console.error('Failed to get media devices:', err);
      throw err;
    }
  }

  stopPreview() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }
  }

  setupAudioVisualizer() {
    if (!this.stream || !this.canvasEl) return;
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const source = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const canvasCtx = this.canvasEl.getContext('2d');
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      const draw = () => {
        if (!this.stream) return;
        this.animFrameId = requestAnimationFrame(draw);
        this.analyser.getByteFrequencyData(dataArray);

        canvasCtx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
        const barWidth = (this.canvasEl.width / dataArray.length) * 1.5;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
          const barHeight = (dataArray[i] / 255) * this.canvasEl.height;
          const gradient = canvasCtx.createLinearGradient(0, this.canvasEl.height, 0, 0);
          gradient.addColorStop(0, '#10B981');
          gradient.addColorStop(1, '#F59E0B');

          canvasCtx.fillStyle = gradient;
          canvasCtx.fillRect(x, this.canvasEl.height - barHeight, barWidth - 1, barHeight);
          x += barWidth;
        }
      };
      draw();
    } catch (e) {
      console.warn('Audio Visualizer setup failed:', e);
    }
  }

  // Start recording with min/max thresholds
  async startRecording(options = { minSeconds: 30, maxSeconds: 60, withVideo: true }) {
    if (!this.stream) {
      await this.startPreview(options.withVideo);
    }

    this.recordedChunks = [];
    let mimeType = 'video/webm;codecs=vp8,opus';
    if (!options.withVideo) {
      mimeType = 'audio/webm;codecs=opus';
    }

    if (!MediaRecorder.isTypeSupported(mimeType)) {
      if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4';
      else if (MediaRecorder.isTypeSupported('video/webm')) mimeType = 'video/webm';
      else mimeType = '';
    }

    try {
      this.mediaRecorder = mimeType 
        ? new MediaRecorder(this.stream, { mimeType }) 
        : new MediaRecorder(this.stream);
    } catch {
      this.mediaRecorder = new MediaRecorder(this.stream);
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.transcript = '';
    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (e) {
        console.warn('SpeechRecognition start error:', e);
      }
    }

    return new Promise((resolve) => {
      this.mediaRecorder.onstart = () => {
        this.isRecording = true;
        this.recordingStartTime = Date.now();
        sound.startRecord();

        let thresholdReached = false;
        this.timerInterval = setInterval(() => {
          const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
          const remaining = Math.max(0, options.maxSeconds - elapsed);
          const progress = Math.min(100, (elapsed / options.maxSeconds) * 100);

          if (!thresholdReached && elapsed >= options.minSeconds) {
            thresholdReached = true;
            if (this.onThresholdReached) this.onThresholdReached(true);
          }

          if (this.onTick) {
            this.onTick(elapsed, remaining, progress, thresholdReached);
          }

          if (elapsed >= options.maxSeconds) {
            clearInterval(this.timerInterval);
            if (this.onAutoStop) this.onAutoStop();
          }
        }, 200);

        resolve(true);
      };

      this.mediaRecorder.start(250); // Collect data chunk every 250ms
    });
  }

  // Stop recording and return Blob + URL + duration + transcript
  async stopRecording() {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      return null;
    }

    clearInterval(this.timerInterval);
    sound.stopRecord();

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn('SpeechRecognition stop error:', e);
      }
    }

    return new Promise((resolve) => {
      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        const duration = Math.floor((Date.now() - this.recordingStartTime) / 1000);
        const mimeType = this.mediaRecorder.mimeType || 'video/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);

        this.stopPreview(); // Immediately shut down camera and mic stream!

        resolve({
          blob,
          url,
          duration,
          mimeType,
          transcript: this.transcript || '',
          sizeBytes: blob.size
        });
      };

      this.mediaRecorder.stop();
    });
  }
}

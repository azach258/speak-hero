/**
 * SpeakHero - Main Application Controller
 * Orchestrates 15-minute daily tasks, 5-day milestones, UI state & Celebrations.
 */

import { db, Storage } from './db.js';
import { ARTICLES, getRandomArticle } from './articles.js';
import { AUDIO_POOL, getRandomAudio } from './audio-pool.js';
import { sound } from './audio-fx.js';
import { MediaController } from './media.js';
import { aiCoach, parseMarkdownToHtml } from './ai-coach.js';
import { milestoneMgr } from './milestone.js';
import { telegramNotifier } from './telegram.js';
import { obsidianSync } from './obsidian-sync.js';

// Helper: Convert Blob to Base64
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64data = reader.result.split(',')[1] || reader.result;
        resolve(base64data);
      } else {
        reject(new Error('FileReader result is not a string'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

class SpeakHeroApp {
  constructor() {
    this.settings = Storage.getSettings();
    this.todayKey = new Date().toISOString().split('T')[0];
    this.todayState = Storage.getTodayState(this.todayKey);
    this.currentArticle = getRandomArticle();
    this.currentAudio = getRandomAudio();
    this.task2Pass = 1; // 1 = 模式 A 素讀, 2 = 模式 B 精讀
    this.activeTab = 'task1';

    // Media Controllers
    this.t1Media = null;
    this.t2Media = null;
    this.t3Media = null;
    this.msMedia = null;

    // Task 1 Audio Player & Thinking States
    this.t1AudioElem = null;
    this.isT1AudioPlaying = false;
    this.t1AudioElapsed = 0;
    this.t1AudioTimer = null;
    this.t1ThinkingTimer = null;
    this.t1SpeechUtterance = null;

    // Task 2 Dual Pass Audio Cache (Audio A: 素讀, Audio B: 精讀)
    this.task2AudioA = null;
    this.task2AudioB = null;
    this.task2Pass1Result = null;
    this.task2Pass2Result = null;

    // Cheering quotes for Task 3
    this.cheeringQuotes = [
      "💖 隨便講什麼都好，停頓了深呼吸繼續講！",
      "🔥 不要在乎完不完美，大膽講出來就是勝利！",
      "🌟 你正在打破說話恐懼，保持心流輸出節奏！",
      "🚀 卡殼完全沒關係，想到哪說到哪，Just do it！",
      "💪 表達是肌肉記憶，每一次發聲都是實力的累積！",
      "🎯 忘掉框架，享受與自己對話的過程，繼續講！"
    ];
    this.cheerTimer = null;
  }

  async init() {
    await db.init();
    sound.enabled = this.settings.soundEnabled;

    this.renderHeaderStats();
    this.setupNavigation();
    this.setupTask1();
    this.setupTask2();
    this.setupTask3();
    this.setupMilestoneExam();
    this.setupDailyRewardModal();
    this.setupSettingsModal();
    this.setupSyncActions();
    this.updateDailyProgress();
    this.checkMilestoneAvailability();
  }

  // Format date helper
  getFormattedToday() {
    const d = new Date();
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  }

  // Render Stats
  renderHeaderStats() {
    const streakEl = document.getElementById('streak-count');
    const dayLabelEl = document.getElementById('today-date-lbl');
    const levelBadgeEl = document.getElementById('current-level-badge');
    
    if (streakEl) streakEl.textContent = this.settings.currentStreak;
    if (dayLabelEl) dayLabelEl.textContent = this.getFormattedToday();
    
    // Level calculation based on streak
    let level = "L1 敢開口小白";
    if (this.settings.currentStreak >= 15) level = "L4 說服演說大師";
    else if (this.settings.currentStreak >= 10) level = "L3 氣場感染教練";
    else if (this.settings.currentStreak >= 5) level = "L2 結構邏輯達人";

    if (levelBadgeEl) levelBadgeEl.textContent = level;
  }

  // Check Milestone Exam availability
  checkMilestoneAvailability() {
    const banner = document.getElementById('milestone-banner');
    const isMS = milestoneMgr.isMilestoneDay(this.settings.currentStreak) || this.settings.simulatedDay === 5;
    
    if (banner) {
      if (isMS) {
        banner.style.display = 'flex';
        const titleEl = banner.querySelector('.ms-title-text');
        if (titleEl) titleEl.textContent = `🏆 第 ${Math.ceil(this.settings.currentStreak / 5)} 期 5 天里程碑考核已解鎖！`;
      } else {
        banner.style.display = 'none';
      }
    }
  }

  // Tab Navigation
  setupNavigation() {
    const brandLogo = document.querySelector('.brand-logo');
    if (brandLogo) {
      brandLogo.style.cursor = 'pointer';
      brandLogo.title = '點擊重新整理頁面';
      brandLogo.addEventListener('click', () => {
        window.location.reload();
      });
    }

    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        this.switchTab(targetTab);
      });
    });
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    
    // Update tab bar buttons
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => {
      if (t.dataset.tab === tabId) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    // Update panel active states
    document.querySelectorAll('.task-panel').forEach(p => p.classList.remove('active'));
    const targetPanel = document.getElementById(`panel-${tabId}`);
    if (targetPanel) targetPanel.classList.add('active');

    // Always stop camera & mic & audio playback when switching tabs to protect privacy & battery
    this.stopTask1Audio();
    if (this.t1Media) this.t1Media.stopPreview();
    if (this.t2Media) this.t2Media.stopPreview();
    if (this.t3Media) this.t3Media.stopPreview();
  }

  // ==========================================
  // TASK 1: 60s Audio Listen + 45~60s Logic Restatement
  // ==========================================
  setupTask1() {
    const videoEl = document.getElementById('t1-video');
    const canvasEl = document.getElementById('t1-visualizer');
    const placeholderEl = document.getElementById('t1-placeholder');
    const overlayEl = document.getElementById('t1-overlay');
    const recordBtn = document.getElementById('t1-record-btn');
    const timerPill = document.getElementById('t1-timer');
    const recIndicator = document.getElementById('t1-rec-indicator');
    const feedbackBox = document.getElementById('t1-feedback');
    const studioContainer = document.getElementById('t1-studio-container');

    // Audio Listening UI Elements
    this.t1AudioElem = document.getElementById('t1-audio-elem');
    const playBtn = document.getElementById('t1-audio-play-btn');
    const switchAudioBtn = document.getElementById('t1-switch-audio-btn');
    const toggleTipsBtn = document.getElementById('t1-toggle-tips-btn');
    const tipsContent = document.getElementById('t1-audio-tips');
    const startChallengeBtn = document.getElementById('t1-start-challenge-btn');

    this.t1Media = new MediaController(videoEl, canvasEl);

    // Media Controller Callbacks (For 45~60s Restatement Recording)
    this.t1Media.onTick = (elapsed, remaining, progress, thresholdReached) => {
      if (timerPill) timerPill.textContent = `${elapsed}s / 60s`;
      if (elapsed >= 45) {
        if (timerPill) timerPill.style.color = '#10B981';
        if (recordBtn) {
          recordBtn.className = 'btn-primary btn-success';
          recordBtn.innerHTML = `<span>✅ 滿 45s 達標！點擊結束並分析 (${elapsed}s)</span>`;
        }
      } else {
        if (recordBtn) {
          recordBtn.className = 'btn-primary recording';
          recordBtn.innerHTML = `<span>⏹️ 邏輯重述中 (${elapsed}s / 60s · 滿 45s 達標)</span>`;
        }
      }
    };

    this.t1Media.onThresholdReached = () => {
      sound.taskComplete();
    };

    this.t1Media.onAutoStop = async () => {
      await this.finishTask1();
    };

    // 1. Audio Listening Controls
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (this.isT1AudioPlaying) {
          this.pauseTask1Audio();
        } else {
          this.playTask1Audio();
        }
      });
    }

    if (switchAudioBtn) {
      switchAudioBtn.addEventListener('click', () => {
        this.stopTask1Audio();
        this.currentAudio = getRandomAudio(this.currentAudio?.id);
        this.renderTask1Audio();
        sound.playBeep(587.33, 'sine', 0.1, 0.1);
      });
    }

    if (toggleTipsBtn && tipsContent) {
      toggleTipsBtn.addEventListener('click', () => {
        const isHidden = tipsContent.style.display === 'none' || !tipsContent.style.display;
        tipsContent.style.display = isHidden ? 'block' : 'none';
        toggleTipsBtn.innerHTML = isHidden 
          ? '<span>🙈 收合核心論點提示</span>' 
          : '<span>👁️ 展開核心論點提示</span>';
      });
    }

    if (startChallengeBtn) {
      startChallengeBtn.addEventListener('click', () => {
        this.stopTask1Audio();
        this.startTask1ThinkingCountdown();
      });
    }

    // 2. Restatement Recording Button
    if (recordBtn) {
      recordBtn.addEventListener('click', async () => {
        if (!this.t1Media.isRecording) {
          this.stopTask1Audio();
          await this.startTask1Recording();
        } else {
          await this.finishTask1();
        }
      });
    }

    // Initial render of audio card
    this.renderTask1Audio();
    this.resetTask1Studio();
  }

  renderTask1Audio() {
    const titleEl = document.getElementById('t1-audio-title');
    const catEl = document.getElementById('t1-audio-category');
    const speakerEl = document.getElementById('t1-audio-speaker-badge');
    const tipsListEl = document.getElementById('t1-tips-list');
    const tipsContent = document.getElementById('t1-audio-tips');
    const toggleTipsBtn = document.getElementById('t1-toggle-tips-btn');
    const durationEl = document.getElementById('t1-audio-duration');
    const currentTimeEl = document.getElementById('t1-audio-current-time');
    const progressFill = document.getElementById('t1-audio-progress-fill');
    const statusHint = document.getElementById('t1-audio-status-hint');

    if (!this.currentAudio) this.currentAudio = getRandomAudio();

    if (titleEl) titleEl.textContent = this.currentAudio.title;
    if (catEl) catEl.textContent = this.currentAudio.category;
    if (speakerEl) speakerEl.textContent = `🎙️ ${this.currentAudio.speaker || '羅振宇'} 60 秒`;

    if (tipsListEl && this.currentAudio.keyPoints) {
      tipsListEl.innerHTML = this.currentAudio.keyPoints.map(kp => `<li>${kp}</li>`).join('');
    }

    if (tipsContent) tipsContent.style.display = 'none';
    if (toggleTipsBtn) toggleTipsBtn.innerHTML = '<span>👁️ 展開核心論點提示</span>';

    if (currentTimeEl) currentTimeEl.textContent = '0:00';
    if (durationEl) durationEl.textContent = '1:00';
    if (progressFill) progressFill.style.width = '0%';
    if (statusHint) {
      statusHint.textContent = '點擊播放開始聆聽 60s 語音';
      statusHint.style.color = '#F59E0B';
    }

    if (this.t1AudioElem) {
      this.t1AudioElem.src = this.currentAudio.audioUrl || '';
    }
  }

  playTask1Audio() {
    const playIcon = document.getElementById('t1-play-icon');
    const statusHint = document.getElementById('t1-audio-status-hint');
    const progressFill = document.getElementById('t1-audio-progress-fill');
    const currentTimeEl = document.getElementById('t1-audio-current-time');

    this.isT1AudioPlaying = true;
    if (playIcon) playIcon.textContent = '⏸️';
    if (statusHint) {
      statusHint.textContent = '🎧 正在聆聽 60 秒語音精華...';
      statusHint.style.color = '#10B981';
    }

    // Try HTML5 Audio playback
    if (this.t1AudioElem && this.t1AudioElem.src) {
      this.t1AudioElem.play().catch(err => {
        console.warn('HTML5 Audio play blocked or offline, using Web Speech / Timer fallback:', err);
      });
    }

    // Progress and Timer Tracker (Standard 60 seconds)
    clearInterval(this.t1AudioTimer);
    const totalDuration = this.currentAudio?.duration || 60;

    this.t1AudioTimer = setInterval(() => {
      this.t1AudioElapsed += 0.5;
      const cur = Math.min(totalDuration, Math.floor(this.t1AudioElapsed));
      const min = Math.floor(cur / 60);
      const sec = cur % 60;
      if (currentTimeEl) currentTimeEl.textContent = `${min}:${sec < 10 ? '0' : ''}${sec}`;

      const pct = Math.min(100, (this.t1AudioElapsed / totalDuration) * 100);
      if (progressFill) progressFill.style.width = `${pct}%`;

      if (this.t1AudioElapsed >= totalDuration) {
        clearInterval(this.t1AudioTimer);
        this.stopTask1Audio();
        sound.taskComplete();
        if (statusHint) {
          statusHint.textContent = '✅ 60 秒語音聆聽完畢！準備思考';
          statusHint.style.color = '#10B981';
        }
        // Auto-trigger 3-Second Thinking Buffer Countdown!
        setTimeout(() => {
          this.startTask1ThinkingCountdown();
        }, 600);
      }
    }, 500);
  }

  pauseTask1Audio() {
    const playIcon = document.getElementById('t1-play-icon');
    const statusHint = document.getElementById('t1-audio-status-hint');

    this.isT1AudioPlaying = false;
    clearInterval(this.t1AudioTimer);
    if (playIcon) playIcon.textContent = '▶️';
    if (statusHint) {
      statusHint.textContent = '⏸️ 已暫停播放';
      statusHint.style.color = '#94A3B8';
    }
    if (this.t1AudioElem) this.t1AudioElem.pause();
    if ('speechSynthesis' in window) window.speechSynthesis.pause();
  }

  stopTask1Audio() {
    this.pauseTask1Audio();
    this.t1AudioElapsed = 0;
    const playIcon = document.getElementById('t1-play-icon');
    if (playIcon) playIcon.textContent = '▶️';
    if (this.t1AudioElem) {
      this.t1AudioElem.pause();
      this.t1AudioElem.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  // 3-Second Thinking Buffer Countdown
  startTask1ThinkingCountdown() {
    const thinkingBox = document.getElementById('t1-thinking-box');
    const thinkingNum = document.getElementById('t1-thinking-num');
    const studioWrap = document.getElementById('t1-rec-studio-wrap');

    if (!thinkingBox) {
      this.startTask1Recording();
      return;
    }

    this.stopTask1Audio();
    thinkingBox.style.display = 'block';
    if (studioWrap) studioWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    let count = 3;
    if (thinkingNum) thinkingNum.textContent = `${count}`;
    sound.countdownBeep(false);

    clearInterval(this.t1ThinkingTimer);
    this.t1ThinkingTimer = setInterval(async () => {
      count--;
      if (count > 0) {
        if (thinkingNum) thinkingNum.textContent = `${count}`;
        sound.countdownBeep(false);
      } else {
        clearInterval(this.t1ThinkingTimer);
        sound.countdownBeep(true);
        thinkingBox.style.display = 'none';
        
        // Auto start 45~60s Restatement Recording
        await this.startTask1Recording();
      }
    }, 1000);
  }

  // Start 45~60s Restatement Recording
  async startTask1Recording() {
    const videoEl = document.getElementById('t1-video');
    const placeholderEl = document.getElementById('t1-placeholder');
    const overlayEl = document.getElementById('t1-overlay');
    const recordBtn = document.getElementById('t1-record-btn');
    const timerPill = document.getElementById('t1-timer');
    const recIndicator = document.getElementById('t1-rec-indicator');

    if (placeholderEl) placeholderEl.style.display = 'none';
    if (videoEl) videoEl.style.display = 'block';
    if (overlayEl) overlayEl.style.display = 'flex';

    try {
      await this.t1Media.startPreview(true);
    } catch (err) {
      console.warn('Camera preview failed:', err);
    }

    await this.t1Media.startRecording({ minSeconds: 45, maxSeconds: 60, withVideo: true });

    if (recordBtn) {
      recordBtn.classList.add('recording');
      recordBtn.innerHTML = `<span>⏹️ 邏輯重述中 (0s / 60s · 滿 45s 達標)</span>`;
    }
    if (recIndicator) recIndicator.classList.add('active');
    if (timerPill) {
      timerPill.textContent = '0s / 60s';
      timerPill.style.color = '#FFF';
    }
  }

  resetTask1Studio() {
    const studioContainer = document.getElementById('t1-studio-container');
    const feedbackBox = document.getElementById('t1-feedback');
    const placeholderEl = document.getElementById('t1-placeholder');
    const videoEl = document.getElementById('t1-video');
    const overlayEl = document.getElementById('t1-overlay');
    const recordBtn = document.getElementById('t1-record-btn');
    const timerPill = document.getElementById('t1-timer');
    const thinkingBox = document.getElementById('t1-thinking-box');

    this.stopTask1Audio();
    if (thinkingBox) thinkingBox.style.display = 'none';
    if (feedbackBox) feedbackBox.style.display = 'none';
    if (studioContainer) studioContainer.style.display = 'block';
    if (placeholderEl) placeholderEl.style.display = 'flex';
    if (videoEl) videoEl.style.display = 'none';
    if (overlayEl) overlayEl.style.display = 'none';
    if (timerPill) {
      timerPill.textContent = '0s / 60s';
      timerPill.style.color = '#FFF';
    }
    if (recordBtn) {
      recordBtn.className = 'btn-primary';
      recordBtn.innerHTML = '<span>🎯 開始 45~60s 邏輯重述錄音</span>';
      recordBtn.disabled = false;
    }

    this.renderTask1Audio();
  }

  async finishTask1() {
    const studioContainer = document.getElementById('t1-studio-container');
    const feedbackBox = document.getElementById('t1-feedback');
    const recIndicator = document.getElementById('t1-rec-indicator');

    if (recIndicator) recIndicator.classList.remove('active');

    // 1. Stop recording and shutdown stream
    const result = await this.t1Media.stopRecording();

    // 2. Show analyzing state
    if (studioContainer) studioContainer.style.display = 'none';
    if (feedbackBox) {
      feedbackBox.style.display = 'block';
      feedbackBox.innerHTML = `
        <div class="analyzing-state-box">
          <div class="spinner-glow"></div>
          <h3 style="color:#F59E0B; margin:12px 0 6px; font-size:16px;">🧠 Gemini 正在進行邏輯重述診斷...</h3>
          <p style="color:#94A3B8; font-size:12px;">正在比對《${this.currentAudio?.title || '認知語音'}》核心觀點，評估觀點抓取率、邏輯結構與結論先行</p>
        </div>
      `;
    }

    if (result) {
      // Save recording to DB
      await db.saveRecording({
        id: `t1-${this.todayKey}-${Date.now()}`,
        date: this.todayKey,
        taskId: 'task1',
        blob: result.blob,
        duration: result.duration
      });

      // Save Day 1 baseline if not exists
      const day1Milestone = await db.getMilestone(1);
      if (!day1Milestone) {
        await db.saveMilestone({
          day: 1,
          date: this.todayKey,
          blob: result.blob,
          duration: result.duration
        });
      }

      // AI Evaluation (Passed actual audio/video blob, transcript, and currentAudio context)
      const report = await aiCoach.evaluateTask1(result.duration, result.blob, result.transcript, this.currentAudio);
      this.todayState.task1Done = true;
      this.todayState.task1Score = report;
      Storage.saveTodayState(this.todayKey, this.todayState);

      // Render single-screen result card with "Next Step: Task 2" CTA
      this.renderAIFeedback(feedbackBox, report, '60秒聽音+45~60秒邏輯重述', 'task2', () => this.resetTask1Studio());
      sound.taskComplete();
      this.updateDailyProgress();
    }
  }

  // ==========================================
  // TASK 2: 300-Word Dual-Track Reading Setup (Mode A vs Mode B)
  // ==========================================
  setupTask2() {
    const canvasEl = document.getElementById('t2-visualizer');
    const switchArticleBtn = document.getElementById('t2-switch-article-btn');
    const recordBtn = document.getElementById('t2-record-btn');
    const audioBar = document.getElementById('t2-audio-bar');
    const timerPill = document.getElementById('t2-timer');
    const recLabel = document.getElementById('t2-rec-label');

    this.t2Media = new MediaController(null, canvasEl);

    this.t2Media.onTick = (elapsed, remaining, progress, thresholdReached) => {
      if (timerPill) timerPill.textContent = `${elapsed}s`;
      if (recordBtn) {
        if (this.task2Pass === 1) {
          recordBtn.innerHTML = `<span>⏹️ 朗讀完畢，點擊完成第一次錄音 (${elapsed}s)</span>`;
        } else {
          recordBtn.innerHTML = `<span>⏹️ 朗讀完畢，點擊完成第二次錄音 (${elapsed}s)</span>`;
        }
      }
    };

    if (switchArticleBtn) {
      switchArticleBtn.addEventListener('click', () => {
        if (this.t2Media && this.t2Media.isRecording) return;
        this.currentArticle = getRandomArticle(this.currentArticle.id);
        this.task2Pass = 1;
        this.task2AudioA = null;
        this.task2AudioB = null;
        this.task2Pass1Result = null;
        this.task2Pass2Result = null;
        this.renderTask2Article();
        sound.playBeep(587.33, 'sine', 0.1, 0.1);
      });
    }

    if (recordBtn) {
      recordBtn.addEventListener('click', async () => {
        if (!this.t2Media.isRecording) {
          // Start Recording Current Pass
          if (audioBar) audioBar.style.display = 'flex';
          if (recLabel) recLabel.textContent = this.task2Pass === 1 ? '第一次素讀錄音中' : '第二次精讀錄音中';
          if (timerPill) timerPill.textContent = '0s';

          await this.runCountdown(recordBtn);
          await this.t2Media.startRecording({ minSeconds: 5, maxSeconds: 120, withVideo: false });
          
          recordBtn.className = 'btn-primary recording';
          if (this.task2Pass === 1) {
            recordBtn.innerHTML = '<span>⏹️ 朗讀完畢，點擊完成第一次錄音 (進入第二次)</span>';
          } else {
            recordBtn.innerHTML = '<span>⏹️ 朗讀完畢，點擊完成第二次錄音 (AI 對比分析)</span>';
          }
        } else {
          // Stop Recording Current Pass
          await this.finishTask2Pass();
        }
      });
    }

    this.renderTask2Article();
  }

  renderTask2Article() {
    const titleEl = document.getElementById('t2-art-title');
    const categoryEl = document.getElementById('t2-art-category');
    const contentEl = document.getElementById('t2-art-content');
    const passTagEl = document.getElementById('t2-pass-tag');
    const passDescEl = document.getElementById('t2-pass-desc');
    const legendBox = document.getElementById('t2-legend-box');
    const recordBtn = document.getElementById('t2-record-btn');
    const audioBar = document.getElementById('t2-audio-bar');

    if (titleEl) titleEl.textContent = this.currentArticle.title;
    if (categoryEl) categoryEl.textContent = this.currentArticle.category;
    if (audioBar) audioBar.style.display = 'none';

    if (this.task2Pass === 1) {
      if (passTagEl) {
        passTagEl.className = 'pass-tag pass1';
        passTagEl.innerHTML = '🌱 第一次：純文字素讀（模式 A）';
      }
      if (passDescEl) {
        passDescEl.textContent = '請點擊下方按鈕開始第一次錄音，大聲朗讀全文，無任何標註，自行摸索說話節奏與語調。';
      }
      if (legendBox) legendBox.style.display = 'none';
      if (contentEl) contentEl.innerHTML = this.currentArticle.plainText.replace(/\n\n/g, '<br><br>');
      if (recordBtn) {
        recordBtn.className = 'btn-primary';
        recordBtn.innerHTML = '<span>🎙️ 開始第一次錄音（素讀）</span>';
      }
    } else {
      if (passTagEl) {
        passTagEl.className = 'pass-tag pass2';
        passTagEl.innerHTML = '🔥 第二次：符號精讀（模式 B）';
      }
      if (passDescEl) {
        passDescEl.textContent = '請點擊下方按鈕開始第二次錄音：遇【粗體】加重語氣、遇【/】短暫換氣、遇【//】深呼吸長停頓！';
      }
      if (legendBox) legendBox.style.display = 'flex';
      if (contentEl) contentEl.innerHTML = this.currentArticle.markedText.replace(/\n\n/g, '<br><br>');
      if (recordBtn) {
        recordBtn.className = 'btn-primary';
        recordBtn.innerHTML = '<span>🎙️ 開始第二次錄音（精讀）</span>';
      }
    }
  }

  async finishTask2Pass() {
    const audioBar = document.getElementById('t2-audio-bar');
    const feedbackBox = document.getElementById('t2-feedback');
    const studioContainer = document.getElementById('t2-studio-container');

    if (audioBar) audioBar.style.display = 'none';

    const result = await this.t2Media.stopRecording();
    if (!result) return;

    // Convert recorded blob to Base64 string for persistent caching & multimodal processing
    try {
      result.base64 = await blobToBase64(result.blob);
    } catch (e) {
      console.warn('Task 2 audio blob to base64 failed:', e);
    }

    if (this.task2Pass === 1) {
      // Completed Step 1 (Mode A: 素讀) -> Advance to Step 2 (Mode B: 精讀)
      this.task2AudioA = result;
      this.task2Pass1Result = result;
      this.task2Pass = 2;
      this.todayState.task2Step1Done = true;
      Storage.saveTodayState(this.todayKey, this.todayState);
      
      sound.taskComplete();
      this.renderTask2Article();

      // Smoothly scroll to reading container top for second pass
      const readingContainer = document.querySelector('.reading-container');
      if (readingContainer) readingContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      // Completed Step 2 (Mode B: 精讀) -> Both audio A & B ready! Run AI Contrast Analysis
      this.task2AudioB = result;
      this.task2Pass2Result = result;
      this.todayState.task2Step2Done = true;

      // Show Analyzing State
      if (studioContainer) studioContainer.style.display = 'none';
      if (feedbackBox) {
        feedbackBox.style.display = 'block';
        feedbackBox.innerHTML = `
          <div class="analyzing-state-box">
            <div class="spinner-glow"></div>
            <h3 style="color:#F59E0B; margin:12px 0 6px; font-size:16px;">🧠 Gemini 正在進行雙軌朗讀前後質變診斷...</h3>
            <p style="color:#94A3B8; font-size:12px;">正在深度比對素讀 vs 精讀兩次音訊的咬字力量感、停頓留白與節奏躍升</p>
          </div>
        `;
      }

      // Save Audio A & Audio B recordings to IndexedDB
      await db.saveRecording({
        id: `t2-p1-${this.todayKey}-${Date.now()}`,
        date: this.todayKey,
        taskId: 'task2-pass1',
        blob: this.task2AudioA.blob,
        duration: this.task2AudioA.duration
      });
      await db.saveRecording({
        id: `t2-p2-${this.todayKey}-${Date.now()}`,
        date: this.todayKey,
        taskId: 'task2-pass2',
        blob: this.task2AudioB.blob,
        duration: this.task2AudioB.duration
      });

      // AI Contrast Evaluation
      const report = await aiCoach.evaluateTask2DualPass(
        this.task2AudioA,
        this.task2AudioB,
        this.currentArticle
      );

      this.todayState.task2Done = true;
      this.todayState.task2Score = report;
      Storage.saveTodayState(this.todayKey, this.todayState);

      this.renderTask2Feedback(feedbackBox, report);
      sound.taskComplete();
      this.updateDailyProgress();
    }
  }

  renderTask2Feedback(container, report) {
    if (!container || !report) return;
    container.style.display = 'block';

    const p1Url = this.task2AudioA?.url || this.task2Pass1Result?.url || '';
    const p2Url = this.task2AudioB?.url || this.task2Pass2Result?.url || '';

    // Render Markdown Body from Gemini or fallback structured metrics
    const reportBodyHtml = report.markdownContent ? `
      <div class="feedback-section" style="margin-top: 14px;">
        <div class="markdown-report-body">
          ${parseMarkdownToHtml(report.markdownContent)}
        </div>
      </div>
    ` : `
      <!-- Radar Metrics Grid -->
      <div class="metrics-radar-grid">
        <div class="metric-item"><span>🎵 節奏頓挫</span><span class="metric-val">${report.scores?.cadenceRhythm || 90}</span></div>
        <div class="metric-item"><span>💥 重音力量</span><span class="metric-val" style="color:#F59E0B;">${report.scores?.emphasisPower || 94}</span></div>
        <div class="metric-item"><span>🗣️ 咬字清晰</span><span class="metric-val">${report.scores?.clarity || 88}</span></div>
        <div class="metric-item"><span>🌟 自信氣場</span><span class="metric-val">${report.scores?.confidence || 92}</span></div>
      </div>

      <!-- Highlights -->
      <div class="feedback-section">
        <div class="feedback-label">✨ 兩次朗讀質變亮點 (Highlights)</div>
        <div class="feedback-text">
          ${(report.comparisonHighlights || []).map(h => `• ${h}`).join('<br>')}
        </div>
      </div>

      <div class="feedback-section">
        <div class="feedback-label">🎯 明日朗讀微行動 (Action)</div>
        <div class="feedback-text" style="color:#FEF08A;">
          ${report.improvement || '保持關鍵詞加重放慢，句子轉換時多留半拍呼吸！'}
        </div>
      </div>
    `;

    container.innerHTML = `
      <div class="ai-report-card">
        <div class="report-header">
          <div class="report-title">
            <span>🤖 雙軌朗讀前後質變診斷</span>
            <span style="font-size:11px; color:#94A3B8; font-weight:normal;">(素讀 vs 精讀)</span>
          </div>
          <div class="growth-badge-pill">
            ⚡ 力量感 ${report.growthPercent || '+32%'}
          </div>
        </div>

        <!-- Dual Audio Listeners -->
        <div class="dual-audio-card">
          <div style="font-size:12px; font-weight:700; color:#FDE68A; margin-bottom:6px;">🎧 親耳聽聽兩次讀法的力量感差異：</div>
          <div class="dual-audio-grid">
            <div class="audio-track-item">
              <div class="audio-track-header">
                <span style="color:#94A3B8;">1️⃣ 第一次（純文字素讀）</span>
                <span style="color:#FFF;">${this.task2AudioA?.duration || 0}s</span>
              </div>
              <audio src="${p1Url}" controls playsinline></audio>
            </div>
            <div class="audio-track-item" style="border-color:rgba(245, 158, 11, 0.4); background:rgba(245, 158, 11, 0.05);">
              <div class="audio-track-header">
                <span style="color:#F59E0B;">2️⃣ 第二次（符號精讀）</span>
                <span style="color:#10B981; font-weight:bold;">${this.task2AudioB?.duration || 0}s 🔥</span>
              </div>
              <audio src="${p2Url}" controls playsinline></audio>
            </div>
          </div>
        </div>

        ${reportBodyHtml}

        ${!report.markdownContent ? `
          <div class="coach-praise-box" style="margin-top:12px;">
            💬 教練寄語：${report.coachPraise || '雙軌朗讀法效果驚人！第二次精讀的重音與停頓力量感明顯躍升！🔥'}
          </div>
        ` : ''}

        <div class="next-step-btn-group" style="margin-top:16px;">
          <button id="fb-t2-next-step-btn" class="btn-primary btn-success" style="width:100%; min-height:48px; font-size:15px;">
            <span>👉 進入第三階段（3~5分鐘即興）➔</span>
          </button>
          <button id="fb-t2-retry-btn" class="btn-secondary" style="width:100%; font-size:12px; margin-top:6px;">
            <span>🔄 重新進行雙軌朗讀</span>
          </button>
        </div>
      </div>
    `;

    const nextBtn = container.querySelector('#fb-t2-next-step-btn');
    if (nextBtn) {
      nextBtn.onclick = () => {
        this.switchTab('task3');
      };
    }

    const retryBtn = container.querySelector('#fb-t2-retry-btn');
    if (retryBtn) {
      retryBtn.onclick = () => {
        this.resetTask2Studio();
      };
    }
  }

  resetTask2Studio() {
    const studioContainer = document.getElementById('t2-studio-container');
    const feedbackBox = document.getElementById('t2-feedback');
    this.task2Pass = 1;
    this.task2AudioA = null;
    this.task2AudioB = null;
    this.task2Pass1Result = null;
    this.task2Pass2Result = null;

    if (feedbackBox) feedbackBox.style.display = 'none';
    if (studioContainer) studioContainer.style.display = 'block';
    this.renderTask2Article();
  }

  // ==========================================
  // TASK 3: 3~5min Pure Voice Flow Setup
  // ==========================================
  setupTask3() {
    const canvasEl = document.getElementById('t3-visualizer');
    const recordBtn = document.getElementById('t3-record-btn');
    const timerPill = document.getElementById('t3-timer');
    const feedbackBox = document.getElementById('t3-feedback');
    const cheerToast = document.getElementById('t3-cheer-toast');
    const micPulse = document.getElementById('t3-mic-pulse');
    const flowStatus = document.getElementById('t3-flow-status');

    this.t3Media = new MediaController(null, canvasEl);

    this.t3Media.onTick = (elapsed, remaining, progress, thresholdReached) => {
      const min = Math.floor(elapsed / 60);
      const sec = elapsed % 60;
      if (timerPill) timerPill.textContent = `${min}:${sec < 10 ? '0' : ''}${sec} / 5:00`;

      if (elapsed >= 180) {
        if (timerPill) timerPill.style.color = '#10B981';
        if (recordBtn) {
          recordBtn.className = 'btn-primary btn-success';
          recordBtn.innerHTML = `<span>✅ 滿 3 分鐘達標！點擊結束並分析 (${min}分${sec}秒)</span>`;
        }
      } else {
        if (recordBtn) {
          recordBtn.className = 'btn-primary recording';
          recordBtn.innerHTML = `<span>⏹️ 語音心流中 (${min}分${sec}秒 · 滿 3 分鐘達標)</span>`;
        }
      }
    };

    this.t3Media.onThresholdReached = () => {
      sound.taskComplete();
    };

    this.t3Media.onAutoStop = async () => {
      await this.finishTask3();
    };

    if (recordBtn) {
      recordBtn.addEventListener('click', async () => {
        if (!this.t3Media.isRecording) {
          if (micPulse) micPulse.classList.add('recording');
          if (flowStatus) {
            flowStatus.className = 'flow-status-text recording';
            flowStatus.textContent = '🎙️ 語音心流中... 請暢所欲言！';
          }

          await this.runCountdown(recordBtn);
          // Pure audio recording (withVideo: false)
          await this.t3Media.startRecording({ minSeconds: 180, maxSeconds: 300, withVideo: false });
          
          recordBtn.classList.add('recording');
          recordBtn.innerHTML = `<span>⏹️ 語音心流中 (0:00 / 5:00 · 滿 3 分鐘達標)</span>`;
          this.startCheeringCycle(cheerToast);
        } else {
          // Finish Endurance Speech
          await this.finishTask3();
        }
      });
    }

    this.resetTask3Studio();
  }

  resetTask3Studio() {
    const studioContainer = document.getElementById('t3-studio-container');
    const feedbackBox = document.getElementById('t3-feedback');
    const recordBtn = document.getElementById('t3-record-btn');
    const timerPill = document.getElementById('t3-timer');
    const micPulse = document.getElementById('t3-mic-pulse');
    const flowStatus = document.getElementById('t3-flow-status');

    if (feedbackBox) feedbackBox.style.display = 'none';
    if (studioContainer) studioContainer.style.display = 'block';
    if (micPulse) micPulse.classList.remove('recording');
    if (flowStatus) {
      flowStatus.className = 'flow-status-text';
      flowStatus.textContent = '點擊下方按鈕開始語音心流';
    }
    if (timerPill) {
      timerPill.textContent = '0:00 / 5:00';
      timerPill.style.color = '#FFF';
    }
    if (recordBtn) {
      recordBtn.className = 'btn-primary';
      recordBtn.innerHTML = '<span>🎙️ 開始 3~5 分鐘耐力隨心講 (純語音)</span>';
      recordBtn.disabled = false;
    }
  }

  startCheeringCycle(toastEl) {
    if (this.cheerTimer) clearInterval(this.cheerTimer);
    let quoteIdx = 0;

    const showQuote = () => {
      if (!this.t3Media.isRecording) return;
      toastEl.textContent = this.cheeringQuotes[quoteIdx % this.cheeringQuotes.length];
      toastEl.classList.add('show');
      quoteIdx++;

      setTimeout(() => {
        toastEl.classList.remove('show');
      }, 7000);
    };

    setTimeout(showQuote, 3000);
    this.cheerTimer = setInterval(showQuote, 22000);
  }

  async finishTask3() {
    if (this.cheerTimer) clearInterval(this.cheerTimer);
    const studioContainer = document.getElementById('t3-studio-container');
    const feedbackBox = document.getElementById('t3-feedback');
    const recIndicator = document.getElementById('t3-rec-indicator');
    const cheerToast = document.getElementById('t3-cheer-toast');

    if (cheerToast) cheerToast.classList.remove('show');
    if (recIndicator) recIndicator.classList.remove('active');

    // 1. Immediately stop recording and shutdown camera hardware
    const result = await this.t3Media.stopRecording();

    // 2. Hide studio, show smooth single-screen analyzing state
    if (studioContainer) studioContainer.style.display = 'none';
    if (feedbackBox) {
      feedbackBox.style.display = 'block';
      feedbackBox.innerHTML = `
        <div class="analyzing-state-box">
          <div class="spinner-glow"></div>
          <h3 style="color:#F59E0B; margin:12px 0 6px; font-size:16px;">🧠 Gemini 2.5 Flash 正在深度診斷耐力報告...</h3>
          <p style="color:#94A3B8; font-size:12px;">正在分析您的心流持續度、自信氣場與即興破冰力</p>
        </div>
      `;
    }

    if (result) {
      await db.saveRecording({
        id: `t3-${this.todayKey}-${Date.now()}`,
        date: this.todayKey,
        taskId: 'task3',
        blob: result.blob,
        duration: result.duration
      });

      // AI Evaluation (Passed actual audio/video blob and live transcript)
      const report = await aiCoach.evaluateTask3(result.duration, result.blob, result.transcript);
      this.todayState.task3Done = true;
      this.todayState.task3Score = report;
      Storage.saveTodayState(this.todayKey, this.todayState);

      this.renderAIFeedback(feedbackBox, report, '3~5分鐘耐力自由表達', 'complete', () => this.resetTask3Studio());
      sound.taskComplete();
      this.updateDailyProgress();
    }
  }

  // ==========================================
  // Milestone Exam & Dual-Screen Comparison
  // ==========================================
  setupMilestoneExam() {
    const modal = document.getElementById('milestone-modal');
    const openBtn = document.getElementById('open-milestone-btn');
    const closeBtn = document.getElementById('close-milestone-btn');
    const msRecordBtn = document.getElementById('ms-record-btn');
    const msVideoPreview = document.getElementById('ms-video');
    const timerPill = document.getElementById('ms-timer');
    const recIndicator = document.getElementById('ms-rec-indicator');

    if (openBtn) {
      openBtn.addEventListener('click', async () => {
        modal.classList.add('active');
        this.msMedia = new MediaController(msVideoPreview);
        await this.msMedia.startPreview(true);
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        if (this.msMedia) this.msMedia.stopPreview();
      });
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        if (this.msMedia) this.msMedia.stopPreview();
      }
    });

    if (msRecordBtn) {
      msRecordBtn.addEventListener('click', async () => {
        if (!this.msMedia.isRecording) {
          await this.runCountdown(msRecordBtn);
          // 3-minute milestone recording (min 60s for demo, max 180s)
          await this.msMedia.startRecording({ minSeconds: 60, maxSeconds: 180, withVideo: true });
          msRecordBtn.classList.add('recording');
          msRecordBtn.innerHTML = `<span>⏹️ 考核錄製中 (滿 60s 可提審)</span>`;
          recIndicator.classList.add('active');

          this.msMedia.onTick = (elapsed, remaining, progress, thresholdReached) => {
            const min = Math.floor(elapsed / 60);
            const sec = elapsed % 60;
            timerPill.textContent = `${min}:${sec < 10 ? '0' : ''}${sec} / 3:00`;
            if (thresholdReached) {
              timerPill.style.color = '#10B981';
              msRecordBtn.innerHTML = `<span>✅ 提交考核 (${min}分${sec}秒)</span>`;
            }
          };
        } else {
          await this.finishMilestoneExam();
        }
      });
    }
  }

  async finishMilestoneExam() {
    const msRecordBtn = document.getElementById('ms-record-btn');
    const recIndicator = document.getElementById('ms-rec-indicator');
    const reportArea = document.getElementById('ms-report-area');
    const videoStudioArea = document.getElementById('ms-studio-area');

    const result = await this.msMedia.stopRecording();
    msRecordBtn.classList.remove('recording');
    recIndicator.classList.remove('active');
    msRecordBtn.innerHTML = `<span>⏳ 正在生成 5 天前後對比報告...</span>`;

    if (result) {
      // Save Day 5 Milestone
      const currentMilestoneNumber = Math.ceil(this.settings.currentStreak / 5) * 5 || 5;
      await db.saveMilestone({
        day: currentMilestoneNumber,
        date: this.todayKey,
        blob: result.blob,
        duration: result.duration
      });

      // Get Day 1 baseline
      let day1 = await db.getMilestone(1);
      if (!day1) {
        day1 = { url: result.url, blob: result.blob };
      } else {
        day1.url = URL.createObjectURL(day1.blob);
      }

      // Generate AI comparison
      const msReport = await aiCoach.evaluateMilestone(day1, result);
      
      // Render Dual Screen Videos + Metrics
      videoStudioArea.style.display = 'none';
      reportArea.style.display = 'block';

      const day1VideoEl = document.getElementById('ms-day1-video');
      const day5VideoEl = document.getElementById('ms-day5-video');
      if (day1VideoEl) day1VideoEl.src = day1.url;
      if (day5VideoEl) day5VideoEl.src = result.url;

      // Fill report metrics
      document.getElementById('ms-badge-title').textContent = msReport.badgeTitle;
      document.getElementById('ms-fluency-growth').textContent = msReport.metricsGrowth.fluencyIncrease;
      document.getElementById('ms-filler-reduction').textContent = msReport.metricsGrowth.fillerReduction;
      document.getElementById('ms-cadence-growth').textContent = msReport.metricsGrowth.cadenceConfidence;
      document.getElementById('ms-eye-score').textContent = msReport.metricsGrowth.eyeContactScore;
      document.getElementById('ms-summary-text').textContent = msReport.summaryReport;

      // Generate Canvas Certificate
      const certImgUrl = await milestoneMgr.generateCertificateCanvas(msReport);
      const certPreviewEl = document.getElementById('ms-cert-img');
      const certDownloadBtn = document.getElementById('ms-download-cert-btn');
      
      if (certPreviewEl) certPreviewEl.src = certImgUrl;
      if (certDownloadBtn) {
        certDownloadBtn.onclick = () => {
          const a = document.createElement('a');
          a.href = certImgUrl;
          a.download = `SpeakHero_Milestone_Day${currentMilestoneNumber}.png`;
          a.click();
        };
      }

      sound.celebrateFanfare();
      this.triggerConfetti();
    }
  }

  // ==========================================
  // Progress & Daily Streak Engine
  // ==========================================
  updateDailyProgress() {
    const pFill = document.getElementById('daily-progress-fill');
    const pPercent = document.getElementById('daily-progress-percent');
    
    const pill1 = document.getElementById('step-pill-1');
    const pill2 = document.getElementById('step-pill-2');
    const pill3 = document.getElementById('step-pill-3');

    let completedCount = 0;
    if (this.todayState.task1Done) {
      completedCount++;
      if (pill1) pill1.className = 'step-pill completed';
    }
    if (this.todayState.task2Done) {
      completedCount++;
      if (pill2) pill2.className = 'step-pill completed';
    }
    if (this.todayState.task3Done) {
      completedCount++;
      if (pill3) pill3.className = 'step-pill completed';
    }

    const percent = Math.round((completedCount / 3) * 100);
    if (pFill) pFill.style.width = `${percent}%`;
    if (pPercent) pPercent.textContent = `${completedCount} / 3 任務 (${percent}%)`;

    // All 3 Completed Celebration
    if (completedCount === 3 && !this.todayState.isFullyCompleted) {
      this.todayState.isFullyCompleted = true;
      
      // Update streak if not completed before today
      if (this.settings.lastCompletedDate !== this.todayKey) {
        this.settings.currentStreak += 1;
        this.settings.lastCompletedDate = this.todayKey;
        this.settings.totalPracticeMinutes += 15;
        Storage.saveSettings(this.settings);
        this.renderHeaderStats();
      }

      Storage.saveTodayState(this.todayKey, this.todayState);
      this.checkMilestoneAvailability();

      // Auto-trigger Obsidian Sync and Telegram Push
      this.triggerObsidianSync(false);
      this.triggerTelegramPush(false);

      // Trigger Celebration & Popup Daily Reward Modal
      setTimeout(() => {
        this.showDailyRewardModal(this.settings.currentStreak);
      }, 500);
    }
  }

  // ==========================================
  // Daily Streak Reward Modal (恭喜完成第 X 天)
  // ==========================================
  // ==========================================
  // Daily Streak Reward Modal (文青手帳風打卡成果獎狀)
  // ==========================================
  setupDailyRewardModal() {
    const modal = document.getElementById('daily-reward-modal');
    const closeBtn = document.getElementById('close-reward-btn');
    const confirmBtn = document.getElementById('reward-confirm-btn');
    const downloadCardBtn = document.getElementById('reward-download-card-btn');
    const copyReportBtn = document.getElementById('reward-copy-report-btn');
    const streakDashboard = document.querySelector('.streak-dashboard');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    }
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => modal.classList.remove('active'));
    }
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    }

    // Allow clicking streak cards to review today's reward if today is completed
    if (streakDashboard) {
      streakDashboard.style.cursor = 'pointer';
      streakDashboard.addEventListener('click', (e) => {
        if (e.target.closest('#sync-obsidian-btn') || e.target.closest('#send-tg-btn') || e.target.closest('#open-settings-btn')) return;
        if (this.todayState.isFullyCompleted) {
          this.showDailyRewardModal(this.settings.currentStreak);
        }
      });
    }

    if (downloadCardBtn) {
      downloadCardBtn.addEventListener('click', async () => {
        await this.saveAwardPoster();
      });
    }

    if (copyReportBtn) {
      copyReportBtn.addEventListener('click', async () => {
        let level = "L1 敢開口小白";
        if (this.settings.currentStreak >= 15) level = "L4 說服演說大師";
        else if (this.settings.currentStreak >= 10) level = "L3 氣場感染教練";
        else if (this.settings.currentStreak >= 5) level = "L2 結構邏輯達人";

        const md = obsidianSync.formatObsidianSection(
          this.todayKey,
          this.settings.currentStreak,
          level,
          this.todayState,
          this.currentArticle ? this.currentArticle.title : '認知短文'
        );

        const ok = await obsidianSync.copyToClipboard(md);
        if (ok) {
          copyReportBtn.innerHTML = '<span>✅ 已複製打卡戰報到剪貼簿！</span>';
          setTimeout(() => {
            copyReportBtn.innerHTML = '<span>📋 一鍵複製今日打卡戰報 (Obsidian)</span>';
          }, 3000);
          sound.taskComplete();
        }
      });
    }
  }

  showDailyRewardModal(streakDays) {
    const modal = document.getElementById('daily-reward-modal');
    if (!modal) return;

    // Format display date (e.g. 2026.08.19)
    const todayStr = this.todayKey.replace(/-/g, '.');

    // Dynamic Binding for Japanese Journal Poster
    const posterStreakNum = document.getElementById('poster-streak-num');
    const posterCertDate = document.getElementById('poster-cert-date');
    const posterCertId = document.getElementById('poster-cert-id');
    const posterTask2Highlight = document.getElementById('poster-task2-highlight');
    const posterTask3Highlight = document.getElementById('poster-task3-highlight');
    const posterSoulQuote = document.getElementById('poster-soul-quote');

    if (posterStreakNum) posterStreakNum.textContent = streakDays;
    if (posterCertDate) posterCertDate.textContent = todayStr;
    if (posterCertId) posterCertId.textContent = `${this.todayKey.replace(/-/g, '')}`;

    // Stage 2 Highlight
    const t2Growth = this.todayState.task2Score?.growthPercent || '+32%';
    if (posterTask2Highlight) {
      posterTask2Highlight.textContent = `力量感提升 ${t2Growth}，重音與停頓頓挫分明、富有層次`;
    }

    // Stage 3 Highlight
    const t3Dur = this.todayState.task3Duration || 195;
    const t3Min = Math.floor(t3Dur / 60);
    const t3Sec = t3Dur % 60;
    if (posterTask3Highlight) {
      posterTask3Highlight.textContent = `順暢心流 ${t3Min} 分 ${t3Sec} 秒，克服恐懼、聲音自信堅定`;
    }

    if (posterSoulQuote) {
      posterSoulQuote.innerHTML = `每日進步，對自己負責；<br>刻劃更美好的自己，活出自己夢想的樣子！`;
    }

    modal.classList.add('active');
    sound.celebrateFanfare();
    this.triggerConfetti();
  }

  // Save & Share Award Poster via html2canvas and Web Share API
  async saveAwardPoster() {
    const posterEl = document.getElementById('award-poster');
    const downloadBtn = document.getElementById('reward-download-card-btn');
    if (!posterEl) return;

    if (downloadBtn) downloadBtn.innerHTML = '<span>⏳ 正在生成 3X 高清海報...</span>';

    try {
      // 1. 動態確保 html2canvas 載入
      if (typeof html2canvas === 'undefined') {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // 2. 以 3 倍高解析度 (scale: 3) 渲染海報
      const canvas = await html2canvas(posterEl, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#FAF7F2'
      });

      const streakDays = this.settings.currentStreak || 1;
      const fileName = `SpeakHero_Day${streakDays}_成果海報_${this.todayKey}.png`;

      // 3. 優先調用手機瀏覽器原生分享 (Web Share API)
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], fileName, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `SpeakHero 第 ${streakDays} 天修煉成果海報`,
              text: `我已完成今日 15 分鐘口語表達修煉！「每日進步，對自己負責；刻劃更美好的自己，活出自己夢想的樣子！」`
            });
            if (downloadBtn) downloadBtn.innerHTML = '<span>📸 儲存 / 分享修煉海報 (PNG)</span>';
            sound.taskComplete();
            return;
          } catch (err) {
            if (err.name !== 'AbortError') {
              console.warn('Web Share failed, fallback to direct download:', err);
            } else {
              if (downloadBtn) downloadBtn.innerHTML = '<span>📸 儲存 / 分享修煉海報 (PNG)</span>';
              return;
            }
          }
        }

        // 4. 若不支援原生分享或非手機端，自動觸發 PNG 下載
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);

        if (downloadBtn) downloadBtn.innerHTML = '<span>📸 儲存 / 分享修煉海報 (PNG)</span>';
        sound.taskComplete();
      }, 'image/png', 1.0);
    } catch (err) {
      console.error('Poster generation failed:', err);
      alert('海報生成失敗，請確認網路連線或稍後再試。');
      if (downloadBtn) downloadBtn.innerHTML = '<span>📸 儲存 / 分享修煉海報 (PNG)</span>';
    }
  }

  // Render AI feedback cards with Next-Step & Retry action buttons
  renderAIFeedback(container, report, title, nextStep = null, onRetry = null) {
    if (!container || !report) return;
    container.style.display = 'block';

    let nextBtnHtml = '';
    if (nextStep === 'task2') {
      nextBtnHtml = `
        <button id="fb-next-step-btn" class="btn-primary btn-success" style="width:100%; min-height:48px; font-size:15px;">
          <span>👉 完成第 1 關！進入第 2 關：300字雙重朗讀</span>
        </button>
      `;
    } else if (nextStep === 'complete') {
      nextBtnHtml = `
        <button id="fb-next-step-btn" class="btn-primary btn-success" style="width:100%; min-height:48px; font-size:15px;">
          <span>🎉 完成第 3 關！今日修煉全數通關 (查看戰報)</span>
        </button>
      `;
    }

    const retryBtnHtml = onRetry ? `
      <button id="fb-retry-btn" class="btn-secondary" style="width:100%; font-size:12px; margin-top:6px;">
        <span>🔄 重新錄製本任務</span>
      </button>
    ` : '';

    const transcriptHtml = report.userTranscription ? `
      <div style="background:rgba(255,255,255,0.04); border-left:3px solid var(--accent-gold); padding:8px 12px; margin: 10px 0 12px; border-radius:4px; font-size:12px; color:#E2E8F0; line-height:1.5;">
        <div style="color:#F59E0B; font-weight:800; margin-bottom:2px;">🎙️ AI 聽到的表達原話：</div>
        <em>「${report.userTranscription}」</em>
        ${report.mainTopic ? `<div style="font-size:11px; color:#94A3B8; margin-top:4px;">📌 辨識主題：<span style="color:#FFF; font-weight:bold;">${report.mainTopic}</span></div>` : ''}
      </div>
    ` : '';

    container.innerHTML = `
      <div class="ai-report-card">
        <div class="report-header">
          <div class="report-title">
            <span>🤖 AI 教練診斷報告</span>
            <span style="font-size:11px; color:#94A3B8; font-weight:normal;">(${title})</span>
          </div>
          <div class="score-badge">${report.overallScore || 90} 分</div>
        </div>

        ${transcriptHtml}

        <div class="metrics-radar-grid">
          <div class="metric-item"><span>🌟 氣場能量</span><span class="metric-val">${report.scores?.energy || 88}</span></div>
          <div class="metric-item"><span>🗣️ 流暢度</span><span class="metric-val">${report.scores?.fluency || 85}</span></div>
          <div class="metric-item"><span>🎯 邏輯結構</span><span class="metric-val">${report.scores?.logic || 92}</span></div>
          <div class="metric-item"><span>🎵 重音節奏</span><span class="metric-val">${report.scores?.cadence || 86}</span></div>
        </div>

        <div class="feedback-section">
          <div class="feedback-label">✨ 今日亮點 (Strengths)</div>
          <div class="feedback-text">
            ${(report.strengths || []).map(s => `• ${s}`).join('<br>')}
          </div>
        </div>

        <div class="feedback-section">
          <div class="feedback-label">🎯 明日微進步目標 (Action)</div>
          <div class="feedback-text" style="color:#FEF08A;">
            ${report.improvement || '保持開口節奏，注意關鍵詞頓挫！'}
          </div>
        </div>

        <div class="coach-praise-box">
          💬 教練寄語：${report.coachPraise || '踏出開口的第一步就是100分！'}
        </div>

        <div class="next-step-btn-group" style="margin-top:14px;">
          ${nextBtnHtml}
          ${retryBtnHtml}
        </div>
      </div>
    `;

    // Bind action events
    const nextBtn = container.querySelector('#fb-next-step-btn');
    if (nextBtn) {
      nextBtn.onclick = () => {
        if (nextStep === 'task2') {
          this.switchTab('task2');
        } else if (nextStep === 'complete') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          sound.celebrateFanfare();
          this.triggerConfetti();
        }
      };
    }

    const retryBtn = container.querySelector('#fb-retry-btn');
    if (retryBtn && onRetry) {
      retryBtn.onclick = () => {
        onRetry();
      };
    }
  }

  // 3-2-1 Countdown Beep
  async runCountdown(btnEl) {
    return new Promise((resolve) => {
      let count = 3;
      btnEl.disabled = true;
      sound.countdownBeep(false);
      btnEl.innerHTML = `<span style="font-size:20px; font-weight:900;">⏳ ${count}</span>`;

      const timer = setInterval(() => {
        count--;
        if (count > 0) {
          sound.countdownBeep(false);
          btnEl.innerHTML = `<span style="font-size:20px; font-weight:900;">⏳ ${count}</span>`;
        } else {
          clearInterval(timer);
          sound.countdownBeep(true);
          btnEl.disabled = false;
          resolve(true);
        }
      }, 900);
    });
  }

  // Confetti Particle Celebration
  triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#FF6B4A', '#F59E0B', '#10B981', '#6366F1', '#EC4899'];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.5) * 16 - 6,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        alpha: 1
      });
    }

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3; // Gravity
        p.alpha -= 0.012;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      frame++;
      if (frame < 90) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    animate();
  }

  // ==========================================
  // Obsidian & Telegram Sync Engine
  // ==========================================
  setupSyncActions() {
    const syncObsidianBtn = document.getElementById('sync-obsidian-btn');
    const sendTgBtn = document.getElementById('send-tg-btn');

    if (syncObsidianBtn) {
      syncObsidianBtn.addEventListener('click', async () => {
        await this.triggerObsidianSync(true);
      });
    }

    if (sendTgBtn) {
      sendTgBtn.addEventListener('click', async () => {
        await this.triggerTelegramPush(true);
      });
    }
  }

  async triggerObsidianSync(isManual = false) {
    const btn = document.getElementById('sync-obsidian-btn');
    if (btn) btn.innerHTML = '<span>⏳ 同步中...</span>';

    let level = "L1 敢開口小白";
    if (this.settings.currentStreak >= 15) level = "L4 說服演說大師";
    else if (this.settings.currentStreak >= 10) level = "L3 氣場感染教練";
    else if (this.settings.currentStreak >= 5) level = "L2 結構邏輯達人";

    const mdContent = obsidianSync.formatObsidianSection(
      this.todayKey,
      this.settings.currentStreak,
      level,
      this.todayState,
      this.currentArticle ? this.currentArticle.title : '認知短文'
    );

    const res = await obsidianSync.syncToLocalServer(this.todayKey, mdContent);
    if (btn) btn.innerHTML = '<span>🧠 同步至 Obsidian 複盤</span>';

    if (res.success) {
      sound.taskComplete();
      if (isManual) {
        alert(`🎉 成功同步！\n已自動寫入知識庫：06_每日複盤/${this.todayKey}.md！`);
      }
    } else {
      await obsidianSync.copyToClipboard(mdContent);
      if (isManual) {
        alert(`📋 已複製 Obsidian 複盤 Markdown 到剪貼簿！\n您可直接貼入 06_每日複盤/${this.todayKey}.md 筆記中。`);
      }
    }
  }

  async triggerTelegramPush(isManual = false) {
    const btn = document.getElementById('send-tg-btn');
    if (btn) btn.innerHTML = '<span>⏳ 發送中...</span>';

    let level = "L1 敢開口小白";
    if (this.settings.currentStreak >= 15) level = "L4 說服演說大師";
    else if (this.settings.currentStreak >= 10) level = "L3 氣場感染教練";
    else if (this.settings.currentStreak >= 5) level = "L2 結構邏輯達人";

    const msg = telegramNotifier.formatDailyReport(
      this.todayKey,
      this.settings.currentStreak,
      level,
      this.todayState,
      this.currentArticle ? this.currentArticle.title : '認知短文'
    );

    const sent = await telegramNotifier.sendReport(msg);
    if (btn) btn.innerHTML = '<span>📱 推送 TG 手機戰報</span>';

    if (sent) {
      sound.taskComplete();
      if (isManual) alert('📱 戰報已成功發送至您的 Telegram！');
    } else {
      if (isManual) alert('⚠️ TG 發送失敗，請確認網路連線。');
    }
  }

  // Settings & Quick Test Mode Setup
  setupSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const openBtn = document.getElementById('open-settings-btn');
    const closeBtn = document.getElementById('close-settings-btn');
    const saveBtn = document.getElementById('save-settings-btn');
    const soundToggle = document.getElementById('setting-sound-toggle');
    const reloadAppBtn = document.getElementById('reload-app-btn');
    const testCompleteTodayBtn = document.getElementById('test-complete-today-btn');
    const testDay5Btn = document.getElementById('test-day5-btn');
    const resetTodayBtn = document.getElementById('reset-today-btn');

    if (openBtn) {
      openBtn.addEventListener('click', () => {
        soundToggle.checked = this.settings.soundEnabled;
        modal.classList.add('active');
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.settings.soundEnabled = soundToggle.checked;
        sound.enabled = this.settings.soundEnabled;
        Storage.saveSettings(this.settings);
        aiCoach.updateSettings();
        modal.classList.remove('active');
        sound.taskComplete();
      });
    }

    // iOS PWA Hard Refresh Button
    if (reloadAppBtn) {
      reloadAppBtn.addEventListener('click', async () => {
        reloadAppBtn.innerHTML = '<span>⏳ 正在更新快取與重新整理...</span>';
        try {
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let reg of registrations) {
              await reg.update();
            }
          }
          if ('caches' in window) {
            const cacheKeys = await caches.keys();
            for (let key of cacheKeys) {
              if (key.startsWith('speakhero-')) {
                await caches.delete(key);
              }
            }
          }
        } catch (e) {
          console.warn('Cache clear error:', e);
        }
        window.location.reload();
      });
    }

    // Quick Test Mode: Simulate 3 Tasks Complete Today (Triggers Reward Modal)
    if (testCompleteTodayBtn) {
      testCompleteTodayBtn.addEventListener('click', () => {
        this.todayState.task1Done = true;
        this.todayState.task1Score = aiCoach.heuristicTask1(45, '模擬今日核心觀點提煉');
        this.todayState.task2Step1Done = true;
        this.todayState.task2Step2Done = true;
        this.todayState.task2Done = true;
        this.todayState.task2Score = aiCoach.heuristicTask2DualPass({ duration: 38 }, { duration: 48 }, this.currentArticle);
        this.todayState.task3Done = true;
        this.todayState.task3Score = aiCoach.heuristicTask3(195, '模擬耐力心流表達');
        
        modal.classList.remove('active');
        this.updateDailyProgress();
      });
    }

    // Quick Test Mode: Jump to Day 5 for Milestone Exam Demo
    if (testDay5Btn) {
      testDay5Btn.addEventListener('click', () => {
        this.settings.currentStreak = 5;
        this.settings.simulatedDay = 5;
        Storage.saveSettings(this.settings);
        this.renderHeaderStats();
        this.checkMilestoneAvailability();
        modal.classList.remove('active');
        alert('🎉 已開啟「Day 5 模擬考核模式」！頂部已解鎖金色 5 天里程碑小考核入口！');
        sound.celebrateFanfare();
      });
    }

    // Reset today data
    if (resetTodayBtn) {
      resetTodayBtn.addEventListener('click', () => {
        localStorage.removeItem(`speakhero_day_${this.todayKey}`);
        window.location.reload();
      });
    }
  }
}

// Start App when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new SpeakHeroApp();
  app.init();
});

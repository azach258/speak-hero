/**
 * SpeakHero - IndexedDB & LocalStorage Data Engine
 * Pure local persistence for recordings, streaks, daily tasks & milestone exams.
 */

class StorageDB {
  constructor() {
    this.dbName = 'SpeakHeroDB';
    this.dbVersion = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Store for daily recordings (Task 1, Task 2, Task 3)
        if (!db.objectStoreNames.contains('recordings')) {
          const recStore = db.createObjectStore('recordings', { keyPath: 'id' });
          recStore.createIndex('date', 'date', { unique: false });
          recStore.createIndex('taskId', 'taskId', { unique: false });
        }

        // Store for 5-day Milestone Exam videos and reports
        if (!db.objectStoreNames.contains('milestones')) {
          const msStore = db.createObjectStore('milestones', { keyPath: 'day' });
          msStore.createIndex('date', 'date', { unique: false });
        }

        // Store for daily summary logs
        if (!db.objectStoreNames.contains('daily_logs')) {
          db.createObjectStore('daily_logs', { keyPath: 'date' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB Error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  // Save a video/audio recording Blob
  async saveRecording(record) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('recordings', 'readwrite');
      const store = tx.objectStore('recordings');
      const req = store.put(record);
      req.onsuccess = () => resolve(record.id);
      req.onerror = () => reject(req.error);
    });
  }

  // Get recording by ID
  async getRecording(id) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('recordings', 'readonly');
      const store = tx.objectStore('recordings');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // Save Milestone Exam
  async saveMilestone(milestoneData) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('milestones', 'readwrite');
      const store = tx.objectStore('milestones');
      const req = store.put(milestoneData);
      req.onsuccess = () => resolve(milestoneData.day);
      req.onerror = () => reject(req.error);
    });
  }

  // Get Milestone Exam by day (e.g. Day 1, Day 5, Day 10)
  async getMilestone(day) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('milestones', 'readonly');
      const store = tx.objectStore('milestones');
      const req = store.get(day);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // Get all milestones
  async getAllMilestones() {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('milestones', 'readonly');
      const store = tx.objectStore('milestones');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // Save daily log
  async saveDailyLog(log) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('daily_logs', 'readwrite');
      const store = tx.objectStore('daily_logs');
      const req = store.put(log);
      req.onsuccess = () => resolve(log.date);
      req.onerror = () => reject(req.error);
    });
  }

  // Get all daily logs
  async getAllDailyLogs() {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('daily_logs', 'readonly');
      const store = tx.objectStore('daily_logs');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // LocalStorage Helpers for State & Settings
  static getSettings() {
    const defaultSettings = {
      geminiApiKey: '',
      geminiModel: 'gemini-2.5-flash',
      soundEnabled: true,
      autoVideoMirror: true,
      currentStreak: 1,
      totalPracticeMinutes: 15,
      simulatedDay: null, // For testing mode
      lastCompletedDate: null
    };
    try {
      const saved = localStorage.getItem('speakhero_settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  }

  static saveSettings(settings) {
    localStorage.setItem('speakhero_settings', JSON.stringify(settings));
  }

  static getTodayState(dateKey) {
    const defaultState = {
      date: dateKey,
      task1Done: false,
      task2Done: false,
      task2Step1Done: false,
      task2Step2Done: false,
      task3Done: false,
      task1Score: null,
      task3Score: null,
      isFullyCompleted: false
    };
    try {
      const saved = localStorage.getItem(`speakhero_day_${dateKey}`);
      return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
    } catch {
      return defaultState;
    }
  }

  static saveTodayState(dateKey, state) {
    localStorage.setItem(`speakhero_day_${dateKey}`, JSON.stringify(state));
  }
}

export const db = new StorageDB();
export const Storage = StorageDB;

/**
 * SpeakHero - 5-Day Milestone Exam & Dual-Screen Comparison Engine
 * Handles 3-minute milestone recording, Before/After dual playback & Certificate generation.
 */

import { db } from './db.js';
import { aiCoach } from './ai-coach.js';

export class MilestoneManager {
  constructor() {
    this.currentMilestoneDay = 5;
  }

  // Check if today is a milestone day (Day 5, Day 10, 15, ...)
  isMilestoneDay(streakDays) {
    return streakDays > 0 && streakDays % 5 === 0;
  }

  // Get next milestone day
  getNextMilestoneDay(streakDays) {
    const remainder = streakDays % 5;
    return streakDays + (5 - remainder);
  }

  // Generate Canvas Certificate Image
  async generateCertificateCanvas(reportData, studentName = "Raymond 董事長") {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');

    // Background Gradient (Dark Obsidian Luxury)
    const bgGrad = ctx.createLinearGradient(0, 0, 900, 1200);
    bgGrad.addColorStop(0, '#0F172A');
    bgGrad.addColorStop(0.5, '#1E293B');
    bgGrad.addColorStop(1, '#0B0F19');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 900, 1200);

    // Gold Border
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 6;
    ctx.strokeRect(30, 30, 840, 1140);
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, 820, 1120);

    // Title
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 SPEAKHERO 口語表達里程碑證書', 450, 130);

    // Subtitle
    ctx.fillStyle = '#94A3B8';
    ctx.font = '22px system-ui, -apple-system, sans-serif';
    ctx.fillText('5-Day Milestone Transformation Report', 450, 175);

    // Honor Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.fillText(studentName, 450, 260);

    const drawRoundRect = (x, y, w, h, r) => {
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
      } else {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      }
    };

    // Badge Title Box
    ctx.fillStyle = '#312E81';
    drawRoundRect(150, 300, 600, 70, 16);
    ctx.fill();
    ctx.strokeStyle = '#818CF8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#A5B4FC';
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.fillText(reportData.badgeTitle || '🎖️ 5 天階梯蛻變・言之有物先鋒', 450, 345);

    // Metrics Grid Box
    ctx.fillStyle = '#1E293B';
    drawRoundRect(80, 410, 740, 330, 20);
    ctx.fill();

    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillText('📊 5 天刻意練習・前後質變數據對比 (Before vs After)', 450, 460);

    // 4 Metrics
    const metrics = [
      { label: '🗣️ 流暢度提升', val: reportData.metricsGrowth.fluencyIncrease, col: '#10B981', x: 250, y: 530 },
      { label: '🚫 贅詞減少率', val: reportData.metricsGrowth.fillerReduction, col: '#EF4444', x: 650, y: 530 },
      { label: '🎯 重音自信分', val: reportData.metricsGrowth.cadenceConfidence, col: '#F59E0B', x: 250, y: 640 },
      { label: '👀 眼神氣場力', val: reportData.metricsGrowth.eyeContactScore, col: '#8B5CF6', x: 650, y: 640 }
    ];

    metrics.forEach(m => {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '20px system-ui, -apple-system, sans-serif';
      ctx.fillText(m.label, m.x, m.y);

      ctx.fillStyle = m.col;
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
      ctx.fillText(m.val, m.x, m.y + 45);
    });

    // Summary Text Box
    ctx.fillStyle = '#334155';
    drawRoundRect(80, 770, 740, 260, 20);
    ctx.fill();

    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'italic 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    
    // Wrap text for summary
    const wrapText = (text, x, y, maxWidth, lineHeight) => {
      let words = text.split('');
      let line = '';
      for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n];
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, x, y);
          line = words[n];
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, y);
    };

    wrapText(reportData.summaryReport, 110, 830, 680, 36);

    // Footer & Signature
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748B';
    ctx.font = '18px system-ui, -apple-system, sans-serif';
    ctx.fillText('SpeakHero AI 刻意練習教練體系 · 用認知照亮方向，用表達積蓄力量', 450, 1090);

    const dateStr = new Date().toISOString().split('T')[0];
    ctx.fillText(`認證日期：${dateStr}`, 450, 1125);

    return canvas.toDataURL('image/png');
  }

  // Generate Daily Streak Achievement Share Card (Day 2, Day 3, etc.)
  async generateDailyStreakCardCanvas(options = {}) {
    const {
      streakDays = 2,
      level = 'L1 敢開口小白',
      todayState = {},
      coachQuote = '表達如同肌肉記憶，每一次開口都在為自信奠定基石！',
      studentName = 'Raymond 董事長',
      articleTitle = '認知文章'
    } = options;

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');

    // Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 800, 1000);
    bgGrad.addColorStop(0, '#1E1B4B');
    bgGrad.addColorStop(0.4, '#0F172A');
    bgGrad.addColorStop(1, '#0B0F19');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 800, 1000);

    // Gold Border
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 5;
    ctx.strokeRect(25, 25, 750, 950);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(35, 35, 730, 930);

    const drawRoundRect = (x, y, w, h, r) => {
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
      } else {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      }
    };

    // Header Logo & Brand
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔥 SpeakHero · 15分鐘每日表達刻意練習', 400, 80);

    // Big Flame / Badge Circle
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(400, 185, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1E1B4B';
    ctx.beginPath();
    ctx.arc(400, 185, 52, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.fillText('🔥', 400, 180);
    ctx.fillStyle = '#FEF08A';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillText(`DAY ${streakDays}`, 400, 215);

    // Big Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 34px system-ui, -apple-system, sans-serif';
    ctx.fillText(`🎉 恭喜完成第 ${streakDays} 天打卡！`, 400, 290);

    // Subtitle
    ctx.fillStyle = '#94A3B8';
    ctx.font = '18px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${studentName} · 今日 15 分鐘口語表達修煉全數通關`, 400, 325);

    // Stats Grid Box
    ctx.fillStyle = '#1E293B';
    drawRoundRect(60, 360, 680, 90, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const stats = [
      { label: '連續打卡', val: `${streakDays} 天`, x: 170 },
      { label: '當前段位', val: level, x: 400 },
      { label: '累計修煉', val: `${streakDays * 15} 分鐘`, x: 630 }
    ];

    stats.forEach(s => {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '15px system-ui, -apple-system, sans-serif';
      ctx.fillText(s.label, s.x, 395);
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText(s.val, s.x, 430);
    });

    // 3 Completed Task Modules Card
    ctx.fillStyle = '#151D2F';
    drawRoundRect(60, 475, 680, 230, 16);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillText('✅ 今日 15 分鐘通關修煉項目：', 90, 510);

    const t1Score = todayState.task1Score?.overallScore || 90;
    const t2Score = todayState.task2Score?.pass2Score || 92;
    const t3Score = todayState.task3Score?.overallScore || 92;

    const taskItems = [
      { num: '1', title: '30~60s 無稿快練', desc: '結論先行 · 快速組織語言與結構', score: `${t1Score} 分` },
      { num: '2', title: '300字雙重朗讀法', desc: `《${articleTitle}》盲讀與紅字重音前後對比`, score: `${t2Score} 分` },
      { num: '3', title: '3~5分鐘耐力隨心講', desc: '純語音心流 · 克服停頓焦慮與大膽開口', score: `${t3Score} 分` }
    ];

    taskItems.forEach((t, idx) => {
      const y = 550 + idx * 48;
      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.fillText(`✓ 任務 ${t.num}：${t.title}`, 90, y);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText(`(${t.desc})`, 330, y);

      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(t.score, 710, y);
      ctx.textAlign = 'left';
    });

    // Coach Praise Box
    ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
    drawRoundRect(60, 725, 680, 140, 16);
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('💬 AI 教練今日認可：', 90, 760);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'italic 16px system-ui, -apple-system, sans-serif';
    const wrapQuote = (text, x, y, maxWidth, lineHeight) => {
      let words = text.split('');
      let line = '';
      for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n];
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, x, y);
          line = words[n];
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, y);
    };
    wrapQuote(coachQuote, 90, 795, 620, 26);

    // Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748B';
    ctx.font = '15px system-ui, -apple-system, sans-serif';
    const dateStr = new Date().toISOString().split('T')[0];
    ctx.fillText(`打卡日期：${dateStr} ｜ 用認知照亮方向，用表達積蓄力量 🚀`, 400, 920);

    return canvas.toDataURL('image/png');
  }
}

export const milestoneMgr = new MilestoneManager();

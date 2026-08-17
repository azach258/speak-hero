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
}

export const milestoneMgr = new MilestoneManager();

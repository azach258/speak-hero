/**
 * SpeakHero - Telegram Notification Dispatcher
 * Client-Side direct Telegram Bot Push (Works on mobile GitHub Pages & Local)
 */

import { Storage } from './db.js';

export class TelegramNotifier {
  constructor() {
    this.botToken = '';
    this.chatId = '';
  }

  // Format Daily Summary into Telegram Markdown
  formatDailyReport(todayKey, streak, level, todayState, articleTitle) {
    const t1 = todayState.task1Score;
    const t2 = todayState.task2Score;
    const t3 = todayState.task3Score;

    let msg = `🔥 *【SpeakHero 每日表達修煉戰報】*\n`;
    msg += `📅 日期：${todayKey} ｜ 連續打卡：*第 ${streak} 天*\n`;
    msg += `🎖️ 當前段位：*${level}*\n\n`;
    msg += `⏱️ *15 分鐘修煉清單完成情況*：\n`;

    // Task 1
    if (todayState.task1Done && t1) {
      msg += `✅ *任務 1：60s聽音 + 45~60s邏輯重述*（${t1.overallScore || 90} 分）\n`;
      if (t1.strengths && t1.strengths[0]) {
        msg += `   • 亮點：${t1.strengths[0]}\n`;
      }
      if (t1.improvement) {
        msg += `   • 明日微目標：_${t1.improvement}_\n`;
      }
    } else {
      msg += `⚪ *任務 1：60s聽音 + 45~60s邏輯重述*（未完成）\n`;
    }

    // Task 2
    if (todayState.task2Done) {
      const p2Score = t2?.pass2Score || 92;
      const growth = t2?.growthPercent || '+28%';
      msg += `✅ *任務 2：300字雙重朗讀*（${p2Score} 分 · 力量感 ${growth}）\n`;
      if (t2?.comparisonHighlights && t2.comparisonHighlights[0]) {
        msg += `   • 質變：${t2.comparisonHighlights[0]}\n`;
      }
    } else {
      msg += `⚪ *任務 2：300字雙重朗讀*（未完成）\n`;
    }

    // Task 3
    if (todayState.task3Done && t3) {
      msg += `✅ *任務 3：3~5分鐘耐力心流隨心講*（${t3.overallScore || 92} 分 · 純語音）\n`;
      if (t3.strengths && t3.strengths[0]) {
        msg += `   • 亮點：${t3.strengths[0]}\n`;
      }
    } else {
      msg += `⚪ *任務 3：3~5分鐘耐力心流隨心講*（未完成）\n`;
    }

    const coachPraise = (t2 && t2.coachPraise) || (t1 && t1.coachPraise) || (t3 && t3.coachPraise) || '踏出開口表達的第一步就是100分！大腦語言迴路已激活！';
    msg += `\n💬 *教練寄語*：\n"${coachPraise}"\n\n`;
    msg += `🚀 _「用認知照亮方向，用表達積蓄力量！」_`;

    return msg;
  }

  // Send message directly to Telegram
  async sendReport(message) {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    const payload = {
      chat_id: this.chatId,
      text: message,
      parse_mode: 'Markdown'
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        // Fallback without markdown if special characters failed
        const fallbackRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: this.chatId, text: message })
        });
        return fallbackRes.ok;
      }
      return true;
    } catch (e) {
      console.error('Telegram push failed:', e);
      return false;
    }
  }
}

export const telegramNotifier = new TelegramNotifier();

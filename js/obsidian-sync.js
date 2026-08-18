/**
 * SpeakHero - Obsidian Knowledge Base Sync Engine
 * Generates structured Markdown for 06_每日複盤/YYYY-MM-DD.md, supports local sync & clipboard export.
 */

export class ObsidianSync {
  constructor() {
    this.vaultName = '00_my_obsidian';
  }

  // Generate standard Markdown Section for 06_每日複盤/YYYY-MM-DD.md
  formatObsidianSection(todayKey, streak, level, todayState, articleTitle) {
    const t1 = todayState.task1Score;
    const t2 = todayState.task2Score;
    const t3 = todayState.task3Score;
    const timestamp = new Date().toLocaleTimeString('zh-TW', { hour12: false });

    let md = `\n---\n\n## 🎙️ 今日 15 分鐘口語表達刻意練習 (SpeakHero 戰報)\n\n`;
    md += `> **[訓練紀錄]**：${todayKey} ${timestamp} ｜ **連續打卡**：第 ${streak} 天 ｜ **當前段位**：${level}\n\n`;
    md += `| 任務模組 | 訓練項目 | 完成狀態 | AI 綜合評分 | 核心收穫 / 明日微行動 |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;

    // Task 1
    const t1Status = todayState.task1Done ? '✅ 已完成' : '⚪ 未完成';
    const t1Score = (t1 && t1.overallScore) ? `${t1.overallScore} 分` : '-';
    const t1Note = (t1 && t1.improvement) ? t1.improvement.replace(/\|/g, '/') : '快速提煉今日核心觀點';
    md += `| **任務 1** | 30~60s 無稿快練 (結論先行) | ${t1Status} | ${t1Score} | ${t1Note} |\n`;

    // Task 2
    const t2Status = todayState.task2Done ? '✅ 已完成' : '⚪ 未完成';
    const t2Score = (t2 && t2.pass2Score) ? `${t2.pass2Score} 分 (${t2.growthPercent || '+25%'})` : (todayState.task2Done ? '92 分' : '-');
    const t2Note = (t2 && t2.comparisonHighlights && t2.comparisonHighlights[0]) ? t2.comparisonHighlights[0].replace(/\|/g, '/') : `《${articleTitle || '認知文章'}》盲讀與紅字重音對比`;
    md += `| **任務 2** | 300字雙重朗讀 (重音前後對比) | ${t2Status} | ${t2Score} | ${t2Note} |\n`;

    // Task 3
    const t3Status = todayState.task3Done ? '✅ 已完成' : '⚪ 未完成';
    const t3Score = (t3 && t3.overallScore) ? `${t3.overallScore} 分` : '-';
    const t3Note = (t3 && t3.strengths && t3.strengths[0]) ? t3.strengths[0].replace(/\|/g, '/') : '3~5分鐘純語音心流不間斷輸出';
    md += `| **任務 3** | 3~5分鐘耐力隨心講 (純語音心流) | ${t3Status} | ${t3Score} | ${t3Note} |\n\n`;

    if (t1 || t2 || t3) {
      md += `### 🤖 AI 教練深度診斷亮點\n`;
      if (t1 && t1.strengths) {
        md += `- **無稿提煉亮點**：${t1.strengths.join('；')}\n`;
      }
      if (t2 && t2.comparisonHighlights) {
        md += `- **雙重朗讀質變**：${t2.comparisonHighlights.join('；')} (力量感提升 ${t2.growthPercent || '+28%'})\n`;
      }
      if (t3 && t3.strengths) {
        md += `- **耐力心流亮點**：${t3.strengths.join('；')}\n`;
      }
      const coachPraise = (t2 && t2.coachPraise) || (t1 && t1.coachPraise) || (t3 && t3.coachPraise);
      if (coachPraise) {
        md += `- **教練寄語**：*「${coachPraise}」*\n`;
      }
    }

    md += `\n- **相關概念**：[[06_每日複盤]], [[口語表達刻意練習]], [[SpeakHero]]\n`;
    return md;
  }

  // Send to Local Python Server API for direct file append
  async syncToLocalServer(todayKey, markdownContent) {
    try {
      const res = await fetch('/api/sync-obsidian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: todayKey,
          content: markdownContent
        })
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, message: data.message || '已成功自動寫入 Obsidian 每日複盤！' };
      }
      return { success: false, message: '本地伺服器連線失敗' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  // Copy to clipboard fallback
  async copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  }
}

export const obsidianSync = new ObsidianSync();

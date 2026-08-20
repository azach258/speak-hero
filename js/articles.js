/**
 * SpeakHero - Curated 300-Word Cognitive & Expression Practice Library
 * 包含兩種渲染模式：
 * - Mode A（素讀）：純文字呈現，無任何提示標註。
 * - Mode B（精讀）：包含視覺標記——關鍵字加粗（重音）、單斜線（/ 微停頓換氣）、雙斜線（// 明顯長停頓留白）。
 */

export const ARTICLES = [
  {
    id: 'art-01',
    title: '複利思維：每天進步 1% 的驚人力量',
    category: '認知成長',
    wordCount: 302,
    plainText: `很多人以為成功是一次驚天動地的爆發，但現實中真正的質變，往往來自於看不見的複利積累。每天只要比昨天的自己進步百分之一，一年下來，你將會成長為原本的三點七倍；相反地，若每天退步百分之一，一年後你的實力將只剩下原本的零點零三。

這就是複利的殘酷與魅力。在剛開始練習表達時，你可能覺得結巴、尷尬、找不到適當的詞彙，甚至懷疑自己的天分。但只要你願意每天站在鏡頭前開口說滿十五分鐘，大腦的神經迴路就會在每一次停頓與調整中悄悄重塑。

不要期待第一天就能口若懸河。當你學會耐住前期的平淡，把每一次發聲當成資產的定投，時間自然會站在你這邊，為你兌現驚人的表達影響力！`,
    markedText: `很多人以為<strong class="stress">成功是一次驚天動地的爆發</strong><span class="pause-short">/</span>，但現實中<strong class="stress">真正的質變</strong><span class="pause-short">/</span>，往往來自於<strong class="stress">看不見的複利積累</strong><span class="pause-long">//</span>。每天只要比昨天的自己進步<strong class="stress">百分之一</strong><span class="pause-short">/</span>，一年下來<span class="pause-short">/</span>，你將會成長為原本的<strong class="stress">三十七倍</strong><span class="pause-long">//</span>；相反地，若每天退步百分之一<span class="pause-short">/</span>，一年後你的實力將只剩下<strong class="stress">零點零三</strong><span class="pause-long">//</span>。

這就是複利的<strong class="stress">殘酷與魅力</strong><span class="pause-long">//</span>。在剛開始練習表達時<span class="pause-short">/</span>，你可能覺得<strong class="stress">結巴、尷尬、找不到適當的詞彙</strong><span class="pause-short">/</span>，甚至懷疑自己的天分<span class="pause-long">//</span>。但只要你願意每天站在鏡頭前<strong class="stress">開口說滿十五分鐘</strong><span class="pause-short">/</span>，大腦的神經迴路<span class="pause-short">/</span>就會在每一次停頓與調整中<strong class="stress">悄悄重塑</strong><span class="pause-long">//</span>。

不要期待第一天就能<strong class="stress">口若懸河</strong><span class="pause-long">//</span>。當你學會<strong class="stress">耐住前期的平淡</strong><span class="pause-short">/</span>，把每一次發聲當成<strong class="stress">資產的定投</strong><span class="pause-long">//</span>，時間自然會站在你這邊<span class="pause-short">/</span>，為你兌現<strong class="stress">驚人的表達影響力</strong>！`
  },
  {
    id: 'art-02',
    title: '機會成本：每一次開口都是你的選擇',
    category: '商業思維',
    wordCount: 308,
    plainText: `在經濟學中，機會成本指的是你為了做出某個選擇，而必須放棄的其他選擇中價值最高的一項。在職場與商業溝通中，最大的機會成本不是你說錯了什麼，而是你因為害怕出醜而選擇了沉默。

當你擁有一流的想法，卻無法在三十秒內用精準的語言說服團隊，你的專業價值就會被嚴重低估。每一次你在會議上猶豫不決、在鏡頭前退縮不前，你放棄的都是一次被看見、被信任、建立個人影響力的寶貴機會。

表達能力不是天生自帶的光環，而是一項可以透過後天刻意練習習得的技術。克服恐懼最好的方式不是等待勇氣降臨，而是直接採取行動。現在就深呼吸、挺起胸膛，把你的觀點清晰有力地傳遞給這個世界！`,
    markedText: `在經濟學中<span class="pause-short">/</span>，<strong class="stress">機會成本</strong>指的是你為了做出某個選擇<span class="pause-short">/</span>，而必須放棄的<strong class="stress">最高價值代價</strong><span class="pause-long">//</span>。在職場與商業溝通中<span class="pause-short">/</span>，最大的機會成本<strong class="stress">不是你說錯了什麼</strong><span class="pause-short">/</span>，而是你因為害怕出醜<span class="pause-short">/</span><strong class="stress">而選擇了沉默</strong><span class="pause-long">//</span>。

當你擁有一流的想法<span class="pause-short">/</span>，卻無法在<strong class="stress">三十秒內</strong>用精準的語言說服團隊<span class="pause-short">/</span>，你的專業價值<strong class="stress">就會被嚴重低估</strong><span class="pause-long">//</span>。每一次你在會議上<strong class="stress">猶豫不決</strong><span class="pause-short">/</span>、在鏡頭前<strong class="stress">退縮不前</strong><span class="pause-short">/</span>，你放棄的都是一次<strong class="stress">被看見、被信任</strong>的寶貴機會<span class="pause-long">//</span>。

表達能力<strong class="stress">不是天生自帶的光環</strong><span class="pause-short">/</span>，而是一項可以透過後天<strong class="stress">刻意練習習得的技術</strong><span class="pause-long">//</span>。克服恐懼最好的方式不是等待勇氣<span class="pause-short">/</span>，而是<strong class="stress">直接採取行動</strong><span class="pause-long">//</span>。現在就<strong class="stress">深呼吸、挺起胸膛</strong><span class="pause-short">/</span>，把你的觀點<strong class="stress">清晰有力地傳遞出去</strong>！`
  },
  {
    id: 'art-03',
    title: '金字塔原理：結論先行的說話力量',
    category: '表達技巧',
    wordCount: 304,
    plainText: `頂級溝通者的第一法則，就是結論先行。人類的大腦天生缺乏耐心，在快節奏的商業環境中，沒有人有義務在聽完你五分鐘的背景鋪陳後，才去猜測你到底想表達什麼。

金字塔結構的核心在於：先給結論，再給三個支撐論點，最後給出具體行動建議。當你開口第一句話就明確說出核心主張時，聽眾的注意力會在瞬間被抓住，隨後的論據才能精準嵌入他們的認知框架中。

練習無稿表達時，請強迫自己在腦中先設定好終點。先告訴大家我們要去哪裡，再帶領大家看沿途的風景。簡潔、有力、直奔主題，這不僅是對聽眾時間的尊重，更是展現你思維穿透力最強大的武器！`,
    markedText: `頂級溝通者的<strong class="stress">第一法則</strong><span class="pause-short">/</span>，就是<strong class="stress">結論先行</strong><span class="pause-long">//</span>。人類的大腦天生缺乏耐心<span class="pause-short">/</span>，在快節奏的商業環境中<span class="pause-short">/</span>，<strong class="stress">沒有人有義務</strong>在聽完你漫長的鋪陳後<span class="pause-short">/</span>才去猜測你的意圖<span class="pause-long">//</span>。

金字塔結構的核心在於<span class="pause-short">/</span>：<strong class="stress">先給結論</strong><span class="pause-short">/</span>，再給<strong class="stress">三個支撐論點</strong><span class="pause-short">/</span>，最後給出<strong class="stress">具體行動建議</strong><span class="pause-long">//</span>。當你開口第一句話就明確說出<strong class="stress">核心主張</strong>時<span class="pause-short">/</span>，聽眾的注意力會在瞬間被抓住<span class="pause-short">/</span>，隨後的論據才能<strong class="stress">精準嵌入認知框架</strong><span class="pause-long">//</span>。

練習表達時<span class="pause-short">/</span>，請強迫自己在腦中<strong class="stress">先設定好終點</strong><span class="pause-long">//</span>。先告訴大家<strong class="stress">要去哪裡</strong><span class="pause-short">/</span>，再帶領大家看風景<span class="pause-long">//</span>。<strong class="stress">簡潔、有力、直奔主題</strong><span class="pause-short">/</span>，這不僅是對聽眾的尊重<span class="pause-short">/</span>，更是展現你<strong class="stress">思維穿透力最強的武器</strong>！`
  },
  {
    id: 'art-04',
    title: '長期主義：做時間的朋友，靜待花開',
    category: '認知思維',
    wordCount: 297,
    plainText: `世界上所有真正偉大的事情，都需要時間的沉澱。長期主義並不是一句心靈雞湯，而是一種看透事物底層規律後的戰略定力。多數人高估了一天能做的事情，卻嚴重低估了一年、三年甚至五年堅持做同一件事所產生的巨大能量。

當你在練習口語表達的路上遇到瓶頸、當你覺得自己的進步微乎其微時，請記住竹子的生長定律。竹子在最初的四年裡，僅僅長了三厘米，但在第五年開始，它每天會以三十厘米的速度瘋狂拔高，僅用六週時間就能長成一片茂密的竹林。

因為在過去的四年裡，竹子的根部已經在土壤深處蔓延了數百平米。每一次的卡頓、每一次的重錄，都是你在向下扎根。只要方向正確，請保持耐心，時間終究會給你最豐厚的回報！`,
    markedText: `世界上所有<strong class="stress">真正偉大的事情</strong><span class="pause-short">/</span>，都需要<strong class="stress">時間的沉澱</strong><span class="pause-long">//</span>。長期主義<strong class="stress">不是心靈雞湯</strong><span class="pause-short">/</span>，而是一種看透底層規律後的<strong class="stress">戰略定力</strong><span class="pause-long">//</span>。多數人高估了一天能做的事<span class="pause-short">/</span>，卻嚴重低估了<strong class="stress">持續堅持一年</strong>所產生的巨大能量<span class="pause-long">//</span>。

當你在練習表達遇到瓶頸<span class="pause-short">/</span>、覺得自己<strong class="stress">進步微乎其微</strong>時<span class="pause-short">/</span>，請記住<strong class="stress">竹子的生長定律</strong><span class="pause-long">//</span>。竹子在最初的四年裡僅長了三厘米<span class="pause-short">/</span>，但在第五年<span class="pause-short">/</span>，它每天以<strong class="stress">三十厘米的速度拔高</strong><span class="pause-short">/</span>，六週長成一片竹林<span class="pause-long">//</span>。

因為在過去四年裡<span class="pause-short">/</span>，它的根部已經在土壤深處<strong class="stress">蔓延了數百平米</strong><span class="pause-long">//</span>。每一次的卡頓<span class="pause-short">/</span>、每一次的重錄<span class="pause-short">/</span>，都是你在<strong class="stress">向下扎根</strong><span class="pause-long">//</span>。<strong class="stress">保持耐心</strong><span class="pause-short">/</span>，時間終究會給你<strong class="stress">最豐厚的回報</strong>！`
  },
  {
    id: 'art-05',
    title: '氣場修煉：自信源於對停頓的掌控',
    category: '演說氣場',
    wordCount: 302,
    plainText: `很多人在面對鏡頭或公眾演說時，最大的恐慌就是安靜。只要出現一秒鐘的空白，內心就會感到無比焦慮，於是大量使用「那個、然後、就是」等贅詞來填補 silence。

然而，真正具備強大氣場的演說家，從來不懼怕停頓。相反地，他們擅長運用戰略性停頓來掌控全場節奏。在講出關鍵觀點之前停頓一秒，可以激發聽眾的好奇心；在說完重要結論之後停頓兩秒，可以給聽眾大腦留下吸收和消化的空間。

停頓不是思維斷電，而是自信與從容的展現。當你不再急躁地連珠炮發射字句，而是學會呼吸、學會注視鏡頭並享受節奏的起伏，你的聲音就會自然散發出令人信服的堅定力量！`,
    markedText: `很多人在面對鏡頭時<span class="pause-short">/</span>，最大的恐慌就是<strong class="stress">安靜</strong><span class="pause-long">//</span>。只要出現一秒鐘的空白<span class="pause-short">/</span>，內心就會感到焦慮<span class="pause-short">/</span>，於是大量使用<strong class="stress">「那個、然後、就是」</strong>等贅詞來填補空白<span class="pause-long">//</span>。

然而<span class="pause-short">/</span>，真正具備強大氣場的演說家<span class="pause-short">/</span>，<strong class="stress">從來不懼怕停頓</strong><span class="pause-long">//</span>。相反地<span class="pause-short">/</span>，他們擅長運用<strong class="stress">戰略性停頓</strong>來掌控全場節奏<span class="pause-long">//</span>。在講出關鍵觀點之前<strong class="stress">停頓一秒</strong><span class="pause-short">/</span>，可以激發好奇心<span class="pause-short">/</span>；在說完重要結論之後<strong class="stress">停頓兩秒</strong><span class="pause-short">/</span>，可以給聽眾留下吸收的空間<span class="pause-long">//</span>。

停頓不是思維斷電<span class="pause-short">/</span>，而是<strong class="stress">自信與從容的展現</strong><span class="pause-long">//</span>。當你不再急躁地連珠炮發射字句<span class="pause-short">/</span>，而是學會<strong class="stress">呼吸、注視鏡頭</strong>並享受節奏的起伏<span class="pause-long">//</span>，你的聲音就會散發出<strong class="stress">令人信服的堅定力量</strong>！`
  }
];

export function getRandomArticle(excludeId = null) {
  const filtered = excludeId ? ARTICLES.filter(a => a.id !== excludeId) : ARTICLES;
  const index = Math.floor(Math.random() * filtered.length);
  return filtered[index] || ARTICLES[0];
}

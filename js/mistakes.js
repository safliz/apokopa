// МОИ ОШИБКИ
// по каждому заданию: список ошибок и поток только из них

const content = document.getElementById('content');

function esc(s) {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ударная буква и вставленная буква красятся в розовый
function stressHtml(word) {
  return [...word].map(ch => (ch !== ch.toLowerCase() ? `<b>${ch}</b>` : ch)).join('');
}

function gapHtml(items) {
  return key => {
    const item = items.find(it => it.w === key);
    return item ? esc(item.w).replace('_', `<b>${item.a}</b>`) : null;
  };
}

const TASKS = [
  { id: '4', name: 'Постановка ударения', show: key => (window.TASK4_WORDS.includes(key) ? stressHtml(esc(key)) : null) },
  { id: '6', name: 'Лишнее слово', show: key => {
    const item = window.TASK6_ITEMS.find(it => it.s === key);
    return item ? esc(item.p).replace(/\[(.+?)\]/, '<b>$1</b>') : null;
  } },
  { id: '9', name: 'Гласные в корне', show: gapHtml(window.TASK9_ITEMS) },
  { id: '10', name: 'Приставки', show: gapHtml(window.TASK10_ITEMS) },
  { id: '11', name: 'Суффиксы', show: gapHtml(window.TASK11_ITEMS) },
  { id: '12', name: 'Глаголы и причастия', show: gapHtml(window.TASK12_ITEMS) }
];

let html = '';
TASKS.forEach(task => {
  const list = Object.entries(App.errorsOf(task.id))
    .map(([key, n]) => ({ n, shown: task.show(key) }))
    .filter(x => x.shown)
    .sort((a, b) => b.n - a.n);
  if (!list.length) return;

  html += `
    <section class="mistake-group">
      <div class="mistake-head">
        <div>
          <h2>Задание ${task.id} <span class="menu-badge">${list.length}</span></h2>
          <p>${task.name}</p>
        </div>
        <a class="btn pink" href="practice.html?task=${task.id}&amp;mode=mistakes">Исправить</a>
      </div>
      <ul class="dict-list mistake-list">
        ${list.map(x => `<li>${x.shown}</li>`).join('')}
      </ul>
    </section>`;
});

content.innerHTML = html || `
  <div class="result">
    <h2>Пока пусто</h2>
    <p>Ошибки появятся здесь после заданий</p>
    <div class="buttons"><a class="btn pink" href="index.html">К заданиям</a></div>
  </div>`;

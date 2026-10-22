// ТЕОРИЯ
// theory.html?task=4|6|9|10|11|12 (для 4 ещё &view=rules), у каждой страницы поиск сверху

const TASK = App.param('task');
const content = document.getElementById('content');
const empty = document.getElementById('empty');
const search = document.getElementById('search');

// ПОИСК
// без учёта регистра, ё = е

function norm(s) {
  return s.toLowerCase().replace(/ё/g, 'е').replace(/[[\]]/g, '');
}

function esc(s) {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// у каждого элемента data-text, секция прячется, если в ней ничего не осталось
function applySearch() {
  const q = norm(search.value.trim());
  let shown = 0;
  content.querySelectorAll('[data-text]').forEach(el => {
    const hit = !q || el.dataset.text.includes(q);
    el.hidden = !hit;
    if (hit) shown++;
  });
  content.querySelectorAll('[data-group]').forEach(group => {
    group.hidden = !group.querySelector('[data-text]:not([hidden])');
  });
  empty.hidden = shown > 0;
}

search.addEventListener('input', applySearch);

// подложка под поиском, когда он прилип
const bar = document.querySelector('.search');
let barStart = 0;
window.addEventListener('scroll', () => {
  bar.classList.toggle('stuck', window.scrollY > barStart);
}, { passive: true });
window.addEventListener('load', () => { barStart = bar.getBoundingClientRect().top + window.scrollY - 1; });

// ГРУППИРОВКА ПО ПЕРВОЙ БУКВЕ

function byLetter(entries, sortKey) {
  const groups = new Map();
  entries
    .slice()
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b), 'ru'))
    .forEach(e => {
      const letter = sortKey(e)[0];
      if (!groups.has(letter)) groups.set(letter, []);
      groups.get(letter).push(e);
    });
  return groups;
}

function letterSection(letter, itemsHtml, listClass) {
  return `
    <section class="letter-section" data-group>
      <div class="letter">${letter}</div>
      <ul class="dict-list ${listClass || ''}">${itemsHtml}</ul>
    </section>`;
}

// ЗАДАНИЕ 4: ОРФОЭПИЧЕСКИЙ СЛОВАРЬ
// ударная буква заглавная и розовая

function stressHtml(word) {
  return [...word].map(ch => (ch !== ch.toLowerCase() ? `<b>${ch}</b>` : ch)).join('');
}

function render4() {
  const words = [...new Set(window.TASK4_WORDS)];
  const groups = byLetter(words, w => norm(w));
  let html = '';
  groups.forEach((list, letter) => {
    const items = list.map(w => `<li data-text="${norm(w)}">${stressHtml(w)}</li>`).join('');
    html += letterSection(letter, items);
  });
  content.innerHTML = html;
  return {
    title: 'Ударения',
    sub: 'Задание 4 · орфоэпический словарь'
  };
}

// ЗАДАНИЕ 6: ПЛЕОНАЗМЫ
// группа по главному слову сочетания, лишнее слово розовое

function mainWord(phrase) {
  const rest = phrase.replace(/\[.*?\]/, '').trim().split(/\s+/).filter(w => w.length > 1);
  return norm(rest[0] || phrase);
}

function render6() {
  const seen = new Set();
  const phrases = window.TASK6_ITEMS
    .map(it => it.p)
    .filter(p => !seen.has(p) && seen.add(p));

  const intro = `
    <article class="rule-card rule-card--intro" data-text="${norm('плеоназм лишнее слово тавтология смысл повторяет')}">
      <h3>Что искать</h3>
      <p>Плеоназм — сочетание, в котором одно слово повторяет смысл другого: «памятный сувенир» (сувенир и так на память), «упасть вниз» (вверх не падают). В задании нужно найти и убрать слово, без которого смысл не меняется.</p>
      <p class="ex">Ниже лишнее слово выделено розовым</p>
    </article>`;

  const groups = byLetter(phrases, mainWord);
  let html = intro;
  groups.forEach((list, letter) => {
    const items = list.map(p => {
      const shown = esc(p).replace(/\[(.+?)\]/, '<b>$1</b>');
      return `<li data-text="${norm(p)}">${shown}</li>`;
    }).join('');
    html += letterSection(letter, items, 'pleo-list');
  });
  content.innerHTML = html;
  return { title: 'Лишнее слово', sub: 'Задание 6 · частые плеоназмы' };
}

// ЗАДАНИЯ 9 И 10: ПРАВИЛА КАРТОЧКАМИ

// stress: в примерах заглавная ударная буква красится в розовый
function renderCards(list, stress) {
  const ex = e => (stress ? stressHtml(esc(e)) : esc(e));
  const cards = list.map(c => `
    <article class="rule-card" data-text="${norm(c.t + ' ' + c.b + ' ' + c.e)}">
      <h3>${esc(c.t)}</h3>
      <p>${esc(c.b)}</p>
      ${c.e ? `<p class="ex${stress ? ' ex--stress' : ''}">${ex(c.e)}</p>` : ''}
    </article>`).join('');
  content.innerHTML = `<div class="cards" data-group>${cards}</div>`;
}

function render9() {
  renderCards(window.TASK9_THEORY);
  return { title: 'Гласные в корне', sub: 'Задание 9 · проверяемые, непроверяемые, чередующиеся' };
}

function render4rules() {
  renderCards(window.TASK4_THEORY, true);
  return { title: 'Ударения', sub: 'Задание 4 · правила' };
}

function render11() {
  renderCards(window.TASK11_THEORY);
  return { title: 'Суффиксы', sub: 'Задание 11 · кроме -н- и -нн-' };
}

function render12() {
  renderCards(window.TASK12_THEORY);
  return { title: 'Глаголы и причастия', sub: 'Задание 12 · окончания и суффиксы' };
}

function render10() {
  renderCards(window.TASK10_THEORY);
  return { title: 'Приставки', sub: 'Задание 10 · пре/при, з/с, ы/и, ъ и ь' };
}

// СТАРТ
// у задания 4 сверху вкладки: словарь и теория

const RENDER = { 6: render6, 9: render9, 10: render10, 11: render11, 12: render12 };
let rules = App.param('view') === 'rules';

function renderPage() {
  const fn = TASK === '4' ? (rules ? render4rules : render4) : RENDER[TASK];
  const meta = fn();
  document.getElementById('title').textContent = meta.title;
  document.getElementById('sub').textContent = meta.sub;
  document.title = `Апокопа — ${meta.title}`;
  search.placeholder = TASK === '4' && !rules ? 'Найти слово' : 'Поиск по теории';
  applySearch();
}

if (TASK !== '4' && !RENDER[TASK]) {
  location.replace('index.html');
} else {
  if (TASK === '4') {
    const tabs = document.createElement('div');
    tabs.className = 'tabs';
    tabs.innerHTML = `
      <button class="tab" type="button" data-rules="0">Словарь</button>
      <button class="tab" type="button" data-rules="1">Теория</button>`;
    document.querySelector('.search').before(tabs);
    const mark = () => tabs.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', (b.dataset.rules === '1') === rules));
    tabs.addEventListener('click', e => {
      const b = e.target.closest('.tab');
      if (!b) return;
      rules = b.dataset.rules === '1';
      mark();
      renderPage();
      try { history.replaceState(null, '', `theory.html?task=4${rules ? '&view=rules' : ''}`); } catch (err) { /* ничего */ }
    });
    mark();
  }
  renderPage();
}

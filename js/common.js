// ОБЩЕЕ: ХРАНИЛИЩЕ, СЛУЧАЙНЫЙ ВЫБОР, КОНФЕТТИ

const App = (() => {

  // ХРАНИЛИЩЕ
  // всё лежит в localStorage, ошибки чтения просто игнорируем

  const KEY_ROUND = 'apokopa:round';
  const KEY_STATS = 'apokopa:stats';
  const ROUND_SIZES = [3, 5, 10];

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* приватный режим и т.п. */ }
  }

  function getRoundSize() {
    const n = load(KEY_ROUND, 10);
    return ROUND_SIZES.includes(n) ? n : 10;
  }

  function setRoundSize(n) {
    save(KEY_ROUND, n);
  }

  // СТАТИСТИКА ОШИБОК
  // stats[task][key] = сколько раз ошибся
  // ошибка +1, верный ответ −1, поэтому выученное перестаёт выпадать часто

  let stats = load(KEY_STATS, {});

  function errors(task, key) {
    return (stats[task] && stats[task][key]) || 0;
  }

  function mark(task, key, ok) {
    if (!stats[task]) stats[task] = {};
    const next = errors(task, key) + (ok ? -1 : 1);
    if (next > 0) stats[task][key] = next;
    else delete stats[task][key];
    save(KEY_STATS, stats);
  }

  // СЛУЧАЙНОСТЬ

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  // выбор n разных элементов, вес = 1 + ошибки
  function weightedPick(items, keyOf, task, n, skip) {
    const pool = items.filter(it => !(skip && skip.has(keyOf(it))));
    const source = pool.length >= n ? pool : items.slice();
    const out = [];
    const left = source.map(it => ({ it, w: 1 + errors(task, keyOf(it)) }));
    while (out.length < n && left.length) {
      const total = left.reduce((s, x) => s + x.w, 0);
      let r = Math.random() * total;
      let idx = 0;
      while (idx < left.length - 1 && r >= left[idx].w) {
        r -= left[idx].w;
        idx++;
      }
      out.push(left[idx].it);
      left.splice(idx, 1);
    }
    return out;
  }

  // КОНФЕТТИ
  // розовые и полупрозрачные осколки разлетаются из точки

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function shardPath() {
    // случайный четырёхугольник, как фигуры на фоне
    const a = `${Math.round(rand(0, 30))}% ${Math.round(rand(0, 30))}%`;
    const b = `${Math.round(rand(70, 100))}% ${Math.round(rand(0, 30))}%`;
    const c = `${Math.round(rand(70, 100))}% ${Math.round(rand(70, 100))}%`;
    const d = `${Math.round(rand(0, 30))}% ${Math.round(rand(70, 100))}%`;
    return `polygon(${a}, ${b}, ${c}, ${d})`;
  }

  function confetti(x, y, amount) {
    if (reduceMotion) return;
    const count = amount || 46;
    const layer = document.createElement('div');
    layer.className = 'confetti';
    document.body.appendChild(layer);

    const shardCount = Math.min(14, Math.round(count * 0.28));
    const reach = Math.max(window.innerWidth, window.innerHeight) * 0.55;

    for (let i = 0; i < count; i++) {
      const bit = document.createElement('div');
      const kind = i < shardCount ? 'shard' : (Math.random() < 0.55 ? 'pink' : 'soft');
      bit.className = 'bit bit--' + kind;

      const size = kind === 'shard' ? rand(22, 42) : rand(7, 16);
      bit.style.width = size + 'px';
      bit.style.height = size * rand(0.6, 1.3) + 'px';
      bit.style.clipPath = shardPath();
      layer.appendChild(bit);

      // в основном в стороны, немного вверх
      const side = Math.random() < 0.5 ? -1 : 1;
      const angle = rand(-0.95, 0.55);
      const dist = rand(0.35, 1) * reach;
      const dx = side * Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist * 0.8;
      const fall = rand(60, 180);
      const spin = rand(-540, 540);
      const dur = rand(3400, 4800);

      bit.animate([
        { transform: `translate(${x}px, ${y}px) rotate(0deg) scale(0.3)`, opacity: 1 },
        { transform: `translate(${x + dx}px, ${y + dy}px) rotate(${spin * 0.6}deg) scale(1)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${x + dx * 1.08}px, ${y + dy + fall}px) rotate(${spin}deg) scale(0.9)`, opacity: 0 }
      ], { duration: dur, easing: 'cubic-bezier(0.15, 0.7, 0.3, 1)', fill: 'forwards' });
    }

    setTimeout(() => layer.remove(), 5000);
  }

  // ПАРАМЕТРЫ АДРЕСА

  function param(name) {
    return new URLSearchParams(location.search).get(name);
  }

  // убрать слово из ошибок целиком
  function clear(task, key) {
    if (stats[task]) {
      delete stats[task][key];
      save(KEY_STATS, stats);
    }
  }

  function errorsOf(task) {
    return Object.assign({}, stats[task] || {});
  }

  // МЕНЮ
  // три полоски слева; по нажатию поворачиваются, вместо логотипа выезжает строка пунктов

  const MENU = [
    { href: 'index.html', label: 'Главная', page: 'home' },
    { href: 'practice.html?mode=mix', label: 'Смешанный поток', page: 'mix' },
    { href: 'mistakes.html', label: 'Мои ошибки', page: 'mistakes' }
  ];

  function buildMenu() {
    const slot = document.querySelector('[data-menu]');
    if (!slot) return;
    const header = slot.closest('.top');
    const count = Object.values(stats).reduce((n, t) => n + Object.keys(t).length, 0);

    slot.innerHTML = `
      <button class="menu-btn" type="button" aria-label="Меню" aria-expanded="false">
        <svg viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>`;

    const row = document.createElement('nav');
    row.className = 'menu-row';
    row.innerHTML = MENU.map(m => `
      <a class="menu-item" href="${m.href}" tabindex="-1">
        ${m.label}${m.page === 'mistakes' && count ? `<span class="menu-badge">${count}</span>` : ''}
      </a>`).join('');
    header.appendChild(row);

    const btn = slot.querySelector('.menu-btn');
    const toggle = open => {
      header.classList.toggle('menu-open', open);
      document.body.classList.toggle('menu-open', open);
      btn.setAttribute('aria-expanded', String(open));
      row.querySelectorAll('a').forEach(a => { a.tabIndex = open ? 0 : -1; });
    };
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggle(!header.classList.contains('menu-open'));
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.menu-row') && !e.target.closest('[data-menu]')) toggle(false);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') toggle(false);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildMenu);
  else buildMenu();

  return { ROUND_SIZES, getRoundSize, setRoundSize, mark, clear, errors, errorsOf, shuffle, weightedPick, confetti, param };
})();

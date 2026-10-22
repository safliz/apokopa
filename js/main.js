// ГЛАВНАЯ

// БЕГУЩАЯ СТРОКА
// едет быстрее скролла, текст повторяется через точку, поэтому не кончается

const text = document.querySelector('.scrolling-text');
const SPEED = 2.4; // пикселей строки на пиксель скролла
const phrase = text.textContent.trim();
text.innerHTML = `<span class="loop">${phrase} · </span>`.repeat(3);
const loop = text.querySelector('.loop');

function moveText() {
  const unit = loop.offsetWidth;
  const shift = (window.scrollY * SPEED) % unit;
  text.style.transform = `translateX(${-shift}px) translateY(-50%)`;
}

window.addEventListener('scroll', moveText, { passive: true });
window.addEventListener('resize', moveText);
moveText();

// КНОПКА РАУНДА
// основная часть запускает раунд, стрелка открывает выбор 3 / 5 / 10

const ARROW = '<svg viewBox="0 0 16 16" fill="none"><path d="M3 6l5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const splits = [...document.querySelectorAll('[data-round]')];

function roundHref(task) {
  return `practice.html?task=${task}&mode=round&n=${App.getRoundSize()}`;
}

function refreshSplits() {
  const n = App.getRoundSize();
  splits.forEach(split => {
    const task = split.closest('.task').dataset.task;
    split.querySelector('.split-main').href = roundHref(task);
    split.querySelectorAll('.round-opt').forEach(o => {
      o.classList.toggle('active', Number(o.dataset.n) === n);
    });
  });
}

function closeAll(except) {
  splits.forEach(s => {
    if (s !== except) {
      s.classList.remove('open');
      s.querySelector('.split-arrow').setAttribute('aria-expanded', 'false');
    }
  });
}

splits.forEach(split => {
  const opts = App.ROUND_SIZES
    .map(n => `<button class="round-opt" data-n="${n}" type="button">${n}</button>`)
    .join('');

  split.innerHTML = `
    <a class="btn pink split-main" href="#">Раунд</a>
    <button class="btn pink split-arrow" type="button" aria-label="Количество заданий" aria-expanded="false">${ARROW}</button>
    <div class="round-menu">
      <span class="round-label">заданий</span>${opts}
    </div>`;

  const arrow = split.querySelector('.split-arrow');
  arrow.addEventListener('click', e => {
    e.stopPropagation();
    const open = !split.classList.contains('open');
    closeAll(split);
    split.classList.toggle('open', open);
    arrow.setAttribute('aria-expanded', String(open));
  });

  split.querySelectorAll('.round-opt').forEach(o => {
    o.addEventListener('click', e => {
      e.stopPropagation();
      App.setRoundSize(Number(o.dataset.n));
      refreshSplits();
      setTimeout(() => closeAll(), 220);
    });
  });
});

// тап мимо закрывает плашку
document.addEventListener('click', e => {
  if (!e.target.closest('.split')) closeAll();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAll();
});

// при возврате кнопкой «назад» браузер может показать старое состояние
window.addEventListener('pageshow', refreshSplits);
refreshSplits();

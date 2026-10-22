// ПРАКТИКА
// practice.html?task=4|6|9|10|11|12&mode=flow|round|mistakes&n=3|5|10
// practice.html?mode=mix — смешанный поток из всех заданий

const MODE = ['round', 'mistakes', 'mix'].includes(App.param('mode')) ? App.param('mode') : 'flow';
const TASK = MODE === 'mix' ? null : App.param('task');
const ROUND_N = App.ROUND_SIZES.includes(Number(App.param('n'))) ? Number(App.param('n')) : App.getRoundSize();

const stage = document.getElementById('stage');
const promptEl = document.getElementById('prompt');
const checkBtn = document.getElementById('check-button');
const nextBtn = document.getElementById('next-button');
const actions = document.getElementById('actions');
const progress = document.getElementById('progress');
const progressFill = document.getElementById('progress-fill');
const retryProgress = document.getElementById('progress-retry');
const retryFill = document.getElementById('progress-retry-fill');
const retryTag = document.getElementById('retry-tag');

const VOWELS = 'аеёиоуыэюя';
const TELEPORT = 110; // мс, половина телепорта буквы

// верный ответ на повторе не снимает ошибку: ответ только что показали
// в проработке ошибок верный ответ убирает слово из списка совсем
function mark(task, key, ok) {
  if (ok && current && current.tries > 0) return;
  if (ok && MODE === 'mistakes') App.clear(task, key);
  else App.mark(task, key, ok);
}

// в режиме «мои ошибки» берём только то, где есть ошибки
function pool(items, keyOf, id) {
  return MODE === 'mistakes' ? items.filter(it => App.errors(id, keyOf(it)) > 0) : items;
}

// ЗАДАНИЕ 4: УДАРЕНИЯ

const PRACTICE4 = window.TASK4_WORDS.filter(w => !/[ёЁ]/.test(w));

function moveStress(word) {
  const lower = word.toLowerCase();
  const stressed = [...word].findIndex(ch => ch !== ch.toLowerCase());
  const other = [...lower]
    .map((ch, i) => (VOWELS.includes(ch) && i !== stressed ? i : -1))
    .filter(i => i >= 0);
  const pos = other[Math.floor(Math.random() * other.length)];
  return [...lower].map((ch, i) => (i === pos ? ch.toUpperCase() : ch)).join('');
}

// раунд: пять слов, как в егэ, от 2 до 4 верных
const task4round = {
  label: 'Задание 4',
  prompt: 'Отметьте слова, где ударение выделено верно',

  make(skip) {
    const words = App.weightedPick(PRACTICE4, w => w, '4', 5, skip);
    const right = 2 + Math.floor(Math.random() * 3);
    const flags = App.shuffle(words.map((_, i) => i < right));
    return {
      keys: words,
      items: words.map((w, i) => ({ key: w, correct: flags[i], shown: flags[i] ? w : moveStress(w) }))
    };
  },

  render(t, onChange) {
    const box = document.createElement('div');
    box.className = 'word-buttons';
    t.items.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'word-btn';
      btn.textContent = item.shown;
      btn.onclick = () => {
        btn.classList.toggle('selected');
        onChange(box.querySelector('.selected') !== null);
      };
      box.appendChild(btn);
    });
    stage.appendChild(box);
    t.el = box;
  },

  check(t) {
    let ok = true;
    [...t.el.children].forEach((btn, i) => {
      const item = t.items[i];
      const sel = btn.classList.contains('selected');
      btn.classList.remove('selected');
      if (sel && item.correct) btn.classList.add('is-right');
      else if (sel) btn.classList.add('is-wrong');
      else if (item.correct) btn.classList.add('is-missed');
      else btn.classList.add('is-dim');
      mark('4', item.key, sel === item.correct);
      if (sel !== item.correct) ok = false;
    });
    t.el.classList.add('checked');
    return ok;
  }
};

// поток: одно слово, нажимаешь на ударную гласную, она становится заглавной
const task4flow = {
  label: 'Задание 4',
  prompt: 'Нажмите на ударную гласную',

  make(skip) {
    const word = App.weightedPick(pool(PRACTICE4, w => w, '4'), w => w, '4', 1, skip)[0];
    return word ? { keys: [word], word } : null;
  },

  render(t, onChange) {
    const box = document.createElement('div');
    box.className = 'stress-word';
    box.style.setProperty('--len', t.word.length);
    t.answer = [...t.word].findIndex(ch => ch !== ch.toLowerCase());
    t.picked = null;

    [...t.word.toLowerCase()].forEach((ch, i) => {
      if (!VOWELS.includes(ch)) {
        box.append(ch);
        return;
      }
      const v = document.createElement('span');
      v.className = 'v';
      v.textContent = ch;
      v.dataset.i = i;
      v.setAttribute('role', 'button');
      v.tabIndex = 0;
      v.onclick = () => {
        if (box.classList.contains('checked')) return;
        if (t.picked) t.picked.classList.remove('picked');
        t.picked = v;
        v.classList.add('picked');
        onChange(true);
      };
      box.appendChild(v);
    });

    stage.appendChild(box);
    t.el = box;
  },

  check(t) {
    const ok = Number(t.picked.dataset.i) === t.answer;
    t.el.classList.add('checked');
    t.picked.classList.remove('picked');
    // верная буква вырастает, становится заглавной и розовой
    const right = t.el.querySelector(`.v[data-i="${t.answer}"]`);
    right.textContent = right.textContent.toUpperCase();
    right.classList.add(ok ? 'v-right' : 'v-missed');
    if (!ok) {
      t.picked.classList.add('v-wrong');
      t.el.classList.add('shake');
    }
    mark('4', t.word, ok);
    return ok;
  }
};

// ЗАДАНИЕ 6: ЛИШНЕЕ СЛОВО
// предложение как обычный текст, каждое слово нажимается

function splitToken(token) {
  // знаки препинания по краям не входят в нажимаемое слово
  const m = token.match(/^([«"(]*)(.*?)([.,!?;:»")]*)$/);
  return { pre: m[1], word: m[2], post: m[3] };
}

const task6 = {
  label: 'Задание 6',
  prompt: 'Отредактируйте предложение: исключите лишнее слово',

  make(skip) {
    const item = App.weightedPick(pool(window.TASK6_ITEMS, it => it.s, '6'), it => it.s, '6', 1, skip)[0];
    return item ? { keys: [item.s], item } : null;
  },

  render(t, onChange) {
    const p = document.createElement('p');
    p.className = 'sentence';
    t.answer = -1;
    const tokens = t.item.s.split(' ');

    tokens.forEach((token, i) => {
      if (i > 0) p.appendChild(document.createTextNode(' '));
      const isAnswer = token.includes('[');
      const parts = splitToken(token.replace(/[[\]]/g, ''));
      // точку в конце предложения не показываем
      if (i === tokens.length - 1) parts.post = parts.post.replace(/\.$/, '');

      if (!/[а-яё]/i.test(parts.word)) {
        p.appendChild(document.createTextNode(token));
        return;
      }
      if (parts.pre) p.appendChild(document.createTextNode(parts.pre));
      const span = document.createElement('span');
      span.className = 'w';
      span.textContent = parts.word;
      span.dataset.i = i;
      if (isAnswer) t.answer = i;
      span.onclick = () => {
        p.querySelectorAll('.w.selected').forEach(s => s !== span && s.classList.remove('selected'));
        span.classList.toggle('selected');
        onChange(p.querySelector('.selected') !== null);
      };
      p.appendChild(span);
      if (parts.post) p.appendChild(document.createTextNode(parts.post));
    });

    stage.appendChild(p);
    t.el = p;
  },

  check(t) {
    const sel = t.el.querySelector('.w.selected');
    const ok = sel && Number(sel.dataset.i) === t.answer;
    t.el.querySelectorAll('.w').forEach(span => {
      span.classList.remove('selected');
      const i = Number(span.dataset.i);
      if (i === t.answer) span.classList.add(ok ? 'is-right' : 'is-missed');
      else if (span === sel) span.classList.add('is-wrong');
      else span.classList.add('is-dim');
    });
    t.el.classList.add('checked');
    mark('6', t.item.s, ok);
    return ok;
  }
};

// ЗАДАНИЯ 9 И 10: БУКВА В ПРОПУСКЕ
// буква телепортируется: сжимается на плашке и появляется в пропуске

function teleportInto(slotLetter, letter) {
  slotLetter.classList.add('out');
  setTimeout(() => {
    slotLetter.textContent = letter;
    void slotLetter.offsetWidth;
    slotLetter.classList.remove('out');
  }, TELEPORT);
}

function gapTask(id, items) {
  return {
    label: `Задание ${id}`,
    prompt: 'Вставьте пропущенную букву',

    make(skip) {
      const item = App.weightedPick(pool(items, it => it.w, id), it => it.w, id, 1, skip)[0];
      return item ? { keys: [item.w], item } : null;
    },

    render(t, onChange) {
      const [before, after] = t.item.w.split('_');
      const word = document.createElement('div');
      word.className = 'gap-word';
      word.style.setProperty('--len', t.item.w.length);
      word.append(before);
      const slot = document.createElement('span');
      slot.className = 'slot';
      const slotLetter = document.createElement('span');
      slotLetter.className = 'slot-letter out';
      slotLetter.textContent = ' ';
      slot.appendChild(slotLetter);
      word.appendChild(slot);
      word.append(after);

      const letters = document.createElement('div');
      letters.className = 'letters';
      t.chosen = null;

      t.item.o.forEach(l => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'letter-btn';
        btn.dataset.l = l;
        btn.innerHTML = `<span class="ch">${l}</span>`;
        btn.onclick = () => {
          if (t.chosen === btn) return;
          if (t.chosen) t.chosen.classList.remove('used');
          t.chosen = btn;
          btn.classList.add('used');
          teleportInto(slotLetter, l);
          onChange(true);
        };
        letters.appendChild(btn);
      });

      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = t.item.n;

      stage.append(word, letters, hint);
      Object.assign(t, { el: letters, word, slot, slotLetter, hint });
    },

    check(t) {
      const ok = t.chosen.dataset.l === t.item.a;
      t.el.classList.add('checked');
      [...t.el.children].forEach(btn => {
        btn.classList.remove('used');
        if (btn === t.chosen) btn.classList.add(ok ? 'is-right' : 'is-wrong');
        else if (btn.dataset.l === t.item.a) btn.classList.add('is-missed');
        else btn.classList.add('is-dim');
      });
      if (ok) {
        t.slot.classList.add('slot-right');
      } else {
        t.word.classList.add('shake');
        setTimeout(() => {
          teleportInto(t.slotLetter, t.item.a);
          t.slot.classList.add('slot-fixed');
        }, 260);
      }
      t.hint.classList.add('show');
      mark(id, t.item.w, ok);
      return ok;
    }
  };
}

// ВЫБОР ЗАДАНИЯ

const IDS = ['4', '6', '9', '10', '11', '12'];
const GAP = {
  9: gapTask('9', window.TASK9_ITEMS),
  10: gapTask('10', window.TASK10_ITEMS),
  11: gapTask('11', window.TASK11_ITEMS),
  12: gapTask('12', window.TASK12_ITEMS)
};

function specFor(id) {
  if (id === '4') return MODE === 'round' ? task4round : task4flow;
  if (id === '6') return task6;
  return GAP[id];
}

function make(id, skip) {
  const spec = specFor(id);
  const t = spec.make(skip);
  if (!t) return null;
  return Object.assign(t, { spec, id, tries: 0 });
}

if (MODE !== 'mix' && !IDS.includes(TASK)) location.replace('index.html');

// СОСТОЯНИЕ

let current = null;
let recent = [];        // недавние ключи в потоке, чтобы не повторяться
let queue = [];         // раунд или проработка ошибок
let retries = [];       // задания с ошибками, каждое один раз
let pos = 0;
let answered = 0;
let retryAnswered = 0;
let retryTotal = 0;
let firstTry = 0;
let fixed = 0;          // в проработке: исправлено с первого раза

function buildQueue(limit) {
  const used = new Set();
  for (let i = 0; i < limit; i++) {
    const t = make(TASK, used);
    if (!t || t.keys.some(k => used.has(k))) break;
    t.keys.forEach(k => used.add(k));
    queue.push(t);
  }
}

function nextTask() {
  if (MODE === 'flow' || MODE === 'mix') {
    const id = MODE === 'mix' ? IDS[Math.floor(Math.random() * IDS.length)] : TASK;
    const t = make(id, new Set(recent));
    if (!t) return null;
    recent = recent.concat(t.keys).slice(-12);
    return t;
  }
  if (pos < queue.length) return queue[pos++];
  if (MODE === 'round' && retries.length) {
    if (!retryTotal) retryTotal = retries.length;
    retryTag.hidden = false;
    retryProgress.hidden = false;
    return retries.shift();
  }
  return null;
}

// ФИГУРА НА ФОНЕ
// при открытии страницы встаёт в случайное место, но не в верх по центру, где текст;
// пока идёт раунд или поток, не двигается

const shape = document.getElementById('bg-shape');

function placeShape() {
  const rand = (a, b) => a + Math.random() * (b - a);
  let x, y;
  if (Math.random() < 0.6) {
    x = rand(10, 90);  // нижняя часть экрана
    y = rand(62, 92);
  } else {
    x = Math.random() < 0.5 ? rand(-8, 12) : rand(88, 108); // по бокам
    y = rand(20, 70);
  }
  shape.style.left = `${x}%`;
  shape.style.top = `${y}%`;
  shape.style.animationDelay = `${-rand(0, 160)}s`;
}

placeShape();

// ОТРИСОВКА
// кнопки «Ответ» нет, пока ничего не выбрано

function show(t) {
  current = t;
  stage.innerHTML = '';
  promptEl.textContent = t.spec.prompt;
  if (MODE === 'mix') pageLabel.textContent = `Смешанный поток · ${t.spec.label}`;
  t.spec.render(t, any => { checkBtn.hidden = !any; });
  checkBtn.hidden = true;
  nextBtn.hidden = true;
}

function burstFrom(el) {
  const r = el.getBoundingClientRect();
  App.confetti(r.left + r.width / 2, r.top + r.height / 2);
}

checkBtn.onclick = () => {
  const ok = current.spec.check(current);
  const inRetry = current.tries > 0;
  current.tries++;

  if (ok) burstFrom(stage);

  if (MODE === 'round') {
    if (!inRetry) {
      answered++;
      if (ok) firstTry++;
      else retries.push(current); // в работу над ошибками попадает один раз
      progressFill.style.width = `${(answered / ROUND_N) * 100}%`;
    } else {
      retryAnswered++;
      retryFill.style.width = `${(retryAnswered / retryTotal) * 100}%`;
    }
  }

  if (MODE === 'mistakes') {
    answered++;
    if (ok) fixed++;
    progressFill.style.width = `${(answered / queue.length) * 100}%`;
  }

  checkBtn.hidden = true;
  nextBtn.hidden = false;
  nextBtn.focus({ preventScroll: true });
};

nextBtn.onclick = () => {
  const t = nextTask();
  if (t) show(t);
  else finish();
  window.scrollTo(0, 0);
};

// ИТОГИ

function result(title, text, buttons) {
  retryTag.hidden = true;
  promptEl.hidden = true;
  actions.hidden = true;
  stage.innerHTML = `
    <div class="result">
      <h2>${title}</h2>
      <p>${text}</p>
      <div class="buttons">${buttons}</div>
    </div>`;
}

function finish() {
  if (MODE === 'mistakes') {
    if (!queue.length) {
      result('Ошибок нет', 'В этом задании нечего исправлять',
        '<a class="btn pink" href="mistakes.html">Мои ошибки</a><a class="btn glass" href="index.html">На главную</a>');
      return;
    }
    const left = queue.length - fixed;
    result('Проработка завершена',
      `Исправлено <span class="big">${fixed}</span> из ${queue.length}${left ? '<br>Слова с ошибками остались в списке на следующий раз' : ''}`,
      '<a class="btn pink" href="mistakes.html">Мои ошибки</a><a class="btn glass" href="index.html">На главную</a>');
    if (fixed) setTimeout(() => App.confetti(window.innerWidth / 2, window.innerHeight * 0.4, 70), 150);
    return;
  }
  result('Раунд пройден',
    `С первого раза верно <span class="big">${firstTry}</span> из ${ROUND_N}`,
    `<a class="btn pink" href="${location.href}">Ещё раунд</a><a class="btn glass" href="index.html">На главную</a>`);
  setTimeout(() => App.confetti(window.innerWidth / 2, window.innerHeight * 0.4, 70), 150);
}

// СТАРТ

const pageLabel = document.getElementById('page-label');

if (MODE === 'mix' || IDS.includes(TASK)) {
  const label = MODE === 'mix' ? 'Смешанный поток' : `Задание ${TASK}`;
  document.title = `Апокопа — ${label}`;
  pageLabel.textContent = MODE === 'mix' ? label :
    `${label} · ${{ round: 'Раунд', flow: 'Поток', mistakes: 'Мои ошибки' }[MODE]}`;
  if (MODE === 'mistakes') document.querySelector('.back').href = 'mistakes.html';

  if (MODE === 'round') buildQueue(ROUND_N);
  if (MODE === 'mistakes') buildQueue(1000);
  if ((MODE === 'round' || MODE === 'mistakes') && queue.length) progress.hidden = false;

  const first = nextTask();
  if (first) show(first);
  else finish();

  // enter на компьютере: ответ, потом далее
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.target.tagName === 'A' || e.repeat) return;
    e.preventDefault();
    if (e.target.classList && e.target.classList.contains('v') && checkBtn.hidden) {
      e.target.click();
      return;
    }
    if (!checkBtn.hidden) checkBtn.click();
    else if (!nextBtn.hidden) nextBtn.click();
  });
}

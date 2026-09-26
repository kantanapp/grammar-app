/* Subject & Predicate Practice
   Plain HTML/CSS/JS. No frameworks, no build step. */

(function () {
  'use strict';

  var STORE_KEY = 'sp-practice-v1';
  var MIX_SIZE = 10;
  var MIX_KEY = '__mix__';

  var FRAGMENT_TERMS = { S: 'Complete sentence', F: 'Fragment' };

  var TYPE_LABELS = {
    definition: 'Which term is this?',
    label: 'Which term is underlined?',
    fragment: 'Sentence or fragment?'
  };

  /* The cheat sheet is fixed reference text (spec section 5-4). */
  var CHEAT = [
    { key: 'A', meaning: 'The one main noun or pronoun', example: 'The tall [[giraffe]] ate leaves.' },
    { key: 'B', meaning: 'The main verb only (is running counts as one verb)', example: 'The puppy [[barked]] loudly.' },
    { key: 'C', meaning: 'The subject plus all its describing words', example: '[[The tall giraffe]] ate leaves.' },
    { key: 'D', meaning: 'The verb plus all the words after it', example: 'The puppy [[barked loudly]].' },
    { key: 'E', meaning: 'Two or more subjects joined by and / or', example: '[[Mom and Dad]] cooked dinner.' },
    { key: 'F', meaning: 'One subject doing two or more actions', example: 'Grandma [[baked and sang]].' }
  ];
  var CHEAT_TIP = 'Simple = one key word. Complete = the whole part. Compound = two or more.';

  var data = null;      // questions.json
  var terms = {};       // { A: "Simple subject", ... }
  var allQuestions = [];
  var byId = {};
  var progress = loadProgress();
  var quiz = null;

  var $ = function (id) { return document.getElementById(id); };

  /* ---------------- storage ---------------- */

  function loadProgress() {
    var empty = { scores: {}, mistakes: [] };
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return empty;
      var saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object') return empty;
      return {
        scores: (saved.scores && typeof saved.scores === 'object') ? saved.scores : {},
        mistakes: Array.isArray(saved.mistakes)
          ? saved.mistakes.filter(function (id) { return typeof id === 'string'; })
          : []
      };
    } catch (e) {
      return empty;
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(progress));
    } catch (e) {
      /* Private mode or storage full: keep playing, just don't save. */
    }
  }

  function recordScore(key, score, total) {
    var prev = progress.scores[key];
    var best = (prev && typeof prev.best === 'number') ? prev.best : 0;
    progress.scores[key] = {
      last: score,
      best: Math.max(best, score),
      total: total
    };
    saveProgress();
  }

  function addMistake(id) {
    if (progress.mistakes.indexOf(id) === -1) progress.mistakes.push(id);
    saveProgress();
  }

  function removeMistake(id) {
    var i = progress.mistakes.indexOf(id);
    if (i !== -1) {
      progress.mistakes.splice(i, 1);
      saveProgress();
    }
  }

  /* Mistake IDs that still exist in questions.json. */
  function mistakeQuestions() {
    return progress.mistakes
      .map(function (id) { return byId[id]; })
      .filter(Boolean);
  }

  /* ---------------- helpers ---------------- */

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function termName(key, type) {
    if (type === 'fragment') return FRAGMENT_TERMS[key] || key;
    return terms[key] || key;
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  /* Renders "The [[bus]] stopped." — text goes in as text, [[...]] becomes <u>. */
  function renderPrompt(el, text) {
    clear(el);
    var parts = String(text == null ? '' : text).split(/(\[\[[\s\S]*?\]\])/);
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (!part) continue;
      if (part.slice(0, 2) === '[[' && part.slice(-2) === ']]') {
        var u = document.createElement('u');
        u.className = 'mark';
        u.textContent = part.slice(2, -2);
        el.appendChild(u);
      } else {
        el.appendChild(document.createTextNode(part));
      }
    }
    return el;
  }

  function showScreen(name) {
    ['home', 'quiz', 'results', 'cheat'].forEach(function (s) {
      $('screen-' + s).hidden = (s !== name);
    });
    window.scrollTo(0, 0);
  }

  /* ---------------- home ---------------- */

  function scoreMarkup(key) {
    var s = progress.scores[key];
    if (!s) return null;
    var wrap = document.createElement('span');
    wrap.className = 'card-btn__scores';
    var best = document.createElement('b');
    best.textContent = 'Best ' + s.best + '/' + s.total;
    wrap.appendChild(best);
    wrap.appendChild(document.createTextNode('Last ' + s.last + '/' + s.total));
    return wrap;
  }

  function renderHome() {
    var list = $('set-list');
    clear(list);

    data.sets.forEach(function (set) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'card-btn';

      var main = document.createElement('span');
      main.className = 'card-btn__main';

      var title = document.createElement('span');
      title.className = 'card-btn__title';
      title.textContent = set.title;

      var sub = document.createElement('span');
      sub.className = 'card-btn__sub';
      sub.textContent = set.questions.length + ' questions';

      main.appendChild(title);
      main.appendChild(sub);
      btn.appendChild(main);

      var scores = scoreMarkup(set.id);
      if (scores) btn.appendChild(scores);

      btn.addEventListener('click', function () { startSet(set.id); });
      list.appendChild(btn);
    });

    /* Mix all */
    var mixScores = $('mix-scores');
    clear(mixScores);
    var ms = progress.scores[MIX_KEY];
    if (ms) {
      var b = document.createElement('b');
      b.textContent = 'Best ' + ms.best + '/' + ms.total;
      mixScores.appendChild(b);
      mixScores.appendChild(document.createTextNode('Last ' + ms.last + '/' + ms.total));
    }

    /* Review mistakes */
    var pending = mistakeQuestions();
    var reviewBtn = $('btn-review');
    reviewBtn.disabled = pending.length === 0;
    $('review-empty').hidden = pending.length !== 0;
    $('review-sub').textContent = pending.length === 0
      ? 'Questions you got wrong before'
      : pending.length + (pending.length === 1 ? ' question' : ' questions') + ' waiting';
  }

  /* ---------------- quiz ---------------- */

  function startQuiz(options) {
    quiz = {
      key: options.key,           // where to save the score (null = don't save)
      title: options.title,
      mode: options.mode,         // 'set' | 'mix' | 'review'
      setId: options.setId || null,
      questions: options.questions,
      index: 0,
      answered: false,
      results: []                 // { question, picked, correct }
    };
    showScreen('quiz');
    renderQuestion();
  }

  function startSet(setId) {
    var set = null;
    for (var i = 0; i < data.sets.length; i++) {
      if (data.sets[i].id === setId) { set = data.sets[i]; break; }
    }
    if (!set || !set.questions.length) return;
    startQuiz({
      key: set.id,
      setId: set.id,
      title: set.title,
      mode: 'set',
      questions: shuffle(set.questions)
    });
  }

  function startMix() {
    if (!allQuestions.length) return;
    startQuiz({
      key: MIX_KEY,
      title: 'Mix all',
      mode: 'mix',
      questions: shuffle(allQuestions).slice(0, Math.min(MIX_SIZE, allQuestions.length))
    });
  }

  function startReview() {
    var pending = mistakeQuestions();
    if (!pending.length) return;
    startQuiz({
      key: null,
      title: 'Review mistakes',
      mode: 'review',
      questions: shuffle(pending)
    });
  }

  function renderQuestion() {
    var q = quiz.questions[quiz.index];
    var total = quiz.questions.length;

    quiz.answered = false;

    $('quiz-title').textContent = quiz.title;
    $('quiz-count').textContent = (quiz.index + 1) + ' / ' + total;

    var pct = Math.round((quiz.index / total) * 100);
    $('progress-fill').style.width = pct + '%';
    $('progress').setAttribute('aria-valuenow', String(pct));

    $('question-type').textContent = TYPE_LABELS[q.type] || '';
    renderPrompt($('question-prompt'), q.prompt);

    var box = $('choices');
    clear(box);
    q.choices.forEach(function (key) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice';

      var k = document.createElement('span');
      k.className = 'choice__key';
      k.textContent = key;

      var label = document.createElement('span');
      label.className = 'choice__label';
      label.textContent = termName(key, q.type);

      btn.appendChild(k);
      btn.appendChild(label);
      btn.dataset.key = key;
      btn.addEventListener('click', function () { answer(key); });
      box.appendChild(btn);
    });

    $('feedback').hidden = true;
    $('btn-next').hidden = true;
    $('btn-next').textContent = (quiz.index + 1 >= total) ? 'See results' : 'Next';
  }

  function answer(picked) {
    if (quiz.answered) return;
    quiz.answered = true;

    var q = quiz.questions[quiz.index];
    var isCorrect = (picked === q.answer);

    quiz.results.push({ question: q, picked: picked, correct: isCorrect });

    if (isCorrect) {
      /* Spec 7: a question leaves the review list when it is answered
         correctly during a review run. */
      if (quiz.mode === 'review') removeMistake(q.id);
    } else {
      addMistake(q.id);
    }

    var buttons = $('choices').querySelectorAll('.choice');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var key = btn.dataset.key;
      btn.disabled = true;
      if (key === q.answer) {
        btn.classList.add('is-correct');
        addSign(btn, '✓');
      } else if (key === picked) {
        btn.classList.add('is-wrong');
        addSign(btn, '✗');
      } else {
        btn.classList.add('is-dim');
      }
    }

    var fb = $('feedback');
    fb.hidden = false;
    fb.className = 'feedback ' + (isCorrect ? 'is-correct' : 'is-wrong');
    $('feedback-verdict').textContent = isCorrect ? '✓ Correct!' : '✗ Not quite.';
    $('feedback-explanation').textContent = q.explanation || '';

    $('btn-next').hidden = false;
  }

  function addSign(btn, sign) {
    var s = document.createElement('span');
    s.className = 'choice__sign';
    s.textContent = sign;
    btn.appendChild(s);
  }

  function next() {
    if (!quiz.answered) return;
    if (quiz.index + 1 >= quiz.questions.length) {
      finish();
    } else {
      quiz.index++;
      renderQuestion();
    }
  }

  /* ---------------- results ---------------- */

  function finish() {
    var total = quiz.questions.length;
    var score = quiz.results.filter(function (r) { return r.correct; }).length;

    if (quiz.key) recordScore(quiz.key, score, total);

    $('results-title').textContent = quiz.title;
    $('score').textContent = score + ' / ' + total;

    var note;
    if (score === total) note = 'Perfect! Every answer was right.';
    else if (score >= Math.ceil(total * 0.8)) note = 'Nice work. Just a few to review.';
    else note = 'Good try. Look at the ones below, then run it again.';
    $('score-note').textContent = note;

    var missed = quiz.results.filter(function (r) { return !r.correct; });
    var list = $('missed-list');
    clear(list);
    $('missed-title').hidden = missed.length === 0;

    missed.forEach(function (r) {
      var q = r.question;
      var card = document.createElement('div');
      card.className = 'missed';

      var prompt = document.createElement('p');
      prompt.className = 'missed__prompt';
      renderPrompt(prompt, q.prompt);
      card.appendChild(prompt);

      card.appendChild(answerRow('is-wrong', '✗ Your answer: ', r.picked, q.type));
      card.appendChild(answerRow('is-correct', '✓ Correct answer: ', q.answer, q.type));

      var why = document.createElement('p');
      why.className = 'missed__why';
      why.textContent = q.explanation || '';
      card.appendChild(why);

      list.appendChild(card);
    });

    $('btn-results-review').disabled = mistakeQuestions().length === 0;

    showScreen('results');
  }

  function answerRow(cls, label, key, type) {
    var p = document.createElement('p');
    p.className = 'missed__row ' + cls;
    var b = document.createElement('b');
    b.textContent = label;
    p.appendChild(b);
    p.appendChild(document.createTextNode(key + '. ' + termName(key, type)));
    return p;
  }

  function tryAgain() {
    if (!quiz) return goHome();
    if (quiz.mode === 'set') startSet(quiz.setId);
    else if (quiz.mode === 'mix') startMix();
    else startReview();
  }

  function goHome() {
    quiz = null;
    renderHome();
    showScreen('home');
  }

  /* ---------------- cheat sheet ---------------- */

  function renderCheatSheet() {
    var list = $('cheat-list');
    clear(list);

    CHEAT.forEach(function (row) {
      var card = document.createElement('div');
      card.className = 'cheat';

      var head = document.createElement('div');
      head.className = 'cheat__head';

      var key = document.createElement('span');
      key.className = 'cheat__key';
      key.textContent = row.key;

      var term = document.createElement('span');
      term.className = 'cheat__term';
      term.textContent = terms[row.key] || row.key;

      head.appendChild(key);
      head.appendChild(term);
      card.appendChild(head);

      var meaning = document.createElement('p');
      meaning.className = 'cheat__meaning';
      meaning.textContent = row.meaning;
      card.appendChild(meaning);

      var example = document.createElement('p');
      example.className = 'cheat__example';
      renderPrompt(example, row.example);
      card.appendChild(example);

      list.appendChild(card);
    });

    $('cheat-tip').textContent = CHEAT_TIP;
    showScreen('cheat');
  }

  /* ---------------- wiring ---------------- */

  function bind() {
    $('btn-mix').addEventListener('click', startMix);
    $('btn-review').addEventListener('click', startReview);
    $('btn-cheat').addEventListener('click', renderCheatSheet);
    $('btn-cheat-home').addEventListener('click', goHome);

    $('btn-reset').addEventListener('click', function () {
      if (!window.confirm('Erase all scores and saved mistakes?')) return;
      progress = { scores: {}, mistakes: [] };
      try { localStorage.removeItem(STORE_KEY); } catch (e) {}
      renderHome();
    });

    $('btn-next').addEventListener('click', next);

    $('btn-quiz-home').addEventListener('click', function () {
      if (window.confirm('Quit this quiz?')) goHome();
    });

    $('btn-again').addEventListener('click', tryAgain);
    $('btn-results-review').addEventListener('click', startReview);
    $('btn-results-home').addEventListener('click', goHome);
  }

  function indexData() {
    terms = (data && data.terms) || {};
    allQuestions = [];
    byId = {};
    (data.sets || []).forEach(function (set) {
      (set.questions || []).forEach(function (q) {
        allQuestions.push(q);
        byId[q.id] = q;
      });
    });
  }

  function showLoadError(message) {
    var el = $('load-error');
    el.hidden = false;
    el.textContent = message;
  }

  fetch('./questions.json', { cache: 'no-cache' })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (json) {
      data = json;
      if (!data || !Array.isArray(data.sets)) throw new Error('questions.json has no "sets" list.');
      indexData();
      bind();
      renderHome();
      showScreen('home');
    })
    .catch(function (err) {
      showLoadError('Could not load questions.json (' + err.message +
        '). Open the app through a web server or GitHub Pages, not as a local file.');
    });

  /* Service worker: only over http(s), never file://. */
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {});
    });
  }
})();

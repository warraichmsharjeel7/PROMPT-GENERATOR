
const $ = (id) => document.getElementById(id);

const STORE_USERS = 'pgen_users_v1';
const STORE_SESSION = 'pgen_session_v1';

let authMode = 'login';
let recognition = null;
let selectedFiles = [];
let lastGenerated = '';
let credits = 25;

// ACCOUNT SYSTEM

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORE_USERS) || '{}');
  } catch {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(STORE_USERS, JSON.stringify(users));
}

function currentUser() {
  return localStorage.getItem(STORE_SESSION);
}

function showAuth(mode = 'login') {
  authMode = mode;

  $('auth-screen').hidden = false;
  $('app-screen').hidden = true;

  $('show-login').classList.toggle('active', mode === 'login');
  $('show-signup').classList.toggle('active', mode === 'signup');

  $('name-field').hidden = mode !== 'signup';

  $('auth-title').textContent =
    mode === 'login' ? 'Welcome back' : 'Create your account';

  $('auth-subtitle').textContent =
    mode === 'login'
      ? 'Sign in and turn your ideas into powerful prompts.'
      : 'Join PromptGen AI and build better prompts.';

  $('auth-submit-text').textContent =
    mode === 'login' ? 'Sign in' : 'Create account';

  $('auth-password').autocomplete =
    mode === 'login' ? 'current-password' : 'new-password';

  $('auth-error').textContent = '';
}

$('show-login').onclick = () => showAuth('login');
$('show-signup').onclick = () => showAuth('signup');

$('auth-form').addEventListener('submit', e => {
  e.preventDefault();

  const email = $('auth-email').value.trim().toLowerCase();
  const pass = $('auth-password').value;
  const name = $('auth-name').value.trim();

  const users = getUsers();

  if (authMode === 'signup') {

    if (!name) {
      $('auth-error').textContent = 'Please enter your name.';
      return;
    }

    if (users[email]) {
      $('auth-error').textContent =
        'An account with this email already exists.';
      return;
    }

    users[email] = {
      name,
      password: pass
    };

    saveUsers(users);

    localStorage.setItem(STORE_SESSION, email);

    enterApp();

  } else {

    if (!users[email] || users[email].password !== pass) {
      $('auth-error').textContent =
        'Email or password is incorrect. Create an account if this is your first visit.';
      return;
    }

    localStorage.setItem(STORE_SESSION, email);

    enterApp();
  }
});

// OPEN DASHBOARD

function enterApp() {

  const email = currentUser();
  const user = getUsers()[email];

  if (!user) {
    showAuth();
    return;
  }

  $('auth-screen').hidden = true;
  $('app-screen').hidden = false;

  $('user-name').textContent = user.name;
  $('user-email').textContent = email;

  $('user-avatar').textContent =
    (user.name[0] || 'U').toUpperCase();

  renderHistory();
  showView('builder');
}

// LOGOUT

$('logout-button').onclick = () => {
  localStorage.removeItem(STORE_SESSION);
  showAuth('login');
};

$('profile-menu').onclick = () =>
  toast('Signed in as ' + $('user-email').textContent);

$('credits-button').onclick = () =>
  toast('This demo includes 25 prompt credits. Payment features are not connected.');

$('help-button').onclick = () =>
  toast('Write or speak an idea, adjust settings, then generate and copy your English prompt.');

$('mobile-menu').onclick = () =>
  $('sidebar').classList.toggle('open');

// NAVIGATION

function showView(view) {

  ['builder', 'chat', 'history'].forEach(v => {
    $(v + '-view').hidden = v !== view;
  });

  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view);
  });

  const labels = {
    builder: 'Prompt Builder',
    chat: 'Chat',
    history: 'History'
  };

  $('breadcrumb-current').textContent = labels[view];

  $('page-title').innerHTML =
    view === 'builder'
      ? 'Master AI Prompting <span>in Seconds</span>'
      : view === 'chat'
      ? 'Your AI Prompt <span>Workspace</span>'
      : 'Your Prompt <span>History</span>';

  $('page-description').textContent =
    view === 'builder'
      ? 'Describe what you need. We’ll shape your idea into a clear, powerful English prompt.'
      : view === 'chat'
      ? 'Quickly turn a fresh idea into a structured English prompt.'
      : 'Revisit and reuse prompts you have generated.';

  $('sidebar').classList.remove('open');
}

document.querySelectorAll('.nav-item').forEach(b => {
  b.addEventListener('click', () => showView(b.dataset.view));
});

// TASK INPUT

$('task-input').addEventListener('input', () => {
  $('task-count').textContent =
    $('task-input').value.length + ' / 1500';

  $('builder-error').textContent = '';
});

$('clear-task').onclick = () => {
  $('task-input').value = '';
  $('task-input').dispatchEvent(new Event('input'));
};

// FILE ATTACHMENTS

$('file-input').addEventListener('change', e => {

  const files = [...e.target.files];

  if (selectedFiles.length + files.length > 3) {
    toast('You can attach up to 3 files.');
    e.target.value = '';
    return;
  }

  selectedFiles.push(...files);

  renderFiles();

  e.target.value = '';
});

function renderFiles() {

  $('file-list').innerHTML = '';

  selectedFiles.forEach((f, i) => {

    const chip = document.createElement('span');

    chip.className = 'file-chip';
    chip.textContent = '📎 ' + f.name + '  ×';
    chip.title = 'Click to remove';

    chip.onclick = () => {
      selectedFiles.splice(i, 1);
      renderFiles();
    };

    $('file-list').append(chip);
  });
}

// VOICE INPUT

$('voice-button').onclick = () => {

  const SR =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SR) {
    $('builder-error').textContent =
      'Voice recognition is not supported in this browser. Try Chrome or type your idea.';
    return;
  }

  if (recognition) {
    recognition.stop();
    return;
  }

  recognition = new SR();

  recognition.lang = $('voice-language').value;
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onstart = () => {
    $('voice-button').classList.add('listening');
    $('voice-label').textContent = 'Listening…';
  };

  recognition.onresult = e => {

    let t = '';

    for (let i = e.resultIndex; i < e.results.length; i++) {
      t += e.results[i][0].transcript;
    }

    $('task-input').value = t;

    $('task-input').dispatchEvent(new Event('input'));
  };

  recognition.onerror = e => {

    $('builder-error').textContent =
      e.error === 'not-allowed'
        ? 'Allow microphone permission in your browser.'
        : 'Voice input failed. Check the selected language and try again.';
  };

  recognition.onend = () => {
    recognition = null;

    $('voice-button').classList.remove('listening');
    $('voice-label').textContent = 'Speak';
  };

  try {
    recognition.start();
  } catch {
    recognition = null;
    $('voice-label').textContent = 'Speak';
  }
};

// TRANSLATE ANY LANGUAGE INTO ENGLISH

async function translateToEnglish(text) {

  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=' +
    encodeURIComponent(text);

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error('Translation unavailable');
  }

  const data = await res.json();

  const out = Array.isArray(data?.[0])
    ? data[0].map(x => x?.[0] || '').join('')
    : '';

  if (!out.trim()) {
    throw new Error('No translation');
  }

  return out.trim();
}

// PROFESSIONAL PROMPT GENERATOR

function makePrompt(task) {

  const target = $('ai-tool').value;
  const role = $('expertise').value;
  const format = $('output-format').value;
  const context = $('context-input').value.trim();

  const rules = [];

  if ($('include-steps').checked) {
    rules.push(
      'Explain the important steps clearly where useful.'
    );
  }

  if ($('include-questions').checked) {
    rules.push(
      'Ask concise clarifying questions only when essential information is missing; otherwise make sensible professional assumptions.'
    );
  }

  const files = selectedFiles.length
    ? 'Reference files attached by the user: ' +
      selectedFiles.map(f => f.name).join(', ') +
      '. Review their contents if the platform supports file access.'
    : '';

  return `Act as ${
    role === 'Choose the best expert automatically'
      ? 'the most qualified subject-matter expert for this task'
      : role
  }. You are an expert prompt follower and deliver high-quality, practical results.

MY REQUEST
${task}

TARGET PLATFORM
${target}

ADDITIONAL CONTEXT
${context || 'No additional context provided.'}
${files}

OUTPUT PREFERENCES
${format}
${rules.join('\n')}

REQUIREMENTS
1. Understand and preserve the exact intent of my request. Do not omit important details.
2. Deliver a complete, accurate, polished result that directly fulfils the request.
3. Organize the response with clear headings and logical sections.
4. Make sensible professional decisions for minor missing details; do not invent facts.
5. Avoid generic filler and unnecessary repetition.
6. If this is a website or software task, act as a senior developer and UI/UX designer. Follow the requested technologies, provide complete working code, responsive layouts, accessible interactions, and clear setup instructions.
7. Check the result for consistency, usability, and likely edge cases before presenting it.

Now complete my request to a professional standard.`;
}

// GENERATE PROMPT

async function generate(
  raw = $('task-input').value.trim(),
  target = 'builder'
) {

  if (!raw) {

    if (target === 'builder') {
      $('builder-error').textContent =
        'Please describe your task first.';
    } else {
      toast('Please enter your idea first.');
    }

    return;
  }

  if (raw.length > 1500) {
    $('builder-error').textContent =
      'Please keep your idea under 1500 characters.';
    return;
  }

  const btn =
    target === 'builder'
      ? $('generate-button')
      : $('chat-generate');

  btn.disabled = true;
  btn.textContent = 'Translating & building…';

  try {

    const english = await translateToEnglish(raw);

    lastGenerated = makePrompt(english);

    if (target === 'builder') {

      $('empty-result').hidden = true;
      $('result-output').hidden = false;

      $('prompt-text').textContent = lastGenerated;

      $('result-time').textContent = 'Generated just now';

    } else {

      $('chat-result').hidden = false;
      $('chat-result').textContent = lastGenerated;
    }

    saveHistory(lastGenerated);

    credits = Math.max(0, credits - 1);

    $('credit-count').textContent = credits;

    toast('Your English prompt is ready!');

  } catch (e) {

    if (target === 'builder') {

      $('builder-error').textContent =
        'Could not translate right now. Check your internet connection and try again.';

    } else {

      toast('Translation failed. Check your internet connection.');
    }

  } finally {

    btn.disabled = false;

    btn.innerHTML =
      target === 'builder'
        ? '<span>Generate Prompt</span><b>✦</b>'
        : 'Generate a prompt ↗';
  }
}

$('generate-button').onclick = () => generate();

$('chat-generate').onclick = () =>
  generate($('chat-input').value.trim(), 'chat');

// COPY PROMPT

$('copy-prompt').onclick = async () => {

  try {

    await navigator.clipboard.writeText(lastGenerated);

    toast('Prompt copied to clipboard!');

  } catch {

    toast('Clipboard unavailable. Select the prompt and copy it.');
  }
};

// DOWNLOAD PROMPT

$('download-prompt').onclick = () => {

  if (!lastGenerated) return;

  const a = document.createElement('a');

  a.href = URL.createObjectURL(
    new Blob([lastGenerated], { type: 'text/plain' })
  );

  a.download = 'PromptGenAI-Prompt.txt';

  a.click();

  URL.revokeObjectURL(a.href);
};

// SAVE HISTORY

function saveHistory(prompt) {

  const key = 'pgen_history_' + currentUser();

  let arr = [];

  try {
    arr = JSON.parse(localStorage.getItem(key) || '[]');
  } catch {}

  arr.unshift({
    date: new Date().toLocaleString(),
    prompt
  });

  localStorage.setItem(
    key,
    JSON.stringify(arr.slice(0, 30))
  );

  renderHistory();
}

// DISPLAY HISTORY

function renderHistory() {

  const key = 'pgen_history_' + currentUser();

  let arr = [];

  try {
    arr = JSON.parse(localStorage.getItem(key) || '[]');
  } catch {}

  $('history-list').innerHTML = '';

  if (!arr.length) {

    $('history-list').innerHTML =
      '<div class="history-item"><strong>No prompts yet</strong><p>Your generated prompts will appear here.</p></div>';

    return;
  }

  arr.forEach((item, i) => {

    const box = document.createElement('div');
    box.className = 'history-item';

    const title = document.createElement('strong');
    title.textContent = 'Prompt · ' + item.date;

    const p = document.createElement('p');
    p.textContent = item.prompt;

    const b = document.createElement('button');
    b.textContent = 'Load prompt';

    b.onclick = () => {

      lastGenerated = item.prompt;

      $('prompt-text').textContent = item.prompt;

      $('empty-result').hidden = true;
      $('result-output').hidden = false;

      showView('builder');
    };

    box.append(title, p, b);

    $('history-list').append(box);
  });
}

// TOAST MESSAGE

let toastTimer;

function toast(message) {

  const el = $('toast');

  el.textContent = message;

  el.classList.add('show');

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    el.classList.remove('show');
  }, 2600);
}

// START APPLICATION

if (currentUser() && getUsers()[currentUser()]) {
  enterApp();
} else {
  showAuth('login');
}

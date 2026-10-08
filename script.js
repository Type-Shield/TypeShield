const SITE = {
  brand: 'TypeShield',
  formEndpoint: 'https://formspree.io/f/xaeqwqpk',
};

for (const el of document.querySelectorAll('[data-brand]')) el.textContent = SITE.brand;
document.getElementById('year').textContent = new Date().getFullYear();

const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const SAMPLES = [
  { label: 'GitHub token', value: 'ghp_7Kx2mQ9vL…', token: '[GITHUB_TOKEN_001]' },
  { label: 'Kredi kartı', value: '4111 1111 1111 1111', token: '[CREDIT_CARD_001]' },
  { label: 'AWS anahtarı', value: 'AKIAIOSFODNN7EXAMPLE', token: '[AWS_ACCESS_KEY_001]' },
  { label: 'E-posta', value: 'ali@firma.com.tr', token: '[EMAIL_001]' },
  { label: 'Veritabanı', value: 'postgres://admin:••••@db01', token: '[CONNECTION_STRING_001]' },
  { label: 'TC kimlik no', value: '10000000146', token: '[TCKN_001]' },
  { label: 'Slack token', value: 'xoxb-2913-4471…', token: '[SLACK_TOKEN_001]' },
  { label: 'Şifre', value: 'Kahve2026!', token: '[PASSWORD_001]' },
  { label: 'JWT', value: 'eyJhbGciOiJIUzI1…', token: '[JWT_001]' },
  { label: 'OpenAI anahtarı', value: 'sk-proj-8fQ2…', token: '[OPENAI_KEY_001]' },
];
const ticker = document.getElementById('ticker');
if (ticker && !reduceMotion) {
  const label = ticker.querySelector('.t-label');
  const val = ticker.querySelector('.t-val');
  let i = 0;
  const show = () => {
    const s = SAMPLES[i++ % SAMPLES.length];
    label.textContent = s.label;
    val.textContent = s.value;
    val.className = 't-val raw';
    setTimeout(() => {
      val.textContent = s.token;
      val.className = 't-val tok';
    }, 1400);
  };
  show();
  setInterval(show, 3200);
}

const digits = (s) => s.replace(/\D/g, '');

function validTckn(raw) {
  const v = digits(raw);
  if (!/^[1-9]\d{10}$/.test(v)) return false;
  const d = [...v].map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  if ((((odd * 7 - even) % 10) + 10) % 10 !== d[9]) return false;
  return d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === d[10];
}
function validIban(raw) {
  const s = raw.replace(/[\s-]/g, '').toUpperCase();
  if (!/^TR\d{24}$/.test(s)) return false;
  const n = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let r = 0;
  for (const ch of n) r = (r * 10 + Number(ch)) % 97;
  return r === 1;
}
function validCard(raw) {
  const v = digits(raw);
  if (v.length < 13 || v.length > 19 || !/^(4|5[1-5]|3[47]|9792)/.test(v)) return false;
  let sum = 0, dbl = false;
  for (let i = v.length - 1; i >= 0; i--) {
    let n = Number(v[i]);
    if (dbl) { n *= 2; if (n > 9) n -= 9; }
    sum += n; dbl = !dbl;
  }
  return sum % 10 === 0;
}

const RULES = [
  { type: 'PRIVATE_KEY', label: 'Private key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
  { type: 'OPENAI_KEY', label: 'OpenAI anahtarı', re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/g },
  { type: 'AWS_ACCESS_KEY', label: 'AWS anahtarı', re: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
  { type: 'GITHUB_TOKEN', label: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{36}\b/g },
  { type: 'PASSWORD', label: 'Şifre', re: /(?:password|şifre|parola)["']?\s*[:=]\s*["']?([^\s"',;]{4,})/gi, group: 1 },
  { type: 'IBAN', label: 'IBAN', re: /\bTR\d{2}(?:[\s-]?\d{4}){5}[\s-]?\d{2}\b/gi, ok: validIban },
  { type: 'EMAIL', label: 'E-posta', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, ok: (v) => !/@example\./i.test(v) },
  { type: 'PHONE', label: 'Telefon', re: /(?<![\d+])(?:(?:\+|00)90[\s.-]?|0[\s.-]?)5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}(?!\d)/g },
  { type: 'CREDIT_CARD', label: 'Kredi kartı', re: /(?<!\d)\d(?:[ -]?\d){12,18}(?!\d)/g, ok: validCard },
  { type: 'TCKN', label: 'TC kimlik no', re: /(?<![\d.])[1-9](?:[ .]?\d){10}(?!\d)/g, ok: validTckn },
];

function scan(text) {
  const found = [];
  for (const rule of RULES) {
    for (const m of text.matchAll(rule.re)) {
      const value = rule.group ? m[rule.group] : m[0];
      if (!value || (rule.ok && !rule.ok(value))) continue;
      const start = m.index + (rule.group ? m[0].indexOf(value) : 0);
      const end = start + value.length;
      if (found.some((f) => start < f.end && f.start < end)) continue;
      found.push({ ...rule, value, start, end });
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

function renderDemo() {
  const text = document.getElementById('demo-input').value;
  const found = scan(text);
  const out = document.getElementById('demo-out');
  const tokens = new Map();
  const counters = {};
  out.replaceChildren();
  let pos = 0;
  for (const f of found) {
    out.append(text.slice(pos, f.start));
    const key = f.type + ':' + f.value.replace(/[\s.()-]/g, '').toLowerCase();
    if (!tokens.has(key)) {
      counters[f.type] = (counters[f.type] || 0) + 1;
      tokens.set(key, `[${f.type}_${String(counters[f.type]).padStart(3, '0')}]`);
    }
    const tok = document.createElement('span');
    tok.className = 'tok';
    tok.textContent = tokens.get(key);
    out.append(tok);
    pos = f.end;
  }
  out.append(text.slice(pos));

  const count = document.getElementById('demo-count');
  count.textContent = found.length ? `${found.length} hassas veri maskelendi` : 'Hassas veri yok, mesaj olduğu gibi gider';
  count.classList.toggle('clean', found.length === 0);

  const labels = [...new Set(found.map((f) => f.label))];
  document.getElementById('demo-found').replaceChildren(
    ...labels.map((l) => Object.assign(document.createElement('li'), { textContent: l })),
  );
}
document.getElementById('demo-input').addEventListener('input', renderDemo);
renderDemo();

for (const a of document.querySelectorAll('[data-plan]')) {
  a.addEventListener('click', () => {
    document.querySelector('#signup select[name=plan]').value = a.dataset.plan;
  });
}

document.getElementById('signup').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const msg = document.getElementById('signup-msg');
  const email = form.email.value.trim();
  if (form._gotcha.value) {
    form.reset();
    msg.textContent = 'Listeye eklendin. Yeni gelişmelerde sana yazacağız.';
    msg.classList.add('ok');
    return;
  }
  msg.className = 'msg';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    msg.textContent = 'Geçerli bir e-posta adresi yaz.';
    msg.classList.add('err');
    form.email.focus();
    return;
  }
  if (!SITE.formEndpoint) {
    msg.textContent = 'Form henüz bağlanmadı. Site sahibi: SITE.formEndpoint ayarını doldur.';
    msg.classList.add('err');
    return;
  }
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    const res = await fetch(SITE.formEndpoint, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(form),
    });
    if (!res.ok) throw new Error();
    form.reset();
    msg.textContent = 'Listeye eklendin. Yeni gelişmelerde sana yazacağız.';
    msg.classList.add('ok');
  } catch {
    msg.textContent = 'Gönderilemedi. Biraz sonra tekrar dene.';
    msg.classList.add('err');
  } finally {
    button.disabled = false;
  }
});

for (const btn of document.querySelectorAll('.more-btn')) {
  btn.addEventListener('click', () => {
    const card = btn.closest('.cat');
    const open = card.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? 'Daha az göster' : `Tümünü gör (+${btn.dataset.rest})`;
  });
}

const totop = document.getElementById('totop');
const toggleTop = () => totop.classList.toggle('show', window.scrollY > 600);
window.addEventListener('scroll', toggleTop, { passive: true });
toggleTop();
totop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

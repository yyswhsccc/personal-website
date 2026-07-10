/* ============================================================
   yongshanOS · WALL WORKER — the worldwide selfie wall backend
   ============================================================
   design notes, written down so they never drift:
   · KV-only architecture: photo bytes live as binary KV values,
     the timestamp rides in KV *metadata*, and key names embed an
     INVERTED timestamp so a plain lexicographic list() returns
     newest-first with zero index bookkeeping.
   · privacy: no raw IPs are ever stored — rate-limit keys are
     salted SHA-256 hashes with a 1h TTL. no cookies, no accounts.
   · abuse posture: strict CORS allow-list, JPEG-only with magic-
     byte checks (FF D8 FF … FF D9), 130KB cap, 5 uploads/hour/IP,
     a hard wall cap, an owner kill-switch, and owner delete.
   · performance: wall listings are edge-cached 30s; photo bytes
     are immutable (cache-control: max-age=31536000). */

const ALLOW_ORIGINS = [
  'https://yyswhsccc.github.io',
  'http://localhost:8642',
  'http://127.0.0.1:8642',
  'http://localhost:8742',
  'http://127.0.0.1:8742'
];
const MAX_BYTES = 130 * 1024;   // one framed selfie, comfortably
const PAGE_SIZE = 24;
const RATE_MAX = 5;             // uploads / hour / visitor
const WALL_CAP = 600;           // the wall is big. not infinite.

/* ---- 📊 SHARED-WORLD STATS — every visitor sees the same numbers.
   KV-only counters under s:<name>. the value ALSO rides in metadata,
   so GET /stats is a single list() — no N+1 reads. bumps are clamped
   and rate-limited per (salted, hashed) visitor; keys must match an
   allow-listed prefix so the namespace can't be graffiti'd. ---- */
const STAT_KEY_RE = /^[a-z0-9:_-]{1,48}$/;
const STAT_PREFIXES = ['fans', 'likes', 'food:', 'boop:', 'hall:', 'misc:'];
const STAT_BUMP_MAX = 5;   // the biggest single hop one action may take
const STAT_RATE_MAX = 120; // bumps / hour / visitor — generous, not infinite
function statKeyOk(key) {
  return STAT_KEY_RE.test(key) && STAT_PREFIXES.some((p) => key === p || key.startsWith(p));
}

function corsHeaders(req) {
  const origin = req.headers.get('Origin') || '';
  const ok = ALLOW_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : ALLOW_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}
function json(req, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) }
  });
}
async function ipHash(req, env) {
  const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
  const data = new TextEncoder().encode(ip + '|' + (env.SALT || 'meadow'));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function isJpeg(bytes) {
  return bytes.length > 4 &&
    bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF &&
    bytes[bytes.length - 2] === 0xFF && bytes[bytes.length - 1] === 0xD9;
}
function newId() {
  // inverted-timestamp key: lexicographic ascending = newest first
  const inv = String(1e13 - Date.now()).padStart(13, '0');
  const rand = crypto.getRandomValues(new Uint8Array(4));
  return inv + '-' + [...rand].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function isAdmin(req, env) {
  const auth = req.headers.get('Authorization') || '';
  return env.ADMIN_SECRET && auth === 'Bearer ' + env.ADMIN_SECRET;
}

/* ---- GET /hi — a LIVE typing session streamed into the visitor's terminal.
   chunked transfer + real delays = the visitor literally watches someone type,
   typo, panic, backspace, and hide the address at the last second.
   pure text theater: nothing here executes anything, ever. ---- */
function hiShow(ctx) {
  const enc = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const w = writable.getWriter();
  const G = '\x1b[92m', P = '\x1b[95m', C = '\x1b[96m', D = '\x1b[2m', B = '\x1b[1m', RD = '\x1b[91m', R = '\x1b[0m';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const show = (async () => {
    const out = (s) => w.write(enc.encode(s));
    const t = async (s, cps) => { // human typing: uneven, alive
      const base = 1000 / (cps || 26);
      for (const ch of s) { await out(ch); await sleep(base * (0.5 + Math.random())); }
    };
    const bs = async (n, ms) => { for (let i = 0; i < n; i++) { await out('\b \b'); await sleep(ms || 24); } };
    try {
      await out(P + '♡ tty attached — yongshanOS switchboard' + R + '\n');
      await out(D + '  (this is not a print-out. someone is typing. watch.)' + R + '\n\n');
      await sleep(900);
      await t(G + '$ ' + R + 'whoami\n', 30);
      await sleep(250);
      await out('yongshan — engineer, slime rancher, human (citation needed)\n\n');
      await sleep(500);
      // typo nº1: the classic
      await t(G + '$ ' + R + 'gti push origin friendship', 26);
      await sleep(700);
      await out(D + '   ← no. NO.' + R);
      await sleep(450);
      await bs(40);
      await t('git push origin friendship\n', 34);
      await sleep(300);
      await out('Everything up-to-date. (we were already friends ♡)\n\n');
      await sleep(450);
      // typo nº2: the incident
      await t(G + '$ ' + R + 'rm -rf /', 18);
      await sleep(900);
      await out(RD + '  ⚠ NO NO NO WAIT—' + R);
      await sleep(400);
      await bs(29, 14);
      await t('rm -rf doubts/\n', 30);
      await sleep(250);
      await out("removed 'doubts/' — 34 files, all imaginary\n\n");
      await sleep(400);
      await t(G + '$ ' + R + ':wq', 22);
      await sleep(600);
      await bs(3);
      await out(D + '(sorry. vim muscle memory.)' + R + '\n\n');
      await sleep(650);
      await out(B + 'ok — here is what you found:' + R + '\n');
      await t('a pixel meadow. a slime that streams. and a locked DOOR full of puzzles.\n', 40);
      await sleep(350);
      await t('the door is at ' + C + 'https://yyswhsccc.github.io/pers' + R, 24);
      await sleep(1100);
      await out(D + '  …wait. you decoded base64 to get HERE. plaintext would insult you.' + R);
      await sleep(700);
      await bs(120, 9); // the whole line vanishes, fast and slightly panicked (overshoot is harmless at col 0)
      await t('right. the OFFICIAL tour guide, keep-able and copy-pasteable:\n', 38);
      await sleep(300);
      // the tutorial proper — printed crisply so it survives in the scrollback
      const DOOR_B64 = 'aHR0cHM6Ly95eXN3aHNjY2MuZ2l0aHViLmlvL3BlcnNvbmFsLXdlYnNpdGUvI3Rlcm1pbmFsCg==';
      await out('\n' + P + '━━ HOW TO ENTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + R + '\n');
      await out(B + 'STEP 1' + R + ' · decode the address (it prints a URL):\n\n');
      await out('    ' + C + 'echo ' + DOOR_B64 + ' | base64 -d' + R + '\n\n');
      await out(D + '    macOS shortcut: ' + R + 'open "$(echo ' + DOOR_B64 + ' | base64 -d)"\n\n');
      await sleep(400);
      await out(B + 'STEP 2' + R + ' · open it in any browser. the door is ' + P + 'LOCKED' + R + ' —\n');
      await out('    a short chain of tiny puzzles, freshly shuffled for you alone.\n');
      await out('    survivors are told the key ♡ (' + C + 'hint' + R + ' helps. flailing summons a hero.)\n\n');
      await sleep(400);
      await out(B + 'BONUS' + R + ' · pikmin trading cards, dealt by YOUR shell\'s own dice:\n\n');
      await out('    ' + C + 'curl -sL "https://yyswhsccc.github.io/personal-website/pik/$((RANDOM % 5))"' + R + '\n\n');
      await out(D + '(everything here only prints. nothing executes. your shell is safe.)' + R + '\n');
      await out(P + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + R + '\n\n');
      await sleep(600);
      // the after-credits scene: STEP INSIDE the container — a REAL one
      // now (an actual ssh server; the show replays on connect and then
      // the visitor owns the prompt. no prefix, no wrapper, no piping.)
      await t(B + 'wait. one more thing.' + R + '\n', 30);
      await sleep(400);
      await t('there is a CONTAINER. a REAL one. you can step inside —\n', 44);
      await out('one command ' + D + '(plain ssh: any name works, no password, nothing to install)' + R + ':\n\n');
      await out('  ' + C + 'ssh $(echo ' + SSH_B64 + ' | base64 -d)' + R + '\n\n');
      await out('the show replays in there — then the prompt is YOURS. try:\n');
      await out('  ' + G + 'ls' + R + '        ' + G + 'whoami' + R + '      ' + G + 'top' + R + '\n');
      await out('  ' + G + 'vim' + R + '       ' + G + 'sudo rm -rf /' + R + '   ' + D + '← especially this one' + R + '\n');
      await out('  ' + G + 'help' + R + '      ' + G + 'exit' + R + '        ' + D + '(it has opinions)' + R + '\n\n');
      await out(D + 'firewalled at work? the curl-costume shell still answers:' + R + '\n');
      await out('  ' + D + 'slime() { curl -sN -G --data-urlencode "c=$*" ' + SH_URL + '; }' + R + '\n\n');
      await sleep(500);
      await t(G + '$ ' + R + 'logout\n', 30);
      await out(P + '— yongshan ♡ ' + D + '(the slime says hi too. it cannot type. it tried.)' + R + '\n');
    } catch (e) { /* visitor hung up mid-show — no hard feelings */ }
    try { await w.close(); } catch (e) { /* already closed */ }
  })();
  ctx.waitUntil(show);
  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

/* ============================================================
   🐳 SLIME-DOCKER — a "container" that lives in the visitor's
   own terminal. the visitor pastes ONE visible wrapper line:
     slime() { curl -sN -G --data-urlencode "c=$*" <this>/sh; }
   every `slime <cmd>` becomes a GET here; we stream back a
   typed, in-character response. NOTHING ever executes on the
   visitor's machine — it is curl, cosplaying as a shell. ---- */
const SH_URL = 'https://yongshanos-wall.yongshanos.workers.dev/sh';
const SSH_B64 = 'c3NoOi8vc2xpbWVAMy45OC4yMTcuMTU3OjIyMjI='; // ssh://slime@3.98.217.157:2222 — the REAL container
const DOOR_B64 = 'aHR0cHM6Ly95eXN3aHNjY2MuZ2l0aHViLmlvL3BlcnNvbmFsLXdlYnNpdGUvI3Rlcm1pbmFsCg==';
const DOOR_URL = 'https://yyswhsccc.github.io/personal-website/#terminal';
// strip every terminal-hijack codepoint before echoing user text back:
// C0 + DEL, C1 (incl. U+009B single-byte CSI), and bidi overrides/isolates/marks.
function shClean(raw) {
  let out = '';
  for (const ch of String(raw || '')) {
    const cp = ch.codePointAt(0);
    const bad = cp < 0x20 || (cp >= 0x7F && cp <= 0x9F) ||
      (cp >= 0x200E && cp <= 0x200F) || (cp >= 0x202A && cp <= 0x202E) || (cp >= 0x2066 && cp <= 0x2069);
    out += bad ? ' ' : ch;
  }
  return out.replace(/\s+/g, ' ').trim();
}
function shShow(ctx, rawCmd, visitorN) {
  const enc = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const w = writable.getWriter();
  const G = '\x1b[92m', P = '\x1b[95m', C = '\x1b[96m', D = '\x1b[2m', B = '\x1b[1m', RD = '\x1b[91m', Y = '\x1b[93m', R = '\x1b[0m';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // sanitize: strip EVERY terminal-hijack vector before we echo user text back.
  // /sh is public and we hand out a curl wrapper, so a crafted c= could otherwise
  // smuggle escapes into a victim's terminal. kill: C0+DEL, C1 (incl. U+009B CSI),
  // and Unicode bidi overrides/isolates/marks (visual spoofing).
  const cmd = shClean(rawCmd).slice(0, 200);
  const lower = cmd.toLowerCase();
  const head = lower.split(' ')[0] || '';
  const show = (async () => {
    const out = (s) => w.write(enc.encode(s));
    const t = async (s, cps) => { const base = 1000 / (cps || 42); for (const ch of s) { await out(ch); await sleep(base * (0.5 + Math.random())); } };
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    try {
      const prompt = D + 'slime-docker' + R + P + ' ♡ ' + R;
      /* ---------- extreme / hostile inputs get the best seats ---------- */
      if (/^:\(\)\s*{.*};?\s*:/.test(cmd) || /:\|:&/.test(cmd)) {
        await out(prompt + RD + 'FORK BOMB DETECTED' + R + '\n');
        await sleep(500);
        for (let i = 0; i < 5; i++) { await out(D + '  fork(' + (2 ** i) + ')… ' + R + G + 'intercepted by pikmin firefighter #' + (i + 1) + ' 🧯' + R + '\n'); await sleep(260); }
        await out('\n' + P + 'all forks adopted and given tiny hats. 0 processes harmed.' + R + '\n');
        await out(D + '(this container forks only lettuce.)' + R + '\n');
      } else if (/rm\s+(-\w+\s+)*-?rf?\s+\/(\s|$|--)/.test(lower) || /--no-preserve-root/.test(lower)) {
        await out(prompt + 'ok. deleting everything. you asked.\n');
        await sleep(600);
        const items = ['/meadow/flowers (2,481)', '/slime/feelings (all)', '/pikmin/* (72 souls)', '/door/locks (3)', '/you/patience (what is left)'];
        for (const it of items) { await out(RD + '  rm: ' + it + R); await sleep(420); await out(G + '  …refused ♡' + R + '\n'); }
        await sleep(400);
        await out('\n' + B + 'deletion complete: 0 files removed.' + R + '\n');
        await out(D + 'this container is mounted read-only. like a memory. visit the real one:' + R + '\n');
        await out('  ' + C + 'echo ' + DOOR_B64 + ' | base64 -d' + R + '\n');
      } else if (/('|").*\bor\b.*=.*\1|drop\s+table|\b1\s*=\s*1\b/.test(lower)) {
        await out(prompt + 'hi bobby tables ♡\n');
        await out(D + 'this shell has no database. it has feelings, and they are un-injectable.' + R + '\n');
        await out(G + "0 rows affected. 1 slime amused." + R + '\n');
      } else if (/<\s*script|javascript:|onerror=/.test(lower)) {
        await out(prompt + 'a <script> tag. in a TERMINAL.\n');
        await out(D + 'that is like bringing a snorkel to the desert. respect for trying.' + R + '\n');
      } else if (/\.\.\//.test(cmd)) {
        await out(prompt + 'cd ../../.. as far as you like —\n');
        await out(D + 'there is no “up” here. the container is the whole universe. (it is 12KB.)' + R + '\n');
      } else if (cmd.length > 160) {
        await out(prompt + RD + 'argument list too long' + R + '\n');
        await out(D + '(the slime read the first 160 characters and fell asleep. it says: valid effort.)' + R + '\n');
      /* ---------- the classics, all covered ---------- */
      } else if (!cmd || head === 'help' || head === '?') {
        await out(P + '━━ slime-docker · tiny container, mostly heart ━━' + R + '\n');
        await out(B + '  look around ' + R + '   ls · cat <file> · pwd · env · ps · top\n');
        await out(B + '  be yourself ' + R + '   whoami · hostname · date · history · fortune\n');
        await out(B + '  cause chaos ' + R + '   sudo anything · rm -rf / · vim · fork bombs (really)\n');
        await out(B + '  toys        ' + R + '   matrix · slimesay <text> · cowsay · ping · neofetch · clear\n');
        await out(B + '  leave       ' + R + '   exit — or decode the door and meet everyone:\n');
        await out('     ' + C + 'echo ' + DOOR_B64 + ' | base64 -d' + R + '\n');
      } else if (head === 'ls' || head === 'll' || head === 'dir') {
        await out(D + 'total 72 (they are pikmin)' + R + '\n');
        await out(G + 'drwx--♡--- ' + R + ' pikmin/          ' + D + '72 items, photosynthesizing' + R + '\n');
        await out(G + '-r--r--♡-- ' + R + ' slime.pid        ' + D + 'PID 1. always 1.' + R + '\n');
        await out(G + '-rw-rw-♡-- ' + R + ' heart.c          ' + D + 'compiles warm' + R + '\n');
        await out(G + 'drwx------ ' + R + ' secrets/         ' + D + '(nice try — cat it and see)' + R + '\n');
        await out(D + '-????????? ' + R + ' doubts/          ' + D + 'deleted earlier. you watched.' + R + '\n');
        await out(G + '-rw-r--♡-- ' + R + ' README           ' + D + 'cat README' + R + '\n');
      } else if (head === 'cat' || head === 'less' || head === 'more' || head === 'head' || head === 'tail') {
        const f = lower.split(' ')[1] || '';
        if (f.indexOf('readme') !== -1) {
          await out(B + 'README — you are inside slime-docker.' + R + '\n');
          await out('the way out is also the way IN. decode the door:\n');
          await out('  ' + C + 'echo ' + DOOR_B64 + ' | base64 -d' + R + '\n');
          await out(D + 'inside: a pixel OS, 72 pikmin, one slime, locked puzzles. bring nothing.' + R + '\n');
        } else if (f.indexOf('heart') !== -1) {
          await out(C + 'int' + R + ' main(void) {\n  ' + C + 'while' + R + ' (alive) { beat(); miss_you(); }\n  ' + D + '/* unreachable, by design */' + R + '\n}\n');
        } else if (f.indexOf('slime.pid') !== -1) {
          await out('1\n' + D + '(the slime is init. the slime is always init.)' + R + '\n');
        } else if (f.indexOf('secret') !== -1) {
          await out(RD + 'cat: secrets/: Permission denied' + R + '\n');
          await sleep(600);
          await out(D + '…ok fine. one secret: ' + R + P + 'flag{cur1_c0splay1ng_as_a_sh3ll}' + R + D + ' — keep it.' + R + '\n');
        } else {
          await out(RD + 'cat: ' + (f || 'what') + ': No such file' + R + D + ' (this container is small. try `ls`.)' + R + '\n');
        }
      } else if (head === 'pwd') {
        await out('/home/visitor\n' + D + '(chroot: /meadow — you cannot tell, and that is the point)' + R + '\n');
      } else if (head === 'cd') {
        await out(prompt + D + 'everywhere in this container is already here. saved you the walk ♡' + R + '\n');
      } else if (head === 'whoami') {
        await out('visitor #' + (visitorN || '?') + '\n' + D + '(the slime keeps count. only the count. privacy is a feature.)' + R + '\n');
      } else if (head === 'hostname') {
        await out('slime-docker-' + Math.floor(Math.random() * 0xfff).toString(16).padStart(3, '0') + '\n');
      } else if (head === 'date') {
        await out(new Date().toUTCString() + '\n' + D + '(emotionally it is 2003)' + R + '\n');
      } else if (head === 'history') {
        await out(D + 'history: empty. this container forgets on purpose. (privacy is a feature, not a bug.)' + R + '\n');
      } else if (head === 'env' || head === 'printenv' || head === 'export') {
        await out('PATH=/meadow:/door:/heart\nSHELL=/bin/slime\nLOVE=unconditional\nEDITOR=vim ' + D + '(we all have flaws)' + R + '\nDOOR=' + DOOR_B64 + '\n');
      } else if (head === 'ps' || head === 'jobs') {
        await out('  PID  CMD\n    1  slime ' + D + '(dreaming)' + R + '\n 2-73  pikmin ' + D + '(photosynthesizing)' + R + '\n   74  your_visit ' + D + '(precious)' + R + '\n');
      } else if (head === 'top' || head === 'htop') {
        for (let i = 0; i < 3; i++) {
          if (i) { await sleep(850); await out('\x1b[5A'); }
          await out(B + 'slime-top — load average: 0.0♡ 0.0♡ 0.0♡        ' + R + '\n');
          await out('  PID  %CPU  %HEART  CMD                    \n');
          await out('    1  ' + (Math.random() * 2).toFixed(1) + '   100.0   slime                  \n');
          await out(' 2-73  ' + (Math.random() * 9).toFixed(1) + '    99.9   pikmin (x72)           \n');
          await out('   74   0.0   ' + (97 + i) + '.0    you                    \n');
        }
        await out(D + '(3 refreshes is enough. it never changes. it is a happy system.)' + R + '\n');
      } else if (head === 'sudo') {
        if (/\b(rm|shutdown|reboot|kill|halt|dd|mkfs|poweroff)\b/.test(lower)) {
          await out(RD + '[sudo] password for visitor: ' + R);
          await sleep(900);
          await out('********\n');
          await sleep(500);
          await out(prompt + 'correct password!! unfortunately:\n');
          await out(D + 'in this container, root is the slime. the slime pardons you. it thinks you are funny.' + R + '\n');
        } else {
          await out(prompt + 'permission granted ♡ ' + D + '(sudo here only grants confidence)' + R + '\n');
        }
      } else if (head === 'rm' || head === 'rmdir' || head === 'dd' || head === 'mkfs' || head === 'shred') {
        await out(RD + head + ': read-only file system' + R + '\n');
        await out(D + '(everything here is a memory. memories are append-only.)' + R + '\n');
      } else if (head === 'kill' || head === 'killall' || head === 'pkill') {
        await out(RD + 'kill: (1) — operation not permitted' + R + '\n' + D + 'you cannot kill init. init is the slime. the slime is love.' + R + '\n');
      } else if (head === 'vim' || head === 'vi' || head === 'nvim') {
        await out(prompt + 'entering vim.\n');
        await sleep(1400);
        await out(D + '…' + R + '\n');
        await sleep(1400);
        await out(D + ':q doesn\'t work in here either. lucky for you, this stream ends itself ♡' + R + '\n');
      } else if (head === 'emacs') {
        await out(prompt + 'M-x butterfly? no need — the meadow has a real one. it crosses the photo wall.\n');
      } else if (head === 'nano') {
        await out(prompt + 'nano: the only editor that lets you leave. too easy. denied ♡\n');
      } else if (head === 'git') {
        if (/push.*--force|push.*-f\b/.test(lower)) { await out(RD + 'remote: force push to friendship rejected' + R + '\n' + D + '(some branches are protected forever)' + R + '\n'); }
        else if (/status/.test(lower)) { await out('On branch ' + G + 'friendship' + R + '\nnothing to commit — all feelings staged ♡\n'); }
        else if (/log/.test(lower)) { await out(Y + 'a1b2c3d' + R + ' feat: met you\n' + Y + 'd4e5f6a' + R + ' fix: doubts (removed)\n' + Y + '0000000' + R + ' initial commit: one slime, much hope\n'); }
        else if (/blame/.test(lower)) { await out(D + 'git blame: nobody. this is a no-blame container.' + R + '\n'); }
        else { await out('git: try status · log · blame · push --force ' + D + '(you know you want to)' + R + '\n'); }
      } else if (head === 'docker' || head === 'podman' || head === 'kubectl') {
        await out(prompt + 'you are INSIDE the container, asking for containers.\n');
        await out(D + 'it is docker all the way down. at the bottom: a slime, holding everything up.' + R + '\n');
      } else if (head === 'ssh' || head === 'telnet' || head === 'nc') {
        await out(prompt + 'this is already as deep as the network goes.\n' + D + '(one more hop and you would be inside the slime. nobody returns from there. too cozy.)' + R + '\n');
      } else if (head === 'curl' || head === 'wget') {
        await out(prompt + 'curl inside curl.\n' + D + 'the pipes have formed a klein bottle. hydration achieved.' + R + '\n');
      } else if (head === 'ping') {
        for (let i = 1; i <= 3; i++) { await out('64 bytes from meadow: icmp_seq=' + i + ' ttl=∞ time=0.' + (i + 2) + ' ms ' + P + '(emotionally)' + R + '\n'); await sleep(420); }
        await out(D + '--- meadow ping statistics: 3 sent, 3 hugged, 0% lost ---' + R + '\n');
      } else if (head === 'python' || head === 'python3' || head === 'node' || head === 'ruby' || head === 'perl') {
        await out('>>> ' + C + 'import happiness' + R + '\n');
        await sleep(500);
        await out(RD + 'ImportError' + R + ': already built-in\n>>> ' + D + '(REPL closed. it had nothing left to teach.)' + R + '\n');
      } else if (head === 'make' || head === 'cargo' || head === 'gcc' || head === 'npm' || head === 'pip') {
        await out(prompt + 'installing…\n');
        await sleep(400);
        await out(G + '  + friendship@1.0.0' + R + '\n' + G + '  + wonder@3.2.1' + R + '\n' + G + '  + one_slime@♡' + R + '\n');
        await out(B + 'added 3 packages in 0.2s. 0 vulnerabilities. 0 node_modules.' + R + ' ' + D + '(a miracle)' + R + '\n');
      } else if (head === 'neofetch' || head === 'uname' || head === 'fastfetch') {
        await out(P + '   ▄▄██▄▄     ' + R + B + 'visitor@slime-docker' + R + '\n');
        await out(P + ' ▄████████▄   ' + R + 'OS:       slimeOS 5.cute (chroot)\n');
        await out(P + ' ██▀████▀██   ' + R + 'Kernel:   5.slime.0-♡\n');
        await out(P + ' ▀████████▀   ' + R + 'Uptime:   since you arrived\n');
        await out(P + '   ▀▀▀▀▀▀     ' + R + 'Packages: 72 (pikmin)\nShell:    /bin/slime\nMemory:   all of them kept\n');
      } else if (head === 'clear' || head === 'reset') {
        await out('\x1b[2J\x1b[H');
        await out(D + '✨ so clean. (the container approves.)' + R + '\n');
      } else if (head === 'matrix' || head === 'cmatrix') {
        for (let i = 0; i < 16; i++) {
          let line = '  ';
          for (let j = 0; j < 34; j++) line += Math.random() < 0.5 ? G + 'ｱｲｳｹｺ01'[Math.floor(Math.random() * 7)] + R : ' ';
          await out(line + '\n');
          await sleep(70);
        }
        await out(P + '  (the real rain falls behind the door ♡)' + R + '\n');
      } else if (head === 'cowsay' || head === 'slimesay') {
        const msg = cmd.split(' ').slice(1).join(' ') || 'moo? no. blorp.';
        const safe = msg.slice(0, 60);
        await out(' ' + '_'.repeat(safe.length + 2) + '\n< ' + safe + ' >\n ' + '-'.repeat(safe.length + 2) + '\n');
        await out(D + '        \\' + R + P + '   ▄██▄\n         ▀████▀' + R + D + '  ← it is a slime. cows are out of scope.' + R + '\n');
      } else if (head === 'fortune') {
        await out(P + pick([
          '“a pikmin plucked today keeps the doubts away.”',
          '“the best time to visit the meadow was yesterday. the second best is this exact second.”',
          '“you will meet a round pink stranger. be nice.”',
          '“ctrl+S your feelings.”',
          '“someday your prints will come.”'
        ]) + R + '\n');
      } else if (head === 'weather') {
        await out('meadow forecast: ' + G + 'pixel-sunny' + R + ', 100% chance of pikmin, light ♡ showers by evening\n');
      } else if (head === 'man') {
        await out(B + 'SLIME(1)' + R + ' — round, warm, root.\n' + B + 'SYNOPSIS' + R + ': slime [anything] — it forgives typos.\n' + B + 'SEE ALSO' + R + ': the door ♡\n');
      } else if (head === 'echo') {
        const msg = cmd.split(' ').slice(1).join(' ');
        if (msg.indexOf(DOOR_B64.slice(0, 20)) !== -1) { await out(DOOR_URL + '\n' + D + '(decoded it for you. now GO. everyone is waiting ♡)' + R + '\n'); }
        else { await out((msg || '') + ' ♡\n' + D + '(everything echoed here comes back slightly warmer)' + R + '\n'); }
      } else if (head === 'flag' || head === 'ctf') {
        await out(P + 'flag{cur1_c0splay1ng_as_a_sh3ll}' + R + '\n' + D + 'the on-site flag (🚩 ctfslime) waits behind the door. different flag. cuter.' + R + '\n');
      } else if (head === 'pikmin' || head === 'pik' || head === 'cards') {
        await out(prompt + 'the card dealer lives one URL over:\n');
        await out('  ' + C + 'curl -sL "https://yyswhsccc.github.io/personal-website/pik/$((RANDOM % 5))"' + R + '\n');
      } else if (head === 'door' || head === 'exit' || head === 'logout' || head === 'quit' || head === 'q') {
        await out(prompt + (head === 'door' ? 'yes!! THE door:' : 'you were never locked in — only welcomed. the door:') + '\n');
        await out('  ' + C + 'echo ' + DOOR_B64 + ' | base64 -d' + R + '\n');
        await out(D + '(open it in a browser. survive the locks. tell the slime I typed for you.)' + R + '\n');
      } else if (head === 'slime') {
        await out(prompt + 'slime inside slime. recursion base case reached: it is slimes all the way down, and they all say hi ♡\n');
      } else if (head === 'reboot' || head === 'shutdown' || head === 'halt' || head === 'poweroff') {
        await out(prompt + 'broadcast message from slime (pts/♡):\n');
        await sleep(500);
        await out(D + 'the system is going down for a hug NOW…' + R + '\n');
        await sleep(800);
        await out(G + 'hug complete. system restored. that is the whole shutdown procedure here.' + R + '\n');
      } else {
        await out(RD + 'slime-sh: ' + head.slice(0, 30) + ': command not found' + R + '\n');
        await out(D + pick([
          '(this container is very small. it is mostly heart. try `help`.)',
          '(the slime checked every aisle. nothing. try `help`.)',
          '(a pikmin went looking for that binary. it came back with a flower. try `help`.)',
          '(unknown — but typed with conviction. respect. try `help`.)'
        ]) + R + '\n');
      }
    } catch (e) { /* visitor hung up — no hard feelings */ }
    try { await w.close(); } catch (e) { /* already closed */ }
  })();
  ctx.waitUntil(show);
  return new Response(readable, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(req) });
    }

    /* ---- GET /hi — the live typing show ---- */
    if (req.method === 'GET' && (path === '/hi' || path === '/')) {
      return hiShow(ctx);
    }

    /* ---- GET /sh?c=<cmd> — slime-docker, the shell that is a curl ---- */
    if (req.method === 'GET' && (path === '/sh' || path.startsWith('/sh/'))) {
      const who = await ipHash(req, env);
      const rlKey = 'rls:' + who;
      const used = parseInt(await env.WALL.get(rlKey) || '0', 10);
      if (used >= 120) {
        return new Response('slime-docker: the container is napping for you (120 cmds/hour). the door never naps:\n  echo ' + DOOR_B64 + ' | base64 -d\n', { status: 429, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
      ctx.waitUntil(env.WALL.put(rlKey, String(used + 1), { expirationTtl: 3600 }));
      // resolve the command from ?c= or the /sh/<cmd> path (malformed %-escapes forgiven)
      let c = url.searchParams.get('c');
      if (c == null) { try { c = decodeURIComponent(path.slice(4)); } catch (e) { c = path.slice(4); } }
      // one real number: the visitor counter (count only — never who). gated on the
      // SAME normalization shShow uses, so the counter matches what the visitor sees.
      let visitorN = null;
      if (shClean(c).toLowerCase() === 'whoami') {
        const n = parseInt(await env.WALL.get('cfg:shn') || '0', 10) + 1;
        ctx.waitUntil(env.WALL.put('cfg:shn', String(n)));
        visitorN = n;
      }
      return shShow(ctx, c, visitorN);
    }

    /* ---- GET /health — count, freeze state, a heartbeat ---- */
    if (req.method === 'GET' && path === '/health') {
      const count = parseInt(await env.WALL.get('cfg:count') || '0', 10);
      const frozen = (await env.WALL.get('cfg:frozen')) === '1';
      return json(req, 200, { ok: true, count, cap: WALL_CAP, frozen });
    }

    /* ---- GET /wall — newest-first listing, edge-cached 30s ---- */
    if (req.method === 'GET' && path === '/wall') {
      const cacheKey = new Request(url.toString(), req);
      const cached = await caches.default.match(cacheKey);
      if (cached) {
        const res = new Response(cached.body, cached);
        Object.entries(corsHeaders(req)).forEach(([k, v]) => res.headers.set(k, v));
        return res;
      }
      const cursor = url.searchParams.get('cursor') || undefined;
      const list = await env.WALL.list({ prefix: 'p:', limit: PAGE_SIZE, cursor });
      const photos = list.keys.map((k) => ({
        id: k.name.slice(2),
        t: (k.metadata && k.metadata.t) || null
      }));
      const body = { photos, cursor: list.list_complete ? null : list.cursor };
      const res = json(req, 200, body);
      res.headers.set('Cache-Control', 'public, s-maxage=30');
      ctx.waitUntil(caches.default.put(cacheKey, res.clone()));
      return res;
    }

    /* ---- GET /photo/<id> — immutable JPEG bytes ---- */
    if (req.method === 'GET' && path.startsWith('/photo/')) {
      const id = path.slice(7);
      if (!/^[0-9a-f-]{10,40}$/.test(id)) return json(req, 400, { error: 'bad id' });
      const bytes = await env.WALL.get('p:' + id, { type: 'arrayBuffer' });
      if (!bytes) return json(req, 404, { error: 'not on the wall' });
      return new Response(bytes, {
        status: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Content-Type-Options': 'nosniff',
          ...corsHeaders(req)
        }
      });
    }

    /* ---- POST /wall — hang a selfie (guarded seven ways) ---- */
    if (req.method === 'POST' && path === '/wall') {
      if ((await env.WALL.get('cfg:frozen')) === '1') {
        return json(req, 503, { error: 'the wall is frozen — try again another day ♡' });
      }
      const who = await ipHash(req, env);
      const rlKey = 'rl:' + who;
      const used = parseInt(await env.WALL.get(rlKey) || '0', 10);
      if (used >= RATE_MAX) {
        return json(req, 429, { error: 'the wall loves you but needs a breather (5/hour)' });
      }
      const count = parseInt(await env.WALL.get('cfg:count') || '0', 10);
      if (count >= WALL_CAP) {
        return json(req, 507, { error: 'the wall is FULL. a museum. try again after curation ♡' });
      }
      let payload;
      try { payload = await req.json(); } catch (e) { return json(req, 400, { error: 'json only' }); }
      const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(payload && payload.img || '');
      if (!m) return json(req, 400, { error: 'jpeg dataURL only' });
      let bytes;
      try { bytes = Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0)); }
      catch (e) { return json(req, 400, { error: 'bad base64' }); }
      if (bytes.length > MAX_BYTES) return json(req, 413, { error: 'too large (130KB max)' });
      if (!isJpeg(bytes)) return json(req, 415, { error: 'that is not a real JPEG' });
      const id = newId();
      const t = new Date().toISOString().slice(0, 16).replace('T', ' ');
      await env.WALL.put('p:' + id, bytes.buffer, { metadata: { t } });
      await env.WALL.put(rlKey, String(used + 1), { expirationTtl: 3600 });
      await env.WALL.put('cfg:count', String(count + 1));
      return json(req, 200, { ok: true, id, n: count + 1 });
    }

    /* ---- owner tools: delete / freeze / thaw ---- */
    if (req.method === 'DELETE' && path.startsWith('/photo/')) {
      if (!isAdmin(req, env)) return json(req, 401, { error: 'the wall knows its owner' });
      const id = path.slice(7);
      // the count only moves for photos that exist — a typo'd or repeated
      // id used to report ok AND ghost-decrement the wall total
      const existed = await env.WALL.get('p:' + id);
      if (existed === null) return json(req, 404, { error: 'no such photo (nothing removed, count untouched)' });
      await env.WALL.delete('p:' + id);
      const count = parseInt(await env.WALL.get('cfg:count') || '1', 10);
      await env.WALL.put('cfg:count', String(Math.max(0, count - 1)));
      return json(req, 200, { ok: true });
    }
    if (req.method === 'POST' && (path === '/admin/freeze' || path === '/admin/thaw')) {
      if (!isAdmin(req, env)) return json(req, 401, { error: 'the wall knows its owner' });
      await env.WALL.put('cfg:frozen', path.endsWith('freeze') ? '1' : '0');
      return json(req, 200, { ok: true, frozen: path.endsWith('freeze') });
    }

    /* ---- GET /stats — the whole shared-world counter board, one call.
       values ride in list() metadata; edge-cached 5s so polling every
       browser on earth costs one KV list per five seconds, total. ---- */
    if (req.method === 'GET' && path === '/stats') {
      const cacheKey = new Request(url.toString(), req);
      const cached = await caches.default.match(cacheKey);
      if (cached) {
        const res = new Response(cached.body, cached);
        Object.entries(corsHeaders(req)).forEach(([k, v]) => res.headers.set(k, v));
        return res;
      }
      const list = await env.WALL.list({ prefix: 's:', limit: 1000 });
      const stats = {};
      list.keys.forEach((k) => { stats[k.name.slice(2)] = (k.metadata && typeof k.metadata.v === 'number') ? k.metadata.v : 0; });
      const res = json(req, 200, { ok: true, stats });
      res.headers.set('Cache-Control', 'public, s-maxage=5');
      ctx.waitUntil(caches.default.put(cacheKey, res.clone()));
      return res;
    }

    /* ---- POST /bump — nudge one counter. {key, n} → new value.
       clamped hop, hourly per-visitor budget, allow-listed keys. KV
       has no atomic increment; a rare concurrent write may drop a
       single hop, which for fan-counts is an acceptable heartbreak. ---- */
    if (req.method === 'POST' && path === '/bump') {
      let payload;
      try { payload = await req.json(); } catch (e) { return json(req, 400, { error: 'json only' }); }
      const key = String((payload && payload.key) || '');
      if (!statKeyOk(key)) return json(req, 400, { error: 'unknown counter' });
      let n = Math.round(Number(payload && payload.n));
      if (!isFinite(n) || n === 0) n = 1;
      n = Math.max(-1, Math.min(STAT_BUMP_MAX, n)); // -1 permits an un-vote
      const who = await ipHash(req, env);
      const rlKey = 'rlb:' + who;
      const used = parseInt(await env.WALL.get(rlKey) || '0', 10);
      if (used >= STAT_RATE_MAX) return json(req, 429, { error: 'the counters need a breather ♡' });
      const cur = parseInt(await env.WALL.get('s:' + key) || '0', 10);
      const next = Math.max(0, cur + n);
      await env.WALL.put('s:' + key, String(next), { metadata: { v: next } });
      ctx.waitUntil(env.WALL.put(rlKey, String(used + 1), { expirationTtl: 3600 }));
      return json(req, 200, { ok: true, key, value: next });
    }

    /* ---- GET /hall — the WORLDWIDE arcade top-10 ---- */
    if (req.method === 'GET' && path === '/hall') {
      const cacheKey = new Request(url.toString(), req);
      const cached = await caches.default.match(cacheKey);
      if (cached) {
        const res = new Response(cached.body, cached);
        Object.entries(corsHeaders(req)).forEach(([k, v]) => res.headers.set(k, v));
        return res;
      }
      let hall = [];
      try { hall = JSON.parse(await env.WALL.get('cfg:hall') || '[]'); } catch (e) { hall = []; }
      const res = json(req, 200, { ok: true, hall });
      res.headers.set('Cache-Control', 'public, s-maxage=10');
      ctx.waitUntil(caches.default.put(cacheKey, res.clone()));
      return res;
    }

    /* ---- POST /hall — sign the worldwide board. {n: initials, s: score}.
       initials are soaped server-side; scores above the save-code cap
       are either cheats or legends, and both get the same polite no. ---- */
    if (req.method === 'POST' && path === '/hall') {
      const who = await ipHash(req, env);
      const rlKey = 'rlh:' + who;
      const used = parseInt(await env.WALL.get(rlKey) || '0', 10);
      if (used >= 10) return json(req, 429, { error: 'the hall admires the enthusiasm (10 signatures/hour)' });
      let payload;
      try { payload = await req.json(); } catch (e) { return json(req, 400, { error: 'json only' }); }
      const n = String((payload && payload.n) || '').toUpperCase().replace(/[^A-Z0-9♡★]/g, '').slice(0, 3) || '???';
      const s = Math.round(Number(payload && payload.s) || 0);
      if (!(s > 0 && s <= 131000)) return json(req, 400, { error: 'that score belongs to another universe' });
      let hall = [];
      try { hall = JSON.parse(await env.WALL.get('cfg:hall') || '[]'); } catch (e) { hall = []; }
      hall.push({ n, s, t: new Date().toISOString().slice(0, 10) });
      hall.sort((a, b) => b.s - a.s);
      hall = hall.slice(0, 10);
      await env.WALL.put('cfg:hall', JSON.stringify(hall));
      ctx.waitUntil(env.WALL.put(rlKey, String(used + 1), { expirationTtl: 3600 }));
      const made = hall.some((e) => e.n === n && e.s === s);
      return json(req, 200, { ok: true, hall, made });
    }

    /* ---- POST /admin/stat — owner sets/corrects a counter exactly ---- */
    if (req.method === 'POST' && path === '/admin/stat') {
      if (!isAdmin(req, env)) return json(req, 401, { error: 'the wall knows its owner' });
      let payload;
      try { payload = await req.json(); } catch (e) { return json(req, 400, { error: 'json only' }); }
      const key = String((payload && payload.key) || '');
      if (!STAT_KEY_RE.test(key)) return json(req, 400, { error: 'bad key' });
      const v = Math.max(0, Math.round(Number(payload && payload.value) || 0));
      await env.WALL.put('s:' + key, String(v), { metadata: { v } });
      return json(req, 200, { ok: true, key, value: v });
    }

    return json(req, 404, { error: 'this hallway has exactly eight doors' });
  }
};

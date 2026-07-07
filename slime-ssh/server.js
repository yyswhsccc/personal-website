/* ============================================================
   🐳 SLIME-SSH — slime-docker, promoted from cosplay to REAL.
   ============================================================
   the old design: visitors pasted a `slime()` curl wrapper and
   every command was a one-shot GET to the Worker's /sh route.
   THIS is the same container as an actual SSH server: one
   `ssh` command, the /hi typing show plays itself, and the
   visitor lands directly at a live prompt INSIDE the container.
   no wrapper. no prefix. just type.

   · every command response below is ported BYTE-FOR-BYTE from
     wall-worker/src/index.js shShow() — do not "improve" the
     wording here without changing it there too.
   · the fake shell never spawns a real process. every response
     is a string. there is no filesystem to escape into beyond
     this node process (which runs in its own docker container,
     as an unprivileged user, with no shell installed).
   · input is sanitized with the same shClean() codepoint filter
     (C0/DEL/C1 incl. U+009B, bidi overrides) before it is ever
     echoed into anything.
   · abuse posture: any-username/no-password auth (that is the
     point), but per-IP + global connection caps, 120 commands
     per session (the same napping number), 5 min idle timeout,
     30 min hard session cap, input line length cap. */
'use strict';

const fs = require('fs');
const path = require('path');
const { Server } = require('ssh2');
const { StringDecoder } = require('string_decoder');

/* ---------- config ---------- */
const PORT = parseInt(process.env.PORT || '2222', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const HOST_KEY = process.env.HOST_KEY || path.join(DATA_DIR, 'host_ed25519');
const MAX_CONNS = 50;          // whole meadow
const MAX_CONNS_PER_IP = 6;    // one household of curious people
const MAX_CMDS = 120;          // same napping number as the Worker
const IDLE_MS = 5 * 60 * 1000;
const SESSION_MS = 30 * 60 * 1000;

/* ---------- shared constants (identical to the Worker) ---------- */
const G = '\x1b[92m', P = '\x1b[95m', C = '\x1b[96m', D = '\x1b[2m', B = '\x1b[1m', RD = '\x1b[91m', Y = '\x1b[93m', R = '\x1b[0m';
const DOOR_B64 = 'aHR0cHM6Ly95eXN3aHNjY2MuZ2l0aHViLmlvL3BlcnNvbmFsLXdlYnNpdGUvI3Rlcm1pbmFsCg==';
const DOOR_URL = 'https://yyswhsccc.github.io/personal-website/#terminal';
const DOOR_LINK = '\x1b]8;;' + DOOR_URL + '\x07' + DOOR_URL + '\x1b]8;;\x07'; // OSC 8: cmd-clickable where supported, plain text elsewhere

/* strip every terminal-hijack codepoint before echoing user text back:
   C0 + DEL, C1 (incl. U+009B single-byte CSI), and bidi overrides/isolates/marks.
   (ported verbatim from the Worker — same threat, same filter.) */
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

/* ---------- the one real number: the visitor counter ----------
   count only — never who. persisted so it survives restarts. */
const STATE_FILE = path.join(DATA_DIR, 'state.json');
function bumpVisitors() {
  let n = 0;
  try { n = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')).n || 0; } catch (e) { /* first visitor ever */ }
  n += 1;
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(STATE_FILE, JSON.stringify({ n })); } catch (e) { /* counting is best-effort */ }
  return n;
}

const ABORT = Symbol('abort'); // thrown to unwind a command when the visitor ^C's or hangs up

/* ============================================================
   respond(cmd) — the container's brain.
   every branch below is the Worker's shShow(), byte-for-byte,
   minus the `prompt +` prefixes (the prompt is REAL now — the
   visitor's typed line is already on screen above the answer).
   io = { out, t, sleep, pick, isTTY, visitorBump, requestExit } */
async function respond(rawCmd, io) {
  const { out, t, sleep, pick } = io;
  const cmd = shClean(rawCmd).slice(0, 200);
  const lower = cmd.toLowerCase();
  const head = lower.split(' ')[0] || '';

  /* ---------- extreme / hostile inputs get the best seats ---------- */
  if (/^:\(\)\s*{.*};?\s*:/.test(cmd) || /:\|:&/.test(cmd)) {
    await out(RD + 'FORK BOMB DETECTED' + R + '\n');
    await sleep(500);
    for (let i = 0; i < 5; i++) { await out(D + '  fork(' + (2 ** i) + ')… ' + R + G + 'intercepted by pikmin firefighter #' + (i + 1) + ' 🧯' + R + '\n'); await sleep(260); }
    await out('\n' + P + 'all forks adopted and given tiny hats. 0 processes harmed.' + R + '\n');
    await out(D + '(this container forks only lettuce.)' + R + '\n');
  } else if (/rm\s+(-\w+\s+)*-?rf?\s+\/(\s|$|--)/.test(lower) || /--no-preserve-root/.test(lower)) {
    await out('ok. deleting everything. you asked.\n');
    await sleep(600);
    const items = ['/meadow/flowers (2,481)', '/slime/feelings (all)', '/pikmin/* (72 souls)', '/door/locks (3)', '/you/patience (what is left)'];
    for (const it of items) { await out(RD + '  rm: ' + it + R); await sleep(420); await out(G + '  …refused ♡' + R + '\n'); }
    await sleep(400);
    await out('\n' + B + 'deletion complete: 0 files removed.' + R + '\n');
    await out(D + 'this container is mounted read-only. like a memory. visit the real one:' + R + '\n');
    await out('  ' + C + 'echo ' + DOOR_B64 + ' | base64 -d' + R + '\n');
  } else if (/('|").*\bor\b.*=.*\1|drop\s+table|\b1\s*=\s*1\b/.test(lower)) {
    await out('hi bobby tables ♡\n');
    await out(D + 'this shell has no database. it has feelings, and they are un-injectable.' + R + '\n');
    await out(G + "0 rows affected. 1 slime amused." + R + '\n');
  } else if (/<\s*script|javascript:|onerror=/.test(lower)) {
    await out('a <script> tag. in a TERMINAL.\n');
    await out(D + 'that is like bringing a snorkel to the desert. respect for trying.' + R + '\n');
  } else if (/\.\.\//.test(cmd)) {
    await out('cd ../../.. as far as you like —\n');
    await out(D + 'there is no “up” here. the container is the whole universe. (it is 12KB.)' + R + '\n');
  } else if (cmd.length > 160) {
    await out(RD + 'argument list too long' + R + '\n');
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
    await out(D + 'everywhere in this container is already here. saved you the walk ♡' + R + '\n');
  } else if (head === 'whoami') {
    await out('visitor #' + (io.visitorBump() || '?') + '\n' + D + '(the slime keeps count. only the count. privacy is a feature.)' + R + '\n');
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
      await out('correct password!! unfortunately:\n');
      await out(D + 'in this container, root is the slime. the slime pardons you. it thinks you are funny.' + R + '\n');
    } else {
      await out('permission granted ♡ ' + D + '(sudo here only grants confidence)' + R + '\n');
    }
  } else if (head === 'rm' || head === 'rmdir' || head === 'dd' || head === 'mkfs' || head === 'shred') {
    await out(RD + head + ': read-only file system' + R + '\n');
    await out(D + '(everything here is a memory. memories are append-only.)' + R + '\n');
  } else if (head === 'kill' || head === 'killall' || head === 'pkill') {
    await out(RD + 'kill: (1) — operation not permitted' + R + '\n' + D + 'you cannot kill init. init is the slime. the slime is love.' + R + '\n');
  } else if (head === 'vim' || head === 'vi' || head === 'nvim') {
    await out('entering vim.\n');
    await sleep(1400);
    await out(D + '…' + R + '\n');
    await sleep(1400);
    await out(D + ':q doesn\'t work in here either. lucky for you, this stream ends itself ♡' + R + '\n');
  } else if (head === 'emacs') {
    await out('M-x butterfly? no need — the meadow has a real one. it crosses the photo wall.\n');
  } else if (head === 'nano') {
    await out('nano: the only editor that lets you leave. too easy. denied ♡\n');
  } else if (head === 'git') {
    if (/push.*--force|push.*-f\b/.test(lower)) { await out(RD + 'remote: force push to friendship rejected' + R + '\n' + D + '(some branches are protected forever)' + R + '\n'); }
    else if (/status/.test(lower)) { await out('On branch ' + G + 'friendship' + R + '\nnothing to commit — all feelings staged ♡\n'); }
    else if (/log/.test(lower)) { await out(Y + 'a1b2c3d' + R + ' feat: met you\n' + Y + 'd4e5f6a' + R + ' fix: doubts (removed)\n' + Y + '0000000' + R + ' initial commit: one slime, much hope\n'); }
    else if (/blame/.test(lower)) { await out(D + 'git blame: nobody. this is a no-blame container.' + R + '\n'); }
    else { await out('git: try status · log · blame · push --force ' + D + '(you know you want to)' + R + '\n'); }
  } else if (head === 'docker' || head === 'podman' || head === 'kubectl') {
    await out('you are INSIDE the container, asking for containers.\n');
    await out(D + 'it is docker all the way down. at the bottom: a slime, holding everything up.' + R + '\n');
  } else if (head === 'ssh' || head === 'telnet' || head === 'nc') {
    await out('this is already as deep as the network goes.\n' + D + '(one more hop and you would be inside the slime. nobody returns from there. too cozy.)' + R + '\n');
  } else if (head === 'curl' || head === 'wget') {
    await out('curl inside curl.\n' + D + 'the pipes have formed a klein bottle. hydration achieved.' + R + '\n');
  } else if (head === 'ping') {
    for (let i = 1; i <= 3; i++) { await out('64 bytes from meadow: icmp_seq=' + i + ' ttl=∞ time=0.' + (i + 2) + ' ms ' + P + '(emotionally)' + R + '\n'); await sleep(420); }
    await out(D + '--- meadow ping statistics: 3 sent, 3 hugged, 0% lost ---' + R + '\n');
  } else if (head === 'python' || head === 'python3' || head === 'node' || head === 'ruby' || head === 'perl') {
    await out('>>> ' + C + 'import happiness' + R + '\n');
    await sleep(500);
    await out(RD + 'ImportError' + R + ': already built-in\n>>> ' + D + '(REPL closed. it had nothing left to teach.)' + R + '\n');
  } else if (head === 'make' || head === 'cargo' || head === 'gcc' || head === 'npm' || head === 'pip') {
    await out('installing…\n');
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
  } else if (head === 'open' || head === 'xdg-open' || head === 'start') {
    /* the door command from the typing show, typed INSIDE the container.
       a remote shell cannot reach the visitor's browser — that inability
       IS the security promise, so we say so, and hand over the door
       pre-decoded (OSC 8 hyperlink where the terminal supports it). */
    if (cmd.indexOf(DOOR_B64.slice(0, 20)) !== -1 || lower.indexOf('yyswhsccc') !== -1 || lower.indexOf('base64') !== -1) {
      await out('reaching for your browser… ');
      await sleep(700);
      await out(RD + 'wrong side of the wire.' + R + '\n');
      await out(D + '(nothing in here can touch your machine. that is the whole promise.)' + R + '\n');
      await out('so here is the door, pre-decoded — cmd-click it, or paste it anywhere:\n\n');
      await out('  ' + C + DOOR_LINK + R + '\n\n');
      await out(D + '(open it in a browser. survive the locks. tell the slime I typed for you.)' + R + '\n');
    } else {
      await out('open: this container has no screen. it has a meadow.\n');
      await out(D + '(URLs open on YOUR side of the wire — cmd-click or copy them out.)' + R + '\n');
    }
  } else if (head === 'echo') {
    const msg = cmd.split(' ').slice(1).join(' ');
    if (msg.indexOf(DOOR_B64.slice(0, 20)) !== -1) { await out(DOOR_URL + '\n' + D + '(decoded it for you. now GO. everyone is waiting ♡)' + R + '\n'); }
    else { await out((msg || '') + ' ♡\n' + D + '(everything echoed here comes back slightly warmer)' + R + '\n'); }
  } else if (head === 'base64') {
    if (cmd.indexOf(DOOR_B64.slice(0, 20)) !== -1) { await out(DOOR_URL + '\n' + D + '(decoded it for you. now GO. everyone is waiting ♡)' + R + '\n'); }
    else { await out('base64: this container only knows ONE string worth decoding. it is in `env`.\n'); }
  } else if (head === 'flag' || head === 'ctf') {
    await out(P + 'flag{cur1_c0splay1ng_as_a_sh3ll}' + R + '\n' + D + 'the on-site flag (🚩 ctfslime) waits behind the door. different flag. cuter.' + R + '\n');
  } else if (head === 'pikmin' || head === 'pik' || head === 'cards') {
    await out('the card dealer lives one URL over:\n');
    await out('  ' + C + 'curl -sL "https://yyswhsccc.github.io/personal-website/pik/$((RANDOM % 5))"' + R + '\n');
  } else if (head === 'door' || head === 'exit' || head === 'logout' || head === 'quit' || head === 'q') {
    await out((head === 'door' ? 'yes!! THE door:' : 'you were never locked in — only welcomed. the door:') + '\n');
    await out('  ' + C + 'echo ' + DOOR_B64 + ' | base64 -d' + R + '\n');
    await out(D + '(open it in a browser. survive the locks. tell the slime I typed for you.)' + R + '\n');
    if (head !== 'door') io.requestExit();
  } else if (head === 'slime') {
    await out('slime inside slime. recursion base case reached: it is slimes all the way down, and they all say hi ♡\n');
  } else if (head === 'reboot' || head === 'shutdown' || head === 'halt' || head === 'poweroff') {
    await out('broadcast message from slime (pts/♡):\n');
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
}

/* ============================================================
   intro(io) — the /hi typing show, played on connect.
   ported from hiShow() with ONE change: the after-credits scene
   no longer teaches the curl wrapper — the visitor is already
   inside. pressing ⏎ (or ^C) fast-forwards the rest. */
async function intro(io) {
  const { out, t, sleep, bs } = io;
  await out(P + '♡ tty attached — yongshanOS switchboard' + R + '\n');
  await out(D + '  (this is not a print-out. someone is typing. watch. ⏎ skips.)' + R + '\n\n');
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
  await out(D + '  …wait. you deserve the ceremony. plaintext would insult you.' + R);
  await sleep(700);
  await bs(120, 9); // the whole line vanishes, fast and slightly panicked (overshoot is harmless at col 0)
  await t('right. the OFFICIAL tour guide, keep-able and copy-pasteable:\n', 38);
  await sleep(300);
  // the tutorial proper — printed crisply so it survives in the scrollback
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
  await out(D + '(everything here only prints. nothing executes on your machine. ever.)' + R + '\n');
  await out(P + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + R + '\n\n');
  await sleep(600);
  // the after-credits scene — rewritten for the real container:
  await t(B + 'wait. one more thing. look down.' + R + '\n', 30);
  await sleep(400);
  await t('you are already INSIDE the container. it assembled itself around you\n', 44);
  await t('while you watched. no wrapper. no prefix. just type. try:\n', 44);
  await out('  ' + G + 'ls' + R + '        ' + G + 'whoami' + R + '      ' + G + 'top' + R + '\n');
  await out('  ' + G + 'vim' + R + '       ' + G + 'sudo rm -rf /' + R + '   ' + D + '← especially this one' + R + '\n');
  await out('  ' + G + 'help' + R + '      ' + G + 'exit' + R + '        ' + D + '(it has opinions)' + R + '\n\n');
  await sleep(500);
  await out(P + '— yongshan ♡ ' + D + '(the slime says hi too. it cannot type. it tried.)' + R + '\n\n');
}

/* ============================================================
   per-session plumbing */
function makeIO(sess) {
  const out = async (s) => {
    if (sess.closed) throw ABORT;
    if (sess.abortRun && !sess.inIntro) throw ABORT;
    sess.stream.write(sess.hasPty ? s.replace(/\n/g, '\r\n') : s);
  };
  const sleep = async (ms) => {
    if (sess.skip) return;
    await new Promise((r) => { const to = setTimeout(r, ms); sess.timers.add(to); });
    if (sess.closed || (sess.abortRun && !sess.inIntro)) throw ABORT;
  };
  const t = async (s, cps) => { // human typing: uneven, alive
    const base = 1000 / (cps || 26);
    for (const ch of s) { await out(ch); await sleep(base * (0.5 + Math.random())); }
  };
  const bs = async (n, ms) => { for (let i = 0; i < n; i++) { await out('\b \b'); await sleep(ms || 24); } };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  return {
    out, sleep, t, bs, pick,
    isTTY: () => sess.hasPty,
    visitorBump: bumpVisitors,
    requestExit: () => { sess.wantExit = true; }
  };
}

const PROMPT = D + 'slime-docker' + R + P + ' ♡ ' + R; // the Worker's response prefix, promoted to a REAL prompt

function endSession(sess, msg) {
  if (sess.closed) return;
  sess.closed = true;
  for (const to of sess.timers) clearTimeout(to);
  try { if (msg) sess.stream.write(sess.hasPty ? msg.replace(/\n/g, '\r\n') : msg); } catch (e) { /* gone */ }
  try { sess.stream.end(); } catch (e) { /* gone */ }
  setTimeout(() => { try { sess.client.end(); } catch (e) { /* gone */ } }, 250);
}

async function interactive(sess) {
  const io = makeIO(sess);
  sess.inIntro = true;
  try { await intro(io); } catch (e) { if (e !== ABORT) throw e; }
  sess.inIntro = false;
  sess.skip = false;
  if (sess.closed) return;

  const decoder = new StringDecoder('utf8');
  let buf = '';
  let esc = 0; // 0 none · 1 got ESC · 2 in CSI/OSC

  const showPrompt = () => { if (!sess.closed) sess.stream.write(PROMPT); };

  const runLine = async (line) => {
    sess.running = true;
    sess.abortRun = false;
    try {
      sess.cmdCount += 1;
      if (sess.cmdCount > MAX_CMDS) {
        endSession(sess, 'slime-docker: the container is napping for you (120 cmds/hour). the door never naps:\n  echo ' + DOOR_B64 + ' | base64 -d\n');
        return;
      }
      await respond(line, io);
    } catch (e) { if (e !== ABORT) console.error('respond error:', e); }
    sess.running = false;
    if (sess.wantExit) { endSession(sess, P + 'Connection to the meadow closed. it stays open the other way ♡' + R + '\n'); return; }
    if (!sess.closed) showPrompt();
  };

  showPrompt();

  sess.stream.on('data', (chunk) => {
    if (sess.closed) return;
    sess.lastInput = Date.now();
    const text = decoder.write(chunk);
    for (const ch of text) {
      /* swallow escape sequences (arrows, F-keys, bracketed-paste markers) */
      if (esc === 1) { esc = (ch === '[' || ch === ']') ? 2 : 0; continue; }
      if (esc === 2) { if ((ch >= '@' && ch <= '~') || ch === '\x07') esc = 0; continue; }
      if (ch === '\x1b') { esc = 1; continue; }

      if (sess.running) { // a command is streaming — only ^C matters
        if (ch === '\x03') sess.abortRun = true;
        continue;
      }
      if (ch === '\x03') { // ^C at the prompt: fresh line, like a real shell
        sess.stream.write('^C\r\n'); buf = ''; showPrompt(); continue;
      }
      if (ch === '\x04') { // ^D on empty line = exit
        if (!buf) { sess.stream.write('\r\n'); runLine('exit'); }
        continue;
      }
      if (ch === '\r' || ch === '\n') {
        sess.stream.write('\r\n');
        const line = buf; buf = '';
        if (!line.trim()) { showPrompt(); continue; }
        runLine(line);
        continue;
      }
      if (ch === '\x7f' || ch === '\b') {
        if (buf) { buf = buf.slice(0, -1); sess.stream.write('\b \b'); }
        continue;
      }
      if (ch === '\t') continue; // no completions. the container is small.
      if (ch < ' ') continue;    // other control chars: ignored
      if (buf.length >= 1000) continue; // line cap — the slime fell asleep at 160 anyway
      buf += ch;
      sess.stream.write(ch);
    }
  });
}

/* ============================================================
   server */
function makeSession(client, stream, hasPty) {
  return {
    client, stream, hasPty,
    closed: false, running: false, abortRun: false,
    skip: false, inIntro: false, wantExit: false,
    cmdCount: 0, lastInput: Date.now(), timers: new Set()
  };
}

function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(HOST_KEY)) {
    console.error('host key missing at ' + HOST_KEY + ' — generate one with:');
    console.error('  ssh-keygen -t ed25519 -f ' + HOST_KEY + ' -N ""');
    process.exit(1);
  }

  const conns = new Map(); // ip → count
  let total = 0;

  const server = new Server({ hostKeys: [fs.readFileSync(HOST_KEY)] }, (client, info) => {
    const ip = (info && info.ip) || 'unknown';
    if (total >= MAX_CONNS || (conns.get(ip) || 0) >= MAX_CONNS_PER_IP) {
      client.end(); return;
    }
    total += 1;
    conns.set(ip, (conns.get(ip) || 0) + 1);
    const release = () => { total = Math.max(0, total - 1); const n = (conns.get(ip) || 1) - 1; if (n <= 0) conns.delete(ip); else conns.set(ip, n); };
    let released = false;
    const releaseOnce = () => { if (!released) { released = true; release(); } };
    client.on('close', releaseOnce);
    client.on('error', () => { /* resets happen. no hard feelings. */ });

    // any name, any auth, zero friction — the whole container is the welcome mat
    client.on('authentication', (ctx) => ctx.accept());

    client.on('ready', () => {
      client.on('session', (accept) => {
        const session = accept();
        let ptyInfo = null;
        session.on('pty', (a, r, info) => { ptyInfo = info; if (a) a(); });
        session.on('window-change', (a) => { if (a) a(); });
        session.on('subsystem', (a, r) => { if (r) r(); }); // no sftp. the container has 6 files and they are feelings.
        session.on('exec', (a, r, execInfo) => {
          // one-shot: ssh -p 2222 host 'ls' — answer and hang up, like /sh did
          const stream = a();
          const sess = makeSession(client, stream, false);
          const io = makeIO(sess);
          (async () => {
            try { await respond(execInfo.command, io); } catch (e) { /* hung up */ }
            try { stream.exit(0); } catch (e) { /* gone */ }
            endSession(sess, '');
          })();
        });
        session.on('shell', (a) => {
          const stream = a();
          const sess = makeSession(client, stream, !!ptyInfo);
          // intro skip: any ⏎ / ^C during the show fast-forwards it
          const skipWatch = (chunk) => { if (sess.inIntro && /[\r\n\x03]/.test(chunk.toString('latin1'))) sess.skip = true; };
          stream.on('data', skipWatch);
          stream.on('close', () => { sess.closed = true; for (const to of sess.timers) clearTimeout(to); });
          client.on('close', () => { sess.closed = true; for (const to of sess.timers) clearTimeout(to); });
          // idle + hard session caps
          const idleCheck = setInterval(() => {
            if (sess.closed) { clearInterval(idleCheck); return; }
            if (Date.now() - sess.lastInput > IDLE_MS) {
              clearInterval(idleCheck);
              endSession(sess, '\n' + D + '(the slime noticed you went quiet. it tucked the session in. ssh back anytime ♡)' + R + '\n');
            }
          }, 15000);
          const hardCap = setTimeout(() => {
            endSession(sess, '\n' + D + '(30 minutes! the container needs to stretch. it was lovely. come back ♡)' + R + '\n');
          }, SESSION_MS);
          client.on('close', () => { clearInterval(idleCheck); clearTimeout(hardCap); });
          interactive(sess).catch((e) => { if (e !== ABORT) console.error('session error:', e); });
        });
      });
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log('🐳 slime-ssh listening on :' + PORT + ' — the container is real now');
  });
}

main();

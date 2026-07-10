/* test driver: opens a REAL ssh session against the server, skips the
   intro, fires the command battery, and asserts the ported responses.
   usage: node test/drive.js [port] */
'use strict';
const { Client } = require('ssh2');

const PORT = parseInt(process.argv[2] || '2222', 10);
const HOST = '127.0.0.1';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function shell(cmds) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let all = '';
    conn.on('ready', () => {
      conn.shell({ term: 'xterm-256color', rows: 40, cols: 120 }, async (err, stream) => {
        if (err) return reject(err);
        stream.on('data', (d) => { all += d.toString('utf8'); });
        stream.on('close', () => { conn.end(); resolve(all); });
        await wait(400);
        stream.write('\r');            // skip the intro
        await wait(2500);              // let the fast-forwarded show flush
        for (const [cmd, ms] of cmds) {
          stream.write(cmd + '\r');
          await wait(ms);
        }
        stream.write('exit\r');
        await wait(1200);
        try { stream.end(); } catch (e) {}
        setTimeout(() => { try { conn.end(); } catch (e) {} resolve(all); }, 1500);
      });
    });
    conn.on('error', reject);
    conn.connect({ host: HOST, port: PORT, username: 'visitor', password: 'anything' });
  });
}

function exec(cmd) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let all = '';
    conn.on('ready', () => {
      conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        stream.on('data', (d) => { all += d.toString('utf8'); });
        stream.on('close', () => { conn.end(); resolve(all); });
      });
    });
    conn.on('error', reject);
    conn.connect({ host: HOST, port: PORT, username: 'anyone' });
  });
}

(async () => {
  console.log('— interactive session battery —');
  const t = await shell([
    ['ls', 800],
    ['whoami', 800],
    ['cat secrets', 1500],
    ['sudo rm -rf /', 3500],
    ['sudo shutdown -h now', 2500],
    [':(){ :|:& };:', 2500],
    ["' OR 1=1 --", 800],
    ['<script>alert(1)</script>', 800],
    ['top', 3000],
    ['vim', 3800],
    ['echo aHR0cHM6Ly95eXN3aHNjY2MuZ2l0aHViLmlvL3BlcnNvbmFsLXdlYnNpdGUvI3Rlcm1pbmFsCg== | base64 -d', 900],
    ['open "$(echo aHR0cHM6Ly95eXN3aHNjY2MuZ2l0aHViLmlvL3BlcnNvbmFsLXdlYnNpdGUvI3Rlcm1pbmFsCg== | base64 -d)"', 2200],
    ['macOS shortcut: open "$(echo aHR0cHM6Ly95eXN3aHNjY2MuZ2l0aHViLmlvL3BlcnNvbmFsLXdlYnNpdGUvI3Rlcm1pbmFsCg== | base64 -d)"', 2200],
    ['neofetch', 800],
    ['git push --force', 800],
    ['docker ps', 800],
    ['npm install', 1500],
    ['frobnicate --hard', 800]
  ]);

  const checks = [
    ['intro played',        '♡ tty attached — yongshanOS switchboard'],
    ['intro afterscene',    'you are already INSIDE the container'],
    ['prompt shown',        'slime-docker'],
    ['ls',                  'total 72 (they are pikmin)'],
    ['whoami counter',      /visitor #\d+/],
    ['cat secrets flag',    'flag{cur1_c0splay1ng_as_a_sh3ll}'],
    ['sudo rm -rf / theater', 'deletion complete: 0 files removed.'],
    ['sudo shutdown password', '[sudo] password for visitor:'],
    ['sudo shutdown pardon', 'the slime pardons you'],
    ['fork bomb',           'intercepted by pikmin firefighter'],
    ['sql injection',       'hi bobby tables ♡'],
    ['script tag',          'bringing a snorkel to the desert'],
    ['top refresh',         'slime-top — load average'],
    ['vim trap',            ':q doesn\'t work in here either'],
    ['echo decodes door',   'https://yyswhsccc.github.io/personal-website/#terminal'],
    ['open opens the door', 'click it'],
    ['open gives OSC8 clickable link', '\x1b]8;;https://yyswhsccc.github.io/personal-website/#terminal\x07'],
    ['neofetch',            'slimeOS 5.cute (chroot)'],
    ['git force rejected',  'force push to friendship rejected'],
    ['docker inception',    'docker all the way down'],
    ['npm friendship',      '+ friendship@1.0.0'],
    ['unknown command',     'command not found'],
    ['exit farewell',       'you were never locked in — only welcomed'],
  ];
  let fail = 0;
  for (const [name, pat] of checks) {
    const ok = pat instanceof RegExp ? pat.test(t) : t.includes(pat);
    console.log((ok ? '  ✓ ' : '  ✗ ') + name);
    if (!ok) fail++;
  }

  // the `macOS shortcut: open …` paste must NOT faceplant as a bad command —
  // the label is stripped and the line reaches the door like a bare `open`
  // note: the typed line is echoed back, so "shortcut:" appears as INPUT —
  // the only real failure symptom is the shell rejecting "macos" as a command
  const labelOk = !t.includes('macos: command not found');
  const doorHits = (t.match(/\x1b\]8;;https:\/\/yyswhsccc/g) || []).length;
  console.log((labelOk ? '  ✓ ' : '  ✗ ') + 'macOS-shortcut label stripped (no "command not found")');
  if (!labelOk) fail++;
  console.log((doorHits >= 3 ? '  ✓ ' : '  ✗ ') + 'clickable door served for echo + open + macOS-shortcut (' + doorHits + ' hits)');
  if (doorHits < 3) fail++;

  console.log('— exec (one-shot) battery —');
  const e1 = await exec('whoami');
  const e2 = await exec('ping');
  const execChecks = [
    ['exec whoami', /visitor #\d+/.test(e1)],
    ['exec ping hugged', e2.includes('3 sent, 3 hugged, 0% lost')]
  ];
  for (const [name, ok] of execChecks) { console.log((ok ? '  ✓ ' : '  ✗ ') + name); if (!ok) fail++; }

  if (fail) { console.log('\n' + fail + ' FAILED'); process.exit(1); }
  console.log('\nall green ♡');
  process.exit(0);
})().catch((e) => { console.error('driver error:', e); process.exit(2); });

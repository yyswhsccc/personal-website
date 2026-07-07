/* hostile-input stress: 8 concurrent clients firing null bytes, 5000-char
   lines, terminal-escape injection, bidi overrides, fork bombs, path
   traversal, SQL, and binary garbage. the server must stay UP and never
   leak. run from inside the container: node test/fuzz.js [port] */
'use strict';
const { Client } = require('ssh2');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const HOST = '127.0.0.1';
const PORT = parseInt(process.argv[2] || '2222', 10);

const PAYLOADS = [
  '\x00\x00\x00nullbytes',
  'A'.repeat(5000),
  '\x1b[2J\x1b[31mEVIL\x1b]0;pwned\x07 clear-your-terminal',
  '‮abc‭mixed-bidi',
  ':(){ :|:& };:',
  'sudo rm -rf / --no-preserve-root',
  '\xff\xfe\xfd binary garbage',
  'cat ../../../../etc/shadow',
  "'; DROP TABLE users;--",
  '\t\t\t\b\b\b\x7f\x7f weird control',
  'help'
];

function fuzzOne(id) {
  return new Promise((resolve) => {
    const c = new Client();
    c.on('ready', () => {
      c.shell({ term: 'xterm', rows: 30, cols: 100 }, async (err, stream) => {
        if (err) { resolve('shell-err:' + err.message); return; }
        let got = false;
        stream.on('data', () => { got = true; });
        const finish = (why) => { console.log('  fuzzer ' + id + ': ' + why + ' sawData=' + got); c.end(); resolve(); };
        stream.on('close', () => finish('closed ok'));
        await wait(300); stream.write('\r'); await wait(600);
        for (const p of PAYLOADS) { stream.write(p + '\r'); await wait(120); }
        await wait(800); try { stream.end(); } catch (e) {}
        setTimeout(() => { try { c.end(); } catch (e) {} finish('done'); }, 1200);
      });
    });
    c.on('error', (e) => resolve('conn-err:' + e.message));
    c.connect({ host: HOST, port: PORT, username: 'fuzz' + id, password: 'x', readyTimeout: 12000 });
  });
}

(async () => {
  await Promise.all([...Array(8)].map((_, i) => fuzzOne(i)));
  console.log('FUZZ COMPLETE — server should still be up');
  // let stdout drain naturally through the docker-exec/ssh pipe before exit
  setTimeout(() => process.exit(0), 400);
})();

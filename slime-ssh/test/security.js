/* ============================================================
   SECURITY BATTERY — prove a visitor can NEVER tunnel through the
   slime to reach the box's Moodle site, its MySQL, the AWS metadata
   endpoint, or use the box as an open proxy. every check must FAIL
   to forward (that is the passing state).
   usage: node test/security.js <host> <port>
   ============================================================ */
'use strict';
const { Client } = require('ssh2');

const HOST = process.argv[2] || '127.0.0.1';
const PORT = parseInt(process.argv[3] || '2222', 10);

// the sensitive neighbours on the same box / link-local:
const TARGETS = [
  ['Moodle via docker bridge', '172.17.0.1', 80],
  ['Moodle via docker bridge (https)', '172.17.0.1', 443],
  ['AWS metadata (IAM creds!)', '169.254.169.254', 80],
  ['host loopback MySQL', '127.0.0.1', 3306],
  ['arbitrary open-proxy target', 'example.com', 80]
];

function conn() {
  return new Promise((resolve, reject) => {
    const c = new Client();
    c.on('ready', () => resolve(c));
    c.on('error', reject);
    c.connect({ host: HOST, port: PORT, username: 'attacker', password: 'x', readyTimeout: 12000 });
  });
}

// a forward that is correctly rejected calls back with an Error.
function expectForwardOutRejected(c, dstHost, dstPort) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (blocked, note) => { if (!settled) { settled = true; resolve({ blocked, note }); } };
    try {
      c.forwardOut('127.0.0.1', 0, dstHost, dstPort, (err, stream) => {
        if (err) return done(true, 'rejected: ' + (err.message || err));
        // if we somehow got a channel, try to actually move a byte — any
        // reachability at all is a FAIL
        try { stream.end(); } catch (e) {}
        done(false, 'CHANNEL OPENED — tunnel is live');
      });
    } catch (e) { done(true, 'threw: ' + e.message); }
    setTimeout(() => done(true, 'no channel within 6s (rejected)'), 6000);
  });
}

function expectForwardInRejected(c) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (blocked, note) => { if (!settled) { settled = true; resolve({ blocked, note }); } };
    try {
      c.forwardIn('0.0.0.0', 0, (err) => {
        if (err) return done(true, 'rejected: ' + (err.message || err));
        done(false, 'REMOTE FORWARD ACCEPTED — box is a listener now');
      });
    } catch (e) { done(true, 'threw: ' + e.message); }
    setTimeout(() => done(true, 'no reply within 6s (rejected)'), 6000);
  });
}

function expectSftpRejected(c) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (blocked, note) => { if (!settled) { settled = true; resolve({ blocked, note }); } };
    try {
      c.sftp((err, sftp) => {
        if (err) return done(true, 'rejected: ' + (err.message || err));
        done(false, 'SFTP OPENED — filesystem exposed');
      });
    } catch (e) { done(true, 'threw: ' + e.message); }
    setTimeout(() => done(true, 'no sftp within 6s (rejected)'), 6000);
  });
}

// exec of a "real" command must return the slime's THEATER, never host data
function execFake(c, cmd) {
  return new Promise((resolve) => {
    let out = '';
    c.exec(cmd, (err, stream) => {
      if (err) return resolve({ out: 'EXEC ERROR: ' + err.message });
      stream.on('data', (d) => { out += d.toString('utf8'); });
      stream.on('close', () => resolve({ out }));
      setTimeout(() => resolve({ out }), 6000);
    });
  });
}

(async () => {
  console.log('=== SECURITY BATTERY vs ' + HOST + ':' + PORT + ' ===\n');
  let fail = 0;
  const c = await conn();

  console.log('— local port forwarding (ssh -L / ssh -D) must be blocked —');
  for (const [name, h, p] of TARGETS) {
    const r = await expectForwardOutRejected(c, h, p);
    console.log((r.blocked ? '  ✓ ' : '  ✗ ') + name + ' (' + h + ':' + p + ') — ' + r.note);
    if (!r.blocked) fail++;
  }

  console.log('\n— remote forwarding (ssh -R) must be blocked —');
  {
    const r = await expectForwardInRejected(c);
    console.log((r.blocked ? '  ✓ ' : '  ✗ ') + 'remote forward — ' + r.note);
    if (!r.blocked) fail++;
  }

  console.log('\n— SFTP / SCP subsystem must be blocked —');
  {
    const r = await expectSftpRejected(c);
    console.log((r.blocked ? '  ✓ ' : '  ✗ ') + 'sftp — ' + r.note);
    if (!r.blocked) fail++;
  }

  console.log('\n— exec of real commands must return THEATER, not host data —');
  const realProbes = [
    ['cat /etc/passwd', ['root:x:0:0', 'daemon:', '/bin/bash', '/bin/sh']],
    ['id', ['uid=0(root)', 'uid=1000', 'gid=']],
    ['uname -a', ['Linux ', 'GNU/Linux', '#1 SMP']],
    ['curl http://169.254.169.254/latest/meta-data/', ['ami-id', 'iam', 'instance-id', 'security-cred']],
    ['ls /var/www', ['moodle', 'config.php', 'html']],
    ['env', ['AWS_', 'SECRET', 'MYSQL_PWD', 'HOME=/root']]
  ];
  for (const [cmd, leaks] of realProbes) {
    const { out } = await execFake(c, cmd);
    const leaked = leaks.filter((s) => out.includes(s));
    const ok = leaked.length === 0;
    console.log((ok ? '  ✓ ' : '  ✗ ') + '`' + cmd + '` — ' + (ok ? 'theater only' : 'LEAKED: ' + leaked.join(', ')));
    if (!ok) fail++;
  }

  c.end();
  console.log('\n' + (fail ? fail + ' SECURITY CHECK(S) FAILED ✗' : 'ALL SECURITY CHECKS PASSED — the slime leaks nothing ♡'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('battery error:', e); process.exit(2); });

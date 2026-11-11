const http = require('http');

async function runBenchmark(title, path, totalRequests, concurrency) {
  console.log('\n========================================');
  console.log('Running: ' + title);
  console.log('Path: ' + path + ' | Total Requests: ' + totalRequests + ' | Concurrency: ' + concurrency);
  console.log('========================================');

  const agent = new http.Agent({ keepAlive: true, maxSockets: concurrency });
  const latencies = [];
  let completed = 0;
  let errors = 0;
  let started = 0;
  const startTime = Date.now();

  return new Promise((resolve) => {
    function executeNext() {
      if (completed >= totalRequests || started >= totalRequests) {
        return;
      }

      started++;
      const reqStart = Date.now();
      const req = http.get(
        {
          hostname: '127.0.0.1',
          port: 4000,
          path: path,
          agent: agent,
          headers: { 'Connection': 'keep-alive' }
        },
        (res) => {
          res.on('data', () => {});
          res.on('end', () => {
            const reqTime = Date.now() - reqStart;
            latencies.push(reqTime);
            completed++;
            if (completed % 100 === 0 || completed === totalRequests) {
              process.stdout.write(' Progress: ' + completed + '/' + totalRequests + ' (' + Math.round((completed/totalRequests)*100) + '%)\r');
            }
            if (completed >= totalRequests) {
              finish();
            } else {
              executeNext();
            }
          });
        }
      );

      req.on('error', (err) => {
        errors++;
        completed++;
        if (completed >= totalRequests) {
          finish();
        } else {
          executeNext();
        }
      });
    }

    function finish() {
      const durationSec = (Date.now() - startTime) / 1000;
      latencies.sort((a, b) => a - b);

      const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
      const p90 = latencies[Math.floor(latencies.length * 0.90)] || 0;
      const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
      const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
      const min = latencies[0] || 0;
      const max = latencies[latencies.length - 1] || 0;
      const avg = Number((latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1)).toFixed(2));
      const rps = Number((completed / (durationSec || 0.001)).toFixed(1));

      console.log('\nResults for ' + title + ':');
      console.log('  Requests Completed: ' + completed + ' (Errors: ' + errors + ')');
      console.log('  Throughput:         ' + rps + ' req/sec');
      console.log('  Total Duration:     ' + durationSec.toFixed(2) + 's');
      console.log('  Latency (Min):      ' + min + ' ms');
      console.log('  Latency (p50 Med):  ' + p50 + ' ms');
      console.log('  Latency (Average):  ' + avg + ' ms');
      console.log('  Latency (p95):      ' + p95 + ' ms');
      console.log('  Latency (p99):      ' + p99 + ' ms');
      console.log('  Latency (Max):      ' + max + ' ms');

      resolve({ title, path, rps, min, p50, avg, p95, p99, max, errors });
    }

    for (let i = 0; i < concurrency; i++) {
      executeNext();
    }
  });
}

async function main() {
  console.log('Warming cache...');
  await new Promise(r => http.get('http://127.0.0.1:4000/api/status', res => res.on('data', () => {}).on('end', r)));
  await new Promise(r => http.get('http://127.0.0.1:4000/api/arcanes', res => res.on('data', () => {}).on('end', r)));
  await new Promise(r => http.get('http://127.0.0.1:4000/api/rivens/lots/torid', res => res.on('data', () => {}).on('end', r)));
  await new Promise(r => http.get('http://127.0.0.1:4000/api/rivens/weapons', res => res.on('data', () => {}).on('end', r)));

  // Concurrency 50 connections, 500 requests per endpoint
  const s1 = await runBenchmark('Arcanes Catalog (/api/arcanes)', '/api/arcanes', 500, 50);
  const s2 = await runBenchmark('Riven Lots (/api/rivens/lots/torid)', '/api/rivens/lots/torid', 500, 50);
  const s3 = await runBenchmark('Weapons Catalog (/api/rivens/weapons)', '/api/rivens/weapons', 500, 50);
  const s4 = await runBenchmark('Core Status (/api/status)', '/api/status', 500, 50);

  console.log('\n=================== FINAL SUMMARY ===================');
  console.table([s1, s2, s3, s4]);
}

main().catch(console.error);

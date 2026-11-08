const { Agent, fetch } = require('undici');

const ipv4Agent = new Agent({ connect: { localAddress: '75.119.157.81', family: 4 } });
const ipv6Agents = [
  { name: 'IPv6-10', agent: new Agent({ connect: { localAddress: '2a02:c207:2370:7155::10', family: 6 } }) },
  { name: 'IPv6-11', agent: new Agent({ connect: { localAddress: '2a02:c207:2370:7155::11', family: 6 } }) },
  { name: 'IPv6-12', agent: new Agent({ connect: { localAddress: '2a02:c207:2370:7155::12', family: 6 } }) },
  { name: 'IPv6-13', agent: new Agent({ connect: { localAddress: '2a02:c207:2370:7155::13', family: 6 } }) },
];

const headers = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Language: 'ru',
  Platform: 'pc'
};

const weapons = [
  'torid', 'rubico', 'soma', 'latron', 'strun',
  'burston', 'orthos', 'nikana', 'dual_toxocyst', 'acceltra',
  'glaive', 'kronen', 'guandao', 'ignis_wraith', 'amprex',
  'cedo', 'nataruk', 'kuva_bramma', 'kuva_zarr', 'felarx'
];

async function testAlternating() {
  console.log('Testing alternating IPv4 / IPv6 with 1100ms pool pacing...');
  let v6Idx = 0;
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < weapons.length; i++) {
    const slug = weapons[i];
    const isV4 = i % 2 === 0;
    const agent = isV4 ? ipv4Agent : ipv6Agents[v6Idx % ipv6Agents.length].agent;
    const label = isV4 ? 'IPv4' : ipv6Agents[v6Idx % ipv6Agents.length].name;
    if (!isV4) v6Idx++;

    const url = `https://api.warframe.market/v1/auctions/search?type=riven&weapon_url_name=${slug}&sort_by=price_asc`;
    const t0 = Date.now();
    try {
      const res = await fetch(url, { headers, dispatcher: agent });
      if (res.status === 200) {
        ok++;
        console.log(`[${label}] ${slug}: 200 OK in ${Date.now() - t0}ms`);
      } else {
        fail++;
        console.log(`[${label}] ${slug}: ${res.status} (Retry-After: ${res.headers.get('retry-after')})`);
      }
    } catch (err) {
      fail++;
      console.log(`[${label}] ${slug}: ERROR ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 1100));
  }

  console.log(`\nFinal Alternating Test Result: OK=${ok}, FAIL=${fail}`);
}

testAlternating();

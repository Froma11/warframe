const { Agent, fetch } = require('undici');

const agents = [
  { name: 'IP-1 (IPv4)', agent: new Agent({ connect: { localAddress: '75.119.157.81', family: 4 } }) },
  { name: 'IP-2 (IPv6-10)', agent: new Agent({ connect: { localAddress: '2a02:c207:2370:7155::10', family: 6 } }) },
  { name: 'IP-3 (IPv6-11)', agent: new Agent({ connect: { localAddress: '2a02:c207:2370:7155::11', family: 6 } }) },
  { name: 'IP-4 (IPv6-12)', agent: new Agent({ connect: { localAddress: '2a02:c207:2370:7155::12', family: 6 } }) },
  { name: 'IP-5 (IPv6-13)', agent: new Agent({ connect: { localAddress: '2a02:c207:2370:7155::13', family: 6 } }) },
];

const headers = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Language: 'ru',
  Platform: 'pc'
};

async function test() {
  const weapons = ['torid', 'rubico', 'soma', 'latron', 'strun', 'burston', 'orthos', 'nikana', 'dual_toxocyst', 'acceltra'];
  for (let i = 0; i < weapons.length; i++) {
    const slug = weapons[i];
    const node = agents[i % agents.length];
    const url = `https://api.warframe.market/v1/auctions/search?type=riven&weapon_url_name=${slug}&sort_by=price_asc`;
    const t0 = Date.now();
    try {
      const res = await fetch(url, { headers, dispatcher: node.agent });
      console.log(`${slug} [${node.name}]: status=${res.status} in ${Date.now() - t0}ms`);
      if (res.status === 429) {
        console.log('Retry-After:', res.headers.get('retry-after'));
      }
    } catch (err) {
      console.log(`${slug} [${node.name}]: error=${err.message}`);
    }
    await new Promise(r => setTimeout(r, 800));
  }
}

test();

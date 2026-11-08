const { Agent, fetch } = require('/var/www/zero/server/node_modules/undici');
const { isIPv6 } = require('node:net');

const ips = [
  '75.119.157.81',
  '2a02:c207:2370:7155::10',
  '2a02:c207:2370:7155::11',
  '2a02:c207:2370:7155::12',
  '2a02:c207:2370:7155::13'
];

async function main() {
  for (const ip of ips) {
    try {
      const agent = new Agent({
        connect: {
          localAddress: ip,
          family: isIPv6(ip) ? 6 : 4,
          timeout: 10000
        }
      });
      const res = await fetch('https://api.warframe.market/v2/riven/weapons', {
        dispatcher: agent,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0',
          'Platform': 'pc'
        }
      });
      console.log('Undici bound to [' + ip + '] => HTTP ' + res.status);
    } catch (e) {
      console.log('Undici bound to [' + ip + '] ERROR: ' + e.message);
    }
  }
}
main();

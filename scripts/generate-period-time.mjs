import {writeJSONFile} from "./utils.mjs";

const periodMs = 12 * 7 * 24 * 60 * 60 * 1000;
const periodKMs = 6 * 7 * 24 * 60 * 60 * 1000;
const RELAY_DATE_MAP = {
  polkadot: (new Date('2021-12-21T01:59:00')).getTime() - (6 * periodMs),
  kusama: (new Date('2021-09-08T04:46:00')).getTime() - (15 * periodKMs),
}

function computeTime(relayChain, period) {
  const pMs = relayChain === 'polkadot' ? periodMs : periodKMs;
  return RELAY_DATE_MAP[relayChain] + period * pMs;
}

const timeMap = {
    'polkadot': {},
    'kusama': {}
}

for (let i = 0; i < 100; i++) {
  timeMap['polkadot'][i.toString()] = computeTime('polkadot', i);
}

for (let i = 0; i < 200; i++) {
  timeMap['kusama'][i.toString()] = computeTime('kusama', i);
}

await writeJSONFile('data/events/period-time.json', timeMap);
import { readable, writable, get } from 'svelte/store';
import { SubscriptionClient } from 'subscriptions-transport-ws';
import * as Tone from 'tone';
import { tweened } from 'svelte/motion';

const GRAPHQL_ENDPOINT = 'wss://lb.n.vega.xyz/query';
const TRADES_QUERY = 'subscription { trades { price size buyer { id } seller { id } id } }';
const MAX_BLOCKS = 6;

export const isMuted = writable(true);

export function tradeStream() {
	return readable([], function start(set) {
		let count = 0;
		let trades = [];
		let blocks = [];
		const client = new SubscriptionClient(GRAPHQL_ENDPOINT, { reconnect: true });

		const lanes = ["D3", "F3", "A3", "C3", "E3"];

		const synth = new Tone.Synth().toDestination();

		const req = client.request({ query: TRADES_QUERY }).subscribe({
			next(res) {
				if (!res && !res.data) {
					console.log('No trades: ', res);
					return;
				}

				const lane = res.data.trades.length % lanes.length;

				const block = res.data.trades;
				block.id = count++;
				block.lane = lane;

				blocks.push(block);
				if (blocks.length > MAX_BLOCKS) blocks.shift();
				set(blocks);

				if (!get(isMuted)) {
					// Play the funky music
					//const note = res.data.trades.length * 10; // 30 trades -> 300hz
					const note = lanes[lane];
					//const note = Tone.Frequency("C1").transpose(res.data.trades.length);
					synth.triggerAttackRelease(note, '4n');
				}
			},
			error(e) {
				console.log('GraphQL error:', e);
			},
			complete() {
				console.log('GraphQL request finished.');
			}
		})
	});
}

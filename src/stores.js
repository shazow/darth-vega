import { readable, writable, get } from 'svelte/store';
import { SubscriptionClient } from 'subscriptions-transport-ws';
import * as Tone from 'tone';
import { tweened } from 'svelte/motion';

const GRAPHQL_ENDPOINT = 'wss://lb.n.vega.xyz/query';
const TRADES_QUERY = 'subscription { trades { price size buyer { id } seller { id } id } }';
const MAX_TRADES = 10;

export const isMuted = writable(true);

export function tradeStream() {
	return readable([], function start(set) {
		
		let trades = [];
		const client = new SubscriptionClient(GRAPHQL_ENDPOINT, { reconnect: true });

		const synth = new Tone.Synth().toDestination();

		const req = client.request({ query: TRADES_QUERY }).subscribe({
			next(res) {
				if (res && res.data && res.data.trades) {
					res.data.trades.map((o, i) => o.idx = i);
					console.log(`Received ${res.data.trades.length} trades`);
					trades = trades.concat(res.data.trades).slice(-1 * MAX_TRADES);
					set(trades);

					console.log(`Received ${res.data.trades[1].seller.id} trades`);

					if (!get(isMuted)) {
						let hz = res.data.trades.length * 10; // 30 trades -> 300hz
						synth.triggerAttackRelease(res.data.trades.length * 10, '4n');
					}
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

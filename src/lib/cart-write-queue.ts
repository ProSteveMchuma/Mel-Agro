/**
 * Serialise async cart writes so an older in-flight persist cannot overwrite a
 * newer clear/convert (the main "ghost items come back" failure mode).
 *
 * Example without a queue:
 *   1) persist([A,B,C]) starts (slow)
 *   2) clearCart() writes items:[]
 *   3) slow persist finishes → [A,B,C] resurrected
 * With this queue, step 3 cannot land after step 2.
 */
export type CartWriteTask = () => Promise<void>;

export function createCartWriteQueue() {
    let chain: Promise<void> = Promise.resolve();

    return {
        enqueue(task: CartWriteTask): Promise<void> {
            const run = () => task();
            // Always continue the chain even when a prior write fails.
            chain = chain.then(run, run);
            return chain;
        },
        /** Wait until every queued write has settled (tests / flush). */
        idle(): Promise<void> {
            return chain.then(() => undefined, () => undefined);
        },
    };
}

/**
 * Decide whether a completed load should replace in-memory cart state.
 * If the shopper mutated the cart while Firestore/local load was in flight,
 * keep their in-memory lines instead of clobbering them with a stale snapshot.
 */
export function shouldApplyLoadedCart(args: {
    loadGeneration: number;
    currentGeneration: number;
}): boolean {
    return args.currentGeneration === args.loadGeneration;
}

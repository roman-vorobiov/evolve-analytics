export function transformMap<K extends keyof any, V, KNew extends keyof any, VNew>(obj: Record<K, V>, fn: (kv: [K, V]) => [KNew, VNew]): Record<KNew, VNew> {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => fn([k as K, v as V]))) as Record<KNew, VNew>;
}

export function filterMap<K extends string, V>(obj: Record<K, V>, fn: (kv: [K, V]) => boolean): Record<K, V> {
    return Object.fromEntries(Object.entries(obj).filter(fn)) as Record<K, V>;
}

export function rotateMap<K extends keyof any, V extends keyof any>(obj: Record<K, V>): Record<V, K> {
    return transformMap(obj, ([k, v]) => [v, k]);
}

export function zip<T extends any[]>(...lists: [...T]) {
    const result = [];

    const length = Math.min(...lists.map(l => l.length));

    for (let i = 0; i !== length; ++i) {
        result.push(lists.map(l => l[i]));
    }

    return result;
}

export function lastEntry<K, V>(map: Map<K, V>, filter?: (_: [K, V]) => boolean): [K, V] | undefined {
    let filtered = Array.from(map);

    if (filter !== undefined) {
        filtered = filtered.filter(filter);
    }

    if (filtered.length !== 0) {
        return filtered[filtered.length - 1];
    }
}

export function lastValue<K, V>(map: Map<K, V>, filter?: (_: K) => boolean): V | undefined {
    let entry: [K, V] | undefined;

    if (filter !== undefined) {
        entry = lastEntry(map, ([k, v]) => filter(k));
    }
    else {
        entry = lastEntry(map);
    }

    return entry?.[1];
}

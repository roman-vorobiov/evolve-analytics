export function transformMap<K extends keyof any, V, KNew extends keyof any, VNew>(obj: Record<K, V>, fn: (kv: [K, V]) => [KNew, VNew]): Record<KNew, VNew> {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => fn([k as K, v as V]))) as Record<KNew, VNew>;
}

export function rotateMap<K extends keyof any, V extends keyof any>(obj: Record<K, V>): Record<V, K> {
    return transformMap(obj, ([k, v]) => [v, k]);
}

export function zip<T extends any[]>(...lists: [...T]) {
    const result = [];

    const length = Math.min(...lists.map(l => l.length));

    for (let i = 0; i != length; ++i) {
        result.push(lists.map(l => l[i]));
    }

    return result;
}

export type RecursivePartial<T> = {
    [P in keyof T]?:
        T[P] extends (infer U)[] ? RecursivePartial<U>[] :
        T[P] extends object | undefined ? RecursivePartial<T[P]> :
        T[P];
};

export function patternMatch<T>(value: string, cases: [RegExp, (...matches: string[]) => T][]): T | undefined {
    for (const [pattern, fn] of cases) {
        const match = value.match(pattern);
        if (match !== null) {
            return fn.apply(null, match.slice(1));
        }
    }
}

export function lazyLoad<T>(fn: () => T): T {
    let value: T | undefined = undefined;

    return <T> new Proxy({}, {
        get(obj, prop) {
            value ??= fn();
            return value[prop as keyof T];
        },
        set(obj, prop, value) {
            value ??= fn();
            value[prop as keyof T] = value;
            return true;
        }
    });
}

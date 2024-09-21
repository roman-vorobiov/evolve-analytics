export { transformMap, rotateMap, zip } from "./map";
export { compose, invokeFor, weakFor } from "./functional";

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

export { transformMap, rotateMap, filterMap, objectSubset, zip, lastEntry, lastValue } from "./map";

export type RecursivePartial<T> = {
    [P in keyof T]?:
        T[P] extends (infer U)[] ? RecursivePartial<U>[] :
        T[P] extends object | undefined ? RecursivePartial<T[P]> :
        T[P];
};

export function patternMatcher<T>(cases: [RegExp, (...matches: string[]) => T][]): (value: string) => T | undefined {
    return (value: string) => {
        for (const [pattern, fn] of cases) {
            const match = value.match(pattern);
            if (match !== null) {
                return fn.apply(null, match.slice(1));
            }
        }
    };
}

export function patternMatch<T = void>(value: string, cases: [RegExp, (...matches: string[]) => T][]): T | undefined {
    return patternMatcher(cases)(value);
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

export function compose<Args extends any[], Ret>(l: (...args: [...Args]) => Ret, r: (...args: [...Args]) => Ret) {
    return (...args: [...Args]) => l(...args) && r(...args);
}

export function spy<F extends Function>(obj: any, key: string, spy: F) {
    let original = obj[key];

    if (original instanceof Function) {
        obj[key] = (...args: any) => {
            spy(...args);
            return original(...args);
        };
    }
    else {
        Object.defineProperty(obj, key, {
            configurable: true,
            get: () => original,
            set: (value) => {
                original = value;
                spy();
            }
        });
    }
}

export function clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

export function waitFocus() {
    return new Promise<void>(resolve => {
        if (!document.hidden) {
            resolve();
        }
        else {
            document.addEventListener("visibilitychange", function impl() {
                if (!document.hidden) {
                    document.removeEventListener("visibilitychange", impl);
                    resolve();
                }
            });
        }
    });
}

export function moveElement<T>(list: T[], from: number, to: number) {
    if (to !== from) {
        const item = list[from];
        list.splice(from, 1);
        list.splice(to, 0, item);
    }
}

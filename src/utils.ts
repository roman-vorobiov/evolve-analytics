export function rotateMap<T extends object>(obj: T) {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]));
}

export type RecursivePartial<T> = {
    [P in keyof T]?:
        T[P] extends (infer U)[] ? RecursivePartial<U>[] :
        T[P] extends object | undefined ? RecursivePartial<T[P]> :
        T[P];
};

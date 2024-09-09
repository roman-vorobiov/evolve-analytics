export function rotateMap<T extends object>(obj: T) {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]));
}

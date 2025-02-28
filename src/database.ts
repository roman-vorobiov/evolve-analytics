import type { Config } from "./config";
import type { RunHistory } from "./history";
import type { LatestRun } from "./pendingRun";

import * as LZString from "lz-string";

type Saver<T> = (obj: T) => void;
type Loader<T> = () => (T | null);
type Remover = () => void;

function makeDatabaseFunctions<T>(key: string): [Saver<T>, Loader<T>, Remover] {
    return [
        (obj: T) => localStorage.setItem(key, JSON.stringify(obj)),
        () => JSON.parse(localStorage.getItem(key) ?? "null"),
        () => localStorage.removeItem(key)
    ];
}

function makeEncodedDatabaseFunctions<T>(key: string): [Saver<T>, Loader<T>, Remover] {
    return [
        (obj: T) => localStorage.setItem(key, LZString.compressToBase64(JSON.stringify(obj))),
        () => {
            const raw = localStorage.getItem(key);
            if (raw === null) {
                return null;
            }
            else if (raw.startsWith("{")) {
                return JSON.parse(raw);
            }
            else {
                return JSON.parse(LZString.decompressFromBase64(raw));
            }
        },
        () => localStorage.removeItem(key)
    ];
}

export const [saveConfig, loadConfig] = makeDatabaseFunctions<Config>("sneed.analytics.config");

export const [saveHistory, loadHistory] = makeEncodedDatabaseFunctions<RunHistory>("sneed.analytics.history");

export const [saveCurrentRun, loadLatestRun, discardLatestRun] = makeDatabaseFunctions<LatestRun>("sneed.analytics.latest");

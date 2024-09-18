import type { Config } from "./config";
import type { RunHistory } from "./history";
import type { LatestRun } from "./runTracking";

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

export const [saveConfig, loadConfig] = makeDatabaseFunctions<Config>("sneed.analytics.config");

export const [saveHistory, loadHistory] = makeDatabaseFunctions<RunHistory>("sneed.analytics.history");

export const [saveCurrentRun, loadLatestRun, discardLatestRun] = makeDatabaseFunctions<LatestRun>("sneed.analytics.latest");

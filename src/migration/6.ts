import type { universes } from "../enums";
import type { LatestRun as LatestRun7 } from "../runTracking";

export type LatestRun6 = Omit<LatestRun7, "universe"> & {
    universe: keyof typeof universes | "bigbang"
}

function migrateLatestRun(latestRun: any) {
    if (latestRun.universe === "bigbang") {
        delete latestRun.universe;
    }
}

function migrateHistory(history: any) {
    for (let i = 0; i !== history.runs.length; ++i) {
        const run = history.runs[i];
        const nextRun = history.runs[i + 1];

        // The runs after a t3 reset may have gotten the "bigbang" universe as the page is refreshed into the universe selection
        if (run.universe === "bigbang") {
            if (nextRun === undefined) {
                // The last run is broken - mark migration as failed and try after the next run
                return false;
            }
            else if (nextRun.universe !== "bigbang") {
                // If the next run has a valid universe, this means we stayed in the same universe
                run.universe = nextRun.universe;
            }
            else {
                // If there are multiple t3 runs in a row, assume DE farming, which is usually done in magic
                run.universe = "magic";
            }
        }
    }

    return true;
}

export function migrate6(config: any, history: any, latestRun: any) {
    if (latestRun !== null) {
        migrateLatestRun(latestRun);
    }

    if (migrateHistory(history)) {
        config.version = 7;
    }
}

import { rotateMap } from "../utils";
import { getResetType } from "./12";
import type { RunHistory } from "../history";
import type { Config } from "../config";

function migrateHistory(history: RunHistory) {
    const milestonesByID = rotateMap(history.milestones);

    const forced4Star = ["aiappoc", "matrix", "retire", "eden"];

    for (const run of history.runs) {
        if (forced4Star.includes(getResetType(run, milestonesByID)!)) {
            run.starLevel ??= 4;
        }
    }
}

export function migrate14(config: Config, history: RunHistory) {
    migrateHistory(history);

    config.version = 15;
}

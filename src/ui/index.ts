import styles from "./styles.css";
import { buildAnalyticsTab } from "./analyticsTab";
import { waitFor, makeToggle } from "./utils";
import type { Game } from "../game";
import type { ConfigManager } from "../config";
import type { HistoryManager } from "../history";
import type { LatestRun } from "../runTracking";

function addMainToggle(config: ConfigManager) {
    waitFor("#settings").then(() => {
        const toggleNode = makeToggle("Record Runs", config.recordRuns, (checked) => { config.recordRuns = checked; });
        toggleNode.insertAfter("#settings > .switch.setting:last");
    });
}

export function bootstrapUIComponents(game: Game, config: ConfigManager, history: HistoryManager, currentRun: LatestRun) {
    $("head").append(`<style type="text/css">${styles}</style>`);

    addMainToggle(config);

    buildAnalyticsTab(game, config, history, currentRun);
}

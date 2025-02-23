import styles from "./styles.css";
import { makeAnalyticsTab } from "./analyticsTab";
import { makeToggle, addTab } from "./components";
import { waitFor } from "./utils";
import type { Game } from "../game";
import type { ConfigManager } from "../config";
import type { HistoryManager } from "../history";
import type { LatestRun } from "../runTracking";

async function addMainToggle(config: ConfigManager) {
    await waitFor("#settings");

    const toggleNode = makeToggle("Record Runs", config.recordRuns, (checked) => { config.recordRuns = checked; });
    toggleNode.insertAfter("#settings > .switch.setting:last");
}

export function bootstrapUIComponents(game: Game, config: ConfigManager, history: HistoryManager, currentRun: LatestRun) {
    $("head").append(`<style type="text/css">${styles}</style>`);

    addMainToggle(config);

    addTab("Analytics", () => makeAnalyticsTab(game, config, history, currentRun));
}

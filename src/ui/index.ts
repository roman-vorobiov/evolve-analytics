import styles from "./styles.css";
import { buildAnalyticsTab } from "./analyticsTab";
import { waitFor, makeToggle } from "./utils";
import type { ConfigManager } from "../config";
import type { HistoryManager } from "../history";

function addMainToggle(config: ConfigManager) {
    waitFor("#settings").then(() => {
        const toggleNode = makeToggle("Record Runs", config.recordRuns, (checked) => { config.recordRuns = checked; });
        toggleNode.insertAfter("#settings > .switch.setting:last");
    });
}

export function bootstrapUIComponents(config: ConfigManager, history: HistoryManager) {
    $("head").append(`<style type="text/css">${styles}</style>`);

    addMainToggle(config);

    buildAnalyticsTab(config, history);
}

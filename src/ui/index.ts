import { makeStyles } from "./styles";
import { makeAnalyticsTab } from "./analyticsTab";
import type { ConfigManager } from "../config";
import type { HistoryManager } from "../history";

export function bootstrapAnalyticsTab(config: ConfigManager, history: HistoryManager) {
    $("head").append(makeStyles());

    makeAnalyticsTab(config, history);
}

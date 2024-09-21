import styles from "./styles.css";
import { makeAnalyticsTab } from "./analyticsTab";
import type { ConfigManager } from "../config";
import type { HistoryManager } from "../history";

export function bootstrapAnalyticsTab(config: ConfigManager, history: HistoryManager) {
    $("head").append(styles);

    makeAnalyticsTab(config, history);
}

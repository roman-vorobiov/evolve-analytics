import * as DB from "../database";
import { migrate3 } from "./3";
import { migrate4 } from "./4";
import { migrate6 } from "./6";
import { migrate7 } from "./7";

export function migrate() {
    let config: any = DB.loadConfig();
    let history: any = null;
    let latestRun: any = null;

    if (config === null) {
        return;
    }

    let migrated = false;

    if (config.version < 4) {
        [config, history, latestRun] = migrate3(config, DB.loadHistory(), DB.loadLatestRun() as any);
        migrated = true;
    }

    if (config.version < 6) {
        config = migrate4(config);
        migrated = true;
    }

    if (config.version === 6) {
        migrate6(config, history ?? DB.loadHistory(), latestRun ?? DB.loadLatestRun());
        migrated = true;
    }

    if (config.version === 7) {
        config = migrate7(config);
        migrated = true;
    }

    if (migrated) {
        DB.saveConfig(config);
        history !== null && DB.saveHistory(history);
        latestRun !== null ? DB.saveCurrentRun(latestRun) : DB.discardLatestRun();
    }
}

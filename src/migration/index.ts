import * as DB from "../database";
import { migrate3 } from "./3";
import { migrate4 } from "./4";
import { migrate6 } from "./6";
import { migrate7 } from "./7";
import { migrate8 } from "./8";
import { migrate9 } from "./9";
import { migrate10 } from "./10";
import { migrate11 } from "./11";
import { migrate12 } from "./12";

export function migrate() {
    let config: any = DB.loadConfig();
    let history: any = DB.loadHistory();
    let latestRun: any = DB.loadLatestRun();

    if (config === null) {
        return;
    }

    let migrated = false;

    if (config.version < 4) {
        [config, history, latestRun] = migrate3(config, history, latestRun);
        migrated = true;
    }

    if (config.version < 6) {
        config = migrate4(config);
        migrated = true;
    }

    if (config.version === 6) {
        migrate6(config, history, latestRun);
        migrated = true;
    }

    if (config.version === 7) {
        config = migrate7(config);
        migrated = true;
    }

    if (config.version === 8) {
        migrate8(config, history, latestRun);
        migrated = true;
    }

    if (config.version === 9) {
        migrate9(config, latestRun);
        migrated = true;
    }

    if (config.version === 10) {
        migrate10(config);
        migrated = true;
    }

    if (config.version === 11) {
        migrate11(config, history, latestRun);
        migrated = true;
    }

    if (config.version === 12) {
        migrate12(config, history);
        migrated = true;
    }

    if (migrated) {
        DB.saveConfig(config);
        history !== null && DB.saveHistory(history);
        latestRun !== null ? DB.saveCurrentRun(latestRun) : DB.discardLatestRun();
    }
}

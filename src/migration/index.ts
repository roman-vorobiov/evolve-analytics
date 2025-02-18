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
import { migrate13 } from "./13";
import { migrate14 } from "./14";

export function migrate() {
    let config: any = DB.loadConfig();
    let history: any = DB.loadHistory();
    let latestRun: any = DB.loadLatestRun();

    if (config === null) {
        return;
    }

    if (config.version >= 15) {
        return;
    }

    if (config.version < 4) {
        [config, history, latestRun] = migrate3(config, history, latestRun);
    }

    if (config.version < 6) {
        config = migrate4(config);
    }

    if (config.version === 6) {
        migrate6(config, history, latestRun);
    }

    if (config.version === 7) {
        config = migrate7(config);
    }

    if (config.version === 8) {
        migrate8(config, history, latestRun);
    }

    if (config.version === 9) {
        migrate9(config, latestRun);
    }

    if (config.version === 10) {
        migrate10(config);
    }

    if (config.version === 11) {
        migrate11(config, history, latestRun);
    }

    if (config.version === 12) {
        migrate12(config, history);
    }

    if (config.version === 13) {
        migrate13(config);
    }

    if (config.version === 14) {
        migrate14(config, history);
    }

    DB.saveConfig(config);
    history !== null && DB.saveHistory(history);
    latestRun !== null ? DB.saveCurrentRun(latestRun) : DB.discardLatestRun();
}

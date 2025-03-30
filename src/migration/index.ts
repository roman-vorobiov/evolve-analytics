import * as DB from "../database";
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
import { migrate15 } from "./15";
import { migrate16 } from "./16";

export const VERSION = 17;

export function migrate() {
    let config: any = DB.loadConfig();

    if (config === null) {
        return;
    }

    if (config.version >= VERSION) {
        return;
    }

    if (config.version < 4) {
        DB.discardConfig();
        DB.discardHistory();
        DB.discardLatestRun();
        return;
    }

    let history: any = DB.loadHistory();
    let latestRun: any = DB.loadLatestRun();

    switch (config.version) {
        default:
            return;

        case 4:
        case 5:
            migrate4(config);
        case 6:
            migrate6(config, history, latestRun);
        case 7:
            migrate7(config);
        case 8:
            migrate8(config, history, latestRun);
        case 9:
            migrate9(config, latestRun);
        case 10:
            migrate10(config);
        case 11:
            migrate11(config, history, latestRun);
        case 12:
            migrate12(config, history);
        case 13:
            migrate13(config);
        case 14:
            migrate14(config, history);
        case 15:
            migrate15(config);
        case 16:
            migrate16(config, history, latestRun);
    }

    DB.saveConfig(config);
    history !== null && DB.saveHistory(history);
    latestRun !== null ? DB.saveCurrentRun(latestRun) : DB.discardLatestRun();
}

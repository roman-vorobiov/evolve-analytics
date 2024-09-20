import { loadConfig } from "../database";
import { migrate as migrate3 } from "./3";

export function migrate() {
    const config = loadConfig();
    if (config === null) {
        return;
    }

    if (config.version < 4) {
        migrate3(config as any);
    }
}

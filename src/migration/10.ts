import type { Config } from "../config";

export function migrate10(config: Config) {
    config.version = 11;
}

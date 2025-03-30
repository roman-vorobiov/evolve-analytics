import type { resets, universes } from "../enums";
import type { Config7 as Config6, viewModes7 as viewModes6 } from "./7";

export type ViewConfig4 = {
    resetType: keyof typeof resets,
    universe?: keyof typeof universes,
    mode: keyof typeof viewModes6,
    daysScale?: number,
    numRuns?: number,
    milestones: Record<string, boolean>
}

export type Config4 = {
    version: number,
    recordRuns?: boolean,
    views: ViewConfig4[],
    paused?: boolean
}

export function migrate4(config: Config4) {
    config.recordRuns ??= true;

    delete config.paused;

    (config as any).lastOpenViewIndex = config.views.length !== 0 ? 0 : undefined;

    config.views = config.views.map(view => {
        return {
            additionalInfo: [],
            ...view
        };
    });

    config.version = 6;
}

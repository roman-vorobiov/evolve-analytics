import type { resets, universes, viewModes } from "../enums";
import type { Config as Config5 } from "../config";

export type ViewConfig4 = {
    resetType: keyof typeof resets,
    universe?: keyof typeof universes,
    mode: keyof typeof viewModes,
    daysScale?: number,
    numRuns?: number,
    milestones: Record<string, boolean>
}

export type Config4 = {
    version: number,
    recordRuns?: boolean,
    views: ViewConfig4[]
}

export function migrate4(config: Config4): Config5 {
    return {
        version: 5,
        recordRuns: config.recordRuns ?? true,
        views: config.views.map(view => {
            return {
                ...view,
                additionalInfo: []
            };
        })
    };
}

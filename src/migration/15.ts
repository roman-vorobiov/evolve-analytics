import type { additionalInformation, resets, universes, viewModes } from "../enums";
import type { Config, ViewConfig as ViewConfig16 } from "../config";

export type ViewConfig15 = {
    resetType: keyof typeof resets,
    starLevel?: number,
    universe?: keyof typeof universes,
    mode: keyof typeof viewModes,
    includeCurrentRun?: boolean,
    smoothness: number,
    showBars: boolean,
    showLines: boolean,
    fillArea: boolean,
    numRuns?: number,
    daysScale?: number,
    milestones: Record<string, { index: number, enabled: boolean, color: string }>,
    additionalInfo: Array<keyof typeof additionalInformation>
}

export type Config15 = {
    version: number,
    recordRuns: boolean,
    lastOpenViewIndex?: number,
    views: ViewConfig15[]
}

function migrateView(view: ViewConfig15): ViewConfig16 {
    return {
        ...view,
        numRuns: { enabled: view.numRuns !== undefined, value: view.numRuns },
        skipRuns: { enabled: false }
    };
}

export function migrate15(config: Config) {
    config.views = config.views.map(v => migrateView(v as any));

    config.version = 16;
}

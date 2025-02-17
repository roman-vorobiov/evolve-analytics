import colorScheme from "../enums/colorSchemes";
import { transformMap } from "../utils";
import type { additionalInformation, resets, universes, viewModes } from "../enums";
import type { Config, ViewConfig as ViewConfig14 } from "../config";

export type ViewConfig13 = {
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
    milestones: Record<string, { index: number, enabled: boolean }>,
    additionalInfo: Array<keyof typeof additionalInformation>
}

export type Config13 = {
    version: number,
    recordRuns: boolean,
    lastOpenViewIndex?: number,
    views: ViewConfig13[]
}

function migrateView(view: ViewConfig13): ViewConfig14 {
    const colors = Object.values(colorScheme);

    const presets: Record<string, string> = {
        "effect:hot": colorScheme.red,
        "effect:cold": colorScheme.blue,
        "effect:inspired": colorScheme.green,
        "effect:motivated": colorScheme.orange
    };

    return {
        ...view,
        milestones: transformMap(view.milestones, ([milestone, { index, enabled }]) => {
            const color = presets[milestone] ?? colors[index % colors.length];
            return [milestone, { index, enabled, color }];
        })
    };
}

export function migrate13(config: Config) {
    config.views = config.views.map(v => migrateView(v as any));

    config.version = 14;
}

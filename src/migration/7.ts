import type { resets, universes, additionalInformation } from "../enums";
import type { ViewConfig as ViewConfig8, Config as Config8 } from "../config";

export const viewModes7 = {
    "total": "Total",
    "filled": "Total (filled)",
    "bars": "Total (bars)",
    "segmented": "Segmented",
    "barsSegmented": "Segmented (bars)"
};

export type ViewConfig7 = {
    resetType: keyof typeof resets,
    universe?: keyof typeof universes,
    mode: keyof typeof viewModes7,
    daysScale?: number,
    numRuns?: number,
    milestones: Record<string, boolean>,
    additionalInfo: Array<keyof typeof additionalInformation>
}

export type Config7 = {
    version: number,
    recordRuns: boolean,
    lastOpenViewIndex?: number,
    views: ViewConfig7[]
}

function migrateView(view: ViewConfig7): ViewConfig8 {
    const newView: ViewConfig8 = {
        ...view,
        mode: ["segmented", "barsSegmented"].includes(view.mode) ? "duration" : "timestamp",
        smoothness: 0,
        showBars: ["bars", "barsSegmented"].includes(view.mode),
        showLines: ["total", "filled", "segmented"].includes(view.mode),
        fillArea: view.mode === "filled"
    };

    delete (newView as any).daysScale;

    return newView;
}

export function migrate7(config: Config7): Config8 {
    return {
        ...config,
        version: 8,
        views: config.views.map(migrateView)
    };
}

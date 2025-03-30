import type { resets, universes, additionalInformation } from "../enums";
import type { ViewConfig12 as ViewConfig8, Config12 as Config8 } from "./12";

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
    return {
        ...view,
        mode: ["segmented", "barsSegmented"].includes(view.mode) ? "duration" : "timestamp",
        smoothness: 0,
        showBars: ["bars", "barsSegmented"].includes(view.mode),
        showLines: ["total", "filled", "segmented"].includes(view.mode),
        fillArea: view.mode === "filled"
    };
}

export function migrate7(config: any) {
    config.views = config.views.map(migrateView);
    config.version = 8;
}

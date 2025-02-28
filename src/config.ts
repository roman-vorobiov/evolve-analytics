import { VERSION } from "./migration";
import { saveConfig, loadConfig } from "./database";
import colorScheme from "./enums/colorSchemes";
import { effectColors } from "./effects";
import { clone } from "./utils";
import { getSortedMilestones, sortMilestones } from "./exports/utils";
import type { resets, universes, viewModes, additionalInformation } from "./enums";
import type { Game } from "./game";
import type { HistoryManager } from "./history";

import { reactive, watch } from "vue";

export type ViewConfig = {
    resetType: keyof typeof resets,
    starLevel?: number,
    universe?: keyof typeof universes,
    mode: keyof typeof viewModes,
    includeCurrentRun?: boolean,
    smoothness: number,
    showBars: boolean,
    showLines: boolean,
    fillArea: boolean,
    numRuns: { enabled: boolean, value?: number },
    skipRuns: { enabled: boolean, value?: number },
    daysScale?: number,
    milestones: Record<string, { index: number, enabled: boolean, color: string }>,
    additionalInfo: Array<keyof typeof additionalInformation>
}

class ViewUtils {
    constructor(private view: ViewConfig, private config: ConfigManager) {
        const self = this;

        return <any> new Proxy(view, {
            get(obj, prop: keyof ViewConfig, receiver) {
                return Reflect.get(self, prop, receiver)
                    ?? Reflect.get(view, prop, receiver);
            },
            set(obj, prop: keyof ViewConfig, value, receiver) {
                return Reflect.set(self, prop, value, receiver)
                    || Reflect.set(view, prop, value, receiver);
            }
        });
    }

    get raw() {
        return this.view;
    }

    set resetType(value: keyof typeof resets) {
        const info = this.view.milestones[`reset:${this.view.resetType}`];
        delete this.view.milestones[`reset:${this.view.resetType}`];
        this.view.milestones[`reset:${value}`] = info;

        this.view.resetType = value;
    }

    get active(): boolean {
        return this.config.openViewIndex === this.index;
    }

    get index() {
        return this.config.views.indexOf(this as any);
    }

    addMilestone(milestone: string) {
        if (!(milestone in this.view.milestones)) {
            const index = Object.entries(this.view.milestones).length;
            const colors = Object.values(colorScheme);
            const color = effectColors[milestone] ?? colors[index % colors.length];

            this.view.milestones[milestone] = { index, enabled: true, color };
        }
    }

    removeMilestone(milestone: string) {
        if (milestone in this.view.milestones) {
            delete this.view.milestones[milestone];
            this.updateMilestoneOrder(getSortedMilestones(this.view));
        }
    }

    toggleMilestone(milestone: string) {
        const info = this.view.milestones[milestone];
        if (info !== undefined) {
            info.enabled = !info.enabled;
        }
    }

    setMilestoneColor(milestone: string, color: string) {
        const info = this.view.milestones[milestone];
        if (info !== undefined) {
            info.color = color;
        }
    }

    moveMilestone(milestone: string, newIndex: number) {
        const oldIndex = this.view.milestones[milestone]?.index;
        if (oldIndex >= 0 && oldIndex !== newIndex) {
            const milestones = getSortedMilestones(this.view);
            milestones.splice(oldIndex, 1);
            milestones.splice(newIndex, 0, milestone);

            this.updateMilestoneOrder(milestones);
        }
    }

    sortMilestones(history: HistoryManager) {
        sortMilestones(this as any, history);
    }

    resetColors() {
        const colors = Object.values(colorScheme);
        for (const [milestone, info] of Object.entries(this.view.milestones)) {
            info.color = effectColors[milestone] ?? colors[info.index % colors.length];
        }
    }

    toggleAdditionalInfo(key: keyof typeof additionalInformation) {
        const idx = this.view.additionalInfo.indexOf(key);
        if (idx !== -1) {
            this.view.additionalInfo.splice(idx, 1);
        }
        else {
            this.view.additionalInfo.push(key);
        }
    }

    private updateMilestoneOrder(milestones: string[]) {
        for (let i = 0; i !== milestones.length; ++i) {
            this.view.milestones[milestones[i]].index = i;
        }
    }
}

export type View = ViewConfig & ViewUtils;

function makeViewProxy(config: ConfigManager, view: ViewConfig): View {
    return new ViewUtils(view, config) as View;
}

export type Config = {
    version: number,
    recordRuns: boolean,
    lastOpenViewIndex?: number,
    active?: boolean,
    views: ViewConfig[]
}

export class ConfigManager {
    views: View[];

    constructor(private game: Game, private config: Config) {
        this.views = this.config.views.map(v => makeViewProxy(this, v));
    }

    get raw() {
        return this.config;
    }

    get active() {
        return this.config.active ?? false;
    }

    set active(value: boolean) {
        this.config.active = value;
    }

    get recordRuns() {
        return this.config.recordRuns;
    }

    set recordRuns(value: boolean) {
        if (value !== this.config.recordRuns) {
            this.config.recordRuns = value;
        }
    }

    get additionalInfoToTrack() {
        const unique = new Set(this.views.flatMap(v => v.additionalInfo));
        return [...unique];
    }

    get openViewIndex() {
        return this.config.lastOpenViewIndex;
    }

    set openViewIndex(index: number | undefined) {
        this.config.lastOpenViewIndex = index;
    }

    addView() {
        const colors = Object.values(colorScheme);

        const view: ViewConfig = {
            resetType: "ascend",
            universe: this.game.universe,
            numRuns: { enabled: false },
            skipRuns: { enabled: false },
            includeCurrentRun: false,
            mode: "timestamp",
            showBars: true,
            showLines: false,
            fillArea: false,
            smoothness: 0,
            milestones: {
                "reset:ascend": { index: 0, enabled: true, color: colors[0] }
            },
            additionalInfo: []
        };

        return this.insertView(view);
    }

    cloneView(view: View) {
        const idx = this.views.indexOf(view);
        if (idx !== -1) {
            return this.insertView(clone(view.raw), idx + 1);
        }
    }

    removeView(view: View) {
        const idx = this.views.indexOf(view);
        if (idx !== -1) {
            this.config.views.splice(idx, 1);
            const removed = this.views.splice(idx, 1);

            if (idx !== 0) {
                this.openViewIndex = idx - 1;
            }
            else if (this.views.length === 0) {
                this.openViewIndex = undefined;
            }

            return removed[0];
        }
    }

    private insertView(view: ViewConfig, index?: number) {
        index ??= this.views.length;

        const proxy = makeViewProxy(this, view);

        this.config.views.splice(index, 0, view);
        this.views.splice(index, 0, proxy);

        this.openViewIndex = index;

        return proxy;
    }
}

export function getConfig(game: Game) {
    const config = reactive(loadConfig() ?? { version: VERSION, recordRuns: true, views: [] });
    watch(config, () => saveConfig(config), { deep: true });

    return new ConfigManager(game, config);
}

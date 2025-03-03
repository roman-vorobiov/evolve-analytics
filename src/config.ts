import { VERSION } from "./migration";
import { saveConfig, loadConfig } from "./database";
import colorScheme from "./enums/colorSchemes";
import { effectColors } from "./effects";
import { clone, moveElement } from "./utils";
import { getSortedMilestones, sortMilestones } from "./exports/utils";
import type { resets, universes, viewModes, additionalInformation } from "./enums";
import type { Game } from "./game";
import type { HistoryManager } from "./history";

import { default as Vue, reactive, watch } from "vue";

type MilestoneInfo = {
    index: number,
    enabled: boolean,
    color: string
}

export type ViewConfig = {
    resetType: keyof typeof resets,
    starLevel?: number,
    universe?: keyof typeof universes,
    name?: string,
    mode: keyof typeof viewModes,
    includeCurrentRun?: boolean,
    smoothness: number,
    showBars: boolean,
    showLines: boolean,
    fillArea: boolean,
    numRuns: { enabled: boolean, value?: number },
    skipRuns: { enabled: boolean, value?: number },
    daysScale?: number,
    milestones: Record<string, MilestoneInfo>,
    additionalInfo: Array<keyof typeof additionalInformation>
}

class ViewUtils {
    private static idGenerator = 0;
    private _id = ++ViewUtils.idGenerator;

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

    get id() {
        return this._id;
    }

    get name() {
        return this.view.name;
    }

    set name(value: string | undefined) {
        this.view.name = value;
    }

    set resetType(value: keyof typeof resets) {
        const oldKey = `reset:${this.view.resetType}`;
        const newKey = `reset:${value}`;

        const info = this.view.milestones[oldKey];

        Vue.delete(this.view.milestones, oldKey);
        Vue.set(this.view.milestones, newKey, info);

        this.view.resetType = value;
    }

    get active(): boolean {
        return !document.hidden && this.config.openViewIndex === this.index;
    }

    get index() {
        return this.config.views.indexOf(this as any);
    }

    addMilestone(milestone: string) {
        if (!(milestone in this.view.milestones)) {
            const index = Object.entries(this.view.milestones).length;
            const colors = Object.values(colorScheme);
            const color = effectColors[milestone] ?? colors[index % colors.length];

            Vue.set(this.view.milestones, milestone, { index, enabled: true, color });
        }
    }

    removeMilestone(milestone: string) {
        if (milestone in this.view.milestones) {
            Vue.delete(this.view.milestones, milestone);
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

    moveMilestone(from: number, to: number) {
        const milestones = getSortedMilestones(this.view);
        moveElement(milestones, from, to);
        this.updateMilestoneOrder(milestones);
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
    private config: Config;
    private _views: View[];

    constructor(private game: Game, config: Config) {
        this.config = reactive(config);
        this.watch(() => saveConfig(this.config));

        this._views = this.config.views.map(v => makeViewProxy(this, v));
    }

    watch(callback: () => void, immediate = false) {
        watch(this.config, callback, { deep: true, immediate });
    }

    get active() {
        return this.config.active ?? false;
    }

    set active(value: boolean) {
        this.config.active = value;
    }

    get views() {
        return this._views;
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

    moveView(oldIndex: number, newIndex: number) {
        moveElement(this.views, oldIndex, newIndex);
        moveElement(this.config.views, oldIndex, newIndex);

        this.openViewIndex = newIndex;
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
    const config = loadConfig() ?? { version: VERSION, recordRuns: true, views: [] };

    return new ConfigManager(game, config);
}

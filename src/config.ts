import { VERSION } from "./migration";
import { saveConfig, loadConfig } from "./database";
import { Subscribable } from "./subscribable";
import colorScheme from "./enums/colorSchemes";
import { effectColors } from "./effects";
import { getSortedMilestones, sortMilestones } from "./exports/utils";
import type { resets, universes, viewModes, additionalInformation } from "./enums";
import type { Game } from "./game";
import type { HistoryManager } from "./history";

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

class ViewUtils extends Subscribable {
    static idGenerator = 0;
    private _id = ++ViewUtils.idGenerator;

    constructor(private view: ViewConfig, private config: ConfigManager) {
        super();

        this.on("updated", () => {
            this.config.emit("viewUpdated", this);
        });

        const self = this;

        return <any> new Proxy(view, {
            get(obj, prop: keyof ViewConfig, receiver) {
                return Reflect.get(self, prop, receiver)
                    || Reflect.get(view, prop, receiver);
            },
            set(obj, prop: keyof ViewConfig, value, receiver) {
                if (value === view[prop]) {
                    return true;
                }

                const ret = Reflect.set(self, prop, value, receiver)
                    || Reflect.set(view, prop, value, receiver);

                self.emit("updated", receiver);

                return ret;
            }
        });
    }

    get numRuns() {
        return this.makeLimitWrapper("numRuns");
    }

    get skipRuns() {
        return this.makeLimitWrapper("skipRuns");
    }

    set resetType(value: keyof typeof resets) {
        const info = this.view.milestones[`reset:${this.view.resetType}`];
        delete this.view.milestones[`reset:${this.view.resetType}`];
        this.view.milestones[`reset:${value}`] = info;

        this.view.resetType = value;
    }

    id() {
        return this._id;
    }

    index() {
        return this.config.views.indexOf(this as any);
    }

    addMilestone(milestone: string) {
        const index = Object.entries(this.view.milestones).length;
        const colors = Object.values(colorScheme);
        const color = effectColors[milestone] ?? colors[index % colors.length];

        this.view.milestones[milestone] = { index, enabled: true, color };
        this.emit("updated", this);
    }

    removeMilestone(milestone: string) {
        if (milestone in this.view.milestones) {
            delete this.view.milestones[milestone];
            this.updateMilestoneOrder(getSortedMilestones(this.view));
            this.emit("updated", this);
        }
    }

    toggleMilestone(milestone: string) {
        const info = this.view.milestones[milestone];
        if (info !== undefined) {
            info.enabled = !info.enabled;
            this.emit("updated", this);
        }
    }

    setMilestoneColor(milestone: string, color: string) {
        const info = this.view.milestones[milestone];
        if (info !== undefined) {
            info.color = color;
            this.emit("updated", this);
        }
    }

    moveMilestone(milestone: string, newIndex: number) {
        const oldIndex = this.view.milestones[milestone]?.index;
        if (oldIndex >= 0 && oldIndex !== newIndex) {
            const milestones = getSortedMilestones(this.view);
            milestones.splice(oldIndex, 1);
            milestones.splice(newIndex, 0, milestone);

            this.updateMilestoneOrder(milestones);
            this.emit("updated", this);
        }
    }

    sortMilestones(history: HistoryManager) {
        sortMilestones(this as any, history);
        this.emit("updated", this);
    }

    resetColors() {
        const colors = Object.values(colorScheme);
        for (const [milestone, info] of Object.entries(this.view.milestones)) {
            info.color = effectColors[milestone] ?? colors[info.index % colors.length];
        }
        this.emit("updated", this);
    }

    toggleAdditionalInfo(key: keyof typeof additionalInformation) {
        const idx = this.view.additionalInfo.indexOf(key);
        if (idx !== -1) {
            this.view.additionalInfo.splice(idx, 1);
        }
        else {
            this.view.additionalInfo.push(key);
        }
        this.emit("updated", this);
    }

    private makeLimitWrapper(prop: "numRuns" | "skipRuns") {
        const self = this;

        return {
            get enabled() {
                return self.view[prop].enabled;
            },
            set enabled(value) {
                self.view[prop].enabled = value;
                self.emit("updated", self);
            },

            get value() {
                return self.view[prop].value;
            },
            set value(value) {
                self.view[prop].value = value;
                self.emit("updated", self);
            }
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
    views: ViewConfig[]
}

export class ConfigManager extends Subscribable {
    milestones: string[];
    views: View[];

    constructor(private game: Game, private config: Config) {
        super();

        this.milestones = this.collectMilestones();

        this.views = this.config.views.map(v => makeViewProxy(this, v));

        this.on("*", () => {
            saveConfig(this.config);
            this.milestones = this.collectMilestones();
        });
    }

    get recordRuns() {
        return this.config.recordRuns;
    }

    set recordRuns(value: boolean) {
        if (value !== this.config.recordRuns) {
            this.config.recordRuns = value;
            this.emit("updated", this);
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

        // don't emit an event as this is purely a visual thing
        saveConfig(this.config);
    }

    get openView() {
        if (this.openViewIndex !== undefined) {
            return this.views[this.openViewIndex];
        }
    }

    viewOpened(view: View) {
        const idx = this.views.indexOf(view);
        this.config.lastOpenViewIndex = idx === -1 ? undefined : idx;

        // don't emit an event as this is purely a visual thing
        saveConfig(this.config);
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

        const proxy = makeViewProxy(this, view);

        this.config.views.push(view);
        this.views.push(proxy);

        this.openViewIndex = this.views.length - 1;

        this.emit("viewAdded", proxy);

        return proxy;
    }

    removeView(view: View) {
        const idx = this.views.indexOf(view);
        if (idx !== -1) {
            this.config.views.splice(idx, 1);
            this.views.splice(idx, 1);

            if (idx === this.config.lastOpenViewIndex) {
                if (this.views.length === 0) {
                    this.config.lastOpenViewIndex = undefined;
                }
                else {
                    // Open the view on the left or, if the leftmost one was deleted, on the right
                    this.config.lastOpenViewIndex = Math.max(0, this.config.lastOpenViewIndex - 1);
                }
            }

            this.emit("viewRemoved", view);
        }
    }

    private collectMilestones() {
        const uniqueMilestones = new Set(this.config.views.flatMap(v => {
            return Object.entries(v.milestones)
                .filter(([milestone]) => !milestone.startsWith("reset:"))
                .map(([milestone]) => milestone);
        }));

        return Array.from(uniqueMilestones);
    }
}

export function getConfig(game: Game) {
    const config = loadConfig() ?? { version: VERSION, recordRuns: true, views: [] };
    return new ConfigManager(game, config);
}

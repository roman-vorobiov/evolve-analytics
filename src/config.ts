import { saveConfig, loadConfig } from "./database";
import { Subscribable } from "./subscribable";
import type { resets, universes, viewModes } from "./enums";
import type { Game } from "./game";

export type ViewConfig = {
    resetType: keyof typeof resets,
    universe?: keyof typeof universes,
    mode: keyof typeof viewModes,
    daysScale?: number,
    numRuns?: number,
    milestones: Record<string, boolean>
}

export type View = ViewConfig & {
    toggleMilestone(milestone: string): void;
    addMilestone(milestone: string): void;
    removeMilestone(milestone: string): void;
}

export type Config = {
    version: number,
    recordRuns?: boolean,
    views: ViewConfig[]
}

function makeViewProxy(config: ConfigManager, view: ViewConfig): View {
    return <View> new Proxy(view, {
        get(obj, prop, receiver) {
            if (prop === "toggleMilestone") {
                return (milestone: string) => {
                    const enabled = view.milestones[milestone];
                    if (enabled !== undefined) {
                        view.milestones[milestone] = !enabled;
                        config.emit("viewUpdated", receiver);
                    }
                };
            }
            else if (prop === "addMilestone") {
                return (milestone: string) => {
                    view.milestones[milestone] = true;
                    config.emit("viewUpdated", receiver);
                };
            }
            else if (prop === "removeMilestone") {
                return (milestone: string) => {
                    if (milestone in view.milestones) {
                        delete view.milestones[milestone];
                        config.emit("viewUpdated", receiver);
                    }
                };
            }
            else {
                return Reflect.get(obj, prop, receiver);
            }
        },
        set(obj, prop, value, receiver) {
            if (value === view[prop as keyof ViewConfig]) {
                return true;
            }

            if (prop === "resetType") {
                delete view.milestones[`reset:${view.resetType}`];
                view.milestones[`reset:${value}`] = true;
            }

            const ret = Reflect.set(obj, prop, value, receiver);

            config.emit("viewUpdated", receiver);

            return ret;
        }
    });
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
        return this.config.recordRuns ?? true;
    }

    set recordRuns(value: boolean) {
        if (value !== this.config.recordRuns) {
            this.config.recordRuns = value;
            this.emit("updated", this);
        }
    }

    addView() {
        const view: ViewConfig = {
            resetType: "ascend",
            universe: this.game.universe,
            mode: "filled",
            milestones: { "reset:ascend": true }
        };

        const proxy = makeViewProxy(this, view);

        this.config.views.push(view);
        this.views.push(proxy);

        this.emit("viewAdded", proxy);
    }

    removeView(view: View) {
        const idx = this.views.indexOf(view);
        if (idx !== -1) {
            this.config.views.splice(idx, 1);
            this.views.splice(idx, 1);
            this.emit("viewRemoved", view);
        }
    }

    private collectMilestones() {
        const uniqueMilestones = new Set(this.config.views.flatMap(v => {
            return Object.entries(v.milestones)
                .filter(([, enabled]) => enabled)
                .filter(([milestone]) => !milestone.startsWith("reset:"))
                .map(([milestone]) => milestone);
        }));

        return Array.from(uniqueMilestones);
    }
}

export function getConfig(game: Game) {
    const config = loadConfig() ?? { version: 5, paused: false, views: [] };
    return new ConfigManager(game, config);
}

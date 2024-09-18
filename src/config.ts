import { saveConfig, loadConfig } from "./database";
import { milestoneEnabled, milestoneName, milestoneType, type Milestone } from "./milestones";
import { Subscribable } from "./subscribable";
import type { Game } from "./game";

export type ViewConfig = {
    resetType: string,
    universe?: string,
    mode: string,
    daysScale?: number,
    numRuns?: number,
    milestones: Milestone[]
}

export type View = ViewConfig & {
    toggleMilestone(milestone: string): void;
    addMilestone(milestone: Milestone): void;
    removeMilestone(milestone: Milestone): void;
}

export type Config = {
    version: number,
    views: ViewConfig[]
}

function makeViewProxy(config: ConfigManager, view: ViewConfig): View {
    return <View> new Proxy(view, {
        get(obj, prop, receiver) {
            if (prop === "toggleMilestone") {
                return (name: string) => {
                    const milestone = view.milestones.find(m => milestoneName(m) === name);
                    if (milestone !== undefined) {
                        milestone[milestone.length - 1] = !milestone[milestone.length - 1];
                        config.emit("viewUpdated", receiver);
                    }
                };
            }
            else if (prop === "addMilestone") {
                return (milestone: Milestone) => {
                    view.milestones.push(milestone);
                    config.emit("viewUpdated", receiver);
                };
            }
            else if (prop === "removeMilestone") {
                return (milestone: Milestone) => {
                    const signature = milestone.slice(0, -1).join(":");
                    const idx = view.milestones.findIndex(m => m.slice(0, -1).join(":") === signature);
                    if (idx !== -1) {
                        view.milestones.splice(idx, 1);
                        config.emit("viewUpdated", receiver);
                    }
                };
            }
            else {
                return Reflect.get(obj, prop, receiver);
            }
        },
        set(obj, prop, value, receiver) {
            const ret = Reflect.set(obj, prop, value, receiver);

            if (prop === "resetType") {
                const milestone = obj.milestones.find(m => milestoneType(m) === "Reset");
                if (milestone !== undefined) {
                    milestone[1] = value;
                }
            }

            config.emit("viewUpdated", receiver);

            return ret;
        }
    });
}

export class ConfigManager extends Subscribable {
    milestones: Milestone[];
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

    get version() {
        return this.config.version;
    }

    addView() {
        const view: ViewConfig = {
            resetType: "Ascension",
            universe: this.game.universe,
            mode: "Total (filled)",
            milestones: [["Reset", "Ascension", true]]
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
        const milestones = this.config.views.flatMap(v => {
            return v.milestones
                .filter(milestoneEnabled)
                .filter(m => milestoneType(m) !== "Reset");
        });

        const uniqueMilestones: Map<string, Milestone> = new Map();

        for (const milestone of milestones) {
            uniqueMilestones.set(milestone.join(":"), milestone);
        }

        return [...uniqueMilestones.values()];
    }
}

export function getConfig(game: Game) {
    const config = loadConfig() ?? { version: 3, views: [] };
    return new ConfigManager(game, config);
}

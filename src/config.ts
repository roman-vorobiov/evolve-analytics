import { saveConfig, loadConfig } from "./database";
import { Subscribable } from "./subscribable";
import type { resets, universes, viewModes, additionalInformation } from "./enums";
import type { Game } from "./game";

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
    numRuns?: number,
    daysScale?: number,
    milestones: Record<string, { index: number, enabled: boolean }>,
    additionalInfo: Array<keyof typeof additionalInformation>
}

export type View = ViewConfig & {
    toggleMilestone(milestone: string): void;
    setMilestoneColor(milestone: string, color: string): void;
    addMilestone(milestone: string): void;
    removeMilestone(milestone: string): void;
    toggleAdditionalInfo(key: keyof typeof additionalInformation): void;
}

export type Config = {
    version: number,
    recordRuns: boolean,
    lastOpenViewIndex?: number,
    views: ViewConfig[]
}

function makeViewProxy(config: ConfigManager, view: ViewConfig): View {
    return <View> new Proxy(view, {
        get(obj, prop, receiver) {
            if (prop === "toggleMilestone") {
                return (milestone: string) => {
                    const info = view.milestones[milestone];
                    if (info !== undefined) {
                        info.enabled = !info.enabled;
                        config.emit("viewUpdated", receiver);
                    }
                };
            }
            // else if (prop === "setMilestoneColor") {
            //     return (milestone: string, color: string) => {
            //         const info = view.milestones[milestone];
            //         if (info !== undefined) {
            //             info.color = color;
            //             config.emit("viewUpdated", receiver);
            //         }
            //     };
            // }
            else if (prop === "addMilestone") {
                return (milestone: string) => {
                    const index = Object.entries(view.milestones).length;
                    // const colorScheme = colorSchemes.Observable10;
                    // const color = colorScheme[index % colorScheme.length];

                    view.milestones[milestone] = { enabled: true, index };
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
            if (prop === "toggleAdditionalInfo") {
                return (key: keyof typeof additionalInformation) => {
                    const idx = view.additionalInfo.indexOf(key);
                    if (idx !== -1) {
                        view.additionalInfo.splice(idx, 1);
                    }
                    else {
                        view.additionalInfo.push(key);
                    }
                    config.emit("viewUpdated", receiver);
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
                const index = view.milestones[`reset:${view.resetType}`].index;
                // const color = view.milestones[`reset:${view.resetType}`].color;

                delete view.milestones[`reset:${view.resetType}`];
                view.milestones[`reset:${value}`] = { enabled: true, index };
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
        // const colorScheme = colorSchemes.Observable10;

        const view: ViewConfig = {
            resetType: "ascend",
            universe: this.game.universe,
            includeCurrentRun: false,
            mode: "timestamp",
            showBars: true,
            showLines: false,
            fillArea: false,
            smoothness: 0,
            milestones: {
                "reset:ascend": { index: 0, enabled: true }
            },
            additionalInfo: []
        };

        const proxy = makeViewProxy(this, view);

        this.config.views.push(view);
        this.views.push(proxy);

        this.config.lastOpenViewIndex = this.views.length - 1;

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
    const config = loadConfig() ?? { version: 13, recordRuns: true, views: [] };
    return new ConfigManager(game, config);
}

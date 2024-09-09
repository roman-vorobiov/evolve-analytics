import { type Milestone } from "./milestones";
import { View, type ViewState } from "./view";
import { Subscribable } from "./subscribable";

type ConfigState = {
    version: number,
    views: ViewState[]
}

type ParsedConfigState = {
    version: number,
    views: View[]
}

const configStorageKey = "sneed.analytics.config";

function saveState(state: ParsedConfigState) {
    const serialized = {
        version: 3,
        views: state.views.map(view => ({
            ...view,
            milestones: view.milestones.map(m => m.serialize())
        }))
    };

    localStorage.setItem(configStorageKey, JSON.stringify(serialized));
}

function loadState(): ParsedConfigState {
    const localState = localStorage.getItem(configStorageKey);
    if (localState !== null) {
        const state = JSON.parse(localState) as ConfigState;

        if (state.version === 1) {
            for (const view of state.views) {
                if (view.mode === "Total") {
                    view.mode = "Total (filled)";
                }
            }
        }

        return {
            version: state.version,
            views: state.views.map(args => new View(args))
        };
    }
    else {
        return { version: 3, views: [] };
    }
}

class Config extends Subscribable {
    constructor(public state: ParsedConfigState) {
        super();

        this.on("*", () => saveState(this.state));

        for (const view of this.views) {
            view.on("update", () => saveState(this.state));

            if (this.state.version < 3) {
                view.updateResetMilestone(view.resetType);
            }
        }
    }

    get views() {
        return this.state.views;
    }

    get milestones() {
        const uniqueMilestones: Record<string, Milestone> = {};
        for (const view of this.state.views) {
            for (const milestone of view.milestones) {
                uniqueMilestones[milestone.signature] ??= milestone;
            }
        }
        return Object.values(uniqueMilestones);
    }

    addView(resetType: string, universe: string) {
        const view = new View({ resetType, universe, milestones: [["Reset", resetType]] });
        view.on("update", () => saveState(this.state));

        this.state.views.push(view);

        this.emit("viewAdded", view);
    }

    removeView(view: View) {
        const idx = this.views.indexOf(view);
        if (idx !== -1) {
            this.views.splice(idx, 1);
            this.emit("viewRemoved", view);
        }
    }
};

export const config = new Config(loadState());

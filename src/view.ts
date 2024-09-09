import { Subscribable } from "./subscribable";
import { milestoneFactory, ResetMilestone } from "./milestones";
import type { Milestone, SerializedMilestone } from "./milestones";

interface ViewParams {
    mode?: string,
    resetType: string,
    universe?: string,
    daysScale?: number,
    numRuns?: number
};

export interface View extends ViewParams {};

export type ViewState = ViewParams & {
    milestones?: SerializedMilestone[],
}

export class View extends Subscribable implements View {
    milestones: Milestone[];

    constructor(state: ViewState) {
        super();

        const defineSetting = (prop: keyof ViewState, options?: Record<string, any>) => {
            Object.defineProperty(this, prop, {
                enumerable: true,
                get: () => {
                    return state[prop] ?? options?.defaultValue;
                },
                set: (value) => {
                    if (value !== state[prop]) {
                        (state[prop] as any) = value;
                        options?.callback?.(value);
                        this.emit("update");
                    }
                }
            });
        };

        this.milestones = state.milestones?.map(args => milestoneFactory.apply(null, args)) ?? [];

        defineSetting("mode", { defaultValue: "Total" });
        defineSetting("resetType", { callback: (resetType: string) => this.updateResetMilestone(resetType) });
        defineSetting("universe");
        defineSetting("daysScale");
        defineSetting("numRuns");

        for (const milestone of this.milestones) {
            milestone.on("update", () => this.emit("update"));
        }
    }

    updateResetMilestone(resetType: string) {
        const milestone = this.milestones.find(m => m instanceof ResetMilestone);
        if (milestone !== undefined) {
            milestone.name = resetType;
        }
    }

    findMilestone(name: string): Milestone {
        return this.milestones.find(m => m.name === name);
    }

    findMilestoneIndex(milestone: Milestone): number {
        return milestone !== undefined ? this.milestones.findIndex(m => m.signature === milestone.signature) : -1;
    }

    addMilestone(milestone: Milestone) {
        const existingIdx = this.findMilestoneIndex(milestone);
        if (existingIdx === -1) {
            this.milestones.push(milestone);
            milestone.on("update", () => this.emit("update"));
            this.emit("update");
        }
    }

    removeMilestone(milestone: Milestone) {
        const existingIdx = this.findMilestoneIndex(milestone);
        if (existingIdx !== -1) {
            this.milestones.splice(existingIdx, 1);
            this.emit("update");
        }
    }
}

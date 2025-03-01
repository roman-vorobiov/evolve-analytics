import { resets, universes } from "../../enums";
import { applyFilters } from "../../exports/historyFiltering";
import { nextAnimationFrame } from "../utils";
import type { ConfigManager, View } from "../../config";
import type { HistoryManager, HistoryEntry } from "../../history";

import ViewSettings from "./ViewSettings";
import MilestoneController from "./MilestoneController";
import Plot from "./Plot";

type This = {
    $refs: {
        plot: {
            copyAsImage(): Promise<void>
        }
    },
    config: ConfigManager,
    history: HistoryManager,
    view: View,
    selectedRun: HistoryEntry | null,
    rendering: boolean
}

export default {
    components: {
        ViewSettings,
        MilestoneController,
        Plot
    },
    inject: ["config", "history"],
    props: ["view"],
    data(this: This) {
        return {
            selectedRun: null,
            rendering: false
        }
    },
    computed: {
        id(this: This) {
            return `analytics-view-tab-${this.view.id}`;
        },
        title(this: This) {
            if (this.view.universe === "magic" && this.view.resetType === "blackhole") {
                return "Vacuum Collapse";
            }
            else {
                const resetType = resets[this.view.resetType];

                if (this.view.universe !== undefined) {
                    return `${resetType} (${universes[this.view.universe]})`;
                }
                else {
                    return resetType;
                }
            }
        }
    },
    methods: {
        deleteView(this: This) {
            this.config.removeView(this.view);
        },
        cloneView(this: This) {
            this.config.cloneView(this.view);
        },
        async asImage(this: This) {
            this.rendering = true;

            // For some reason awaiting copyAsImage prevents UI from updating
            await nextAnimationFrame();
            await this.$refs.plot.copyAsImage();

            this.rendering = false;
        },
        ignoreBefore(this: This) {
            if (this.selectedRun !== null) {
                const filteredRuns = applyFilters(this.history, this.view, { useLimits: false });
                const idx = filteredRuns.indexOf(this.selectedRun);
                this.view.skipRuns = { enabled: true, value: idx };
            }
        },
        discardRun(this: This) {
            if (this.selectedRun !== null) {
                this.history.discardRun(this.selectedRun);
            }
        }
    },
    template: `
        <b-tab-item :label="title" :id="id">
            <div class="flex flex-col gap-m">
                <view-settings :view="view"/>

                <milestone-controller :view="view"/>

                <plot ref="plot" :view="view" @select="(run) => { selectedRun = run }"/>

                <div class="flex flex-row flex-wrap justify-between">
                    <div class="flex flex-row gap-m">
                        <button class="button" @click="ignoreBefore" :disabled="selectedRun === null">Ignore previous runs</button>
                        <button class="button" @click="discardRun" :disabled="selectedRun === null">Discard run</button>
                    </div>

                    <div class="flex flex-row gap-m">
                        <button class="button" @click="asImage">
                            <span v-if="rendering">
                                Rendering...
                            </span>
                            <span v-else>
                                Copy as PNG
                            </span>
                        </button>
                        <button class="button" @click="cloneView">Clone</button>
                        <button class="button" @click="deleteView">Delete</button>
                    </div>
                </div>
            </div>
        </b-tab-item>
    `
};

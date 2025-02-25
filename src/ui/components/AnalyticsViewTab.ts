import { resets, universes } from "../../enums";
import { applyFilters } from "../../exports/historyFiltering";
import type { ConfigManager, View } from "../../config";
import type { HistoryManager, HistoryEntry } from "../../history";

import AnalyticsViewSettings from "./AnalyticsViewSettings";
import AnalyticsMilestoneController from "./AnalyticsMilestoneController";
import AnalyticsPlot from "./AnalyticsPlot";

type This = {
    $refs: {
        plot: {
            copyAsImage(): void
        }
    },
    config: ConfigManager,
    history: HistoryManager,
    view: View,
    selectedRun: HistoryEntry | null
}

export default {
    components: {
        AnalyticsViewSettings,
        AnalyticsMilestoneController,
        AnalyticsPlot
    },
    inject: ["config", "history"],
    props: ["view"],
    data(this: This) {
        return {
            selectedRun: null
        }
    },
    computed: {
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
        asImage(this: This) {
            this.$refs.plot.copyAsImage();
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
        <b-tab-item :label="title">
            <div class="flex flex-col gap-m">
                <analytics-view-settings :view="view"/>

                <analytics-milestone-controller :view="view"/>

                <analytics-plot ref="plot" :view="view" @select="(run) => { selectedRun = run }"/>

                <div class="flex flex-row flex-wrap justify-between">
                    <button class="button" @click="asImage">Copy as PNG</button>
                    <button class="button" @click="ignoreBefore" :disabled="selectedRun === null">Ignore previous runs</button>
                    <button class="button" @click="discardRun" :disabled="selectedRun === null">Discard run</button>
                    <button class="button" @click="deleteView">Delete view</button>
                </div>
            </div>
        </b-tab-item>
    `
};

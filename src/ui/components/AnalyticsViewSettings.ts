import { resets, universes, viewModes, additionalInformation } from "../../enums";
import type { View } from "../../config";

import AnalyticsEnumInput from "./AnalyticsEnumInput";
import AnalyticsNumberInput from "./AnalyticsNumberInput";
import AnalyticsToggleableNumberInput from "./AnalyticsToggleableNumberInput";

function optional(key: keyof View) {
    return {
        get() {
            return this.view[key];
        },
        set(value: any) {
            this.view[key] = value;
        }
    }
}

type This = {
    view: View
}

export default {
    components: {
        AnalyticsEnumInput,
        AnalyticsNumberInput,
        AnalyticsToggleableNumberInput
    },
    props: ["view"],
    data(this: This) {
        return {
            universes: { any: "Any", ...universes },
            viewModes,
            additionalInformation
        }
    },
    computed: {
        resets(this: This) {
            if (this.view.universe === "magic") {
                return { ...resets, blackhole: "Vacuum Collapse" };
            }
            else {
                return resets;
            }
        },
        universe: {
            get() {
                return this.view.universe ?? "any";
            },
            set(value: string) {
                this.view.universe = value === "any" ? undefined : value;
            }
        },
        starLevel: optional("starLevel"),
        daysScale: optional("daysScale"),
        includeCurrentRun: optional("includeCurrentRun"),
    },
    template: `
        <div class="flex flex-col flex-wrap gap-s">
            <div class="flex flex-row flex-wrap gap-s">
                <div class="flex flex-row flex-wrap gap-s">
                    <label>Reset type <analytics-enum-input v-model="view.resetType" :options="resets"/></label>
                    <label>Universe <analytics-enum-input v-model="universe" :options="universes"/></label>
                    <label>Star level <analytics-number-input v-model="starLevel" min="0" max="4" placeholder="Any"/></label>
                </div>
                <div class="flex flex-row flex-wrap gap-s">
                    <analytics-toggleable-number-input label="Skip first N runs" v-model="view.skipRuns" min="0" placeholder="None"/>
                    <analytics-toggleable-number-input label="Show last N runs" v-model="view.numRuns" min="1" placeholder="All"/>
                </div>
            </div>

            <div class="flex flex-row flex-wrap gap-s">
                <label>Mode <analytics-enum-input v-model="view.mode" :options="viewModes"/></label>
                <label>Days scale <analytics-number-input v-model="daysScale" min="1" placeholder="Auto"/></label>
                <template v-if="view.mode === 'timestamp'">
                    <label><input type="checkbox" v-model="view.showBars"> Bars</label>
                    <label><input type="checkbox" v-model="view.showLines"> Lines</label>
                    <template v-if="view.showLines">
                        <label><input type="checkbox" v-model="view.fillArea"> Fill area</label>
                        <label>Smoothness <input type="range" v-model="view.smoothness" min="0" max="100"></label>
                    </template>
                </template>
                <template v-else-if="view.mode === 'duration'">
                    <label>Smoothness <input type="range" v-model="view.smoothness" min="0" max="100"></label>
                </template>
            </div>

            <div class="flex flex-row flex-wrap gap-s">
                <span>Additional info:</span>
                <label><input type="checkbox" v-model="includeCurrentRun"> Current run</label>
                <label v-for="(label, key) in additionalInformation">
                    <input type="checkbox" :checked="view.additionalInfo.includes(key)" @input="() => view.toggleAdditionalInfo(key)">
                    {{ label }}
                </label>
            </div>
        </div>
    `
};

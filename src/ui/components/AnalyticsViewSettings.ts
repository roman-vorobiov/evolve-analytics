import { resets, universes, viewModes, additionalInformation } from "../../enums";
import type { View } from "../../config";

import AnalyticsEnumInput from "./AnalyticsEnumInput";
import AnalyticsNumberInput from "./AnalyticsNumberInput";
import AnalyticsToggleableNumberInput from "./AnalyticsToggleableNumberInput";

import Vue from "vue";

function optional<Key extends keyof View>(key: Key) {
    return {
        get() {
            return this.view[key];
        },
        set(value: View[Key]) {
            Vue.set(this.view, key, value)
        }
    }
}

type This = Vue & {
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
        <div class="flex flex-col flex-wrap gap-m">
            <div class="flex flex-row flex-wrap gap-m theme">
                <analytics-enum-input v-model="view.resetType" :options="resets">Reset type</analytics-enum-input>
                <analytics-enum-input v-model="universe" :options="universes">Universe</analytics-enum-input>
                <analytics-number-input v-model="starLevel" min="0" max="4" placeholder="Any">Star level</analytics-number-input>
            </div>

            <div class="flex flex-row flex-wrap gap-m theme">
                <analytics-number-input v-model="daysScale" min="1" placeholder="Auto">Days scale</analytics-number-input>
                <analytics-toggleable-number-input label="Skip first N runs" v-model="view.skipRuns" min="0" placeholder="None"/>
                <analytics-toggleable-number-input label="Show last N runs" v-model="view.numRuns" min="1" placeholder="All"/>
            </div>

            <div class="flex flex-row flex-wrap gap-m theme">
                <analytics-enum-input v-model="view.mode" :options="viewModes">Mode</analytics-enum-input>
                <template v-if="view.mode === 'timestamp'">
                    <b-checkbox v-model="view.showBars">Bars</b-checkbox>
                    <b-checkbox v-model="view.showLines">Lines</b-checkbox>
                    <template v-if="view.showLines">
                        <b-checkbox v-model="view.fillArea">Fill area</b-checkbox>
                        <div class="flex flex-row self-center">
                            <label style="vertical-align: middle">Smoothness</label>
                            <b-slider v-model="view.smoothness" :tooltip="false"/>
                        </div>
                    </template>
                </template>
                <template v-else-if="view.mode === 'duration'">
                    <div class="flex flex-row">
                        <label>Smoothness</label>
                        <b-slider v-model="view.smoothness" :tooltip="false"/>
                    </div>
                </template>
            </div>

            <div class="flex flex-row flex-wrap gap-m">
                <span>Additional info:</span>
                <b-checkbox v-model="includeCurrentRun">Current run</b-checkbox>
                <template v-for="(label, key) in additionalInformation">
                    <b-checkbox :checked="view.additionalInfo.includes(key)" @input="() => view.toggleAdditionalInfo(key)">{{ label }}</b-checkbox>
                </template>
            </div>
        </div>
    `
};

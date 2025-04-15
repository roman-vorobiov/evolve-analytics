import { resets, universes, viewModes, additionalInformation } from "../../enums";
import type { View } from "../../config";

import EnumInput from "./EnumInput";
import NumberInput from "./NumberInput";
import ToggleableNumberInput from "./ToggleableNumberInput";

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
        EnumInput,
        NumberInput,
        ToggleableNumberInput
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
                <enum-input v-model="view.resetType" :options="resets">Reset type</enum-input>
                <enum-input v-model="universe" :options="universes">Universe</enum-input>
                <number-input v-model="starLevel" min="0" max="4" placeholder="Any">Star level</number-input>
            </div>

            <div class="flex flex-row flex-wrap gap-m theme">
                <number-input v-model="daysScale" min="1" placeholder="Auto">Days scale</number-input>
                <toggleable-number-input label="Skip first N runs" v-model="view.skipRuns" min="0" placeholder="None"/>
                <toggleable-number-input label="Show last N runs" v-model="view.numRuns" min="1" placeholder="All"/>
            </div>

            <div class="flex flex-row flex-wrap gap-m theme">
                <enum-input v-model="view.mode" :options="viewModes">Mode</enum-input>
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
                    <b-checkbox v-model="view.additionalInfo" :native-value="key">{{ label }}</b-checkbox>
                </template>
            </div>
        </div>
    `
};

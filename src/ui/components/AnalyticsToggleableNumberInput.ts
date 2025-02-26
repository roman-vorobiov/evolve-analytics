import AnalyticsNumberInput from "./AnalyticsNumberInput";

export default {
    components: { AnalyticsNumberInput },
    props: ["label", "value", "placeholder", "min", "max"],
    template: `
        <div class="flex flex-row">
            <b-checkbox v-model="value.enabled" style="margin-right: 0.25em">{{ label }}</b-checkbox>
            <analytics-number-input v-model="value.value" :placeholder="placeholder" :min="min" :max="max"/>
        </div>
    `
};

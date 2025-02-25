import AnalyticsNumberInput from "./AnalyticsNumberInput";

export default {
    components: { AnalyticsNumberInput },
    props: ["label", "value", "placeholder", "min", "max"],
    template: `
        <label>
            <input type="checkbox" v-model="value.enabled">
            {{ label }}
            <analytics-number-input v-model="value.value" :disabled="!value.enabled" :placeholder="placeholder" :min="min" :max="max"/>
        </label>
    `
};

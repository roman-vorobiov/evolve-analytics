import NumberInput from "./NumberInput";

export default {
    components: { NumberInput },
    props: ["label", "value", "placeholder", "min", "max"],
    template: `
        <div class="flex flex-row">
            <b-checkbox v-model="value.enabled" style="margin-right: 0.25em">{{ label }}</b-checkbox>
            <number-input v-model="value.value" :placeholder="placeholder" :min="min" :max="max"/>
        </div>
    `
};

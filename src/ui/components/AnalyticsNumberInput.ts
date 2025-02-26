export default {
    props: ["value", "placeholder", "min", "max", "disabled"],
    methods: {
        add() {
            this.$refs.input.stepUp();
            this.onChange(this.$refs.input.value);
        },
        subtract() {
            this.$refs.input.stepDown();
            this.onChange(this.$refs.input.value);
        },
        onChange(rawValue: string) {
            const value = rawValue === "" ? undefined : rawValue;
            this.$emit("input", value);
        }
    },
    template: `
        <div class="flex">
            <label v-if="$slots.default" class="self-center" style="margin-right: 0.5rem">
                <slot/>
            </label>

            <span role="button" class="button has-text-danger sub" @click="subtract">-</span>
            <input
                ref="input"
                type="number"
                class="input"
                :value="value"
                @change="event => onChange(event.target.value)"
                :placeholder="placeholder"
                :min="min"
                :max="max"
                style="width: 4em"
            >
            <span role="button" class="button has-text-success add" @click="add">+</span>
        </div>
    `
};

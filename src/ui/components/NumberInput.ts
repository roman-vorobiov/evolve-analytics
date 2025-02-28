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
        onChange(rawValue: string | number) {
            if (rawValue === "") {
                this.$emit("input", undefined);
            }
            else {
                let value = Number(rawValue);

                if (this.min !== undefined) {
                    value = Math.max(this.min, value);
                }
                if (this.max !== undefined) {
                    value = Math.min(this.max, value);
                }

                if (value !== Number(rawValue)) {
                    this.$refs.input.value = value
                }

                this.$emit("input", value);
            }
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

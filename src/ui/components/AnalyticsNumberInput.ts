export default {
    props: ["value", "placeholder", "min", "max"],
    methods: {
        onChange(event: any) {
            const value = event.target.value === "" ? undefined : event.target.value;
            this.$emit("input", value);
        }
    },
    template: `
        <input
            type="number"
            :placeholder="placeholder"
            :min="min"
            :max="max"
            :value="value"
            @change="onChange"
            style="width: 60px"
        >
    `
};

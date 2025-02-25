export default {
    props: ["value", "options"],
    template: `
        <select :value="value" @input="$emit('input', $event.target.value)">
            <option v-for="(label, key) in options" :value="key" :selected="key === value">
                {{ label }}
            </option>
        </select>
    `
};

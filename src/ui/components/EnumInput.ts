export default {
    props: ["value", "options", "label"],
    template: `
        <div class="flex gap-s">
            <label class="self-center">
                <slot/>
            </label>
            <b-dropdown hoverable>
                <button class="button is-primary" slot="trigger">
                    <span>{{ options[value] }}</span>
                    <i class="fas fa-sort-down"></i>
                </button>
                <b-dropdown-item v-for="(label, key) in options" :key="key" @click="$emit('input', key)">{{ label }}</b-dropdown-item>
            </b-dropdown>
        </div>
    `
};

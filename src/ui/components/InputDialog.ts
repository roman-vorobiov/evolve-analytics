import Modal from "./Modal";

import Vue from "vue";

const InputDialog = {
    components: {
        Modal
    },
    props: ["value", "placeholder", "title"],
    data() {
        return {
            buffer: this.value
        }
    },
    methods: {
        apply() {
            this.$emit("input", this.buffer === "" ? undefined : this.buffer);
            this.$emit("close");
        },
        cancel() {
            this.$emit("close");
        }
    },
    async mounted() {
        await Vue.nextTick();
        this.$refs.input.focus();
    },
    template: `
        <modal :title="title" customClass="flex flex-col gap-m">
            <input
                ref="input"
                type="text"
                class="input"
                v-model="buffer"
                :placeholder="placeholder"
                @keyup.enter="apply"
            >

            <div class="flex flex-row gap-m justify-end">
                <button class="button" @click="cancel">Cancel</button>
                <button class="button" @click="apply">Apply</button>
            </div>
        </modal>
    `
};

function resolvePath(obj: any, path: string[]) {
    return path.reduce((self, key) => self && self[key], obj);
}

function getNested(obj: any, path: string) {
    return resolvePath(obj, path.split('.'));
}

function setNested(obj: any, path: string, value: any) {
    const keys = path.split('.');
    const lastKey = keys.pop()!;

    Vue.set(resolvePath(obj, keys), lastKey, value);
}

export function openInputDialog(self: any, binding: string, title: string, placeholder?: string) {
    self.$buefy.modal.open({
        parent: self,
        component: InputDialog,
        props: {
            value: getNested(self, binding),
            placeholder,
            title
        },
        events: {
            input: (value: string) => setNested(self, binding, value)
        }
    });
}

import { milestoneType } from "../../milestones";
import { makeColorPicker } from "../components/colorPicker";
import type { View } from "../../config";

import type { default as Vue, VNode } from "vue";

type This = Vue & {
    view: View,
    milestone: string,
    label: string,
    type: string,
    color: string,
    pendingColor: string | null,
    toggle(): void,
    changeColor(color: string): void
};

export default {
    props: ["view", "milestone", "label"],
    data() {
        return {
            pendingColor: null
        };
    },
    computed: {
        type(this: This) {
            return milestoneType(this.milestone);
        },
        enabled(this: This) {
            return this.view.milestones[this.milestone].enabled;
        },
        color(this: This) {
            return this.pendingColor ?? this.view.milestones[this.milestone].color;
        }
    },
    methods: {
        toggle(this: This) {
            this.view.toggleMilestone(this.milestone);
        },
        changeColor(this: This, color: string) {
            this.view.setMilestoneColor(this.milestone, color);
        }
    },
    directives: {
        colorPicker: {
            inserted(this: never, element: HTMLElement, _: any, vnode: VNode) {
                const self = vnode.context as This;

                makeColorPicker($(element), 3, {
                    currentColor: () => self.color,
                    onChange: (color) => {
                        self.pendingColor = color;
                        self.$emit("colorPreview", { milestone: self.milestone, label: self.label, color });
                    },
                    onSave: (color) => {
                        self.pendingColor = null;
                        self.changeColor(color);
                    },
                    onCancel: () => {
                        self.pendingColor = null;
                        self.$emit("colorPreview", null);
                    }
                });
            }
        }
    },
    template: `
        <span class="plot-swatch">
            <svg v-if="type === 'effect'" v-color-picker width="15" height="15" :stroke="color" fill-opacity="0">
                <rect width="100%" height="100%"></rect>
            </svg>

            <svg v-else-if="type === 'event'" v-color-picker width="15" height="15" :fill="color">
                <circle cx="50%" cy="50%" r="50%"></circle>
            </svg>

            <svg v-else v-color-picker width="15" height="15" :fill="color">
                <rect width="100%" height="100%"></rect>
            </svg>

            <span @click="toggle" :class="{ crossed: !enabled }">
                {{ label }}
            </span>
        </span>
    `
};

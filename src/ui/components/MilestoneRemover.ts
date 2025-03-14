import type { View } from "../../config";

import Sortable from "sortablejs";
import type Vue from "vue";
import { milestoneType } from "../../milestones";

type This = Vue & {
    view: View,
    remove(milestone: string): void
}

function removable(element: HTMLElement) {
    return milestoneType(element.getAttribute("data-milestone")!) !== "reset";
}

export default {
    props: ["view"],
    methods: {
        remove(this: This, milestone: string) {
            this.view.removeMilestone(milestone);
        }
    },
    mounted(this: This) {
        Sortable.create(this.$refs.container as HTMLElement, {
            ghostClass: "hidden",
            sort: false,
            group: {
                name: "milestones",
                pull: false,
                put: (to, from, element) => removable(element)
            },
            onAdd: (event) => {
                const milestone = event.item.getAttribute("data-milestone")!;
                this.remove(milestone);
            }
        });
    },
    template: `
        <div ref="container" class="slim market-item alt">
            <span>Drag here to remove</span>
        </div>
    `
};

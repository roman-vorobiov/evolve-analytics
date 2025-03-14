import { getSortedMilestones } from "../../exports/utils";
import { generateMilestoneNames } from "../../milestones";
import type { View } from "../../config";

import MilestoneSwatch from "./MilestoneSwatch";

import Sortable from "sortablejs";
import type Vue from "vue";

type This = Vue & {
    view: View,
    milestones: string[],
    milestoneNames: string[]
};

export default {
    components: {
        MilestoneSwatch
    },
    props: ["view"],
    computed: {
        milestones(this: This) {
            return getSortedMilestones(this.view);
        },
        milestoneNames(this: This) {
            return generateMilestoneNames(this.milestones, this.view.universe);
        },
        legend(this: This) {
            return this.$refs.container;
        }
    },
    mounted(this: This) {
        Sortable.create(this.$refs.container as HTMLElement, {
            group: "milestones",
            animation: 150,
            onStart: () => {
                this.$emit("drag", true);
            },
            onEnd: () => {
                this.$emit("drag", false);
            },
            onUpdate: ({ oldIndex, newIndex }) => {
                this.view.moveMilestone(oldIndex!, newIndex!);
            }
        });
    },
    template: `
        <div ref="container" class="plot-swatches plot-swatches-wrap">
            <milestone-swatch
                v-for="(milestone, idx) in milestones"
                :key="milestone"
                :view="view"
                :milestone="milestone"
                :label="milestoneNames[idx]"
                v-on="$listeners"
            />
        </div>
    `
};

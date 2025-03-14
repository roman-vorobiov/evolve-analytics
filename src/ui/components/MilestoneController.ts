import { buildings, techs, events, environmentEffects } from "../../enums";
import { BuildingInfo } from "../../enums/buildings";
import type { milestoneTypes } from "../../enums";
import type { View } from "../../config";
import type { HistoryManager } from "../../history";

import NumberInput from "./NumberInput";

import fuzzysort from "fuzzysort";
import type Vue from "vue";

type MilestoneOption = { type: keyof typeof milestoneTypes, id: string, label: string }

function makeMilestoneGroup(name: string, type: string, options: Record<string, string>) {
    return {
        type: name,
        options: Object.entries(options).map(([id, label]) => <MilestoneOption> { type, id, label })
    }
}

function* makeBuildingGroups() {
    const makeGroup = ([id, { name, region, suffix }]: [string, BuildingInfo]) => ({
        type: "built",
        prefix: region,
        id,
        label: name,
        suffix
    });

    yield {
        type: "Buildings",
        options: Object.entries(buildings).filter(([id]) => !id.startsWith("arpa-")).map(makeGroup)
    };

    yield {
        type: "Projects",
        options: Object.entries(buildings).filter(([id]) => id.startsWith("arpa-")).map(makeGroup)
    };
}

function makeResearchGroup() {
    const options = Object.entries(techs).map(([id, { name, era, suffix }]) => ({
        type: "tech",
        prefix: era,
        id,
        label: name,
        suffix
    }));

    return {
        type: "Research",
        options
    };
}

type This = Vue & {
    view: View,
    history: HistoryManager,
    input: string,
    selected: MilestoneOption | null,
    count: number,
    options: Array<{
        type: string,
        options: MilestoneOption[]
    }>,
    milestone: string | undefined
}

export default {
    components: {
        NumberInput
    },
    inject: ["history"],
    props: ["view"],
    data(this: This) {
        return {
            input: "",
            count: 1,
            selected: null,
            options: [
                ...makeBuildingGroups(),
                makeResearchGroup(),
                makeMilestoneGroup("Events", "event", events),
                makeMilestoneGroup("Effects", "effect", environmentEffects)
            ]
        }
    },
    computed: {
        filteredOptions(this: This) {
            return this.options
                .map(({ type, options }) => {
                    const candidates = fuzzysort.go(this.input, options, { key: "label", all: true });

                    const score = candidates.reduce((acc, { score }) => Math.max(acc, score), 0);

                    return {
                        type,
                        score,
                        options: candidates.map(c => c.obj)
                    }
                })
                .filter(({ options }) => options.length !== 0)
                .sort((l, r) => r.score - l.score);
        },
        milestone(this: This) {
            if (this.selected === null) {
                return;
            }

            let milestone = `${this.selected.type}:${this.selected.id}`;

            if (this.selected.type === "built") {
                milestone += `:${this.count}`;
            }

            return milestone;
        }
    },
    methods: {
        add(this: This) {
            if (this.milestone !== undefined) {
                this.view.addMilestone(this.milestone);
            }
        },
        sort(this: This) {
            this.view.sortMilestones(this.history);
        },
        resetColors(this: This) {
            this.view.resetColors();
            this.$emit("colorReset");
        }
    },
    template: `
        <div class="flex flex-row flex-wrap gap-s theme">
            <label class="self-center">Track:</label>
            <b-autocomplete
                v-model="input"
                @select="(option) => { selected = option }"
                :data="filteredOptions"
                field="label"
                group-field="type"
                group-options="options"
                open-on-focus
                placeholder="e.g. Launch Facility"
            >
                <template slot-scope="props">
                    <span v-if="props.option.prefix" style="opacity: 0.5">[{{ props.option.prefix }}]</span>
                    <span>{{ props.option.label }}</span>
                    <span v-if="props.option.suffix" style="opacity: 0.5">({{ props.option.suffix }})</span>
                </template>
            </b-autocomplete>
            <number-input v-if="selected?.type === 'built'" v-model="count" min="1"/>

            <button class="button slim" @click="add" :disabled="selected === null">Add</button>
            <button class="button slim" @click="sort">Auto sort</button>
            <button class="button slim" @click="resetColors">Reset colors</button>
        </div>
    `
};

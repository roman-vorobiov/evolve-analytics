import { buildings, techs, events, environmentEffects, milestoneTypes } from "../../enums";
import type { View } from "../../config";
import type { HistoryManager } from "../../history";

import NumberInput from "./NumberInput";

import fuzzysort from "fuzzysort";

type MilestoneOption = { type: keyof typeof milestoneTypes, id: string, label: string }

function makeMilestoneGroup(name: string, type: string, options: Record<string, string>) {
    return {
        type: name,
        options: Object.entries(options).map(([id, label]) => <MilestoneOption> { type, id, label })
    }
}

type This = {
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
                makeMilestoneGroup("Building/Project", "built", buildings),
                makeMilestoneGroup("Research", "tech", techs),
                makeMilestoneGroup("Event", "event", events),
                makeMilestoneGroup("Effect", "effect", environmentEffects)
            ]
        }
    },
    computed: {
        filteredOptions(this: This) {
            return this.options
                .map(({ type, options }) => ({
                    type,
                    options: fuzzysort.go(this.input, options, { key: "label", all: true }).map(c => c.obj)
                }))
                .filter(({ options }) => options.length !== 0);
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
        remove(this: This) {
            if (this.milestone !== undefined) {
                this.view.removeMilestone(this.milestone);
            }
        },
        sort(this: This) {
            this.view.sortMilestones(this.history);
        },
        resetColors(this: This) {
            this.view.resetColors();
        }
    },
    template: `
        <div class="flex flex-row flex-wrap gap-s theme">
            <label class="self-center">Track:</label>
            <b-autocomplete
                v-model="input"
                :data="filteredOptions"
                group-field="type"
                group-options="options"
                field="label"
                @select="(option) => { selected = option }"
                open-on-focus
                placeholder="e.g. Launch Facility"
            />
            <number-input v-if="selected?.type === 'built'" v-model="count" min="1"/>

            <button class="button slim" @click="add" :disabled="selected === null">Add</button>
            <button class="button slim" @click="remove" :disabled="selected === null">Remove</button>
            <button class="button slim" @click="sort">Auto sort</button>
            <button class="button slim" @click="resetColors">Reset colors</button>
        </div>
    `
};

import { Subscribable } from "./subscribable";
import { game } from "./game";

declare var $: any;

export type SerializedMilestone = any[];

export interface Milestone {
    name: string;

    get signature(): string;

    get complete(): boolean;

    serialize(): SerializedMilestone;
}

export class Milestone extends Subscribable implements Milestone {
    constructor(private _enabled: boolean = true) {
        super();
    }

    get enabled() {
        return this._enabled;
    }

    set enabled(value) {
        if (value !== this._enabled) {
            this._enabled = value;
            this.emit("update");
        }
    }
}

export class Building extends Milestone {
    constructor(
        public tab: string,
        public id: string,
        public name: string,
        public count: number = 1,
        enabled: boolean = true
    ) {
        super(enabled);
    }

    get signature() {
        return `${this.tab}-${this.id}:${this.count}`;
    }

    serialize() {
        return ["Built", this.tab, this.id, this.name, this.count, this.enabled];
    }

    get complete() {
        const instance = game.global[this.tab]?.[this.id];
        const count = this.tab === "arpa" ? instance?.rank : instance?.count;
        return (count ?? 0) >= this.count;
    }
};

export class Research extends Milestone {
    constructor(
        public id: string,
        public name: string,
        enabled: boolean = true
    ) {
        super(enabled);
    }

    get signature() {
        return `tech-${this.id}`;
    }

    serialize() {
        return ["Researched", this.id, this.name, this.enabled];
    }

    get complete() {
        return $(`#tech-${this.id} .oldTech`).length !== 0;
    }
};

export class EvolveEvent extends Milestone {
    impl: () => boolean;

    constructor(
        public name: string,
        enabled: boolean = true
    ) {
        super(enabled);

        if (name === "Womlings arrival") {
            this.impl = () => game.global.race.servants !== undefined;
        }
        else {
            this.impl = () => false;
        }
    }

    get signature() {
        return this.name;
    }

    serialize() {
        return ["Event", this.name, this.enabled];
    }

    get complete() {
        return this.impl();
    }
};

export class ResetMilestone extends Milestone {
    constructor(
        public name: string,
        enabled: boolean = true
    ) {
        super(enabled);
    }

    get signature() {
        return this.name;
    }

    serialize() {
        return ["Reset", this.name, this.enabled];
    }
};

export function milestoneFactory(type: string, ...args: any[]): Milestone {
    if (type === "Built") {
        return new (Building as any)(...args);
    }
    else if (type === "Researched") {
        return new (Research as any)(...args);
    }
    else if (type === "Event") {
        return new (EvolveEvent as any)(...args);
    }
    else if (type === "Reset") {
        return new (ResetMilestone as any)(...args);
    }
}

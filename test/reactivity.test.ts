import { describe, it, expect } from "@jest/globals";
import { makeConfig, makeCurrentRun, makeGameState, makeHistory, makeMilestones, makeView } from "./fixture";
import { nextDay } from "./runTracking.test";

import { Game } from "../src/game";
import { prepareCurrentRun } from "../src/pendingRun";
import { trackMilestones } from "../src/runTracking";

import { default as Vue, watch } from "vue";

describe("Reactivity", () => {
    it("should not notify if nothing happened", async () => {
        const config = makeConfig({});

        let invoked = false;
        config.watch(() => { invoked = true });

        await Vue.nextTick();
        expect(invoked).toBe(false);
    });

    it("should not notify if the value hasn't changed", async () => {
        const config = makeConfig({});

        let invoked = false;
        config.watch(() => { invoked = true });

        config.recordRuns = true;

        await Vue.nextTick();
        expect(invoked).toBe(false);
    });

    describe("Config", () => {
        it("should notice changes to direct properties", async () => {
            const config = makeConfig({});

            let invoked = false;
            config.watch(() => { invoked = true });

            config.recordRuns = false;

            await Vue.nextTick();
            expect(invoked).toBe(true);
        });

        it("should notice new views", async () => {
            const config = makeConfig({});

            let invoked = false;
            config.watch(() => { invoked = true });

            config.addView();

            await Vue.nextTick();
            expect(invoked).toBe(true);
        });

        it("should notice removal of views", async () => {
            const config = makeConfig({
                views: [makeView({})]
            });

            let invoked = false;
            config.watch(() => { invoked = true });

            config.removeView(config.views[0]);

            await Vue.nextTick();
            expect(invoked).toBe(true);
        });

        it("should notice changes to indirect properties", async () => {
            const config = makeConfig({
                views: [makeView({})]
            });

            let invoked = false;
            config.watch(() => { invoked = true });

            config.views[0].resetType = "aiappoc";

            await Vue.nextTick();
            expect(invoked).toBe(true);
        });

        it("should notice new milestones", async () => {
            const config = makeConfig({
                views: [makeView({})]
            });

            let invoked = false;
            config.watch(() => { invoked = true });

            config.views[0].addMilestone("tech:club");

            await Vue.nextTick();
            expect(invoked).toBe(true);
        });

        it("should notice removed milestones", async () => {
            const config = makeConfig({
                views: [
                    makeView({ milestones: makeMilestones(["tech:club"]) })
                ]
            });

            let invoked = false;
            config.watch(() => { invoked = true });

            config.views[0].removeMilestone("tech:club");

            await Vue.nextTick();
            expect(invoked).toBe(true);
        });
    });

    describe("History", () => {
        it("should notice new runs", async () => {
            const history = makeHistory({
                milestones: {},
                runs: []
            });

            let invoked = false;
            history.watch(() => { invoked = true });

            history.commitRun(makeCurrentRun({}));

            await Vue.nextTick();
            expect(invoked).toBe(true);
        });

        it("should notice removed runs", async () => {
            const history = makeHistory({
                milestones: {},
                runs: []
            });

            let invoked = false;
            history.watch(() => { invoked = true });

            history.commitRun(makeCurrentRun({}));

            await Vue.nextTick();
            expect(invoked).toBe(true);
        });
    });

    describe("Latest run", () => {
        it("should notice changes to direct properties", async () => {
            const game = new Game(makeGameState({}));
            const config = makeConfig({ game }, {});
            const history = makeHistory({ game }, {
                milestones: {},
                runs: []
            });

            const run = prepareCurrentRun(game, config, history);

            let invoked = false;
            watch(run, () => { invoked = true }, { deep: true });

            ++run.totalDays;

            await Vue.nextTick();
            expect(invoked).toBe(true);
        });

        it("should notice new optional properties", async () => {
            const evolve = makeGameState({});
            const game = new Game(evolve);
            const config = makeConfig({ game }, {});
            const history = makeHistory({ game }, {
                milestones: {},
                runs: []
            });

            const run = prepareCurrentRun(game, config, history);

            let invoked = false;
            watch(run, () => { invoked = true }, { deep: true });

            trackMilestones(run, game, config);

            nextDay(evolve);

            await Vue.nextTick();
            expect(invoked).toBe(true);
        });
    });
});

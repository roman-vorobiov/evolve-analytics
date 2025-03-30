// ==UserScript==
// @name         Evolve Analytics
// @namespace    http://tampermonkey.net/
// @version      0.15.12
// @description  Track and see detailed information about your runs
// @author       Sneed
// @match        https://pmotschmann.github.io/Evolve/
// @resource     PICKR_CSS https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/themes/classic.min.css
// @require      https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/pickr.min.js
// @require      https://cdn.jsdelivr.net/npm/fuzzysort@3.1.0/fuzzysort.min.js
// @require      https://cdn.jsdelivr.net/npm/sortablejs@1.15.6/Sortable.min.js
// @require      https://cdn.jsdelivr.net/npm/d3@7
// @require      https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.17
// @require      https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js
// @grant        GM_getResourceText
// @grant        GM_addStyle
// ==/UserScript==

/*global $ Plot htmlToImage LZString Pickr Vue fuzzysort Sortable*/

GM_addStyle(GM_getResourceText("PICKR_CSS"));

(async function () {
    'use strict';

    function makeDatabaseFunctions(key) {
        return [
            (obj) => localStorage.setItem(key, JSON.stringify(obj)),
            () => JSON.parse(localStorage.getItem(key) ?? "null"),
            () => localStorage.removeItem(key)
        ];
    }
    function makeEncodedDatabaseFunctions(key) {
        return [
            (obj) => localStorage.setItem(key, LZString.compressToBase64(JSON.stringify(obj))),
            () => {
                const raw = localStorage.getItem(key);
                if (raw === null) {
                    return null;
                }
                else if (raw.startsWith("{")) {
                    return JSON.parse(raw);
                }
                else {
                    return JSON.parse(LZString.decompressFromBase64(raw));
                }
            },
            () => localStorage.removeItem(key)
        ];
    }
    const [saveConfig, loadConfig, discardConfig] = makeDatabaseFunctions("sneed.analytics.config");
    const [saveHistory, loadHistory, discardHistory] = makeEncodedDatabaseFunctions("sneed.analytics.history");
    const [saveCurrentRun, loadLatestRun, discardLatestRun] = makeDatabaseFunctions("sneed.analytics.latest");

    function migrate4(config) {
        config.recordRuns ??= true;
        delete config.paused;
        config.lastOpenViewIndex = config.views.length !== 0 ? 0 : undefined;
        config.views = config.views.map(view => {
            return {
                additionalInfo: [],
                ...view
            };
        });
        config.version = 6;
    }

    function migrateLatestRun$2(latestRun) {
        if (latestRun.universe === "bigbang") {
            delete latestRun.universe;
        }
    }
    function migrateHistory$2(history) {
        for (let i = 0; i !== history.runs.length; ++i) {
            const run = history.runs[i];
            const nextRun = history.runs[i + 1];
            // The runs after a t3 reset may have gotten the "bigbang" universe as the page is refreshed into the universe selection
            if (run.universe === "bigbang") {
                if (nextRun === undefined) {
                    // The last run is broken - mark migration as failed and try after the next run
                    return false;
                }
                else if (nextRun.universe !== "bigbang") {
                    // If the next run has a valid universe, this means we stayed in the same universe
                    run.universe = nextRun.universe;
                }
                else {
                    // If there are multiple t3 runs in a row, assume DE farming, which is usually done in magic
                    run.universe = "magic";
                }
            }
        }
        return true;
    }
    function migrate6(config, history, latestRun) {
        if (latestRun !== null) {
            migrateLatestRun$2(latestRun);
        }
        if (migrateHistory$2(history)) {
            config.version = 7;
        }
    }

    function migrateView$3(view) {
        return {
            ...view,
            mode: ["segmented", "barsSegmented"].includes(view.mode) ? "duration" : "timestamp",
            smoothness: 0,
            showBars: ["bars", "barsSegmented"].includes(view.mode),
            showLines: ["total", "filled", "segmented"].includes(view.mode),
            fillArea: view.mode === "filled"
        };
    }
    function migrate7(config) {
        config.views = config.views.map(migrateView$3);
        config.version = 8;
    }

    function transformMap(obj, fn) {
        return Object.fromEntries(Object.entries(obj).map(([k, v], idx) => fn([k, v], idx)));
    }
    function filterMap(obj, fn) {
        return Object.fromEntries(Object.entries(obj).filter(fn));
    }
    function objectSubset(obj, keys) {
        return Object.fromEntries(keys.map(key => [key, obj[key]]));
    }
    function rotateMap(obj) {
        return transformMap(obj, ([k, v]) => [v, k]);
    }
    function zip(...lists) {
        const result = [];
        const length = Math.min(...lists.map(l => l.length));
        for (let i = 0; i !== length; ++i) {
            result.push(lists.map(l => l[i]));
        }
        return result;
    }
    function lastEntry(map, filter) {
        let filtered = Array.from(map);
        if (filter !== undefined) {
            filtered = filtered.filter(filter);
        }
        if (filtered.length !== 0) {
            return filtered[filtered.length - 1];
        }
    }
    function lastValue(map, filter) {
        let entry;
        if (filter !== undefined) {
            entry = lastEntry(map, ([k, v]) => filter(k));
        }
        else {
            entry = lastEntry(map);
        }
        return entry?.[1];
    }

    function patternMatcher(cases) {
        return (value) => {
            for (const [pattern, fn] of cases) {
                const match = value.match(pattern);
                if (match !== null) {
                    return fn.apply(null, match.slice(1));
                }
            }
        };
    }
    function patternMatch(value, cases) {
        return patternMatcher(cases)(value);
    }
    function compose(l, r) {
        return (...args) => l(...args) && r(...args);
    }
    function spy(obj, key, spy) {
        let original = obj[key];
        if (original instanceof Function) {
            obj[key] = (...args) => {
                spy(...args);
                return original(...args);
            };
        }
        else {
            Object.defineProperty(obj, key, {
                configurable: true,
                get: () => original,
                set: (value) => {
                    original = value;
                    spy();
                }
            });
        }
    }
    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
    function waitFocus() {
        return new Promise(resolve => {
            if (!document.hidden) {
                resolve();
            }
            else {
                document.addEventListener("visibilitychange", function impl() {
                    if (!document.hidden) {
                        document.removeEventListener("visibilitychange", impl);
                        resolve();
                    }
                });
            }
        });
    }
    function moveElement(list, from, to) {
        if (to !== from) {
            const item = list[from];
            list.splice(from, 1);
            list.splice(to, 0, item);
        }
    }

    function makeRenamingMigration(newVersion, from, to) {
        function rename(milestone) {
            return milestone.replace(from, to);
        }
        function migrateMilestones(milestones) {
            return transformMap(milestones, ([milestone, day]) => [rename(milestone), day]);
        }
        function migrateView(view) {
            view.milestones = migrateMilestones(view.milestones);
        }
        function migrateConfig(config) {
            for (const view of config.views) {
                migrateView(view);
            }
            config.version = newVersion;
        }
        function migrateHistory(history) {
            history.milestones = migrateMilestones(history.milestones);
        }
        function migrateLatestRun(latestRun) {
            latestRun.milestones = migrateMilestones(latestRun.milestones);
        }
        return function (config, history, latestRun) {
            migrateConfig(config);
            migrateHistory(history);
            if (latestRun !== null) {
                migrateLatestRun(latestRun);
            }
        };
    }

    const migrate8 = makeRenamingMigration(9, "harbour", "harbor");

    function migrateConfig$1(config) {
        config.version = 10;
    }
    function migrateLatestRun$1(latestRun) {
        latestRun.activeEffects = {};
        latestRun.effectsHistory = [];
    }
    function migrate9(config, latestRun) {
        migrateConfig$1(config);
        if (latestRun !== null) {
            migrateLatestRun$1(latestRun);
        }
    }

    function migrate10(config) {
        config.version = 11;
    }

    function migrateConfig(config) {
        config.version = 12;
    }
    function migrateHistory$1(history) {
        for (const run of history.runs) {
            for (const ref of run.milestones) {
                ref[1] = Math.max(0, ref[1]);
            }
        }
    }
    function migrateLatestRun(latestRun) {
        for (const [milestone, day] of Object.entries(latestRun.milestones)) {
            latestRun.milestones[milestone] = Math.max(0, day);
        }
    }
    function migrate11(config, history, latestRun) {
        migrateConfig(config);
        migrateHistory$1(history);
        if (latestRun !== null) {
            migrateLatestRun(latestRun);
        }
    }

    function getResetType$1(entry, milestonesByID) {
        const [milestoneID] = entry.milestones[entry.milestones.length - 1];
        const milestone = milestonesByID[milestoneID];
        const prefix = "reset:";
        if (milestone.startsWith(prefix)) {
            return milestone.slice(prefix.length);
        }
    }
    function shouldIncludeRun$1(entry, view, milestonesByID) {
        if (view.universe !== undefined && entry.universe !== view.universe) {
            return false;
        }
        if (view.starLevel !== undefined && entry.starLevel !== view.starLevel) {
            return false;
        }
        if (getResetType$1(entry, milestonesByID) !== view.resetType) {
            return false;
        }
        // Don't show VC runs in generic Black Hole views
        if (view.resetType === "blackhole" && view.universe === undefined) {
            return entry.universe !== "magic";
        }
        return true;
    }
    function getLastRun(history, view) {
        const milestonesByID = rotateMap(history.milestones);
        for (let i = history.runs.length - 1; i >= 0; --i) {
            const run = history.runs[i];
            if (shouldIncludeRun$1(run, view, milestonesByID)) {
                return run;
            }
        }
    }
    function sortMilestones$1(view, lastRun, history) {
        const milestones = Object.keys(view.milestones);
        function isEffectMilestone(milestone) {
            return milestone.startsWith("effect:");
        }
        milestones.sort((l, r) => {
            if (!isEffectMilestone(l) && !isEffectMilestone(r)) {
                const lIdx = lastRun.milestones.findIndex(([id]) => id === history.milestones[l]);
                const rIdx = lastRun.milestones.findIndex(([id]) => id === history.milestones[r]);
                return rIdx - lIdx;
            }
            else if (isEffectMilestone(l)) {
                return 1;
            }
            else {
                return -1;
            }
        });
        for (let i = 0; i != milestones.length; ++i) {
            const milestone = milestones[i];
            view.milestones[milestone].index = i;
        }
    }
    function migrateView$2(view, history) {
        const newView = {
            ...view,
            milestones: transformMap(view.milestones, ([milestone, enabled], index) => [milestone, { index, enabled }])
        };
        const lastRun = getLastRun(history, newView);
        if (lastRun !== undefined) {
            sortMilestones$1(newView, lastRun, history);
        }
        return newView;
    }
    function migrate12(config, history) {
        config.views = config.views.map(v => migrateView$2(v, history));
        config.version = 13;
    }

    const Observable10 = {
        "blue": "#4269d0",
        "orange": "#efb118",
        "red": "#ff725c",
        "cyan": "#6cc5b0",
        "green": "#3ca951",
        "pink": "#ff8ab7",
        "purple": "#a463f2",
        "lightBlue": "#97bbf5",
        "brown": "#9c6b4e",
        "gray": "#9498a0"
    };

    function migrateView$1(view) {
        const colors = Object.values(Observable10);
        const presets = {
            "effect:hot": Observable10.red,
            "effect:cold": Observable10.blue,
            "effect:inspired": Observable10.green,
            "effect:motivated": Observable10.orange
        };
        return {
            ...view,
            milestones: transformMap(view.milestones, ([milestone, { index, enabled }]) => {
                const color = presets[milestone] ?? colors[index % colors.length];
                return [milestone, { index, enabled, color }];
            })
        };
    }
    function migrate13(config) {
        config.views = config.views.map(v => migrateView$1(v));
        config.version = 14;
    }

    function migrateHistory(history) {
        const milestonesByID = rotateMap(history.milestones);
        const forced4Star = ["aiappoc", "matrix", "retire", "eden"];
        for (const run of history.runs) {
            if (forced4Star.includes(getResetType$1(run, milestonesByID))) {
                run.starLevel ??= 4;
            }
        }
    }
    function migrate14(config, history) {
        migrateHistory(history);
        config.version = 15;
    }

    function migrateView(view) {
        return {
            ...view,
            numRuns: { enabled: view.numRuns !== undefined, value: view.numRuns },
            skipRuns: { enabled: false }
        };
    }
    function migrate15(config) {
        config.views = config.views.map(v => migrateView(v));
        config.version = 16;
    }

    const migrate16 = makeRenamingMigration(17, "eden-abandoned_throne", "eden-throne");

    const VERSION = 17;
    function migrate() {
        let config = loadConfig();
        if (config === null) {
            return;
        }
        if (config.version >= VERSION) {
            return;
        }
        if (config.version < 4) {
            discardConfig();
            discardHistory();
            discardLatestRun();
            return;
        }
        let history = loadHistory();
        let latestRun = loadLatestRun();
        switch (config.version) {
            default:
                return;
            case 4:
            case 5:
                migrate4(config);
            case 6:
                migrate6(config, history, latestRun);
            case 7:
                migrate7(config);
            case 8:
                migrate8(config, history, latestRun);
            case 9:
                migrate9(config, latestRun);
            case 10:
                migrate10(config);
            case 11:
                migrate11(config, history, latestRun);
            case 12:
                migrate12(config, history);
            case 13:
                migrate13(config);
            case 14:
                migrate14(config, history);
            case 15:
                migrate15(config);
            case 16:
                migrate16(config, history, latestRun);
        }
        saveConfig(config);
        history !== null && saveHistory(history);
        latestRun !== null ? saveCurrentRun(latestRun) : discardLatestRun();
    }

    function synchronize() {
        const win = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
        return new Promise(resolve => {
            function impl() {
                if (win.evolve?.global?.stats !== undefined) {
                    resolve(win.evolve);
                }
                else {
                    setTimeout(impl, 100);
                }
            }
            impl();
        });
    }

    function checkOldTech({ actions, global }, tech) {
        let tch = actions.tech[tech].grant[0];
        if (global.tech[tch] && global.tech[tch] >= actions.tech[tech].grant[1]) {
            switch (tech) {
                case "fanaticism":
                    return Boolean(global.tech["fanaticism"]);
                case "anthropology":
                    return Boolean(global.tech["anthropology"]);
                case "deify":
                    return Boolean(global.tech["ancient_deify"]);
                case "study":
                    return Boolean(global.tech["ancient_study"]);
                case "isolation_protocol":
                    return Boolean(global.tech["isolation"]);
                case "focus_cure":
                    return Boolean(global.tech["focus_cure"]);
                case "vax_strat1":
                    return Boolean(global.tech["vax_p"]);
                case "vax_strat2":
                    return Boolean(global.tech["vax_f"]);
                case "vax_strat3":
                    return Boolean(global.tech["vax_s"]);
                case "vax_strat4":
                    return Boolean(global.tech["vax_c"]);
                default:
                    return true;
            }
        }
        return false;
    }

    function makeBuildingsInfo(data) {
        const entries = {};
        for (const [tab, regions] of Object.entries(data)) {
            for (const [region, buildings] of Object.entries(regions)) {
                for (const [id, entry] of Object.entries(buildings)) {
                    entries[`${tab}-${id}`] = entry instanceof Object ? { region, ...entry } : { region, name: entry };
                }
            }
        }
        return entries;
    }
    const buildings = makeBuildingsInfo({
        arpa: {
            "A.R.P.A.": {
                lhc: "Supercollider",
                stock_exchange: "Stock Exchange",
                tp_depot: "Depot",
                launch_facility: "Launch Facility",
                monument: "Monument",
                railway: "Railway",
                roid_eject: "Asteroid Redirect",
                nexus: "Nexus",
                syphon: "Mana Syphon"
            }
        },
        city: {
            "City": {
                bonfire: "Bonfire Pyre",
                firework: "Firework Factory",
                basic_housing: "Shanty",
                cottage: "Cottage",
                apartment: "Apartment",
                lodge: "Lodge",
                smokehouse: "Smokehouse",
                soul_well: "Soul Well",
                slave_pen: "Slave Pen",
                transmitter: "Transmitter",
                captive_housing: "Captive Housing",
                farm: "Farm",
                compost: "Compost Heap",
                mill: "Mill",
                windmill: "Windmill",
                silo: "Grain Silo",
                assembly: "Assembly Plant",
                garrison: "Barracks",
                hospital: "Hospital",
                boot_camp: "Boot Camp",
                shed: "Warehouse",
                storage_yard: "Freight Yard",
                warehouse: "Container Port",
                bank: "Bank",
                pylon: "Pylon",
                conceal_ward: "Concealing Ward",
                graveyard: "Graveyard",
                lumber_yard: "Lumber Yard",
                sawmill: "Sawmill",
                rock_quarry: "Rock Quarry",
                cement_plant: "Cement Plant",
                foundry: "Foundry",
                factory: "Factory",
                nanite_factory: "Nanite Factory",
                smelter: "Smelter",
                metal_refinery: "Metal Refinery",
                mine: "Mine",
                coal_mine: "Coal Mine",
                oil_well: "Oil Derrick",
                oil_depot: "Fuel Depot",
                trade: "Trade Post",
                wharf: "Wharf",
                tourist_center: "Tourist Center",
                amphitheatre: "Amphitheatre",
                casino: "Casino",
                temple: "Temple",
                wonder_lighthouse: "Lighthouse",
                wonder_pyramid: "Pyramid",
                shrine: "Shrine",
                meditation: "Meditation Chamber",
                banquet: "Banquet Hall",
                university: "University",
                library: "Library",
                wardenclyffe: "Wardenclyffe",
                biolab: "Bioscience Lab",
                coal_power: "Coal Powerplant",
                oil_power: "Oil Powerplant",
                fission_power: "Fission Reactor",
                mass_driver: "Mass Driver",
                replicator: "Matter Replicator"
            }
        },
        space: {
            "Earth's Orbit": {
                test_launch: "Test Launch",
                satellite: "Satellite",
                gps: "GPS Satellite",
                propellant_depot: "Propellant Depot",
                nav_beacon: "Navigation Beacon"
            },
            "Moon": {
                moon_mission: "Moon Launch",
                moon_base: "Moon Base",
                iridium_mine: "Iridium Mine",
                helium_mine: "Helium-3 Mine",
                observatory: "Observatory"
            },
            "Red Planet": {
                red_mission: "Red Planet Mission",
                spaceport: "Spaceport",
                red_tower: "Space Control",
                captive_housing: { name: "Captive Housing", prefix: "Space", suffix: "Cataclysm" },
                terraformer: "Atmosphere Terraformer",
                atmo_terraformer: { name: "Atmosphere Terraformer", suffix: "Complete" },
                terraform: "Terraform",
                assembly: { name: "Assembly Plant", prefix: "Space", suffix: "Cataclysm" },
                living_quarters: "Living Quarters",
                pylon: "Cracked Pylon",
                vr_center: "VR Center",
                garage: "Garage",
                red_mine: { name: "Mine", prefix: "Space" },
                fabrication: "Fabrication",
                red_factory: { name: "Factory", prefix: "Space" },
                nanite_factory: { name: "Nanite Factory", prefix: "Space", suffix: "Cataclysm" },
                biodome: "Biodome",
                red_university: { name: "University", prefix: "Space", suffix: "Orbital Decay" },
                exotic_lab: "Exotic Materials Lab",
                ziggurat: "Ziggurat",
                space_barracks: "Marine Garrison",
                wonder_statue: "Colossus",
                bonfire: { name: "Bonfire Pyre", prefix: "Space", suffix: "Cataclysm" }
            },
            "Hell Planet": {
                hell_mission: "Hell Planet Mission",
                geothermal: "Geothermal Plant",
                hell_smelter: "Smelter",
                spc_casino: { name: "Casino", prefix: "Space" },
                swarm_plant: "Swarm Plant",
                firework: { name: "Firework Factory", prefix: "Space", suffix: "Cataclysm" }
            },
            "Sun": {
                sun_mission: "Sun Mission",
                swarm_control: "Control Station",
                swarm_satellite: "Swarm Satellite",
                jump_gate: { name: "Jump Gate", prefix: "Space" }
            },
            "Gas Giant": {
                gas_mission: "Gas Giant Mission",
                gas_mining: "Helium-3 Collector",
                gas_storage: "Fuel Depot",
                star_dock: "Space Dock"
            },
            "Gas Giant's Moon": {
                gas_moon_mission: "Gas Giant's Moon Mission",
                outpost: "Mining Outpost",
                drone: "Mining Drone",
                oil_extractor: "Oil Extractor"
            },
            "Asteroid Belt": {
                belt_mission: "Asteroid Belt Mission",
                space_station: "Space Station",
                elerium_ship: "Elerium Mining Ship",
                iridium_ship: "Iridium Mining Ship",
                iron_ship: "Iron Mining Ship"
            },
            "Dwarf Planet": {
                dwarf_mission: "Dwarf Planet Mission",
                elerium_contain: "Elerium Storage",
                e_reactor: "Elerium Reactor",
                world_collider: "World Collider",
                world_controller: { name: "World Collider", suffix: "Complete" },
                shipyard: "Ship Yard",
                mass_relay: "Mass Relay",
                m_relay: { name: "Mass Relay", suffix: "Complete" }
            },
            "Titan": {
                titan_mission: "Titan Mission",
                titan_spaceport: { name: "Spaceport", prefix: "Titan" },
                electrolysis: "Electrolysis Plant",
                hydrogen_plant: "Hydrogen Plant",
                titan_quarters: "Habitat",
                titan_mine: { name: "Mine", prefix: "Titan" },
                storehouse: "Storehouse",
                titan_bank: { name: "Bank", prefix: "Space" },
                g_factory: "Graphene Plant",
                sam: "SAM Site",
                decoder: "Decoder",
                ai_core: "AI Super Core",
                ai_core2: { name: "AI Super Core", suffix: "Complete" },
                ai_colonist: "Artificial Colonist",
                wonder_gardens: "Hanging Gardens of Titan"
            },
            "Enceladus": {
                enceladus_mission: "Enceladus Mission",
                water_freighter: "Water Freighter",
                zero_g_lab: "Zero Gravity Lab",
                operating_base: "Operating Base",
                munitions_depot: "Munitions Depot"
            },
            "Triton": {
                triton_mission: "Triton Mission",
                fob: "Forward Base",
                lander: "Troop Lander",
                crashed_ship: "Derelict Ship"
            },
            "Kuiper Belt": {
                kuiper_mission: "Kuiper Belt Mission",
                orichalcum_mine: "Orichalcum Mine",
                uranium_mine: "Uranium Mine",
                neutronium_mine: "Neutronium Mine",
                elerium_mine: "Elerium Mine"
            },
            "Eris": {
                eris_mission: "Eris Mission",
                drone_control: "Titan Control Relay",
                shock_trooper: "Android Trooper",
                tank: "Tank",
                digsite: "Digsite"
            }
        },
        starDock: {
            "Star Dock": {
                probes: "Space Probe",
                geck: "G.E.C.K.",
                seeder: "Bioseeder Ship",
                prep_ship: "Prep Ship",
                launch_ship: "Launch Ship"
            }
        },
        interstellar: {
            "Alpha Centauri": {
                alpha_mission: "Alpha Centauri Mission",
                starport: "Starport",
                habitat: "Habitat",
                mining_droid: "Mining Droid",
                processing: "Processing Facility",
                fusion: "Fusion Reactor",
                laboratory: "Laboratory",
                exchange: "Galactic Exchange",
                g_factory: "Graphene Plant",
                int_factory: "Mega Factory",
                luxury_condo: "Luxury Condo",
                zoo: "Exotic Zoo",
                warehouse: { name: "Warehouse", prefix: "Space" },
                wonder_gardens: "Hanging Gardens"
            },
            "Proxima Centauri": {
                proxima_mission: "Proxima Centauri Mission",
                xfer_station: "Transfer Station",
                cargo_yard: "Cargo Yard",
                cruiser: "Patrol Cruiser",
                dyson: "Dyson Net",
                dyson_sphere: { name: "Dyson Sphere", suffix: "Bolognium" },
                orichalcum_sphere: { name: "Dyson Sphere", suffix: "Orichalcum" },
                elysanite_sphere: { name: "Dyson Sphere", suffix: "Elysanite" }
            },
            "Helix Nebula": {
                nebula_mission: "Helix Nebula Mission",
                nexus: "Nexus Station",
                harvester: "Gas Harvester",
                elerium_prospector: "Elerium Prospector"
            },
            "Neutron Star": {
                neutron_mission: "Neutron Star Mission",
                neutron_miner: "Neutron Miner",
                citadel: "Citadel Station",
                stellar_forge: "Stellar Forge"
            },
            "Black Hole": {
                blackhole_mission: "Black Hole Mission",
                far_reach: "Farpoint",
                stellar_engine: "Stellar Engine",
                mass_ejector: "Mass Ejector",
                jump_ship: "Jump Ship",
                wormhole_mission: "Wormhole Mission",
                stargate: "Stargate",
                s_gate: { name: "Stargate", suffix: "Complete" }
            },
            "Sirius": {
                sirius_mission: "Sirius Mission",
                sirius_b: "Sirius B Analysis",
                space_elevator: "Space Elevator",
                gravity_dome: "Gravity Dome",
                ascension_machine: "Ascension Machine",
                ascension_trigger: { name: "Ascension Machine", suffix: "Complete" },
                ascend: "Ascend",
                thermal_collector: "Thermal Collector"
            }
        },
        galaxy: {
            "Gateway System": {
                gateway_mission: "Gateway Mission",
                starbase: "Starbase",
                ship_dock: "Ship Dock",
                bolognium_ship: "Bolognium Ship",
                scout_ship: "Scout Ship",
                corvette_ship: "Corvette Ship",
                frigate_ship: "Frigate Ship",
                cruiser_ship: "Cruiser Ship",
                dreadnought: "Dreadnought"
            },
            "Stargate Region": {
                gateway_station: "Gateway Station",
                telemetry_beacon: "Telemetry Beacon",
                gateway_depot: { name: "Depot", prefix: "Galaxy" },
                defense_platform: "Defense Platform"
            },
            "Gorddon System": {
                gorddon_mission: "Second Contact",
                embassy: "Embassy",
                dormitory: "Dormitory",
                symposium: "Symposium",
                freighter: "Freighter"
            },
            "Alien 1 System": {
                consulate: "Consulate",
                resort: "Resort",
                vitreloy_plant: "Vitreloy Plant",
                super_freighter: "Super Freighter"
            },
            "Alien 2 System": {
                alien2_mission: "Alien 2 Assault Mission",
                foothold: "Foothold Station",
                armed_miner: "Armed Mining Ship",
                ore_processor: "Ore Processor",
                scavenger: "Tech Scavenger"
            },
            "Chthonian System": {
                chthonian_mission: "Chthonian Assault Mission",
                minelayer: "Minelayer",
                excavator: "Excavator",
                raider: "Corsair"
            }
        },
        portal: {
            "Fortress": {
                turret: "Automated Turret",
                carport: "Surveyor Carport",
                war_droid: "War Droid",
                repair_droid: "Repair Droid"
            },
            "Badlands": {
                war_drone: "Predator Drone",
                sensor_drone: "Sensor Drone",
                attractor: "Attractor Beacon"
            },
            "The Pit": {
                pit_mission: "Scout the Pit",
                assault_forge: "Secure the Pit",
                soul_forge: "Soul Forge",
                gun_emplacement: "Gun Emplacement",
                soul_attractor: "Soul Attractor",
                soul_capacitor: "Soul Capacitor",
                absorption_chamber: "Absorption Chamber"
            },
            "Ancient Ruins": {
                ruins_mission: "Survey Ruins",
                guard_post: "Guard Post",
                vault: "Vault",
                archaeology: "Archaeological Dig",
                arcology: "Arcology",
                hell_forge: "Infernal Forge",
                inferno_power: "Inferno Reactor",
                ancient_pillars: "Ancient Pillars"
            },
            "Ancient Gate": {
                gate_mission: "Gate Investigation",
                west_tower: "West Tower",
                east_tower: "East Tower",
                gate_turret: "Gate Turret",
                infernite_mine: "Infernite Mine"
            },
            "Boiling Lake of Blood": {
                lake_mission: "Scout the Lake Shore",
                harbor: "Harbor",
                cooling_tower: "Cooling Tower",
                bireme: "Bireme Warship",
                transport: "Transport",
                oven: "Soul-Vide Cooker",
                oven_complete: { name: "Soul-Vide Cooker", suffix: "Complete" },
                devilish_dish: "Devilish Dish",
                dish_soul_steeper: "Soul Steeper",
                dish_life_infuser: "Life Infuser"
            },
            "The Spire": {
                spire_mission: "Scout the Island",
                purifier: "Purifier",
                port: "Port",
                base_camp: "Base Camp",
                bridge: "Bridge",
                sphinx: "Sphinx",
                bribe_sphinx: "Bribe Sphinx",
                spire_survey: "Survey the Tower",
                mechbay: "Mech Bay",
                spire: "The Spire",
                waygate: "Waygate",
                edenic_gate: "Edenic Waygate"
            }
        },
        tauceti: {
            "Tau Ceti": {
                ringworld: "Ringworld",
                matrix: "Matrix",
                blue_pill: "Enter the Matrix",
                goe_facility: "Garden of Eden Facility"
            },
            "New Home": {
                home_mission: "Survey New Home",
                dismantle: "Dismantle Ship",
                orbital_station: "Orbital Station",
                colony: "Colony",
                tau_housing: { name: "Shanty", prefix: "Tau Ceti" },
                captive_housing: { name: "Captive Housing", prefix: "Tau Ceti" },
                pylon: "Tau Pylon",
                cloning_facility: "Cloning Facility",
                bonfire: { name: "Bonfire Pyre", prefix: "Tau Ceti" },
                firework: { name: "Firework Factory", prefix: "Tau Ceti" },
                assembly: { name: "Assembly Plant", prefix: "Tau Ceti" },
                nanite_factory: { name: "Nanite Factory", prefix: "Tau Ceti" },
                tau_farm: "High-Tech Farm",
                mining_pit: "Mining Pit",
                excavate: "Excavate Outpost",
                alien_outpost: "Alien Outpost",
                jump_gate: { name: "Jump Gate", prefix: "Tau Ceti" },
                fusion_generator: "Fusion Generator",
                repository: "Repository",
                tau_factory: "High-Tech Factory",
                infectious_disease_lab: "Infectious Disease Lab",
                tauceti_casino: { name: "Casino", prefix: "Tau Ceti" },
                tau_cultural_center: "Cultural Center"
            },
            "Red Planet": {
                red_mission: "Survey Red Planet",
                orbital_platform: "Orbital Platform",
                contact: "Contact the Womlings",
                introduce: "Get Introduction",
                subjugate: "Subjugate the Womlings",
                jeff: "Jeff",
                overseer: "Emissary",
                womling_village: "Womling Village",
                womling_farm: "Womling Farm",
                womling_mine: "Womling Mine",
                womling_fun: "Tavern",
                womling_lab: "Laboratory"
            },
            "Gas Giant": {
                gas_contest: "Gas Giant Naming Contest",
                refueling_station: "Refueling Station",
                ore_refinery: "Ore Refinery",
                whaling_station: "Whale Processor",
                womling_station: "Womling Station",
                "gas_contest-a1": "New Jupiter",
                "gas_contest-a2": "Gas Marble",
                "gas_contest-a3": "Billiard Ball",
                "gas_contest-a4": "Fat Human",
                "gas_contest-a5": "Q-Ball",
                "gas_contest-a6": "Big Balloon",
                "gas_contest-a7": "One Ball Barry",
                "gas_contest-a8": "Gas Giant"
            },
            "Asteroid Belt": {
                roid_mission: "Asteroid Belt Mission",
                patrol_ship: "Patrol Ship",
                mining_ship: "Extractor Ship",
                whaling_ship: "Whaling Ship"
            },
            "Gas Giant 2": {
                gas_contest2: "Gas Giant 2 Naming Contest",
                alien_station_survey: { name: "Alien Space Station", suffix: "Survey" },
                alien_station: "Alien Space Station",
                alien_space_station: { name: "Alien Space Station", suffix: "Complete" },
                matrioshka_brain: "Matrioshka Brain",
                ignition_device: "Ignition Device",
                ignite_gas_giant: "Ignite Gas Giant 2",
                "gas_contest-b1": "Grand Jupiter",
                "gas_contest-b2": "Urectum",
                "gas_contest-b3": "GassyMcGasFace",
                "gas_contest-b4": "Big Jupiter",
                "gas_contest-b5": "Not Jupiter",
                "gas_contest-b6": "Dust Devil",
                "gas_contest-b7": "Ringless Saturn",
                "gas_contest-b8": "Gas Giant 2"
            }
        },
        eden: {
            "Asphodel Meadows": {
                survery_meadows: "Survey Meadows",
                encampment: "Encampment",
                soul_engine: "Soul Engine",
                mech_station: "Mech Station",
                asphodel_harvester: "Asphodel Harvester",
                ectoplasm_processor: "Muon Processor",
                research_station: "Magisterium",
                warehouse: { name: "Warehouse", prefix: "Eden" },
                stabilizer: "Stabilizer",
                rune_gate: "Rune Gate",
                rune_gate_open: { name: "Rune Gate", suffix: "Complete" },
                bunker: "Bunker",
                bliss_den: "Bliss Den",
                rectory: "Rectory"
            },
            "Elysium Fields": {
                survey_fields: "Survey Fields",
                fortress: "Celestial Fortress",
                siege_fortress: "Siege Fortress",
                raid_supplies: "Raid Supplies",
                ambush_patrol: "Ambush Patrol",
                ruined_fortress: "Ruined Fortress",
                scout_elysium: "Scout Elysium Fields",
                fire_support_base: "Fire Support Base",
                elysanite_mine: "Elysanite Mine",
                sacred_smelter: "Sacred Smelter",
                elerium_containment: "Elerium Containment",
                pillbox: "Pillbox",
                restaurant: "Restaurant of Eternity",
                eternal_bank: "Eternal Bank",
                archive: "Archive of the Ancients",
                north_pier: "North Pier",
                rushmore: "Mount Rushmore",
                reincarnation: "Reincarnation Machine",
                eden_cement: { name: "Cement Plant", prefix: "Eden" }
            },
            "Isle of the Blessed": {
                south_pier: "South Pier",
                west_tower: "West Rampart",
                isle_garrison: "Angelic Garrison",
                east_tower: "East Rampart",
                spirit_vacuum: "Spirit Vacuum",
                spirit_battery: "Spirit Battery",
                soul_compactor: "Soul Compactor"
            },
            "Palace of Eternity": {
                scout_palace: "Scout Palace",
                throne: "Abandoned Throne",
                infuser: "Divinity Infuser",
                apotheosis: "Start Infusion",
                conduit: "Energy Conduit",
                tomb: "Tomb of the Dead God"
            }
        }
    });

    const segments = {
        "space-terraformer": 100,
        "space-jump_gate": 100,
        "starDock-seeder": 100,
        "space-world_collider": 1859,
        "space-mass_relay": 100,
        "space-ai_core": 100,
        "tauceti-ringworld": 1000,
        "tauceti-jump_gate": 100,
        "tauceti-alien_station": 100,
        "tauceti-matrioshka_brain": 1000,
        "tauceti-ignition_device": 10,
        "interstellar-dyson": 100,
        "interstellar-dyson_sphere": 100,
        "interstellar-orichalcum_sphere": 100,
        "interstellar-stellar_engine": 100,
        "interstellar-stargate": 200,
        "interstellar-space_elevator": 100,
        "interstellar-gravity_dome": 100,
        "interstellar-ascension_machine": 100,
        "portal-east_tower": 388,
        "portal-west_tower": 388,
        "eden-mech_station": 10,
        "eden-rune_gate": 100,
        "eden-fire_support_base": 100,
        "eden-north_pier": 10,
        "eden-south_pier": 10,
        "eden-infuser": 25,
        "eden-conduit": 25,
        "eden-tomb": 10
    };

    function makeTechInfo(data) {
        const entries = {};
        for (const [era, techs] of Object.entries(data)) {
            for (const [id, entry] of Object.entries(techs)) {
                entries[id] = entry instanceof Object ? { era, ...entry } : { era, name: entry };
            }
        }
        return entries;
    }
    const techs = makeTechInfo({
        "Primitive": {
            club: "Club",
            bone_tools: { name: "Bone Tools", suffix: "Evil" },
            wooden_tools: "Wooden Tools",
            sundial: "Sundial",
            wheel: { name: "Wheel", suffix: "Gravity Well" }
        },
        "Civilized": {
            wagon: { name: "Wagon", suffix: "Gravity Well" },
            housing: "Housing",
            cottage: "Cottage",
            aphrodisiac: "Aphrodisiac",
            captive_housing: { name: "Captive Housing", suffix: "Unfathomable" },
            torture: { name: "Torment", suffix: "Unfathomable" },
            thrall_quarters: { name: "Thrall Quarters", suffix: "Unfathomable" },
            minor_wish: { name: "Limited Wish", suffix: "Wish" },
            major_wish: { name: "Greater Wish", suffix: "Wish" },
            psychic_energy: { name: "Psychic Energy", suffix: "Psychic" },
            psychic_attack: { name: "Psychic Assault", suffix: "Psychic" },
            psychic_finance: { name: "Psychic Finance", suffix: "Psychic" },
            mind_break: { name: "Psychic Mind Break", suffix: "Psychic" },
            psychic_stun: { name: "Psychic Stun", suffix: "Psychic" },
            spear: { name: "Flint Spear", suffix: "Forager" },
            bronze_spear: { name: "Bronze Spear", suffix: "Forager" },
            iron_spear: { name: "Iron Spear", suffix: "Forager" },
            dowsing_rod: { name: "Dowsing Rod", suffix: "Forager" },
            metal_detector: { name: "Metal Detector", suffix: "Forager" },
            smokehouse: { name: "Smokehouse", suffix: "Carnivore" },
            lodge: { name: "Hunting Lodge", suffix: "Carnivore" },
            alt_lodge: "Lodge",
            soul_well: { name: "Soul Well", suffix: "Soul Eater" },
            compost: { name: "Composting", suffix: "Detritivore" },
            hot_compost: { name: "Hot Composting", suffix: "Detritivore" },
            mulching: { name: "Mulching", suffix: "Detritivore" },
            agriculture: "Agriculture",
            farm_house: "Farm Houses",
            irrigation: "Irrigation",
            silo: "Grain Silo",
            mill: "Grain Mill",
            foundry: "Foundry",
            artisans: "Artisans",
            apprentices: "Apprentices",
            carpentry: "Carpentry",
            theatre: "Theatre",
            playwright: "Playwright",
            mining: "Mining",
            bayer_process: "Bayer Process",
            smelting: "Smelting",
            steel: "Crucible Steel",
            metal_working: "Metal Working",
            iron_mining: "Iron Mining",
            coal_mining: "Coal Mining",
            storage: "Basic Storage",
            reinforced_shed: "Reinforced Sheds",
            containerization: "Containerization",
            reinforced_crates: "Reinforced Crates",
            evil_planning: { name: "Urban Planning", suffix: "Terrifying" },
            urban_planning: "Urban Planning",
            assistant: "Personal Assistant",
            government: "Government",
            theocracy: "Theocracy",
            governor: "Governor",
            spy: "Spies",
            currency: "Currency",
            market: "Marketplace",
            tax_rates: "Tax Rates",
            large_trades: "Large Volume Trading",
            trade: "Trade Routes",
            banking: "Banking",
            investing: "Investing",
            vault: "Bank Vault",
            bonds: "Savings Bonds",
            steel_vault: "Steel Vault",
            science: "Scientific Method",
            library: "Dewey Decimal System",
            thesis: "Thesis Papers",
            research_grant: "Research Grant",
            reclaimer: { name: "Reclaimers", suffix: "Evil" },
            shovel: { name: "Shovel", suffix: "Evil" },
            iron_shovel: { name: "Iron Shovel", suffix: "Evil" },
            stone_axe: "Primitive Axes",
            copper_axes: "Bronze Axe",
            iron_saw: "Sawmills",
            iron_axes: "Iron Axe",
            copper_sledgehammer: "Bronze Sledgehammer",
            iron_sledgehammer: "Iron Sledgehammer",
            copper_pickaxe: "Bronze Pickaxe",
            iron_pickaxe: "Iron Pickaxe",
            copper_hoe: "Bronze Hoes",
            iron_hoe: "Iron Hoes",
            slave_pens: { name: "Slave Pen", suffix: "Slaver" },
            ceremonial_dagger: { name: "Ceremonial Dagger", suffix: "Cannibalize" },
            last_rites: { name: "Last Rites", suffix: "Cannibalize" },
            garrison: "Garrison",
            mercs: "Mercenaries",
            hospital: "Hospital",
            bows: "Bows",
            flintlock_rifle: "Flintlock Rifle",
            armor: "Leather Armor",
            plate_armor: "Plate Armor",
            black_powder: "Black Powder",
            dynamite: "Dynamite",
            cement: "Cement",
            rebar: "Rebar",
            steel_rebar: "Steel Rebar",
            theology: "Theology",
            fanaticism: "Fanaticism",
            alt_fanaticism: { name: "Fanaticism", suffix: "Post-Transcendence" },
            indoctrination: "Indoctrination",
            anthropology: "Anthropology",
            alt_anthropology: { name: "Anthropology", suffix: "Post-Transcendence" },
            mythology: "Mythology",
            mana: "Mana",
            ley_lines: "Ley Lines",
            rituals: "Rituals",
            clerics: "Clerics",
            conjuring: "Conjuring",
            res_conjuring: "Resource Conjuring",
            secret_society: "Secret Society",
            cultists: { name: "Cultists", suffix: "Witch Hunter" },
            might: "Might Makes Right"
        },
        "Discovery": {
            steam_engine: { name: "Steam Engine", suffix: "Gravity Well" },
            apartment: "Apartment",
            steel_beams: "Steel Beams",
            adv_mulching: { name: "Advanced Mulching", suffix: "Detritivore" },
            windmill: "Windmill",
            demonic_craftsman: { name: "Master Crafter", suffix: "Evil" },
            master_craftsman: "Master Crafter",
            brickworks: "Brickworks",
            banquet: "Banquet",
            magic: "Techno Wizards",
            radio: "Radio",
            blast_furnace: "Blast Furnace",
            bessemer_process: "Bessemer Process",
            barns: "Barns",
            cranes: "Cranes",
            steel_containers: "Steel Containers",
            gantry_crane: "Gantry Cranes",
            republic: "Republic",
            socialist: "Socialist",
            espionage: "Espionage",
            spy_training: "Spy Training Facility",
            spy_gadgets: "Spy Gadgets",
            diplomacy: "Diplomacy",
            eebonds: "Series EE Bonds",
            home_safe: "House Safe",
            mad_science: "Mad Science",
            electricity: "Electricity",
            matter_replicator: "Matter Replicator",
            mine_conveyor: "Mine Conveyor Belts",
            steel_shovel: { name: "Steel Shovel", suffix: "Evil" },
            steel_saw: "Steel Saws",
            steel_axes: "Steel Axe",
            steel_sledgehammer: "Steel Sledgehammer",
            steel_pickaxe: "Steel Pickaxe",
            jackhammer: "Jackhammer",
            steel_hoe: "Steel Hoes",
            slave_market: { name: "Slave Market", suffix: "Slaver" },
            boot_camp: "Boot Camp",
            missionary: "Missionary",
            zealotry: "Zealotry",
            archaeology: "Archaeology",
            merchandising: "Merchandising",
            crafting_ritual: "Crafting Rituals",
            alchemy: "Alchemy",
            conceal_ward: { name: "Concealing Wards", suffix: "Witch Hunter" },
            subtle_rituals: { name: "Subtle Rituals", suffix: "Witch Hunter" }
        },
        "Industrialized": {
            combustion_engine: { name: "Combustion Engine", suffix: "Gravity Well" },
            osha: { name: "OSHA Regulations", suffix: "Gravity Well" },
            blackmarket: { name: "Blackmarket", suffix: "Gravity Well" },
            vocational_training: "Vocational Training",
            oxygen_converter: "Oxygen Converter",
            rotary_kiln: "Rotary Kiln",
            warehouse: "Warehouse",
            alloy_containers: "Alloy Containers",
            zoning_permits: "Zoning Permits",
            corpocracy: "Corpocracy",
            technocracy: "Technocracy",
            magocracy: "Magocracy",
            code_breakers: "Code Breakers",
            corruption: "Corrupt Politicians",
            freight: "Freight Trains",
            wharf: "Wharves",
            swiss_banking: "Swiss Banking",
            scientific_journal: "Scientific Journal",
            adjunct_professor: "Adjunct Professors",
            tesla_coil: "Tesla Coil",
            industrialization: "Industrialization",
            electronics: "Electronics",
            thermomechanics: "Thermomechanics",
            oil_well: "Oil Derrick",
            oil_depot: "Fuel Depot",
            oil_power: "Oil Powerplant",
            titanium_drills: "Titanium Drills",
            titanium_shovel: { name: "Titanium Shovel", suffix: "Evil" },
            titanium_axes: "Titanium Axe",
            titanium_sledgehammer: "Titanium Sledgehammer",
            titanium_hoe: "Titanium Hoes",
            signing_bonus: "Signing Bonus",
            machine_gun: "Machine Gun",
            anfo: "ANFO",
            portland_cement: "Portland Cement",
            hunter_process: "Hunter Process",
            pylon_camouflage: { name: "Pylon Camouflage", suffix: "Witch Hunter" },
            fake_tech: { name: "Fake Tech", suffix: "Witch Hunter" },
            executions: "Public Executions"
        },
        "Deep Space": {
            hover_cart: { name: "Hover Cart", suffix: "Gravity Well" },
            neutronium_walls: "Neutronium Walls",
            psychic_channeling: { name: "Psychic Channeling", suffix: "Psychic" },
            laser_cutters: "Laser Cutters",
            otb: "Off Track Betting",
            neutronium_vault: "Neutronium Vault",
            world_collider: "World Collider",
            dna_sequencer: "DNA Sequencer",
            lasers: "Lasers",
            artifical_intelligence: "Artificial Intelligence",
            quantum_computing: "Quantum Computing",
            quantum_manufacturing: "Quantum Manufacturing",
            worker_drone: "Mining Drones",
            nano_tubes: "Nano Tubes",
            laser_rifles: "Laser Rifles",
            encoding: "Genetic Encoding",
            infusion: "Genetic Infusion",
            exotic_lab: "Exotic Materials Lab",
            swarm_plant: "Swarm Plant",
            space_sourced: "Space Sourced",
            swarm_plant_ai: "Swarm Plant AI",
            swarm_control_ai: "Swarm Control AI",
            quantum_swarm: "Quantum Swarm",
            helium_attractor: "Helium Attractor",
            elerium_mining: "Elerium Mining",
            laser_mining: "Laser Mining",
            elerium_tech: "Elerium Theory",
            elerium_reactor: "Elerium Reactor",
            neutronium_housing: "Neutronium Housing",
            genesis: "Genesis Project",
            star_dock: "Space Dock",
            interstellar: "Interstellar Probes",
            genesis_ship: "Genesis Ship",
            geck: "G.E.C.K.",
            dial_it_to_11: "Dial it up to 11",
            limit_collider: "Limit Collider",
            ai_tracking: "Facial Recognition"
        },
        "Globalized": {
            pipelines: { name: "Oil Pipelines", suffix: "Gravity Well" },
            windturbine: "Wind Turbine",
            wind_plant: { name: "Windmill", suffix: "Power Plant" },
            gmfood: "GM Food",
            machinery: "Machinery",
            cnc_machine: "CNC Machine",
            assembly_line: "Assembly Line",
            tv: "Television",
            casino: "Casino",
            dazzle: "Extreme Dazzle",
            electric_arc_furnace: "Electric Arc Furnace",
            cameras: "Security Cameras",
            titanium_crates: "Titanium-Banded Crates",
            urbanization: "Urbanization",
            massive_trades: "Massive Volume Trading",
            safety_deposit: "Safety Deposit Box",
            stock_market: "Stock Exchange",
            monument: "Monuments",
            internet: "Internet",
            bioscience: "Bioscience",
            genetics: "Genetics",
            crispr: "CRISPR-Cas9",
            fission: "Nuclear Fission",
            arpa: "A.R.P.A.",
            rocketry: "Rocketry",
            robotics: "Advanced Robotics",
            uranium: "Uranium Extraction",
            uranium_storage: "Uranium Storage",
            uranium_ash: "Uranium Ash",
            alloy_drills: "Alloy Drills",
            fracking: "Fracking",
            polymer: "Polymer",
            fluidized_bed_reactor: "Fluidized Bed Reactor",
            synthetic_fur: "Synthetic Fur",
            alloy_shovel: { name: "Alloy Shovel", suffix: "Evil" },
            jackhammer_mk2: "Electric Jackhammer",
            bunk_beds: "Bunk Beds",
            kevlar: "Kevlar",
            mad: "Mutual Destruction",
            screw_conveyor: "Screw Conveyor",
            kroll_process: "Kroll Process",
            unite: { name: "Unite Country", suffix: "True Path" },
            secret_police: "Secret Police"
        },
        "Dimensional": {
            arcology: "Arcology",
            zoo: "Exotic Zoo",
            infernium_fuel: "Infernium Fuel",
            advanced_biotech: "Advanced Biotech",
            codex_infinium: "Codex Infinium",
            devilish_dish: { name: "Devilish Dish", suffix: "Fasting" },
            hell_oven: { name: "Soul-Vide Cooker", suffix: "Fasting" },
            preparation_methods: { name: "Preparation Methods", suffix: "Fasting" },
            final_ingredient: { name: "Final Ingredient", suffix: "Fasting" },
            cybernetics: "Cybernetics",
            blood_pact: "Blood Pact",
            purify: "Enhanced Air Filters",
            waygate: "Waygate",
            demonic_infusion: "Demonic Infusion",
            gate_key: "Gate Key",
            gate_turret: "Gate Turret",
            infernite_mine: "Infernite Survey",
            corrupt_gem_analysis: "Corrupt Gem Analysis",
            hell_search: "Search Hell Coordinates",
            codex_infernium: "Codex Infernium",
            lake_analysis: "Blood Lake Analysis",
            lake_threat: "Lake Threat",
            lake_transport: "Lake Transport",
            cooling_tower: "Cooling Tower",
            miasma: "Miasma",
            infernium_power: "Inferno Power",
            scarletite: "Scarletite",
            pillars: "Pillars Research",
            cyber_limbs: "Cybernetic Worker Limbs",
            cyborg_soldiers: "Cyborg Soldiers",
            stabilize_decay: "Stabilize Decay",
            outerplane_summon: { name: "Outerplane Summon", suffix: "Witch Hunter" },
            dark_bomb: "Dark Energy Bomb",
            bribe_sphinx: "Bribe Sphinx"
        },
        "Early Space": {
            mythril_beams: "Mythril Beams",
            automation: "Factory Automation",
            casino_vault: "Casino Vault",
            iridium_smelting_perk: "Iridium Smelting",
            pocket_dimensions: "Pocket Dimensions",
            mythril_crates: "Mythril-Plated Crates",
            mythril_containers: "Mythril Containers",
            federation: "Federation",
            hedge_funds: "Hedge Funds",
            four_oh_one: "401K",
            mythril_vault: "Mythril Vault",
            fire_proof_safe: "Fire Proof Safe",
            tourism: "Tourism",
            observatory: "Space Observatory",
            shotgun_sequencing: "Shotgun Sequencing",
            de_novo_sequencing: "De Novo Sequencing",
            breeder_reactor: "Breeder Reactor",
            mythril_drills: "Mythril Drills",
            mass_driver: "Mass Driver",
            mythril_shovel: { name: "Mythril Shovel", suffix: "Evil" },
            ancient_infusion: { name: "Ancient Infusion", suffix: "Cannibalize" },
            rail_guns: "Rail Guns",
            space_marines: "Space Marines",
            cambridge_process: "Cambridge Process",
            pynn_partical: "Pynn Particles",
            matter_compression: "Matter Compression",
            higgs_boson: "Higgs Boson",
            ancient_theology: "Ancient Theology",
            study: "Study Ancients",
            study_alt: { name: "Study Ancients", suffix: "Post-Preeminence" },
            deify: "Deify Ancients",
            deify_alt: { name: "Deify Ancients", suffix: "Post-Preeminence" },
            astrophysics: "Astrophysics",
            rover: "Rovers",
            probes: "Space Probes",
            starcharts: "Star Charts",
            colonization: "Colonization",
            red_tower: "Mars Control Tower",
            space_manufacturing: "Space Manufacturing",
            dyson_sphere: { name: "Dyson Sphere", suffix: "Plans" },
            dyson_swarm: "Dyson Swarm",
            gps: "GPS Constellation",
            nav_beacon: "Navigation Beacon",
            atmospheric_mining: "Atmospheric Mining",
            zero_g_mining: "Zero G Mining",
            unification: { name: "Unification", suffix: "Plans" },
            unification2: "Unification",
            genetic_decay: "Gene Therapy",
            mana_nexus: "Mana Nexus",
            concealment: { name: "Empowered Concealment Wards", suffix: "Witch Hunter" },
            higgs_boson_tp: { name: "Higgs Boson", suffix: "True Path" }
        },
        "Intergalactic": {
            bolognium_alloy_beams: "Bolognium Alloy Beams",
            fertility_clinic: "Fertility Clinic",
            psychic_efficiency: { name: "Psychic Efficiency", suffix: "Psychic" },
            stellar_forge: "Stellar Forge",
            stellar_smelting: "Stellar Smelting",
            high_tech_factories: "High-Tech Factory",
            bolognium_vaults: "Bolognium Vault",
            bolognium_crates: "Bolognium Crates",
            bolognium_containers: "Bolognium Containers",
            nanoweave_containers: "Nanoweave Liners",
            foreign_investment: "Foreign Investment",
            xeno_tourism: "Xeno Tourism",
            expedition: "Scientific Expeditions",
            subspace_sensors: "Subspace Sensors",
            alien_database: "Alien Database",
            orichalcum_capacitor: "Orichalcum Capacitor",
            metaphysics: "Metaphysics",
            orichalcum_analysis: "Orichalcum Analysis",
            study_corrupt_gem: { name: "Study Corrupt Gem", suffix: "Witch Hunter" },
            soul_binding: { name: "Soul Binding", suffix: "Witch Hunter" },
            soul_capacitor: { name: "Soul Capacitor", suffix: "Witch Hunter" },
            absorption_chamber: { name: "Absorption Chamber", suffix: "Witch Hunter" },
            incorporeal: "Incorporeal Existence",
            tech_ascension: "Ascension",
            terraforming: { name: "Terraforming", suffix: "Orbital Decay" },
            graphene_processing: "Graphene Processing",
            orichalcum_driver: "Orichalcum Mass Driver",
            nanoweave: "Nanoweave",
            gauss_rifles: "Gauss Rifles",
            hammocks: "Nanoweave Hammocks",
            nanoweave_vest: "Nanoweave Vest",
            hydroponics: "Hydroponics Bays",
            orichalcum_panels: "Orichalcum Panels",
            dyson_sphere2: "Dyson Sphere",
            orichalcum_sphere: "Orichalcum Dyson Plating",
            mega_manufacturing: "Mega Manufacturing",
            luxury_condo: "Luxury Condo",
            asteroid_redirect: "Asteroid Redirect",
            wormholes: "Wormholes",
            advanced_predators: "Advanced Drones",
            shield_generator: "Shield Generator",
            enhanced_sensors: "Enhanced Sensors",
            xeno_linguistics: "Xeno Linguistics",
            xeno_culture: "Xeno Culture",
            cultural_exchange: "Cultural Exchange",
            shore_leave: "Shore Leave",
            xeno_gift: "Alien Gift",
            industrial_partnership: "Industrial Partnership",
            embassy_housing: "Embassy Housing",
            advanced_telemetry: "Advanced Telemetry",
            defense_platform: "Defense Platform",
            scout_ship: "Scout Ship",
            corvette_ship: "Corvette Ship",
            frigate_ship: "Frigate Ship",
            cruiser_ship: "Cruiser Ship",
            dreadnought: "Dreadnought",
            ship_dock: "Ship Dock",
            ore_processor: "Ore Processor",
            scavenger: "Tech Scavenger",
            coordinates: "Decrypt Coordinates",
            chthonian_survey: "Chthonian Survey",
            gateway_depot: "Depot",
            soul_forge: "Soul Forge",
            soul_attractor: "Soul Attractor",
            soul_absorption: "Soul Absorption",
            soul_link: "Soul Link",
            gun_emplacement: "Gun Emplacement",
            advanced_emplacement: "Advanced Gun Emplacement",
            transmutation: "Advanced Transmutation",
            improved_concealment: { name: "Improved Concealment Wards", suffix: "Witch Hunter" },
            predictive_arrests: "Predictive Arrests"
        },
        "Interstellar": {
            superstars: "Super Stars",
            vr_center: "VR Center",
            online_gambling: "Online Gambling",
            elysis_process: "ELYSIS Process",
            hellfire_furnace: "Hellfire Furnace",
            ai_logistics: "AI Shipping Logistics",
            infernite_crates: "Infernite Crates",
            graphene_crates: "Graphene Crates",
            adamantite_containers: "Adamantite Containers",
            aerogel_containers: "Aerogel Containers",
            exchange: "Galactic Exchange",
            adamantite_vault: "Adamantite Vault",
            graphene_vault: "Graphene Vault",
            tamper_proof_safe: "Tamper Proof Safe",
            laboratory: "Laboratory",
            virtual_assistant: "Virtual Assistant",
            dimensional_readings: "Dimensional Readings",
            quantum_entanglement: "Quantum Entanglement",
            rapid_sequencing: "Rapid Gene Sequencing",
            virtual_reality: "Virtual Reality",
            plasma: "Plasma Beams",
            shields: "Energy Shields",
            ai_core: "AI Supercore",
            cement_processing: "Cement Processing",
            adamantite_processing_flier: { name: "Adamantite Processing", suffix: "Flier" },
            adamantite_processing: "Adamantite Processing",
            fusion_power: "Nuclear Fusion",
            stanene: "Stanene",
            adamantite_shovel: { name: "Adamantite Shovel", suffix: "Evil" },
            chainsaws: "Chainsaws",
            adamantite_hammer: "Adamantite Jackhammer",
            adamantite_hoe: "Adamantite Hoes",
            bac_tanks: "BAC Tank",
            vr_training: "VR Training",
            plasma_rifles: "Plasma Rifles",
            disruptor_rifles: "Disruptor Rifles",
            cruiser: "Patrol Cruiser",
            laser_turret: "Laser Turret",
            plasma_turret: "Plasma Turret",
            adamantite_screws: "Adamantite Screws",
            dimensional_compression: "Dimension Compression",
            perovskite_cell: "Perovskite Cells",
            swarm_convection: "Swarm Convection",
            dyson_net: "Dyson Net",
            subspace_signal: "Subspace Beacon",
            ram_scoops: "Ram Scoops",
            elerium_prospecting: "Elerium Prospecting",
            plasma_mining: "Plasma Mining",
            tachyon: "Tachyon Particles",
            warp_drive: "Alcubierre Drive",
            habitat: "Habitat",
            graphene: "Graphene",
            aerogel: "Aerogel",
            stellar_engine: "Stellar Engine",
            mass_ejector: "Mass Ejector",
            exotic_infusion: { name: "Exotic Infusion", suffix: "1st Warning" },
            infusion_check: { name: "Exotic Infusion", suffix: "2nd Warning" },
            infusion_confirm: "Exotic Infusion",
            stabilize_blackhole: "Stabilize Black Hole",
            veil: "The Veil",
            mana_syphon: "Mana Syphon",
            gravitational_waves: "Gravitational Waves",
            gravity_convection: "Gravitational Convection",
            portal: "Portals",
            fortifications: "Fortifications",
            war_drones: "War Drones",
            demon_attractor: "Demonic Attractor",
            combat_droids: "Combat Droids",
            repair_droids: "Repair Droids",
            enhanced_droids: "Enhanced War Droids",
            sensor_drone: "Sensor Drones",
            map_terrain: "Map Terrain",
            calibrated_sensors: "Calibrated Sensors"
        },
        "Existential": {
            elysanite_crates: "Elysanite Crates",
            elysanite_containers: "Elysanite Containers",
            crypto_currency: "Crypto Currency",
            spirit_box: "Spirit Box",
            spirit_researcher: "Occult Researcher",
            dimensional_tap: "Dimensional Tap",
            divinity: "Divine Providence",
            purify_essence: "Purify Essence",
            crypto_mining: "Crypto Mining",
            elysanite_hammer: "Elysanite Jackhammer",
            ethereal_weapons: "Ethereal Weaponry",
            super_tnt: "Super TNT",
            otherworldly_binder: "Otherworldly Binder",
            elysanite_sphere: "Elysanite Dyson Paneling",
            soul_bait: "Soul Bait",
            asphodel_flowers: "Ghostly Flowers",
            ghost_traps: "Ghost Traps",
            research_station: "Non-overlapping Magisteria",
            soul_engine: "Soul Power",
            railway_to_hell: "Railway to Hell",
            purification: "Purification",
            asphodel_mech: "Asphodel Mech Security",
            asphodel_storage: "Asphodel Storage",
            asphodel_stabilizer: "Asphodel Stabilizer",
            edenic_bunker: "Edenic Bunker",
            bliss_den: "Den of Bliss",
            hallowed_housing: "Hallowed Housing",
            outer_plane_study: "Outer Plane Study",
            camouflage: "Camouflage",
            celestial_tactics: "Celestial Tactics",
            active_camouflage: "Active Camouflage",
            special_ops_training: "Special Ops Training",
            spectral_training: "Spectral Training Ground",
            elysanite_mining: "Elysanite Mining",
            sacred_smelter: "Sacred Smelter",
            fire_support_base: "Fire Support Base",
            pillbox: "Pillbox",
            elerium_cannon: "Elerium Cannon",
            elerium_containment: "Elerium Containment",
            ambrosia: "Ambrosia",
            eternal_bank: "Eternal Wealth",
            wisdom: "Wisdom of the Ancients",
            rushmore: "Mount Humanmore",
            reincarnation: "Reincarnation Machine",
            otherworldly_cement: "Edenic Cement",
            ancient_crafters: "Ancient Crafters",
            spirit_syphon: "Spirit Syphon",
            spirit_capacitor: "Spirit Capacitor",
            suction_force: "Suction Force",
            soul_compactor: "Soul Compactor",
            tomb: "Tomb of the Dead God",
            energy_drain: "Energy Drain",
            divine_infuser: "Divine Infuser"
        },
        "Outer Solar System": {
            alien_biotech: { name: "Alien Biotech", suffix: "True Path" },
            zero_g_lab: { name: "Zero Gravity Lab", suffix: "True Path" },
            operating_base: { name: "Operating Base", suffix: "True Path" },
            munitions_depot: { name: "Munitions Depot", suffix: "True Path" },
            fob: { name: "Forward Operating Base", suffix: "True Path" },
            bac_tanks_tp: { name: "BAC Tank", suffix: "True Path" },
            medkit: { name: "Advanced Medkits", suffix: "True Path" },
            sam_site: { name: "Planetary Defenses", suffix: "True Path" },
            data_cracker: { name: "Data Cracker", suffix: "True Path" },
            ai_core_tp: { name: "AI Supercore", suffix: "True Path" },
            ai_optimizations: { name: "AI Optimizations", suffix: "True Path" },
            synthetic_life: { name: "Synthetic Life", suffix: "True Path" },
            protocol66: { name: "Protocol 66", suffix: "Warning, True Path" },
            protocol66a: { name: "Protocol 66", suffix: "True Path" },
            terraforming_tp: { name: "Terraforming", suffix: "Orbital Decay, True Path" },
            quantium: { name: "Quantium", suffix: "True Path" },
            anitgrav_bunk: { name: "Anti-Grav Bunks", suffix: "True Path" },
            long_range_probes: { name: "Long Range Probes", suffix: "True Path" },
            strange_signal: { name: "Strange Signal", suffix: "True Path" },
            data_analysis: { name: "Encrypted Data Analysis", suffix: "True Path" },
            mass_relay: { name: "Mass Relay", suffix: "True Path" },
            nav_data: { name: "Navigation Data", suffix: "True Path" },
            sensor_logs: { name: "Tau Ceti Data", suffix: "True Path" },
            dronewar: { name: "Drone Warfare", suffix: "True Path" },
            drone_tank: { name: "AI Drone Tanks", suffix: "True Path" },
            stanene_tp: { name: "Stanene", suffix: "True Path" },
            graphene_tp: { name: "Graphene", suffix: "True Path" },
            virtual_reality_tp: { name: "Virtual Reality", suffix: "True Path" },
            electrolysis: { name: "Electrolysis", suffix: "True Path" },
            storehouse: { name: "Titan Storage Facility", suffix: "True Path" },
            adamantite_vault_tp: { name: "Adamantite Vault", suffix: "True Path" },
            titan_bank: { name: "Titan Banking", suffix: "True Path" },
            hydrogen_plant: { name: "Hydrogen Power", suffix: "True Path" },
            water_mining: { name: "Water Mining", suffix: "True Path" },
            mercury_smelting: { name: "Solar Smelting", suffix: "True Path" },
            iridium_smelting: { name: "Iridium Smelting", suffix: "True Path" },
            adamantite_crates: { name: "Adamantite Crates", suffix: "True Path" },
            adamantite_containers_tp: { name: "Adamantite Containers", suffix: "True Path" },
            quantium_containers: { name: "Quantium Containers", suffix: "True Path" },
            reinforced_shelving: { name: "Reinforced Shelving", suffix: "True Path" },
            garage_shelving: { name: "Quantium Garage Shelving", suffix: "True Path" },
            warehouse_shelving: { name: "Automated Warehousing System", suffix: "True Path" },
            elerium_extraction: { name: "Elerium Extraction", suffix: "True Path" },
            orichalcum_panels_tp: { name: "Orichalcum Panels", suffix: "True Path" },
            shipyard: { name: "Ceres Ship Yard", suffix: "True Path" },
            ship_lasers: { name: "Ship Lasers", suffix: "True Path" },
            pulse_lasers: { name: "Ship Pulse Lasers", suffix: "True Path" },
            ship_plasma: { name: "Ship Plasma Beams", suffix: "True Path" },
            ship_phaser: { name: "Ship Phasers", suffix: "True Path" },
            ship_disruptor: { name: "Ship Disruptor", suffix: "True Path" },
            destroyer_ship: { name: "Destroyer", suffix: "True Path" },
            cruiser_ship_tp: { name: "Cruiser", suffix: "True Path" },
            h_cruiser_ship: { name: "Battlecruiser", suffix: "True Path" },
            dreadnought_ship: { name: "Dreadnought", suffix: "True Path" },
            pulse_engine: { name: "Pulse Drive", suffix: "True Path" },
            photon_engine: { name: "Photon Drive", suffix: "True Path" },
            vacuum_drive: { name: "Vacuum Drive", suffix: "True Path" },
            ship_fusion: { name: "Fusion Generator", suffix: "True Path" },
            ship_elerium: { name: "Elerium Generator", suffix: "True Path" },
            quantum_signatures: { name: "Quantum Signatures", suffix: "True Path" }
        },
        "Tau Ceti": {
            bolognium_crates_tp: { name: "Bolognium Crates", suffix: "True Path" },
            unobtainium_containers: { name: "Unobtainium Containers", suffix: "True Path" },
            interstellar_drive: { name: "Interstellar Drive", suffix: "True Path" },
            alien_outpost: { name: "Alien Outpost", suffix: "True Path" },
            jumpgates: { name: "Jump Gates", suffix: "True Path" },
            system_survey: { name: "Tau Survey", suffix: "True Path" },
            repository: { name: "Repository", suffix: "True Path" },
            fusion_generator: { name: "Nuclear Fusion", suffix: "True Path" },
            tau_cultivation: { name: "Tau Ceti Cultivation", suffix: "True Path" },
            tau_manufacturing: { name: "Tau Ceti Manufacturing", suffix: "True Path" },
            weasels: { name: "Weasels", suffix: "True Path" },
            jeff: { name: "Contact Jeff", suffix: "True Path" },
            womling_fun: { name: "Womling Entertainment", suffix: "True Path" },
            womling_lab: { name: "Womling Science", suffix: "True Path" },
            womling_mining: { name: "Womling Dirt Excavation", suffix: "True Path" },
            womling_firstaid: { name: "Womling First Aid", suffix: "True Path" },
            womling_logistics: { name: "Womling Logistics", suffix: "True Path" },
            womling_repulser: { name: "Womling Repulser Pad", suffix: "True Path" },
            womling_farming: { name: "Womling Farming", suffix: "True Path" },
            womling_housing: { name: "Womling Housing", suffix: "True Path" },
            womling_support: { name: "Womling Support", suffix: "True Path" },
            womling_recycling: { name: "Womling Recycling", suffix: "True Path" },
            asteroid_analysis: { name: "Asteroid Data Analysis", suffix: "True Path" },
            shark_repellent: { name: "Shark Repellent", suffix: "True Path" },
            belt_mining: { name: "Tau Ceti Belt Mining", suffix: "True Path" },
            adv_belt_mining: { name: "Advanced Belt Mining", suffix: "True Path" },
            space_whaling: { name: "Space Whaling", suffix: "True Path" },
            infectious_disease_lab: { name: "Infectious Disease Lab", suffix: "True Path" },
            isolation_protocol: { name: "Isolation Protocol", suffix: "True Path" },
            focus_cure: { name: "Focus Cure", suffix: "True Path" },
            decode_virus: { name: "Decode Virus", suffix: "True Path" },
            vaccine_campaign: { name: "Vaccination Campaign", suffix: "True Path" },
            vax_strat1: { name: "Propaganda Campaign", suffix: "True Path" },
            vax_strat2: { name: "Force Vaccination", suffix: "True Path" },
            vax_strat3: { name: "Show the Science", suffix: "True Path" },
            vax_strat4: { name: "Secret Vaccination", suffix: "True Path" },
            cloning: { name: "Cloning Facility", suffix: "True Path" },
            clone_degradation: { name: "Clone Degradation", suffix: "True Path" },
            digital_paradise: { name: "Digital Paradise", suffix: "True Path" },
            ringworld: { name: "Design a Ringworld", suffix: "True Path" },
            iso_gambling: { name: "Pit Bosses", suffix: "True Path" },
            outpost_boost: { name: "Alien Outpost Device", suffix: "True Path" },
            cultural_center: { name: "Cultural Center", suffix: "True Path" },
            outer_tau_survey: { name: "Survey Outer Planet", suffix: "True Path" },
            alien_research: { name: "Alien Research", suffix: "True Path" },
            womling_gene_therapy: { name: "Womling Gene Therapy", suffix: "True Path" },
            food_culture: { name: "Sell fruitcake", suffix: "True Path" },
            advanced_refinery: { name: "Advanced Ore Refinery", suffix: "True Path" },
            advanced_pit_mining: { name: "Advanced Pit Mining", suffix: "True Path" },
            useless_junk: { name: "Useless Junk", suffix: "True Path" },
            advanced_asteroid_mining: { name: "Advanced Asteroid Mining", suffix: "True Path" },
            advanced_material_synthesis: { name: "Advanced Material Synthesis", suffix: "True Path" },
            matrioshka_brain: { name: "Matrioshka Brain", suffix: "True Path" },
            ignition_device: { name: "Ignition Device", suffix: "True Path" },
            replicator: { name: "Matter Replicator", suffix: "Lone Survivor, True Path" },
            womling_unlock: { name: "Meet The Neighbors", suffix: "Lone Survivor, True Path" },
            garden_of_eden: { name: "Garden of Eden", suffix: "True Path" }
        }
    });

    const events = {
        womlings: "Servants Arrival",
        steel: "Steel Discovery",
        elerium: "Elerium Discovery",
        oil: "Space Oil Discovery",
        pit: "Pit Discovery",
        alien: "Alien Encounter",
        piracy: "Pirate Encounter",
        alien_db: "Alien Database Find",
        corrupt_gem: "Corrupt Soul Gem Find",
        vault: "Vault Discovery",
        syndicate: "Syndicate Encounter"
    };
    const resets = {
        mad: "MAD",
        bioseed: "Bioseed",
        cataclysm: "Cataclysm",
        blackhole: "Black Hole",
        ascend: "Ascension",
        descend: "Demonic Infusion",
        apotheosis: "Apotheosis",
        aiappoc: "AI Apocalypse",
        matrix: "Matrix",
        retire: "Retirement",
        eden: "Garden of Eden",
        terraform: "Terraform"
    };
    const universes = {
        standard: "Standard",
        heavy: "Heavy Gravity",
        antimatter: "Antimatter",
        evil: "Evil",
        micro: "Micro",
        magic: "Magic"
    };
    const challengeGenes = {
        no_plasmid: "No Starting Plasmids",
        weak_mastery: "Weak Mastery",
        nerfed: "Weak Genes",
        no_crispr: "Junk Gene",
        badgenes: "Bad Genes",
        no_trade: "No Free Trade",
        no_craft: "No Manual Crafting"
    };
    const environmentEffects = {
        hot: "Hot days",
        cold: "Cold days",
        inspired: "Inspired",
        motivated: "Motivated"
    };
    const viewModes = {
        timestamp: "Timestamp",
        duration: "Duration",
        durationStacked: "Duration (stacked)",
        records: "Records"
    };
    const additionalInformation = {
        raceName: "Race name",
        combatDeaths: "Combat deaths",
        junkTraits: "Junk traits"
    };
    function resetName(reset, universe) {
        if (reset === "blackhole" && universe === "magic") {
            return "Vacuum Collapse";
        }
        else {
            return resets[reset];
        }
    }

    class Game {
        evolve;
        constructor(evolve) {
            this.evolve = evolve;
        }
        get runNumber() {
            return this.evolve.global.stats.reset + 1;
        }
        get day() {
            return this.evolve.global.stats.days;
        }
        get universe() {
            const value = this.evolve.global.race.universe;
            if (value !== "bigbang") {
                return value;
            }
        }
        get raceName() {
            if (this.finishedEvolution) {
                return this.evolve.races[this.evolve.global.race.species].name;
            }
        }
        get finishedEvolution() {
            return this.evolve.global.race.species !== "protoplasm";
        }
        async waitEvolved() {
            return new Promise(resolve => {
                if (this.finishedEvolution) {
                    resolve();
                }
                else {
                    this.onGameTick(() => {
                        if (this.finishedEvolution) {
                            resolve();
                        }
                    });
                }
            });
        }
        get resetCounts() {
            return transformMap(resets, ([reset]) => [reset, this.evolve.global.stats[reset] ?? 0]);
        }
        get combatDeaths() {
            return this.evolve.global.stats.died ?? 0;
        }
        get temperature() {
            switch (this.evolve.global.city.calendar.temp) {
                case 2:
                    return "hot";
                case 0:
                    return "cold";
                default:
                    return "normal";
            }
        }
        get inspired() {
            return (this.evolve.global.race.inspired ?? 0) !== 0;
        }
        get motivated() {
            return (this.evolve.global.race.motivated ?? 0) !== 0;
        }
        hasChallengeGene(gene) {
            return gene in this.evolve.global.race;
        }
        traitName(trait) {
            return this.evolve.traits[trait]?.name ?? "Unknown";
        }
        traitValue(trait) {
            return this.evolve.traits[trait].val;
        }
        currentTraitRank(trait) {
            return this.evolve.global.race[trait];
        }
        baseTraitRank(trait) {
            return this.evolve.races[this.evolve.global.race.species].traits[trait];
        }
        get majorTraits() {
            return Object.keys(this.evolve.global.race).filter(k => this.evolve.traits[k]?.type === "major");
        }
        get imitatedTraits() {
            if ("srace" in this.evolve.global.race) {
                return Object.keys(this.evolve.races[this.evolve.global.race.srace].traits);
            }
            else {
                return [];
            }
        }
        get starLevel() {
            if (this.finishedEvolution) {
                return Object.keys(challengeGenes).filter(c => this.hasChallengeGene(c)).length;
            }
        }
        built(tab, building, count) {
            const instance = this.evolve.global[tab]?.[building];
            const instanceCount = tab === "arpa" ? instance?.rank : instance?.count;
            return (instanceCount ?? 0) >= count;
        }
        researched(tech) {
            return checkOldTech(this.evolve, tech);
        }
        womlingsArrived() {
            return this.evolve.global.race.servants !== undefined;
        }
        resourceUnlocked(resource) {
            return this.evolve.global.resource[resource]?.display ?? false;
        }
        techLevel(tech) {
            return this.evolve.global.tech[tech] ?? 0;
        }
        demonKills() {
            return this.evolve.global.stats.dkills ?? 0;
        }
        onGameDay(fn) {
            let previousDay = null;
            this.onGameTick(() => {
                const day = this.day;
                if (previousDay !== day) {
                    previousDay = day;
                    fn(day);
                }
            });
        }
        onGameTick(fn) {
            spy(this.evolve, "craftCost", fn);
        }
    }

    function effectActive(effect, game) {
        switch (effect) {
            case "hot":
                return game.temperature === "hot";
            case "cold":
                return game.temperature === "cold";
            case "inspired":
                return game.inspired;
            case "motivated":
                return game.motivated;
            default:
                return false;
        }
    }
    const effectColors = {
        "effect:hot": Observable10.red,
        "effect:cold": Observable10.blue,
        "effect:inspired": Observable10.green,
        "effect:motivated": Observable10.orange
    };

    function getResetType(entry, history) {
        const [milestoneID] = entry.milestones[entry.milestones.length - 1];
        const milestone = history.getMilestone(milestoneID);
        const prefix = "reset:";
        if (milestone.startsWith(prefix)) {
            return milestone.slice(prefix.length);
        }
    }
    function shouldIncludeRun(entry, view, history) {
        if (view.universe !== undefined && entry.universe !== view.universe) {
            return false;
        }
        if (view.starLevel !== undefined && entry.starLevel !== view.starLevel) {
            return false;
        }
        if (getResetType(entry, history) !== view.resetType) {
            return false;
        }
        // Don't show VC runs in generic Black Hole views
        if (view.resetType === "blackhole" && view.universe === undefined) {
            return entry.universe !== "magic";
        }
        return true;
    }
    function applyFilters(history, view, { useLimits } = { useLimits: true }) {
        const runs = [];
        let lowerBound = 0;
        if (useLimits && view.skipRuns.enabled && view.skipRuns.value !== undefined) {
            let skippedRuns = 0;
            for (; lowerBound !== history.runs.length; ++lowerBound) {
                const run = history.runs[lowerBound];
                if (shouldIncludeRun(run, view, history)) {
                    if (++skippedRuns === view.skipRuns.value) {
                        break;
                    }
                }
            }
            ++lowerBound;
        }
        for (let i = history.runs.length - 1; i >= lowerBound; --i) {
            const run = history.runs[i];
            if (shouldIncludeRun(run, view, history)) {
                runs.push(run);
                if (useLimits && view.numRuns.enabled && view.numRuns.value !== undefined && runs.length >= view.numRuns.value) {
                    break;
                }
            }
        }
        return runs.reverse();
    }
    function findLastRun(history, view) {
        for (let i = history.runs.length - 1; i >= 0; --i) {
            const run = history.runs[i];
            if (shouldIncludeRun(run, view, history)) {
                return run;
            }
        }
    }

    function makeCondition(description) {
        let impl = (game) => true;
        if (description.tech !== undefined) {
            for (const [tech, level] of Object.entries(description.tech)) {
                impl = compose(impl, (game) => game.techLevel(tech) >= level);
            }
        }
        if (description.built !== undefined) {
            for (const [tab, buildings] of Object.entries(description.built)) {
                impl = compose(impl, (game) => buildings.some(b => game.built(tab, b, 1)));
            }
        }
        if (description.demonKills !== undefined) {
            impl = compose(impl, (game) => game.demonKills() >= description.demonKills);
        }
        if (description.womlingsArrived !== undefined) {
            impl = compose(impl, (game) => game.womlingsArrived());
        }
        if (description.resourceUnlocked !== undefined) {
            impl = compose(impl, (game) => game.resourceUnlocked(description.resourceUnlocked));
        }
        return impl;
    }
    function makeEventsInfo(descriptions) {
        return transformMap(descriptions, ([event, { precondition, postcondition }]) => {
            const triggered = makeCondition(postcondition);
            const conditionMet = precondition !== undefined ? makeCondition(precondition) : undefined;
            return [event, { conditionMet, triggered }];
        });
    }
    var eventsInfo = makeEventsInfo({
        womlings: {
            postcondition: { womlingsArrived: true }
        },
        steel: {
            postcondition: { resourceUnlocked: "Steel" }
        },
        elerium: {
            precondition: { tech: { "asteroid": 3 }, built: { space: ["iron_ship", "iridium_ship"] } },
            postcondition: { tech: { "asteroid": 4 } }
        },
        oil: {
            precondition: { tech: { "gas_moon": 1 }, built: { space: ["outpost"] } },
            postcondition: { tech: { "gas_moon": 2 } }
        },
        pit: {
            precondition: { tech: { "gateway": 1 }, demonKills: 1000000 },
            postcondition: { tech: { "hell_pit": 1 } }
        },
        alien: {
            precondition: { built: { galaxy: ["scout_ship"] } },
            postcondition: { tech: { "xeno": 1 } }
        },
        piracy: {
            precondition: { tech: { "xeno": 5 } },
            postcondition: { tech: { "piracy": 1 } }
        },
        alien_db: {
            precondition: { tech: { "conflict": 4 }, built: { galaxy: ["scavenger"] } },
            postcondition: { tech: { "conflict": 5 } }
        },
        corrupt_gem: {
            precondition: { tech: { "high_tech": 16 } },
            postcondition: { tech: { "corrupt": 1 } },
        },
        vault: {
            precondition: { tech: { "hell_ruins": 2 }, built: { portal: ["archaeology"] } },
            postcondition: { tech: { "hell_vault": 1 } }
        },
        syndicate: {
            precondition: { tech: { "outer": 1 } },
            postcondition: { tech: { "syndicate": 1 } }
        }
    });

    function makeMilestoneChecker(game, milestone) {
        const impl = patternMatch(milestone, [
            [/built:(.+?)-(.+?):(\d+)/, (tab, id, count) => () => game.built(tab, id, Number(count))],
            [/tech:(.+)/, (id) => () => game.researched(id)],
            [/event:(.+)/, (id) => () => eventsInfo[id].triggered(game)],
            [/event_condition:(.+)/, (id) => () => eventsInfo[id].conditionMet?.(game) ?? true],
            [/effect:(.+)/, (id) => () => effectActive(id, game)],
        ]);
        return {
            milestone,
            reached: impl ?? (() => false)
        };
    }
    function techName(id) {
        const info = techs[id];
        return {
            type: "Research",
            name: info.name,
            suffix: info.suffix
        };
    }
    function buildingName(id, count) {
        const info = buildings[id];
        return {
            type: "Building",
            name: info.name,
            id,
            prefix: info.prefix,
            suffix: info.suffix,
            count
        };
    }
    function milestoneName(milestone, universe) {
        const name = patternMatch(milestone, [
            [/built:(.+?):(\d+)/, (id, count) => buildingName(id, Number(count))],
            [/tech:(.+)/, (id) => techName(id)],
            [/event:(.+)/, (id) => ({ type: "Event", "name": events[id] })],
            [/event_condition:(.+)/, (id) => ({ type: "Event Condition", "name": events[id] })],
            [/effect:(.+)/, (id) => ({ type: "Effect", name: environmentEffects[id] })],
            [/reset:(.+)/, (reset) => ({ type: "Reset", name: resetName(reset, universe) })],
        ]);
        return name ?? { type: "unknown", name: milestone };
    }
    function getDuplicates(entries) {
        const grouped = Object.groupBy(entries, info => info.name);
        return filterMap(grouped, ([, group]) => group.length !== 1);
    }
    function resolveDuplicateNames(entries) {
        const steps = [
            // Step 1: Resolve non-buildings
            (group) => {
                for (const entry of group) {
                    if (entry.type !== "Building") {
                        const { type, name, suffix } = entry;
                        entry.name = `${name} (${suffix ?? type})`;
                    }
                }
            },
            // Step 2: Add building prefixes
            (group) => {
                // If all prefixes are the same, adding them won't resolve duplicate names
                const regions = new Set(group.map(entry => entry.prefix));
                if (regions.size === 1) {
                    return;
                }
                for (const entry of group) {
                    const { name, prefix } = entry;
                    if (prefix) {
                        entry.name = `${prefix} ${name}`;
                    }
                }
            },
            // Step 3: Add building suffixes
            (group) => {
                for (const entry of group) {
                    const { name, suffix } = entry;
                    if (suffix) {
                        entry.name = `${name} (${suffix})`;
                    }
                }
            },
            // Step 4: Add building counts
            (group) => {
                for (const entry of group) {
                    const { id, count } = entry;
                    entry.name = `${entry.name} (${count})`;
                    // Don't add count twice - make equal to the default value
                    entry.count = segments[id] ?? 1;
                }
            }
        ];
        for (const step of steps) {
            const duplicates = getDuplicates(entries);
            if (Object.entries(duplicates).length === 0) {
                return;
            }
            for (const group of Object.values(duplicates)) {
                step(group);
            }
        }
    }
    function generateMilestoneNames(milestones, universe) {
        const entries = milestones.map(m => milestoneName(m, universe));
        resolveDuplicateNames(entries);
        // Final step: Add building counts if needed
        for (const entry of entries) {
            if (entry.type !== "Building") {
                continue;
            }
            const { id, count } = entry;
            if (count !== (segments[id] ?? 1)) {
                entry.name = `${entry.name} (${count})`;
            }
        }
        return entries.map(e => e.name);
    }
    function milestoneType(milestone) {
        return milestone.slice(0, milestone.indexOf(":"));
    }

    function runTime(entry) {
        return entry.milestones[entry.milestones.length - 1]?.[1];
    }
    function findBestRunImpl(history, view) {
        let best = undefined;
        for (const run of history.runs) {
            if (!shouldIncludeRun(run, view, history)) {
                continue;
            }
            if (best === undefined || runTime(run) < runTime(best)) {
                best = run;
            }
        }
        return best;
    }
    const bestRunCache = {};
    function findBestRun(history, view) {
        const cacheKey = `${view.resetType}.${view.universe ?? "*"}.${view.starLevel ?? "*"}`;
        const cacheEntry = bestRunCache[cacheKey];
        if (cacheEntry !== undefined) {
            return cacheEntry;
        }
        const best = findBestRunImpl(history, view);
        if (best !== undefined) {
            bestRunCache[cacheKey] = best;
        }
        return best;
    }
    function sortMilestones(view, history) {
        const lastRun = findLastRun(history, view);
        if (lastRun === undefined) {
            return;
        }
        const milestones = Object.keys(view.milestones);
        milestones.sort((l, r) => {
            if (milestoneType(l) !== "effect" && milestoneType(r) !== "effect") {
                const lIdx = lastRun.milestones.findIndex(([id]) => id === history.getMilestoneID(l));
                const rIdx = lastRun.milestones.findIndex(([id]) => id === history.getMilestoneID(r));
                return rIdx - lIdx;
            }
            else if (milestoneType(l) === "effect") {
                return 1;
            }
            else {
                return -1;
            }
        });
        for (let i = 0; i != milestones.length; ++i) {
            const milestone = milestones[i];
            view.milestones[milestone].index = i;
        }
    }
    function getSortedMilestones(view) {
        return Object.keys(view.milestones).sort((l, r) => view.milestones[l].index - view.milestones[r].index);
    }

    class ViewUtils {
        view;
        config;
        static idGenerator = 0;
        _id = ++ViewUtils.idGenerator;
        constructor(view, config) {
            this.view = view;
            this.config = config;
            const self = this;
            return new Proxy(view, {
                get(obj, prop, receiver) {
                    return Reflect.get(self, prop, receiver)
                        ?? Reflect.get(view, prop, receiver);
                },
                set(obj, prop, value, receiver) {
                    return Reflect.set(self, prop, value, receiver)
                        || Reflect.set(view, prop, value, receiver);
                }
            });
        }
        get raw() {
            return this.view;
        }
        get id() {
            return this._id;
        }
        get name() {
            return this.view.name;
        }
        set name(value) {
            this.view.name = value;
        }
        set resetType(value) {
            const oldKey = `reset:${this.view.resetType}`;
            const newKey = `reset:${value}`;
            const info = this.view.milestones[oldKey];
            Vue.delete(this.view.milestones, oldKey);
            Vue.set(this.view.milestones, newKey, info);
            this.view.resetType = value;
        }
        get active() {
            return this.config.openViewIndex === this.index;
        }
        get index() {
            return this.config.views.indexOf(this);
        }
        addMilestone(milestone) {
            if (!(milestone in this.view.milestones)) {
                const index = Object.entries(this.view.milestones).length;
                const colors = Object.values(Observable10);
                const color = effectColors[milestone] ?? colors[index % colors.length];
                Vue.set(this.view.milestones, milestone, { index, enabled: true, color });
            }
        }
        removeMilestone(milestone) {
            if (milestone in this.view.milestones) {
                Vue.delete(this.view.milestones, milestone);
                this.updateMilestoneOrder(getSortedMilestones(this.view));
            }
        }
        toggleMilestone(milestone) {
            const info = this.view.milestones[milestone];
            if (info !== undefined) {
                info.enabled = !info.enabled;
            }
        }
        setMilestoneColor(milestone, color) {
            const info = this.view.milestones[milestone];
            if (info !== undefined) {
                info.color = color;
            }
        }
        moveMilestone(from, to) {
            const milestones = getSortedMilestones(this.view);
            moveElement(milestones, from, to);
            this.updateMilestoneOrder(milestones);
        }
        sortMilestones(history) {
            sortMilestones(this, history);
        }
        resetColors() {
            const colors = Object.values(Observable10);
            for (const [milestone, info] of Object.entries(this.view.milestones)) {
                info.color = effectColors[milestone] ?? colors[info.index % colors.length];
            }
        }
        toggleAdditionalInfo(key) {
            const idx = this.view.additionalInfo.indexOf(key);
            if (idx !== -1) {
                this.view.additionalInfo.splice(idx, 1);
            }
            else {
                this.view.additionalInfo.push(key);
            }
        }
        updateMilestoneOrder(milestones) {
            for (let i = 0; i !== milestones.length; ++i) {
                this.view.milestones[milestones[i]].index = i;
            }
        }
    }
    function makeViewProxy(config, view) {
        return new ViewUtils(view, config);
    }
    class ConfigManager {
        game;
        config;
        _views;
        constructor(game, config) {
            this.game = game;
            this.config = Vue.reactive(config);
            this.watch(() => saveConfig(this.config));
            this._views = this.config.views.map(v => makeViewProxy(this, v));
        }
        watch(callback, immediate = false) {
            Vue.watch(this.config, callback, { deep: true, immediate });
        }
        get active() {
            return this.config.active ?? false;
        }
        set active(value) {
            this.config.active = value;
        }
        get views() {
            return this._views;
        }
        get recordRuns() {
            return this.config.recordRuns;
        }
        set recordRuns(value) {
            if (value !== this.config.recordRuns) {
                this.config.recordRuns = value;
            }
        }
        get additionalInfoToTrack() {
            const unique = new Set(this.views.flatMap(v => v.additionalInfo));
            return [...unique];
        }
        get openViewIndex() {
            return this.config.lastOpenViewIndex;
        }
        set openViewIndex(index) {
            this.config.lastOpenViewIndex = index;
        }
        addView() {
            const colors = Object.values(Observable10);
            const view = {
                resetType: "ascend",
                universe: this.game.universe,
                numRuns: { enabled: false },
                skipRuns: { enabled: false },
                includeCurrentRun: false,
                mode: "timestamp",
                showBars: true,
                showLines: false,
                fillArea: false,
                smoothness: 0,
                milestones: {
                    "reset:ascend": { index: 0, enabled: true, color: colors[0] }
                },
                additionalInfo: []
            };
            return this.insertView(view);
        }
        cloneView(view) {
            const idx = this.views.indexOf(view);
            if (idx !== -1) {
                return this.insertView(clone(view.raw), idx + 1);
            }
        }
        removeView(view) {
            const idx = this.views.indexOf(view);
            if (idx !== -1) {
                this.config.views.splice(idx, 1);
                const removed = this.views.splice(idx, 1);
                if (idx !== 0) {
                    this.openViewIndex = idx - 1;
                }
                else if (this.views.length === 0) {
                    this.openViewIndex = undefined;
                }
                return removed[0];
            }
        }
        moveView(oldIndex, newIndex) {
            moveElement(this.views, oldIndex, newIndex);
            moveElement(this.config.views, oldIndex, newIndex);
            this.openViewIndex = newIndex;
        }
        insertView(view, index) {
            index ??= this.views.length;
            const proxy = makeViewProxy(this, view);
            this.config.views.splice(index, 0, view);
            this.views.splice(index, 0, proxy);
            this.openViewIndex = index;
            return proxy;
        }
    }
    function getConfig(game) {
        const config = loadConfig() ?? { version: VERSION, recordRuns: true, views: [] };
        return new ConfigManager(game, config);
    }

    function inferResetType(runStats, game) {
        const resetCounts = game.resetCounts;
        // Find which reset got incremented
        const reset = Object.keys(resetCounts).find((reset) => {
            return resetCounts[reset] === (runStats.resets[reset] ?? 0) + 1;
        });
        return reset ?? "unknown";
    }
    function isCurrentRun(runStats, game) {
        return game.finishedEvolution && runStats.run === game.runNumber;
    }
    function isPreviousRun(runStats, game) {
        return runStats.run === game.runNumber - 1;
    }
    function makeNewRunStats(game) {
        return {
            run: game.runNumber,
            universe: game.universe,
            resets: game.resetCounts,
            totalDays: game.day,
            milestones: {},
            activeEffects: {},
            effectsHistory: []
        };
    }
    function restoreToDay(run, day) {
        return {
            ...run,
            milestones: filterMap(run.milestones, ([, timestamp]) => timestamp <= day),
            activeEffects: filterMap(run.activeEffects, ([, startDay]) => startDay <= day),
            effectsHistory: run.effectsHistory.filter(([, , endDay]) => endDay <= day),
            totalDays: day
        };
    }
    function prepareCurrentRunImpl(game, config, history) {
        const latestRun = loadLatestRun();
        if (latestRun === null) {
            // No pending run - creare a new one
            return makeNewRunStats(game);
        }
        else if (isCurrentRun(latestRun, game)) {
            // If it is the current run, check if we loaded an earlier save - discard any milestones "from the future"
            return restoreToDay(latestRun, game.day);
        }
        else {
            // The game refreshes the page after a reset
            // Thus, if the latest run is the previous one, it can be comitted to history
            if (isPreviousRun(latestRun, game) && config.recordRuns) {
                history.commitRun(latestRun);
            }
            return makeNewRunStats(game);
        }
    }
    function prepareCurrentRun(game, config, history) {
        const run = Vue.reactive(prepareCurrentRunImpl(game, config, history));
        Vue.watch(run, () => saveCurrentRun(run), { deep: true });
        return run;
    }

    class HistoryManager {
        game;
        config;
        history;
        milestones;
        length;
        constructor(game, config, history) {
            this.game = game;
            this.config = config;
            this.history = history;
            this.length = Vue.ref(history.runs.length);
            this.watch(() => saveHistory(history));
            this.milestones = rotateMap(history.milestones);
        }
        watch(callback) {
            Vue.watch(this.length, callback);
        }
        get milestoneIDs() {
            return this.history.milestones;
        }
        get runs() {
            return this.history.runs;
        }
        discardRun(run) {
            const idx = this.runs.indexOf(run);
            if (idx !== -1) {
                this.history.runs.splice(idx, 1);
                this.length.value = this.runs.length;
            }
        }
        commitRun(runStats) {
            const resetType = inferResetType(runStats, this.game);
            const entry = {
                run: runStats.run,
                universe: runStats.universe,
                starLevel: runStats.starLevel,
                milestones: [
                    [this.getMilestoneID(`reset:${resetType}`), runStats.totalDays]
                ]
            };
            const matchingViews = this.config.views.filter(v => shouldIncludeRun(entry, v, this));
            this.collectMilestones(entry, runStats, matchingViews);
            this.collectEffects(entry, runStats, matchingViews);
            this.collectAdditionalInfo(entry, runStats, matchingViews);
            this.history.runs.push(entry);
            this.length.value = this.runs.length;
        }
        getMilestone(id) {
            return this.milestones[id];
        }
        getMilestoneID(milestone) {
            return this.milestoneIDs[milestone] ?? this.addMilestone(milestone);
        }
        addMilestone(milestone) {
            const milestoneIDs = Object.values(this.milestoneIDs);
            const id = milestoneIDs.length !== 0 ? Math.max(...milestoneIDs) + 1 : 0;
            this.milestones[id] = milestone;
            this.milestoneIDs[milestone] = id;
            return id;
        }
        collectMilestones(entry, runStats, views) {
            const milestonesFilter = new Set(views.flatMap(v => Object.keys(v.milestones)));
            entry.milestones.push(...Object.entries(runStats.milestones)
                .filter(([milestone]) => milestonesFilter.has(milestone))
                .map(([milestone, days]) => [this.getMilestoneID(milestone), days]));
            entry.milestones.sort(([, l], [, r]) => l - r);
        }
        collectEffects(entry, runStats, views) {
            const milestonesFilter = new Set(views.flatMap(v => Object.keys(v.milestones)));
            let effectsHistory = [
                ...runStats.effectsHistory,
                ...Object.entries(runStats.activeEffects)
                    .map(([effect, start]) => [effect, start, runStats.totalDays])
            ];
            effectsHistory = effectsHistory.filter(([effect]) => milestonesFilter.has(effect));
            if (effectsHistory.length !== 0) {
                entry.effects = effectsHistory.map(([effect, start, end]) => [this.getMilestoneID(effect), start, end]);
            }
        }
        collectAdditionalInfo(entry, runStats, views) {
            const infoKeys = new Set(views.flatMap(v => v.additionalInfo));
            for (const key of infoKeys.values()) {
                entry[key] = runStats[key];
            }
        }
    }
    function blankHistory() {
        return {
            milestones: {},
            runs: []
        };
    }
    function initializeHistory(game, config) {
        const history = loadHistory() ?? blankHistory();
        return new HistoryManager(game, config, history);
    }

    function updateMilestones(runStats, checkers) {
        for (const { milestone, reached } of checkers) {
            // Don't check completed milestones
            if (milestone in runStats.milestones) {
                continue;
            }
            if (milestoneType(milestone) === "effect") {
                const isActive = reached();
                const startDay = runStats.activeEffects[milestone];
                if (isActive && startDay === undefined) {
                    Vue.set(runStats.activeEffects, milestone, runStats.totalDays);
                }
                else if (!isActive && startDay !== undefined) {
                    runStats.effectsHistory.push([milestone, startDay, runStats.totalDays - 1]);
                    Vue.delete(runStats.activeEffects, milestone);
                }
            }
            else if (reached()) {
                // Since this callback is invoked at the beginning of a day,
                // the milestone was reached the previous day
                Vue.set(runStats.milestones, milestone, Math.max(0, runStats.totalDays - 1));
            }
        }
    }
    function junkTraits(game) {
        if (!game.finishedEvolution) {
            return undefined;
        }
        const hasJunkGene = game.hasChallengeGene("no_crispr");
        const hasBadGenes = game.hasChallengeGene("badgenes");
        if (!hasJunkGene && !hasBadGenes) {
            return {};
        }
        // All negative major traits that have different rank from this race's base number
        let traits = game.majorTraits
            .filter(t => game.traitValue(t) < 0)
            .filter(t => game.currentTraitRank(t) !== game.baseTraitRank(t));
        // The imitated negative trait is included - keep it only if it got upgraded
        if (traits.length > (hasBadGenes ? 3 : 1)) {
            traits = traits.filter(t => !game.imitatedTraits.includes(t));
        }
        return Object.fromEntries(traits.map(t => [t, game.currentTraitRank(t)]));
    }
    function updateAdditionalInfo(runStats, game) {
        Vue.set(runStats, "starLevel", game.starLevel);
        Vue.set(runStats, "universe", game.universe);
        Vue.set(runStats, "raceName", game.raceName);
        Vue.set(runStats, "junkTraits", junkTraits(game));
        Vue.set(runStats, "combatDeaths", game.combatDeaths);
    }
    function withEventConditions(milestones) {
        const hasPrecondition = (event) => eventsInfo[event].conditionMet !== undefined;
        const conditions = milestones
            .map(patternMatcher([[/event:(.+)/, (id) => hasPrecondition(id) ? `event_condition:${id}` : undefined]]))
            .filter(m => m !== undefined);
        return [...conditions, ...milestones];
    }
    function collectMilestones(config) {
        const uniqueMilestones = new Set(config.views.flatMap(v => {
            return Object.entries(v.milestones)
                .filter(([milestone]) => !milestone.startsWith("reset:"))
                .map(([milestone]) => milestone);
        }));
        return Array.from(uniqueMilestones);
    }
    function makeMilestoneCheckers(game, config) {
        const milestones = collectMilestones(config);
        return withEventConditions(milestones).map(m => makeMilestoneChecker(game, m));
    }
    function trackMilestones(currentRun, game, config) {
        let checkers = [];
        config.watch(() => { checkers = makeMilestoneCheckers(game, config); }, true /*immediate*/);
        game.onGameDay(day => {
            if (!config.recordRuns) {
                return;
            }
            currentRun.totalDays = day;
            updateAdditionalInfo(currentRun, game);
            updateMilestones(currentRun, checkers);
        });
    }

    var styles = `
        html.dark {
            .bg-dark {
                background: #181818;
            }

            .color-picker {
                background-color: #f5f5f5;
                border: .0625rem solid #000000;
                color: #363636;

                input[type="text"] {
                    background: #ffffff !important;
                }
            }
        }

        html.light {
            .bg-dark {
                background: #dddddd;
            }

            .color-picker {
                background-color: #f5f5f5;
                border: .0625rem solid #000000;
                color: #363636;

                input[type="text"] {
                    background: #ffffff !important;
                }
            }
        }

        html.redgreen {
            .bg-dark {
                background: #181818;
            }

            .color-picker {
                background-color: #0f0f0f;
                border: .0625rem solid #999999;
                color: #ffffff;

                input[type="text"] {
                    background: #ffffff !important;
                }
            }
        }

        html.darkNight {
            .bg-dark {
                background: #181818;
            }

            .color-picker {
                background-color: #0f0f0f;
                border: .0625rem solid #999999;
                color: #b8b8b8;

                input[type="text"] {
                    background: #b8b8b8 !important;
                }
            }
        }

        html.gruvboxLight {
            .bg-dark {
                background: #a89984;
            }

            .color-picker {
                background-color: #fbf1c7;
                border: .0625rem solid #3c3836;
                color: #3c3836;

                input[type="text"] {
                    background: #3c3836 !important;
                }
            }
        }

        html.gruvboxDark {
            .bg-dark {
                background: #1d2021;
            }

            .color-picker {
                background-color: #282828;
                border: .0625rem solid #665c54;
                color: #ebdbb2;

                input[type="text"] {
                    background: #ebdbb2 !important;
                }
            }
        }

        html.orangeSoda {
            .bg-dark {
                background: #181818;
            }

            .color-picker {
                background-color: #292929;
                border: .0625rem solid #313638;
                color: #313638;

                input[type="text"] {
                    background: #ebdbb2 !important;
                }
            }
        }

        html.dracula {
            .bg-dark {
                background: #1a1c24;
            }

            .color-picker {
                background-color: #1a1c24;
                border: .0625rem solid #44475a;
                color: #44475a;

                input[type="text"] {
                    background: #f8f8f2 !important;
                }
            }
        }

        .w-fit {
            width: fit-content;
        }

        .w-full {
            width: 100%;
        }

        .flex {
            display: flex;
        }

        .flex-row {
            flex-direction: row;
        }

        .flex-col {
            flex-direction: column;
        }

        .flex-wrap {
            flex-wrap: wrap;
        }

        .justify-between {
            justify-content: space-between;
        }

        .justify-end {
            justify-content: flex-end;
        }

        .self-center {
            align-self: center;
        }

        .order-last {
            order: calc(infinity);
        }

        .gap-s {
            gap: 0.5em;
        }

        .gap-m {
            gap: 1em;
        }

        .color-picker {
            border-radius: .25rem;
            width: fit-content !important;

            ::before {
                background: none !important;
            }

            .pcr-save {
                background-color: #4269d0;
                color: #ebdbb2;
            }

            .pcr-swatches {
                display: flex;
                width: fit-content;
            }
        }

        #mTabAnalytics {
            input::-webkit-outer-spin-button,
            input::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
                text-align: center;
            }

            input[type=number] {
                -moz-appearance: textfield;
                text-align: center;
                border-radius: 0;
            }

            input[type="text"] {
                height: 1.5rem;
            }

            input[type="number"] {
                height: 1.5rem;
            }

            .input {
                vertical-align: bottom;
            }

            .theme {
                margin-bottom: 0;
            }

            .slim {
                height: 1.5rem;
            }

            .crossed {
                text-decoration: line-through;
            }

            .hidden {
                display: none;
            }

            span.add {
                line-height: normal;
                width: 1.5rem;
                height: 1.5rem;
            }

            span.sub {
                line-height: normal;
                width: 1.5rem;
                height: 1.5rem;
            }

            div.b-slider {
                width: 10rem;
            }

            .b-checkbox.checkbox .control-label {
                padding-left: 0.5rem;
            }

            .b-checkbox.checkbox:not(.button) {
                margin-right: 0;
            }

            .b-slider {
                margin: 0 0 0 1rem;
                align-self: center;
            }

            .b-slider-fill {
                top: unset;
                transform: unset;
            }

            .autocomplete.control {
                flex-grow: 1;
            }

            .dropdown {
                width: fit-content;

                button {
                    width: 9rem;
                }
            }

            .dropdown-menu {
                flex-grow: 1;
                min-width: 9rem;
            }

            .dropdown-content {
                scrollbar-width: thin;
                flex-grow: 1;
                max-height: 20rem;
            }

            div.dropdown-item {
                color: unset;
            }

            .dropdown-item {
                width: 100%;
                padding-left: 1rem;
                padding-right: 1rem;
            }

            .view-tab-header {
                max-width: 15em;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .tabs li.has-text-warning a {
                color: unset;
            }

            .plot-swatches {
                font-family: system-ui, sans-serif;
                font-size: 1rem;
                align-items: center;

                min-height: 33px;
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                column-gap: 1em;

                .plot-swatch {
                    display: inline-flex;
                    align-items: center;
                    cursor: pointer;
                }

                svg {
                    margin-right: 0.5em;
                    overflow: visible;
                }
            }

            .market-item.alt {
                margin: 0;
                align-items: center;
                justify-content: center;
                opacity: 0.5;
            }
        }

        li[role="tab"].is-disabled {
            display: none !important;
        }

        #settings {
            &.slide-prev-leave-to {
                position: absolute !important;
            }

            &.slide-next-leave-to {
                position: absolute !important;
            }

            &.slide-prev-enter {
                position: absolute !important;
            }

            &.slide-next-enter {
                position: absolute !important;
            }
        }

        #mainColumn {
            overflow: hidden;
        }

        #pausegame {
            margin-left: 0 !important;
        }
    `;

    function waitFor(query) {
        let count = 1;
        if (Array.isArray(query)) {
            count = query.length;
            query = query.join(", ");
        }
        return new Promise(resolve => {
            const node = $(query);
            if (node.length === count) {
                resolve(node);
            }
            const observer = new MutationObserver(() => {
                const node = $(query);
                if (node.length === count) {
                    observer.disconnect();
                    resolve(node);
                }
            });
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }
    function monitor(query, parent, callback) {
        const nodes = $(parent).find(query);
        if (nodes.length !== 0) {
            callback(nodes);
        }
        const observer = new MutationObserver((changes) => {
            for (const { addedNodes } of changes) {
                const nodes = $(addedNodes).find(query);
                if (nodes.length !== 0) {
                    callback(nodes);
                }
            }
        });
        for (const node of parent) {
            observer.observe(node, {
                childList: true,
                subtree: true
            });
        }
    }

    const scale = 2;
    function context2d(width, height, canvasWidth, canvasHeight) {
        canvasWidth ??= width;
        canvasHeight ??= height;
        const canvas = document.createElement("canvas");
        canvas.width = width * scale;
        canvas.height = height * scale;
        canvas.style.width = canvasWidth + "px";
        canvas.style.height = canvasHeight + "px";
        const context = canvas.getContext("2d");
        context.scale(scale, scale);
        return context;
    }
    async function graphToCanvas(plot, backgroundColor) {
        const color = $(plot).css("color");
        const font = $(plot).css("font");
        const style = `
            <style>
                svg {
                    display: block;
                    background: ${backgroundColor};
                }

                svg text {
                    white-space: pre;
                    color: ${color};
                    font: ${font};
                }

                [stroke="currentColor"] {
                    color: ${color};
                }
            </style>
        `;
        const offsetX = 5;
        const canvasWidth = $(plot).width();
        const canvasHeight = $(plot).height();
        const { width, height } = plot.viewBox.baseVal;
        const context = context2d(width + offsetX * 2, height, canvasWidth, canvasHeight);
        const im = new Image();
        im.width = width + offsetX * 2;
        im.height = height;
        $(plot).attr("xmlns", "http://www.w3.org/2000/svg");
        const idx = -"</svg>".length;
        im.src = "data:image/svg+xml," + encodeURIComponent(plot.outerHTML.slice(0, idx) + style + plot.outerHTML.slice(idx));
        return new Promise((resolve) => {
            im.onload = () => {
                context.drawImage(im, offsetX, 0, width, height);
                resolve(context.canvas);
            };
        });
    }
    async function legendToCanvas(legend, backgroundColor) {
        const width = $(legend).width();
        const height = $(legend).height();
        legend.style.setProperty("max-width", `${width}px`);
        legend.style.setProperty("max-height", `${height}px`);
        const canvas = await htmlToImage.toCanvas(legend, {
            backgroundColor,
            width: width,
            height: height,
            pixelRatio: scale,
            skipFonts: true,
            filter: e => e.localName !== "button"
        });
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        legend.style.removeProperty("max-width");
        legend.style.removeProperty("max-height");
        return canvas;
    }
    async function plotToCanvas(plot, legend) {
        const backgroundColor = $("html").css("background-color");
        const legendCanvas = await legendToCanvas(legend, backgroundColor);
        const graphCanvas = await graphToCanvas(plot, backgroundColor);
        const offsetY = 10;
        const gapY = 10;
        const legendHeight = parseFloat(legendCanvas.style.height);
        const graphHeight = parseFloat(graphCanvas.style.height);
        const height = legendHeight + graphHeight + offsetY + gapY;
        const width = parseFloat(legendCanvas.style.width);
        const context = context2d(width, height);
        context.fillStyle = backgroundColor;
        context.fillRect(0, 0, width, height);
        context.drawImage(legendCanvas, 0, offsetY, width, legendHeight);
        context.drawImage(graphCanvas, 0, legendHeight + offsetY + gapY, width, graphHeight);
        return context.canvas;
    }

    var EnumInput = {
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

    var NumberInput = {
        props: ["value", "placeholder", "min", "max", "disabled"],
        methods: {
            add() {
                this.$refs.input.stepUp();
                this.onChange(this.$refs.input.value);
            },
            subtract() {
                this.$refs.input.stepDown();
                this.onChange(this.$refs.input.value);
            },
            onChange(rawValue) {
                if (rawValue === "") {
                    this.$emit("input", undefined);
                }
                else {
                    let value = Number(rawValue);
                    if (this.min !== undefined) {
                        value = Math.max(this.min, value);
                    }
                    if (this.max !== undefined) {
                        value = Math.min(this.max, value);
                    }
                    if (value !== Number(rawValue)) {
                        this.$refs.input.value = value;
                    }
                    this.$emit("input", value);
                }
            }
        },
        template: `
            <div class="flex">
                <label v-if="$slots.default" class="self-center" style="margin-right: 0.5rem">
                    <slot/>
                </label>

                <span role="button" class="button has-text-danger sub" @click="subtract">-</span>
                <input
                    ref="input"
                    type="number"
                    class="input"
                    :value="value"
                    @change="event => onChange(event.target.value)"
                    :placeholder="placeholder"
                    :min="min"
                    :max="max"
                    style="width: 4em"
                >
                <span role="button" class="button has-text-success add" @click="add">+</span>
            </div>
        `
    };

    var ToggleableNumberInput = {
        components: { NumberInput },
        props: ["label", "value", "placeholder", "min", "max"],
        template: `
            <div class="flex flex-row">
                <b-checkbox v-model="value.enabled" style="margin-right: 0.25em">{{ label }}</b-checkbox>
                <number-input v-model="value.value" :placeholder="placeholder" :min="min" :max="max"/>
            </div>
        `
    };

    function optional(key) {
        return {
            get() {
                return this.view[key];
            },
            set(value) {
                Vue.set(this.view, key, value);
            }
        };
    }
    var ViewSettings = {
        components: {
            EnumInput,
            NumberInput,
            ToggleableNumberInput
        },
        props: ["view"],
        data() {
            return {
                universes: { any: "Any", ...universes },
                viewModes,
                additionalInformation
            };
        },
        computed: {
            resets() {
                if (this.view.universe === "magic") {
                    return { ...resets, blackhole: "Vacuum Collapse" };
                }
                else {
                    return resets;
                }
            },
            universe: {
                get() {
                    return this.view.universe ?? "any";
                },
                set(value) {
                    this.view.universe = value === "any" ? undefined : value;
                }
            },
            starLevel: optional("starLevel"),
            daysScale: optional("daysScale"),
            includeCurrentRun: optional("includeCurrentRun"),
        },
        template: `
            <div class="flex flex-col flex-wrap gap-m">
                <div class="flex flex-row flex-wrap gap-m theme">
                    <enum-input v-model="view.resetType" :options="resets">Reset type</enum-input>
                    <enum-input v-model="universe" :options="universes">Universe</enum-input>
                    <number-input v-model="starLevel" min="0" max="4" placeholder="Any">Star level</number-input>
                </div>

                <div class="flex flex-row flex-wrap gap-m theme">
                    <number-input v-model="daysScale" min="1" placeholder="Auto">Days scale</number-input>
                    <toggleable-number-input label="Skip first N runs" v-model="view.skipRuns" min="0" placeholder="None"/>
                    <toggleable-number-input label="Show last N runs" v-model="view.numRuns" min="1" placeholder="All"/>
                </div>

                <div class="flex flex-row flex-wrap gap-m theme">
                    <enum-input v-model="view.mode" :options="viewModes">Mode</enum-input>
                    <template v-if="view.mode === 'timestamp'">
                        <b-checkbox v-model="view.showBars">Bars</b-checkbox>
                        <b-checkbox v-model="view.showLines">Lines</b-checkbox>
                        <template v-if="view.showLines">
                            <b-checkbox v-model="view.fillArea">Fill area</b-checkbox>
                            <div class="flex flex-row self-center">
                                <label style="vertical-align: middle">Smoothness</label>
                                <b-slider v-model="view.smoothness" :tooltip="false"/>
                            </div>
                        </template>
                    </template>
                    <template v-else-if="view.mode === 'duration'">
                        <div class="flex flex-row">
                            <label>Smoothness</label>
                            <b-slider v-model="view.smoothness" :tooltip="false"/>
                        </div>
                    </template>
                </div>

                <div class="flex flex-row flex-wrap gap-m">
                    <span>Additional info:</span>
                    <b-checkbox v-model="includeCurrentRun">Current run</b-checkbox>
                    <template v-for="(label, key) in additionalInformation">
                        <b-checkbox :checked="view.additionalInfo.includes(key)" @input="() => view.toggleAdditionalInfo(key)">{{ label }}</b-checkbox>
                    </template>
                </div>
            </div>
        `
    };

    function makeMilestoneGroup(name, type, options) {
        return {
            type: name,
            options: Object.entries(options).map(([id, label]) => ({ type, id, label }))
        };
    }
    function* makeBuildingGroups() {
        const makeGroup = ([id, { name, region, suffix }]) => ({
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
    var MilestoneController = {
        components: {
            NumberInput
        },
        inject: ["history"],
        props: ["view"],
        data() {
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
            };
        },
        computed: {
            filteredOptions() {
                return this.options
                    .map(({ type, options }) => {
                    const candidates = fuzzysort.go(this.input, options, { key: "label", all: true });
                    const score = candidates.reduce((acc, { score }) => Math.max(acc, score), 0);
                    return {
                        type,
                        score,
                        options: candidates.map(c => c.obj)
                    };
                })
                    .filter(({ options }) => options.length !== 0)
                    .sort((l, r) => r.score - l.score);
            },
            milestone() {
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
        watch: {
            selected(value) {
                if (value) {
                    this.count = segments[value.id] ?? 1;
                }
            }
        },
        methods: {
            add() {
                if (this.milestone !== undefined) {
                    this.view.addMilestone(this.milestone);
                }
            },
            sort() {
                this.view.sortMilestones(this.history);
            },
            resetColors() {
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

    function removable(element) {
        return milestoneType(element.getAttribute("data-milestone")) !== "reset";
    }
    var MilestoneRemover = {
        props: ["view"],
        methods: {
            remove(milestone) {
                this.view.removeMilestone(milestone);
            }
        },
        mounted() {
            Sortable.create(this.$refs.container, {
                ghostClass: "hidden",
                sort: false,
                group: {
                    name: "milestones",
                    pull: false,
                    put: (to, from, element) => removable(element)
                },
                onAdd: (event) => {
                    const milestone = event.item.getAttribute("data-milestone");
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

    function makeColorPickerTrigger(target, overflow = 0) {
        const width = Number(target.attr("width"));
        const height = Number(target.attr("height"));
        const trigger = $(`<button></button>`)
            .css("position", "absolute")
            .css("padding", "0")
            .css("top", "0px")
            .css("left", `-${overflow}px`)
            .css("width", `${width + overflow * 2}px`)
            .css("height", `${height + overflow * 2}px`)
            .css("background", "transparent")
            .css("border", "none")
            .css("cursor", "pointer");
        return trigger;
    }
    // Reuse the same Pickr instance
    let colorPickerInstance = null;
    const vtable = {};
    function getPickrInstance() {
        if (colorPickerInstance !== null) {
            return colorPickerInstance;
        }
        const trigger = $(`<button></button>`);
        const pickr = new Pickr({
            container: "#mTabAnalytics > div.b-tabs > section.tab-content",
            el: trigger[0],
            useAsButton: true,
            position: "top-middle",
            theme: "classic",
            appClass: "color-picker",
            lockOpacity: true,
            swatches: Object.values(Observable10),
            components: {
                palette: true,
                hue: true,
                interaction: {
                    input: true,
                    save: true
                }
            }
        });
        let pending = false;
        pickr.on("show", () => {
            pending = true;
        });
        pickr.on("hide", (instance) => {
            if (pending) {
                instance.setColor(vtable.defaultColor);
                vtable.onCancel();
                pending = false;
            }
        });
        pickr.on("save", (value, instance) => {
            const hex = value?.toHEXA()?.toString();
            if (hex) {
                vtable.onSave(hex);
                pending = false;
            }
            instance.hide();
        });
        pickr.on("change", (value) => {
            vtable.onChange(value.toHEXA().toString());
        });
        return colorPickerInstance = [pickr, trigger];
    }
    function makeColorPicker(target, overflow, instanceCallbacks) {
        const [pickr, trigger] = getPickrInstance();
        const wrapper = makeColorPickerTrigger(target, overflow).on("click", function () {
            const defaultColor = instanceCallbacks.currentColor();
            Object.assign(vtable, { ...instanceCallbacks, defaultColor });
            pickr.setColor(defaultColor, true);
            trigger.prop("style", $(this).attr("style"));
            trigger.insertAfter(target);
            trigger.trigger("click");
        });
        target.parent().css("position", "relative");
        wrapper.insertAfter(target);
    }

    var MilestoneSwatch = {
        props: ["view", "milestone", "label"],
        data() {
            return {
                pendingColor: null
            };
        },
        computed: {
            type() {
                return milestoneType(this.milestone);
            },
            enabled() {
                return this.view.milestones[this.milestone].enabled;
            },
            color() {
                return this.pendingColor ?? this.view.milestones[this.milestone].color;
            }
        },
        methods: {
            toggle() {
                this.view.toggleMilestone(this.milestone);
            },
            changeColor(color) {
                this.view.setMilestoneColor(this.milestone, color);
            }
        },
        directives: {
            colorPicker: {
                inserted(element, _, vnode) {
                    const self = vnode.context;
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
            <span class="plot-swatch" :data-milestone="milestone">
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

    var PlotLegend = {
        components: {
            MilestoneSwatch
        },
        props: ["view"],
        computed: {
            milestones() {
                return getSortedMilestones(this.view);
            },
            milestoneNames() {
                return generateMilestoneNames(this.milestones, this.view.universe);
            },
            legend() {
                return this.$refs.container;
            }
        },
        mounted() {
            Sortable.create(this.$refs.container, {
                group: "milestones",
                animation: 150,
                onStart: () => {
                    this.$emit("drag", true);
                },
                onEnd: () => {
                    this.$emit("drag", false);
                },
                onUpdate: ({ oldIndex, newIndex }) => {
                    this.view.moveMilestone(oldIndex, newIndex);
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

    function makeMilestoneNamesMapping(view) {
        const milestones = Object.keys(view.milestones);
        const milestoneNames = generateMilestoneNames(milestones, view.universe);
        return Object.fromEntries(zip(milestones, milestoneNames));
    }
    class SegmentCounter {
        view;
        milestones = new Map();
        events = new Map();
        eventConditions = new Map();
        expectedMilestones = new Map();
        _futureMilestones = undefined;
        constructor(view) {
            this.view = view;
        }
        onMilestone(milestone, day, options) {
            const saveTo = (collection) => {
                if (milestone in this.view.milestones) {
                    collection.set(milestone, day);
                }
            };
            if (options?.expected) {
                if (!["event", "effect"].includes(milestoneType(milestone))) {
                    saveTo(this.expectedMilestones);
                }
            }
            else {
                patternMatch(milestone, [
                    [/event_condition:(.+)/, (event) => this.eventConditions.set(event, day)],
                    [/event:.+/, () => saveTo(this.events)],
                    [/effect:.+/, () => { }],
                    [/.+/, () => saveTo(this.milestones)]
                ]);
            }
        }
        *segments() {
            let previousDay = 0;
            let previousEnabledDay = 0;
            // Past milestones
            for (const [milestone, day] of this.milestones.entries()) {
                if (this.view.milestones[milestone].enabled) {
                    yield {
                        milestone,
                        day,
                        segment: day - previousDay,
                        dayDiff: day - previousEnabledDay
                    };
                }
                previousDay = day;
                if (this.view.milestones[milestone].enabled) {
                    previousEnabledDay = day;
                }
            }
            // Past events
            for (const [milestone, day] of this.events.entries()) {
                if (this.view.milestones[milestone].enabled) {
                    const event = milestone.slice('event:'.length);
                    const defaultTriggerDay = (eventsInfo[event]?.conditionMet === undefined) ? 0 : day;
                    const preconditionDay = this.eventConditions.get(event) ?? defaultTriggerDay;
                    yield {
                        milestone,
                        day,
                        segment: day - preconditionDay,
                        event: true
                    };
                }
            }
        }
        *pendingSegments(currentDay) {
            const lastMilestoneDay = lastValue(this.milestones) ?? 0;
            const lastEnabledMilestoneDay = lastValue(this.milestones, (milestone) => this.view.milestones[milestone].enabled) ?? 0;
            // Pending milestone
            const milestone = this.futureMilestones[0]?.[0] ?? `reset:${this.view.resetType}`;
            if (this.view.milestones[milestone].enabled) {
                yield {
                    milestone,
                    day: currentDay,
                    segment: currentDay - lastMilestoneDay,
                    dayDiff: currentDay - lastEnabledMilestoneDay
                };
            }
            // Pending events
            for (const [event, preconditionDay] of this.eventConditions.entries()) {
                const milestone = `event:${event}`;
                if (this.view.milestones[milestone]?.enabled && !this.events.has(milestone)) {
                    yield {
                        milestone,
                        day: currentDay,
                        segment: currentDay - preconditionDay,
                        event: true
                    };
                }
            }
        }
        *futureSegments(currentDay) {
            if (this.futureMilestones.length === 0) {
                return;
            }
            const [nextMilestone, nextMilestoneDay] = this.futureMilestones[0];
            const possibleTimeSave = Math.max(0, nextMilestoneDay - currentDay);
            const timeLoss = Math.max(0, currentDay - nextMilestoneDay);
            // Squish the immediate segment if it's covered by the pending one
            yield {
                milestone: nextMilestone,
                day: Math.max(nextMilestoneDay, currentDay),
                segment: possibleTimeSave,
                dayDiff: possibleTimeSave
            };
            let previousDay = nextMilestoneDay;
            for (const [milestone, day] of this.futureMilestones.slice(1)) {
                const segment = day - previousDay;
                yield {
                    milestone,
                    day: day + timeLoss,
                    segment,
                    dayDiff: segment
                };
                previousDay = day;
            }
        }
        get futureMilestones() {
            if (this._futureMilestones === undefined) {
                this._futureMilestones = this.calculateFutureMilestones();
            }
            return this._futureMilestones;
        }
        calculateFutureMilestones() {
            const expectedMilestones = [...this.expectedMilestones.entries()];
            const isReached = ([milestone]) => this.milestones.has(milestone);
            // Skip until the first unachieved milestone
            let lastCommonIdx = -1;
            if (this.milestones.size !== 0) {
                lastCommonIdx = expectedMilestones.findLastIndex(isReached);
            }
            // Adjust future timestamps based on the last segment's pace
            let offset = 0;
            if (lastCommonIdx !== -1) {
                const [milestone, day] = expectedMilestones[lastCommonIdx];
                offset = this.milestones.get(milestone) - day;
            }
            return expectedMilestones
                .slice(lastCommonIdx + 1)
                .filter(entry => !isReached(entry))
                .map(([milestone, day]) => [milestone, day + offset]);
        }
    }
    function runAsPlotPoints(currentRun, view, game, bestRun, estimateFutureMilestones, runIdx) {
        const milestoneNames = makeMilestoneNamesMapping(view);
        const milestonesByName = rotateMap(milestoneNames);
        const counter = new SegmentCounter(view);
        const sortedMilestones = Object.entries(currentRun.milestones).toSorted(([, l], [, r]) => l - r);
        for (const [milestone, day] of sortedMilestones) {
            counter.onMilestone(milestone, day);
        }
        if (bestRun !== undefined && bestRun.length !== 0) {
            for (const entry of bestRun) {
                const milestone = milestonesByName[entry.milestone];
                counter.onMilestone(milestone, entry.day, { expected: true });
            }
        }
        const entries = [];
        const additionalInfo = objectSubset(currentRun, view.additionalInfo);
        if (additionalInfo.junkTraits !== undefined) {
            additionalInfo.junkTraits = transformMap(additionalInfo.junkTraits, ([trait, rank]) => [game.traitName(trait), rank]);
        }
        const addEntry = (milestone, options) => {
            entries.push({
                run: runIdx,
                milestone: milestoneNames[milestone],
                ...additionalInfo,
                ...options
            });
        };
        for (const { milestone, day, segment, dayDiff, event } of counter.segments()) {
            addEntry(milestone, { day, dayDiff, segment, event });
        }
        for (const { milestone, day, segment, dayDiff, event } of counter.pendingSegments(currentRun.totalDays)) {
            addEntry(milestone, { day, dayDiff, segment, event, pending: true });
        }
        if (estimateFutureMilestones) {
            for (const { milestone, day, segment, dayDiff } of counter.futureSegments(currentRun.totalDays)) {
                addEntry(milestone, { day, dayDiff, segment, future: true });
            }
        }
        for (const [effect, start, end] of currentRun.effectsHistory) {
            if (view.milestones[effect]?.enabled) {
                addEntry(effect, { day: end, segment: end - start, effect: true });
            }
        }
        for (const [effect, start] of Object.entries(currentRun.activeEffects)) {
            if (view.milestones[effect]?.enabled) {
                addEntry(effect, { day: currentRun.totalDays, segment: currentRun.totalDays - start, effect: true, pending: true });
            }
        }
        return entries;
    }
    function asPlotPoints(filteredRuns, history, view, game) {
        const milestoneNames = makeMilestoneNamesMapping(view);
        const entries = [];
        for (let i = 0; i !== filteredRuns.length; ++i) {
            const run = filteredRuns[i];
            const counter = new SegmentCounter(view);
            for (const [milestoneID, day] of run.milestones) {
                const milestone = history.getMilestone(milestoneID);
                counter.onMilestone(milestone, day);
            }
            let junkTraits = undefined;
            if (run.junkTraits !== undefined) {
                junkTraits = transformMap(run.junkTraits, ([trait, rank]) => [game.traitName(trait), rank]);
            }
            for (const { milestone, day, segment, dayDiff, event } of counter.segments()) {
                const milestoneName = milestoneNames[milestone];
                entries.push({
                    run: i,
                    raceName: run.raceName,
                    combatDeaths: run.combatDeaths,
                    junkTraits,
                    milestone: milestoneName,
                    day,
                    dayDiff,
                    segment,
                    event
                });
            }
            for (const [effect, start, end] of run.effects ?? []) {
                const milestone = history.getMilestone(effect);
                if (view.milestones[milestone]?.enabled) {
                    entries.push({
                        run: i,
                        milestone: milestoneNames[milestone],
                        day: end,
                        segment: end - start,
                        effect: true
                    });
                }
            }
        }
        return entries;
    }

    const topTextOffset = -27;
    const marginTop = 30;
    function getType(point) {
        if (point.event) {
            return "event";
        }
        else if (point.effect) {
            return "effect";
        }
        else {
            return "milestone";
        }
    }
    function getStatus(point) {
        if (point.pending) {
            return "pending";
        }
        else if (point.future) {
            return "future";
        }
        else {
            return "past";
        }
    }
    function only({ type, status }) {
        let impl = (point) => true;
        if (Array.isArray(type)) {
            impl = compose(impl, (point) => type.includes(getType(point)));
        }
        else if (type !== undefined) {
            impl = compose(impl, (point) => getType(point) === type);
        }
        if (Array.isArray(status)) {
            impl = compose(impl, (point) => status.includes(getStatus(point)));
        }
        else if (status !== undefined) {
            impl = compose(impl, (point) => getStatus(point) === status);
        }
        return impl;
    }
    function not(filter) {
        const impl = only(filter);
        return (point) => !impl(point);
    }
    function calculateYScale(plotPoints, view) {
        if (view.daysScale) {
            return [0, view.daysScale];
        }
        else if (plotPoints.length === 0 || (!view.showBars && !view.showLines)) {
            // Default scale with empty history
            return [0, 1000];
        }
    }
    function lastRunEntries(plotPoints) {
        const timestamps = [];
        const lastRun = plotPoints[plotPoints.length - 1]?.run;
        for (let i = plotPoints.length - 1; i >= 0; --i) {
            const entry = plotPoints[i];
            if (entry.run !== lastRun) {
                break;
            }
            timestamps.push(entry);
        }
        return timestamps.reverse();
    }
    function smooth(smoothness, numRuns, params) {
        let avgWindowSize;
        switch (smoothness) {
            case 0:
                avgWindowSize = 1;
                break;
            case 100:
                avgWindowSize = numRuns;
                break;
            default: {
                // Make the transformation from the smoothness % into the number of runs exponential
                // because the average window has decreasingly less impact on the lines as it grows
                const curveSteepness = 5;
                const value = Math.exp(smoothness / 100 * curveSteepness - curveSteepness) * numRuns;
                avgWindowSize = Math.round(value) || 1;
                break;
            }
        }
        return Plot.windowY({ k: avgWindowSize }, params);
    }
    function monotonic(numRuns, params) {
        return Plot.windowY({ k: numRuns, reduce: "min", anchor: "end" }, params);
    }
    // Plot.stackY outputs the middle between y1 and y2 as y for whatever reason - use y2 to place ticks on top
    function adjustedStackY(options) {
        const convert = ({ y1, y2, ...options }) => ({ ...options, y: y2 });
        return convert(Plot.stackY(options));
    }
    function bestSegments(plotPoints) {
        const result = {};
        for (const point of plotPoints) {
            if (getType(point) !== "milestone") {
                continue;
            }
            else if (point.milestone in result) {
                result[point.milestone] = Math.min(result[point.milestone], point.day);
            }
            else {
                result[point.milestone] = point.day;
            }
        }
        return result;
    }
    function* bestSegmentTimes(plotPoints) {
        const lastRunMilestones = lastRunEntries(plotPoints)
            .filter(point => !point.effect && !point.pending)
            .map(entry => entry.milestone);
        const times = filterMap(bestSegments(plotPoints), ([milestone]) => lastRunMilestones.includes(milestone));
        yield Plot.axisY(Object.values(times), {
            anchor: "right",
            label: null
        });
    }
    function* timestamps(plotPoints, key) {
        const lastRunTimestamps = lastRunEntries(plotPoints)
            .filter(point => !point.effect && !point.pending)
            .map(entry => entry[key]);
        yield Plot.axisY(lastRunTimestamps, {
            anchor: "right",
            label: null
        });
    }
    function* statsMarks(runs, bestRun) {
        if (bestRun === undefined) {
            return;
        }
        // Might not be in the selection
        const bestIdx = runs.indexOf(bestRun);
        if (bestIdx !== -1) {
            yield Plot.axisX([bestIdx], {
                tickFormat: () => "PB",
                anchor: "bottom",
                label: null
            });
        }
        const bestTime = runTime(bestRun);
        const averageTime = Math.round(runs.reduce((acc, entry) => acc + runTime(entry), 0) / runs.length);
        yield Plot.text([0], {
            dy: topTextOffset,
            frameAnchor: "top-right",
            text: () => `Fastest (all time): ${bestTime} day(s)\nAverage (${runs.length} runs): ${averageTime} day(s)`
        });
    }
    function* areaMarks(plotPoints, numRuns, smoothness) {
        yield Plot.areaY(plotPoints, smooth(smoothness, numRuns, {
            x: "run",
            y: "dayDiff",
            z: "milestone",
            fill: "milestone",
            fillOpacity: 0.5,
            filter: only({ type: "milestone", status: ["past", "pending"] }),
            title: "milestone"
        }));
        yield Plot.areaY(plotPoints, smooth(smoothness, numRuns, {
            x: "run",
            y1: "day",
            y2: (entry) => entry.day - entry.segment,
            z: "milestone",
            fill: "milestone",
            fillOpacity: 0.5,
            filter: only({ type: "event" }),
            title: "milestone"
        }));
    }
    function* lineMarks(plotPoints, numRuns, key, smoothness) {
        yield Plot.lineY(plotPoints, smooth(smoothness, numRuns, {
            x: "run",
            y: key,
            z: "milestone",
            stroke: "milestone",
            filter: only({ type: ["milestone", "event"] }),
            title: "milestone"
        }));
    }
    function* recordMarks(plotPoints, numRuns) {
        yield Plot.lineY(plotPoints, monotonic(numRuns, {
            x: "run",
            y: "day",
            z: "milestone",
            curve: "step-after",
            stroke: "milestone",
            filter: only({ type: "milestone" }),
            title: "milestone"
        }));
    }
    function* barMarks(plotPoints, key) {
        yield Plot.barY(plotPoints, {
            x: "run",
            y: key,
            z: "milestone",
            fill: "milestone",
            fillOpacity: (entry) => entry.future ? 0.25 : 0.5,
            filter: only({ type: "milestone" }),
            title: "milestone"
        });
        yield Plot.tickY(plotPoints, adjustedStackY({
            x: "run",
            y: key,
            z: "milestone",
            stroke: "milestone",
            filter: only({ type: "milestone" }),
            title: "milestone"
        }));
    }
    function inferBarWidth(plotPoints) {
        const plot = Plot.plot({
            width: 800,
            marks: [...barMarks(plotPoints, "dayDiff")]
        });
        return Number($(plot).find("g[aria-label='bar'] > rect").attr("width"));
    }
    function* segmentMarks(plotPoints, numRuns) {
        const effectPoints = plotPoints.filter(only({ type: "effect" }));
        const barWidth = inferBarWidth(plotPoints);
        const isTemperature = (entry) => entry.milestone === "Hot days" || entry.milestone === "Cold days";
        function* impl(dx, filter) {
            yield Plot.ruleX(effectPoints, {
                x: "run",
                dx,
                y1: "day",
                y2: (entry) => entry.day - entry.segment,
                stroke: "milestone",
                strokeWidth: Math.max(0.75, Math.min(2, 40 / numRuns)),
                strokeOpacity: 0.75,
                filter,
                title: "milestone"
            });
            const dotBase = {
                x: "run",
                dx,
                r: 0.75,
                fill: "milestone",
                stroke: "milestone",
                strokeWidth: Math.max(0.5, Math.min(2, 40 / numRuns)),
                strokeOpacity: 0.75,
                filter,
                title: "milestone"
            };
            yield Plot.dot(effectPoints, { ...dotBase, y: "day", filter: compose(filter, not({ status: "pending" })) });
            yield Plot.dot(effectPoints, { ...dotBase, y: (entry) => entry.day - entry.segment });
        }
        yield* impl(barWidth / 4, (point) => !isTemperature(point));
        yield* impl(-barWidth / 4, (point) => isTemperature(point));
    }
    function* lollipopMarks(plotPoints, stack, numRuns) {
        const dotBase = {
            x: "run",
            r: Math.min(2, 80 / numRuns),
            fill: "milestone",
            stroke: "milestone",
            filter: only({ type: "event", status: "past" }),
            title: "milestone"
        };
        if (stack) {
            yield Plot.ruleX(plotPoints, Plot.stackY({
                x: "run",
                y: "segment",
                stroke: "milestone",
                strokeOpacity: 0.5,
                filter: only({ type: "event" }),
                title: "milestone"
            }));
            yield Plot.dot(plotPoints, adjustedStackY({ ...dotBase, y: "segment" }));
        }
        else {
            yield Plot.ruleX(plotPoints, {
                x: "run",
                y1: "day",
                y2: (entry) => entry.day - entry.segment,
                stroke: "milestone",
                strokeOpacity: 1,
                filter: only({ type: "event" }),
                title: "milestone"
            });
            yield Plot.dot(plotPoints, { ...dotBase, y: "day" });
        }
    }
    function tipText(point, key, history) {
        let prefix;
        if (point.run === history.length) {
            prefix = "Current run";
        }
        else {
            prefix = `Run #${history[point.run].run}`;
        }
        const hasExtraInfo = ["combatDeaths", "junkTraits"].some(k => point[k] !== undefined);
        if (point.raceName !== undefined && !hasExtraInfo) {
            prefix += ` (${point.raceName})`;
        }
        let suffix;
        if (point.pending) {
            suffix = `(in progress)`;
        }
        else {
            suffix = `in ${point[key]} day(s)`;
            if (point.future) {
                suffix += ` (PB pace)`;
            }
        }
        const extraInfo = [];
        if (point.raceName !== undefined && hasExtraInfo) {
            extraInfo.push(`Race: ${point.raceName}`);
        }
        if (point.combatDeaths !== undefined) {
            extraInfo.push(`Died in combat: ${point.combatDeaths}`);
        }
        if (point.junkTraits !== undefined) {
            const genes = Object.entries(point.junkTraits).map(([trait, rank]) => `${trait} (${rank})`);
            extraInfo.push(`Junk traits: ${genes.join(", ")}`);
        }
        if (extraInfo.length > 0) {
            suffix += `\n${extraInfo.join("; ")}`;
        }
        return `${prefix}: ${point.milestone} ${suffix}`;
    }
    function* linePointerMarks(plotPoints, history, key, smoothness) {
        let filter;
        let convert;
        if (smoothness === undefined) {
            filter = only({ type: "milestone" });
            convert = (options) => monotonic(history.length, options);
        }
        else {
            filter = not({ type: "effect" });
            convert = (options) => smooth(smoothness, history.length, options);
        }
        yield Plot.text(plotPoints, Plot.pointerX({
            px: "run",
            py: key,
            dy: topTextOffset,
            frameAnchor: "top-left",
            text: (p) => tipText(p, key, history),
            filter
        }));
        yield Plot.ruleX(plotPoints, Plot.pointerX({
            x: "run",
            py: key,
            filter
        }));
        yield Plot.dot(plotPoints, Plot.pointerX(convert({
            x: "run",
            y: key,
            z: "milestone",
            fill: "currentColor",
            r: 2,
            filter
        })));
    }
    function* rectPointerMarks(plotPoints, history, segmentKey, tipKey) {
        // Transform pointer position from the point to the segment
        function toSegment(options) {
            const convert = ({ x, y, ...options }) => ({ px: x, py: y, ...options });
            return convert(Plot.stackY(options));
        }
        yield Plot.text(plotPoints, Plot.pointerX(toSegment({
            x: "run",
            y: segmentKey,
            dy: topTextOffset,
            frameAnchor: "top-left",
            text: (entry) => tipText(entry, tipKey, history),
            filter: only({ type: "milestone" })
        })));
        yield Plot.barY(plotPoints, Plot.pointerX(Plot.stackY({
            x: "run",
            y: segmentKey,
            fill: "milestone",
            fillOpacity: 0.5,
            filter: only({ type: "milestone" })
        })));
    }
    function generateMarks(plotPoints, filteredRuns, bestRun, view) {
        const marks = [
            Plot.axisY({ anchor: "left", label: "days" }),
            Plot.ruleY([0])
        ];
        switch (view.mode) {
            case "timestamp":
                if (view.showBars) {
                    marks.push(...barMarks(plotPoints, "dayDiff"));
                    marks.push(...rectPointerMarks(plotPoints, filteredRuns, "dayDiff", "day"));
                    marks.push(...segmentMarks(plotPoints, filteredRuns.length));
                    marks.push(...lollipopMarks(plotPoints, false, filteredRuns.length));
                }
                if (view.showLines) {
                    if (view.fillArea) {
                        marks.push(...areaMarks(plotPoints, filteredRuns.length, view.smoothness));
                    }
                    marks.push(...lineMarks(plotPoints, filteredRuns.length, "day", view.smoothness));
                    // Don't show the lines' pointer if the bars' one is shown
                    if (!view.showBars) {
                        marks.push(...linePointerMarks(plotPoints, filteredRuns, "day", view.smoothness));
                    }
                }
                marks.push(...timestamps(plotPoints, "day"));
                marks.push(...statsMarks(filteredRuns, bestRun));
                break;
            case "duration":
                marks.push(...lineMarks(plotPoints, filteredRuns.length, "segment", view.smoothness));
                marks.push(...timestamps(plotPoints, "segment"));
                marks.push(...linePointerMarks(plotPoints, filteredRuns, "segment", view.smoothness));
                break;
            case "durationStacked":
                marks.push(...barMarks(plotPoints, "segment"));
                marks.push(...rectPointerMarks(plotPoints, filteredRuns, "segment", "segment"));
                marks.push(...lollipopMarks(plotPoints, true, filteredRuns.length));
                break;
            case "records":
                marks.push(...recordMarks(plotPoints, filteredRuns.length));
                marks.push(...linePointerMarks(plotPoints, filteredRuns, "day"));
                marks.push(...bestSegmentTimes(plotPoints));
                marks.push(...statsMarks(filteredRuns, bestRun));
                break;
        }
        return marks;
    }
    function processCurrentRun(currentRun, filteredRuns, bestRun, view, history, game) {
        const bestRunEntries = bestRun !== undefined ? asPlotPoints([bestRun], history, view, game) : [];
        const estimate = view.mode === "timestamp";
        const idx = filteredRuns.length;
        return runAsPlotPoints(currentRun, view, game, bestRunEntries, estimate, idx);
    }
    function makeGraph(history, view, game, filteredRuns, currentRun, colorOverride) {
        const bestRun = findBestRun(history, view);
        const plotPoints = asPlotPoints(filteredRuns, history, view, game);
        if (view.includeCurrentRun && view.mode !== "records") {
            plotPoints.push(...processCurrentRun(currentRun, filteredRuns, bestRun, view, history, game));
        }
        const milestones = getSortedMilestones(view);
        const milestoneNames = generateMilestoneNames(milestones, view.universe);
        const milestoneColors = milestones.map(m => view.milestones[m].color);
        if (colorOverride !== null) {
            const idx = milestones.indexOf(colorOverride.milestone);
            milestoneColors[idx] = colorOverride.color;
        }
        const plot = Plot.plot({
            marginTop,
            width: 800,
            className: "analytics-plot",
            x: { axis: null },
            y: { grid: true, domain: calculateYScale(plotPoints, view) },
            color: { domain: milestoneNames, range: milestoneColors },
            marks: generateMarks(plotPoints, filteredRuns, bestRun, view)
        });
        // When creating marks, we add a title with the milestone name
        // Remove the generateed title element and add an attribute
        $(plot).find("g > *").each(function () {
            const title = $(this).find("> title");
            if (title[0] !== undefined) {
                const milestone = title.text();
                $(this).attr("data-milestone", milestone);
                title.remove();
            }
        });
        $(plot).attr("width", "100%");
        return plot;
    }

    function serializeMouseEvent(event, milestone) {
        const container = $(`#mTabAnalytics > .b-tabs > section`);
        return {
            top: event.clientY + container.scrollTop(),
            left: event.clientX + container.scrollLeft(),
            milestone: milestone
        };
    }
    function restoreSelection(plot, { top, left, milestone }) {
        const target = $(plot).find(`[data-milestone="${milestone}"]`);
        const container = $(`#mTabAnalytics > .b-tabs > section`);
        function makePointerEvent(name) {
            return new PointerEvent(name, {
                pointerType: "mouse",
                bubbles: true,
                composed: true,
                clientX: left - container.scrollLeft(),
                clientY: top - container.scrollTop(),
            });
        }
        target[0].dispatchEvent(makePointerEvent("pointerenter"));
        target[0].dispatchEvent(makePointerEvent("pointerdown"));
    }
    var Plot$1 = {
        inject: ["game", "config", "history", "currentRun"],
        props: ["view", "pendingColorChange"],
        data() {
            return {
                plot: null,
                timestamp: null,
                pendingSelection: null
            };
        },
        mounted() {
            this.history.watch(() => {
                this.$emit("select", null);
                this.pendingSelection = null;
                this.redraw(true);
            });
            document.addEventListener("visibilitychange", () => {
                if (!document.hidden) {
                    this.redraw();
                }
            });
        },
        computed: {
            active() {
                return this.config.active && this.view.active;
            },
            outdated() {
                return this.timestamp === null || (this.supportsRealTimeUpdates && this.timestamp !== this.game.day);
            },
            supportsRealTimeUpdates() {
                if (!this.config.recordRuns) {
                    return false;
                }
                if (!this.view.includeCurrentRun) {
                    return false;
                }
                if (this.view.mode === "records") {
                    return false;
                }
                return true;
            }
        },
        methods: {
            redraw(force = false) {
                if (!document.hidden && this.active && (force || this.outdated)) {
                    this.plot = this.makeGraph();
                    this.timestamp = this.game.day;
                }
            },
            makeGraph() {
                const filteredRuns = applyFilters(this.history, this.view);
                const plot = makeGraph(this.history, this.view, this.game, filteredRuns, this.currentRun, this.pendingColorChange);
                plot.addEventListener("mousedown", (event) => {
                    if (plot.value && plot.value.run < filteredRuns.length) {
                        this.pendingSelection = serializeMouseEvent(event, plot.value.milestone);
                        this.$emit("select", filteredRuns[plot.value.run]);
                    }
                    else {
                        this.pendingSelection = null;
                        this.$emit("select", null);
                    }
                });
                return plot;
            }
        },
        watch: {
            plot(newNode, oldNode) {
                if (oldNode !== null) {
                    $(oldNode).replaceWith(newNode);
                    if (this.pendingSelection) {
                        restoreSelection(newNode, this.pendingSelection);
                    }
                }
                else {
                    this.redraw();
                }
            },
            "config.active"() {
                this.redraw();
            },
            "config.openViewIndex"() {
                this.redraw();
            },
            "config.views"() {
                // The index doesn't always change when a view is removed
                this.redraw();
            },
            view: {
                handler() {
                    this.pendingSelection = null;
                    this.$emit("select", null);
                    this.redraw(true);
                },
                deep: true
            },
            currentRun: {
                handler() {
                    this.redraw();
                },
                deep: true
            },
            pendingColorChange(newValue, oldValue) {
                const label = newValue?.label ?? oldValue.label;
                const color = newValue?.color ?? this.view.milestones[oldValue.milestone].color;
                // It's faster than rerendering the whole graph
                $(this.plot).find(`[data-milestone="${label}"]`).each(function () {
                    for (const attr of ["fill", "stroke"]) {
                        if ($(this).attr(attr) !== undefined) {
                            $(this).attr(attr, color);
                        }
                    }
                });
            }
        },
        directives: {
            plot: {
                inserted(element, _, vnode) {
                    const self = vnode.context;
                    self.plot = element;
                }
            }
        },
        template: `
            <div v-plot></div>
        `
    };

    var Modal = {
        props: ["title", "customClass"],
        template: `
            <div class="modalBox">
                <p class="has-text-warning modalTitle">{{ title }}</p>
                <div id="specialModal" :class="'modalBody ' + customClass ?? ''">
                    <slot/>
                </div>
            </div>
        `
    };

    const InputDialog = {
        components: {
            Modal
        },
        props: ["value", "placeholder", "title"],
        data() {
            return {
                buffer: this.value
            };
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
    function resolvePath(obj, path) {
        return path.reduce((self, key) => self && self[key], obj);
    }
    function getNested(obj, path) {
        return resolvePath(obj, path.split('.'));
    }
    function setNested(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        Vue.set(resolvePath(obj, keys), lastKey, value);
    }
    function openInputDialog(self, binding, title, placeholder) {
        self.$buefy.modal.open({
            parent: self,
            component: InputDialog,
            props: {
                value: getNested(self, binding),
                placeholder,
                title
            },
            events: {
                input: (value) => setNested(self, binding, value)
            }
        });
    }

    var ViewTab = {
        components: {
            ViewSettings,
            MilestoneController,
            MilestoneRemover,
            PlotLegend,
            Plot: Plot$1
        },
        inject: ["config", "history"],
        props: ["view"],
        data() {
            return {
                pendingColorChange: null,
                selectedRun: null,
                rendering: false,
                dragging: false
            };
        },
        computed: {
            id() {
                return `analytics-view-tab-${this.view.id}`;
            },
            defaultName() {
                if (this.view.universe === "magic" && this.view.resetType === "blackhole") {
                    return "Vacuum Collapse";
                }
                else {
                    const resetType = resets[this.view.resetType];
                    if (this.view.universe !== undefined) {
                        return `${resetType} (${universes[this.view.universe]})`;
                    }
                    else {
                        return resetType;
                    }
                }
            },
            name() {
                return this.view.name ?? this.defaultName;
            }
        },
        methods: {
            deleteView() {
                this.config.removeView(this.view);
            },
            cloneView() {
                this.config.cloneView(this.view);
            },
            async asImage() {
                this.rendering = true;
                const canvas = await plotToCanvas(this.$refs.plot.plot, this.$refs.legend.legend);
                canvas.toBlob((blob) => {
                    navigator.clipboard.write([
                        new ClipboardItem({ "image/png": blob })
                    ]);
                });
                this.rendering = false;
            },
            ignoreBefore() {
                if (this.selectedRun !== null) {
                    const filteredRuns = applyFilters(this.history, this.view, { useLimits: false });
                    const idx = filteredRuns.indexOf(this.selectedRun);
                    this.view.skipRuns = { enabled: true, value: idx };
                }
            },
            discardRun() {
                if (this.selectedRun !== null) {
                    this.history.discardRun(this.selectedRun);
                }
            },
            renameView() {
                openInputDialog(this, "view.name", "Rename", this.defaultName);
            },
            onColorPreview(preview) {
                this.pendingColorChange = preview;
            }
        },
        template: `
            <b-tab-item :id="id">
                <template slot="header">
                    <span class="view-tab-header">{{ name }}</span>
                </template>

                <div class="flex flex-col gap-m">
                    <view-settings :view="view"/>

                    <milestone-controller v-if="!dragging" :view="view" @colorReset="() => onColorPreview(null)"/>
                    <milestone-remover v-else :view="view"/>

                    <plot-legend ref="legend" :view="view" @colorPreview="onColorPreview" @drag="(value) => dragging = value"/>

                    <plot ref="plot" :view="view" :pendingColorChange="pendingColorChange" @select="(run) => selectedRun = run"/>

                    <div class="flex flex-row flex-wrap justify-between">
                        <div class="flex flex-row gap-m">
                            <button class="button" @click="ignoreBefore" :disabled="selectedRun === null">Ignore previous runs</button>
                            <button class="button" @click="discardRun" :disabled="selectedRun === null">Discard run</button>
                        </div>

                        <div class="flex flex-row gap-m">
                            <button class="button" @click="asImage">
                                <span v-if="rendering">
                                    Rendering...
                                </span>
                                <span v-else>
                                    Copy as PNG
                                </span>
                            </button>
                            <button class="button" @click="renameView">Rename</button>
                            <button class="button" @click="cloneView">Clone</button>
                            <button class="button" @click="deleteView">Delete</button>
                        </div>
                    </div>
                </div>
            </b-tab-item>
        `
    };

    var AnalyticsTab = {
        components: {
            ViewTab
        },
        inject: ["config"],
        data() {
            return {
                index: this.config.openViewIndex,
                views: this.config.views
            };
        },
        watch: {
            async "config.views"() {
                // If the leftmost view got removed, the index doesn't change
                // but we still need to update it in order for the UI to swap tabs
                if (this.index === this.config.openViewIndex) {
                    this.index = -1;
                }
                // Don't ask me why this works
                await Vue.nextTick();
                await Vue.nextTick();
                this.index = this.config.openViewIndex;
            }
        },
        methods: {
            swapTabs(idx) {
                this.config.openViewIndex = idx;
                this.index = idx;
            },
            async refreshTabsList() {
                this.views = [];
                await Vue.nextTick();
                this.views = this.config.views;
                await Vue.nextTick();
            }
        },
        async mounted() {
            const tabsNode = $(this.$el).find(`> nav`);
            const tabsListNode = tabsNode.find("> ul");
            // The scrollbar is added to the <nav> element by default, which makes it appear under the line
            // and scrolling makes the whole tab list shift
            tabsNode.css("overflow-x", "hidden");
            tabsListNode.addClass(["hscroll", "w-full"]);
            // Scroll the tab list with the mouse wheel
            tabsListNode.on("wheel", (event) => {
                event.currentTarget.scrollLeft += event.originalEvent.deltaY;
            });
            // Add a "new tab" button as the last pseudo tab
            const addViewButton = $(`<li role="tab" id="add-view-btn" class="order-last"><a>+ Add tab</a></li>`)
                .on("click", () => this.config.addView())
                .appendTo(tabsListNode);
            // Make the tabs sortable
            Sortable.create(tabsListNode[0], {
                filter: "#add-view-btn",
                ghostClass: "has-text-warning",
                chosenClass: "has-text-warning",
                dragClass: "has-text-warning",
                animation: 150,
                onStart() {
                    addViewButton.hide();
                },
                onEnd: async ({ oldIndex, newIndex }) => {
                    addViewButton.show();
                    if (oldIndex !== newIndex) {
                        this.config.moveView(oldIndex - 1, newIndex - 1);
                        // Rearranging items in a list isn't properly handled by the b-tabs component - just remount it
                        await this.refreshTabsList();
                    }
                }
            });
        },
        template: `
            <b-tabs :value="index" @input="swapTabs" class="resTabs">
                <view-tab v-for="view in views" :key="view.id" :view="view"/>
            </b-tabs>
        `
    };

    function openTab(index) {
        $("#mainColumn div:first-child")[0].__vue__.s.civTabs = index;
    }
    async function addAnalyticsTab(game, config, history, currentRun) {
        const tabs = (await waitFor(`div#mainTabs`))[0].__vue__;
        $("#mainTabs > .tab-content").append(`
            <b-tab-item label="Analytics">
                <analytics-tab-wrapper ref="tab"/>
            </b-tab-item>
        `);
        const AnalyticsTabWrapper = {
            components: {
                AnalyticsTab
            },
            inject: {
                config: { from: "config", default: null },
            },
            data() {
                return {
                    initialized: false
                };
            },
            computed: {
                // See below
                duplicate() {
                    return this.config === null;
                },
            },
            methods: {
                activate() {
                    this.config.active = true;
                    this.initialized = true;
                },
                deactivate() {
                    this.config.active = false;
                }
            },
            template: `
                <div v-if="!duplicate" id="mTabAnalytics">
                    <analytics-tab v-if="initialized"/>
                </div>
            `
        };
        new Vue({
            el: "#mainTabs > .tab-content > :last-child",
            components: {
                AnalyticsTabWrapper
            },
            provide() {
                return {
                    // BTabItem requires being compiled inside a BTabs component
                    // It verifies this by injecting the parent via the btab prop - mock this dependency manually
                    btab: tabs,
                    game,
                    config,
                    history,
                    currentRun
                };
            },
            mounted() {
                const tab = this.$refs.tab;
                spy(this.$children[0], "activate", () => tab.activate());
                spy(this.$children[0], "deactivate", () => tab.deactivate());
                // Without this, the tabs component doesn't track the state properly
                tabs.$slots.default.push(this.$children[0].$vnode);
                // If the analytics tab was opened before, restore it
                if (config.active) {
                    Vue.nextTick(() => openTab(9 /* EvolveTabs.Analytics */));
                }
            }
        });
        // For some reason, pushing a vnode to tabs.$slots causes the template to be compiled and mounted twice
        // Ignore consecutive inserts with of the same node
        const original = tabs._registerItem;
        tabs._registerItem = (item) => {
            if (item.label !== "Analytics") {
                original(item);
            }
        };
        // Vanilla evolve does `global.settings.civTabs = $(`#mainTabs > nav ul li`).length - 1`
        // Replace the button with the mock click handler that assigns the correct tab index
        const tabhNodes = (await waitFor(["#mTabCivil", "#mTabCivic"])).parent();
        // Note: the tabs get rerendered many times during the run - replace the button after every redraw
        monitor("button.observe", tabhNodes, (button) => {
            const text = button.first().text();
            const mockButton = $(`<button class="button observe right">${text}</button>`);
            mockButton.on("click", () => {
                openTab(8 /* EvolveTabs.HellObservations */);
            });
            button.replaceWith(mockButton);
        });
    }
    async function addMainToggle(config) {
        const lastToggle = await waitFor("#settings > .switch.setting:last");
        lastToggle.after(`
            <b-switch class="setting" id="analytics-master-toggle" v-model="config.recordRuns">
                Record Runs
            </b-switch>
        `);
        new Vue({
            el: "#analytics-master-toggle",
            data() {
                return {
                    config: Vue.ref(config)
                };
            }
        });
    }
    async function gropPauseButton() {
        const button = await waitFor("#pausegame");
        const icon = button.clone();
        button
            .removeClass("play")
            .removeClass("pause")
            .removeAttr("id")
            .removeAttr("aria-label")
            .css("padding", "0 0.5rem")
            .css("margin-left", "0.5rem")
            .css("width", `1rem`)
            .css("height", `100%`)
            .css("background", "transparent")
            .css("border", "none")
            .css("cursor", "pointer");
        button.append(icon);
    }
    function addStyles() {
        $("head").append(`<style type="text/css">${styles}</style>`);
    }
    async function bootstrapUIComponents(game, config, history, currentRun) {
        addStyles();
        await gropPauseButton();
        await addMainToggle(config);
        await addAnalyticsTab(game, config, history, currentRun);
    }

    migrate();
    const evolve = await( synchronize());
    const game = new Game(evolve);
    // The game may refresh after the evolution - wait until it is complete
    await( game.waitEvolved());
    const config = getConfig(game);
    const history = initializeHistory(game, config);
    const currentRun = prepareCurrentRun(game, config, history);
    trackMilestones(currentRun, game, config);
    // Do not touch DOM when the tab is in the background
    await( waitFocus());
    await( bootstrapUIComponents(game, config, history, currentRun));

})();

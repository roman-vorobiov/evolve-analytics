// ==UserScript==
// @name         Evolve Analytics
// @namespace    http://tampermonkey.net/
// @version      0.15.0
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
// @require      https://code.jquery.com/jquery-3.7.1.min.js
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
    const [saveConfig, loadConfig] = makeDatabaseFunctions("sneed.analytics.config");
    const [saveHistory, loadHistory] = makeEncodedDatabaseFunctions("sneed.analytics.history");
    const [saveCurrentRun, loadLatestRun, discardLatestRun] = makeDatabaseFunctions("sneed.analytics.latest");

    const buildings = {
        "city-food": "Gather Food",
        "city-lumber": "Gather Lumber",
        "city-stone": "Gather Stone",
        "city-chrysotile": "Gather Chrysotile",
        "city-slaughter": "Slaughter the Weak",
        "city-horseshoe": "Horseshoe",
        "city-slave_market": "Slave Market",
        "city-s_alter": "Sacrificial Altar",
        "city-basic_housing": "Cabin",
        "city-cottage": "Cottage",
        "city-apartment": "Apartment",
        "city-lodge": "Lodge",
        "city-smokehouse": "Smokehouse",
        "city-soul_well": "Soul Well",
        "city-slave_pen": "Slave Pen",
        "city-transmitter": "Transmitter",
        "city-captive_housing": "Captive Housing",
        "city-farm": "Farm",
        "city-compost": "Compost Heap",
        "city-mill": "Windmill",
        "city-windmill": "Windmill (Evil)",
        "city-silo": "Grain Silo",
        "city-assembly": "Assembly",
        "city-garrison": "Barracks",
        "city-hospital": "Hospital",
        "city-boot_camp": "Boot Camp",
        "city-shed": "Shed",
        "city-storage_yard": "Freight Yard",
        "city-warehouse": "Container Port",
        "city-bank": "Bank",
        "city-pylon": "Pylon",
        "city-graveyard": "Graveyard",
        "city-conceal_ward": "Conceal Ward (Witch Hunting)",
        "city-lumber_yard": "Lumber Yard",
        "city-sawmill": "Sawmill",
        "city-rock_quarry": "Rock Quarry",
        "city-cement_plant": "Cement Plant",
        "city-foundry": "Foundry",
        "city-factory": "Factory",
        "city-nanite_factory": "Nanite Factory",
        "city-smelter": "Smelter",
        "city-metal_refinery": "Metal Refinery",
        "city-mine": "Mine",
        "city-coal_mine": "Coal Mine",
        "city-oil_well": "Oil Derrick",
        "city-oil_depot": "Fuel Depot",
        "city-trade": "Trade Post",
        "city-wharf": "Wharf",
        "city-tourist_center": "Tourist Center",
        "city-amphitheatre": "Amphitheatre",
        "city-casino": "Casino",
        "city-temple": "Temple",
        "city-shrine": "Shrine",
        "city-meditation": "Meditation Chamber",
        "city-banquet": "Banquet Hall",
        "city-university": "University",
        "city-library": "Library",
        "city-wardenclyffe": "Wardenclyffe",
        "city-biolab": "Bioscience Lab",
        "city-coal_power": "Coal Powerplant",
        "city-oil_power": "Oil Powerplant",
        "city-fission_power": "Fission Reactor",
        "city-mass_driver": "Mass Driver",
        "space-test_launch": "Space Test Launch",
        "space-satellite": "Space Satellite",
        "space-gps": "Space Gps",
        "space-propellant_depot": "Space Propellant Depot",
        "space-nav_beacon": "Space Navigation Beacon",
        "space-moon_mission": "Moon Mission",
        "space-moon_base": "Moon Base",
        "space-iridium_mine": "Moon Iridium Mine",
        "space-helium_mine": "Moon Helium-3 Mine",
        "space-observatory": "Moon Observatory",
        "space-red_mission": "Red Mission",
        "space-spaceport": "Red Spaceport",
        "space-red_tower": "Red Space Control",
        "space-captive_housing": "Red Captive Housing (Cataclysm)",
        "space-terraformer": "Red Terraformer (Orbit Decay)",
        "space-atmo_terraformer": "Red Terraformer (Orbit Decay, Complete)",
        "space-terraform": "Red Terraform (Orbit Decay)",
        "space-assembly": "Red Assembly (Cataclysm)",
        "space-living_quarters": "Red Living Quarters",
        "space-pylon": "Red Pylon (Cataclysm)",
        "space-vr_center": "Red VR Center",
        "space-garage": "Red Garage",
        "space-red_mine": "Red Mine",
        "space-fabrication": "Red Fabrication",
        "space-red_factory": "Red Factory",
        "space-nanite_factory": "Red Nanite Factory (Cataclysm)",
        "space-biodome": "Red Biodome",
        "space-red_university": "Red University (Orbit Decay)",
        "space-exotic_lab": "Red Exotic Materials Lab",
        "space-ziggurat": "Red Ziggurat",
        "space-space_barracks": "Red Marine Barracks",
        "space-horseshoe": "Red Horseshoe (Cataclysm)",
        "space-hell_mission": "Hell Mission",
        "space-geothermal": "Hell Geothermal Plant",
        "space-hell_smelter": "Hell Smelter",
        "space-spc_casino": "Hell Space Casino",
        "space-swarm_plant": "Hell Swarm Plant",
        "space-sun_mission": "Sun Mission",
        "space-swarm_control": "Sun Control Station",
        "space-swarm_satellite": "Sun Swarm Satellite",
        "space-jump_gate": "Sun Jump Gate",
        "space-gas_mission": "Gas Mission",
        "space-gas_mining": "Gas Helium-3 Collector",
        "space-gas_storage": "Gas Fuel Depot",
        "space-star_dock": "Gas Space Dock",
        "space-gas_moon_mission": "Gas Moon Mission",
        "space-outpost": "Gas Moon Mining Outpost",
        "space-drone": "Gas Moon Mining Drone",
        "space-oil_extractor": "Gas Moon Oil Extractor",
        "starDock-probes": "Space Dock Probe",
        "starDock-geck": "Space Dock G.E.C.K.",
        "starDock-seeder": "Space Dock Bioseeder Ship",
        "starDock-prep_ship": "Space Dock Prep Ship",
        "starDock-launch_ship": "Space Dock Launch Ship",
        "space-belt_mission": "Belt Mission",
        "space-space_station": "Belt Space Station",
        "space-elerium_ship": "Belt Elerium Mining Ship",
        "space-iridium_ship": "Belt Iridium Mining Ship",
        "space-iron_ship": "Belt Iron Mining Ship",
        "space-dwarf_mission": "Dwarf Mission",
        "space-elerium_contain": "Dwarf Elerium Storage",
        "space-e_reactor": "Dwarf Elerium Reactor",
        "space-world_collider": "Dwarf World Collider",
        "space-world_controller": "Dwarf World Collider (Complete)",
        "space-shipyard": "Dwarf Ship Yard",
        "space-mass_relay": "Dwarf Mass Relay",
        "space-m_relay": "Dwarf Mass Relay (Complete)",
        "space-titan_mission": "Titan Mission",
        "space-titan_spaceport": "Titan Spaceport",
        "space-electrolysis": "Titan Electrolysis",
        "space-hydrogen_plant": "Titan Hydrogen Plant",
        "space-titan_quarters": "Titan Habitat",
        "space-titan_mine": "Titan Mine",
        "space-storehouse": "Titan Storehouse",
        "space-titan_bank": "Titan Bank",
        "space-g_factory": "Titan Graphene Plant",
        "space-sam": "Titan SAM Site",
        "space-decoder": "Titan Decoder",
        "space-ai_core": "Titan AI Core",
        "space-ai_core2": "Titan AI Core (Complete)",
        "space-ai_colonist": "Titan AI Colonist",
        "space-enceladus_mission": "Enceladus Mission",
        "space-water_freighter": "Enceladus Water Freighter",
        "space-zero_g_lab": "Enceladus Zero Gravity Lab",
        "space-operating_base": "Enceladus Operational Base",
        "space-munitions_depot": "Enceladus Munitions Depot",
        "space-triton_mission": "Triton Mission",
        "space-fob": "Triton Forward Base",
        "space-lander": "Triton Troop Lander",
        "space-crashed_ship": "Triton Derelict Ship",
        "space-kuiper_mission": "Kuiper Mission",
        "space-orichalcum_mine": "Kuiper Orichalcum Mine",
        "space-uranium_mine": "Kuiper Uranium Mine",
        "space-neutronium_mine": "Kuiper Neutronium Mine",
        "space-elerium_mine": "Kuiper Elerium Mine",
        "space-eris_mission": "Eris Mission",
        "space-drone_control": "Eris Control Relay",
        "space-shock_trooper": "Eris Android Trooper",
        "space-tank": "Eris Tank",
        "space-digsite": "Eris Digsite",
        "tauceti-ringworld": "Tau Star Ringworld",
        "tauceti-matrix": "Tau Star Matrix",
        "tauceti-blue_pill": "Tau Star Blue Pill",
        "tauceti-goe_facility": "Tau Star Garden of Eden",
        "tauceti-home_mission": "Tau Mission",
        "tauceti-dismantle": "Tau Dismantle Ship",
        "tauceti-orbital_station": "Tau Orbital Station",
        "tauceti-colony": "Tau Colony",
        "tauceti-tau_housing": "Tau Housing",
        "tauceti-captive_housing": "Tau Captive Housing",
        "tauceti-pylon": "Tau Pylon",
        "tauceti-cloning_facility": "Tau Cloning",
        "tauceti-horseshoe": "Tau Horseshoe",
        "tauceti-assembly": "Tau Assembly",
        "tauceti-nanite_factory": "Tau Nanite Factory",
        "tauceti-tau_farm": "Tau High-Tech Farm",
        "tauceti-mining_pit": "Tau Mining Pit",
        "tauceti-excavate": "Tau Excavate",
        "tauceti-alien_outpost": "Tau Alien Outpost",
        "tauceti-jump_gate": "Tau Jump Gate",
        "tauceti-fusion_generator": "Tau Fusion Generator",
        "tauceti-repository": "Tau Repository",
        "tauceti-tau_factory": "Tau High-Tech Factory",
        "tauceti-infectious_disease_lab": "Tau Disease Lab",
        "tauceti-tauceti_casino": "Tau Casino",
        "tauceti-tau_cultural_center": "Tau Cultural Center",
        "tauceti-red_mission": "Tau Red Mission",
        "tauceti-orbital_platform": "Tau Red Orbital Platform",
        "tauceti-contact": "Tau Red Contact",
        "tauceti-introduce": "Tau Red Introduce",
        "tauceti-subjugate": "Tau Red Subjugate",
        "tauceti-jeff": "Tau Red Jeff",
        "tauceti-overseer": "Tau Red Overseer",
        "tauceti-womling_village": "Tau Red Womling Village",
        "tauceti-womling_farm": "Tau Red Womling Farm",
        "tauceti-womling_mine": "Tau Red Womling Mine",
        "tauceti-womling_fun": "Tau Red Womling Theater",
        "tauceti-womling_lab": "Tau Red Womling Lab",
        "tauceti-gas_contest": "Tau Gas Naming Contest",
        "tauceti-gas_contest-a1": "Tau Gas Name 1",
        "tauceti-gas_contest-a2": "Tau Gas Name 2",
        "tauceti-gas_contest-a3": "Tau Gas Name 3",
        "tauceti-gas_contest-a4": "Tau Gas Name 4",
        "tauceti-gas_contest-a5": "Tau Gas Name 5",
        "tauceti-gas_contest-a6": "Tau Gas Name 6",
        "tauceti-gas_contest-a7": "Tau Gas Name 7",
        "tauceti-gas_contest-a8": "Tau Gas Name 8",
        "tauceti-refueling_station": "Tau Gas Refueling Station",
        "tauceti-ore_refinery": "Tau Gas Ore Refinery",
        "tauceti-whaling_station": "Tau Gas Whale Processor",
        "tauceti-womling_station": "Tau Gas Womling Station",
        "tauceti-roid_mission": "Tau Belt Mission",
        "tauceti-patrol_ship": "Tau Belt Patrol Ship",
        "tauceti-mining_ship": "Tau Belt Extractor Ship",
        "tauceti-whaling_ship": "Tau Belt Whaling Ship",
        "tauceti-gas_contest2": "Tau Gas 2 Naming Contest",
        "tauceti-gas_contest-b1": "Tau Gas 2 Name 1",
        "tauceti-gas_contest-b2": "Tau Gas 2 Name 2",
        "tauceti-gas_contest-b3": "Tau Gas 2 Name 3",
        "tauceti-gas_contest-b4": "Tau Gas 2 Name 4",
        "tauceti-gas_contest-b5": "Tau Gas 2 Name 5",
        "tauceti-gas_contest-b6": "Tau Gas 2 Name 6",
        "tauceti-gas_contest-b7": "Tau Gas 2 Name 7",
        "tauceti-gas_contest-b8": "Tau Gas 2 Name 8",
        "tauceti-alien_station_survey": "Tau Gas 2 Alien Station (Survey)",
        "tauceti-alien_station": "Tau Gas 2 Alien Station",
        "tauceti-alien_space_station": "Tau Gas 2 Alien Space Station",
        "tauceti-matrioshka_brain": "Tau Gas 2 Matrioshka Brain",
        "tauceti-ignition_device": "Tau Gas 2 Ignition Device",
        "tauceti-ignite_gas_giant": "Tau Gas 2 Ignite Gas Giant",
        "interstellar-alpha_mission": "Alpha Centauri Mission",
        "interstellar-starport": "Alpha Starport",
        "interstellar-habitat": "Alpha Habitat",
        "interstellar-mining_droid": "Alpha Mining Droid",
        "interstellar-processing": "Alpha Processing Facility",
        "interstellar-fusion": "Alpha Fusion Reactor",
        "interstellar-laboratory": "Alpha Laboratory",
        "interstellar-exchange": "Alpha Exchange",
        "interstellar-g_factory": "Alpha Graphene Plant",
        "interstellar-warehouse": "Alpha Warehouse",
        "interstellar-int_factory": "Alpha Mega Factory",
        "interstellar-luxury_condo": "Alpha Luxury Condo",
        "interstellar-zoo": "Alpha Exotic Zoo",
        "interstellar-proxima_mission": "Proxima Mission",
        "interstellar-xfer_station": "Proxima Transfer Station",
        "interstellar-cargo_yard": "Proxima Cargo Yard",
        "interstellar-cruiser": "Proxima Patrol Cruiser",
        "interstellar-dyson": "Proxima Dyson Sphere (Adamantite)",
        "interstellar-dyson_sphere": "Proxima Dyson Sphere (Bolognium)",
        "interstellar-orichalcum_sphere": "Proxima Dyson Sphere (Orichalcum)",
        "interstellar-elysanite_sphere": "Proxima Dyson Sphere (Elysanite)",
        "interstellar-nebula_mission": "Nebula Mission",
        "interstellar-nexus": "Nebula Nexus",
        "interstellar-harvester": "Nebula Harvester",
        "interstellar-elerium_prospector": "Nebula Elerium Prospector",
        "interstellar-neutron_mission": "Neutron Mission",
        "interstellar-neutron_miner": "Neutron Miner",
        "interstellar-citadel": "Neutron Citadel Station",
        "interstellar-stellar_forge": "Neutron Stellar Forge",
        "interstellar-blackhole_mission": "Blackhole Mission",
        "interstellar-far_reach": "Blackhole Farpoint",
        "interstellar-stellar_engine": "Blackhole Stellar Engine",
        "interstellar-mass_ejector": "Blackhole Mass Ejector",
        "interstellar-jump_ship": "Blackhole Jump Ship",
        "interstellar-wormhole_mission": "Blackhole Wormhole Mission",
        "interstellar-stargate": "Blackhole Stargate",
        "interstellar-s_gate": "Blackhole Stargate (Complete)",
        "interstellar-sirius_mission": "Sirius Mission",
        "interstellar-sirius_b": "Sirius B Analysis",
        "interstellar-space_elevator": "Sirius Space Elevator",
        "interstellar-gravity_dome": "Sirius Gravity Dome",
        "interstellar-ascension_machine": "Sirius Ascension Machine",
        "interstellar-ascension_trigger": "Sirius Ascension Machine (Complete)",
        "interstellar-ascend": "Sirius Ascend",
        "interstellar-thermal_collector": "Sirius Thermal Collector",
        "galaxy-gateway_mission": "Gateway Mission",
        "galaxy-starbase": "Gateway Starbase",
        "galaxy-ship_dock": "Gateway Ship Dock",
        "galaxy-bolognium_ship": "Gateway Bolognium Ship",
        "galaxy-scout_ship": "Gateway Scout Ship",
        "galaxy-corvette_ship": "Gateway Corvette Ship",
        "galaxy-frigate_ship": "Gateway Frigate Ship",
        "galaxy-cruiser_ship": "Gateway Cruiser Ship",
        "galaxy-dreadnought": "Gateway Dreadnought",
        "galaxy-gateway_station": "Stargate Station",
        "galaxy-telemetry_beacon": "Stargate Telemetry Beacon",
        "galaxy-gateway_depot": "Stargate Depot",
        "galaxy-defense_platform": "Stargate Defense Platform",
        "galaxy-gorddon_mission": "Gorddon Mission",
        "galaxy-embassy": "Gorddon Embassy",
        "galaxy-dormitory": "Gorddon Dormitory",
        "galaxy-symposium": "Gorddon Symposium",
        "galaxy-freighter": "Gorddon Freighter",
        "galaxy-consulate": "Alien 1 Consulate",
        "galaxy-resort": "Alien 1 Resort",
        "galaxy-vitreloy_plant": "Alien 1 Vitreloy Plant",
        "galaxy-super_freighter": "Alien 1 Super Freighter",
        "galaxy-alien2_mission": "Alien 2 Mission",
        "galaxy-foothold": "Alien 2 Foothold",
        "galaxy-armed_miner": "Alien 2 Armed Miner",
        "galaxy-ore_processor": "Alien 2 Ore Processor",
        "galaxy-scavenger": "Alien 2 Scavenger",
        "galaxy-chthonian_mission": "Chthonian Mission",
        "galaxy-minelayer": "Chthonian Mine Layer",
        "galaxy-excavator": "Chthonian Excavator",
        "galaxy-raider": "Chthonian Corsair",
        "portal-turret": "Portal Laser Turret",
        "portal-carport": "Portal Surveyor Carport",
        "portal-war_droid": "Portal War Droid",
        "portal-repair_droid": "Portal Repair Droid",
        "portal-war_drone": "Badlands Predator Drone",
        "portal-sensor_drone": "Badlands Sensor Drone",
        "portal-attractor": "Badlands Attractor Beacon",
        "portal-pit_mission": "Pit Mission",
        "portal-assault_forge": "Pit Assault Forge",
        "portal-soul_forge": "Pit Soul Forge",
        "portal-gun_emplacement": "Pit Gun Emplacement",
        "portal-soul_attractor": "Pit Soul Attractor",
        "portal-soul_capacitor": "Pit Soul Capacitor (Witch Hunting)",
        "portal-absorption_chamber": "Pit Absorption Chamber (Witch Hunting)",
        "portal-ruins_mission": "Ruins Mission",
        "portal-guard_post": "Ruins Guard Post",
        "portal-vault": "Ruins Vault",
        "portal-archaeology": "Ruins Archaeology",
        "portal-arcology": "Ruins Arcology",
        "portal-hell_forge": "Ruins Infernal Forge",
        "portal-inferno_power": "Ruins Inferno Reactor",
        "portal-ancient_pillars": "Ruins Ancient Pillars",
        "portal-gate_mission": "Gate Mission",
        "portal-east_tower": "Gate East Tower",
        "portal-west_tower": "Gate West Tower",
        "portal-gate_turret": "Gate Turret",
        "portal-infernite_mine": "Gate Infernite Mine",
        "portal-lake_mission": "Lake Mission",
        "portal-harbor": "Lake Harbor",
        "portal-cooling_tower": "Lake Cooling Tower",
        "portal-bireme": "Lake Bireme Warship",
        "portal-transport": "Lake Transport",
        "portal-oven": "Lake Cooker (Fasting)",
        "portal-oven_complete": "Lake Cooker (Fasting, Complete)",
        "portal-dish_soul_steeper": "Lake Soul Steeper (Fasting)",
        "portal-dish_life_infuser": "Lake Life Infuser (Fasting)",
        "portal-devilish_dish": "Lake Devilish Dish (Fasting)",
        "portal-spire_mission": "Spire Mission",
        "portal-purifier": "Spire Purifier",
        "portal-port": "Spire Port",
        "portal-base_camp": "Spire Base Camp",
        "portal-bridge": "Spire Bridge",
        "portal-sphinx": "Spire Sphinx",
        "portal-bribe_sphinx": "Spire Bribe Sphinx",
        "portal-spire_survey": "Spire Survey Tower",
        "portal-mechbay": "Spire Mech Bay",
        "portal-spire": "Spire Tower",
        "portal-waygate": "Spire Waygate",
        "portal-edenic_gate": "Spire Edenic Gate",
        "eden-survery_meadows": "Asphodel Mission",
        "eden-encampment": "Asphodel Encampment",
        "eden-soul_engine": "Asphodel Soul Engine",
        "eden-mech_station": "Asphodel Mech Station",
        "eden-asphodel_harvester": "Asphodel Harvester",
        "eden-ectoplasm_processor": "Asphodel Muon Processor",
        "eden-research_station": "Asphodel Research Station",
        "eden-warehouse": "Asphodel Warehouse",
        "eden-stabilizer": "Asphodel Stabilizer",
        "eden-rune_gate": "Asphodel Rune Gate",
        "eden-rune_gate_open": "Asphodel Rune Gate (Complete)",
        "eden-bunker": "Asphodel Bunker",
        "eden-bliss_den": "Asphodel Bliss Den",
        "eden-rectory": "Asphodel Rectory",
        "eden-survey_fields": "Elysium Mission",
        "eden-fortress": "Elysium Celestial Fortress",
        "eden-siege_fortress": "Elysium Siege Fortress",
        "eden-raid_supplies": "Elysium Raid Supplies",
        "eden-ambush_patrol": "Elysium Ambush Patrol",
        "eden-ruined_fortress": "Elysium Ruined Fortress",
        "eden-scout_elysium": "Elysium Scout",
        "eden-fire_support_base": "Elysium Fire Support Base",
        "eden-elysanite_mine": "Elysium Mine",
        "eden-sacred_smelter": "Elysium Sacred Smelter",
        "eden-elerium_containment": "Elysium Elerium Containment",
        "eden-pillbox": "Elysium Pillbox",
        "eden-restaurant": "Elysium Restaurant",
        "eden-eternal_bank": "Elysium Eternal Bank",
        "eden-archive": "Elysium Archive",
        "eden-north_pier": "Elysium North Pier",
        "eden-rushmore": "Elysium Rushmore",
        "eden-reincarnation": "Elysium Reincarnation",
        "eden-eden_cement": "Elysium Cement",
        "eden-south_pier": "Isle South Pier",
        "eden-west_tower": "Isle West Tower",
        "eden-isle_garrison": "Isle Garrison",
        "eden-east_tower": "Isle East Tower",
        "eden-spirit_vacuum": "Isle Spirit Vacuum",
        "eden-spirit_battery": "Isle Spirit Battery",
        "eden-soul_compactor": "Isle Soul Compactor",
        "eden-scout_palace": "Palace Mission",
        "eden-abandoned_throne": "Palace Throne",
        "eden-infuser": "Palace Infuser",
        "eden-apotheosis": "Palace Apotheosis",
        "eden-conduit": "Palace Conduit",
        "eden-tomb": "Palace Tomb",
        "arpa-launch_facility": "Launch Facility",
        "arpa-lhc": "Supercollider",
        "arpa-stock_exchange": "Stock Exchange",
        "arpa-monument": "Monument",
        "arpa-railway": "Railway",
        "arpa-nexus": "Nexus",
        "arpa-roid_eject": "Asteroid Redirect",
        "arpa-syphon": "Mana Syphon",
        "arpa-tp_depot": "Depot",
    };

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

    const techs = {
        "club": "Club",
        "bone_tools": "Bone Tools",
        "wooden_tools": "Wooden Tools",
        "sundial": "Sundial",
        "wheel": "Wheel",
        "wagon": "Wagon",
        "steam_engine": "Steam Engine",
        "combustion_engine": "Combustion Engine",
        "hover_cart": "Hover Cart",
        "osha": "OSHA Regulations",
        "blackmarket": "Blackmarket",
        "pipelines": "Oil Pipelines",
        "housing": "Housing",
        "cottage": "Cottage",
        "apartment": "Apartment",
        "arcology": "Arcology",
        "steel_beams": "Steel Beams",
        "mythril_beams": "Mythril Beams",
        "neutronium_walls": "Neutronium Walls",
        "bolognium_alloy_beams": "Bolognium Alloy Beams",
        "aphrodisiac": "Aphrodisiac",
        "fertility_clinic": "Fertility Clinic",
        "captive_housing": "Captive Housing",
        "torture": "Torment",
        "thrall_quarters": "Thrall Quarters",
        "minor_wish": "Limited Wish",
        "major_wish": "Greater Wish",
        "psychic_energy": "Psychic Energy",
        "psychic_attack": "Psychic Assault",
        "psychic_finance": "Psychic Finance",
        "psychic_channeling": "Psychic Channeling",
        "psychic_efficiency": "Psychic Efficiency",
        "mind_break": "Psychic Mind Break",
        "psychic_stun": "Psychic Stun",
        "spear": "Flint Spear",
        "bronze_spear": "Bronze Spear",
        "iron_spear": "Iron Spear",
        "dowsing_rod": "Dowsing Rod",
        "metal_detector": "Metal Detector",
        "smokehouse": "Smokehouse",
        "lodge": "Hunting Lodge",
        "alt_lodge": "Lodge",
        "soul_well": "Soul Well",
        "compost": "Composting",
        "hot_compost": "Hot Composting",
        "mulching": "Mulching",
        "adv_mulching": "Advanced Mulching",
        "agriculture": "Agriculture",
        "farm_house": "Farm Houses",
        "irrigation": "Irrigation",
        "silo": "Grain Silo",
        "mill": "Grain Mill",
        "windmill": "Windmill",
        "windturbine": "Wind Turbine",
        "wind_plant": "Windmill (Power)",
        "gmfood": "GM Food",
        "foundry": "Foundry",
        "artisans": "Artisans",
        "apprentices": "Apprentices",
        "carpentry": "Carpentry",
        "demonic_craftsman": "Master Crafter (Evil)",
        "master_craftsman": "Master Crafter",
        "brickworks": "Brickworks",
        "machinery": "Machinery",
        "cnc_machine": "CNC Machine",
        "vocational_training": "Vocational Training",
        "stellar_forge": "Stellar Forge",
        "stellar_smelting": "Stellar Smelting",
        "assembly_line": "Assembly Line",
        "automation": "Factory Automation",
        "laser_cutters": "Laser Cutters",
        "high_tech_factories": "High-Tech Factory",
        "banquet": "Banquet",
        "theatre": "Theatre",
        "playwright": "Playwright",
        "magic": "Techno Wizards",
        "superstars": "Super Stars",
        "radio": "Radio",
        "tv": "Television",
        "vr_center": "VR Center",
        "zoo": "Exotic Zoo",
        "casino": "Casino",
        "dazzle": "Extreme Dazzle",
        "casino_vault": "Casino Vault",
        "otb": "Off Track Betting",
        "online_gambling": "Online Gambling",
        "bolognium_vaults": "Bolognium Vault",
        "mining": "Mining",
        "bayer_process": "Bayer Process",
        "elysis_process": "ELYSIS Process",
        "smelting": "Smelting",
        "steel": "Crucible Steel",
        "blast_furnace": "Blast Furnace",
        "bessemer_process": "Bessemer Process",
        "oxygen_converter": "Oxygen Converter",
        "electric_arc_furnace": "Electric Arc Furnace",
        "hellfire_furnace": "Hellfire Furnace",
        "infernium_fuel": "Infernium Fuel",
        "iridium_smelting_perk": "Iridium Smelting",
        "rotary_kiln": "Rotary Kiln",
        "metal_working": "Metal Working",
        "iron_mining": "Iron Mining",
        "coal_mining": "Coal Mining",
        "storage": "Basic Storage",
        "reinforced_shed": "Reinforced Sheds",
        "barns": "Barns",
        "warehouse": "Warehouse",
        "cameras": "Security Cameras",
        "pocket_dimensions": "Pocket Dimensions",
        "ai_logistics": "AI Shipping Logistics",
        "containerization": "Containerization",
        "reinforced_crates": "Reinforced Crates",
        "cranes": "Cranes",
        "titanium_crates": "Titanium-Banded Crates",
        "mythril_crates": "Mythril-Plated Crates",
        "infernite_crates": "Infernite Crates",
        "graphene_crates": "Graphene Crates",
        "bolognium_crates": "Bolognium Crates",
        "elysanite_crates": "Elysanite Crates",
        "steel_containers": "Steel Containers",
        "gantry_crane": "Gantry Cranes",
        "alloy_containers": "Alloy Containers",
        "mythril_containers": "Mythril Containers",
        "adamantite_containers": "Adamantite Containers",
        "aerogel_containers": "Aerogel Containers",
        "bolognium_containers": "Bolognium Containers",
        "nanoweave_containers": "Nanoweave Liners",
        "elysanite_containers": "Elysanite Containers",
        "evil_planning": "Urban Planning (Evil)",
        "urban_planning": "Urban Planning",
        "zoning_permits": "Zoning Permits",
        "urbanization": "Urbanization",
        "assistant": "Personal Assistant",
        "government": "Government",
        "theocracy": "Theocracy",
        "republic": "Republic",
        "socialist": "Socialist",
        "corpocracy": "Corpocracy",
        "technocracy": "Technocracy",
        "federation": "Federation",
        "magocracy": "Magocracy",
        "governor": "Governor",
        "spy": "Spies",
        "espionage": "Espionage",
        "spy_training": "Spy Training Facility",
        "spy_gadgets": "Spy Gadgets",
        "code_breakers": "Code Breakers",
        "currency": "Currency",
        "market": "Marketplace",
        "tax_rates": "Tax Rates",
        "large_trades": "Large Volume Trading",
        "corruption": "Corrupt Politicians",
        "massive_trades": "Massive Volume Trading",
        "trade": "Trade Routes",
        "diplomacy": "Diplomacy",
        "freight": "Freight Trains",
        "wharf": "Wharves",
        "banking": "Banking",
        "investing": "Investing",
        "vault": "Bank Vault",
        "bonds": "Savings Bonds",
        "steel_vault": "Steel Vault",
        "eebonds": "Series EE Bonds",
        "swiss_banking": "Cheese Banking",
        "safety_deposit": "Safety Deposit Box",
        "stock_market": "Stock Exchange",
        "hedge_funds": "Hedge Funds",
        "four_oh_one": "401K",
        "exchange": "Galactic Exchange",
        "foreign_investment": "Foreign Investment",
        "crypto_currency": "Crypto Currency",
        "mythril_vault": "Mythril Vault",
        "neutronium_vault": "Neutronium Vault",
        "adamantite_vault": "Adamantite Vault",
        "graphene_vault": "Graphene Vault",
        "home_safe": "House Safe",
        "fire_proof_safe": "Fire Proof Safe",
        "tamper_proof_safe": "Tamper Proof Safe",
        "monument": "Monuments",
        "tourism": "Tourism",
        "xeno_tourism": "Xeno Tourism",
        "science": "Scientific Method",
        "library": "Dewey Decimal System",
        "thesis": "Thesis Papers",
        "research_grant": "Research Grants",
        "scientific_journal": "Scientific Journal",
        "adjunct_professor": "Adjunct Professors",
        "tesla_coil": "Tesla Coil",
        "internet": "Internet",
        "observatory": "Space Observatory",
        "world_collider": "World Collider",
        "laboratory": "Laboratory",
        "virtual_assistant": "Virtual Assistant",
        "dimensional_readings": "Dimensional Readings",
        "quantum_entanglement": "Quantum Entanglement",
        "expedition": "Scientific Expeditions",
        "subspace_sensors": "Subspace Sensors",
        "alien_database": "Alien Database",
        "orichalcum_capacitor": "Orichalcum Capacitor",
        "advanced_biotech": "Advanced Biotech",
        "codex_infinium": "Codex Infinium",
        "spirit_box": "Spirit Box",
        "spirit_researcher": "Occult Researcher",
        "dimensional_tap": "Dimensional Tap",
        "devilish_dish": "Devilish Dish",
        "hell_oven": "Soul-Vide Cooker",
        "preparation_methods": "Preparation Methods",
        "final_ingredient": "Final Ingredient",
        "bioscience": "Bioscience",
        "genetics": "Genetics",
        "crispr": "CRISPR-Cas9",
        "shotgun_sequencing": "Shotgun Sequencing",
        "de_novo_sequencing": "De Novo Sequencing",
        "dna_sequencer": "DNA Sequencer",
        "rapid_sequencing": "Rapid Gene Sequencing",
        "mad_science": "Mad Science",
        "electricity": "Electricity",
        "matter_replicator": "Matter Replicator",
        "industrialization": "Industrialization",
        "electronics": "Electronics",
        "fission": "Nuclear Fission",
        "arpa": "A.R.P.A.",
        "rocketry": "Rocketry",
        "robotics": "Advanced Robotics",
        "lasers": "Lasers",
        "artifical_intelligence": "Artificial Intelligence",
        "quantum_computing": "Quantum Computing",
        "virtual_reality": "Virtual Reality",
        "plasma": "Plasma Beams",
        "shields": "Energy Shields",
        "ai_core": "AI Supercore",
        "metaphysics": "Metaphysics",
        "orichalcum_analysis": "Orichalcum Analysis",
        "cybernetics": "Cybernetics",
        "divinity": "Divine Providence",
        "blood_pact": "Blood Pact",
        "purify": "Enhanced Air Filters",
        "waygate": "Waygate",
        "demonic_infusion": "Demonic Infusion",
        "purify_essence": "Purify Essence",
        "gate_key": "Gate Key",
        "gate_turret": "Gate Turret",
        "infernite_mine": "Infernite Survey",
        "study_corrupt_gem": "Study Corrupt Gem",
        "soul_binding": "Soul Binding",
        "soul_capacitor": "Soul Capacitor",
        "absorption_chamber": "Absorption Chamber",
        "corrupt_gem_analysis": "Corrupt Gem Analysis",
        "hell_search": "Search Hell Coordinates",
        "codex_infernium": "Codex Infernium",
        "lake_analysis": "Blood Lake Analysis",
        "lake_threat": "Lake Threat",
        "lake_transport": "Lake Transport",
        "cooling_tower": "Cooling Tower",
        "miasma": "Miasma",
        "incorporeal": "Incorporeal Existence",
        "tech_ascension": "Ascension",
        "terraforming": "Terraforming",
        "cement_processing": "Cement Processing",
        "adamantite_processing_flier": "Adamantite Processing (Flier)",
        "adamantite_processing": "Adamantite Processing",
        "graphene_processing": "Graphene Processing",
        "crypto_mining": "Crypto Mining",
        "fusion_power": "Nuclear Fusion",
        "infernium_power": "Inferno Power",
        "thermomechanics": "Thermomechanics",
        "quantum_manufacturing": "Quantum Manufacturing",
        "worker_drone": "Mining Drones",
        "uranium": "Uranium Extraction",
        "uranium_storage": "Uranium Storage",
        "uranium_ash": "Uranium Ash",
        "breeder_reactor": "Breeder Reactor",
        "mine_conveyor": "Mine Conveyor Belts",
        "oil_well": "Oil Derrick",
        "oil_depot": "Fuel Depot",
        "oil_power": "Oil Powerplant",
        "titanium_drills": "Titanium Drills",
        "alloy_drills": "Alloy Drills",
        "fracking": "Fracking",
        "mythril_drills": "Mythril Drills",
        "mass_driver": "Mass Driver",
        "orichalcum_driver": "Orichalcum Mass Driver",
        "polymer": "Polymer",
        "fluidized_bed_reactor": "Fluidized Bed Reactor",
        "synthetic_fur": "Synthetic Fur",
        "nanoweave": "Nanoweave",
        "stanene": "Stanene",
        "nano_tubes": "Nano Tubes",
        "scarletite": "Scarletite",
        "pillars": "Pillars Research",
        "reclaimer": "Reclaimers",
        "shovel": "Shovel",
        "iron_shovel": "Iron Shovel",
        "steel_shovel": "Steel Shovel",
        "titanium_shovel": "Titanium Shovel",
        "alloy_shovel": "Alloy Shovel",
        "mythril_shovel": "Mythril Shovel",
        "adamantite_shovel": "Adamantite Shovel",
        "stone_axe": "Primitive Axes",
        "copper_axes": "Bronze Axe",
        "iron_saw": "Sawmills",
        "steel_saw": "Steel Saws",
        "iron_axes": "Iron Axe",
        "steel_axes": "Steel Axe",
        "titanium_axes": "Titanium Axe",
        "chainsaws": "Chainsaws",
        "copper_sledgehammer": "Bronze Sledgehammer",
        "iron_sledgehammer": "Iron Sledgehammer",
        "steel_sledgehammer": "Steel Sledgehammer",
        "titanium_sledgehammer": "Titanium Sledgehammer",
        "copper_pickaxe": "Bronze Pickaxe",
        "iron_pickaxe": "Iron Pickaxe",
        "steel_pickaxe": "Steel Pickaxe",
        "jackhammer": "Jackhammer",
        "jackhammer_mk2": "Electric Jackhammer",
        "adamantite_hammer": "Adamantite Jackhammer",
        "elysanite_hammer": "Elysanite Jackhammer",
        "copper_hoe": "Bronze Hoes",
        "iron_hoe": "Iron Hoes",
        "steel_hoe": "Steel Hoes",
        "titanium_hoe": "Titanium Hoes",
        "adamantite_hoe": "Adamantite Hoes",
        "cyber_limbs": "Cybernetic Worker Limbs",
        "slave_pens": "Slave Pen",
        "slave_market": "Slave Market",
        "ceremonial_dagger": "Ceremonial Dagger",
        "last_rites": "Last Rites",
        "ancient_infusion": "Ancient Infusion",
        "garrison": "Garrison",
        "mercs": "Mercenaries",
        "signing_bonus": "Signing Bonus",
        "hospital": "Hospital",
        "bac_tanks": "BAC Tank",
        "boot_camp": "Boot Camp",
        "vr_training": "VR Training",
        "bows": "Bows",
        "flintlock_rifle": "Flintlock Rifle",
        "machine_gun": "Machine Gun",
        "bunk_beds": "Bunk Beds",
        "rail_guns": "Rail Guns",
        "laser_rifles": "Laser Rifles",
        "plasma_rifles": "Plasma Rifles",
        "disruptor_rifles": "Disruptor Rifles",
        "gauss_rifles": "Gauss Rifles",
        "cyborg_soldiers": "Cyborg Soldiers",
        "ethereal_weapons": "Ethereal Weaponry",
        "space_marines": "Space Marines",
        "hammocks": "Nanoweave Hammocks",
        "cruiser": "Patrol Cruiser",
        "armor": "Leather Armor",
        "plate_armor": "Plate Armor",
        "kevlar": "Kevlar",
        "nanoweave_vest": "Nanoweave Vest",
        "laser_turret": "Laser Turret",
        "plasma_turret": "Plasma Turret",
        "black_powder": "Black Powder",
        "dynamite": "Dynamite",
        "anfo": "ANFO",
        "super_tnt": "Super TNT",
        "mad": "Mutual Destruction",
        "cement": "Cement",
        "rebar": "Rebar",
        "steel_rebar": "Steel Rebar",
        "portland_cement": "Portland Cement",
        "screw_conveyor": "Screw Conveyor",
        "adamantite_screws": "Adamantite Screws",
        "otherworldly_binder": "Otherworldly Binder",
        "hunter_process": "Hunter Process",
        "kroll_process": "Kroll Process",
        "cambridge_process": "Cambridge Process",
        "pynn_partical": "Pynn Particles",
        "matter_compression": "Matter Compression",
        "higgs_boson": "Higgs Boson",
        "dimensional_compression": "Dimension Compression",
        "theology": "Theology",
        "fanaticism": "Fanaticism",
        "alt_fanaticism": "Fanaticism (Post-Transcendence)",
        "ancient_theology": "Ancient Theology",
        "study": "Study Ancients",
        "study_alt": "Study Ancients (Post-Preeminence)",
        "encoding": "Genetic Encoding",
        "deify": "Deify Ancients",
        "deify_alt": "Deify Ancients (Post-Preeminence)",
        "infusion": "Genetic Infusion",
        "indoctrination": "Indoctrination",
        "missionary": "Missionary",
        "zealotry": "Zealotry",
        "anthropology": "Anthropology",
        "alt_anthropology": "Anthropology (Post-Transcendence)",
        "mythology": "Mythology",
        "archaeology": "Archaeology",
        "merchandising": "Merchandising",
        "astrophysics": "Astrophysics",
        "rover": "Rovers",
        "probes": "Space Probes",
        "starcharts": "Star Charts",
        "colonization": "Colonization",
        "red_tower": "Red Control Tower",
        "space_manufacturing": "Space Manufacturing",
        "exotic_lab": "Exotic Materials Lab",
        "hydroponics": "Hydroponics Bays",
        "dyson_sphere": "Dyson Sphere (Plans)",
        "dyson_swarm": "Dyson Swarm",
        "swarm_plant": "Swarm Plant",
        "space_sourced": "Space Sourced",
        "swarm_plant_ai": "Swarm Plant AI",
        "swarm_control_ai": "Swarm Control AI",
        "quantum_swarm": "Quantum Swarm",
        "perovskite_cell": "Perovskite Cells",
        "swarm_convection": "Swarm Convection",
        "orichalcum_panels": "Orichalcum Panels",
        "dyson_net": "Dyson Net",
        "dyson_sphere2": "Dyson Sphere",
        "orichalcum_sphere": "Orichalcum Dyson Plating",
        "elysanite_sphere": "Elysanite Dyson Paneling",
        "gps": "GPS Constellation",
        "nav_beacon": "Navigation Beacon",
        "subspace_signal": "Subspace Beacon",
        "atmospheric_mining": "Atmospheric Mining",
        "helium_attractor": "Helium Attractor",
        "ram_scoops": "Ram Scoops",
        "elerium_prospecting": "Elerium Prospecting",
        "zero_g_mining": "Zero G Mining",
        "elerium_mining": "Elerium Mining",
        "laser_mining": "Laser Mining",
        "plasma_mining": "Plasma Mining",
        "elerium_tech": "Elerium Theory",
        "elerium_reactor": "Elerium Reactor",
        "neutronium_housing": "Neutronium Housing",
        "unification": "Unification (Plans)",
        "unification2": "Unification",
        "unite": "Unite Country",
        "genesis": "Genesis Project",
        "star_dock": "Space Dock",
        "interstellar": "Interstellar Probes",
        "genesis_ship": "Genesis Ship",
        "geck": "G.E.C.K.",
        "genetic_decay": "Gene Therapy",
        "stabilize_decay": "Stabilize Decay",
        "tachyon": "Tachyon Particles",
        "warp_drive": "Alcubierre Drive",
        "habitat": "Habitat",
        "graphene": "Graphene",
        "aerogel": "Aerogel",
        "mega_manufacturing": "Mega Manufacturing",
        "luxury_condo": "Luxury Condo",
        "stellar_engine": "Stellar Engine",
        "mass_ejector": "Mass Ejector",
        "asteroid_redirect": "Asteroid Redirect",
        "exotic_infusion": "Exotic Infusion (1st Warning)",
        "infusion_check": "Exotic Infusion (2nd Warning)",
        "infusion_confirm": "Exotic Infusion",
        "stabilize_blackhole": "Stabilize Black Hole",
        "veil": "The Veil",
        "mana_syphon": "Mana Syphon",
        "gravitational_waves": "Gravitational Waves",
        "gravity_convection": "Gravitational Convection",
        "wormholes": "Wormholes",
        "portal": "Portals",
        "fortifications": "Fortifications",
        "war_drones": "War Drones",
        "demon_attractor": "Demonic Attractor",
        "combat_droids": "Combat Droids",
        "repair_droids": "Repair Droids",
        "advanced_predators": "Advanced Drones",
        "enhanced_droids": "Enhanced War Droids",
        "sensor_drone": "Sensor Drones",
        "map_terrain": "Map Terrain",
        "calibrated_sensors": "Calibrated Sensors",
        "shield_generator": "Shield Generator",
        "enhanced_sensors": "Enhanced Sensors",
        "xeno_linguistics": "Xeno Linguistics",
        "xeno_culture": "Xeno Culture",
        "cultural_exchange": "Cultural Exchange",
        "shore_leave": "Shore Leave",
        "xeno_gift": "Alien Gift",
        "industrial_partnership": "Industrial Partnership",
        "embassy_housing": "Embassy Housing",
        "advanced_telemetry": "Advanced Telemetry",
        "defense_platform": "Defense Platform",
        "scout_ship": "Scout Ship",
        "corvette_ship": "Corvette Ship",
        "frigate_ship": "Frigate Ship",
        "cruiser_ship": "Cruiser Ship",
        "dreadnought": "Dreadnought",
        "ship_dock": "Ship Dock",
        "ore_processor": "Ore Processor",
        "scavenger": "Tech Scavenger",
        "coordinates": "Decrypt Coordinates",
        "chthonian_survey": "Chthonian Survey",
        "gateway_depot": "Depot",
        "soul_forge": "Soul Forge",
        "soul_attractor": "Soul Attractor",
        "soul_absorption": "Soul Absorption",
        "soul_link": "Soul Link",
        "soul_bait": "Soul Bait",
        "gun_emplacement": "Gun Emplacement",
        "advanced_emplacement": "Advanced Gun Emplacement",
        "dial_it_to_11": "Dial it up to 11",
        "limit_collider": "Limit Collider",
        "mana": "Mana",
        "ley_lines": "Ley Lines",
        "rituals": "Rituals",
        "crafting_ritual": "Crafting Rituals",
        "mana_nexus": "Mana Nexus",
        "clerics": "Clerics",
        "conjuring": "Conjuring",
        "res_conjuring": "Resource Conjuring",
        "alchemy": "Alchemy",
        "transmutation": "Advanced Transmutation",
        "secret_society": "Secret Society",
        "cultists": "Cultists",
        "conceal_ward": "Concealing Wards",
        "subtle_rituals": "Subtle Rituals",
        "pylon_camouflage": "Pylon Camouflage",
        "fake_tech": "Fake Tech",
        "concealment": "Empowered Concealment Wards",
        "improved_concealment": "Improved Concealment Wards",
        "outerplane_summon": "Outerplane Summon",
        "dark_bomb": "Dark Energy Bomb",
        "bribe_sphinx": "Bribe Sphinx",
        "alien_biotech": "Alien Biotech",
        "zero_g_lab": "Zero Gravity Lab",
        "operating_base": "Operating Base",
        "munitions_depot": "Munitions Depot",
        "fob": "Forward Operating Base",
        "bac_tanks_tp": "BAC Tank (True Path)",
        "medkit": "Advanced Medkits",
        "sam_site": "Planetary Defenses",
        "data_cracker": "Data Cracker",
        "ai_core_tp": "AI Supercore (True Path)",
        "ai_optimizations": "AI Optimizations",
        "synthetic_life": "Synthetic Life",
        "protocol66": "Protocol 66 (Warning)",
        "protocol66a": "Protocol 66",
        "terraforming_tp": "Terraforming (True Path)",
        "quantium": "Quantium",
        "anitgrav_bunk": "Anti-Grav Bunks",
        "higgs_boson_tp": "Higgs Boson (True Path)",
        "long_range_probes": "Long Range Probes",
        "strange_signal": "Strange Signal",
        "data_analysis": "Encrypted Data Analysis",
        "mass_relay": "Mass Relay",
        "nav_data": "Navigation Data",
        "sensor_logs": "Tau Ceti Data",
        "dronewar": "Drone Warfare",
        "drone_tank": "AI Drone Tanks",
        "stanene_tp": "Stanene (True Path)",
        "graphene_tp": "Graphene (True Path)",
        "virtual_reality_tp": "Virtual Reality (True Path)",
        "electrolysis": "Electrolysis",
        "storehouse": "Titan Storage Facility",
        "adamantite_vault_tp": "Adamantite Vault (True Path)",
        "titan_bank": "Titan Banking",
        "hydrogen_plant": "Hydrogen Power",
        "water_mining": "Water Mining",
        "mercury_smelting": "Solar Smelting",
        "iridium_smelting": "Iridium Smelting (True Path)",
        "adamantite_crates": "Adamantite Crates",
        "bolognium_crates_tp": "Bolognium Crates (True Path)",
        "adamantite_containers_tp": "Adamantite Containers (True Path)",
        "quantium_containers": "Quantium Containers",
        "unobtainium_containers": "Unobtainium Containers",
        "reinforced_shelving": "Reinforced Shelving",
        "garage_shelving": "Quantium Garage Shelving",
        "warehouse_shelving": "Automated Warehousing System",
        "elerium_extraction": "Elerium Extraction",
        "orichalcum_panels_tp": "Orichalcum Panels (True Path)",
        "shipyard": "Dwarf Ship Yard",
        "ship_lasers": "Ship Lasers",
        "pulse_lasers": "Ship Pulse Lasers",
        "ship_plasma": "Ship Plasma Beams",
        "ship_phaser": "Ship Phasers",
        "ship_disruptor": "Ship Disruptor",
        "destroyer_ship": "Destroyer",
        "cruiser_ship_tp": "Cruiser",
        "h_cruiser_ship": "Battlecruiser",
        "dreadnought_ship": "Dreadnought (True Path)",
        "pulse_engine": "Pulse Drive",
        "photon_engine": "Photon Drive",
        "vacuum_drive": "Vacuum Drive",
        "ship_fusion": "Fusion Generator",
        "ship_elerium": "Elerium Generator",
        "quantum_signatures": "Quantum Signatures",
        "interstellar_drive": "Interstellar Drive",
        "alien_outpost": "Alien Outpost",
        "jumpgates": "Jump Gates",
        "system_survey": "Tau Survey",
        "repository": "Repository",
        "fusion_generator": "Nuclear Fusion (True Path)",
        "tau_cultivation": "Tau Ceti Cultivation",
        "tau_manufacturing": "Tau Ceti Manufacturing",
        "weasels": "Weasels",
        "jeff": "Contact Jeff",
        "womling_fun": "Womling Entertainment",
        "womling_lab": "Womling Science",
        "womling_mining": "Womling Dirt Excavation",
        "womling_firstaid": "Womling First Aid",
        "womling_logistics": "Womling Logistics",
        "womling_repulser": "Womling Repulser Pad",
        "womling_farming": "Womling Farming",
        "womling_housing": "Womling Housing",
        "womling_support": "Womling Support",
        "womling_recycling": "Womling Recycling",
        "asteroid_analysis": "Asteroid Data Analysis",
        "shark_repellent": "Shark Repellent",
        "belt_mining": "Tau Ceti Belt Mining",
        "adv_belt_mining": "Advanced Belt Mining",
        "space_whaling": "Space Whaling",
        "infectious_disease_lab": "Infectious Disease Lab",
        "isolation_protocol": "Isolation Protocol",
        "focus_cure": "Focus Cure",
        "decode_virus": "Decode Virus",
        "vaccine_campaign": "Vaccination Campaign",
        "vax_strat1": "Propaganda Campaign",
        "vax_strat2": "Force Vaccination",
        "vax_strat3": "Show the Science",
        "vax_strat4": "Secret Vaccination",
        "cloning": "Cloning Facility",
        "clone_degradation": "Clone Degradation",
        "digital_paradise": "Digital Paradise",
        "ringworld": "Design a Ringworld",
        "iso_gambling": "Pit Bosses",
        "outpost_boost": "Alien Outpost Device",
        "cultural_center": "Cultural Center",
        "outer_tau_survey": "Survey Outer Planet",
        "alien_research": "Alien Research",
        "womling_gene_therapy": "Womling Gene Therapy",
        "food_culture": "Sell fruitcake",
        "advanced_refinery": "Advanced Ore Refinery",
        "advanced_pit_mining": "Advanced Pit Mining",
        "useless_junk": "Useless Junk",
        "advanced_asteroid_mining": "Advanced Asteroid Mining",
        "advanced_material_synthesis": "Advanced Material Synthesis",
        "matrioshka_brain": "Matrioshka Brain",
        "ignition_device": "Ignition Device",
        "replicator": "Matter Replicator (Lone Survivor)",
        "womling_unlock": "Meet The Neighbors",
        "garden_of_eden": "Garden of Eden",
        "asphodel_flowers": "Ghostly Flowers",
        "ghost_traps": "Ghost Traps",
        "research_station": "Non-overlapping Magisteria",
        "soul_engine": "Soul Power",
        "railway_to_hell": "Railway to Hell",
        "purification": "Purification",
        "asphodel_mech": "Asphodel Mech Security",
        "asphodel_storage": "Asphodel Storage",
        "asphodel_stabilizer": "Asphodel Stabilizer",
        "edenic_bunker": "Edenic Bunker",
        "bliss_den": "Den of Bliss",
        "hallowed_housing": "Hallowed Housing",
        "outer_plane_study": "Outer Plane Study",
        "camouflage": "Camouflage",
        "celestial_tactics": "Celestial Tactics",
        "active_camouflage": "Active Camouflage",
        "special_ops_training": "Special Ops Training",
        "spectral_training": "Spectral Training Ground",
        "elysanite_mining": "Elysanite Mining",
        "sacred_smelter": "Sacred Smelter",
        "fire_support_base": "Fire Support Base",
        "pillbox": "Pillbox",
        "elerium_cannon": "Elerium Cannon",
        "elerium_containment": "Elerium Containment",
        "ambrosia": "Ambrosia",
        "eternal_bank": "Eternal Wealth",
        "wisdom": "Wisdom of the Ancients",
        "rushmore": "Mount Rushmore",
        "reincarnation": "Reincarnation Machine",
        "otherworldly_cement": "Edenic Cement",
        "ancient_crafters": "Ancient Crafters",
        "spirit_syphon": "Spirit Syphon",
        "spirit_capacitor": "Spirit Capacitor",
        "suction_force": "Suction Force",
        "soul_compactor": "Soul Compactor",
        "tomb": "Tomb of the Dead God",
        "energy_drain": "Energy Drain",
        "divine_infuser": "Divine Infuser"
    };

    const events = {
        womlings: "Womlings arrival",
        steel: "Steel discovery",
        elerium: "Elerium discovery",
        oil: "Space Oil discovery",
        pit: "Pit discovery",
        alien: "Alien encounter",
        piracy: "Piracy unlock",
        alien_db: "Alien Database find",
        corrupt_gem: "Corrupt Soul Gem creation",
        vault: "Vault discovery",
        syndicate: "Syndicate unlock"
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
    function lazyLoad(fn) {
        let value = undefined;
        return new Proxy({}, {
            get(obj, prop) {
                value ??= fn();
                return value[prop];
            },
            set(obj, prop, value) {
                value ??= fn();
                value[prop] = value;
                return true;
            }
        });
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
        return patternMatch(techs[id], [
            [/(.+) \((.+)\)/, (name, descriminator) => [name, descriminator]],
            [/(.+)/, (name) => [name, "Research"]]
        ]);
    }
    function milestoneName(milestone, universe) {
        const name = patternMatch(milestone, [
            [/built:(.+?):(\d+)/, (id, count) => [buildings[id], count, Number(count) !== (segments[id] ?? 1)]],
            [/tech:(.+)/, (id) => [...techName(id), false]],
            [/event:(.+)/, (id) => [events[id], "Event", false]],
            [/event_condition:(.+)/, (id) => [events[id], "Event condition", false]],
            [/effect:(.+)/, (id) => [environmentEffects[id], "Effect", false]],
            [/reset:(.+)/, (reset) => [resetName(reset, universe), "Reset", false]],
        ]);
        return name ?? [milestone, "Unknown", false];
    }
    function generateMilestoneNames(milestones, universe) {
        const candidates = {};
        for (let i = 0; i !== milestones.length; ++i) {
            const [name, discriminator, force] = milestoneName(milestones[i], universe);
            (candidates[name] ??= []).push([i, discriminator, force]);
        }
        const names = new Array(milestones.length);
        for (const [name, discriminators] of Object.entries(candidates)) {
            // Add a discriminator if there are multiple milestones with the same name
            // Or if the count of a "built" milestone differs from the segment number of the building
            if (discriminators.length > 1 || discriminators[0][2]) {
                for (const [i, discriminator] of discriminators) {
                    names[i] = `${name} (${discriminator})`;
                }
            }
            else {
                names[discriminators[0][0]] = name;
            }
        }
        return names;
    }
    function isEventMilestone(milestone) {
        return milestone.startsWith("event:");
    }
    function isEffectMilestone(milestone) {
        return milestone.startsWith("effect:");
    }

    const viewModes7 = {
        "total": "Total",
        "filled": "Total (filled)",
        "bars": "Total (bars)",
        "segmented": "Segmented",
        "barsSegmented": "Segmented (bars)"
    };
    function migrateView$4(view) {
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
        return {
            ...config,
            version: 8,
            views: config.views.map(migrateView$4)
        };
    }

    function migrateConfig$3(config) {
        const resetIDs = rotateMap(resets);
        const viewModeIDs = rotateMap(viewModes7);
        function convertReset(resetName) {
            return resetName === "Vacuum Collapse" ? "blackhole" : resetIDs[resetName];
        }
        return {
            version: 4,
            views: config.views.map((view) => {
                return {
                    resetType: convertReset(view.resetType),
                    universe: view.universe,
                    mode: viewModeIDs[view.mode],
                    daysScale: view.daysScale,
                    numRuns: view.numRuns,
                    milestones: Object.fromEntries(view.milestones.map((milestone) => {
                        if (milestone[0] === "Built") {
                            const [, tab, id, , count, enabled] = milestone;
                            return [`built:${tab}-${id}:${count}`, enabled];
                        }
                        else if (milestone[0] === "Researched") {
                            const [, id, , enabled] = milestone;
                            return [`tech:${id}`, enabled];
                        }
                        else if (milestone[0] === "Event") {
                            const [, , enabled] = milestone;
                            return [`event:womlings`, enabled];
                        }
                        else if (milestone[0] === "Reset") {
                            const [, resetName, enabled] = milestone;
                            return [`reset:${convertReset(resetName)}`, enabled];
                        }
                        return ["unknown", true];
                    }))
                };
            })
        };
    }
    function migrateHistory$4(history, config) {
        const oldNames = rotateMap(history.milestones);
        const newNames = Object.fromEntries(config.views.flatMap(v => Object.keys(v.milestones).map(m => [m, milestoneName(m)[0]])));
        function resetName(run) {
            const [milestoneID] = run.milestones[run.milestones.length - 1];
            return oldNames[milestoneID];
        }
        const numMilestones = Object.entries(history.milestones).length;
        // Old milestone ID to new milestones (with run numbers)
        const milestonesMapping = transformMap(history.milestones, ([, milestoneID]) => [milestoneID, {}]);
        for (let runIdx = 0; runIdx != history.runs.length; ++runIdx) {
            const run = history.runs[runIdx];
            for (const view of config.views) {
                if (resetName(run) !== resets[view.resetType]) {
                    continue;
                }
                if (view.universe !== undefined && run.universe !== view.universe) {
                    continue;
                }
                for (const [milestoneID] of run.milestones) {
                    const map = milestonesMapping[milestoneID];
                    for (const milestone of Object.keys(view.milestones)) {
                        if (oldNames[milestoneID] === newNames[milestone]) {
                            (map[milestone] ??= []).push(runIdx);
                        }
                    }
                }
            }
        }
        let id = numMilestones;
        const resetIDs = lazyLoad(() => rotateMap(resets));
        const buildingIDs = lazyLoad(() => rotateMap(buildings));
        const researchIDs = lazyLoad(() => rotateMap(techs));
        const runsToRemap = {};
        const milestones = {};
        for (const [oldMilestoneID, candidatesMap] of Object.entries(milestonesMapping)) {
            const candidates = Object.entries(candidatesMap);
            if (candidates.length === 0) {
                // The old milestone is not present in any of the current views - guess
                const oldName = oldNames[Number(oldMilestoneID)];
                if (oldName === "Womlings arrival") {
                    milestones["event:womlings"] = Number(oldMilestoneID);
                }
                else if (resetIDs[oldName] !== undefined) {
                    milestones[`reset:${resetIDs[oldName]}`] = Number(oldMilestoneID);
                }
                else if (buildingIDs[oldName] !== undefined) {
                    milestones[`built:${buildingIDs[oldName]}:1`] = Number(oldMilestoneID);
                }
                else if (researchIDs[oldName] !== undefined) {
                    milestones[`tech:${researchIDs[oldName]}`] = Number(oldMilestoneID);
                }
            }
            else if (candidates.length === 1) {
                // The old milestone maps to exactly 1 new milestone - no remapping needed
                const [milestone] = candidates[0];
                milestones[milestone] = Number(oldMilestoneID);
            }
            else {
                // The old milestone maps to more than 1 new milestones - remap affected runs
                for (const [milestone, runs] of candidates) {
                    const newMilestoneID = id++;
                    milestones[milestone] = newMilestoneID;
                    for (const run of runs) {
                        (runsToRemap[run] ??= {})[Number(oldMilestoneID)] = newMilestoneID;
                    }
                }
            }
        }
        for (const [runIdx, mapping] of Object.entries(runsToRemap)) {
            const run = history.runs[Number(runIdx)];
            for (const reference of run.milestones) {
                reference[0] = mapping[reference[0]] ?? reference[0];
            }
        }
        return {
            milestones,
            runs: history.runs
        };
    }
    function migrateLatestRun$4(latestRun, config, history) {
        const resetIDs = rotateMap(resets);
        const newRun = {
            run: latestRun.run,
            universe: latestRun.universe,
            resets: transformMap(latestRun.resets, ([name, count]) => [resetIDs[name], count]),
            totalDays: latestRun.totalDays,
            milestones: {}
        };
        if (Object.entries(latestRun.milestones).length === 0) {
            return newRun;
        }
        const lastRecordedRun = history.runs[history.runs.length - 1];
        if (lastRecordedRun === undefined) {
            return null;
        }
        const milestones = rotateMap(history.milestones);
        const lastRecordedRunResetMilestoneID = lastRecordedRun.milestones[lastRecordedRun.milestones.length - 1][0];
        const lastRecordedRunResetMilestone = milestones[lastRecordedRunResetMilestoneID];
        const lastRecordedRunReset = lastRecordedRunResetMilestone.slice(6); // strip away the leading "reset:"
        // Find the views that match the latest run
        const views = config.views.filter(view => {
            if (view.resetType !== lastRecordedRunReset) {
                return false;
            }
            if (view.universe !== undefined && view.universe !== lastRecordedRun.universe) {
                return false;
            }
            return true;
        });
        if (views.length === 0) {
            return null;
        }
        const milestonesByName = Object.fromEntries(views.flatMap(v => Object.keys(v.milestones).map(m => [milestoneName(m)[0], m])));
        newRun.milestones = transformMap(latestRun.milestones, ([milestoneName, day]) => {
            const milestone = milestonesByName[milestoneName];
            if (milestone !== undefined) {
                return [milestone, day];
            }
            else {
                return ["", day];
            }
        });
        if ("" in newRun.milestones) {
            return null;
        }
        return newRun;
    }
    function migrate3(config, history, latestRun) {
        const newConfig = migrateConfig$3(config);
        let newHistory = null;
        if (history !== null) {
            newHistory = migrateHistory$4(history, newConfig);
        }
        let newLatestRun = null;
        if (latestRun !== null && newHistory !== null) {
            newLatestRun = migrateLatestRun$4(latestRun, newConfig, newHistory);
        }
        return [newConfig, newHistory, newLatestRun];
    }

    function migrate4(config) {
        return {
            version: 6,
            recordRuns: config.recordRuns ?? true,
            lastOpenViewIndex: config.views.length !== 0 ? 0 : undefined,
            views: config.views.map(view => {
                return {
                    additionalInfo: [],
                    ...view
                };
            })
        };
    }

    function migrateLatestRun$3(latestRun) {
        if (latestRun.universe === "bigbang") {
            delete latestRun.universe;
        }
    }
    function migrateHistory$3(history) {
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
            migrateLatestRun$3(latestRun);
        }
        if (migrateHistory$3(history)) {
            config.version = 7;
        }
    }

    function rename(milestone) {
        return milestone.replace("harbour", "harbor");
    }
    function migrateMilestones(milestones) {
        return transformMap(milestones, ([milestone, day]) => [rename(milestone), day]);
    }
    function migrateView$3(view) {
        view.milestones = migrateMilestones(view.milestones);
    }
    function migrateConfig$2(config) {
        for (const view of config.views) {
            migrateView$3(view);
        }
        config.version = 9;
    }
    function migrateHistory$2(history) {
        history.milestones = migrateMilestones(history.milestones);
    }
    function migrateLatestRun$2(latestRun) {
        latestRun.milestones = migrateMilestones(latestRun.milestones);
    }
    function migrate8(config, history, latestRun) {
        migrateConfig$2(config);
        migrateHistory$2(history);
        if (latestRun !== null) {
            migrateLatestRun$2(latestRun);
        }
    }

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

    const VERSION = 16;
    function migrate() {
        let config = loadConfig();
        let history = loadHistory();
        let latestRun = loadLatestRun();
        if (config === null) {
            return;
        }
        if (config.version >= VERSION) {
            return;
        }
        if (config.version < 4) {
            [config, history, latestRun] = migrate3(config, history, latestRun);
        }
        if (config.version < 6) {
            config = migrate4(config);
        }
        if (config.version === 6) {
            migrate6(config, history, latestRun);
        }
        if (config.version === 7) {
            config = migrate7(config);
        }
        if (config.version === 8) {
            migrate8(config, history, latestRun);
        }
        if (config.version === 9) {
            migrate9(config, latestRun);
        }
        if (config.version === 10) {
            migrate10(config);
        }
        if (config.version === 11) {
            migrate11(config, history, latestRun);
        }
        if (config.version === 12) {
            migrate12(config, history);
        }
        if (config.version === 13) {
            migrate13(config);
        }
        if (config.version === 14) {
            migrate14(config, history);
        }
        if (config.version === 15) {
            migrate15(config);
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
            return $(`#tech-${tech} .oldTech`).length !== 0;
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
            if (!isEffectMilestone(l) && !isEffectMilestone(r)) {
                const lIdx = lastRun.milestones.findIndex(([id]) => id === history.getMilestoneID(l));
                const rIdx = lastRun.milestones.findIndex(([id]) => id === history.getMilestoneID(r));
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
            const milestones = [
                ...Object.entries(runStats.milestones).map(([milestone, days]) => [this.getMilestoneID(milestone), days]),
                [this.getMilestoneID(`reset:${resetType}`), runStats.totalDays]
            ];
            milestones.sort(([, l], [, r]) => l - r);
            const effectsHistory = [
                ...runStats.effectsHistory,
                ...Object.entries(runStats.activeEffects).map(([effect, start]) => [effect, start, runStats.totalDays])
            ];
            const effects = effectsHistory
                .map(([effect, start, end]) => [this.getMilestoneID(effect), start, end]);
            const entry = {
                run: runStats.run,
                universe: runStats.universe,
                starLevel: runStats.starLevel,
                milestones,
                effects: effects.length === 0 ? undefined : effects
            };
            this.augmentEntry(entry, runStats);
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
        augmentEntry(entry, runStats) {
            const views = this.config.views.filter(v => shouldIncludeRun(entry, v, this));
            const infoKeys = [...new Set(views.flatMap(v => v.additionalInfo))];
            for (const key of infoKeys) {
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
            if (isEffectMilestone(milestone)) {
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
    `;

    function waitFor(query) {
        return new Promise(resolve => {
            const node = $(query);
            if (node.length !== 0) {
                return resolve(node);
            }
            const observer = new MutationObserver(() => {
                const node = $(query);
                if (node.length !== 0) {
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
    async function graphToCanvas(plot) {
        const backgroundColor = $("html").css("background-color");
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
        const canvasWidth = $(plot).width();
        const canvasHeight = $(plot).height();
        const { width, height } = plot.viewBox.baseVal;
        const context = context2d(width, height, canvasWidth, canvasHeight);
        const im = new Image();
        im.width = width;
        im.height = height;
        $(plot).attr("xmlns", "http://www.w3.org/2000/svg");
        const idx = -"</svg>".length;
        im.src = "data:image/svg+xml," + encodeURIComponent(plot.outerHTML.slice(0, idx) + style + plot.outerHTML.slice(idx));
        return new Promise((resolve) => {
            im.onload = () => {
                context.drawImage(im, 0, 0, width, height);
                resolve(context.canvas);
            };
        });
    }
    async function legendToCanvas(legend) {
        const backgroundColor = $("html").css("background-color");
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
    async function plotToCanvas(plot) {
        const legendCanvas = await legendToCanvas($(plot).find("> div")[0]);
        const graphCanvas = await graphToCanvas($(plot).find("> svg")[0]);
        const legendHeight = parseFloat(legendCanvas.style.height);
        const graphHeight = parseFloat(graphCanvas.style.height);
        const height = legendHeight + graphHeight;
        const width = parseFloat(legendCanvas.style.width);
        const context = context2d(width, height);
        context.drawImage(legendCanvas, 0, 0, width, legendHeight);
        context.drawImage(graphCanvas, 0, legendHeight, width, graphHeight);
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
                    makeMilestoneGroup("Building/Project", "built", buildings),
                    makeMilestoneGroup("Research", "tech", techs),
                    makeMilestoneGroup("Event", "event", events),
                    makeMilestoneGroup("Effect", "effect", environmentEffects)
                ]
            };
        },
        computed: {
            filteredOptions() {
                return this.options
                    .map(({ type, options }) => ({
                    type,
                    options: fuzzysort.go(this.input, options, { key: "label", all: true }).map(c => c.obj)
                }))
                    .filter(({ options }) => options.length !== 0);
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
        methods: {
            add() {
                if (this.milestone !== undefined) {
                    this.view.addMilestone(this.milestone);
                }
            },
            remove() {
                if (this.milestone !== undefined) {
                    this.view.removeMilestone(this.milestone);
                }
            },
            sort() {
                this.view.sortMilestones(this.history);
            },
            resetColors() {
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
                if (!(isEventMilestone(milestone) || isEffectMilestone(milestone))) {
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
        pickr.on("hide", (instance) => {
            if (instance.getColor().toHEXA().toString() !== vtable.currentColor()) {
                instance.setColor(vtable.defaultColor);
                vtable.onCancel();
            }
        });
        pickr.on("save", (value, instance) => {
            const hex = value?.toHEXA().toString();
            if (hex !== undefined) {
                vtable.onSave(hex);
            }
            instance.hide();
        });
        pickr.on("change", (value) => {
            vtable.onChange(value.toHEXA().toString());
        });
        return colorPickerInstance = [pickr, trigger];
    }
    function makeColorPicker(target, overflow, defaultColor, instanceCallbacks) {
        const [pickr, trigger] = getPickrInstance();
        const wrapper = makeColorPickerTrigger(target, overflow).on("click", function () {
            Object.assign(vtable, { ...instanceCallbacks, defaultColor });
            pickr.setColor(defaultColor, true);
            trigger.prop("style", $(this).attr("style"));
            trigger.insertAfter(target);
            trigger.trigger("click");
        });
        target.parent().css("position", "relative");
        wrapper.insertAfter(target);
    }

    const topTextOffset = -27;
    const marginTop = 30;
    // If the graph gets redrawn while sorting is in progress or the color picker is open, the pending state is lost
    // Store it here and use it in the next redraw
    const pendingColorPicks = new WeakMap();
    const pendingDraggingLegend = new WeakMap();
    const pendingSelection = new WeakMap();
    function discardCachedState(view) {
        pendingColorPicks.delete(view);
        pendingDraggingLegend.delete(view);
        pendingSelection.delete(view);
    }
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
    function makeGraph(history, view, game, currentRun, onSelect) {
        const filteredRuns = applyFilters(history, view);
        const bestRun = findBestRun(history, view);
        const plotPoints = asPlotPoints(filteredRuns, history, view, game);
        if (view.includeCurrentRun && view.mode !== "records") {
            plotPoints.push(...processCurrentRun(currentRun, filteredRuns, bestRun, view, history, game));
        }
        const milestones = getSortedMilestones(view);
        const milestoneNames = generateMilestoneNames(milestones, view.universe);
        const milestoneColors = milestones.map(m => view.milestones[m].color);
        const pendingPick = pendingColorPicks.get(view);
        if (pendingPick !== undefined) {
            const [milestone, value] = pendingPick;
            const idx = milestones.indexOf(milestone);
            milestoneColors[idx] = value;
        }
        const plot = Plot.plot({
            marginTop,
            width: 800,
            className: "analytics-plot",
            x: { axis: null },
            y: { grid: true, domain: calculateYScale(plotPoints, view) },
            color: { legend: true, domain: milestoneNames, range: milestoneColors },
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
        // Handle selection
        if (pendingSelection.has(view)) {
            const [{ top, left }, milestone] = pendingSelection.get(view);
            waitFor(plot).then(() => {
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
            });
        }
        plot.addEventListener("mousedown", (event) => {
            if (plot.value && plot.value.run < filteredRuns.length) {
                const container = $(`#mTabAnalytics > .b-tabs > section`);
                const coordinates = {
                    top: event.clientY + container.scrollTop(),
                    left: event.clientX + container.scrollLeft()
                };
                pendingSelection.set(view, [coordinates, plot.value.milestone]);
                onSelect(filteredRuns[plot.value.run]);
            }
            else {
                pendingSelection.delete(view);
                onSelect(null);
            }
        });
        // Process legend
        const legendNode = $(plot).find("> div");
        if (pendingDraggingLegend.has(view)) {
            legendNode.replaceWith(pendingDraggingLegend.get(view));
        }
        else {
            legendNode.css("justify-content", "center");
            legendNode.find("> span").each(function () {
                const svgNode = $(this).find("> svg");
                const milestone = milestones[$(this).index() - 1];
                const milestoneName = milestoneNames[$(this).index() - 1];
                const defaultColor = svgNode.attr("fill");
                // Metadata
                svgNode
                    .attr("data-view", view.index)
                    .attr("data-milestone", milestone);
                // Styling
                $(this).css("font-size", "1rem");
                if (isEffectMilestone(milestone)) {
                    svgNode
                        .attr("fill", null)
                        .attr("fill-opacity", "0")
                        .attr("stroke", defaultColor);
                }
                else if (isEventMilestone(milestone)) {
                    svgNode.find("> rect").replaceWith(`<circle cx="50%" cy="50%" r="50%"></circle>`);
                    svgNode.html(svgNode.html());
                }
                // Toggle milestones on click
                $(this).css("cursor", "pointer");
                $(this).toggleClass("crossed", !view.milestones[milestone].enabled);
                $(this).on("click", function (event) {
                    // Ignore clicks on the svg
                    if (event.target !== this) {
                        return;
                    }
                    const milestone = milestones[$(this).index() - 1];
                    view.toggleMilestone(milestone);
                });
                // Set up color picker
                const setMarksColor = (value) => {
                    function impl() {
                        if ($(this).attr("fill") !== undefined) {
                            $(this).attr("fill", value);
                        }
                        if ($(this).attr("stroke") !== undefined) {
                            $(this).attr("stroke", value);
                        }
                    }
                    svgNode.each(impl);
                    $(`figure [data-milestone="${milestoneName}"]`).each(impl);
                };
                makeColorPicker(svgNode, 3, defaultColor, {
                    onChange: (value) => {
                        pendingColorPicks.set(view, [milestone, value]);
                        setMarksColor(value);
                    },
                    onSave: (value) => {
                        pendingColorPicks.delete(view);
                        view.setMilestoneColor(milestone, value);
                    },
                    onCancel: () => {
                        pendingColorPicks.delete(view);
                        setMarksColor(defaultColor);
                    },
                    currentColor: () => view.milestones[milestone].color
                });
            });
            Sortable.create(legendNode[0], {
                animation: 150,
                onStart() {
                    pendingDraggingLegend.set(view, $(plot).find("> div"));
                },
                onEnd({ oldIndex, newIndex }) {
                    pendingDraggingLegend.delete(view);
                    if (oldIndex !== newIndex) {
                        view.moveMilestone(oldIndex - 1, newIndex - 1);
                    }
                }
            });
        }
        $(plot).find("> svg").attr("width", "100%");
        $(plot).css("margin", "0");
        return plot;
    }

    var Plot$1 = {
        inject: ["game", "config", "history", "currentRun"],
        props: ["view"],
        data() {
            return {
                selectedRun: null,
                plot: null,
                timestamp: null
            };
        },
        computed: {
            outdated() {
                return this.timestamp === null || (this.supportsRealTimeUpdates && this.timestamp !== this.game.day);
            },
            supportsRealTimeUpdates() {
                if (!this.config.recordRuns) {
                    return false;
                }
                if (!this.config.active) {
                    return false;
                }
                if (!this.view.active) {
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
                if (this.view.active && (force || this.outdated)) {
                    this.plot = this.makeGraph();
                    this.timestamp = this.game.day;
                }
            },
            makeGraph() {
                return makeGraph(this.history, this.view, this.game, this.currentRun, (run) => { this.selectedRun = run; });
            }
        },
        watch: {
            plot(newNode, oldNode) {
                if (oldNode !== null) {
                    $(oldNode).replaceWith(newNode);
                }
                else {
                    this.redraw();
                }
            },
            selectedRun() {
                this.$emit("select", this.selectedRun);
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
            "history.runs"() {
                discardCachedState(this.view);
                this.selectedRun = null;
                this.redraw();
            },
            view: {
                handler() {
                    discardCachedState(this.view);
                    this.selectedRun = null;
                    this.redraw(true);
                },
                deep: true
            },
            currentRun: {
                handler() {
                    if (this.supportsRealTimeUpdates) {
                        this.redraw();
                    }
                },
                deep: true
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
            Plot: Plot$1
        },
        inject: ["config", "history"],
        props: ["view"],
        data() {
            return {
                selectedRun: null,
                rendering: false
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
                const canvas = await plotToCanvas(this.$refs.plot.plot);
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
            }
        },
        template: `
            <b-tab-item :id="id">
                <template slot="header">
                    <span class="view-tab-header">{{ name }}</span>
                </template>

                <div class="flex flex-col gap-m">
                    <view-settings :view="view"/>

                    <milestone-controller :view="view"/>

                    <plot ref="plot" :view="view" @select="(run) => { selectedRun = run }"/>

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
        // Because the observation button may not always exist,
        // use then() instead of await to unblock bootstrapUIComponents() and allow logging in index.ts
        waitFor("button.observe").then(observationButtons => {
            // Vanilla evolve does `global.settings.civTabs = $(`#mainTabs > nav ul li`).length - 1`
            // Replace the button with the mock click handler that assigns the correct tab index
            const text = observationButtons.first().text();
            const mockButton = $(`<button class="button observe right">${text}</button>`);
            mockButton.on("click", () => {
                openTab(8 /* EvolveTabs.HellObservations */);
            });
            observationButtons.replaceWith(mockButton);
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
    function addStyles() {
        $("head").append(`<style type="text/css">${styles}</style>`);
    }
    async function bootstrapUIComponents(game, config, history, currentRun) {
        addStyles();
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

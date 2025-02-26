// ==UserScript==
// @name         Evolve Analytics
// @namespace    http://tampermonkey.net/
// @version      0.14.13
// @description  Track and see detailed information about your runs
// @author       Sneed
// @match        https://pmotschmann.github.io/Evolve/
// @resource     PICKR_CSS https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/themes/classic.min.css
// @require      https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/pickr.min.js
// @require      https://cdn.jsdelivr.net/npm/d3@7
// @require      https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.17
// @require      https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js
// @require      https://code.jquery.com/jquery-3.7.1.min.js
// @require      https://code.jquery.com/ui/1.12.1/jquery-ui.min.js
// @grant        GM_getResourceText
// @grant        GM_addStyle
// ==/UserScript==

/*global $ Plot htmlToImage LZString Pickr Vue*/

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
    const milestoneTypes = {
        built: "Built",
        tech: "Researched",
        event: "Event",
        effect: "Environment effect"
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

    class Subscribable {
        callbacks = {};
        on(event, callback) {
            (this.callbacks[event] ??= []).push(callback);
        }
        emit(event, arg) {
            this.invoke(event, arg);
            this.invoke("*", arg);
        }
        invoke(event, arg) {
            this.callbacks[event]?.forEach(cb => cb(arg));
        }
    }

    class Game extends Subscribable {
        evolve;
        subscribed = false;
        constructor(evolve) {
            super();
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
            this.on("newDay", fn);
            if (!this.subscribed) {
                this.subscribeToGameUpdates();
                this.subscribed = true;
            }
        }
        subscribeToGameUpdates() {
            let previousDay = null;
            this.onGameTick(() => {
                const day = this.day;
                if (previousDay !== day) {
                    this.emit("newDay", this.day);
                    previousDay = day;
                }
            });
        }
        onGameTick(fn) {
            let craftCost = this.evolve.craftCost;
            Object.defineProperty(this.evolve, "craftCost", {
                get: () => craftCost,
                set: (value) => {
                    craftCost = value;
                    fn();
                }
            });
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

    class ViewUtils extends Subscribable {
        view;
        config;
        static idGenerator = 0;
        _id = ++ViewUtils.idGenerator;
        constructor(view, config) {
            super();
            this.view = view;
            this.config = config;
            this.on("updated", () => {
                this.config.emit("viewUpdated", this);
            });
            const self = this;
            return new Proxy(view, {
                get(obj, prop, receiver) {
                    return Reflect.get(self, prop, receiver)
                        || Reflect.get(view, prop, receiver);
                },
                set(obj, prop, value, receiver) {
                    if (value === view[prop]) {
                        return true;
                    }
                    const ret = Reflect.set(self, prop, value, receiver)
                        || Reflect.set(view, prop, value, receiver);
                    self.emit("updated", receiver);
                    return ret;
                }
            });
        }
        get numRuns() {
            return this.makeLimitWrapper("numRuns");
        }
        get skipRuns() {
            return this.makeLimitWrapper("skipRuns");
        }
        set resetType(value) {
            const info = this.view.milestones[`reset:${this.view.resetType}`];
            delete this.view.milestones[`reset:${this.view.resetType}`];
            this.view.milestones[`reset:${value}`] = info;
            this.view.resetType = value;
        }
        id() {
            return this._id;
        }
        index() {
            return this.config.views.indexOf(this);
        }
        addMilestone(milestone) {
            const index = Object.entries(this.view.milestones).length;
            const colors = Object.values(Observable10);
            const color = effectColors[milestone] ?? colors[index % colors.length];
            this.view.milestones[milestone] = { index, enabled: true, color };
            this.emit("updated", this);
        }
        removeMilestone(milestone) {
            if (milestone in this.view.milestones) {
                delete this.view.milestones[milestone];
                this.updateMilestoneOrder(getSortedMilestones(this.view));
                this.emit("updated", this);
            }
        }
        toggleMilestone(milestone) {
            const info = this.view.milestones[milestone];
            if (info !== undefined) {
                info.enabled = !info.enabled;
                this.emit("updated", this);
            }
        }
        setMilestoneColor(milestone, color) {
            const info = this.view.milestones[milestone];
            if (info !== undefined) {
                info.color = color;
                this.emit("updated", this);
            }
        }
        moveMilestone(milestone, newIndex) {
            const oldIndex = this.view.milestones[milestone]?.index;
            if (oldIndex >= 0 && oldIndex !== newIndex) {
                const milestones = getSortedMilestones(this.view);
                milestones.splice(oldIndex, 1);
                milestones.splice(newIndex, 0, milestone);
                this.updateMilestoneOrder(milestones);
                this.emit("updated", this);
            }
        }
        sortMilestones(history) {
            sortMilestones(this, history);
            this.emit("updated", this);
        }
        resetColors() {
            const colors = Object.values(Observable10);
            for (const [milestone, info] of Object.entries(this.view.milestones)) {
                info.color = effectColors[milestone] ?? colors[info.index % colors.length];
            }
            this.emit("updated", this);
        }
        toggleAdditionalInfo(key) {
            const idx = this.view.additionalInfo.indexOf(key);
            if (idx !== -1) {
                this.view.additionalInfo.splice(idx, 1);
            }
            else {
                this.view.additionalInfo.push(key);
            }
            this.emit("updated", this);
        }
        makeLimitWrapper(prop) {
            const self = this;
            return {
                get enabled() {
                    return self.view[prop].enabled;
                },
                set enabled(value) {
                    self.view[prop].enabled = value;
                    self.emit("updated", self);
                },
                get value() {
                    return self.view[prop].value;
                },
                set value(value) {
                    self.view[prop].value = value;
                    self.emit("updated", self);
                }
            };
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
    class ConfigManager extends Subscribable {
        game;
        config;
        milestones;
        views;
        constructor(game, config) {
            super();
            this.game = game;
            this.config = config;
            this.milestones = this.collectMilestones();
            this.views = this.config.views.map(v => makeViewProxy(this, v));
            this.on("*", () => {
                saveConfig(this.config);
                this.milestones = this.collectMilestones();
            });
        }
        get recordRuns() {
            return this.config.recordRuns;
        }
        set recordRuns(value) {
            if (value !== this.config.recordRuns) {
                this.config.recordRuns = value;
                this.emit("updated", this);
            }
        }
        get additionalInfoToTrack() {
            const unique = new Set(this.views.flatMap(v => v.additionalInfo));
            return [...unique];
        }
        get openViewIndex() {
            return this.config.lastOpenViewIndex;
        }
        get openView() {
            if (this.openViewIndex !== undefined) {
                return this.views[this.openViewIndex];
            }
        }
        viewOpened(view) {
            const idx = this.views.indexOf(view);
            this.config.lastOpenViewIndex = idx === -1 ? undefined : idx;
            // don't emit an event as this is purely a visual thing
            saveConfig(this.config);
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
            const proxy = makeViewProxy(this, view);
            this.config.views.push(view);
            this.views.push(proxy);
            this.config.lastOpenViewIndex = this.views.length - 1;
            this.emit("viewAdded", proxy);
            return proxy;
        }
        removeView(view) {
            const idx = this.views.indexOf(view);
            if (idx !== -1) {
                this.config.views.splice(idx, 1);
                this.views.splice(idx, 1);
                if (idx === this.config.lastOpenViewIndex) {
                    if (this.views.length === 0) {
                        this.config.lastOpenViewIndex = undefined;
                    }
                    else {
                        // Open the view on the left or, if the leftmost one was deleted, on the right
                        this.config.lastOpenViewIndex = Math.max(0, this.config.lastOpenViewIndex - 1);
                    }
                }
                this.emit("viewRemoved", view);
            }
        }
        collectMilestones() {
            const uniqueMilestones = new Set(this.config.views.flatMap(v => {
                return Object.entries(v.milestones)
                    .filter(([milestone]) => !milestone.startsWith("reset:"))
                    .map(([milestone]) => milestone);
            }));
            return Array.from(uniqueMilestones);
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
    function restoreToDay(run, day) {
        run.milestones = filterMap(run.milestones, ([, timestamp]) => timestamp <= day);
        run.activeEffects = filterMap(run.activeEffects, ([, startDay]) => startDay <= day);
        run.effectsHistory = run.effectsHistory.filter(([, , endDay]) => endDay <= day);
        run.totalDays = day;
    }
    function processLatestRun(game, config, history) {
        const latestRun = loadLatestRun();
        if (latestRun === null) {
            return;
        }
        if (isCurrentRun(latestRun, game)) {
            // If it is the current run, check if we loaded an earlier save - discard any milestones "from the future"
            restoreToDay(latestRun, game.day);
            saveCurrentRun(latestRun);
        }
        else {
            // If it's not the current run, discard it so that we can start tracking from scratch
            discardLatestRun();
            // The game refreshes the page after a reset
            // Thus, if the latest run is the previous one, it can be comitted to history
            if (isPreviousRun(latestRun, game) && config.recordRuns) {
                history.commitRun(latestRun);
            }
        }
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
                    runStats.activeEffects[milestone] = runStats.totalDays;
                }
                else if (!isActive && startDay !== undefined) {
                    runStats.effectsHistory.push([milestone, startDay, runStats.totalDays - 1]);
                    delete runStats.activeEffects[milestone];
                }
            }
            else if (reached()) {
                // Since this callback is invoked at the beginning of a day,
                // the milestone was reached the previous day
                runStats.milestones[milestone] = Math.max(0, runStats.totalDays - 1);
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
        runStats.starLevel ??= game.starLevel;
        runStats.universe ??= game.universe;
        runStats.raceName ??= game.raceName;
        runStats.junkTraits ??= junkTraits(game);
        runStats.combatDeaths = game.combatDeaths;
    }
    function withEventConditions(milestones) {
        const hasPrecondition = (event) => eventsInfo[event].conditionMet !== undefined;
        const conditions = milestones
            .map(patternMatcher([[/event:(.+)/, (id) => hasPrecondition(id) ? `event_condition:${id}` : undefined]]))
            .filter(m => m !== undefined);
        return [...conditions, ...milestones];
    }
    function makeMilestoneCheckers(game, config) {
        return withEventConditions(config.milestones).map(m => makeMilestoneChecker(game, m));
    }
    function trackMilestones(game, config) {
        const currentRunStats = loadLatestRun() ?? makeNewRunStats(game);
        let checkers = makeMilestoneCheckers(game, config);
        config.on("*", () => {
            checkers = makeMilestoneCheckers(game, config);
        });
        game.onGameDay(day => {
            if (!config.recordRuns) {
                return;
            }
            currentRunStats.totalDays = day;
            updateAdditionalInfo(currentRunStats, game);
            updateMilestones(currentRunStats, checkers);
            saveCurrentRun(currentRunStats);
        });
        return currentRunStats;
    }

    class HistoryManager extends Subscribable {
        game;
        config;
        history;
        milestones;
        constructor(game, config, history) {
            super();
            this.game = game;
            this.config = config;
            this.history = history;
            this.milestones = rotateMap(history.milestones);
            this.on("*", () => {
                saveHistory(this.history);
            });
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
                this.emit("updated", this);
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
            this.emit("updated", this);
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

        .crossed {
            text-decoration: line-through;
        }

        .flex-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
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

        .sortable-placeholder {
            position: relative;
            height: 1rem;
            width: 100px;
            margin-right: 1.5em;
            background: #1d2021;
        }

        li[role="tab"].is-disabled {
            display: none !important;
        }

        #settings.slide-prev-leave-to {
            position: absolute !important;
        }

        #settings.slide-next-leave-to {
            position: absolute !important;
        }

        #settings.slide-prev-enter {
            position: absolute !important;
        }

        #settings.slide-next-enter {
            position: absolute !important;
        }

        #mainColumn {
            overflow: hidden;
        }
    `;

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

    function makeFlexContainer(direction) {
        return $(`<div class="flex-container" style="flex-direction: ${direction};"></div>`);
    }

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
    async function nextAnimationFrame() {
        return new Promise((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
            });
        });
    }
    function lastChild(node) {
        const children = node.children();
        const length = children.length;
        return children[length - 1];
    }

    async function addTab(name, factory) {
        const tabID = `mTab${name}`;
        const tabs = (await waitFor(`div#mainTabs`))[0].__vue__;
        $("#mainTabs > .tab-content").append(`
        <b-tab-item label="${name}">
            <div id="${tabID}"></div>
        </b-tab-item>
    `);
        const tab = new Vue({
            el: "#mainTabs > .tab-content > :last-child",
            provide() {
                // BTabItem requires being compiled inside a BTabs component
                // It verifies this by injecting the parent via the btab prop - mock this dependency manually
                return { btab: tabs };
            },
            mounted() {
                // Without this, the tabs component doesn't track the state properly
                tabs.$slots.default.push(this.$children[0].$vnode);
            }
        });
        // For some reason, pushing a vnode to tabs.$slots causes the template to be compiled and mounted twice
        // Ignore consecutive inserts with of the same node
        const original = tabs._registerItem;
        tabs._registerItem = (item) => {
            if (item.$options.propsData.label !== name) {
                original(item);
            }
        };
        // tab.$children[0].index is not initialized yet
        Vue.nextTick(() => {
            const tabIndex = tab.$children[0].index;
            let initialized = false;
            tabs.$on("input", (idx) => {
                if (idx === tabIndex && !initialized) {
                    $(`#${tabID}`).append(factory());
                    initialized = true;
                }
            });
        });
        // Vanilla evolve does `global.settings.civTabs = $(`#mainTabs > nav ul li`).length - 1`
        // Replace the button with the mock click handler that assigns the correct tab index
        const observationButtons = await waitFor("button.observe");
        const text = observationButtons.first().text();
        const mockButton = $(`<button class="button observe right">${text}</button>`);
        mockButton.on("click", () => {
            $("#mainColumn div:first-child")[0].__vue__.s.civTabs = 8;
        });
        observationButtons.replaceWith(mockButton);
    }

    function makeSelect(options, defaultValue) {
        const optionNodes = options.map(([value, label]) => {
            return `<option value="${value}" ${value === defaultValue ? "selected" : ""}>${label}</option>`;
        });
        return $(`
        <select style="width: auto">
            ${optionNodes}
        </select>
    `);
    }
    function toAutocompleteOptions(map) {
        return Object.entries(map).map(([id, name]) => ({ value: id, label: name }));
    }
    function makeAutocompleteInput(placeholder, options) {
        const entries = toAutocompleteOptions(options);
        function onChange(event, ui) {
            // If it wasn't selected from list
            if (ui.item === null) {
                const item = entries.find(({ label }) => label === this.value);
                if (item !== undefined) {
                    ui.item = item;
                }
            }
            if (ui.item !== null) {
                // Replace the input contents with the label and keep the value somewhere
                this.value = ui.item.label;
                this._value = ui.item.value;
            }
            else {
                // Keep the input contents as the user typed it and discard the previous value
                this._value = undefined;
            }
            return false;
        }
        return $(`<input style="width: 200px" placeholder="${placeholder}"></input>`).autocomplete({
            source: entries,
            minLength: 2,
            delay: 0,
            select: onChange, // Dropdown list click
            focus: onChange, // Arrow keys press
            change: onChange, // Keyboard type
            classes: {
                "ui-autocomplete": "bg-dark w-fit"
            }
        });
    }
    function makeSlimButton(text) {
        return $(`<button class="button" style="height: 22px">${text}</button>`);
    }
    function makeNumberInput(placeholder, defaultValue, range) {
        const node = $(`<input style="width: 60px" type="number" placeholder="${placeholder}">`);
        if (defaultValue !== undefined) {
            node.attr("value", defaultValue);
        }
        if (range !== undefined) {
            node.attr("min", range[0]);
            node.attr("max", range[1]);
        }
        else {
            node.attr("min", 1);
        }
        return node;
    }
    function makeCheckbox(label, initialState, onStateChange) {
        const node = $(`
        <label>
            <input type="checkbox" ${initialState ? "checked" : ""}>
            ${label}
        </label>
    `);
        node.find("input").on("change", function () {
            onStateChange(this.checked);
        });
        return node;
    }
    function makeToggle(label, initialState, onStateChange) {
        const node = $(`
        <label class="switch setting is-rounded">
            <input type="checkbox" ${initialState ? "checked" : ""}>
            <span class="check"></span>
            <span class="control-label">
                <span aria-label="${label}">${label}</span>
            </span>
        </label>
    `);
        node.find("input").on("change", function () {
            onStateChange(this.checked);
        });
        return node;
    }
    function makeSlider([min, max], initialState, onStateChange) {
        const node = $(`
        <input type="range" min="${min}" max="${max}" value="${initialState}">
    `);
        node.on("input", function () {
            onStateChange(Number(this.value));
        });
        return node;
    }
    function makeToggleableNumberInput(label, placeholder, state) {
        const inputNode = makeNumberInput(placeholder, state.value)
            .on("change", function () { state.value = this.value === "" ? undefined : Number(this.value); });
        const toggleNode = makeCheckbox(label, state.enabled, value => {
            inputNode.prop("disabled", !value);
            state.enabled = value;
        });
        inputNode.prop("disabled", !state.enabled);
        return $(`<div></div>`)
            .append(toggleNode)
            .append(inputNode);
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
    function attachColorPickerTrigger(trigger, target) {
        target.parent().css("position", "relative");
        trigger.insertAfter(target);
    }
    const colorPickerCache = {};
    function makeColorPicker(target, overflow, defaultColor, callbacks) {
        let pickr;
        let trigger;
        // The Pickr instances are not destroyd on redraws, which leads to memory leaks
        // Reuse existing ones instead
        const cacheKey = `${target.attr("data-view")}/${target.attr("data-milestone")}`;
        if (cacheKey in colorPickerCache) {
            [pickr, trigger] = colorPickerCache[cacheKey];
            pickr.setColor(defaultColor, true);
            // The instance has callbacks from previous instantiation, clear them
            pickr._eventListener.hide = [];
            pickr._eventListener.save = [];
            pickr._eventListener.change = [];
        }
        else {
            trigger = makeColorPickerTrigger(target, overflow);
            pickr = new Pickr({
                container: "#mTabAnalytics",
                el: trigger[0],
                useAsButton: true,
                position: "top-middle",
                theme: "classic",
                appClass: "color-picker",
                lockOpacity: true,
                default: defaultColor,
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
            colorPickerCache[cacheKey] = [pickr, trigger];
        }
        pickr.on("hide", (instance) => {
            if (instance.getColor().toHEXA().toString() !== callbacks.currentColor()) {
                instance.setColor(defaultColor);
                callbacks.onCancel();
            }
        });
        pickr.on("save", (value, instance) => {
            const hex = value?.toHEXA().toString();
            if (hex !== undefined) {
                callbacks.onSave(hex);
            }
            instance.hide();
        });
        pickr.on("change", (value) => {
            callbacks.onChange(value.toHEXA().toString());
        });
        attachColorPickerTrigger(trigger, target);
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
                const container = $(`#analytics-view-${view.id()}`);
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
                const container = $(`#analytics-view-${view.id()}`);
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
        if (pendingDraggingLegend.has(view)) {
            $(plot).find("> div").replaceWith(pendingDraggingLegend.get(view));
        }
        else {
            $(plot).find("> div > span").each(function () {
                const svgNode = $(this).find("> svg");
                const milestone = milestones[$(this).index() - 1];
                const milestoneName = milestoneNames[$(this).index() - 1];
                const defaultColor = svgNode.attr("fill");
                // Metadata
                svgNode
                    .attr("data-view", view.index())
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
            $(plot).find("> div").sortable({
                placeholder: "sortable-placeholder",
                start: function () {
                    pendingDraggingLegend.set(view, $(plot).find("> div"));
                },
                stop: function (_, { item }) {
                    pendingDraggingLegend.delete(view);
                    const milestone = item.find("> svg").attr("data-milestone");
                    view.moveMilestone(milestone, item.index() - 1);
                }
            });
        }
        $(plot).find("> svg").attr("width", "100%");
        $(plot).css("margin", "0");
        return plot;
    }

    function makeSetting(label, inputNode) {
        return $(`<div>`).append(`<span style="margin-right: 8px">${label}</span>`).append(inputNode);
    }
    function makeUniverseFilter(value) {
        if (value === "any") {
            return undefined;
        }
        else {
            return value;
        }
    }
    function makeViewSettings(view) {
        const propertyListeners = {};
        function onPropertyChange(props, handler) {
            for (const prop of props) {
                const handlers = propertyListeners[prop] ??= [];
                handlers.push(handler);
            }
            handler();
        }
        function setValue(key, value) {
            switch (key) {
                case "universe":
                    view.universe = makeUniverseFilter(value);
                    break;
                case "daysScale":
                case "starLevel":
                    view[key] = value === "" ? undefined : Number(value);
                    break;
                default:
                    view[key] = value;
                    break;
            }
            propertyListeners[key]?.forEach(f => f());
        }
        const bindThis = (property) => {
            return function () { setValue(property, this.value); };
        };
        const bind = (property) => {
            return (value) => setValue(property, value);
        };
        const resetTypeInput = makeSelect(Object.entries(resets), view.resetType)
            .on("change", bindThis("resetType"));
        const universeInput = makeSelect([["any", "Any"], ...Object.entries(universes)], view.universe ?? "any")
            .on("change", bindThis("universe"));
        const starLevelInput = makeNumberInput("Any", view.starLevel, [0, 4])
            .on("change", bindThis("starLevel"));
        let skipRunsInput = $();
        let numRunsInput = $();
        const modeInput = makeSelect(Object.entries(viewModes), view.mode)
            .on("change", bindThis("mode"));
        const showBarsToggle = makeCheckbox("Bars", view.showBars, bind("showBars"));
        const showLinesToggle = makeCheckbox("Lines", view.showLines, bind("showLines"));
        const fillAreaToggle = makeCheckbox("Fill area", view.fillArea, bind("fillArea"));
        const avgWindowSlider = makeSetting("Smoothness", makeSlider([0, 100], view.smoothness, bind("smoothness")));
        const daysScaleInput = makeNumberInput("Auto", view.daysScale)
            .on("change", bindThis("daysScale"));
        onPropertyChange(["universe"], () => {
            const resetName = view.universe === "magic" ? "Vacuum Collapse" : "Black Hole";
            resetTypeInput.find(`> option[value="blackhole"]`).text(resetName);
        });
        onPropertyChange(["showLines", "mode"], () => {
            showBarsToggle.toggle(view.mode === "timestamp");
            showLinesToggle.toggle(view.mode === "timestamp");
            fillAreaToggle.toggle(view.showLines && view.mode === "timestamp");
            avgWindowSlider.toggle((view.showLines && view.mode === "timestamp") || view.mode === "duration");
        });
        const filterSettings = makeFlexContainer("row")
            .append(makeSetting("Reset type", resetTypeInput))
            .append(makeSetting("Universe", universeInput))
            .append(makeSetting("Star level", starLevelInput));
        const rangeSettings = makeFlexContainer("row")
            .append(skipRunsInput)
            .append(numRunsInput);
        const selectionSettings = makeFlexContainer("row")
            .append(filterSettings)
            .append(rangeSettings);
        const displaySettings = makeFlexContainer("row")
            .append(makeSetting("Mode", modeInput))
            .append(makeSetting("Days scale", daysScaleInput))
            .append(showBarsToggle)
            .append(showLinesToggle)
            .append(fillAreaToggle)
            .append(avgWindowSlider);
        const container = makeFlexContainer("column")
            .addClass("analytics-view-settings")
            .css("margin-bottom", "1em");
        container
            .append(selectionSettings)
            .append(displaySettings);
        function replaceLimitInputs(view) {
            skipRunsInput.remove();
            numRunsInput.remove();
            rangeSettings.append(skipRunsInput = makeToggleableNumberInput("Ignore first N runs", "None", view.skipRuns));
            rangeSettings.append(numRunsInput = makeToggleableNumberInput("Show last N runs", "All", view.numRuns));
        }
        replaceLimitInputs(view);
        view.on("updated", replaceLimitInputs);
        return container;
    }

    function makeMilestoneSettings(view, history) {
        const builtTargetOptions = makeAutocompleteInput("Building/Project", buildings);
        const buildCountOption = makeNumberInput("Count", 1);
        const researchedTargetOptions = makeAutocompleteInput("Tech", techs);
        const eventTargetOptions = makeSelect(Object.entries(events));
        const effectTargetOptions = makeSelect(Object.entries(environmentEffects));
        function selectOptions(type) {
            builtTargetOptions.toggle(type === "built");
            buildCountOption.toggle(type === "built");
            researchedTargetOptions.toggle(type === "tech");
            eventTargetOptions.toggle(type === "event");
            effectTargetOptions.toggle(type === "effect");
        }
        // Default form state
        selectOptions("built");
        const typeOptions = makeSelect(Object.entries(milestoneTypes))
            .on("change", function () { selectOptions(this.value); });
        function makeMilestone() {
            switch (typeOptions.val()) {
                case "built":
                    if (builtTargetOptions[0]._value !== undefined) {
                        return `built:${builtTargetOptions[0]._value}:${buildCountOption.val()}`;
                    }
                    break;
                case "tech":
                    if (researchedTargetOptions[0]._value !== undefined) {
                        return `tech:${researchedTargetOptions[0]._value}`;
                    }
                    break;
                case "event":
                    return `event:${eventTargetOptions.val()}`;
                case "effect":
                    return `effect:${effectTargetOptions.val()}`;
            }
        }
        const addMilestoneNode = makeSlimButton("Add").on("click", () => {
            const milestone = makeMilestone();
            if (milestone !== undefined) {
                view.addMilestone(milestone);
            }
        });
        const removeMilestoneNode = makeSlimButton("Remove").on("click", () => {
            const milestone = makeMilestone();
            if (milestone !== undefined) {
                view.removeMilestone(milestone);
            }
        });
        const reorderMilestonesNode = makeSlimButton("Auto sort").on("click", () => {
            view.sortMilestones(history);
        });
        const recolorMilestonesNode = makeSlimButton("Reset colors").on("click", () => {
            view.resetColors();
        });
        const container = makeFlexContainer("row")
            .css("margin-bottom", "1em");
        container
            .append(typeOptions)
            .append(builtTargetOptions)
            .append(buildCountOption)
            .append(researchedTargetOptions)
            .append(eventTargetOptions)
            .append(effectTargetOptions)
            .append(addMilestoneNode)
            .append(removeMilestoneNode)
            .append(reorderMilestonesNode)
            .append(recolorMilestonesNode);
        return container;
    }

    function makeAdditionalInfoSettings(view) {
        const container = makeFlexContainer("row")
            .css("margin-bottom", "1em");
        container.append(`<span>Additional info:</span>`);
        const showCurrentRunToggle = makeCheckbox("Current run", view.includeCurrentRun ?? false, (value) => {
            view.includeCurrentRun = value;
        });
        container.append(showCurrentRunToggle);
        for (const [key, value] of Object.entries(additionalInformation)) {
            const enabled = view.additionalInfo.includes(key);
            container.append(makeCheckbox(value, enabled, () => { view.toggleAdditionalInfo(key); }));
        }
        return container;
    }

    async function withCSSOverrides(overrides, callback) {
        const overridesList = [];
        for (const [query, props] of Object.entries(overrides)) {
            const nodes = $(query);
            for (const [rule, value] of Object.entries(props)) {
                for (const node of nodes) {
                    overridesList.push({ node, rule, original: node.style[rule], override: value });
                }
            }
        }
        for (const { node, rule, override } of overridesList) {
            $(node).css(rule, override);
        }
        const result = await callback();
        for (const { node, rule, original } of overridesList) {
            $(node).css(rule, original);
        }
        return result;
    }
    async function copyToClipboard(node) {
        const isParent = (element) => element.contains(node[0]);
        const isChild = (element) => node[0].contains(element);
        const width = Math.round(node.width() + 10);
        const height = Math.round(node.height() + 10);
        const cssOverrides = {
            "html": { width: `${width}px`, height: `${height}px` },
            "#mainColumn": { width: "100%" },
            ".vscroll": { height: "100%" },
            ".tab-item": { padding: "0" }
        };
        const blob = await withCSSOverrides(cssOverrides, () => {
            return htmlToImage.toBlob($("html")[0], {
                width,
                height,
                skipFonts: true,
                filter: element => isParent(element) || isChild(element)
            });
        });
        await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob })
        ]);
    }
    function viewTitle(view) {
        if (view.universe === "magic" && view.resetType === "blackhole") {
            return "Vacuum Collapse";
        }
        else {
            let title = resets[view.resetType];
            if (view.universe !== undefined) {
                title += ` (${universes[view.universe]})`;
            }
            return title;
        }
    }
    function makeViewTab(game, view, config, history, currentRun) {
        const id = `analytics-view-${view.id()}`;
        const controlNode = $(`<li><a href="#${id}">${viewTitle(view)}</a></li>`);
        const contentNode = $(`<div id="${id}" class="vscroll" style="height: calc(100vh - 10rem)"></div>`);
        const removeViewNode = $(`<button class="button">Delete view</button>`)
            .on("click", () => { config.removeView(view); });
        let selectedRun = null;
        const ignoreRunsNode = $(`<button class="button">Ignore previous runs</button>`)
            .on("click", () => {
            const filteredRuns = applyFilters(history, view, { useLimits: false });
            const idx = filteredRuns.indexOf(selectedRun);
            view.skipRuns = { enabled: true, value: idx };
        })
            .attr("disabled", "");
        const discardRunNode = $(`<button class="button">Discard run</button>`)
            .on("click", () => { history.discardRun(selectedRun); })
            .attr("disabled", "");
        function onRunSelection(run) {
            selectedRun = run;
            if (selectedRun === null) {
                discardRunNode.attr("disabled", "");
                ignoreRunsNode.attr("disabled", "");
            }
            else {
                discardRunNode.attr("disabled", null);
                ignoreRunsNode.attr("disabled", null);
            }
        }
        function createGraph(view) {
            return makeGraph(history, view, game, currentRun, onRunSelection);
        }
        const asImageNode = $(`<button class="button">Copy as PNG</button>`)
            .on("click", async function () {
            $(this).text("Rendering...");
            // For some reason awaiting htmlToImage.toBlob prevents UI from updating
            await nextAnimationFrame();
            const figure = contentNode.find("> figure");
            await copyToClipboard(figure);
            $(this).text("Copy as PNG");
        });
        const buttonsContainerNode = $(`<div style="display: flex; justify-content: space-between"></div>`)
            .append(asImageNode)
            .append(ignoreRunsNode)
            .append(discardRunNode)
            .append(removeViewNode);
        contentNode
            .append(makeViewSettings(view))
            .append(makeAdditionalInfoSettings(view))
            .append(makeMilestoneSettings(view, history))
            .append(createGraph(view))
            .append(buttonsContainerNode);
        function redrawGraph(updatedView) {
            contentNode.find("figure:last").replaceWith(createGraph(updatedView));
        }
        view.on("updated", (updatedView) => {
            controlNode.find("> a").text(viewTitle(updatedView));
            discardCachedState(updatedView);
            redrawGraph(updatedView);
            onRunSelection(null);
        });
        history.on("updated", () => {
            discardCachedState(view);
            redrawGraph(view);
            onRunSelection(null);
        });
        game.onGameDay(() => {
            if (!config.recordRuns) {
                return;
            }
            if (!view.includeCurrentRun) {
                return;
            }
            if (view !== config.openView) {
                return;
            }
            if (view.mode === "records") {
                return;
            }
            redrawGraph(view);
        });
        return [controlNode, contentNode];
    }

    function makeAnalyticsTab(game, config, history, currentRun) {
        const analyticsPanel = $(`
        <div>
            <nav class="tabs">
                <ul role="tablist" class="hscroll" style="margin-left: 0; width: 100%">
                    <li><a id="analytics-add-view" role="button">+ Add View</a></li>
                </ul>
            </nav>
        </div>
    `);
        analyticsPanel.tabs({
            classes: {
                "ui-tabs-active": "is-active"
            }
        });
        analyticsPanel.find("#analytics-add-view").on("click", function () {
            config.addView();
        });
        function addViewTab(view) {
            const [controlNode, contentNode] = makeViewTab(game, view, config, history, currentRun);
            controlNode.on("click", () => {
                config.viewOpened(view);
            });
            function refresh() {
                analyticsPanel.tabs("refresh");
                analyticsPanel.tabs({ active: config.openViewIndex ?? 0 });
            }
            controlNode.insertBefore(lastChild(analyticsPanel.find("> nav > ul")));
            analyticsPanel.append(contentNode);
            refresh();
            config.on("viewRemoved", (removedView) => {
                if (removedView !== view) {
                    return;
                }
                controlNode.remove();
                contentNode.remove();
                refresh();
            });
        }
        config.on("viewAdded", addViewTab);
        for (const view of config.views) {
            addViewTab(view);
        }
        analyticsPanel.tabs({
            active: config.openViewIndex ?? 0
        });
        return analyticsPanel;
    }

    async function addMainToggle(config) {
        await waitFor("#settings");
        const toggleNode = makeToggle("Record Runs", config.recordRuns, (checked) => { config.recordRuns = checked; });
        toggleNode.insertAfter("#settings > .switch.setting:last");
    }
    function bootstrapUIComponents(game, config, history, currentRun) {
        $("head").append(`<style type="text/css">${styles}</style>`);
        addMainToggle(config);
        addTab("Analytics", () => makeAnalyticsTab(game, config, history, currentRun));
    }

    migrate();
    const evolve = await( synchronize());
    const game = new Game(evolve);
    if (game.finishedEvolution) {
        const config = getConfig(game);
        const history = initializeHistory(game, config);
        processLatestRun(game, config, history);
        const currentRun = trackMilestones(game, config);
        bootstrapUIComponents(game, config, history, currentRun);
    }

})();

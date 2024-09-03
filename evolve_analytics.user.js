// ==UserScript==
// @name         Evolve Analytics
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Track and see detailed information about your runs
// @author       Sneed
// @match        https://pmotschmann.github.io/Evolve/
// @require      https://cdn.jsdelivr.net/npm/d3@7
// @require      https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6
// @require      https://code.jquery.com/jquery-3.7.1.min.js
// @require      https://code.jquery.com/ui/1.12.1/jquery-ui.min.js
// @grant        none
// ==/UserScript==

/*global evolve $ Plot*/

(async function() {
    "use strict";

    /*----------------------------------------------------------------------------*
     *                                   Domain                                   *
     *----------------------------------------------------------------------------*/

    const buildings = [
        ["city", "food", "Gather Food"],
        ["city", "lumber", "Gather Lumber"],
        ["city", "stone", "Gather Stone"],
        ["city", "chrysotile", "Gather Chrysotile"],
        ["city", "slaughter", "Slaughter the Weak"],
        ["city", "horseshoe", "Horseshoe"],
        ["city", "slave_market", "Slave Market"],
        ["city", "s_alter", "Sacrificial Altar"],
        ["city", "basic_housing", "Cabin"],
        ["city", "cottage", "Cottage"],
        ["city", "apartment", "Apartment"],
        ["city", "lodge", "Lodge"],
        ["city", "smokehouse", "Smokehouse"],
        ["city", "soul_well", "Soul Well"],
        ["city", "slave_pen", "Slave Pen"],
        ["city", "transmitter", "Transmitter"],
        ["city", "captive_housing", "Captive Housing"],
        ["city", "farm", "Farm"],
        ["city", "compost", "Compost Heap"],
        ["city", "mill", "Windmill"],
        ["city", "windmill", "Windmill (Evil)"],
        ["city", "silo", "Grain Silo"],
        ["city", "assembly", "Assembly"],
        ["city", "garrison", "Barracks"],
        ["city", "hospital", "Hospital"],
        ["city", "boot_camp", "Boot Camp"],
        ["city", "shed", "Shed"],
        ["city", "storage_yard", "Freight Yard"],
        ["city", "warehouse", "Container Port"],
        ["city", "bank", "Bank"],
        ["city", "pylon", "Pylon"],
        ["city", "graveyard", "Graveyard"],
        ["city", "conceal_ward", "Conceal Ward (Witch Hunting)"],
        ["city", "lumber_yard", "Lumber Yard"],
        ["city", "sawmill", "Sawmill"],
        ["city", "rock_quarry", "Rock Quarry"],
        ["city", "cement_plant", "Cement Plant"],
        ["city", "foundry", "Foundry"],
        ["city", "factory", "Factory"],
        ["city", "nanite_factory", "Nanite Factory"],
        ["city", "smelter", "Smelter"],
        ["city", "metal_refinery", "Metal Refinery"],
        ["city", "mine", "Mine"],
        ["city", "coal_mine", "Coal Mine"],
        ["city", "oil_well", "Oil Derrick"],
        ["city", "oil_depot", "Fuel Depot"],
        ["city", "trade", "Trade Post"],
        ["city", "wharf", "Wharf"],
        ["city", "tourist_center", "Tourist Center"],
        ["city", "amphitheatre", "Amphitheatre"],
        ["city", "casino", "Casino"],
        ["city", "temple", "Temple"],
        ["city", "shrine", "Shrine"],
        ["city", "meditation", "Meditation Chamber"],
        ["city", "banquet", "Banquet Hall"],
        ["city", "university", "University"],
        ["city", "library", "Library"],
        ["city", "wardenclyffe", "Wardenclyffe"],
        ["city", "biolab", "Bioscience Lab"],
        ["city", "coal_power", "Coal Powerplant"],
        ["city", "oil_power", "Oil Powerplant"],
        ["city", "fission_power", "Fission Reactor"],
        ["city", "mass_driver", "Mass Driver"],

        ["space", "test_launch", "Space Test Launch"],
        ["space", "satellite", "Space Satellite"],
        ["space", "gps", "Space Gps"],
        ["space", "propellant_depot", "Space Propellant Depot"],
        ["space", "nav_beacon", "Space Navigation Beacon"],

        ["space", "moon_mission", "Moon Mission"],
        ["space", "moon_base", "Moon Base"],
        ["space", "iridium_mine", "Moon Iridium Mine"],
        ["space", "helium_mine", "Moon Helium-3 Mine"],
        ["space", "observatory", "Moon Observatory"],

        ["space", "red_mission", "Red Mission"],
        ["space", "spaceport", "Red Spaceport"],
        ["space", "red_tower", "Red Space Control"],
        ["space", "captive_housing", "Red Captive Housing (Cataclysm)"],
        ["space", "terraformer", "Red Terraformer (Orbit Decay)"],
        ["space", "atmo_terraformer", "Red Terraformer (Orbit Decay, Complete)"],
        ["space", "terraform", "Red Terraform (Orbit Decay)"],
        ["space", "assembly", "Red Assembly (Cataclysm)"],
        ["space", "living_quarters", "Red Living Quarters"],
        ["space", "pylon", "Red Pylon (Cataclysm)"],
        ["space", "vr_center", "Red VR Center"],
        ["space", "garage", "Red Garage"],
        ["space", "red_mine", "Red Mine"],
        ["space", "fabrication", "Red Fabrication"],
        ["space", "red_factory", "Red Factory"],
        ["space", "nanite_factory", "Red Nanite Factory (Cataclysm)"],
        ["space", "biodome", "Red Biodome"],
        ["space", "red_university", "Red University (Orbit Decay)"],
        ["space", "exotic_lab", "Red Exotic Materials Lab"],
        ["space", "ziggurat", "Red Ziggurat"],
        ["space", "space_barracks", "Red Marine Barracks"],
        ["space", "horseshoe", "Red Horseshoe (Cataclysm)"],

        ["space", "hell_mission", "Hell Mission"],
        ["space", "geothermal", "Hell Geothermal Plant"],
        ["space", "hell_smelter", "Hell Smelter"],
        ["space", "spc_casino", "Hell Space Casino"],
        ["space", "swarm_plant", "Hell Swarm Plant"],

        ["space", "sun_mission", "Sun Mission"],
        ["space", "swarm_control", "Sun Control Station"],
        ["space", "swarm_satellite", "Sun Swarm Satellite"],
        ["space", "jump_gate", "Sun Jump Gate"],

        ["space", "gas_mission", "Gas Mission"],
        ["space", "gas_mining", "Gas Helium-3 Collector"],
        ["space", "gas_storage", "Gas Fuel Depot"],
        ["space", "star_dock", "Gas Space Dock"],
        ["space", "gas_moon_mission", "Gas Moon Mission"],
        ["space", "outpost", "Gas Moon Mining Outpost"],
        ["space", "drone", "Gas Moon Mining Drone"],
        ["space", "oil_extractor", "Gas Moon Oil Extractor"],

        ["starDock", "probes", "Space Dock Probe"],
        ["starDock", "geck", "Space Dock G.E.C.K."],
        ["starDock", "seeder", "Space Dock Bioseeder Ship"],
        ["starDock", "prep_ship", "Space Dock Prep Ship"],
        ["starDock", "launch_ship", "Space Dock Launch Ship"],

        ["space", "belt_mission", "Belt Mission"],
        ["space", "space_station", "Belt Space Station"],
        ["space", "elerium_ship", "Belt Elerium Mining Ship"],
        ["space", "iridium_ship", "Belt Iridium Mining Ship"],
        ["space", "iron_ship", "Belt Iron Mining Ship"],

        ["space", "dwarf_mission", "Dwarf Mission"],
        ["space", "elerium_contain", "Dwarf Elerium Storage"],
        ["space", "e_reactor", "Dwarf Elerium Reactor"],
        ["space", "world_collider", "Dwarf World Collider"],
        ["space", "world_controller", "Dwarf World Collider (Complete)"],
        ["space", "shipyard", "Dwarf Ship Yard"],
        ["space", "mass_relay", "Dwarf Mass Relay"],
        ["space", "m_relay", "Dwarf Mass Relay (Complete)"],

        ["space", "titan_mission", "Titan Mission"],
        ["space", "titan_spaceport", "Titan Spaceport"],
        ["space", "electrolysis", "Titan Electrolysis"],
        ["space", "hydrogen_plant", "Titan Hydrogen Plant"],
        ["space", "titan_quarters", "Titan Habitat"],
        ["space", "titan_mine", "Titan Mine"],
        ["space", "storehouse", "Titan Storehouse"],
        ["space", "titan_bank", "Titan Bank"],
        ["space", "g_factory", "Titan Graphene Plant"],
        ["space", "sam", "Titan SAM Site"],
        ["space", "decoder", "Titan Decoder"],
        ["space", "ai_core", "Titan AI Core"],
        ["space", "ai_core2", "Titan AI Core (Complete)"],
        ["space", "ai_colonist", "Titan AI Colonist"],
        ["space", "enceladus_mission", "Enceladus Mission"],
        ["space", "water_freighter", "Enceladus Water Freighter"],
        ["space", "zero_g_lab", "Enceladus Zero Gravity Lab"],
        ["space", "operating_base", "Enceladus Operational Base"],
        ["space", "munitions_depot", "Enceladus Munitions Depot"],
        ["space", "triton_mission", "Triton Mission"],
        ["space", "fob", "Triton Forward Base"],
        ["space", "lander", "Triton Troop Lander"],
        ["space", "crashed_ship", "Triton Derelict Ship"],
        ["space", "kuiper_mission", "Kuiper Mission"],
        ["space", "orichalcum_mine", "Kuiper Orichalcum Mine"],
        ["space", "uranium_mine", "Kuiper Uranium Mine"],
        ["space", "neutronium_mine", "Kuiper Neutronium Mine"],
        ["space", "elerium_mine", "Kuiper Elerium Mine"],
        ["space", "eris_mission", "Eris Mission"],
        ["space", "drone_control", "Eris Control Relay"],
        ["space", "shock_trooper", "Eris Android Trooper"],
        ["space", "tank", "Eris Tank"],
        ["space", "digsite", "Eris Digsite"],
        ["tauceti", "ringworld", "Tau Star Ringworld"],
        ["tauceti", "matrix", "Tau Star Matrix"],
        ["tauceti", "blue_pill", "Tau Star Blue Pill"],
        ["tauceti", "goe_facility", "Tau Star Garden of Eden"],

        ["tauceti", "home_mission", "Tau Mission"],
        ["tauceti", "dismantle", "Tau Dismantle Ship"],
        ["tauceti", "orbital_station", "Tau Orbital Station"],
        ["tauceti", "colony", "Tau Colony"],
        ["tauceti", "tau_housing", "Tau Housing"],
        ["tauceti", "captive_housing", "Tau Captive Housing"],
        ["tauceti", "pylon", "Tau Pylon"],
        ["tauceti", "cloning_facility", "Tau Cloning"],
        ["tauceti", "horseshoe", "Tau Horseshoe"],
        ["tauceti", "assembly", "Tau Assembly"],
        ["tauceti", "nanite_factory", "Tau Nanite Factory"],
        ["tauceti", "tau_farm", "Tau High-Tech Farm"],
        ["tauceti", "mining_pit", "Tau Mining Pit"],
        ["tauceti", "excavate", "Tau Excavate"],
        ["tauceti", "alien_outpost", "Tau Alien Outpost"],
        ["tauceti", "jump_gate", "Tau Jump Gate"],
        ["tauceti", "fusion_generator", "Tau Fusion Generator"],
        ["tauceti", "repository", "Tau Repository"],
        ["tauceti", "tau_factory", "Tau High-Tech Factory"],
        ["tauceti", "infectious_disease_lab", "Tau Disease Lab"],
        ["tauceti", "tauceti_casino", "Tau Casino"],
        ["tauceti", "tau_cultural_center", "Tau Cultural Center"],

        ["tauceti", "red_mission", "Tau Red Mission"],
        ["tauceti", "orbital_platform", "Tau Red Orbital Platform"],
        ["tauceti", "contact", "Tau Red Contact"],
        ["tauceti", "introduce", "Tau Red Introduce"],
        ["tauceti", "subjugate", "Tau Red Subjugate"],
        ["tauceti", "jeff", "Tau Red Jeff"],
        ["tauceti", "overseer", "Tau Red Overseer"],
        ["tauceti", "womling_village", "Tau Red Womling Village"],
        ["tauceti", "womling_farm", "Tau Red Womling Farm"],
        ["tauceti", "womling_mine", "Tau Red Womling Mine"],
        ["tauceti", "womling_fun", "Tau Red Womling Theater"],
        ["tauceti", "womling_lab", "Tau Red Womling Lab"],

        ["tauceti", "gas_contest", "Tau Gas Naming Contest"],
        ["tauceti", "gas_contest-a1", "Tau Gas Name 1"],
        ["tauceti", "gas_contest-a2", "Tau Gas Name 2"],
        ["tauceti", "gas_contest-a3", "Tau Gas Name 3"],
        ["tauceti", "gas_contest-a4", "Tau Gas Name 4"],
        ["tauceti", "gas_contest-a5", "Tau Gas Name 5"],
        ["tauceti", "gas_contest-a6", "Tau Gas Name 6"],
        ["tauceti", "gas_contest-a7", "Tau Gas Name 7"],
        ["tauceti", "gas_contest-a8", "Tau Gas Name 8"],
        ["tauceti", "refueling_station", "Tau Gas Refueling Station"],
        ["tauceti", "ore_refinery", "Tau Gas Ore Refinery"],
        ["tauceti", "whaling_station", "Tau Gas Whale Processor"],
        ["tauceti", "womling_station", "Tau Gas Womling Station"],

        ["tauceti", "roid_mission", "Tau Belt Mission"],
        ["tauceti", "patrol_ship", "Tau Belt Patrol Ship"],
        ["tauceti", "mining_ship", "Tau Belt Extractor Ship"],
        ["tauceti", "whaling_ship", "Tau Belt Whaling Ship"],

        ["tauceti", "gas_contest2", "Tau Gas 2 Naming Contest"],
        ["tauceti", "gas_contest-b1", "Tau Gas 2 Name 1"],
        ["tauceti", "gas_contest-b2", "Tau Gas 2 Name 2"],
        ["tauceti", "gas_contest-b3", "Tau Gas 2 Name 3"],
        ["tauceti", "gas_contest-b4", "Tau Gas 2 Name 4"],
        ["tauceti", "gas_contest-b5", "Tau Gas 2 Name 5"],
        ["tauceti", "gas_contest-b6", "Tau Gas 2 Name 6"],
        ["tauceti", "gas_contest-b7", "Tau Gas 2 Name 7"],
        ["tauceti", "gas_contest-b8", "Tau Gas 2 Name 8"],
        ["tauceti", "alien_station_survey", "Tau Gas 2 Alien Station (Survey)"],
        ["tauceti", "alien_station", "Tau Gas 2 Alien Station"],
        ["tauceti", "alien_space_station", "Tau Gas 2 Alien Space Station"],
        ["tauceti", "matrioshka_brain", "Tau Gas 2 Matrioshka Brain"],
        ["tauceti", "ignition_device", "Tau Gas 2 Ignition Device"],
        ["tauceti", "ignite_gas_giant", "Tau Gas 2 Ignite Gas Giant"],

        ["interstellar", "alpha_mission", "Alpha Centauri Mission"],
        ["interstellar", "starport", "Alpha Starport"],
        ["interstellar", "habitat", "Alpha Habitat"],
        ["interstellar", "mining_droid", "Alpha Mining Droid"],
        ["interstellar", "processing", "Alpha Processing Facility"],
        ["interstellar", "fusion", "Alpha Fusion Reactor"],
        ["interstellar", "laboratory", "Alpha Laboratory"],
        ["interstellar", "exchange", "Alpha Exchange"],
        ["interstellar", "g_factory", "Alpha Graphene Plant"],
        ["interstellar", "warehouse", "Alpha Warehouse"],
        ["interstellar", "int_factory", "Alpha Mega Factory"],
        ["interstellar", "luxury_condo", "Alpha Luxury Condo"],
        ["interstellar", "zoo", "Alpha Exotic Zoo"],

        ["interstellar", "proxima_mission", "Proxima Mission"],
        ["interstellar", "xfer_station", "Proxima Transfer Station"],
        ["interstellar", "cargo_yard", "Proxima Cargo Yard"],
        ["interstellar", "cruiser", "Proxima Patrol Cruiser"],
        ["interstellar", "dyson", "Proxima Dyson Sphere (Adamantite)"],
        ["interstellar", "dyson_sphere", "Proxima Dyson Sphere (Bolognium)"],
        ["interstellar", "orichalcum_sphere", "Proxima Dyson Sphere (Orichalcum)"],

        ["interstellar", "nebula_mission", "Nebula Mission"],
        ["interstellar", "nexus", "Nebula Nexus"],
        ["interstellar", "harvester", "Nebula Harvester"],
        ["interstellar", "elerium_prospector", "Nebula Elerium Prospector"],

        ["interstellar", "neutron_mission", "Neutron Mission"],
        ["interstellar", "neutron_miner", "Neutron Miner"],
        ["interstellar", "citadel", "Neutron Citadel Station"],
        ["interstellar", "stellar_forge", "Neutron Stellar Forge"],

        ["interstellar", "blackhole_mission", "Blackhole Mission"],
        ["interstellar", "far_reach", "Blackhole Farpoint"],
        ["interstellar", "stellar_engine", "Blackhole Stellar Engine"],
        ["interstellar", "mass_ejector", "Blackhole Mass Ejector"],

        ["interstellar", "jump_ship", "Blackhole Jump Ship"],
        ["interstellar", "wormhole_mission", "Blackhole Wormhole Mission"],
        ["interstellar", "stargate", "Blackhole Stargate"],
        ["interstellar", "s_gate", "Blackhole Stargate (Complete)"],

        ["interstellar", "sirius_mission", "Sirius Mission"],
        ["interstellar", "sirius_b", "Sirius B Analysis"],
        ["interstellar", "space_elevator", "Sirius Space Elevator"],
        ["interstellar", "gravity_dome", "Sirius Gravity Dome"],
        ["interstellar", "ascension_machine", "Sirius Ascension Machine"],
        ["interstellar", "ascension_trigger", "Sirius Ascension Machine (Complete)"],
        ["interstellar", "ascend", "Sirius Ascend"],
        ["interstellar", "thermal_collector", "Sirius Thermal Collector"],

        ["galaxy", "gateway_mission", "Gateway Mission"],
        ["galaxy", "starbase", "Gateway Starbase"],
        ["galaxy", "ship_dock", "Gateway Ship Dock"],

        ["galaxy", "bolognium_ship", "Gateway Bolognium Ship"],
        ["galaxy", "scout_ship", "Gateway Scout Ship"],
        ["galaxy", "corvette_ship", "Gateway Corvette Ship"],
        ["galaxy", "frigate_ship", "Gateway Frigate Ship"],
        ["galaxy", "cruiser_ship", "Gateway Cruiser Ship"],
        ["galaxy", "dreadnought", "Gateway Dreadnought"],

        ["galaxy", "gateway_station", "Stargate Station"],
        ["galaxy", "telemetry_beacon", "Stargate Telemetry Beacon"],
        ["galaxy", "gateway_depot", "Stargate Depot"],
        ["galaxy", "defense_platform", "Stargate Defense Platform"],

        ["galaxy", "gorddon_mission", "Gorddon Mission"],
        ["galaxy", "embassy", "Gorddon Embassy"],
        ["galaxy", "dormitory", "Gorddon Dormitory"],
        ["galaxy", "symposium", "Gorddon Symposium"],
        ["galaxy", "freighter", "Gorddon Freighter"],

        ["galaxy", "consulate", "Alien 1 Consulate"],
        ["galaxy", "resort", "Alien 1 Resort"],
        ["galaxy", "vitreloy_plant", "Alien 1 Vitreloy Plant"],
        ["galaxy", "super_freighter", "Alien 1 Super Freighter"],

        ["galaxy", "alien2_mission", "Alien 2 Mission"],
        ["galaxy", "foothold", "Alien 2 Foothold"],
        ["galaxy", "armed_miner", "Alien 2 Armed Miner"],
        ["galaxy", "ore_processor", "Alien 2 Ore Processor"],
        ["galaxy", "scavenger", "Alien 2 Scavenger"],

        ["galaxy", "chthonian_mission", "Chthonian Mission"],
        ["galaxy", "minelayer", "Chthonian Mine Layer"],
        ["galaxy", "excavator", "Chthonian Excavator"],
        ["galaxy", "raider", "Chthonian Corsair"],

        ["portal", "turret", "Portal Laser Turret"],
        ["portal", "carport", "Portal Surveyor Carport"],
        ["portal", "war_droid", "Portal War Droid"],
        ["portal", "repair_droid", "Portal Repair Droid"],

        ["portal", "war_drone", "Badlands Predator Drone"],
        ["portal", "sensor_drone", "Badlands Sensor Drone"],
        ["portal", "attractor", "Badlands Attractor Beacon"],

        ["portal", "pit_mission", "Pit Mission"],
        ["portal", "assault_forge", "Pit Assault Forge"],
        ["portal", "soul_forge", "Pit Soul Forge"],
        ["portal", "gun_emplacement", "Pit Gun Emplacement"],
        ["portal", "soul_attractor", "Pit Soul Attractor"],
        ["portal", "soul_capacitor", "Pit Soul Capacitor (Witch Hunting)"],
        ["portal", "absorption_chamber", "Pit Absorption Chamber (Witch Hunting)"],

        ["portal", "ruins_mission", "Ruins Mission"],
        ["portal", "guard_post", "Ruins Guard Post"],
        ["portal", "vault", "Ruins Vault"],
        ["portal", "archaeology", "Ruins Archaeology"],
        ["portal", "arcology", "Ruins Arcology"],
        ["portal", "hell_forge", "Ruins Infernal Forge"],
        ["portal", "inferno_power", "Ruins Inferno Reactor"],
        ["portal", "ancient_pillars", "Ruins Ancient Pillars"],

        ["portal", "gate_mission", "Gate Mission"],
        ["portal", "east_tower", "Gate East Tower"],
        ["portal", "west_tower", "Gate West Tower"],
        ["portal", "gate_turret", "Gate Turret"],
        ["portal", "infernite_mine", "Gate Infernite Mine"],

        ["portal", "lake_mission", "Lake Mission"],
        ["portal", "harbour", "Lake Harbour"],
        ["portal", "cooling_tower", "Lake Cooling Tower"],
        ["portal", "bireme", "Lake Bireme Warship"],
        ["portal", "transport", "Lake Transport"],

        ["portal", "spire_mission", "Spire Mission"],
        ["portal", "purifier", "Spire Purifier"],
        ["portal", "port", "Spire Port"],
        ["portal", "base_camp", "Spire Base Camp"],
        ["portal", "bridge", "Spire Bridge"],
        ["portal", "sphinx", "Spire Sphinx"],
        ["portal", "bribe_sphinx", "Spire Bribe Sphinx"],
        ["portal", "spire_survey", "Spire Survey Tower"],
        ["portal", "mechbay", "Spire Mech Bay"],
        ["portal", "spire", "Spire Tower"],
        ["portal", "waygate", "Spire Waygate"],

        ["arpa", "launch_facility", "Launch Facility"],
        ["arpa", "lhc", "Supercollider"],
        ["arpa", "stock_exchange", "Stock Exchange"],
        ["arpa", "monument", "Monument"],
        ["arpa", "railway", "Railway"],
        ["arpa", "nexus", "Nexus"],
        ["arpa", "roid_eject", "Asteroid Redirect"],
        ["arpa", "syphon", "Mana Syphon"],
        ["arpa", "tp_depot", "Depot"],
    ];

    /*----------------------------------------------------------------------------*/

    const techs = [
        ["wooden_tools", "Wooden Tools", "Bone Tools"],
        ["cottage", "Cottage"],
        ["apartment", "Apartment"],
        ["oil_power", "Oil Powerplant", "Wind Farm"],
        ["club", "Club"],
        ["bone_tools", "Bone Tools"],
        ["sundial", "Sundial", "Moondial"],
        ["wheel", "Wheel"],
        ["wagon", "Wagon"],
        ["steam_engine", "Steam Engine"],
        ["combustion_engine", "Combustion Engine"],
        ["hover_cart", "Hover Cart"],
        ["osha", "OSHA Regulations"],
        ["blackmarket", "Blackmarket"],
        ["pipelines", "Oil Pipelines"],
        ["housing", "Housing"],
        ["arcology", "Arcology"],
        ["steel_beams", "Steel Beams"],
        ["mythril_beams", "Mythril Beams"],
        ["neutronium_walls", "Neutronium Walls"],
        ["bolognium_alloy_beams", "Bolognium Alloy Beams"],
        ["aphrodisiac", "Aphrodisiac"],
        ["fertility_clinic", "Fertility Clinic"],
        ["captive_housing", "Captive Housing"],
        ["torture", "Torment"],
        ["thrall_quarters", "Thrall Quarters"],
        ["psychic_energy", "Psychic Energy"],
        ["psychic_attack", "Psychic Assault"],
        ["psychic_finance", "Psychic Finance"],
        ["psychic_channeling", "Psychic Channeling"],
        ["psychic_efficiency", "Psychic Efficiency"],
        ["mind_break", "Psychic Mind Break"],
        ["psychic_stun", "Psychic Stun"],
        ["spear", "Flint Spear"],
        ["bronze_spear", "Bronze Spear"],
        ["iron_spear", "Iron Spear"],
        ["dowsing_rod", "Dowsing Rod"],
        ["metal_detector", "Metal Detector"],
        ["smokehouse", "Smokehouse"],
        ["lodge", "Hunting Lodge"],
        ["alt_lodge", "Lodge"],
        ["soul_well", "Soul Well"],
        ["compost", "Composting"],
        ["hot_compost", "Hot Composting"],
        ["mulching", "Mulching"],
        ["adv_mulching", "Advanced Mulching"],
        ["agriculture", "Agriculture"],
        ["farm_house", "Farm Houses"],
        ["irrigation", "Irrigation"],
        ["silo", "Grain Silo"],
        ["mill", "Grain Mill"],
        ["windmill", "Windmill"],
        ["windturbine", "Wind Turbine"],
        ["wind_plant", "Windmill", "Watermill"],
        ["gmfood", "GM Food"],
        ["foundry", "Foundry"],
        ["artisans", "Artisans"],
        ["apprentices", "Apprentices"],
        ["carpentry", "Carpentry"],
        ["demonic_craftsman", "Master Craftsman"],
        ["master_craftsman", "Master Craftsman"],
        ["banquet", "Banquet"],
        ["brickworks", "Brickworks"],
        ["machinery", "Machinery"],
        ["cnc_machine", "CNC Machine"],
        ["vocational_training", "Vocational Training"],
        ["stellar_forge", "Stellar Forge"],
        ["stellar_smelting", "Stellar Smelting"],
        ["assembly_line", "Assembly Line"],
        ["automation", "Factory Automation"],
        ["laser_cutters", "Laser Cutters"],
        ["high_tech_factories", "High-Tech Factory"],
        ["theatre", "Theatre"],
        ["playwright", "Playwright"],
        ["magic", "Techno Wizards", "Illusionists"],
        ["superstars", "Super Stars"],
        ["radio", "Radio"],
        ["tv", "Television"],
        ["vr_center", "VR Center"],
        ["zoo", "Exotic Zoo"],
        ["casino", "Casino"],
        ["dazzle", "Extreme Dazzle"],
        ["casino_vault", "Casino Vault"],
        ["otb", "Off Track Betting"],
        ["online_gambling", "Online Gambling"],
        ["bolognium_vaults", "Bolognium Vault"],
        ["mining", "Mining", "Sap Hardening"],
        ["bayer_process", "Bayer Process"],
        ["elysis_process", "ELYSIS Process"],
        ["smelting", "Smelting"],
        ["steel", "Crucible Steel"],
        ["blast_furnace", "Blast Furnace"],
        ["bessemer_process", "Bessemer Process"],
        ["oxygen_converter", "Oxygen Converter"],
        ["electric_arc_furnace", "Electric Arc Furnace"],
        ["hellfire_furnace", "Hellfire Furnace"],
        ["infernium_fuel", "Infernium Fuel"],
        ["iridium_smelting_perk", "Iridium Smelting"],
        ["rotary_kiln", "Rotary Kiln"],
        ["metal_working", "Metal Working"],
        ["iron_mining", "Iron Mining"],
        ["coal_mining", "Coal Mining"],
        ["storage", "Basic Storage"],
        ["reinforced_shed", "Reinforced Sheds"],
        ["barns", "Barns"],
        ["warehouse", "Warehouse"],
        ["cameras", "Security Cameras"],
        ["pocket_dimensions", "Pocket Dimensions"],
        ["ai_logistics", "AI Shipping Logistics"],
        ["containerization", "Containerization"],
        ["reinforced_crates", "Reinforced Crates"],
        ["cranes", "Cranes"],
        ["titanium_crates", "Titanium-Banded Crates"],
        ["mythril_crates", "Mythril-Plated Crates"],
        ["infernite_crates", "Infernite Crates"],
        ["graphene_crates", "Graphene Crates"],
        ["bolognium_crates", "Bolognium Crates"],
        ["steel_containers", "Steel Containers"],
        ["gantry_crane", "Gantry Cranes"],
        ["alloy_containers", "Alloy Containers"],
        ["mythril_containers", "Mythril Containers"],
        ["adamantite_containers", "Adamantite Containers"],
        ["aerogel_containers", "Aerogel Containers"],
        ["bolognium_containers", "Bolognium Containers"],
        ["nanoweave_containers", "Nanoweave Liners"],
        ["evil_planning", "Urban Planning"],
        ["urban_planning", "Urban Planning"],
        ["zoning_permits", "Zoning Permits"],
        ["urbanization", "Urbanization"],
        ["assistant", "Personal Assistant"],
        ["government", "Government"],
        ["theocracy", "Theocracy"],
        ["republic", "Republic"],
        ["socialist", "Socialist"],
        ["corpocracy", "Corpocracy"],
        ["technocracy", "Technocracy"],
        ["federation", "Federation"],
        ["magocracy", "Magocracy"],
        ["governor", "Governor"],
        ["spy", "Spies"],
        ["espionage", "Espionage"],
        ["spy_training", "Spy Training Facility"],
        ["spy_gadgets", "Spy Gadgets"],
        ["code_breakers", "Code Breakers"],
        ["currency", "Currency"],
        ["market", "Marketplace"],
        ["tax_rates", "Tax Rates"],
        ["large_trades", "Large Volume Trading"],
        ["corruption", "Corrupt Politicians"],
        ["massive_trades", "Massive Volume Trading"],
        ["trade", "Trade Routes"],
        ["diplomacy", "Diplomacy"],
        ["freight", "Freight Trains"],
        ["wharf", "Wharves"],
        ["banking", "Banking"],
        ["investing", "Investing"],
        ["vault", "Bank Vault"],
        ["bonds", "Savings Bonds"],
        ["steel_vault", "Steel Vault"],
        ["eebonds", "Series EE Bonds"],
        ["swiss_banking", "Cheese Banking"],
        ["safety_deposit", "Safety Deposit Box"],
        ["stock_market", "Stock Exchange"],
        ["hedge_funds", "Hedge Funds"],
        ["four_oh_one", "401K"],
        ["exchange", "Galactic Exchange"],
        ["foreign_investment", "Foreign Investment"],
        ["mythril_vault", "Mythril Vault"],
        ["neutronium_vault", "Neutronium Vault"],
        ["adamantite_vault", "Adamantite Vault"],
        ["graphene_vault", "Graphene Vault"],
        ["home_safe", "House Safe"],
        ["fire_proof_safe", "Fire Proof Safe"],
        ["tamper_proof_safe", "Tamper Proof Safe"],
        ["monument", "Monuments"],
        ["tourism", "Tourism"],
        ["xeno_tourism", "Xeno Tourism"],
        ["science", "Scientific Method"],
        ["library", "Dewey Decimal System"],
        ["thesis", "Thesis Papers"],
        ["research_grant", "Research Grants"],
        ["scientific_journal", "Scientific Journal", "Magic Tomes"],
        ["adjunct_professor", "Adjunct Professors"],
        ["tesla_coil", "Tesla Coil"],
        ["internet", "Internet"],
        ["observatory", "Space Observatory"],
        ["world_collider", "World Collider"],
        ["laboratory", "Laboratory", "Wizard Sanctum"],
        ["virtual_assistant", "Virtual Assistant"],
        ["dimensional_readings", "Dimensional Readings"],
        ["quantum_entanglement", "Quantum Entanglement"],
        ["expedition", "Scientific Expeditions", "Magic Expeditions"],
        ["subspace_sensors", "Subspace Sensors"],
        ["alien_database", "Alien Database"],
        ["orichalcum_capacitor", "Orichalcum Capacitor"],
        ["advanced_biotech", "Advanced Biotech"],
        ["codex_infinium", "Codex Infinium"],
        ["bioscience", "Bioscience"],
        ["genetics", "Genetics"],
        ["crispr", "CRISPR-Cas9"],
        ["shotgun_sequencing", "Shotgun Sequencing"],
        ["de_novo_sequencing", "De Novo Sequencing"],
        ["dna_sequencer", "DNA Sequencer", "Code Sequencer"],
        ["rapid_sequencing", "Rapid Gene Sequencing", "Agile Development"],
        ["mad_science", "Mad Science", "Sages"],
        ["electricity", "Electricity"],
        ["matter_replicator", "Matter Replicator", "Antimatter Replicator"],
        ["industrialization", "Industrialization"],
        ["electronics", "Electronics"],
        ["fission", "Nuclear Fission"],
        ["arpa", "A.R.P.A."],
        ["rocketry", "Rocketry"],
        ["robotics", "Advanced Robotics"],
        ["lasers", "Lasers"],
        ["artifical_intelligence", "Artificial Intelligence"],
        ["quantum_computing", "Quantum Computing"],
        ["virtual_reality", "Virtual Reality"],
        ["plasma", "Plasma Beams"],
        ["shields", "Energy Shields"],
        ["ai_core", "AI Supercore"],
        ["metaphysics", "Metaphysics"],
        ["orichalcum_analysis", "Orichalcum Analysis"],
        ["cybernetics", "Cybernetics"],
        ["blood_pact", "Blood Pact"],
        ["purify", "Enhanced Air Filters"],
        ["waygate", "Waygate"],
        ["demonic_infusion", "Demonic Infusion"],
        ["gate_key", "Gate Key"],
        ["gate_turret", "Gate Turret"],
        ["infernite_mine", "Infernite Survey"],
        ["study_corrupt_gem", "Study Corrupt Gem"],
        ["soul_binding", "Soul Binding"],
        ["soul_capacitor", "Soul Capacitor"],
        ["absorption_chamber", "Absorption Chamber"],
        ["corrupt_gem_analysis", "Corrupt Gem Analysis"],
        ["hell_search", "Search Hell Coordinates"],
        ["codex_infernium", "Codex Infernium"],
        ["lake_analysis", "Blood Lake Analysis"],
        ["lake_threat", "Lake Threat"],
        ["lake_transport", "Lake Transport"],
        ["cooling_tower", "Cooling Tower"],
        ["miasma", "Miasma"],
        ["incorporeal", "Incorporeal Existence"],
        ["tech_ascension", "Ascension"],
        ["terraforming", "Terraforming"],
        ["cement_processing", "Cement Processing"],
        ["adamantite_processing_flier", "Adamantite Processing"],
        ["adamantite_processing", "Adamantite Processing"],
        ["graphene_processing", "Graphene Processing"],
        ["fusion_power", "Nuclear Fusion"],
        ["infernium_power", "Inferno Power"],
        ["thermomechanics", "Thermomechanics"],
        ["quantum_manufacturing", "Quantum Manufacturing"],
        ["worker_drone", "Mining Drones"],
        ["uranium", "Uranium Extraction"],
        ["uranium_storage", "Uranium Storage"],
        ["uranium_ash", "Uranium Ash"],
        ["breeder_reactor", "Breeder Reactor"],
        ["mine_conveyor", "Mine Conveyor Belts"],
        ["oil_well", "Oil Derrick"],
        ["oil_depot", "Fuel Depot"],
        ["titanium_drills", "Titanium Drills"],
        ["alloy_drills", "Alloy Drills"],
        ["fracking", "Fracking"],
        ["mythril_drills", "Mythril Drills"],
        ["mass_driver", "Mass Driver"],
        ["orichalcum_driver", "Orichalcum Mass Driver"],
        ["polymer", "Polymer"],
        ["fluidized_bed_reactor", "Fluidized Bed Reactor"],
        ["synthetic_fur", "Synthetic Fur", "Faux Leather"],
        ["nanoweave", "Nanoweave"],
        ["stanene", "Stanene"],
        ["nano_tubes", "Nano Tubes"],
        ["scarletite", "Scarletite"],
        ["pillars", "Pillars Research"],
        ["reclaimer", "Reclaimers"],
        ["shovel", "Shovel"],
        ["iron_shovel", "Iron Shovel"],
        ["steel_shovel", "Steel Shovel"],
        ["titanium_shovel", "Titanium Shovel"],
        ["alloy_shovel", "Alloy Shovel"],
        ["mythril_shovel", "Mythril Shovel"],
        ["adamantite_shovel", "Adamantite Shovel"],
        ["stone_axe", "Primitive Axes"],
        ["copper_axes", "Bronze Axe"],
        ["iron_saw", "Sawmills"],
        ["steel_saw", "Steel Saws"],
        ["iron_axes", "Iron Axe"],
        ["steel_axes", "Steel Axe"],
        ["titanium_axes", "Titanium Axe"],
        ["chainsaws", "Chainsaws"],
        ["copper_sledgehammer", "Bronze Sledgehammer"],
        ["iron_sledgehammer", "Iron Sledgehammer"],
        ["steel_sledgehammer", "Steel Sledgehammer"],
        ["titanium_sledgehammer", "Titanium Sledgehammer"],
        ["copper_pickaxe", "Bronze Pickaxe"],
        ["iron_pickaxe", "Iron Pickaxe"],
        ["steel_pickaxe", "Steel Pickaxe"],
        ["jackhammer", "Jackhammer"],
        ["jackhammer_mk2", "Electric Jackhammer"],
        ["adamantite_hammer", "Adamantite Jackhammer"],
        ["copper_hoe", "Bronze Hoes"],
        ["iron_hoe", "Iron Hoes"],
        ["steel_hoe", "Steel Hoes"],
        ["titanium_hoe", "Titanium Hoes"],
        ["adamantite_hoe", "Adamantite Hoes"],
        ["cyber_limbs", "Cybernetic Worker Limbs"],
        ["slave_pens", "Slave Pens"],
        ["slave_market", "Slave Market"],
        ["ceremonial_dagger", "Ceremonial Dagger"],
        ["last_rites", "Last Rites"],
        ["ancient_infusion", "Ancient Infusion"],
        ["garrison", "Garrison"],
        ["mercs", "Mercenaries"],
        ["signing_bonus", "Signing Bonus"],
        ["hospital", "Hospital"],
        ["bac_tanks", "BAC Tank", "Repair Subroutines"],
        ["boot_camp", "Boot Camp"],
        ["vr_training", "VR Training"],
        ["bows", "Bows"],
        ["flintlock_rifle", "Flintlock Rifle", "Magic Arrows"],
        ["machine_gun", "Machine Gun", "Fire Mages"],
        ["bunk_beds", "Bunk Beds"],
        ["rail_guns", "Rail Guns", "Lightning Caster"],
        ["laser_rifles", "Laser Rifles", "Mana Rifles"],
        ["plasma_rifles", "Plasma Rifles", "Focused Mana Rifles"],
        ["disruptor_rifles", "Disruptor Rifles", "Magic Missile"],
        ["gauss_rifles", "Gauss Rifles", "Magic Word: Kill"],
        ["cyborg_soldiers", "Cyborg Soldiers"],
        ["space_marines", "Space Marines"],
        ["hammocks", "Nanoweave Hammocks"],
        ["cruiser", "Patrol Cruiser"],
        ["armor", "Leather Armor"],
        ["plate_armor", "Plate Armor"],
        ["kevlar", "Kevlar"],
        ["nanoweave_vest", "Nanoweave Vest"],
        ["laser_turret", "Laser Turret"],
        ["plasma_turret", "Plasma Turret"],
        ["black_powder", "Black Powder", "Magic Powder"],
        ["dynamite", "Dynamite"],
        ["anfo", "ANFO"],
        ["mad", "Mutual Destruction"],
        ["cement", "Cement"],
        ["rebar", "Rebar"],
        ["steel_rebar", "Steel Rebar"],
        ["portland_cement", "Portland Cement"],
        ["screw_conveyor", "Screw Conveyor"],
        ["adamantite_screws", "Adamantite Screws"],
        ["hunter_process", "Hunter Process"],
        ["kroll_process", "Kroll Process"],
        ["cambridge_process", "Cambridge Process"],
        ["pynn_partical", "Pynn Particles"],
        ["matter_compression", "Matter Compression"],
        ["higgs_boson", "Higgs Boson"],
        ["dimensional_compression", "Dimension Compression"],
        ["theology", "Theology"],
        ["fanaticism", "Fanaticism"],
        ["alt_fanaticism", "Fanaticism"],
        ["ancient_theology", "Ancient Theology"],
        ["study", "Study Ancients"],
        ["encoding", "Genetic Encoding"],
        ["deify", "Deify Ancients"],
        ["infusion", "Genetic Infusion"],
        ["indoctrination", "Indoctrination"],
        ["missionary", "Missionary"],
        ["zealotry", "Zealotry"],
        ["anthropology", "Anthropology"],
        ["alt_anthropology", "Anthropology"],
        ["mythology", "Mythology"],
        ["archaeology", "Archaeology"],
        ["merchandising", "Merchandising"],
        ["astrophysics", "Astrophysics"],
        ["rover", "Rovers"],
        ["probes", "Space Probes"],
        ["starcharts", "Star Charts"],
        ["colonization", "Colonization"],
        ["red_tower", "Red Control Tower"],
        ["space_manufacturing", "Space Manufacturing"],
        ["exotic_lab", "Exotic Materials Lab"],
        ["hydroponics", "Hydroponics Bays"],
        ["dyson_sphere", "Dyson Sphere"],
        ["dyson_swarm", "Dyson Swarm"],
        ["swarm_plant", "Swarm Plant"],
        ["space_sourced", "Space Sourced"],
        ["swarm_plant_ai", "Swarm Plant AI"],
        ["swarm_control_ai", "Swarm Control AI"],
        ["quantum_swarm", "Quantum Swarm"],
        ["perovskite_cell", "Perovskite Cells"],
        ["swarm_convection", "Swarm Convection"],
        ["orichalcum_panels", "Orichalcum Panels"],
        ["dyson_net", "Dyson Net"],
        ["dyson_sphere2", "Dyson Sphere"],
        ["orichalcum_sphere", "Orichalcum Dyson Plating"],
        ["gps", "GPS Constellation"],
        ["nav_beacon", "Navigation Beacon"],
        ["subspace_signal", "Subspace Beacon"],
        ["atmospheric_mining", "Atmospheric Mining"],
        ["helium_attractor", "Helium Attractor"],
        ["ram_scoops", "Ram Scoops"],
        ["elerium_prospecting", "Elerium Prospecting"],
        ["zero_g_mining", "Zero G Mining"],
        ["elerium_mining", "Elerium Mining"],
        ["laser_mining", "Laser Mining"],
        ["plasma_mining", "Plasma Mining"],
        ["elerium_tech", "Elerium Theory"],
        ["elerium_reactor", "Elerium Reactor"],
        ["neutronium_housing", "Neutronium Housing"],
        ["unification", "Unification"],
        ["unification2", "Unification"],
        ["unite", "Unite Country"],
        ["genesis", "Genesis Project"],
        ["star_dock", "Space Dock"],
        ["interstellar", "Interstellar Probes"],
        ["genesis_ship", "Genesis Ship", "Generational Ship"],
        ["geck", "G.E.C.K."],
        ["genetic_decay", "Gene Therapy"],
        ["stabilize_decay", "Stabilize Decay"],
        ["tachyon", "Tachyon Particles"],
        ["warp_drive", "Alcubierre Drive"],
        ["habitat", "Habitat"],
        ["graphene", "Graphene"],
        ["aerogel", "Aerogel"],
        ["mega_manufacturing", "Mega Manufacturing"],
        ["luxury_condo", "Luxury Condo"],
        ["stellar_engine", "Stellar Engine"],
        ["mass_ejector", "Mass Ejector"],
        ["asteroid_redirect", "Asteroid Redirect"],
        ["exotic_infusion", "Exotic Infusion"],
        ["infusion_check", "Exotic Infusion"],
        ["infusion_confirm", "Exotic Infusion"],
        ["stabilize_blackhole", "Stabilize Black Hole"],
        ["veil", "The Veil"],
        ["mana_syphon", "Mana Syphon"],
        ["gravitational_waves", "Gravitational Waves"],
        ["gravity_convection", "Gravitational Convection"],
        ["wormholes", "Wormholes"],
        ["portal", "Portals"],
        ["fortifications", "Fortifications"],
        ["war_drones", "War Drones"],
        ["demon_attractor", "Demonic Attractor"],
        ["combat_droids", "Combat Droids"],
        ["repair_droids", "Repair Droids"],
        ["advanced_predators", "Advanced Drones"],
        ["enhanced_droids", "Enhanced War Droids"],
        ["sensor_drone", "Sensor Drones"],
        ["map_terrain", "Map Terrain"],
        ["calibrated_sensors", "Calibrated Sensors"],
        ["shield_generator", "Shield Generator"],
        ["enhanced_sensors", "Enhanced Sensors"],
        ["xeno_linguistics", "Xeno Linguistics"],
        ["xeno_culture", "Xeno Culture"],
        ["cultural_exchange", "Cultural Exchange"],
        ["shore_leave", "Shore Leave"],
        ["xeno_gift", "Alien Gift"],
        ["industrial_partnership", "Industrial Partnership"],
        ["embassy_housing", "Embassy Housing"],
        ["advanced_telemetry", "Advanced Telemetry"],
        ["defense_platform", "Defense Platform"],
        ["scout_ship", "Scout Ship"],
        ["corvette_ship", "Corvette Ship"],
        ["frigate_ship", "Frigate Ship"],
        ["cruiser_ship", "Cruiser Ship"],
        ["dreadnought", "Dreadnought"],
        ["ship_dock", "Ship Dock"],
        ["ore_processor", "Ore Processor"],
        ["scavenger", "Tech Scavenger"],
        ["coordinates", "Decrypt Coordinates"],
        ["chthonian_survey", "Chthonian Survey"],
        ["gateway_depot", "Depot"],
        ["soul_forge", "Soul Forge"],
        ["soul_attractor", "Soul Attractor"],
        ["soul_absorption", "Soul Absorption"],
        ["soul_link", "Soul Link"],
        ["gun_emplacement", "Gun Emplacement"],
        ["advanced_emplacement", "Advanced Gun Emplacement"],
        ["dial_it_to_11", "Dial it up to 11"],
        ["limit_collider", "Limit Collider"],
        ["mana", "Mana"],
        ["ley_lines", "Ley Lines"],
        ["rituals", "Rituals"],
        ["crafting_ritual", "Crafting Rituals"],
        ["mana_nexus", "Mana Nexus"],
        ["clerics", "Clerics"],
        ["conjuring", "Conjuring"],
        ["res_conjuring", "Resource Conjuring"],
        ["alchemy", "Alchemy"],
        ["transmutation", "Advanced Transmutation"],
        ["secret_society", "Secret Society"],
        ["cultists", "Cultists"],
        ["conceal_ward", "Concealing Wards"],
        ["subtle_rituals", "Subtle Rituals"],
        ["pylon_camouflage", "Pylon Camouflage"],
        ["fake_tech", "Fake Tech"],
        ["concealment", "Empowered Concealment Wards"],
        ["improved_concealment", "Improved Concealment Wards"],
        ["outerplane_summon", "Outerplane Summon"],
        ["dark_bomb", "Dark Energy Bomb"],
        ["bribe_sphinx", "Bribe Sphinx"],
        ["alien_biotech", "Alien Biotech"],
        ["zero_g_lab", "Zero Gravity Lab"],
        ["operating_base", "Operating Base"],
        ["munitions_depot", "Munitions Depot"],
        ["fob", "Forward Operating Base"],
        ["bac_tanks_tp", "BAC Tank"],
        ["medkit", "Advanced Medkits"],
        ["sam_site", "Planetary Defenses"],
        ["data_cracker", "Data Cracker"],
        ["ai_core_tp", "AI Supercore"],
        ["ai_optimizations", "AI Optimizations"],
        ["synthetic_life", "Synthetic Life"],
        ["protocol66", "Protocol 66"],
        ["protocol66a", "Protocol 66"],
        ["terraforming_tp", "Terraforming"],
        ["quantium", "Quantium"],
        ["anitgrav_bunk", "Anti-Grav Bunks"],
        ["higgs_boson_tp", "Higgs Boson"],
        ["long_range_probes", "Long Range Probes"],
        ["strange_signal", "Strange Signal"],
        ["data_analysis", "Encrypted Data Analysis"],
        ["mass_relay", "Mass Relay"],
        ["nav_data", "Navigation Data"],
        ["sensor_logs", "Tau Ceti Data"],
        ["dronewar", "Drone Warfare"],
        ["drone_tank", "AI Drone Tanks"],
        ["stanene_tp", "Stanene"],
        ["graphene_tp", "Graphene"],
        ["virtual_reality_tp", "Virtual Reality"],
        ["electrolysis", "Electrolysis"],
        ["storehouse", "Titan Storage Facility"],
        ["adamantite_vault_tp", "Adamantite Vault"],
        ["titan_bank", "Titan Banking"],
        ["hydrogen_plant", "Hydrogen Power"],
        ["water_mining", "Water Mining"],
        ["mercury_smelting", "Solar Smelting"],
        ["iridium_smelting", "Iridium Smelting"],
        ["adamantite_crates", "Adamantite Crates"],
        ["bolognium_crates_tp", "Bolognium Crates"],
        ["adamantite_containers_tp", "Adamantite Containers"],
        ["quantium_containers", "Quantium Containers"],
        ["unobtainium_containers", "Unobtainium Containers"],
        ["reinforced_shelving", "Reinforced Shelving"],
        ["garage_shelving", "Quantium Garage Shelving"],
        ["warehouse_shelving", "Automated Warehousing System"],
        ["elerium_extraction", "Elerium Extraction"],
        ["orichalcum_panels_tp", "Orichalcum Panels"],
        ["shipyard", "Dwarf Ship Yard"],
        ["ship_lasers", "Ship Lasers"],
        ["pulse_lasers", "Ship Pulse Lasers"],
        ["ship_plasma", "Ship Plasma Beams"],
        ["ship_phaser", "Ship Phasers"],
        ["ship_disruptor", "Ship Disruptor"],
        ["destroyer_ship", "Destroyer"],
        ["cruiser_ship_tp", "Cruiser"],
        ["h_cruiser_ship", "Battlecruiser"],
        ["dreadnought_ship", "Dreadnought"],
        ["pulse_engine", "Pulse Drive"],
        ["photon_engine", "Photon Drive"],
        ["vacuum_drive", "Vacuum Drive"],
        ["ship_fusion", "Fusion Generator"],
        ["ship_elerium", "Elerium Generator"],
        ["quantum_signatures", "Quantum Signatures"],
        ["interstellar_drive", "Interstellar Drive"],
        ["alien_outpost", "Alien Outpost"],
        ["jumpgates", "Jump Gates"],
        ["system_survey", "Tau Survey"],
        ["repository", "Repository"],
        ["fusion_generator", "Nuclear Fusion"],
        ["tau_cultivation", "Tau Ceti Cultivation"],
        ["tau_manufacturing", "Tau Ceti Manufacturing"],
        ["weasels", "Weasels"],
        ["jeff", "Contact Jeff"],
        ["womling_fun", "Womling Entertainment"],
        ["womling_lab", "Womling Science"],
        ["womling_mining", "Womling Dirt Excavation"],
        ["womling_firstaid", "Womling First Aid"],
        ["womling_logistics", "Womling Logistics"],
        ["womling_repulser", "Womling Repulser Pad"],
        ["womling_farming", "Womling Farming"],
        ["womling_housing", "Womling Housing"],
        ["womling_support", "Womling Support"],
        ["womling_recycling", "Womling Recycling"],
        ["asteroid_analysis", "Asteroid Data Analysis"],
        ["shark_repellent", "Shark Repellent"],
        ["belt_mining", "Tau Ceti Belt Mining"],
        ["adv_belt_mining", "Advanced Belt Mining"],
        ["space_whaling", "Space Whaling"],
        ["infectious_disease_lab", "Infectious Disease Lab", "Malicious Code Lab"],
        ["isolation_protocol", "Isolation Protocol"],
        ["focus_cure", "Focus Cure"],
        ["decode_virus", "Decode Virus"],
        ["vaccine_campaign", "Vaccination Campaign"],
        ["vax_strat1", "Propaganda Campaign"],
        ["vax_strat2", "Force Vaccination"],
        ["vax_strat3", "Show the Science"],
        ["vax_strat4", "Secret Vaccination"],
        ["cloning", "Cloning Facility"],
        ["clone_degradation", "Clone Degradation"],
        ["digital_paradise", "Digital Paradise"],
        ["ringworld", "Design a Ringworld"],
        ["iso_gambling", "Pit Bosses"],
        ["outpost_boost", "Alien Outpost Device"],
        ["cultural_center", "Cultural Center"],
        ["outer_tau_survey", "Survey Outer Planet"],
        ["alien_research", "Alien Research"],
        ["womling_gene_therapy", "Womling Gene Therapy"],
        ["food_culture", "Sell fruitcake"],
        ["advanced_refinery", "Advanced Ore Refinery"],
        ["advanced_pit_mining", "Advanced Pit Mining"],
        ["useless_junk", "Useless Junk"],
        ["advanced_asteroid_mining", "Advanced Asteroid Mining"],
        ["advanced_material_synthesis", "Advanced Material Synthesis"],
        ["matrioshka_brain", "Matrioshka Brain"],
        ["ignition_device", "Ignition Device"],
        ["replicator", "Matter Replicator", "Antimatter Replicator"],
        ["womling_unlock", "Meet The Neighbors"],
        ["garden_of_eden", "Garden of Eden"],
    ];

    /*----------------------------------------------------------------------------*/

    const events = [
        "Womlings arrival"
    ];

    /*----------------------------------------------------------------------------*/

    const resets = {
        mad: "MAD",
        bioseed: "Bioseed",
        cataclysm: "Cataclysm",
        blackhole: "Black Hole",
        ascend: "Ascension",
        descend: "Demonic Infusion",
        aiappoc: "AI Apocalypse",
        matrix: "Matrix",
        retire: "Retirement",
        eden: "Garden of Eden",
        terraform: "Terraform"
    };

    /*----------------------------------------------------------------------------*/

    const universes = {
        standard: "Standard",
        heavy: "Heavy Gravity",
        antimatter: "Antimatter",
        evil: "Evil",
        micro: "Micro",
        magic: "Magic"
    };

    /*----------------------------------------------------------------------------*
     *                                  Database                                  *
     *----------------------------------------------------------------------------*/

    const configStorageKey = "sneed.analytics.config";

    function saveState(state) {
        const serialized = {
            version: 1,
            views: state.views.map(view => ({
                ...view,
                milestones: view.milestones.filter(m => !(m instanceof ResetMilestone)).map(m => m.serialize())
            }))
        };

        localStorage.setItem(configStorageKey, JSON.stringify(serialized));
    }

    function loadState() {
        const localState = localStorage.getItem(configStorageKey);
        if (localState !== null) {
            const state = JSON.parse(localState);
            state.views = state.views.map(args => new View(args));
            return state;
        }
        else {
            return { views: [] };
        }
    }

    /*----------------------------------------------------------------------------*/

    const historyStorageKey = "sneed.analytics.history";

    function loadHistory() {
        return JSON.parse(localStorage.getItem(historyStorageKey));
    }

    function saveHistory(history) {
        localStorage.setItem(historyStorageKey, JSON.stringify(history));
    }

    /*----------------------------------------------------------------------------*/

    const lastRunStorageKey = "sneed.analytics.latest";

    function loadLastRun() {
        return JSON.parse(localStorage.getItem(lastRunStorageKey));
    }

    function saveLastRun(runStats) {
        localStorage.setItem(lastRunStorageKey, JSON.stringify(runStats));
    }

    function discardLastRun() {
        localStorage.removeItem(lastRunStorageKey);
    }

    /*----------------------------------------------------------------------------*
     *                                   Models                                   *
     *----------------------------------------------------------------------------*/

    class Subscribable {
        constructor() {
            Object.defineProperty(this, "callbacks", {
                value: {},
                enumerable: false,
            });
        }

        on(event, callback) {
            (this.callbacks[event] ??= []).push(callback);
            return callback;
        }

        unsubscribe(callback) {
            for (const callbacks of Object.values(this.callbacks)) {
                const idx = callbacks.indexOf(callback);
                if (idx !== -1) {
                    callbacks.splice(idx, 1);
                    break;
                }
            }
        }

        emit(event, ...args) {
            this.callbacks[event]?.forEach(cb => cb(...args));
            this.callbacks["*"]?.forEach(cb => cb(...args));
        }
    }

    /*----------------------------------------------------------------------------*/

    class Milestone extends Subscribable {
        constructor(enabled = true) {
            super();

            this._enabled = enabled;
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

    class Building extends Milestone {
        constructor(tab, id, name, count = 1, enabled = true) {
            super(enabled);

            this.tab = tab;
            this.id = id;
            this.name = name;
            this.count = count;
        }

        get signature() {
            return `${this.tab}-${this.id}:${this.count}`;
        }

        serialize() {
            return ["Built", this.tab, this.id, this.name, this.count, this.enabled];
        }

        get complete() {
            const instance = evolve.global[this.tab]?.[this.id];
            const count = this.tab === "arpa" ? instance?.rank : instance?.count;
            return (count ?? 0) >= this.count;
        }
    };

    class Research extends Milestone {
        constructor(id, name, enabled = true) {
            super(enabled);

            this.id = id;
            this.name = name;
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

    class EvolveEvent extends Milestone {
        constructor(name, enabled = true) {
            super(enabled);

            this.name = name;

            if (name === "Womlings arrival") {
                this.impl = () => evolve.global.race.servants !== undefined;
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

    class ResetMilestone extends Milestone {
        constructor(name) {
            super(true);

            this.name = name;
        }

        get signature() {
            return this.name;
        }
    };

    function milestoneFactory(type, ...args) {
        if (type === "Built") {
            return new Building(...args);
        }
        else if (type === "Researched") {
            return new Research(...args);
        }
        else if (type === "Event") {
            return new Event(...args);
        }
    }

    /*----------------------------------------------------------------------------*/

    class View extends Subscribable {
        constructor(state) {
            super();

            const defineSetting = (prop, defaultValue) => {
                Object.defineProperty(this, prop, {
                    enumerable: true,
                    get: () => {
                        return state[prop] ?? defaultValue;
                    },
                    set: (value) => {
                        if (value !== state[prop]) {
                            state[prop] = value;
                            this.emit("update");
                        }
                    }
                });
            };

            defineSetting("resetType");
            defineSetting("universe");
            defineSetting("daysScale");
            defineSetting("numRuns");

            this.milestones = state.milestones.map(args => milestoneFactory(...args)) ?? [];
            this.milestones.push(new ResetMilestone(this.resetType));

            for (const milestone of this.milestones) {
                milestone.on("update", () => this.emit("update"));
            }
        }

        findMilestone(name) {
            return this.milestones.find(m => m.name === name);
        }

        findMilestoneIndex(milestone) {
            return milestone !== undefined ? this.milestones.findIndex(m => m.signature === milestone.signature) : -1;
        }

        addMilestone(milestone) {
            const existingIdx = this.findMilestoneIndex(milestone);
            if (existingIdx === -1) {
                this.milestones.push(milestone);
                milestone.on("update", () => this.emit("update"));
                this.emit("update");
            }
        }

        removeMilestone(milestone) {
            const existingIdx = this.findMilestoneIndex(milestone);
            if (existingIdx !== -1) {
                this.milestones.splice(existingIdx, 1);
                this.emit("update");
            }
        }
    }

    /*----------------------------------------------------------------------------*/

    class Config extends Subscribable {
        constructor(state) {
            super();
            this.state = state;

            this.on("*", () => saveState(this.state));

            for (const view of this.views) {
                view.on("update", () => saveState(this.state));
            }
        }

        get views() {
            return this.state.views;
        }

        get milestones() {
            const uniqueMilestones = {};
            for (const view of this.state.views) {
                for (const milestone of view.milestones) {
                    uniqueMilestones[milestone.signature] ??= milestone;
                }
            }
            return Object.values(uniqueMilestones);
        }

        addView(resetType, universe, milestones) {
            const view = new View({ resetType, universe, milestones });
            view.on("update", () => saveState(this.state));

            this.state.views.push(view);

            this.emit("viewAdded", view);
        }

        removeView(view) {
            const idx = this.views.indexOf(view);
            if (idx !== -1) {
                this.views.splice(idx, 1);
                this.emit("viewRemoved", view);
            }
        }
    };

    const config = new Config(loadState());

    /*----------------------------------------------------------------------------*
     *                                  Game API                                  *
     *----------------------------------------------------------------------------*/

    function getRunNumber() {
        return evolve.global.stats.reset + 1;
    }

    function getDay() {
        return evolve.global.stats.days;
    }

    function getUniverse() {
        return evolve.global.race.universe;
    }

    function getResetCounts() {
        return Object.fromEntries(Object.entries(resets).map(([reset, name]) => [name, evolve.global.stats[reset] ?? 0]));
    }

    /*----------------------------------------------------------------------------*/

    function onGameTick(fn) {
        let craftCost = evolve.craftCost;
        Object.defineProperty(evolve, 'craftCost', {
            get: () => craftCost,
            set: (value) => {
                craftCost = value;
                fn();
            }
        });
    }

    function onGameDay(fn) {
        let previousDay = null;
        onGameTick(() => {
            const day = getDay();

            if (previousDay !== day) {
                fn(day);
                previousDay = day;
            }
        });
    }

    /*----------------------------------------------------------------------------*/

    function synchronize() {
        return new Promise(resolve => {
            function impl() {
                if (window.evolve?.global?.stats !== undefined) {
                    resolve();
                }
                else {
                    setTimeout(impl, 100);
                }
            }

            impl();
        });
    }

    /*----------------------------------------------------------------------------*
     *                                Run tracking                                *
     *----------------------------------------------------------------------------*/

    await synchronize();

    function inferResetType(runStats) {
        const resetCounts = getResetCounts();

        // Find which reset got incremented
        const reset = Object.entries(resetCounts).find(([reset, count]) => {
            return count === (runStats.resets[reset] ?? 0) + 1;
        });

        // The game does not differentiate between Black Hole and Vacuum Collapse resets
        if (reset === "Black Hole" && runStats.universe === "magic") {
            return "Vacuum Collapse";
        }
        else {
            return reset ?? "Unknown";
        }
    }

    // The game refreshes the page after a reset
    // Thus the script initialization can be a place to update the history
    const lastRunStats = loadLastRun();
    if (lastRunStats !== null) {
        // We want to keep it if we just refreshed the page
        if (lastRunStats.run !== getRunNumber() || lastRunStats.totalDays > getDay()) {
            discardLastRun();
        }

        // We want to push the run into the history only immediately after finishing it
        if (lastRunStats.run === getRunNumber() - 1) {
            const history = loadHistory() ?? [];
            history.push({
                run: lastRunStats.run,
                universe: lastRunStats.universe,
                resetType: inferResetType(lastRunStats),
                totalDays: lastRunStats.totalDays,
                milestones: lastRunStats.milestones
            });
            saveHistory(history);
        }
    }

    /*----------------------------------------------------------------------------*/

    // Don't check completed milestones
    function makeMilestoneMask() {
        return Array(config.milestones.length).fill(false);
    }

    let reachedMask = makeMilestoneMask();

    function onMilestonesChange() {
        reachedMask = makeMilestoneMask();
    }

    config.on("viewAdded", view => {
        onMilestonesChange();
        view.on("update", onMilestonesChange);
    });
    for (const view of config.views) {
        view.on("update", onMilestonesChange);
    }

    function checkMilestoneConditions() {
        const newlyCompleted = [];

        for (let i = 0; i != config.milestones.length; ++i) {
            if (reachedMask[i]) {
                continue;
            }

            if (config.milestones[i].complete) {
                reachedMask[i] = true;
                newlyCompleted.push(config.milestones[i]);
            }
        }

        return newlyCompleted;
    }

    function makeNewRunStats() {
        return {
            run: getRunNumber(),
            universe: getUniverse(),
            resets: getResetCounts(),
            totalDays: 0,
            milestones: {}
        };
    }

    onGameDay(day => {
        const runStats = loadLastRun() ?? makeNewRunStats();

        runStats.totalDays = day;

        const newlyCompleted = checkMilestoneConditions();
        for (const milestone of newlyCompleted) {
            if (!(milestone.name in runStats.milestones)) {
                // Since this callback is invoked at the beginning of a day,
                // the milestone was reached the previous day
                runStats.milestones[milestone.name] = day - 1;
            }
        }

        saveLastRun(runStats);
    });

    /*----------------------------------------------------------------------------*
     *                                     UI                                     *
     *----------------------------------------------------------------------------*/

    $("head").append(`
        <style type="text/css">
            html.dark .bg-dark {
                background: #181818
            }

            html.light .bg-dark {
                background: #dddddd
            }

            html.darkNight .bg-dark {
                background: #181818
            }

            html.gruvboxLight .bg-dark {
                background: #a89984
            }

            html.gruvboxDark .bg-dark {
                background: #1d2021
            }

            html.orangeSoda .bg-dark {
                background: #181818
            }

            html.dracula .bg-dark {
                background: #1a1c24
            }

            .w-fit {
                width: fit-content
            }

            .crossed {
                text-decoration: line-through
            }
        </style>
    `);

    /*----------------------------------------------------------------------------*/

    function makeSelectNode(options, defaultValue) {
        const optionNodes = options.map(value => `<option ${value === defaultValue ? "selected" : ""}>${value}</option>`);

        return $(`
            <select style="width: 100px">
                ${optionNodes}
            </select>
        `);
    }

    function makeAutocompleteInputNode(placeholder, options) {
        function onChange(event, ui) {
            // If it wasn't selected from list
            if (ui.item === null){
                const item = options.find(({ label }) => label === this.value);
                if (item !== undefined){
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
            source: options,
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

    function makeSlimButtonNode(text) {
        return $(`<button class="button" style="height: 22px">${text}</button>`);
    }

    function makeMilestoneSettings(view) {
        const builtTargetOptions = makeAutocompleteInputNode("Building/Project", buildings.map(([, , name], idx) => ({ value: idx, label: name })));
        const buildCountOption = $(`<input style="width: 100px" type="number" placeholder="Count" min="1" value="1">`);

        const researchedTargetOptions = makeAutocompleteInputNode("Tech", techs.flatMap(([, ...names], idx) => names.map(name => ({ value: idx, label: name }))));

        const eventTargetOptions = makeSelectNode(events);

        function selectOptions(type) {
            builtTargetOptions.toggle(type === "Built");
            buildCountOption.toggle(type === "Built");
            researchedTargetOptions.toggle(type === "Researched");
            eventTargetOptions.toggle(type === "Event");
        }

        // Default form state
        selectOptions("Built");

        const typeOptions = makeSelectNode(["Built", "Researched", "Event"])
            .on("change", function() { selectOptions(this.value); });

        function makeMilestone() {
            if (typeOptions.val() === "Built") {
                const infoIdx = builtTargetOptions[0]._value;
                return infoIdx && new Building(...buildings[infoIdx], buildCountOption.val());
            }
            else if (typeOptions.val() === "Researched") {
                const infoIdx = researchedTargetOptions[0]._value;
                return new Research(...techs[infoIdx]);
            }
            else if (typeOptions.val() === "Event") {
                return new EvolveEvent(eventTargetOptions.val());
            }
        }

        const addMilestoneNode = makeSlimButtonNode("Add").on("click", () => {
            view.addMilestone(makeMilestone());
        });

        const removeMilestoneNode = makeSlimButtonNode("Remove").on("click", () => {
            view.removeMilestone(makeMilestone());
        });

        return $(`<div style="display: flex; flex-direction: row; gap: 8px"></div>`)
            .append(`<span>Milestone</span>`)
            .append(typeOptions)
            .append(builtTargetOptions)
            .append(buildCountOption)
            .append(researchedTargetOptions)
            .append(eventTargetOptions)
            .append(addMilestoneNode)
            .append(removeMilestoneNode);
    }

    /*----------------------------------------------------------------------------*/

    function makeViewSettings(view) {
        const resetTypeInput = makeSelectNode(Object.values(resets), view.resetType)
            .css("width", "150px")
            .on("change", function() { view.resetType = this.value; });

        const universeInput = makeSelectNode(["any", ...Object.keys(universes)], view.universe ?? "any")
            .css("width", "150px")
            .on("change", function() { view.universe = this.value === "any" ? null : this.value; });

        const daysScaleInput = $(`<input style="width: 100px" type="number" placeholder="Auto" min="1">`)
            .on("change", function() { view.daysScale = this.value || undefined; });

        const numRunsInput = $(`<input style="width: 100px" type="number" placeholder="All" min="1">`)
            .on("change", function() { view.numRuns = this.value || undefined; });

        function makeInputNode(label, inputNode) {
            return $(`<div>`).append(`<span style="margin-right: 8px">${label}</span>`).append(inputNode);
        }

        return $(`<div style="display: flex; flex-wrap: wrap; flex-direction: row; gap: 8px"></div>`)
            .append(makeInputNode("Reset type", resetTypeInput))
            .append(makeInputNode("Universe", universeInput))
            .append(makeInputNode("Days scale", daysScaleInput))
            .append(makeInputNode("Show last N runs", numRunsInput));
    }

    /*----------------------------------------------------------------------------*/

    function preprocessRunData(history, view) {
        const numSkipped = view.numRuns ? Math.max(history.length - view.numRuns, 0) : 0;

        const milestones = Object.fromEntries(view.milestones.filter(m => m.enabled).map(m => [m.name, m]));

        const entries = [];
        for (const [i, entry] of Object.entries(history)) {
            if (i < numSkipped) {
                continue;
            }

            if (entry.resetType !== view.resetType) {
                continue;
            }

            if (view.universe !== null && entry.universe !== view.universe) {
                continue;
            }

            let previousDay = 0;
            for (const [milestone, day] of Object.entries(entry.milestones)) {
                if (!(milestone in milestones)) {
                    continue;
                }

                // Don't put events in the stacked view
                if (events.includes(milestone)) {
                    entries.push({
                        run: Number(i),
                        milestone,
                        day: day
                    });

                    continue;
                }

                entries.push({
                    run: Number(i),
                    milestone,
                    day: day,
                    dayDiff: day - previousDay
                });

                previousDay = day;
            }
        }

        return entries;
    }

    function makeGraph(view) {
        const milestones = view.milestones.map(m => m.name);
        const enabledMilestones = view.milestones.filter(m => m.enabled).map(m => m.name);

        // Create a milestone for the reset
        const history = loadHistory();
        for (const entry of history) {
            entry.milestones[entry.resetType] = entry.totalDays;
        }

        const lastRun = history[history.length - 1];
        const lastRunTimestamps = Object.entries(lastRun.milestones).filter(([m]) => enabledMilestones.includes(m)).map(([, days]) => days);

        const entries = preprocessRunData(history, view);

        // Try to order the milestones in the legend in the order in which they happen during a run
        const orderedMilestones = Object.keys(lastRun.milestones).filter(m => milestones.includes(m)).reverse();
        orderedMilestones.push(...milestones.filter(m => !orderedMilestones.includes(m)));

        const node = Plot.plot({
            width: 800,
            y: { grid: true, domain: view.daysScale ? [0, view.daysScale] : undefined },
            color: { legend: true, domain: orderedMilestones },
            marks: [
                Plot.areaY(entries, { x: "run", y: "dayDiff", fill: "milestone", fillOpacity: 0.5 }),
                Plot.lineY(entries, { x: "run", y: "day", stroke: "milestone", marker: "dot", tip: { format: { x: false } } }),
                Plot.axisY({ anchor: "left", label: "days" }),
                Plot.axisY(lastRunTimestamps, { anchor: "right" }),
                Plot.axisX([], { label: null }),
                Plot.ruleY([0])
            ]
        });

        const legend = $(node).find("> div");
        legend.prepend(`
            <style>
                span {
                    font-size: 1rem !important;
                }
            </style>
        `);

        for (const legendNode of legend.find("> span")) {
            const milestone = view.findMilestone($(legendNode).text());
            if (milestone !== undefined) {
                $(legendNode).toggleClass("crossed", !milestone.enabled);
            }
        }

        legend.find("> span").css("cursor", "pointer").on("click", function() {
            const milestone = view.findMilestone($(this).text());
            if (milestone !== undefined) {
                milestone.enabled = !milestone.enabled;
            }
        });

        const plot = $(node).find("> svg");
        plot.attr("width", "100%");
        plot.prepend(`
            <style>
                g[aria-label='tip'] g text {
                    color: #4a4a4a;
                }
            </style>
        `);

        $(node).css("margin", "0");

        return node;
    }

    /*----------------------------------------------------------------------------*/

    function makeViewTab(view, id) {
        function generateTitle() {
            let title = view.resetType;
            if (view.universe !== null) {
                title += ` (${view.universe})`;
            }

            return title;
        }

        const controlNode = $(`<li><a href="#${id}">${generateTitle()}</a></li>`);
        const contentNode = $(`<div id="${id}" class="vscroll" style="height: calc(100vh - 10rem)"></div>`);

        const removeViewNode = $(`<button class="button right">Delete View</button>`).on("click", () => {
            config.removeView(view);
        });

        contentNode
            .append(makeViewSettings(view).css("margin-bottom", "1em"))
            .append(makeMilestoneSettings(view).css("margin-bottom", "1em"))
            .append(makeGraph(view))
            .append(removeViewNode);

        view.on("update", () => {
            controlNode.find("> a").text(generateTitle());
            contentNode.find("figure:last").replaceWith(makeGraph(view));
        });

        return [controlNode, contentNode];
    }

    /*----------------------------------------------------------------------------*/

    const tabControlNode = $(`
        <li role="tab" aria-controls="analytics-content" aria-selected="false">
            <a id="analytics-label" tabindex="0" data-unsp-sanitized="clean">Analytics</a>
        </li>
    `);

    const tabContentNode = $(`
        <div class="tab-item" role="tabpanel" id="analytics" aria-labelledby="analytics-label" tabindex="-1" style="display: none;">
            <div id="analyticsPanel" class="tab-item">
                <nav class="tabs">
                    <ul role="tablist" class="hscroll" style="margin-left: 0; width: 100%">
                        <li><a id="analytics-add-view" role="button">+ Add View</a></li>
                    </ul>
                </nav>
            </div>
        </div>
    `);

    const analyticsPanel = tabContentNode.find("> #analyticsPanel").tabs({
        classes: {
            "ui-tabs-active": "is-active"
        }
    });

    analyticsPanel.find("#analytics-add-view").on("click", function() {
        config.addView("Ascension", getUniverse(), []);
    });

    function onViewAdded(view) {
        const controlParentNode = analyticsPanel.find("> nav > ul");
        const count = controlParentNode.children().length;
        const id = `analytics-view-${count}`;

        const [controlNode, contentNode] = makeViewTab(view, id);

        controlNode.insertBefore(lastChild(analyticsPanel.find("> nav > ul")));
        analyticsPanel.append(contentNode);
        analyticsPanel.tabs("refresh");
        analyticsPanel.tabs({ active: count - 1 });

        const cb = config.on("viewRemoved", removedView => {
            if (removedView === view) {
                config.unsubscribe(cb);

                controlNode.remove();
                contentNode.remove();
                analyticsPanel.tabs("refresh");
                analyticsPanel.tabs({ active: 0 });
            }
        });
    }

    function lastChild(node) {
        const children = node.children();
        const length = children.length;
        return children[length - 1];
    }

    function hidden(node) {
        return node.attr("tabindex") === "-1";
    }

    function hideTab(controlNode, contentNode, direction) {
        controlNode.removeClass("is-active");
        controlNode.attr("aria-selected", "false");

        contentNode.hide("slide", { direction, complete: () => contentNode.css("display", "none").attr("tabindex", "-1") }, 200);
    }

    function showTab(controlNode, contentNode, direction) {
        controlNode.addClass("is-active");
        controlNode.attr("aria-selected", "true");

        contentNode.show("slide", { direction, complete: () => contentNode.css("display", "").attr("tabindex", "0") }, 200);
    }

    // Note that there's a hidden "Hell Observations" tab after setting
    tabControlNode.insertBefore(lastChild($("#mainTabs > nav > ul")));
    tabContentNode.insertBefore(lastChild($("#mainTabs > section")));

    tabControlNode.siblings().click(function() {
        if (!hidden(tabContentNode)) {
            hideTab(tabControlNode, tabContentNode, "right");
            showTab($(this), tabContentNode.parent().children().eq($(this).index()), "left");
        }
    });

    tabControlNode.click(() => {
        hideTab(tabControlNode.siblings(), tabContentNode.siblings(), "left");
        showTab(tabControlNode, tabContentNode, "right");
    });

    for (const view of config.views) {
        onViewAdded(view);
    }
    config.on("viewAdded", onViewAdded);

    analyticsPanel.tabs({ active: 0 });
})();

export type BuildingInfo = {
    region: string,
    name: string,
    prefix?: string,
    suffix?: string
}

type SourceInfo = Record<string, Record<string, Record<string, string | { name: string, prefix?: string, suffix?: string }>>>;

function makeBuildingsInfo(data: SourceInfo): Record<string, BuildingInfo> {
    const entries: Record<string, BuildingInfo> = {};

    for (const [tab, regions] of Object.entries(data)) {
        for (const [region, buildings] of Object.entries(regions)) {
            for (const [id, entry] of Object.entries(buildings)) {
                entries[`${tab}-${id}`] = entry instanceof Object ? { region, ...entry } : { region, name: entry };
            }
        }
    }

    return entries;
}

export const buildings = makeBuildingsInfo({
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
        "Space/Earth's Orbit": {
            test_launch: "Test Launch",
            satellite: "Satellite",
            gps: "GPS Satellite",
            propellant_depot: "Propellant Depot",
            nav_beacon: "Navigation Beacon"
        },
        "Space/Moon": {
            moon_mission: "Moon Launch",
            moon_base: "Moon Base",
            iridium_mine: "Iridium Mine",
            helium_mine: "Helium-3 Mine",
            observatory: "Observatory"
        },
        "Space/Red Planet": {
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
        "Space/Hell Planet": {
            hell_mission: "Hell Planet Mission",
            geothermal: "Geothermal Plant",
            hell_smelter: "Smelter",
            spc_casino: { name: "Casino", prefix: "Space" },
            swarm_plant: "Swarm Plant",
            firework: { name: "Firework Factory", prefix: "Space", suffix: "Cataclysm" }
        },
        "Space/Sun": {
            sun_mission: "Sun Mission",
            swarm_control: "Control Station",
            swarm_satellite: "Swarm Satellite",
            jump_gate: { name: "Jump Gate", prefix: "Space" }
        },
        "Space/Gas Giant": {
            gas_mission: "Gas Giant Mission",
            gas_mining: "Helium-3 Collector",
            gas_storage: "Fuel Depot",
            star_dock: "Space Dock"
        },
        "Space/Gas Giant's Moon": {
            gas_moon_mission: "Gas Giant's Moon Mission",
            outpost: "Mining Outpost",
            drone: "Mining Drone",
            oil_extractor: "Oil Extractor"
        },
        "Space/Asteroid Belt": {
            belt_mission: "Asteroid Belt Mission",
            space_station: "Space Station",
            elerium_ship: "Elerium Mining Ship",
            iridium_ship: "Iridium Mining Ship",
            iron_ship: "Iron Mining Ship"
        },
        "Space/Dwarf Planet": {
            dwarf_mission: "Dwarf Planet Mission",
            elerium_contain: "Elerium Storage",
            e_reactor: "Elerium Reactor",
            world_collider: "World Collider",
            world_controller: { name: "World Collider", suffix: "Complete" },
            shipyard: "Ship Yard",
            mass_relay: "Mass Relay",
            m_relay: { name: "Mass Relay", suffix: "Complete" }
        },
        "Space/Titan": {
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
        "Space/Enceladus": {
            enceladus_mission: "Enceladus Mission",
            water_freighter: "Water Freighter",
            zero_g_lab: "Zero Gravity Lab",
            operating_base: "Operating Base",
            munitions_depot: "Munitions Depot"
        },
        "Space/Triton": {
            triton_mission: "Triton Mission",
            fob: "Forward Base",
            lander: "Troop Lander",
            crashed_ship: "Derelict Ship"
        },
        "Space/Kuiper Belt": {
            kuiper_mission: "Kuiper Belt Mission",
            orichalcum_mine: "Orichalcum Mine",
            uranium_mine: "Uranium Mine",
            neutronium_mine: "Neutronium Mine",
            elerium_mine: "Elerium Mine"
        },
        "Space/Eris": {
            eris_mission: "Eris Mission",
            drone_control: "Titan Control Relay",
            shock_trooper: "Android Trooper",
            tank: "Tank",
            digsite: "Digsite"
        }
    },
    starDock: {
        "Space/Star Dock": {
            probes: "Space Probe",
            geck: "G.E.C.K.",
            seeder: "Bioseeder Ship",
            prep_ship: "Prep Ship",
            launch_ship: "Launch Ship"
        }
    },
    interstellar: {
        "Interstellar/Alpha Centauri": {
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
        "Interstellar/Proxima Centauri": {
            proxima_mission: "Proxima Centauri Mission",
            xfer_station: "Transfer Station",
            cargo_yard: "Cargo Yard",
            cruiser: "Patrol Cruiser",
            dyson: "Dyson Net",
            dyson_sphere: { name: "Dyson Sphere", suffix: "Bolognium" },
            orichalcum_sphere: { name: "Dyson Sphere", suffix: "Orichalcum" },
            elysanite_sphere: { name: "Dyson Sphere", suffix: "Elysanite" }
        },
        "Interstellar/Helix Nebula": {
            nebula_mission: "Helix Nebula Mission",
            nexus: "Nexus Station",
            harvester: "Gas Harvester",
            elerium_prospector: "Elerium Prospector"
        },
        "Interstellar/Neutron Star": {
            neutron_mission: "Neutron Star Mission",
            neutron_miner: "Neutron Miner",
            citadel: "Citadel Station",
            stellar_forge: "Stellar Forge"
        },
        "Interstellar/Black Hole": {
            blackhole_mission: "Black Hole Mission",
            far_reach: "Farpoint",
            stellar_engine: "Stellar Engine",
            mass_ejector: "Mass Ejector",
            jump_ship: "Jump Ship",
            wormhole_mission: "Wormhole Mission",
            stargate: "Stargate",
            s_gate: { name: "Stargate", suffix: "Complete" }
        },
        "Interstellar/Sirius": {
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
        "Andromeda/Gateway System": {
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
        "Andromeda/Stargate Region": {
            gateway_station: "Gateway Station",
            telemetry_beacon: "Telemetry Beacon",
            gateway_depot: { name: "Depot", prefix: "Galaxy" },
            defense_platform: "Defense Platform"
        },
        "Andromeda/Gorddon System": {
            gorddon_mission: "Second Contact",
            embassy: "Embassy",
            dormitory: "Dormitory",
            symposium: "Symposium",
            freighter: "Freighter"
        },
        "Andromeda/Alien 1 System": {
            consulate: "Consulate",
            resort: "Resort",
            vitreloy_plant: "Vitreloy Plant",
            super_freighter: "Super Freighter"
        },
        "Andromeda/Alien 2 System": {
            alien2_mission: "Alien 2 Assault Mission",
            foothold: "Foothold Station",
            armed_miner: "Armed Mining Ship",
            ore_processor: "Ore Processor",
            scavenger: "Tech Scavenger"
        },
        "Andromeda/Chthonian System": {
            chthonian_mission: "Chthonian Assault Mission",
            minelayer: "Minelayer",
            excavator: "Excavator",
            raider: "Corsair"
        }
    },
    portal: {
        "Hell/Fortress": {
            turret: "Automated Turret",
            carport: "Surveyor Carport",
            war_droid: "War Droid",
            repair_droid: "Repair Droid"
        },
        "Hell/Badlands": {
            war_drone: "Predator Drone",
            sensor_drone: "Sensor Drone",
            attractor: "Attractor Beacon"
        },
        "Hell/The Pit": {
            pit_mission: "Scout the Pit",
            assault_forge: "Secure the Pit",
            soul_forge: "Soul Forge",
            gun_emplacement: "Gun Emplacement",
            soul_attractor: "Soul Attractor",
            soul_capacitor: "Soul Capacitor",
            absorption_chamber: "Absorption Chamber"
        },
        "Hell/Ancient Ruins": {
            ruins_mission: "Survey Ruins",
            guard_post: "Guard Post",
            vault: "Vault",
            archaeology: "Archaeological Dig",
            arcology: "Arcology",
            hell_forge: "Infernal Forge",
            inferno_power: "Inferno Reactor",
            ancient_pillars: "Ancient Pillars"
        },
        "Hell/Ancient Gate": {
            gate_mission: "Gate Investigation",
            west_tower: "West Tower",
            east_tower: "East Tower",
            gate_turret: "Gate Turret",
            infernite_mine: "Infernite Mine"
        },
        "Hell/Boiling Lake of Blood": {
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
        "Hell/The Spire": {
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
        "Tau Ceti/New Home": {
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
        "Tau Ceti/Red Planet": {
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
        "Tau Ceti/Gas Giant": {
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
        "Tau Ceti/Asteroid Belt": {
            roid_mission: "Asteroid Belt Mission",
            patrol_ship: "Patrol Ship",
            mining_ship: "Extractor Ship",
            whaling_ship: "Whaling Ship"
        },
        "Tau Ceti/Gas Giant 2": {
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
        "Eden/Asphodel Meadows": {
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
        "Eden/Elysium Fields": {
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
        "Eden/Isle of the Blessed": {
            south_pier: "South Pier",
            west_tower: "West Rampart",
            isle_garrison: "Angelic Garrison",
            east_tower: "East Rampart",
            spirit_vacuum: "Spirit Vacuum",
            spirit_battery: "Spirit Battery",
            soul_compactor: "Soul Compactor"
        },
        "Eden/Palace of Eternity": {
            scout_palace: "Scout Palace",
            throne: "Abandoned Throne",
            infuser: "Divinity Infuser",
            apotheosis: "Start Infusion",
            conduit: "Energy Conduit",
            tomb: "Tomb of the Dead God"
        }
    }
});

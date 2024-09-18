const config = {
    "version": 3,
    "views": [
        {
            "milestones": [
                ["Built", "arpa", "launch_facility", "Launch Facility", 1, true],
                ["Built", "space", "world_controller", "Dwarf World Collider (Complete)", 1, true],
                ["Built", "interstellar", "s_gate", "Blackhole Stargate (Complete)", 1, true],
                ["Researched", "metaphysics", "Metaphysics", true],
                ["Built", "galaxy", "dreadnought", "Gateway Dreadnought", 1, true],
                ["Built", "interstellar", "space_elevator", "Sirius Space Elevator", 100, true],
                ["Built", "interstellar", "gravity_dome", "Sirius Gravity Dome", 100, true],
                ["Event", "Womlings arrival", true],
                ["Reset", "Ascension", true]
            ],
            "mode": "Total (filled)",
            "resetType": "Ascension",
            "universe": "heavy",
            "numRuns": "50"
        },
        {
            "milestones": [
                ["Reset", "Ascension", false],
                ["Event", "Womlings arrival", true],
                ["Built", "arpa", "launch_facility", "Launch Facility", 1, false],
                ["Built", "space", "world_controller", "Dwarf World Collider (Complete)", 1, false],
                ["Built", "interstellar", "s_gate", "Blackhole Stargate (Complete)", 1, true],
                ["Researched", "metaphysics", "Metaphysics", false],
                ["Built", "galaxy", "dreadnought", "Gateway Dreadnought", 1, false],
                ["Built", "interstellar", "space_elevator", "Sirius Space Elevator", 100, false],
                ["Built", "interstellar", "gravity_dome", "Sirius Gravity Dome", 100, false]
            ],
            "mode": "Segmented",
            "resetType": "Ascension",
            "universe": "heavy"
        }
    ]
}

function resetConfig() {
    localStorage.setItem("sneed.analytics.config", JSON.stringify(config));
}

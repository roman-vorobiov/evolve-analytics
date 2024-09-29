const config = {
    "version": 5,
    "recordRuns": true,
    "views": [
        {
            "resetType": "ascend",
            "universe": "heavy",
            "mode": "bars",
            "numRuns": 50,
            "milestones": {
                "built:arpa-launch_facility:1": true,
                "built:space-world_controller:1": true,
                "built:interstellar-s_gate:1": true,
                "tech:metaphysics": true,
                "built:galaxy-dreadnought:1": true,
                "built:interstellar-space_elevator:100": true,
                "built:interstellar-gravity_dome:100": true,
                "event:womlings": true,
                "reset:ascend": true
            },
            "additionalInfo": [
                "raceName"
            ]
        },
        {
            "resetType": "ascend",
            "universe": "heavy",
            "mode": "segmented",
            "milestones": {
                "reset:ascend": false,
                "event:womlings": true,
                "built:arpa-launch_facility:1": false,
                "built:space-world_controller:1": false,
                "built:interstellar-s_gate:1": true,
                "tech:metaphysics": false,
                "built:galaxy-dreadnought:1": false,
                "built:interstellar-space_elevator:100": false,
                "built:interstellar-gravity_dome:100": false
            },
            "additionalInfo": []
        }
    ]
};

function resetConfig() {
    localStorage.setItem("sneed.analytics.config", JSON.stringify(config));
}


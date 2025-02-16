const config = {
    "version": 11,
    "recordRuns": true,
    "views": [
        {
            "resetType": "eden",
            "universe": "antimatter",
            "includeCurrentRun": true,
            "mode": "timestamp",
            "showBars": true,
            "showLines": false,
            "fillArea": false,
            "smoothness": 0,
            "milestones": {
                "built:tauceti-ringworld:1": true,
                "built:tauceti-alien_space_station:1": true,
                "tech:system_survey": true,
                "built:tauceti-infectious_disease_lab:1": true,
                "reset:eden": true,
                "built:tauceti-womling_lab:1": true,
                "tech:tau_manufacturing": true,
                "effect:hot": true,
                "effect:cold": false,
                "effect:inspired": true
            },
            "additionalInfo": [],
            "numRuns": 20,
            "milestoneColors": {
                "reset:eden": "#4269d0",
                "built:tauceti-ringworld:1": "#efb118",
                "built:tauceti-alien_space_station:1": "#ff725c",
                "tech:system_survey": "#6cc5b0",
                "built:tauceti-infectious_disease_lab:1": "#3ca951",
                "built:tauceti-womling_lab:1": "#ff8ab7",
                "tech:tau_manufacturing": "#a463f2",
                "effect:hot": "#ff725c",
                "effect:cold": "#4269d0",
                "effect:inspired": "#3ca951"
            }
        }
    ],
    "lastOpenViewIndex": 2
}

function resetConfig() {
    localStorage.setItem("sneed.analytics.config", JSON.stringify(config));
}

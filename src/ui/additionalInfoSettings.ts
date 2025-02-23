import { additionalInformation } from "../enums";
import { makeCheckbox, makeFlexContainer } from "./components";
import type { View } from "../config";

export function makeAdditionalInfoSettings(view: View) {
    const container = makeFlexContainer("row")
        .css("margin-bottom", "1em");

    container.append(`<span>Additional info:</span>`);

    const showCurrentRunToggle = makeCheckbox("Current run", view.includeCurrentRun ?? false, (value) => {
        view.includeCurrentRun = value;
    });
    container.append(showCurrentRunToggle);

    for (const [key, value] of Object.entries(additionalInformation)) {
        const enabled = view.additionalInfo.includes(key as any);
        container.append(makeCheckbox(value, enabled, () => { view.toggleAdditionalInfo(key as any); }));
    }

    return container;
}

import { additionalInformation } from "../enums";
import { makeCheckbox } from "./utils";
import type { View } from "../config";

export function makeAdditionalInfoSettings(view: View) {
    const node = $(`<div style="display: flex; flex-direction: row; gap: 8px"></div>`);

    node.append(`<span>Additional Info:</span>`);

    for (const [key, value] of Object.entries(additionalInformation)) {
        const enabled = view.additionalInfo.includes(key as any);
        node.append(makeCheckbox(value, enabled, () => { view.toggleAdditionalInfo(key as any); }));
    }

    return node;
}

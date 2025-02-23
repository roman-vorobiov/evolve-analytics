export function makeFlexContainer(direction: "row" | "column") {
    return $(`<div class="flex-container" style="flex-direction: ${direction};"></div>`);
}

import htmlToImage from "html-to-image";

const scale = 2;

function context2d(width: number, height: number, canvasWidth?: number, canvasHeight?: number) {
    canvasWidth ??= width;
    canvasHeight ??= height;

    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    canvas.style.width = canvasWidth + "px";
    canvas.style.height = canvasHeight + "px";

    const context = canvas.getContext("2d");
    context!.scale(scale, scale);

    return context!;
}

async function graphToCanvas(plot: SVGSVGElement, backgroundColor: string): Promise<HTMLCanvasElement> {
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

    const offsetX = 5;

    const canvasWidth = $(plot).width()!;
    const canvasHeight = $(plot).height()!;

    const { width, height } = plot.viewBox.baseVal;
    const context = context2d(width + offsetX * 2, height, canvasWidth, canvasHeight);

    const im = new Image();
    im.width = width + offsetX * 2;
    im.height = height;

    $(plot).attr("xmlns", "http://www.w3.org/2000/svg");

    const idx = -"</svg>".length;
    im.src = "data:image/svg+xml," + encodeURIComponent(plot.outerHTML.slice(0, idx) + style + plot.outerHTML.slice(idx));

    return new Promise((resolve) => {
        im.onload = () => {
            context.drawImage(im, offsetX, 0, width, height);
            resolve(context.canvas);
        };
    });
}

async function legendToCanvas(legend: HTMLElement, backgroundColor: string): Promise<HTMLCanvasElement> {
    const width = $(legend).width()!;
    const height = $(legend).height()!;

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

export async function plotToCanvas(plot: SVGSVGElement, legend: HTMLElement): Promise<HTMLCanvasElement> {
    const backgroundColor = $("html").css("background-color");

    const legendCanvas = await legendToCanvas(legend, backgroundColor);
    const graphCanvas = await graphToCanvas(plot, backgroundColor);

    const offsetY = 10;
    const gapY = 10;

    const legendHeight = parseFloat(legendCanvas.style.height);
    const graphHeight = parseFloat(graphCanvas.style.height);
    const height = legendHeight + graphHeight + offsetY + gapY;
    const width = parseFloat(legendCanvas.style.width);

    const context = context2d(width, height);

    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);

    context.drawImage(legendCanvas, 0, offsetY, width, legendHeight);
    context.drawImage(graphCanvas, 0, legendHeight + offsetY + gapY, width, graphHeight);

    return context.canvas;
}

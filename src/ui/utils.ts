export function waitFor(query: any): Promise<JQuery> {
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

export async function nextAnimationFrame() {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
        });
    });
}

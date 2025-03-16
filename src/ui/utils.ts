export function waitFor(query: string | string[]): Promise<JQuery> {
    let count = 1;
    if (Array.isArray(query)) {
        count = query.length;
        query = query.join(", ");
    }

    return new Promise(resolve => {
        const node = $(query);
        if (node.length === count) {
            resolve(node);
        }

        const observer = new MutationObserver(() => {
            const node = $(query);
            if (node.length === count) {
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

export function monitor(query: string, parent: JQuery, callback: (node: JQuery) => void) {
    const nodes = $(parent).find(query);
    if (nodes.length !== 0) {
        callback(nodes);
    }

    const observer = new MutationObserver((changes) => {
        for (const { addedNodes } of changes) {
            const nodes = $(addedNodes).find(query);
            if (nodes.length !== 0) {
                callback(nodes);
            }
        }
    });

    for (const node of parent) {
        observer.observe(node, {
            childList: true,
            subtree: true
        });
    }
}

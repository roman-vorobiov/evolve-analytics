declare var unsafeWindow: any;

function synchronize() {
    const win = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;

    return new Promise(resolve => {
        function impl() {
            if (win.evolve?.global?.stats !== undefined) {
                resolve(win.evolve);
            }
            else {
                setTimeout(impl, 100);
            }
        }

        impl();
    });
}

export const game: any = await synchronize();

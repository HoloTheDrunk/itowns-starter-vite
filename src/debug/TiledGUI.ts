import GUI from 'lil-gui';

import type { PlanarLayer, View } from 'itowns';

interface TiledGUIOptions {
    autoPlace?: boolean;
    container?: HTMLElement;
    width?: number;
    title?: string;
    closeFolders?: boolean;
    injectStyles?: boolean;
    touchStyles?: number;
    parent?: GUI;
}

export class PlanarGUI extends GUI {
    constructor(view: View, layer: PlanarLayer, options: TiledGUIOptions) {
        super(options);

        const update = () => view.notifyChange(layer, true);
        this.add(layer, 'opacity', 0, 1)
            .name('opacity')
            .onChange(update);
    }
}
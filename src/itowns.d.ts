import {
    Extent,
    Source,
    PointCloudLayer,
    PNTS_SHAPE,
} from 'itowns';

// Declaration file of non-released features of iTowns

declare module 'itowns' {
    interface CopcSourceOptions {
        url: string;
        colorDepth?: 8 | 16 | "auto";
    }

    interface CopcParsingOptions {
        in?: {
            colorDepth?: 8 | 16;
        };
    }

    export class CopcSource extends Source {
        constructor(options: CopcSourceOptions);

        fetcher: (url: string, options?: RequestInit) => Promise<ArrayBuffer>;
        parse: (buffer: ArrayBuffer, options: CopcParsingOptions) => Promise<THREE.BufferGeometry>;

        whenReady: Promise<CopcSource>;

        extentInsideLimit(extent: Extent, zoom: number): boolean;
        urlFromExtent(extent: Extent): string;
    }

    interface CopcLayerOptions {
        source: CopcSource,
        crs: string;
        sseThreshold?: number,
        pointBudget?: number;
        material?: {
            minAttenuatedSize?: number;
            maxAttenuatedSize?: number;
            shape: PNTS_SHAPE;
        };
        mode?: PNTS_MODE;
    }

    export class CopcLayer extends PointCloudLayer {
        constructor(id: string, config: CopcLayerOptions);

        readonly isEntwinePointTileLayer: boolean;

        root: /* CopcNode */ unknown;
        extent: Extent;

        get spacing(): number;
    }

    export enum PNTS_MODE {
        ELEVATION = 3,
        RETURN_NUMBER = 4,
        RETURN_TYPE = 5,
        RETURN_COUNT = 6,
        POINT_SOURCE_ID = 7,
        SCAN_ANGLE = 8,
    }
}

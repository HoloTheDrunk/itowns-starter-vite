import { graph, CRS, CopcSource, ColorLayer, CopcLayer, ElevationLayer, Extent, PNTS_SHAPE, PlanarView, PointCloudLayer, PointsMaterial, View, WMSSource } from 'itowns';
import { PointCloudGUI } from './debug/PointCloudGUI';
import { OrthographicCamera, Vector3 } from 'three';
import GUI from 'lil-gui';
import { PlanarGUI } from './debug/TiledGUI';
import { RasterGUI } from './debug/RasterGUI';
import EDLPassNode from './addons/nodes/EDLPassNode';
import { LazyStaticKernelNode } from './addons/nodes/KernelNode';

const G = new graph.Graph();

/**
 * Replace IGN's LiDAR URL by a proxy one due to CORS issues.
 * @param url - COPC URL
 */
function fixUrl(url: string): string {
    return url.replace(
        'https://storage.sbg.cloud.ovh.net/v1/AUTH_63234f509d6048bca3c9fd7928720ca1/ppk-lidar',
        'https://dl-lidar.ign.fr/ppk-lidar'
    );
}

function buildSource(url: string): Promise<CopcSource> {
    const networkOptions: RequestInit = {
        cache: 'force-cache',
    };

    const source = new CopcSource({
        // @ts-expect-error typing file is not up to date
        networkOptions,
        crs: 'EPSG:2154',
        url: fixUrl(url),
    });

    return source.whenReady;
}

function initView(): PlanarView {
    const view = new graph.PlanarViewNode(
        { node: G.get('viewerDiv')!, output: graph.InputNode.defaultIoName },
        { node: G.get('placement')!, output: graph.InputNode.defaultIoName },
    );

    G.set({ view });

    return view.getOutput('view');
}

function setupInputs(extent: Extent) {
    G.set({ viewerDiv: new graph.InputNode(document.getElementById('viewerDiv') as HTMLDivElement, graph.BuiltinType.HtmlDivElement) });
    G.set({ placement: new graph.InputNode(extent, graph.BuiltinType.Placement) });
}

function onLayerReady(view: View, layer: PointCloudLayer) {
    const camera = view.camera.camera3D as OrthographicCamera;

    const lookAt = new Vector3();
    const size = new Vector3();
    const root = layer.root;

    root.bbox.getSize(size);
    root.bbox.getCenter(lookAt);

    camera.far = 2.0 * size.length();

    const position = root.bbox.min.clone().add(
        size.multiply(new Vector3(1, 1, size.x / size.z)),
    );

    camera.position.copy(position);
    camera.lookAt(lookAt);
    camera.updateProjectionMatrix();

    view.notifyChange(camera);
}

function setupRasterLayer(view: PlanarView, extent: Extent, gui?: GUI) {
    // Add a WMS elevation source
    const wmsElevationSource = new WMSSource({
        extent,
        url: 'https://data.geopf.fr/wms-r',
        name: 'ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES',
        crs: 'EPSG:2154',
        width: 256,
        format: 'image/x-bil;bits=32',
    });

    // Add a WMS elevation layer
    const wmsElevationLayer = new ElevationLayer('wms_elevation', {
        source: wmsElevationSource,
    });

    // Add a WMS imagery source
    const wmsOrthoSource = new WMSSource({
        extent: extent,
        url: 'https://data.geopf.fr/wms-r',
        name: 'ORTHOIMAGERY.ORTHOPHOTOS',
        crs: 'EPSG:2154',
        width: 256,
        format: 'image/png',
    });

    const orthoLayer = new ColorLayer('wms_ortho', {
        source: wmsOrthoSource,
    });

    // Add a WMS plan source
    const wmsPlanSource = new WMSSource({
        extent: extent,
        url: 'https://data.geopf.fr/wms-r',
        name: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
        crs: 'EPSG:2154',
        width: 256,
        format: 'image/png',
    });

    const planLayer = new ColorLayer('wms_plan', {
        source: wmsPlanSource,
    });

    view.addLayer(wmsElevationLayer);
    view.addLayer(planLayer);
    view.addLayer(orthoLayer);

    new RasterGUI(view, orthoLayer, {
        title: "Aerial Imagery",
        parent: gui,
    });

    new RasterGUI(view, planLayer, {
        title: "Plan IGN",
        parent: gui,
    });
}

export async function run(url: string) {
    CRS.defs('EPSG:2154', '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
    const source = await buildSource(url);

    // @ts-expect-error dynamic field (typing file is not up to date)
    setupInputs(source.extent);

    const view = initView();

    const guiState = {
        version() { },
    };
    const gui = new GUI({
        title: '3D Layers',
    });
    gui.add(guiState, 'version').name('19/04/2024 Build');

    const layer = new CopcLayer('COPC', {
        source,
        crs: view.referenceCrs,
        sseThreshold: 1,
        pointBudget: 3500000,
        material: {
            minAttenuatedSize: 2,
            maxAttenuatedSize: 7,
            shape: PNTS_SHAPE.CIRCLE,
        },
    }) as PointCloudLayer;

    (layer.material as PointsMaterial).mode = 2;
    (View.prototype.addLayer.call(view, layer) as Promise<PointCloudLayer>)
        .then(layer => onLayerReady(view, layer));
    new PointCloudGUI(view, layer, {
        title: layer.id,
        parent: gui,
    });
    const terrainGUI = new PlanarGUI(view, view.tileLayer, {
        title: "Terrain",
        parent: gui,
    });

    setupRasterLayer(
        view,
        // @ts-expect-error dynamic field
        source.extent,
        terrainGUI.addFolder('Layers')
    );

    G.set({ renderView: new graph.RenderViewNode(G.get('view')!.toDep('view')) });

    G.set({ kernelSize: new graph.InputNode(16, graph.BuiltinType.Number) });
    G.set({ kernelType: new graph.InputNode(graph.KernelType.EDL, graph.BuiltinType.KernelType) });
    G.set({ kernel: new LazyStaticKernelNode(G.get('kernelSize')!.toDep(), G.get('kernelType')!.toDep()) });
    G.set({
        edlPass: new EDLPassNode(
            G.get('renderView')!.toDep(), G.get('view')!.toDep('renderer'), 16, view.camera.camera3D,
            {
                kernel: G.get('kernel')!.toDep(),
            },
            true,
        )
    });

    let frame = 0;
    view.render = function render() {
        G.getOutput(frame++, G.get('edlPass')!);
        // Reach cruising speed before dumping so timing information is accurate
        if (frame == 100) {
            window.open(G.dumpDotGraphvizLink(), '_blank', 'popup');
        }
    };
}

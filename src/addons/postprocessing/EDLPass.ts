import {
    Color,
    DepthStencilFormat,
    DepthTexture,
    HalfFloatType,
    NoBlending,
    ShaderMaterial,
    UnsignedInt248Type,
    WebGLRenderTarget,
} from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { EDLShader } from '../materials/EDLShader';

import type {
    ColorRepresentation,
    Material,
    OrthographicCamera,
    PerspectiveCamera,
    WebGLRenderer,
} from 'three';

function generateVectors(kernelSize: number): Float32Array {
    const kernel = new Float32Array(kernelSize * 2);

    for (let i = 0; i < kernelSize; ++i) {
        const rotation = 2 * i + Math.PI / kernelSize;
        kernel[ i * 2 + 0 ] = Math.cos( rotation );
        kernel[ i * 2 + 1 ] = Math.sin( rotation );
    }

    return kernel;
}

// Algorithm by Christian Boucheny. See:
// - Phd thesis (page 115-127, french):
//   https://tel.archives-ouvertes.fr/tel-00438464/document
// - Implementation in Cloud Compare (last update 2022):
//   https://github.com/CloudCompare/CloudCompare/tree/master/plugins/core/GL/qEDL/shaders/EDL
// Parameters by Markus Schuetz (Potree). See:
// - Master thesis (pages 38-41):
//   https://www.cg.tuwien.ac.at/research/publications/2016/SCHUETZ-2016-POT/SCHUETZ-2016-POT-thesis.pdf
// - Implementation in Potree (last update 2019):
//   https://github.com/potree/potree/blob/develop/src/materials/shaders/edl.fs

type CameraLike = PerspectiveCamera | OrthographicCamera;

class EDLPass extends Pass {
    width: number;
    height: number;
    camera: CameraLike;
    // kernelRadius: number; TODO
    edlMaterial: ShaderMaterial;
    private _kernel: Float32Array;
    private _fsQuad: FullScreenQuad;

    constructor(camera: CameraLike, width: number, height: number, kernelSize = 16) {
        super();

        this.width = width ?? 512;
        this.height = height ?? 512;

        this.clear = true;

        this.camera = camera;

        this._kernel = generateVectors(kernelSize);

        // edl material
        this.edlMaterial = new EDLShader({
            blending: NoBlending,
        });

        this.edlMaterial.defines.KERNEL_SIZE = kernelSize;

        const uniforms = this.edlMaterial.uniforms;
        uniforms.kernel.value = this._kernel;
        uniforms.resolution.value.set(this.width, this.height);
        uniforms.cameraNear.value = this.camera.near;
        uniforms.cameraFar.value = this.camera.far;

        this._fsQuad = new FullScreenQuad();
    }

    override setSize(width: number, height: number) {
        this.width = width;
        this.height = height;

        this.edlMaterial.uniforms.resolution.value.set(width, height);
    }

    override render(
        renderer: WebGLRenderer,
        writeBuffer: WebGLRenderTarget,
        readBuffer: WebGLRenderTarget
    ) {
        this.edlMaterial.uniforms.tDepth.value = readBuffer.depthTexture;
        this.edlMaterial.uniforms.tDiffuse.value = readBuffer.texture;

        renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
        
        this._fsQuad.material = this.edlMaterial;
        this._fsQuad.render(renderer);
    }

    dispose() {
        this._fsQuad.dispose();
    }

}

export { EDLPass };

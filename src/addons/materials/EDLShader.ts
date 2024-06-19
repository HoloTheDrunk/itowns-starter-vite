import { ShaderMaterial, Vector2 } from 'three';
import vertexShader from './edlshader.vs.glsl';
import fragmentShader from './edlshader.fs.glsl'

import type { IUniform, ShaderMaterialParameters, Texture } from 'three';

export interface EDLShaderParameter extends ShaderMaterialParameters {
    uniforms?: {
        tDepth?: IUniform<Texture>,
        tDiffuse?: IUniform<Texture>,
        kernel?: IUniform, // TODO
        cameraNear?: IUniform<number>,
        cameraFar?: IUniform<number>,
        resolution?: IUniform<Vector2>
    },
    defines?: {
        KERNEL_SIZE?: number,
    },
}

export class EDLShader extends ShaderMaterial {
    constructor(params: EDLShaderParameter) {
        const {
            uniforms,
            defines,
            ...rest
        } = params;

        super({
            uniforms: {
                tDepth: { value: null },
                tDiffuse: { value: null },
                kernel: { value: null },
                cameraNear: { value: null },
                cameraFar: { value: null },
                resolution: { value: new Vector2() },
                ...uniforms,
            },
            vertexShader,
            fragmentShader,
            ...rest,
        });

        this.defines = {
            KERNEL_SIZE: defines?.KERNEL_SIZE ?? 8,
        };
    }
}

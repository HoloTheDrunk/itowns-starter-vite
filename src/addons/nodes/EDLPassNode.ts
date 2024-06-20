import { graph, } from 'itowns';
import { OrthographicCamera } from 'three';

// TODO: add depth, resolution, cameraNear and cameraFar fields to ScreenShaderNode shaders by default
// also split ScreenShaderNode _apply into multiple functions to allow for better composition in inheriting classes
export default class EDLPassNode extends graph.ScreenShaderNode {
    constructor(
        target: graph.Dependency,
        renderer: graph.Dependency,
        kernelSize: number,
        camera: OrthographicCamera,
        uniforms: {
            kernel: graph.Dependency,
        } & { [name: string]: graph.Dependency },
        toScreen: boolean = false
    ) {
        super(target, renderer, {
            fragmentShaderParts: {
                includes: ['common', 'packing'],
                defines: { KERNEL_SIZE: kernelSize },
                uniforms,
                auxCode: /* glsl */`
uniform vec2 resolution;
uniform float cameraNear;
uniform float cameraFar;

uniform sampler2D tDepth;

uniform vec2 kernel[KERNEL_SIZE];

float getLinearDepth(const in vec2 screenPosition) {
    // TODO: orthographic support
    float fragCoordZ = texture2D(tDepth, screenPosition).x;
    float viewZ = perspectiveDepthToViewZ(fragCoordZ, cameraNear, cameraFar);
    return viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);
}

float shadow(float depth) {
    vec2 uvRadius = 1.0 / resolution;

    float sum = 0.0;

    vec2 uvNeighbour;
    float neighbourDepth;
    for (int i = 0; i < KERNEL_SIZE; ++i) {
        uvNeighbour = vUv + uvRadius * kernel[i];
        neighbourDepth = getLinearDepth(uvNeighbour);

        sum += max(0.0, depth - neighbourDepth);
    }

    return sum / float(KERNEL_SIZE);
}
`,
                main: /* glsl */`
float depth = getLinearDepth(vUv);
float res = shadow(depth);

float edl = exp(-300. * res * 6000.);

int val = int(mod(dot(vUv, resolution), float(KERNEL_SIZE)));
vec2 got = kernel[val];

// return vec4(edl, 0., 0., tex.a);
return vec4(tex.rgb * edl, tex.a);
`,
            },
            toScreen
        });

        // HACK: Once we split View up into different nodes we can just have a lazystatic camera dependency
        graph.ScreenShaderNode._camera = camera;

        console.log(graph.ScreenShaderNode.buildFragmentShader(this.fragmentShaderParts));
    }
}

import { graph } from 'itowns';

function generateBoxKernel(kernelSize: number): Float32Array {
    const kernel = new Float32Array(kernelSize);

    for (let i = 0; i < kernelSize; i++) {
        kernel[i] = 1 / kernelSize;
    }

    return kernel;
}

function generateEDLKernel(kernelSize: number): Float32Array {
    const kernel = new Float32Array(kernelSize * 2);

    for (let i = 0; i < kernelSize; ++i) {
        const rotation = 2 * i + Math.PI / kernelSize;
        kernel[i * 2 + 0] = Math.cos(rotation);
        kernel[i * 2 + 1] = Math.sin(rotation);
    }

    return kernel;
}

function generateKernel(kernelType: graph.KernelType, kernelSize: number): Float32Array {
    switch (kernelType) {
        case graph.KernelType.Box:
            return generateBoxKernel(kernelSize);
        case graph.KernelType.EDL:
            return generateEDLKernel(kernelSize);
        default:
            throw new Error('Unknown kernel type');
    }
}

// TODO: consider making laziness a setting of ProcessorNode instead of a different node type

export class KernelNode extends graph.ProcessorNode {
    constructor(kernelSize: graph.Dependency, kernelType: graph.Dependency) {
        super(
            {
                kernelSize: [kernelSize, graph.BuiltinType.Number],
                kernelType: [kernelType, graph.BuiltinType.KernelType],
            },
            graph.BuiltinType.Float32Array,
            (_frame: number, args: { [name: string]: unknown }) => {
                const kernelType = args.kernelType as graph.KernelType;
                const kernelSize = args.kernelSize as number;

                const kernel = generateKernel(kernelType, kernelSize);

                this._out.outputs.set(KernelNode.defaultIoName, [kernel, graph.BuiltinType.Float32Array]);
            }
        );
    }
}

export class LazyStaticKernelNode extends graph.LazyStaticNode {
    constructor(kernelSize: graph.Dependency, kernelType: graph.Dependency) {
        super(
            {
                kernelSize: [kernelSize, graph.BuiltinType.Number],
                kernelType: [kernelType, graph.BuiltinType.KernelType],
            },
            graph.BuiltinType.Float32Array,
            (_frame: number, args: { [name: string]: unknown }) => {
                const kernelType = args.kernelType as graph.KernelType;
                const kernelSize = args.kernelSize as number;

                const kernel = generateKernel(kernelType, kernelSize);

                this._out.outputs.set(KernelNode.defaultIoName, [kernel, graph.BuiltinType.Float32Array]);
            }
        )
    }
}

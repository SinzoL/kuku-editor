// WebAssembly 网格优化模块的 TypeScript 接口

export interface OptimizationResult {
  vertices: Float32Array
  indices: Uint32Array
  processingTime: number
  originalVertexCount: number
  optimizedVertexCount: number
  reductionRatio: number
}

export interface NormalsResult {
  normals: Float32Array
  processingTime: number
}

export interface MatrixResult {
  result: Float32Array
  processingTime: number
}


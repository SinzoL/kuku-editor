// WebAssembly 模块加载器
import { type OptimizationResult, type NormalsResult, type MatrixResult } from '@/wasm/meshOptimizer'

export interface WasmModule {
  MeshOptimizer: any
  ready: Promise<void>
}

export { type OptimizationResult, type NormalsResult, type MatrixResult }

let wasmModule: WasmModule | null = null
let loadingPromise: Promise<WasmModule> | null = null

/**
 * 加载 WebAssembly 模块
 */
export async function loadWasmModule(): Promise<WasmModule> {
  // 如果已经加载，直接返回
  if (wasmModule) {
    return wasmModule
  }
  
  // 如果正在加载，等待加载完成
  if (loadingPromise) {
    return loadingPromise
  }
  
  // 开始加载
  loadingPromise = loadWasmModuleInternal()
  wasmModule = await loadingPromise
  
  return wasmModule
}

/**
 * 内部加载函数
 */
async function loadWasmModuleInternal(): Promise<WasmModule> {
  console.log('🔄 开始加载 WebAssembly 模块...')
  
  // 同时加载 WASM 文件和 JS 胶水代码
  const [wasmResponse, jsResponse] = await Promise.all([
    fetch('/wasm/mesh_optimizer.wasm'),
    fetch('/wasm/mesh_optimizer.js')
  ])
  
  if (!wasmResponse.ok) {
    throw new Error('WASM 文件不存在，请先构建 WebAssembly 模块')
  }
  
  if (!jsResponse.ok) {
    throw new Error('WASM JS 文件不存在，请先构建 WebAssembly 模块')
  }
  
  // 获取 WASM 二进制数据
  const wasmBinary = await wasmResponse.arrayBuffer()
  
  // 创建临时的模块 URL
  const jsBlob = await jsResponse.blob()
  const jsUrl = URL.createObjectURL(jsBlob)
  
  try {
    // 使用动态导入加载模块
    const moduleExports = await import(/* @vite-ignore */ jsUrl)
    const MeshOptimizerModule = moduleExports.default || moduleExports.MeshOptimizerModule
    
    if (!MeshOptimizerModule) {
      throw new Error('无法找到 MeshOptimizerModule 导出')
    }
    
    // 初始化模块，直接提供 WASM 二进制数据
    const module = await MeshOptimizerModule({
      wasmBinary: wasmBinary,
      locateFile: (path: string) => {
        // 如果请求的是 wasm 文件，返回空字符串（因为我们已经提供了 wasmBinary）
        if (path.endsWith('.wasm')) {
          return ''
        }
        return '/wasm/' + path
      }
    })
    
    console.log('✅ WebAssembly 模块加载成功')
    
    return {
      MeshOptimizer: module.MeshOptimizer,
      ready: Promise.resolve()
    }
  } finally {
    // 清理临时 URL
    URL.revokeObjectURL(jsUrl)
  }
}

/**
 * 获取已加载的模块（同步）
 */
export function getWasmModule(): WasmModule | null {
  return wasmModule
}

/**
 * 检查 WebAssembly 是否可用
 */
export function isWasmSupported(): boolean {
  return typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function'
}
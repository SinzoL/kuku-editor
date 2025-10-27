import { defineStore } from 'pinia'
import { ref } from 'vue'
import { loadWasmModule, isWasmSupported, type WasmModule } from '@/utils/wasmLoader'

export const useWasmStore = defineStore('wasm', () => {
  // 状态
  const isLoaded = ref(false)
  const statusText = ref('正在加载...')
  const module = ref<WasmModule | null>(null)
  const isWasmNative = ref(false) // 是否使用真实的 WASM

  // WebAssembly 初始化
  const initialize = async (): Promise<boolean> => {
    try {
      statusText.value = '正在加载 WebAssembly...'
      
      // 检查 WebAssembly 支持
      if (!isWasmSupported()) {
        throw new Error('浏览器不支持 WebAssembly')
      }
      
      console.log('🔍 检测到 WebAssembly 支持')
      isWasmNative.value = true
      
      // 加载 WASM 模块
      module.value = await loadWasmModule()
      
      isLoaded.value = true
      statusText.value = 'WebAssembly 已就绪'
      
      console.log('✅ WebAssembly 初始化完成')
      return true
      
    } catch (error) {
      console.error('❌ 模块初始化失败:', error)
      statusText.value = '加载失败'
      return false
    }
  }

  // 获取模块状态信息
  const getModuleInfo = () => {
    return {
      isLoaded: isLoaded.value,
      isNative: isWasmNative.value,
      statusText: statusText.value,
      hasModule: module.value !== null
    }
  }

  return {
    // 状态
    isLoaded,
    statusText,
    module,
    isWasmNative,
    
    // 方法
    initialize,
    getModuleInfo
  }
})
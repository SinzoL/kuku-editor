import { ref, computed, watch } from 'vue'
import { useEventBus, EditorEvents } from './useEventBus'

// 配置接口定义
export interface EditorConfig {
  // 渲染器配置
  renderer: {
    antialias: boolean
    shadowMapEnabled: boolean
    shadowMapType: 'BasicShadowMap' | 'PCFShadowMap' | 'PCFSoftShadowMap'
    pixelRatio: number
    gammaOutput: boolean
    toneMapping: 'NoToneMapping' | 'LinearToneMapping' | 'ReinhardToneMapping' | 'CineonToneMapping' | 'ACESFilmicToneMapping'
    toneMappingExposure: number
  }
  
  // 场景配置
  scene: {
    backgroundColor: string
    environmentIntensity: number
    fogEnabled: boolean
    fogColor: string
    fogNear: number
    fogFar: number
  }
  
  // 相机配置
  camera: {
    fov: number
    near: number
    far: number
    position: [number, number, number]
    target: [number, number, number]
  }
  
  // 控制器配置
  controls: {
    enableDamping: boolean
    dampingFactor: number
    enableZoom: boolean
    enableRotate: boolean
    enablePan: boolean
    autoRotate: boolean
    autoRotateSpeed: number
    minDistance: number
    maxDistance: number
    minPolarAngle: number
    maxPolarAngle: number
  }
  
  // 网格配置
  grid: {
    visible: boolean
    size: number
    divisions: number
    colorCenterLine: string
    colorGrid: string
    opacity: number
  }
  
  // 辅助器配置
  helpers: {
    axes: boolean
    grid: boolean
    stats: boolean
    wireframe: boolean
  }
  
  // 性能配置
  performance: {
    targetFPS: number
    enableFrustumCulling: boolean
    enableLOD: boolean
    maxDrawCalls: number
    enableInstancing: boolean
    enableOcclusion: boolean
    shadowMapSize: number
  }
  
  // 变换配置
  transform: {
    mode: 'translate' | 'rotate' | 'scale'
    space: 'world' | 'local'
    snap: boolean
    snapTranslate: number
    snapRotate: number
    snapScale: number
    size: number
    showX: boolean
    showY: boolean
    showZ: boolean
  }
  
  // 历史配置
  history: {
    maxSize: number
    enableAutoSave: boolean
    autoSaveInterval: number
  }
  
  // WASM配置
  wasm: {
    enableOptimization: boolean
    enableMeshSimplification: boolean
    enableTextureCompression: boolean
  }
  
  // 界面配置
  ui: {
    theme: 'dark' | 'light'
    language: 'zh-CN' | 'en-US'
    showWelcome: boolean
    panelSizes: {
      leftSidebar: number
      rightSidebar: number
    }
  }
  
  // 导入导出配置
  export: {
    format: 'gltf' | 'obj' | 'fbx'
    includeTextures: boolean
    includeAnimations: boolean
    compress: boolean
  }
}

// 默认配置
const DEFAULT_CONFIG: EditorConfig = {
  renderer: {
    antialias: true,
    shadowMapEnabled: true,
    shadowMapType: 'PCFSoftShadowMap',
    pixelRatio: Math.min(window.devicePixelRatio, 2),
    gammaOutput: true,
    toneMapping: 'ACESFilmicToneMapping',
    toneMappingExposure: 1.0
  },
  
  scene: {
    backgroundColor: '#1a1a1a',
    environmentIntensity: 1.0,
    fogEnabled: false,
    fogColor: '#ffffff',
    fogNear: 1,
    fogFar: 1000
  },
  
  camera: {
    fov: 75,
    near: 0.1,
    far: 1000,
    position: [20, 20, 20],
    target: [0, 0, 0]
  },
  
  controls: {
    enableDamping: true,
    dampingFactor: 0.05,
    enableZoom: true,
    enableRotate: true,
    enablePan: true,
    autoRotate: false,
    autoRotateSpeed: 2.0,
    minDistance: 0,
    maxDistance: Infinity,
    minPolarAngle: 0,
    maxPolarAngle: Math.PI
  },
  
  grid: {
    visible: true,
    size: 40,
    divisions: 40,
    colorCenterLine: '#ffffff',
    colorGrid: '#888888',
    opacity: 0.8
  },
  
  helpers: {
    axes: false,
    grid: true,
    stats: true,
    wireframe: false
  },
  
  performance: {
    targetFPS: 60,
    enableFrustumCulling: true,
    enableLOD: true,
    maxDrawCalls: 1000,
    enableInstancing: true,
    enableOcclusion: false,
    shadowMapSize: 2048
  },
  
  transform: {
    mode: 'translate',
    space: 'world',
    snap: false,
    snapTranslate: 1,
    snapRotate: Math.PI / 180 * 15, // 15度
    snapScale: 0.1,
    size: 0.8,
    showX: true,
    showY: true,
    showZ: true
  },
  
  history: {
    maxSize: 100,
    enableAutoSave: true,
    autoSaveInterval: 30000 // 30秒
  },
  
  wasm: {
    enableOptimization: true,
    enableMeshSimplification: true,
    enableTextureCompression: true
  },
  
  ui: {
    theme: 'dark',
    language: 'zh-CN',
    showWelcome: true,
    panelSizes: {
      leftSidebar: 300,
      rightSidebar: 300
    }
  },
  
  export: {
    format: 'gltf',
    includeTextures: true,
    includeAnimations: true,
    compress: false
  }
}

// 配置存储键
const CONFIG_STORAGE_KEY = 'kuku-editor-config'

export function useEditorConfig() {
  const { emit } = useEventBus()
  
  // 从本地存储加载配置
  const loadConfigFromStorage = (): EditorConfig => {
    try {
      const stored = localStorage.getItem(CONFIG_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // 合并默认配置和存储的配置
        return mergeConfig(DEFAULT_CONFIG, parsed)
      }
    } catch (error) {
      console.warn('Failed to load config from storage:', error)
    }
    return { ...DEFAULT_CONFIG }
  }
  
  // 深度合并配置对象
  const mergeConfig = (defaultConfig: any, userConfig: any): any => {
    const result = { ...defaultConfig }
    
    for (const key in userConfig) {
      if (userConfig[key] && typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
        result[key] = mergeConfig(defaultConfig[key] || {}, userConfig[key])
      } else {
        result[key] = userConfig[key]
      }
    }
    
    return result
  }
  
  // 响应式配置
  const config = ref<EditorConfig>(loadConfigFromStorage())
  
  // 保存配置到本地存储
  const saveConfigToStorage = () => {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config.value))
    } catch (error) {
      console.error('Failed to save config to storage:', error)
    }
  }
  
  // 监听配置变化并自动保存
  watch(config, () => {
    saveConfigToStorage()
    emit(EditorEvents.RENDERER_UPDATED, config.value)
  }, { deep: true })
  
  // 更新配置的便捷方法
  const updateConfig = <T extends keyof EditorConfig>(
    section: T,
    updates: Partial<EditorConfig[T]>
  ) => {
    config.value[section] = {
      ...config.value[section],
      ...updates
    }
  }
  
  // 重置配置
  const resetConfig = () => {
    config.value = { ...DEFAULT_CONFIG }
  }
  
  // 重置特定部分的配置
  const resetConfigSection = <T extends keyof EditorConfig>(section: T) => {
    config.value[section] = { ...DEFAULT_CONFIG[section] }
  }
  
  // 导出配置到文件
  const exportConfigToFile = () => {
    return {
      version: '1.0',
      timestamp: Date.now(),
      config: config.value
    }
  }
  
  // 导入配置
  const importConfig = (configData: any) => {
    try {
      if (configData.config) {
        config.value = mergeConfig(DEFAULT_CONFIG, configData.config)
        return true
      }
    } catch (error) {
      console.error('Failed to import config:', error)
    }
    return false
  }
  
  // 获取配置的计算属性
  const rendererConfig = computed(() => config.value.renderer)
  const sceneConfig = computed(() => config.value.scene)
  const cameraConfig = computed(() => config.value.camera)
  const controlsConfig = computed(() => config.value.controls)
  const gridConfig = computed(() => config.value.grid)
  const helpersConfig = computed(() => config.value.helpers)
  const performanceConfig = computed(() => config.value.performance)
  const transformConfig = computed(() => config.value.transform)
  const historyConfig = computed(() => config.value.history)
  const wasmConfig = computed(() => config.value.wasm)
  const uiConfig = computed(() => config.value.ui)
  const exportConfig = computed(() => config.value.export)
  
  // 配置验证
  const validateConfig = (configToValidate: any): boolean => {
    // 这里可以添加配置验证逻辑
    return true
  }
  
  return {
    // 响应式配置
    config,
    
    // 分段配置
    rendererConfig,
    sceneConfig,
    cameraConfig,
    controlsConfig,
    gridConfig,
    helpersConfig,
    performanceConfig,
    transformConfig,
    historyConfig,
    wasmConfig,
    uiConfig,
    exportConfig,
    
    // 方法
    updateConfig,
    resetConfig,
    resetConfigSection,
    exportConfigToFile,
    importConfig,
    validateConfig,
    
    // 常量
    DEFAULT_CONFIG
  }
}
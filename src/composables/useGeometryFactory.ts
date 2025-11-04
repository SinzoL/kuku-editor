import * as THREE from 'three'
import { ref, computed } from 'vue'
import { useEventBus, EditorEvents } from './useEventBus'

// 几何体参数接口
export interface GeometryParams {
  [key: string]: any
}

// 几何体配置接口
export interface GeometryConfig {
  type: string
  name: string
  icon: string
  category: 'basic' | 'advanced' | 'custom'
  description: string
  params: GeometryParams
  paramDefinitions: GeometryParamDefinition[]
  createGeometry: (params: GeometryParams) => THREE.BufferGeometry
  validateParams?: (params: GeometryParams) => boolean
}

// 参数定义接口
export interface GeometryParamDefinition {
  key: string
  label: string
  type: 'number' | 'integer' | 'boolean' | 'select' | 'color' | 'vector3'
  default: any
  min?: number
  max?: number
  step?: number
  options?: Array<{ label: string; value: any }>
  description?: string
  group?: string
}

// 预定义几何体配置
const GEOMETRY_CONFIGS: Record<string, GeometryConfig> = {
  box: {
    type: 'box',
    name: '立方体',
    icon: 'BoxIcon',
    category: 'basic',
    description: '创建一个立方体几何体',
    params: {
      width: 1,
      height: 1,
      depth: 1,
      widthSegments: 1,
      heightSegments: 1,
      depthSegments: 1
    },
    paramDefinitions: [
      {
        key: 'width',
        label: '宽度',
        type: 'number',
        default: 1,
        min: 0.01,
        max: 100,
        step: 0.1,
        group: '尺寸'
      },
      {
        key: 'height',
        label: '高度',
        type: 'number',
        default: 1,
        min: 0.01,
        max: 100,
        step: 0.1,
        group: '尺寸'
      },
      {
        key: 'depth',
        label: '深度',
        type: 'number',
        default: 1,
        min: 0.01,
        max: 100,
        step: 0.1,
        group: '尺寸'
      },
      {
        key: 'widthSegments',
        label: '宽度分段',
        type: 'integer',
        default: 1,
        min: 1,
        max: 100,
        group: '分段'
      },
      {
        key: 'heightSegments',
        label: '高度分段',
        type: 'integer',
        default: 1,
        min: 1,
        max: 100,
        group: '分段'
      },
      {
        key: 'depthSegments',
        label: '深度分段',
        type: 'integer',
        default: 1,
        min: 1,
        max: 100,
        group: '分段'
      }
    ],
    createGeometry: (params) => new THREE.BoxGeometry(
      params.width,
      params.height,
      params.depth,
      params.widthSegments,
      params.heightSegments,
      params.depthSegments
    )
  },

  sphere: {
    type: 'sphere',
    name: '球体',
    icon: 'SphereIcon',
    category: 'basic',
    description: '创建一个球体几何体',
    params: {
      radius: 0.5,
      widthSegments: 32,
      heightSegments: 16,
      phiStart: 0,
      phiLength: Math.PI * 2,
      thetaStart: 0,
      thetaLength: Math.PI
    },
    paramDefinitions: [
      {
        key: 'radius',
        label: '半径',
        type: 'number',
        default: 0.5,
        min: 0.01,
        max: 50,
        step: 0.1,
        group: '尺寸'
      },
      {
        key: 'widthSegments',
        label: '水平分段',
        type: 'integer',
        default: 32,
        min: 3,
        max: 100,
        group: '分段'
      },
      {
        key: 'heightSegments',
        label: '垂直分段',
        type: 'integer',
        default: 16,
        min: 2,
        max: 100,
        group: '分段'
      },
      {
        key: 'phiStart',
        label: '水平起始角',
        type: 'number',
        default: 0,
        min: 0,
        max: Math.PI * 2,
        step: 0.1,
        group: '角度'
      },
      {
        key: 'phiLength',
        label: '水平扫描角',
        type: 'number',
        default: Math.PI * 2,
        min: 0,
        max: Math.PI * 2,
        step: 0.1,
        group: '角度'
      },
      {
        key: 'thetaStart',
        label: '垂直起始角',
        type: 'number',
        default: 0,
        min: 0,
        max: Math.PI,
        step: 0.1,
        group: '角度'
      },
      {
        key: 'thetaLength',
        label: '垂直扫描角',
        type: 'number',
        default: Math.PI,
        min: 0,
        max: Math.PI,
        step: 0.1,
        group: '角度'
      }
    ],
    createGeometry: (params) => new THREE.SphereGeometry(
      params.radius,
      params.widthSegments,
      params.heightSegments,
      params.phiStart,
      params.phiLength,
      params.thetaStart,
      params.thetaLength
    )
  },

  cylinder: {
    type: 'cylinder',
    name: '圆柱体',
    icon: 'CylinderIcon',
    category: 'basic',
    description: '创建一个圆柱体几何体',
    params: {
      radiusTop: 0.5,
      radiusBottom: 0.5,
      height: 1,
      radialSegments: 32,
      heightSegments: 1,
      openEnded: false,
      thetaStart: 0,
      thetaLength: Math.PI * 2
    },
    paramDefinitions: [
      {
        key: 'radiusTop',
        label: '顶部半径',
        type: 'number',
        default: 0.5,
        min: 0,
        max: 50,
        step: 0.1,
        group: '尺寸'
      },
      {
        key: 'radiusBottom',
        label: '底部半径',
        type: 'number',
        default: 0.5,
        min: 0,
        max: 50,
        step: 0.1,
        group: '尺寸'
      },
      {
        key: 'height',
        label: '高度',
        type: 'number',
        default: 1,
        min: 0.01,
        max: 100,
        step: 0.1,
        group: '尺寸'
      },
      {
        key: 'radialSegments',
        label: '径向分段',
        type: 'integer',
        default: 32,
        min: 3,
        max: 100,
        group: '分段'
      },
      {
        key: 'heightSegments',
        label: '高度分段',
        type: 'integer',
        default: 1,
        min: 1,
        max: 100,
        group: '分段'
      },
      {
        key: 'openEnded',
        label: '开放端面',
        type: 'boolean',
        default: false,
        group: '选项'
      },
      {
        key: 'thetaStart',
        label: '起始角度',
        type: 'number',
        default: 0,
        min: 0,
        max: Math.PI * 2,
        step: 0.1,
        group: '角度'
      },
      {
        key: 'thetaLength',
        label: '扫描角度',
        type: 'number',
        default: Math.PI * 2,
        min: 0,
        max: Math.PI * 2,
        step: 0.1,
        group: '角度'
      }
    ],
    createGeometry: (params) => new THREE.CylinderGeometry(
      params.radiusTop,
      params.radiusBottom,
      params.height,
      params.radialSegments,
      params.heightSegments,
      params.openEnded,
      params.thetaStart,
      params.thetaLength
    )
  },

  torus: {
    type: 'torus',
    name: '圆环',
    icon: 'TorusIcon',
    category: 'basic',
    description: '创建一个圆环几何体',
    params: {
      radius: 0.5,
      tube: 0.2,
      radialSegments: 16,
      tubularSegments: 100,
      arc: Math.PI * 2
    },
    paramDefinitions: [
      {
        key: 'radius',
        label: '半径',
        type: 'number',
        default: 0.5,
        min: 0.01,
        max: 50,
        step: 0.1,
        group: '尺寸'
      },
      {
        key: 'tube',
        label: '管道半径',
        type: 'number',
        default: 0.2,
        min: 0.01,
        max: 10,
        step: 0.01,
        group: '尺寸'
      },
      {
        key: 'radialSegments',
        label: '径向分段',
        type: 'integer',
        default: 16,
        min: 2,
        max: 100,
        group: '分段'
      },
      {
        key: 'tubularSegments',
        label: '管道分段',
        type: 'integer',
        default: 100,
        min: 3,
        max: 200,
        group: '分段'
      },
      {
        key: 'arc',
        label: '弧度',
        type: 'number',
        default: Math.PI * 2,
        min: 0,
        max: Math.PI * 2,
        step: 0.1,
        group: '角度'
      }
    ],
    createGeometry: (params) => new THREE.TorusGeometry(
      params.radius,
      params.tube,
      params.radialSegments,
      params.tubularSegments,
      params.arc
    )
  },

  plane: {
    type: 'plane',
    name: '平面',
    icon: 'PlaneIcon',
    category: 'basic',
    description: '创建一个平面几何体',
    params: {
      width: 1,
      height: 1,
      widthSegments: 1,
      heightSegments: 1
    },
    paramDefinitions: [
      {
        key: 'width',
        label: '宽度',
        type: 'number',
        default: 1,
        min: 0.01,
        max: 100,
        step: 0.1,
        group: '尺寸'
      },
      {
        key: 'height',
        label: '高度',
        type: 'number',
        default: 1,
        min: 0.01,
        max: 100,
        step: 0.1,
        group: '尺寸'
      },
      {
        key: 'widthSegments',
        label: '宽度分段',
        type: 'integer',
        default: 1,
        min: 1,
        max: 100,
        group: '分段'
      },
      {
        key: 'heightSegments',
        label: '高度分段',
        type: 'integer',
        default: 1,
        min: 1,
        max: 100,
        group: '分段'
      }
    ],
    createGeometry: (params) => new THREE.PlaneGeometry(
      params.width,
      params.height,
      params.widthSegments,
      params.heightSegments
    )
  }
}

export function useGeometryFactory() {
  const { emit } = useEventBus()
  
  const availableGeometries = computed(() => Object.values(GEOMETRY_CONFIGS))
  const basicGeometries = computed(() => 
    availableGeometries.value.filter(g => g.category === 'basic')
  )
  const advancedGeometries = computed(() => 
    availableGeometries.value.filter(g => g.category === 'advanced')
  )
  
  // 获取几何体配置
  const getGeometryConfig = (type: string): GeometryConfig | null => {
    return GEOMETRY_CONFIGS[type] || null
  }
  
  // 创建几何体
  const createGeometry = (type: string, params?: GeometryParams): THREE.BufferGeometry | null => {
    const config = getGeometryConfig(type)
    if (!config) {
      console.error(`Unknown geometry type: ${type}`)
      return null
    }
    
    const finalParams = { ...config.params, ...params }
    
    // 验证参数
    if (config.validateParams && !config.validateParams(finalParams)) {
      console.error(`Invalid parameters for geometry type: ${type}`)
      return null
    }
    
    try {
      const geometry = config.createGeometry(finalParams)
      geometry.userData = {
        type,
        params: finalParams,
        created: Date.now()
      }
      
      emit(EditorEvents.OBJECT_ADDED, {
        type: 'geometry',
        geometryType: type,
        params: finalParams
      })
      
      return geometry
    } catch (error) {
      console.error(`Failed to create geometry ${type}:`, error)
      return null
    }
  }
  
  // 更新几何体参数
  const updateGeometry = (
    geometry: THREE.BufferGeometry, 
    newParams: GeometryParams
  ): THREE.BufferGeometry | null => {
    const type = geometry.userData?.type
    if (!type) {
      console.error('Geometry missing type information')
      return null
    }
    
    return createGeometry(type, newParams)
  }
  
  // 注册自定义几何体
  const registerGeometry = (config: GeometryConfig) => {
    GEOMETRY_CONFIGS[config.type] = config
    
    emit(EditorEvents.OBJECT_ADDED, {
      type: 'geometry-registered',
      geometryType: config.type
    })
  }
  
  // 获取参数定义的分组
  const getParamGroups = (type: string): Record<string, GeometryParamDefinition[]> => {
    const config = getGeometryConfig(type)
    if (!config) return {}
    
    const groups: Record<string, GeometryParamDefinition[]> = {}
    
    config.paramDefinitions.forEach(param => {
      const group = param.group || '基本'
      if (!groups[group]) {
        groups[group] = []
      }
      groups[group].push(param)
    })
    
    return groups
  }
  
  // 验证参数值
  const validateParamValue = (
    paramDef: GeometryParamDefinition, 
    value: any
  ): { valid: boolean; error?: string } => {
    if (paramDef.type === 'number' || paramDef.type === 'integer') {
      const num = Number(value)
      if (isNaN(num)) {
        return { valid: false, error: '必须是数字' }
      }
      
      if (paramDef.min !== undefined && num < paramDef.min) {
        return { valid: false, error: `不能小于 ${paramDef.min}` }
      }
      
      if (paramDef.max !== undefined && num > paramDef.max) {
        return { valid: false, error: `不能大于 ${paramDef.max}` }
      }
      
      if (paramDef.type === 'integer' && !Number.isInteger(num)) {
        return { valid: false, error: '必须是整数' }
      }
    }
    
    return { valid: true }
  }
  
  // 获取几何体统计信息
  const getGeometryStats = (geometry: THREE.BufferGeometry) => {
    const position = geometry.attributes.position
    const index = geometry.index
    
    return {
      vertices: position ? position.count : 0,
      triangles: index ? index.count / 3 : (position ? position.count / 3 : 0),
      memoryUsage: geometry.userData?.memoryUsage || 0
    }
  }
  
  return {
    // 计算属性
    availableGeometries,
    basicGeometries,
    advancedGeometries,
    
    // 方法
    getGeometryConfig,
    createGeometry,
    updateGeometry,
    registerGeometry,
    getParamGroups,
    validateParamValue,
    getGeometryStats,
    
    // 常量
    GEOMETRY_CONFIGS
  }
}
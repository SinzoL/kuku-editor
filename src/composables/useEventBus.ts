import { ref, type Ref } from 'vue'

export type EventCallback = (...args: any[]) => void

interface EventBus {
  on(event: string, callback: EventCallback): void
  off(event: string, callback: EventCallback): void
  emit(event: string, ...args: any[]): void
  once(event: string, callback: EventCallback): void
}

class EditorEventBus implements EventBus {
  private events: Map<string, Set<EventCallback>> = new Map()

  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(callback)
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.events.delete(event)
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args)
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error)
        }
      })
    }
  }

  once(event: string, callback: EventCallback): void {
    const onceCallback = (...args: any[]) => {
      callback(...args)
      this.off(event, onceCallback)
    }
    this.on(event, onceCallback)
  }

  clear(): void {
    this.events.clear()
  }
}

// 全局事件总线实例
const eventBus = new EditorEventBus()

// 定义编辑器事件类型
export const EditorEvents = {
  // 几何体操作
  CREATE_GEOMETRY: 'geometry:create',
  OBJECT_CREATED: 'object:created',
  OBJECT_SELECTED: 'object:selected',
  OBJECT_DESELECTED: 'object:deselected',
  OBJECT_ADDED: 'object:added',
  OBJECT_REMOVED: 'object:removed',
  OBJECT_DELETED: 'object:deleted',
  OBJECT_CHANGED: 'object:changed',
  OBJECT_TRANSFORMED: 'object:transformed',
  OBJECT_RENAMED: 'object:renamed',
  
  // 选择操作
  SELECT_OBJECT: 'select:object',
  DESELECT_OBJECT: 'select:deselect',
  DELETE_OBJECT: 'delete:object',
  
  // 资源导入
  IMPORT_MODEL: 'resource:import-model',
  IMPORT_TEXTURE: 'resource:import-texture',
  ADD_RESOURCE_TO_SCENE: 'resource:add-to-scene',
  RESOURCE_IMPORTED: 'resource:imported',
  RESOURCE_ADDED_TO_SCENE: 'resource:added-to-scene',
  RESOURCE_LOADED: 'resource:loaded',
  RESOURCE_ERROR: 'resource:error',
  
  // 场景操作
  RESET_SCENE: 'scene:reset',
  EXPORT_SCENE: 'scene:export',
  SCENE_RESET: 'scene:reset-complete',
  SCENE_EXPORTED: 'scene:exported',
  SCENE_CLEARED: 'scene:cleared',
  SCENE_LOADED: 'scene:loaded',
  SCENE_SAVED: 'scene:saved',
  
  // 变换操作
  SET_TRANSFORM_MODE: 'transform:set-mode',
  TRANSFORM_MODE_CHANGED: 'transform:mode-changed',
  TRANSFORM_START: 'transform:start',
  TRANSFORM_END: 'transform:end',
  UPDATE_OBJECT_POSITION: 'transform:update-position',
  UPDATE_OBJECT_SCALE: 'transform:update-scale',
  UPDATE_OBJECT_NAME: 'transform:update-name',
  
  // 历史操作
  UNDO: 'history:undo',
  REDO: 'history:redo',
  HISTORY_CHANGED: 'history:changed',
  HISTORY_UNDO: 'history:undo-complete',
  HISTORY_REDO: 'history:redo-complete',
  
  // 性能优化
  OPTIMIZE_MESH: 'performance:optimize-mesh',
  MESH_OPTIMIZED: 'performance:mesh-optimized',
  UPDATE_PERFORMANCE_CONFIG: 'performance:update-config',
  PERFORMANCE_CONFIG_UPDATED: 'performance:config-updated',
  PERFORMANCE_UPDATED: 'performance:updated',
  
  // 系统状态
  EDITOR_STATE_UPDATED: 'editor:state-updated',
  LOADING_START: 'system:loading-start',
  LOADING_END: 'system:loading-end',
  ERROR_OCCURRED: 'system:error',
  
  // 渲染相关
  RENDERER_UPDATED: 'renderer:updated',
  VIEWPORT_RESIZED: 'viewport:resized',
  CANVAS_READY: 'canvas:ready',
  CANVAS_CLICK: 'canvas:click',
  
  // WASM相关
  WASM_LOADED: 'wasm:loaded',
  WASM_ERROR: 'wasm:error',
  
  // 配置相关
  CONFIG_LOADED: 'config:loaded',
  CONFIG_SAVED: 'config:saved',
  CONFIG_CHANGED: 'config:changed'
} as const

export function useEventBus() {
  return {
    eventBus,
    EditorEvents,
    
    // 便捷方法
    on: eventBus.on.bind(eventBus),
    off: eventBus.off.bind(eventBus),
    emit: eventBus.emit.bind(eventBus),
    once: eventBus.once.bind(eventBus)
  }
}

// 用于组件的响应式事件监听
export function useEventListener(event: string, callback: EventCallback) {
  const isListening = ref(false)
  
  const startListening = () => {
    if (!isListening.value) {
      eventBus.on(event, callback)
      isListening.value = true
    }
  }
  
  const stopListening = () => {
    if (isListening.value) {
      eventBus.off(event, callback)
      isListening.value = false
    }
  }
  
  // 自动清理
  const cleanup = () => {
    stopListening()
  }
  
  return {
    isListening,
    startListening,
    stopListening,
    cleanup
  }
}
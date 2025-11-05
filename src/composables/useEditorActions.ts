import { useEventBus, EditorEvents, type EventCallback } from './useEventBus'
import { useThreeEngine } from './useThreeEngine'

/**
 * 编辑器统一行为管理
 * 通过事件总线简化组件间通信
 */
export function useEditorActions() {
  const { emit, on, off } = useEventBus()
  
  // 存储事件监听器引用以便清理
  const eventListeners = new Map<string, EventCallback>()

  // 注册事件监听器的辅助函数
  const registerEventListener = (event: string, callback: EventCallback) => {
    eventListeners.set(event, callback)
    on(event, callback)
  }
  
  const { 
    addGeometry: engineAddGeometry,
    selectObject: engineSelectObject,
    selectedObject,
    getStats,
    importModel,
    importTexture,
    addResourceToScene: engineAddResourceToScene,
    resetScene: engineResetScene,
    exportScene: engineExportScene,
    setTransformMode: engineSetTransformMode,
    updateObjectTransform,
    deleteSelectedObject: engineDeleteSelectedObject,
    deselectObject: engineDeselectObject,
    undo,
    redo,
    optimizeMesh
  } = useThreeEngine()

  // 统一的状态更新
  const updateEditorState = () => {
    const stats = getStats()
    emit(EditorEvents.EDITOR_STATE_UPDATED, {
      selectedObject: selectedObject.value,
      stats,
      timestamp: Date.now()
    })
  }

  // 几何体操作
  const handleGeometryActions = () => {
    console.log('🔧 useEditorActions: 设置几何体事件监听器')
    // 创建几何体
    registerEventListener(EditorEvents.CREATE_GEOMETRY, (data: { type: string, params?: any }) => {
      console.log('📥 useEditorActions: 收到 CREATE_GEOMETRY 事件，数据:', data)
      const object = engineAddGeometry(data.type)
      console.log('🏗️ useEditorActions: engineAddGeometry 返回结果:', object)
      if (object) {
        selectedObject.value = object
        updateEditorState()
        emit(EditorEvents.OBJECT_CREATED, { object, type: data.type })
        console.log('✅ useEditorActions: 几何体创建成功，已发送 OBJECT_CREATED 事件')
      } else {
        console.error('❌ useEditorActions: 几何体创建失败')
      }
    })

    // 选择对象
    registerEventListener(EditorEvents.SELECT_OBJECT, (event: MouseEvent) => {
      const object = engineSelectObject(event)
      selectedObject.value = object
      updateEditorState()
      emit(EditorEvents.OBJECT_SELECTED, { object })
    })

    // 删除对象
    registerEventListener(EditorEvents.DELETE_OBJECT, () => {
      if (selectedObject.value) {
        const deletedObject = selectedObject.value
        engineDeleteSelectedObject()
        updateEditorState()
        emit(EditorEvents.OBJECT_DELETED, { object: deletedObject })
      }
    })

    // 取消选择
    registerEventListener(EditorEvents.DESELECT_OBJECT, () => {
      engineDeselectObject()
      updateEditorState()
    })
  }

  // 资源导入操作
  const handleResourceActions = () => {
    // 导入模型
    registerEventListener(EditorEvents.IMPORT_MODEL, async (data: { file: File, name: string }) => {
      try {
        emit(EditorEvents.LOADING_START, { type: 'model-import' })
        const model = await importModel(data.file, data.name)
        if (model) {
          selectedObject.value = model as any
          updateEditorState()
          emit(EditorEvents.RESOURCE_IMPORTED, { 
            type: 'model', 
            resource: model, 
            name: data.name 
          })
        }
      } catch (error) {
        emit(EditorEvents.ERROR_OCCURRED, { 
          type: 'model-import', 
          error,
          message: '模型导入失败'
        })
      } finally {
        emit(EditorEvents.LOADING_END, { type: 'model-import' })
      }
    })

    // 导入纹理
    registerEventListener(EditorEvents.IMPORT_TEXTURE, async (data: { file: File, name: string }) => {
      try {
        emit(EditorEvents.LOADING_START, { type: 'texture-import' })
        await importTexture(data.file, data.name)
        emit(EditorEvents.RESOURCE_IMPORTED, { 
          type: 'texture', 
          name: data.name 
        })
      } catch (error) {
        emit(EditorEvents.ERROR_OCCURRED, { 
          type: 'texture-import', 
          error,
          message: '纹理导入失败'
        })
      } finally {
        emit(EditorEvents.LOADING_END, { type: 'texture-import' })
      }
    })

    // 添加资源到场景
    registerEventListener(EditorEvents.ADD_RESOURCE_TO_SCENE, (resource: any) => {
      try {
        engineAddResourceToScene(resource)
        updateEditorState()
        emit(EditorEvents.RESOURCE_ADDED_TO_SCENE, { resource })
      } catch (error) {
        emit(EditorEvents.ERROR_OCCURRED, { 
          type: 'add-resource', 
          error,
          message: '添加资源到场景失败'
        })
      }
    })
  }

  // 场景操作
  const handleSceneActions = () => {
    // 重置场景
    registerEventListener(EditorEvents.RESET_SCENE, () => {
      engineResetScene()
      selectedObject.value = null
      updateEditorState()
      emit(EditorEvents.SCENE_RESET)
    })

    // 导出场景
    registerEventListener(EditorEvents.EXPORT_SCENE, () => {
      try {
        engineExportScene()
        emit(EditorEvents.SCENE_EXPORTED)
      } catch (error) {
        emit(EditorEvents.ERROR_OCCURRED, { 
          type: 'scene-export', 
          error,
          message: '场景导出失败'
        })
      }
    })
  }

  // 变换操作
  const handleTransformActions = () => {
    // 设置变换模式
    registerEventListener(EditorEvents.SET_TRANSFORM_MODE, (mode: string) => {
      engineSetTransformMode(mode)
      emit(EditorEvents.TRANSFORM_MODE_CHANGED, { mode })
    })

    // 更新对象位置
    registerEventListener(EditorEvents.UPDATE_OBJECT_POSITION, (data: { axis: string, value: number }) => {
      if (selectedObject.value) {
        const position = selectedObject.value.position as any
        position[data.axis] = data.value
        updateObjectTransform(selectedObject.value, {
          position: selectedObject.value.position
        })
        emit(EditorEvents.OBJECT_TRANSFORMED, { 
          object: selectedObject.value, 
          type: 'position',
          axis: data.axis,
          value: data.value
        })
      }
    })

    // 更新对象缩放
    registerEventListener(EditorEvents.UPDATE_OBJECT_SCALE, (data: { axis: string, value: number }) => {
      if (selectedObject.value) {
        const scale = selectedObject.value.scale as any
        scale[data.axis] = data.value
        emit(EditorEvents.OBJECT_TRANSFORMED, { 
          object: selectedObject.value, 
          type: 'scale',
          axis: data.axis,
          value: data.value
        })
      }
    })

    // 更新对象名称
    registerEventListener(EditorEvents.UPDATE_OBJECT_NAME, (name: string) => {
      if (selectedObject.value) {
        if (!selectedObject.value.userData) {
          selectedObject.value.userData = {}
        }
        selectedObject.value.userData.name = name
        emit(EditorEvents.OBJECT_RENAMED, { 
          object: selectedObject.value, 
          name 
        })
      }
    })
  }

  // 历史操作
  const handleHistoryActions = () => {
    registerEventListener(EditorEvents.UNDO, () => {
      undo()
      updateEditorState()
    })

    registerEventListener(EditorEvents.REDO, () => {
      redo()
      updateEditorState()
    })
  }

  // 性能优化操作
  const handlePerformanceActions = () => {
    registerEventListener(EditorEvents.OPTIMIZE_MESH, async () => {
      if (selectedObject.value) {
        try {
          emit(EditorEvents.LOADING_START, { type: 'mesh-optimization' })
          await optimizeMesh(selectedObject.value)
          updateEditorState()
          emit(EditorEvents.MESH_OPTIMIZED, { object: selectedObject.value })
        } catch (error) {
          emit(EditorEvents.ERROR_OCCURRED, { 
            type: 'mesh-optimization', 
            error,
            message: '网格优化失败'
          })
        } finally {
          emit(EditorEvents.LOADING_END, { type: 'mesh-optimization' })
        }
      }
    })

    registerEventListener(EditorEvents.UPDATE_PERFORMANCE_CONFIG, (config: any) => {
      // 更新性能配置
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('update-performance-config', {
          detail: config
        }))
      }
      emit(EditorEvents.PERFORMANCE_CONFIG_UPDATED, { config })
    })
  }

  // 初始化所有事件处理
  const initializeActions = () => {
    handleGeometryActions()
    handleResourceActions()
    handleSceneActions()
    handleTransformActions()
    handleHistoryActions()
    handlePerformanceActions()
  }

  // 清理事件监听
  const cleanup = () => {
    // 移除所有注册的事件监听器
    eventListeners.forEach((callback, event) => {
      off(event, callback)
    })
    eventListeners.clear()
  }

  return {
    initializeActions,
    cleanup,
    updateEditorState,
    // 直接暴露事件发射器供组件使用
    emit
  }
}
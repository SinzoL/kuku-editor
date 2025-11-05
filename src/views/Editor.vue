<template>
  <div 
    class="editor-container" 
    tabindex="0"
    @keydown="handleKeyDown"
    @click="focusContainer"
  >
    <!-- 3D 视口 - 占据整个屏幕 -->
    <Viewport3D 
      :is-loading="isLoading"
    />

    <!-- 浮动头部工具栏 -->
    <div class="floating-header">
      <EditorHeader 
        @import-config="handleImportConfig"
        @export-config="handleExportConfig"
        @reset-scene="resetScene"
        @export-scene="exportScene"
      />
    </div>

    <!-- 左侧边栏 - 创建和编辑功能 -->
    <aside class="left-sidebar" :class="{ 'sidebar-collapsed': !leftSidebarVisible }">
      <div class="sidebar-content">
        <!-- 几何体创建 -->
        <GeometryPanel />

        <!-- 几何体参数配置 -->
        <GeometryConfigPanel />

        <!-- 变换模式控制 -->
        <TransformModePanel 
          :transform-mode="transformMode"
          :selected-object="selectedObject"
        />

        <!-- 资源导入 -->
        <ResourcePanel />

        <!-- 历史记录控制 -->
        <HistoryPanel 
          :can-undo="canUndo"
          :can-redo="canRedo"
          :history-info="historyInfo"
        />

        <!-- 性能优化 -->
        <PerformancePanel 
          :has-selected-object="!!selectedObject"
          :stats="currentStats"
        />
      </div>
    </aside>

    <!-- 左侧边栏切换按钮 -->
    <button 
      class="left-sidebar-toggle" 
      :class="{ 'collapsed': !leftSidebarVisible }"
      @click="toggleLeftSidebar"
      :title="leftSidebarVisible ? '收起左侧边栏' : '展开左侧边栏'"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path v-if="leftSidebarVisible" d="M15 18l-6-6 6-6"/>
        <path v-else d="M9 18l6-6-6-6"/>
      </svg>
    </button>

    <!-- 右侧边栏 - 物体属性调整 -->
    <aside 
      class="right-sidebar" 
      :class="{ 
        'sidebar-collapsed': !rightSidebarVisible,
        'sidebar-hidden': !selectedObject 
      }"
      v-if="selectedObject"
    >
      <div class="sidebar-content">
        <!-- 对象属性 -->
        <ObjectProperties 
          :selected-object="selectedObject"
        />
      </div>
    </aside>

    <!-- 右侧边栏切换按钮 -->
    <button 
      class="right-sidebar-toggle" 
      :class="{ 'collapsed': !rightSidebarVisible }"
      @click="toggleRightSidebar"
      :title="rightSidebarVisible ? '收起右侧边栏' : '展开右侧边栏'"
      v-if="selectedObject"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path v-if="rightSidebarVisible" d="M9 18l6-6-6-6"/>
        <path v-else d="M15 18l-6-6 6-6"/>
      </svg>
    </button>

    <!-- 浮动状态栏 -->
    <div class="floating-footer">
      <StatusBar 
        :selected-info="selectedInfo"
        :fps="fps"
        :object-count="objectCount"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { useWasmStore } from '@/stores/wasm'
import { useThreeEngine } from '@/composables/useThreeEngine'
import { useEditorConfig } from '@/composables/useEditorConfig'
import { useEventBus, EditorEvents } from '@/composables/useEventBus'
import { useEditorActions } from '@/composables/useEditorActions'
import { ScaleObjectCommand } from '@/composables/useHistoryManager'

// 导入组件
import EditorHeader from '@/components/EditorHeader.vue'
import GeometryPanel from '@/components/sidebar/left/GeometryPanel.vue'
import GeometryConfigPanel from '@/components/sidebar/left/GeometryConfigPanel.vue'
import TransformModePanel from '@/components/sidebar/left/TransformModePanel.vue'
import HistoryPanel from '@/components/sidebar/left/HistoryPanel.vue'
import ObjectProperties from '@/components/sidebar/right/ObjectProperties.vue'
import PerformancePanel from '@/components/sidebar/left/PerformancePanel.vue'
import ResourcePanel from '@/components/sidebar/left/ResourcePanel.vue'
import Viewport3D from '@/components/Viewport3D.vue'
import StatusBar from '@/components/StatusBar.vue'

// Store
const wasmStore = useWasmStore()

// 配置管理器
const { 
  config, 
  updateConfig, 
  exportConfigToFile, 
  importConfig,
  resetConfig 
} = useEditorConfig()

// 事件总线和统一行为管理
const { emit, on } = useEventBus()
const { initializeActions, cleanup } = useEditorActions()

// 立即初始化事件总线行为管理（在组件创建时就设置）
console.log('🚀 初始化事件总线行为管理...')
initializeActions()
console.log('✅ 事件总线行为管理初始化完成')

// 立即设置 Canvas 事件监听器（在组件创建时就设置，而不是等到 onMounted）
console.log('🚀 设置 Canvas 事件监听器...')
on(EditorEvents.CANVAS_READY, (data: { canvas: HTMLCanvasElement }) => {
  console.log('📺 Editor: 收到 CANVAS_READY 事件，开始初始化引擎...')
  console.log('📺 Editor: 接收到的 Canvas 数据:', data)
  initializeEngine(data.canvas)
})

on(EditorEvents.CANVAS_CLICK, (data: { event: MouseEvent }) => {
  handleCanvasClick(data.event)
})

// 响应式数据
const isLoading = ref(true)
const fps = ref(60)
const objectCount = ref(0)
const transformMode = ref('translate')
const leftSidebarVisible = ref(true)
const rightSidebarVisible = ref(true)

// 拖拽状态跟踪
let lastDragEndTime = 0
let isDragJustEnded = false

// Three.js 引擎
const { 
  initEngine, 
  addGeometry: engineAddGeometry,
  selectObject: engineSelectObject,
  resetScene: engineResetScene,
  exportScene: engineExportScene,
  updateObjectTransform,
  optimizeMesh,
  getStats,
  setTransformMode: engineSetTransformMode,
  deleteSelectedObject: engineDeleteSelectedObject,
  deselectObject: engineDeselectObject,
  selectedObject,
  // 资源导入
  importModel,
  importTexture,
  addResourceToScene: engineAddResourceToScene,
  // 历史管理
  undo,
  redo,
  canUndo,
  canRedo,
  clearHistory,
  getHistoryInfo,
  historyManager
} = useThreeEngine()

// 计算属性
const selectedInfo = computed(() => {
  return selectedObject.value 
    ? `已选择: ${selectedObject.value.userData?.name || '未知对象'}`
    : '未选择对象'
})

const historyInfo = computed(() => {
  const info = getHistoryInfo()
  return {
    undoCount: Math.max(0, info.currentIndex + 1), // currentIndex从-1开始，所以+1
    redoCount: Math.max(0, info.totalCommands - info.currentIndex - 1),
    lastUndoCommand: info.currentCommand,
    lastRedoCommand: null // 新的历史管理器暂不支持此字段
  }
})

// 简化的事件处理方法（通过事件总线）
const handleCanvasClick = (event: MouseEvent) => {
  // 延迟处理点击事件，避免拖拽结束后的误触发
  setTimeout(() => {
    if (isDragJustEnded) return
    
    const timeSinceLastDrag = Date.now() - lastDragEndTime
    if (timeSinceLastDrag < 500) return
    
    // 通过事件总线处理对象选择
    emit(EditorEvents.SELECT_OBJECT, event)
  }, 100)
}

// 配置管理
const handleImportConfig = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      try {
        const text = await file.text()
        const configData = JSON.parse(text)
        await importConfig(configData)
        console.log('配置导入成功')
      } catch (error) {
        console.error('配置导入失败:', error)
      }
    }
  }
  input.click()
}

const handleExportConfig = () => {
  exportConfigToFile()
  console.log('配置导出成功')
}

// 监听拖拽结束事件
const handleDragEnd = () => {
  lastDragEndTime = Date.now()
  isDragJustEnded = true
  
  // 500ms 后重置拖拽状态
  setTimeout(() => {
    isDragJustEnded = false
  }, 500)
}

// 监听实时变换更新事件
const handleTransformUpdate = (event: CustomEvent) => {
  // 强制触发 Vue 的响应式更新
  if (selectedObject.value) {
    // 发送自定义事件通知 ObjectProperties 组件更新
    window.dispatchEvent(new CustomEvent('object-properties-update'))
  }
}

// 通过事件总线处理对象变换
const updateObjectPosition = (axis: string, value: number) => {
  emit(EditorEvents.UPDATE_OBJECT_POSITION, { axis, value })
}

// 滑块拖拽状态跟踪
let isSliderDragging = false
let sliderStartScale: any = null
let lastSliderChangeTime = 0

const updateObjectAxisScale = (axis: string, value: number) => {
  if (selectedObject.value) {
    const currentTime = Date.now()
    
    // 如果距离上次操作超过500ms，认为是新的独立操作
    if (!isSliderDragging || (currentTime - lastSliderChangeTime > 500)) {
      // 如果之前有未完成的拖拽，先记录历史
      if (isSliderDragging && sliderStartScale) {
        finalizePreviousSliderOperation()
      }
      
      // 开始新的拖拽操作
      isSliderDragging = true
      sliderStartScale = { ...selectedObject.value.scale }
    }
    
    // 更新最后操作时间
    lastSliderChangeTime = currentTime
    
    // 立即修改对象的缩放属性（完全即时响应）
    selectedObject.value.scale[axis] = value
    
    // 发送自定义事件通知 ObjectProperties 组件更新
    window.dispatchEvent(new CustomEvent('object-properties-update'))
  }
}

// 完成之前的滑块操作并记录历史
const finalizePreviousSliderOperation = () => {
  if (isSliderDragging && selectedObject.value && sliderStartScale) {
    // 检查是否真的有变化
    const hasChanged = 
      Math.abs(selectedObject.value.scale.x - sliderStartScale.x) > 0.001 ||
      Math.abs(selectedObject.value.scale.y - sliderStartScale.y) > 0.001 ||
      Math.abs(selectedObject.value.scale.z - sliderStartScale.z) > 0.001
    
    if (hasChanged) {
      // 创建缩放命令并执行
      const scaleCommand = new ScaleObjectCommand(
        selectedObject.value,
        new THREE.Vector3(sliderStartScale.x, sliderStartScale.y, sliderStartScale.z),
        new THREE.Vector3(selectedObject.value.scale.x, selectedObject.value.scale.y, selectedObject.value.scale.z)
      )
      
      // 执行命令（这会将命令添加到历史记录中）
      historyManager.executeCommand(scaleCommand)
    }
  }
}

// 监听全局 mouseup 事件来完成拖拽操作
const handleSliderMouseUp = () => {
  if (isSliderDragging) {
    // 延迟一点时间，确保最后的 input 事件已经处理
    setTimeout(() => {
      finalizePreviousSliderOperation()
      
      // 重置拖拽状态
      isSliderDragging = false
      sliderStartScale = null
    }, 50)
  }
}

const updateObjectName = (name: string) => {
  emit(EditorEvents.UPDATE_OBJECT_NAME, name)
}

const optimizeWithWasm = async () => {
  if (!selectedObject.value || !wasmStore.isLoaded) return
  emit(EditorEvents.OPTIMIZE_MESH)
}

const resetScene = () => {
  emit(EditorEvents.RESET_SCENE)
}

const exportScene = () => {
  emit(EditorEvents.EXPORT_SCENE)
}

const setTransformMode = (mode: string) => {
  transformMode.value = mode
  emit(EditorEvents.SET_TRANSFORM_MODE, mode)
}

const toggleLeftSidebar = () => {
  leftSidebarVisible.value = !leftSidebarVisible.value
}

const toggleRightSidebar = () => {
  rightSidebarVisible.value = !rightSidebarVisible.value
}

// 历史管理方法（通过事件总线）
const handleUndo = () => {
  emit(EditorEvents.UNDO)
}

const handleRedo = () => {
  emit(EditorEvents.REDO)
}

// 性能监控
const currentStats = ref({
  fps: 60,
  objectCount: 0,
  renderTime: 0,
  triangleCount: 0,
  drawCalls: 0,
  memoryUsage: 0
})

// FPS 平滑处理
const fpsHistory: number[] = []
const maxFpsHistory = 10

const updateStats = () => {
  const stats = getStats()
  
  // FPS 平滑处理
  fpsHistory.push(stats.fps)
  if (fpsHistory.length > maxFpsHistory) {
    fpsHistory.shift()
  }
  
  // 计算平均 FPS
  const avgFps = fpsHistory.reduce((sum, fps) => sum + fps, 0) / fpsHistory.length
  fps.value = Math.round(avgFps)
  
  // 更新详细统计信息
  currentStats.value = {
    fps: Math.round(avgFps),
    objectCount: stats.objectCount,
    renderTime: stats.renderTime || 0,
    triangleCount: stats.triangleCount || 0,
    drawCalls: stats.drawCalls || 0,
    memoryUsage: stats.memoryUsage || 0
  }
  
  objectCount.value = stats.objectCount
}

// 更新性能配置（通过事件总线）
const updatePerformanceConfig = (config: any) => {
  emit(EditorEvents.UPDATE_PERFORMANCE_CONFIG, config)
}

// 键盘快捷键处理
const handleKeyDown = (event: KeyboardEvent) => {
  // 检查当前焦点是否在输入框或可编辑元素上
  const activeElement = document.activeElement
  const isEditingText = activeElement && (
    activeElement.tagName === 'INPUT' || 
    activeElement.tagName === 'TEXTAREA' ||
    (activeElement as HTMLElement).contentEditable === 'true'
  )
  
  // Ctrl+Z 撤销
  if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
    event.preventDefault()
    handleUndo()
  }
  // Ctrl+Y 或 Ctrl+Shift+Z 重做
  else if (event.ctrlKey && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
    event.preventDefault()
    handleRedo()
  }
  // Delete/Backspace 删除选中对象 - 只有在不编辑文本时才执行
  else if ((event.key === 'Delete' || event.key === 'Backspace') && selectedObject.value && !isEditingText) {
    event.preventDefault()
    engineDeleteSelectedObject()
  }
  // Escape 取消选择 - 只有在不编辑文本时才执行
  else if (event.key === 'Escape' && !isEditingText) {
    engineDeselectObject()
  }
}

// 确保容器获得焦点以响应键盘事件
const focusContainer = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  target.focus()
}

// 初始化引擎
const initializeEngine = async (canvas: HTMLCanvasElement) => {
  try {
    console.log('🚀 Editor: 开始初始化 Three.js 引擎...')
    console.log('🚀 Editor: 接收到的 Canvas:', canvas)
    await initEngine(canvas)
    console.log('✅ Three.js 引擎初始化完成')
    
    console.log('🚀 开始初始化 WASM 模块...')
    await wasmStore.initialize()
    console.log('✅ WASM 模块初始化完成')
    
    isLoading.value = false
    console.log('🎉 编辑器初始化完成！')
    
    // 定期更新统计 - 降低更新频率
    setInterval(updateStats, 500)
    
    // 监听拖拽结束事件和实时变换更新
    window.addEventListener('transform-drag-end', handleDragEnd)
    window.addEventListener('transform-change', handleTransformUpdate)
    
    // 监听键盘快捷键
    window.addEventListener('keydown', handleKeyDown)
    
    // 监听全局 mouseup 事件来处理滑块拖拽结束
    window.addEventListener('mouseup', handleSliderMouseUp)
  } catch (error) {
    console.error('❌ 编辑器初始化失败:', error)
    isLoading.value = false
  }
}

// 组件挂载时的其他初始化
onMounted(() => {
  console.log('🚀 Editor 组件已挂载')
})

// 清理事件监听器
onUnmounted(() => {
  // 清理事件总线监听器
  cleanup()
  
  // 清理DOM事件监听器
  window.removeEventListener('transform-drag-end', handleDragEnd)
  window.removeEventListener('transform-change', handleTransformUpdate)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('mouseup', handleSliderMouseUp)
})
</script>

<style scoped>
.editor-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: #1a1a1a;
  overflow: hidden;
  outline: none;
}

.editor-container:focus {
  box-shadow: inset 0 0 0 2px rgba(100, 255, 218, 0.2);
}

/* 3D视口占据整个屏幕 */
:deep(.viewport-3d) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

/* 左侧边栏 */
.left-sidebar {
  position: absolute;
  top: 60px;
  left: 0;
  width: 280px;
  height: calc(100vh - 100px);
  background: rgba(37, 37, 37, 0.95);
  backdrop-filter: blur(15px);
  border-right: 1px solid rgba(68, 68, 68, 0.5);
  padding: 20px;
  overflow-y: auto;
  z-index: 150;
  transition: transform 0.3s ease;
  box-shadow: 2px 0 25px rgba(0, 0, 0, 0.4);
}

/* 右侧边栏 */
.right-sidebar {
  position: absolute;
  top: 60px;
  right: 0;
  width: 280px;
  height: calc(100vh - 100px);
  background: rgba(37, 37, 37, 0.95);
  backdrop-filter: blur(15px);
  border-left: 1px solid rgba(68, 68, 68, 0.5);
  padding: 20px;
  overflow-y: auto;
  z-index: 150;
  transition: transform 0.3s ease;
  box-shadow: -2px 0 25px rgba(0, 0, 0, 0.4);
}

.sidebar-collapsed {
  transform: translateX(-100%);
}

.right-sidebar.sidebar-collapsed {
  transform: translateX(100%);
}

.sidebar-hidden {
  display: none;
}

.sidebar-content {
  width: 100%;
}

.left-sidebar::-webkit-scrollbar,
.right-sidebar::-webkit-scrollbar { 
  display: none; 
}

/* 左侧边栏切换按钮 */
.left-sidebar-toggle {
  position: absolute;
  top: 50%;
  left: 280px;
  transform: translateY(-50%);
  z-index: 200;
  background: rgba(51, 51, 51, 0.9);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(85, 85, 85, 0.8);
  border-radius: 0 12px 12px 0;
  padding: 12px 8px;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 2px 0 20px rgba(0, 0, 0, 0.5);
}

/* 左侧边栏收缩时按钮位置 */
.left-sidebar-toggle.collapsed {
  left: 0;
}

/* 右侧边栏切换按钮 */
.right-sidebar-toggle {
  position: absolute;
  top: 50%;
  right: 280px;
  transform: translateY(-50%);
  z-index: 200;
  background: rgba(51, 51, 51, 0.9);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(85, 85, 85, 0.8);
  border-radius: 12px 0 0 12px;
  padding: 12px 8px;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: -2px 0 20px rgba(0, 0, 0, 0.5);
}

/* 右侧边栏收缩时按钮位置 */
.right-sidebar-toggle.collapsed {
  right: 0;
}

.left-sidebar-toggle:hover,
.right-sidebar-toggle:hover {
  background: rgba(68, 68, 68, 0.95);
  border-color: rgba(102, 102, 102, 0.8);
  transform: translateY(-50%) scale(1.05);
}

.left-sidebar-toggle svg,
.right-sidebar-toggle svg {
  transition: transform 0.2s ease;
}

.left-sidebar-toggle:hover svg,
.right-sidebar-toggle:hover svg {
  transform: scale(1.1);
}

/* 浮动头部工具栏 */
.floating-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  z-index: 100;
  background: rgba(26, 26, 26, 0.9);
  backdrop-filter: blur(15px);
  border-bottom: 1px solid rgba(68, 68, 68, 0.3);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
}

/* 浮动状态栏 */
.floating-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  z-index: 100;
  background: rgba(26, 26, 26, 0.9);
  backdrop-filter: blur(15px);
  border-top: 1px solid rgba(68, 68, 68, 0.3);
  box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.3);
}

:deep(.header) {
  width: 100%;
  height: 100%;
}

:deep(.status-bar) {
  width: 100%;
  height: 100%;
}
</style>
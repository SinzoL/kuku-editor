<template>
  <div class="editor-container">
    <!-- 3D 视口 - 占据整个屏幕 -->
    <Viewport3D 
      :is-loading="isLoading"
      @canvas-click="handleCanvasClick"
      @canvas-ready="initializeEngine"
    />

    <!-- 浮动头部工具栏 -->
    <div class="floating-header">
      <EditorHeader 
        @reset-scene="resetScene"
        @export-scene="exportScene"
      />
    </div>

    <!-- 左侧边栏 - 创建和编辑功能 -->
    <aside class="left-sidebar" :class="{ 'sidebar-collapsed': !leftSidebarVisible }">
      <div class="sidebar-content">
        <!-- 几何体创建 -->
        <GeometryPanel @add-geometry="addGeometry" />

        <!-- 变换模式控制 -->
        <TransformModePanel 
          :transform-mode="transformMode"
          :selected-object="selectedObject"
          @set-transform-mode="setTransformMode"
        />

        <!-- 历史记录控制 -->
        <HistoryPanel 
          :can-undo="canUndo"
          :can-redo="canRedo"
          :history-info="historyInfo"
          @undo="handleUndo"
          @redo="handleRedo"
          @clear-history="handleClearHistory"
        />

        <!-- WebAssembly 控制 -->
        <WasmPanel 
          :has-selected-object="!!selectedObject"
          @optimize-mesh="optimizeWithWasm"
        />
      </div>
    </aside>

    <!-- 左侧边栏切换按钮 -->
    <button 
      class="left-sidebar-toggle" 
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
          @update-position="updateObjectPosition"
          @update-axis-scale="updateObjectAxisScale"
        />
      </div>
    </aside>

    <!-- 右侧边栏切换按钮 -->
    <button 
      class="right-sidebar-toggle" 
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
import { ref, computed, onUnmounted } from 'vue'
import * as THREE from 'three'
import { useWasmStore } from '@/stores/wasm'
import { useThreeEngine } from '@/composables/useThreeEngine'
import { ScaleObjectCommand } from '@/composables/useHistoryManager'

// 导入组件
import EditorHeader from '@/components/EditorHeader.vue'
import GeometryPanel from '@/components/GeometryPanel.vue'
import TransformModePanel from '@/components/TransformModePanel.vue'
import HistoryPanel from '@/components/HistoryPanel.vue'
import ObjectProperties from '@/components/ObjectProperties.vue'
import WasmPanel from '@/components/WasmPanel.vue'
import Viewport3D from '@/components/Viewport3D.vue'
import StatusBar from '@/components/StatusBar.vue'

// Store
const wasmStore = useWasmStore()

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
  selectedObject,
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

const historyInfo = computed(() => getHistoryInfo())

// 方法
const addGeometry = (type: string) => {
  const object = engineAddGeometry(type)
  if (object) {
    selectedObject.value = object
    updateStats()
  }
}

const handleCanvasClick = (event: MouseEvent) => {
  // 延迟处理点击事件，避免拖拽结束后的误触发
  setTimeout(() => {
    // 检查是否刚刚结束拖拽
    if (isDragJustEnded) {
      return
    }
    
    // 检查时间差作为备用方案
    const timeSinceLastDrag = Date.now() - lastDragEndTime
    if (timeSinceLastDrag < 500) {
      return
    }
    
    const object = engineSelectObject(event)
    selectedObject.value = object
  }, 100)
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

const updateObjectPosition = (axis: string, value: number) => {
  if (selectedObject.value) {
    selectedObject.value.position[axis] = value
    updateObjectTransform(selectedObject.value, {
      position: selectedObject.value.position
    })
  }
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

const optimizeWithWasm = async () => {
  if (!selectedObject.value || !wasmStore.isLoaded) return
  
  try {
    const result = await optimizeMesh(selectedObject.value)
    console.log('网格优化完成:', result)
  } catch (error) {
    console.error('网格优化失败:', error)
  }
}

const resetScene = () => {
  // 先清空历史记录，避免与reset操作冲突
  handleClearHistory()
  
  // 然后重置场景
  engineResetScene()
  selectedObject.value = null
  updateStats()
}

const exportScene = () => {
  engineExportScene()
}

const setTransformMode = (mode: string) => {
  transformMode.value = mode
  engineSetTransformMode(mode)
}

const toggleLeftSidebar = () => {
  leftSidebarVisible.value = !leftSidebarVisible.value
}

const toggleRightSidebar = () => {
  rightSidebarVisible.value = !rightSidebarVisible.value
}

// 历史管理方法
const handleUndo = () => {
  undo()
  updateStats()
}

const handleRedo = () => {
  redo()
  updateStats()
}

const handleClearHistory = () => {
  clearHistory()
}

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
  
  objectCount.value = stats.objectCount
}

// 键盘快捷键处理
const handleKeyDown = (event: KeyboardEvent) => {
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
}

// 初始化引擎
const initializeEngine = async (canvas: HTMLCanvasElement) => {
  try {
    await initEngine(canvas)
    await wasmStore.initialize()
    isLoading.value = false
    
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
    console.error('初始化失败:', error)
    isLoading.value = false
  }
}

// 清理事件监听器
onUnmounted(() => {
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

.sidebar-collapsed ~ .left-sidebar-toggle {
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

.sidebar-collapsed ~ .right-sidebar-toggle {
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
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

    <!-- 浮动侧边栏 -->
    <aside class="sidebar" :class="{ 'sidebar-collapsed': !sidebarVisible }">
      <div class="sidebar-content">
        <!-- 几何体创建 -->
        <GeometryPanel @add-geometry="addGeometry" />

        <!-- 对象属性 -->
        <ObjectProperties 
          :selected-object="selectedObject"
          :transform-mode="transformMode"
          @set-transform-mode="setTransformMode"
          @update-position="updateObjectPosition"
          @update-axis-scale="updateObjectAxisScale"
        />

        <!-- WebAssembly 控制 -->
        <WasmPanel 
          :has-selected-object="!!selectedObject"
          @optimize-mesh="optimizeWithWasm"
        />
      </div>
    </aside>

    <!-- 侧边栏切换按钮 -->
    <button 
      class="sidebar-toggle" 
      @click="toggleSidebar"
      :title="sidebarVisible ? '收起侧边栏' : '展开侧边栏'"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path v-if="sidebarVisible" d="M15 18l-6-6 6-6"/>
        <path v-else d="M9 18l6-6-6-6"/>
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
import { useWasmStore } from '@/stores/wasm'
import { useThreeEngine } from '@/composables/useThreeEngine'

// 导入组件
import EditorHeader from '@/components/EditorHeader.vue'
import GeometryPanel from '@/components/GeometryPanel.vue'
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
const sidebarVisible = ref(true)

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
  selectedObject
} = useThreeEngine()

// 计算属性
const selectedInfo = computed(() => {
  return selectedObject.value 
    ? `已选择: ${selectedObject.value.userData?.name || '未知对象'}`
    : '未选择对象'
})

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
  // Three.js 对象的属性变化会自动反映在 UI 中
  // 这个函数现在主要用于未来可能需要的额外处理
}

const updateObjectPosition = (axis: string, value: number) => {
  if (selectedObject.value) {
    selectedObject.value.position[axis] = value
    updateObjectTransform(selectedObject.value, {
      position: selectedObject.value.position
    })
  }
}



const updateObjectAxisScale = (axis: string, value: number) => {
  if (selectedObject.value) {
    // 直接修改对象的缩放属性
    selectedObject.value.scale[axis] = value
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

const toggleSidebar = () => {
  sidebarVisible.value = !sidebarVisible.value
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
  } catch (error) {
    console.error('初始化失败:', error)
    isLoading.value = false
  }
}

// 清理事件监听器
onUnmounted(() => {
  window.removeEventListener('transform-drag-end', handleDragEnd)
  window.removeEventListener('transform-change', handleTransformUpdate)
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

/* 浮动侧边栏 */
.sidebar {
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

.sidebar-collapsed {
  transform: translateX(-100%);
}

.sidebar-content {
  width: 100%;
}

.sidebar::-webkit-scrollbar { 
  display: none; 
}

/* 侧边栏切换按钮 */
.sidebar-toggle {
  position: absolute;
  top: 50%;
  left: 280px;
  transform: translateY(-50%);
  z-index: 200;
  background: rgba(51, 51, 51, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid #555;
  border-radius: 0 8px 8px 0;
  padding: 12px 8px;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 2px 0 15px rgba(0, 0, 0, 0.4);
}

.sidebar-collapsed ~ .sidebar-toggle {
  left: 0;
  border-radius: 0 8px 8px 0;
}

.sidebar-toggle:hover {
  background: rgba(68, 68, 68, 0.9);
  border-color: #666;
  transform: translateY(-50%) scale(1.05);
}

.sidebar-toggle svg {
  transition: transform 0.2s ease;
}

.sidebar-toggle:hover svg {
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
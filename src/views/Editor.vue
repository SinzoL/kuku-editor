<template>
  <div class="editor-container">
    <!-- 头部工具栏 -->
    <EditorHeader 
      @reset-scene="resetScene"
      @export-scene="exportScene"
    />

    <div class="main-content">
      <!-- 侧边栏 -->
      <aside class="sidebar">
        <!-- 几何体创建 -->
        <GeometryPanel @add-geometry="addGeometry" />

        <!-- 对象属性 -->
        <ObjectProperties 
          :selected-object="selectedObject"
          :transform-mode="transformMode"
          :scale-value="scaleValue"
          @set-transform-mode="setTransformMode"
          @update-position="updateObjectPosition"
          @update-scale="updateObjectScale"
        />

        <!-- WebAssembly 控制 -->
        <WasmPanel 
          :has-selected-object="!!selectedObject"
          @optimize-mesh="optimizeWithWasm"
        />
      </aside>

      <!-- 3D 视口 -->
      <Viewport3D 
        :is-loading="isLoading"
        @canvas-click="handleCanvasClick"
        @canvas-ready="initializeEngine"
      />
    </div>

    <!-- 状态栏 -->
    <StatusBar 
      :selected-info="selectedInfo"
      :fps="fps"
      :object-count="objectCount"
    />
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
const selectedObject = ref<any>(null)
const scaleValue = ref(1)
const fps = ref(60)
const objectCount = ref(0)
const transformMode = ref('translate')

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
  setTransformMode: engineSetTransformMode
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
    scaleValue.value = 1
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
    if (object) {
      scaleValue.value = object.scale.x
    }
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
  if (selectedObject.value && event.detail) {
    const { position, rotation, scale } = event.detail
    
    // 强制触发响应式更新 - 创建新的对象引用
    selectedObject.value = {
      ...selectedObject.value,
      position: { x: position.x, y: position.y, z: position.z },
      rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
      scale: { x: scale.x, y: scale.y, z: scale.z }
    }
    
    // 更新 scaleValue
    scaleValue.value = scale.x
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

const updateObjectScale = (value: number) => {
  scaleValue.value = value
  if (selectedObject.value) {
    selectedObject.value.scale.setScalar(value)
    updateObjectTransform(selectedObject.value, {
      scale: { x: value, y: value, z: value }
    })
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
  scaleValue.value = 1
  updateStats()
}

const exportScene = () => {
  engineExportScene()
}

const setTransformMode = (mode: string) => {
  transformMode.value = mode
  engineSetTransformMode(mode)
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
  display: grid;
  grid-template-rows: 60px 1fr 40px;
  grid-template-columns: 280px 1fr;
  height: 100vh;
  background: #1a1a1a;
}

.main-content {
  display: contents;
}

.sidebar {
  background: #252525;
  border-right: 1px solid #444;
  padding: 20px;
  overflow-y: auto;
}
.sidebar::-webkit-scrollbar { 
  display: none; 
}
/* 确保头部组件占据正确的网格位置 */
:deep(.header) {
  grid-column: 1 / -1;
}

/* 确保状态栏组件占据正确的网格位置 */
:deep(.status-bar) {
  grid-column: 1 / -1;
}
</style>
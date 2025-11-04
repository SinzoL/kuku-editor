<template>
  <main class="viewport">
    <canvas ref="canvasRef" @click="handleCanvasClick"></canvas>
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner"></div>
      <div>正在初始化...</div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 定义 Props
interface Props {
  isLoading: boolean
}

defineProps<Props>()

// 事件总线
import { useEventBus, EditorEvents } from '@/composables/useEventBus'
const { emit } = useEventBus()

// 事件处理
const handleCanvasClick = (event: MouseEvent) => {
  emit(EditorEvents.CANVAS_CLICK, { event })
}

const handleCanvasReady = (canvas: HTMLCanvasElement) => {
  console.log('📺 Canvas 元素准备就绪，发送事件...')
  emit(EditorEvents.CANVAS_READY, { canvas })
}

// 响应式数据
const canvasRef = ref<HTMLCanvasElement>()

// 生命周期
onMounted(() => {
  if (canvasRef.value) {
    handleCanvasReady(canvasRef.value)
  }
})
</script>

<style scoped>
.viewport {
  background: #1a1a1a;
  position: relative;
}

.viewport canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  z-index: 1000;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #333;
  border-top: 4px solid #64ffda;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
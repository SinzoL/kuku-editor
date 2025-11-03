<template>
  <section class="section">
    <h3>对象属性</h3>

    <div v-if="selectedObject" class="properties">
      <div class="property-group">
        <label class="property-label">位置 X</label>
        <input 
          :value="objectPosition.x.toFixed(2)" 
          type="number" 
          class="input" 
          step="0.1"
          @input="updatePosition('x', $event)"
        >
      </div>
      <div class="property-group">
        <label class="property-label">位置 Y</label>
        <input 
          :value="objectPosition.y.toFixed(2)" 
          type="number" 
          class="input" 
          step="0.1"
          @input="updatePosition('y', $event)"
        >
      </div>
      <div class="property-group">
        <label class="property-label">位置 Z</label>
        <input 
          :value="objectPosition.z.toFixed(2)" 
          type="number" 
          class="input" 
          step="0.1"
          @input="updatePosition('z', $event)"
        >
      </div>
      <div class="property-group">
        <label class="property-label">缩放 X: {{ objectScale.x.toFixed(3) }}</label>
        <input 
          :value="objectScale.x" 
          type="range" 
          class="slider" 
          min="0.001" 
          max="5" 
          step="0.001"
          @input="updateAxisScale('x', $event)"
        >
      </div>
      <div class="property-group">
        <label class="property-label">缩放 Y: {{ objectScale.y.toFixed(3) }}</label>
        <input 
          :value="objectScale.y" 
          type="range" 
          class="slider" 
          min="0.001" 
          max="5" 
          step="0.001"
          @input="updateAxisScale('y', $event)"
        >
      </div>
      <div class="property-group">
        <label class="property-label">缩放 Z: {{ objectScale.z.toFixed(3) }}</label>
        <input 
          :value="objectScale.z" 
          type="range" 
          class="slider" 
          min="0.001" 
          max="5" 
          step="0.001"
          @input="updateAxisScale('z', $event)"
        >
      </div>
    </div>
    <div v-else class="no-selection">
      未选择对象
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, watch, ref, onMounted, onUnmounted } from 'vue'

// 定义 Props
interface Props {
  selectedObject: any
}

const props = defineProps<Props>()

// 定义事件
const emit = defineEmits<{
  'update-position': [axis: string, value: number]
  'update-axis-scale': [axis: string, value: number]
}>()

// 强制更新的响应式变量
const forceUpdate = ref(0)

// 监听自定义事件来强制更新
const handleForceUpdate = () => {
  forceUpdate.value++
}

// 监听 selectedObject 的变化
watch(() => props.selectedObject, () => {
  forceUpdate.value++
})

// 计算属性 - 真正依赖 forceUpdate
const objectPosition = computed(() => {
  // 确保依赖 forceUpdate，这样当 forceUpdate 变化时会重新计算
  const _ = forceUpdate.value
  
  if (!props.selectedObject) return { x: 0, y: 0, z: 0 }
  return {
    x: props.selectedObject.position.x,
    y: props.selectedObject.position.y,
    z: props.selectedObject.position.z
  }
})

const objectScale = computed(() => {
  // 确保依赖 forceUpdate，这样当 forceUpdate 变化时会重新计算
  const _ = forceUpdate.value
  
  if (!props.selectedObject) return { x: 1, y: 1, z: 1 }
  return {
    x: props.selectedObject.scale.x,
    y: props.selectedObject.scale.y,
    z: props.selectedObject.scale.z
  }
})

// 更新位置
const updatePosition = (axis: string, event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update-position', axis, parseFloat(target.value))
}

// 更新单轴缩放
const updateAxisScale = (axis: string, event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update-axis-scale', axis, parseFloat(target.value))
}

// 组件挂载时监听自定义事件
onMounted(() => {
  window.addEventListener('object-properties-update', handleForceUpdate)
})

// 组件卸载时清理事件监听
onUnmounted(() => {
  window.removeEventListener('object-properties-update', handleForceUpdate)
})
</script>

<style scoped>
.section {
  margin-bottom: 25px;
}

.section h3 {
  margin-bottom: 15px;
  color: #64ffda;
  font-size: 16px;
  border-bottom: 1px solid #333;
  padding-bottom: 8px;
}

.properties {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.property-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.property-label {
  font-size: 13px;
  color: #ccc;
}

.input {
  background: #333;
  border: 1px solid #555;
  color: white;
  padding: 8px;
  border-radius: 4px;
  font-size: 13px;
}

.input:focus {
  outline: none;
  border-color: #64ffda;
}

.slider {
  background: #333;
  height: 6px;
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}



.no-selection {
  text-align: center;
  color: #666;
  padding: 20px;
}
</style>
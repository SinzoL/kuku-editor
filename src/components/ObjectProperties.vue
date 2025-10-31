<template>
  <section class="section">
    <h3>对象属性</h3>

    <div v-if="selectedObject" class="properties">
      <div class="property-group">
        <label class="property-label">位置 X</label>
        <input 
          :value="selectedObject.position.x" 
          type="number" 
          class="input" 
          step="0.1"
          @input="updatePosition('x', $event)"
        >
      </div>
      <div class="property-group">
        <label class="property-label">位置 Y</label>
        <input 
          :value="selectedObject.position.y" 
          type="number" 
          class="input" 
          step="0.1"
          @input="updatePosition('y', $event)"
        >
      </div>
      <div class="property-group">
        <label class="property-label">位置 Z</label>
        <input 
          :value="selectedObject.position.z" 
          type="number" 
          class="input" 
          step="0.1"
          @input="updatePosition('z', $event)"
        >
      </div>
      <div class="property-group">
        <label class="property-label">缩放 X: {{ selectedObject.scale.x.toFixed(2) }}</label>
        <input 
          :value="selectedObject.scale.x" 
          type="range" 
          class="slider" 
          min="0.1" 
          max="3" 
          step="0.1"
          @input="updateAxisScale('x', $event)"
        >
      </div>
      <div class="property-group">
        <label class="property-label">缩放 Y: {{ selectedObject.scale.y.toFixed(2) }}</label>
        <input 
          :value="selectedObject.scale.y" 
          type="range" 
          class="slider" 
          min="0.1" 
          max="3" 
          step="0.1"
          @input="updateAxisScale('y', $event)"
        >
      </div>
      <div class="property-group">
        <label class="property-label">缩放 Z: {{ selectedObject.scale.z.toFixed(2) }}</label>
        <input 
          :value="selectedObject.scale.z" 
          type="range" 
          class="slider" 
          min="0.1" 
          max="3" 
          step="0.1"
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
// 定义 Props
interface Props {
  selectedObject: any
}

defineProps<Props>()

// 定义事件
const emit = defineEmits<{
  'update-position': [axis: string, value: number]
  'update-axis-scale': [axis: string, value: number]
}>()

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
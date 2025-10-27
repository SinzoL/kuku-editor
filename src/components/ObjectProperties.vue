<template>
  <section class="section">
    <h3>对象属性</h3>
    <div class="view-controls">
      <div class="transform-modes" v-if="selectedObject">
        <label class="mode-label">变换模式:</label>
        <div class="mode-buttons">
          <button 
            class="mode-btn" 
            :class="{ active: transformMode === 'translate' }"
            @click="emit('set-transform-mode', 'translate')"
            title="平移模式"
          >
            <TranslateIcon class="mode-icon" />
          </button>
          <button 
            class="mode-btn" 
            :class="{ active: transformMode === 'rotate' }"
            @click="emit('set-transform-mode', 'rotate')"
            title="旋转模式"
          >
            <RotateIcon class="mode-icon" />
          </button>
          <button 
            class="mode-btn" 
            :class="{ active: transformMode === 'scale' }"
            @click="emit('set-transform-mode', 'scale')"
            title="缩放模式"
          >
            <ScaleIcon class="mode-icon" />
          </button>
        </div>
      </div>
    </div>
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
        <label class="property-label">缩放: {{ scaleValue }}</label>
        <input 
          :value="scaleValue" 
          type="range" 
          class="slider" 
          min="0.1" 
          max="3" 
          step="0.1"
          @input="updateScale($event)"
        >
      </div>
    </div>
    <div v-else class="no-selection">
      未选择对象
    </div>
  </section>
</template>

<script setup lang="ts">
import { TranslateIcon, RotateIcon, ScaleIcon } from '@/assets/icons'

// 定义 Props
interface Props {
  selectedObject: any
  transformMode: string
  scaleValue: number
}

defineProps<Props>()

// 定义事件
const emit = defineEmits<{
  'set-transform-mode': [mode: string]
  'update-position': [axis: string, value: number]
  'update-scale': [value: number]
}>()

// 更新位置
const updatePosition = (axis: string, event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update-position', axis, parseFloat(target.value))
}

// 更新缩放
const updateScale = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update-scale', parseFloat(target.value))
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

.view-controls {
  margin-bottom: 15px;
  padding: 10px;
  background: #2a2a2a;
  border-radius: 6px;
  border: 1px solid #444;
}

.transform-modes {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #444;
}

.mode-label {
  display: block;
  font-size: 12px;
  color: #aaa;
  margin-bottom: 8px;
}

.mode-buttons {
  display: flex;
  gap: 4px;
}

.mode-btn {
  background: #333;
  border: 1px solid #555;
  color: white;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mode-btn:hover {
  background: #404040;
  border-color: #64ffda;
}

.mode-btn.active {
  background: #64ffda;
  color: #1a1a1a;
  border-color: #64ffda;
}

.mode-icon {
  width: 14px;
  height: 14px;
  color: #888;
}

.mode-btn:hover .mode-icon {
  color: #64ffda;
}

.mode-btn.active .mode-icon {
  color: #1a1a1a;
}

.no-selection {
  text-align: center;
  color: #666;
  padding: 20px;
}
</style>
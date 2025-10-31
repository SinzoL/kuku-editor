<template>
  <section class="section">
    <h3>变换模式</h3>
    <div class="transform-modes">
      <div class="mode-buttons">
        <button 
          class="mode-btn" 
          :class="{ active: transformMode === 'translate' }"
          @click="emit('set-transform-mode', 'translate')"
          title="平移模式 (G)"
        >
          <TranslateIcon class="mode-icon" />
          <span class="mode-text">平移</span>
        </button>
        <button 
          class="mode-btn" 
          :class="{ active: transformMode === 'rotate' }"
          @click="emit('set-transform-mode', 'rotate')"
          title="旋转模式 (R)"
        >
          <RotateIcon class="mode-icon" />
          <span class="mode-text">旋转</span>
        </button>
        <button 
          class="mode-btn" 
          :class="{ active: transformMode === 'scale' }"
          @click="emit('set-transform-mode', 'scale')"
          title="缩放模式 (S)"
        >
          <ScaleIcon class="mode-icon" />
          <span class="mode-text">缩放</span>
        </button>
      </div>
      <div class="mode-info" v-if="selectedObject">
        <p class="info-text">
          <span class="object-name">{{ selectedObject.userData?.name || '未知对象' }}</span>
          已选中
        </p>
      </div>
      <div class="mode-info" v-else>
        <p class="info-text no-object">请选择一个对象进行变换</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { TranslateIcon, RotateIcon, ScaleIcon } from '@/assets/icons'

// 定义 Props
interface Props {
  transformMode: string
  selectedObject?: any
}

defineProps<Props>()

// 定义事件
const emit = defineEmits<{
  'set-transform-mode': [mode: string]
}>()
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

.transform-modes {
  padding: 15px;
  background: #2a2a2a;
  border-radius: 8px;
  border: 1px solid #444;
}

.mode-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 15px;
}

.mode-btn {
  background: #333;
  border: 1px solid #555;
  color: white;
  padding: 12px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  width: 100%;
}

.mode-btn:hover {
  background: #404040;
  border-color: #64ffda;
  transform: translateY(-1px);
}

.mode-btn.active {
  background: #64ffda;
  color: #1a1a1a;
  border-color: #64ffda;
  box-shadow: 0 2px 8px rgba(100, 255, 218, 0.3);
}

.mode-icon {
  width: 16px;
  height: 16px;
  color: #888;
  flex-shrink: 0;
}

.mode-btn:hover .mode-icon {
  color: #64ffda;
}

.mode-btn.active .mode-icon {
  color: #1a1a1a;
}

.mode-text {
  font-weight: 500;
}

.mode-btn.active .mode-text {
  font-weight: 600;
}

.mode-info {
  padding-top: 12px;
  border-top: 1px solid #444;
}

.info-text {
  font-size: 12px;
  color: #aaa;
  margin: 0;
  text-align: center;
}

.object-name {
  color: #64ffda;
  font-weight: 500;
}

.no-object {
  color: #666;
  font-style: italic;
}
</style>
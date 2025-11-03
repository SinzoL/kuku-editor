<template>
  <div class="transform-panel">
    <div class="panel-header" @click="toggleCollapse">
      <h3>变换模式</h3>
      <button 
        class="collapse-btn"
        :class="{ 'collapsed': isCollapsed }"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
    </div>
    
    <div class="panel-content" v-show="!isCollapsed">
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
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

// 响应式数据
const isCollapsed = ref(false)

// 方法
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}
</script>

<style scoped>
.transform-panel {
  background: rgba(45, 45, 45, 0.8);
  border: 1px solid rgba(68, 68, 68, 0.6);
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(55, 55, 55, 0.9);
  border-bottom: 1px solid rgba(68, 68, 68, 0.4);
  cursor: pointer;
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
}

.collapse-btn {
  background: none;
  border: none;
  color: #b0b0b0;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collapse-btn:hover {
  background: rgba(68, 68, 68, 0.5);
  color: #fff;
}

.collapse-btn.collapsed svg {
  transform: rotate(-90deg);
}

.collapse-btn svg {
  transition: transform 0.2s ease;
}

.panel-content {
  padding: 16px;
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
</style>
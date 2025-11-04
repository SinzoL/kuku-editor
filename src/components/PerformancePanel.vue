<template>
  <div class="performance-panel">
    <div class="panel-header">
      <h3>性能优化</h3>
      <button 
        class="collapse-btn"
        @click="toggleCollapse"
        :class="{ 'collapsed': isCollapsed }"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
    </div>
    
    <div class="panel-content" v-show="!isCollapsed">
      <!-- WebAssembly 优化 -->
      <div class="optimization-section">
        <h4>WebAssembly 优化</h4>
        <WasmPanel 
          :has-selected-object="hasSelectedObject"
          @optimize-mesh="$emit('optimize-mesh')"
        />
      </div>
      
      <!-- 预留其他优化功能的位置 -->
      <div class="optimization-section">
        <h4>渲染优化</h4>
        <div class="optimization-item">
          <label>
            <input type="checkbox" v-model="renderOptimizations.frustumCulling">
            视锥体剔除
          </label>
        </div>
        <div class="optimization-item">
          <label>
            <input type="checkbox" v-model="renderOptimizations.occlusionCulling">
            遮挡剔除
          </label>
        </div>
      </div>
      
      <div class="optimization-section">
        <h4>内存优化</h4>
        <div class="optimization-item">
          <button class="optimize-btn" @click="cleanupUnusedResources">
            清理未使用资源
          </button>
        </div>
        <div class="optimization-item">
          <button class="optimize-btn" @click="compressTextures">
            压缩纹理
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import WasmPanel from './WasmPanel.vue'

// Props
defineProps<{
  hasSelectedObject: boolean
}>()

// Emits
defineEmits<{
  'optimize-mesh': []
}>()

// 响应式数据
const isCollapsed = ref(false)

const renderOptimizations = reactive({
  frustumCulling: true,
  occlusionCulling: false
})

// 方法
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const cleanupUnusedResources = () => {
  // TODO: 实现资源清理逻辑
}

const compressTextures = () => {
  // TODO: 实现纹理压缩逻辑
}
</script>

<style scoped>
.performance-panel {
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

.optimization-section {
  margin-bottom: 20px;
}

.optimization-section:last-child {
  margin-bottom: 0;
}

.optimization-section h4 {
  margin: 0 0 12px 0;
  font-size: 12px;
  font-weight: 500;
  color: #c0c0c0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.optimization-item {
  margin-bottom: 8px;
}

.optimization-item:last-child {
  margin-bottom: 0;
}

.optimization-item label {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #d0d0d0;
  cursor: pointer;
}

.optimization-item input[type="checkbox"] {
  margin-right: 8px;
  accent-color: #4CAF50;
}

.optimize-btn {
  width: 100%;
  padding: 8px 12px;
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 6px;
  color: #4CAF50;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.optimize-btn:hover {
  background: rgba(76, 175, 80, 0.2);
  border-color: rgba(76, 175, 80, 0.5);
}

.optimize-btn:active {
  transform: translateY(1px);
}

/* 深色滚动条 */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}

.panel-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
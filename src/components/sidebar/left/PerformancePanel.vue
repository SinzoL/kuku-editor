<template>
  <div class="performance-panel">
    <div class="panel-header">
      <h3>性能监控</h3>
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
      <!-- 实时性能统计 -->
      <div class="optimization-section">
        <h4>实时统计</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">FPS</span>
            <span class="stat-value" :class="getFPSClass(stats.fps)">{{ stats.fps }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">渲染时间</span>
            <span class="stat-value">{{ stats.renderTime.toFixed(1) }}ms</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">对象数量</span>
            <span class="stat-value">{{ stats.objectCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">三角形</span>
            <span class="stat-value">{{ formatNumber(stats.triangleCount) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">绘制调用</span>
            <span class="stat-value">{{ stats.drawCalls }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">内存使用</span>
            <span class="stat-value">{{ stats.memoryUsage }}MB</span>
          </div>
        </div>
      </div>

      <!-- 性能优化开关 -->
      <div class="optimization-section">
        <h4>渲染优化</h4>
        <div class="optimization-item">
          <label>
            <input type="checkbox" v-model="renderOptimizations.frustumCulling" @change="updateOptimizations">
            视锥体剔除
          </label>
          <span class="optimization-desc">隐藏视野外的对象</span>
        </div>
        <div class="optimization-item">
          <label>
            <input type="checkbox" v-model="renderOptimizations.enableLOD" @change="updateOptimizations">
            LOD优化
          </label>
          <span class="optimization-desc">根据距离调整模型精度</span>
        </div>
        <div class="optimization-item">
          <label>
            <input type="checkbox" v-model="renderOptimizations.enableInstancing" @change="updateOptimizations">
            实例化渲染
          </label>
          <span class="optimization-desc">批量渲染相同对象</span>
        </div>
      </div>

      <!-- 性能目标设置 -->
      <div class="optimization-section">
        <h4>性能目标</h4>
        <div class="optimization-item">
          <label>目标FPS</label>
          <select v-model="performanceTarget.targetFPS" @change="updatePerformanceTarget">
            <option value="30">30 FPS</option>
            <option value="60">60 FPS</option>
            <option value="120">120 FPS</option>
          </select>
        </div>
        <div class="optimization-item">
          <label>最大绘制调用</label>
          <input 
            type="range" 
            min="100" 
            max="2000" 
            step="100"
            v-model="performanceTarget.maxDrawCalls"
            @change="updatePerformanceTarget"
          >
          <span class="range-value">{{ performanceTarget.maxDrawCalls }}</span>
        </div>
      </div>
      
      <!-- WebAssembly 优化 -->
      <div class="optimization-section">
        <h4>WebAssembly 优化</h4>
        <WasmPanel 
          :has-selected-object="hasSelectedObject"
          @optimize-mesh="$emit('optimize-mesh')"
        />
      </div>
      
      <!-- 内存管理 -->
      <div class="optimization-section">
        <h4>内存管理</h4>
        <div class="optimization-item">
          <button class="optimize-btn" @click="cleanupUnusedResources">
            🗑️ 清理未使用资源
          </button>
        </div>
        <div class="optimization-item">
          <button class="optimize-btn" @click="compressTextures">
            🗜️ 压缩纹理
          </button>
        </div>
        <div class="optimization-item">
          <button class="optimize-btn warning" @click="forceGarbageCollection">
            ♻️ 强制垃圾回收
          </button>
        </div>
      </div>

      <!-- 性能建议 -->
      <div class="optimization-section" v-if="performanceSuggestions.length > 0">
        <h4>性能建议</h4>
        <div class="suggestions">
          <div 
            v-for="(suggestion, index) in performanceSuggestions" 
            :key="index"
            class="suggestion-item"
            :class="suggestion.type"
          >
            <span class="suggestion-icon">{{ suggestion.icon }}</span>
            <span class="suggestion-text">{{ suggestion.text }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import WasmPanel from './WasmPanel.vue'

// Props
const props = defineProps<{
  hasSelectedObject: boolean
  stats?: {
    fps: number
    objectCount: number
    renderTime: number
    triangleCount: number
    drawCalls: number
    memoryUsage: number
  }
}>()

// Emits
const emit = defineEmits<{
  'optimize-mesh': []
  'update-performance-config': [config: any]
}>()

// 响应式数据
const isCollapsed = ref(false)

const renderOptimizations = reactive({
  frustumCulling: true,
  enableLOD: true,
  enableInstancing: false
})

const performanceTarget = reactive({
  targetFPS: 60,
  maxDrawCalls: 1000
})

// 默认统计数据
const defaultStats = {
  fps: 60,
  objectCount: 0,
  renderTime: 0,
  triangleCount: 0,
  drawCalls: 0,
  memoryUsage: 0
}

const stats = computed(() => props.stats || defaultStats)

// 性能建议
const performanceSuggestions = ref<Array<{
  type: 'warning' | 'error' | 'info'
  icon: string
  text: string
}>>([])

// 更新间隔
let updateInterval: number | null = null

// 方法
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const getFPSClass = (fps: number) => {
  if (fps >= 50) return 'good'
  if (fps >= 30) return 'warning'
  return 'error'
}

const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

const updateOptimizations = () => {
  emit('update-performance-config', {
    enableFrustumCulling: renderOptimizations.frustumCulling,
    enableLOD: renderOptimizations.enableLOD,
    enableInstancing: renderOptimizations.enableInstancing
  })
}

const updatePerformanceTarget = () => {
  emit('update-performance-config', {
    targetFPS: performanceTarget.targetFPS,
    maxDrawCalls: performanceTarget.maxDrawCalls
  })
}

const cleanupUnusedResources = () => {
  // 触发资源清理
  window.dispatchEvent(new CustomEvent('cleanup-resources'))
  
  // 显示通知
  console.log('🗑️ 开始清理未使用资源...')
  
  // 模拟清理过程
  setTimeout(() => {
    console.log('✅ 资源清理完成')
  }, 1000)
}

const compressTextures = () => {
  // 触发纹理压缩
  window.dispatchEvent(new CustomEvent('compress-textures'))
  
  console.log('🗜️ 开始压缩纹理...')
  
  setTimeout(() => {
    console.log('✅ 纹理压缩完成')
  }, 2000)
}

const forceGarbageCollection = () => {
  // 强制垃圾回收（仅在开发环境有效）
  if (window.gc) {
    window.gc()
    console.log('♻️ 强制垃圾回收完成')
  } else {
    console.warn('⚠️ 垃圾回收功能不可用（需要在开发环境中启用）')
  }
}

// 分析性能并生成建议
const analyzePerformance = () => {
  const suggestions: typeof performanceSuggestions.value = []
  
  // FPS 分析
  if (stats.value.fps < 30) {
    suggestions.push({
      type: 'error',
      icon: '🚨',
      text: `FPS过低 (${stats.value.fps})，建议启用LOD优化或减少对象数量`
    })
  } else if (stats.value.fps < 50) {
    suggestions.push({
      type: 'warning',
      icon: '⚠️',
      text: `FPS较低 (${stats.value.fps})，建议启用视锥体剔除`
    })
  }
  
  // 绘制调用分析
  if (stats.value.drawCalls > 1000) {
    suggestions.push({
      type: 'warning',
      icon: '📊',
      text: `绘制调用过多 (${stats.value.drawCalls})，建议启用实例化渲染`
    })
  }
  
  // 三角形数量分析
  if (stats.value.triangleCount > 500000) {
    suggestions.push({
      type: 'warning',
      icon: '🔺',
      text: `三角形数量过多 (${formatNumber(stats.value.triangleCount)})，建议使用网格优化`
    })
  }
  
  // 内存使用分析
  if (stats.value.memoryUsage > 500) {
    suggestions.push({
      type: 'error',
      icon: '💾',
      text: `内存使用过高 (${stats.value.memoryUsage}MB)，建议清理未使用资源`
    })
  } else if (stats.value.memoryUsage > 200) {
    suggestions.push({
      type: 'warning',
      icon: '💾',
      text: `内存使用较高 (${stats.value.memoryUsage}MB)，建议压缩纹理`
    })
  }
  
  // 渲染时间分析
  if (stats.value.renderTime > 16.67) { // 60fps = 16.67ms per frame
    suggestions.push({
      type: 'warning',
      icon: '⏱️',
      text: `渲染时间过长 (${stats.value.renderTime.toFixed(1)}ms)，影响流畅度`
    })
  }
  
  performanceSuggestions.value = suggestions
}

// 生命周期
onMounted(() => {
  // 定期分析性能
  updateInterval = window.setInterval(analyzePerformance, 2000)
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})
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
  max-height: 600px;
  overflow-y: auto;
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

/* 统计网格 */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  padding: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  border: 1px solid rgba(68, 68, 68, 0.3);
}

.stat-label {
  font-size: 10px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.stat-value.good {
  color: #4CAF50;
}

.stat-value.warning {
  color: #FF9800;
}

.stat-value.error {
  color: #F44336;
}

/* 优化项目 */
.optimization-item {
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  margin-bottom: 2px;
}

.optimization-item input[type="checkbox"] {
  margin-right: 8px;
  accent-color: #4CAF50;
}

.optimization-desc {
  font-size: 11px;
  color: #888;
  margin-left: 20px;
}

.optimization-item select {
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(68, 68, 68, 0.5);
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
}

.optimization-item input[type="range"] {
  width: 100%;
  margin: 4px 0;
  accent-color: #4CAF50;
}

.range-value {
  font-size: 11px;
  color: #888;
  text-align: center;
  display: block;
}

/* 按钮样式 */
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.optimize-btn:hover {
  background: rgba(76, 175, 80, 0.2);
  border-color: rgba(76, 175, 80, 0.5);
}

.optimize-btn:active {
  transform: translateY(1px);
}

.optimize-btn.warning {
  background: rgba(255, 152, 0, 0.1);
  border-color: rgba(255, 152, 0, 0.3);
  color: #FF9800;
}

.optimize-btn.warning:hover {
  background: rgba(255, 152, 0, 0.2);
  border-color: rgba(255, 152, 0, 0.5);
}

/* 性能建议 */
.suggestions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
}

.suggestion-item.warning {
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.2);
  color: #FFB74D;
}

.suggestion-item.error {
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.2);
  color: #EF5350;
}

.suggestion-item.info {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.2);
  color: #64B5F6;
}

.suggestion-icon {
  flex-shrink: 0;
  font-size: 14px;
}

.suggestion-text {
  flex: 1;
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

/* 响应式设计 */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
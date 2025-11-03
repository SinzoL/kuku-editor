<template>
  <section class="section">
    <h3>历史记录</h3>
    <div class="history-controls">
      <div class="control-buttons">
        <button 
          class="history-btn undo-btn" 
          :disabled="!canUndo"
          @click="handleUndo"
          title="撤销 (Ctrl+Z)"
        >
          <UndoIcon class="btn-icon" />
          <span class="btn-text">撤销</span>
        </button>
        
        <button 
          class="history-btn redo-btn" 
          :disabled="!canRedo"
          @click="handleRedo"
          title="重做 (Ctrl+Y)"
        >
          <RedoIcon class="btn-icon" />
          <span class="btn-text">重做</span>
        </button>
      </div>
      
      <div class="history-info">
        <div class="info-item" v-if="historyInfo.lastUndoCommand">
          <span class="info-label">上次操作:</span>
          <span class="info-value">{{ historyInfo.lastUndoCommand }}</span>
        </div>
        
        <div class="info-stats">
          <span class="stat-item">
            可撤销: <strong>{{ historyInfo.undoCount }}</strong>
          </span>
          <span class="stat-item">
            可重做: <strong>{{ historyInfo.redoCount }}</strong>
          </span>
        </div>
      </div>
      
      <button 
        class="clear-btn" 
        @click="handleClearHistory"
        :disabled="historyInfo.undoCount === 0 && historyInfo.redoCount === 0"
        title="清空历史记录"
      >
        <TrashIcon class="btn-icon" />
        <span class="btn-text">清空历史</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// 图标组件（简单的SVG图标）
const UndoIcon = {
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 7v6h6"/>
      <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
    </svg>
  `
}

const RedoIcon = {
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 7v6h-6"/>
      <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13"/>
    </svg>
  `
}

const TrashIcon = {
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="3,6 5,6 21,6"/>
      <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
    </svg>
  `
}

// Props
interface Props {
  canUndo: boolean
  canRedo: boolean
  historyInfo: {
    undoCount: number
    redoCount: number
    lastUndoCommand: string | null
    lastRedoCommand: string | null
  }
}

defineProps<Props>()

// Events
const emit = defineEmits<{
  'undo': []
  'redo': []
  'clear-history': []
}>()

// Methods
const handleUndo = () => {
  emit('undo')
}

const handleRedo = () => {
  emit('redo')
}

const handleClearHistory = () => {
  if (confirm('确定要清空所有历史记录吗？此操作不可撤销。')) {
    emit('clear-history')
  }
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

.history-controls {
  padding: 15px;
  background: #2a2a2a;
  border-radius: 8px;
  border: 1px solid #444;
}

.control-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 15px;
}

.history-btn {
  flex: 1;
  background: #333;
  border: 1px solid #555;
  color: white;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.history-btn:hover:not(:disabled) {
  background: #404040;
  border-color: #64ffda;
  transform: translateY(-1px);
}

.history-btn:disabled {
  background: #222;
  border-color: #333;
  color: #666;
  cursor: not-allowed;
  transform: none;
}

.undo-btn:hover:not(:disabled) {
  border-color: #64ffda;
  box-shadow: 0 2px 8px rgba(100, 255, 218, 0.2);
}

.redo-btn:hover:not(:disabled) {
  border-color: #ff9800;
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.2);
}

.btn-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.btn-text {
  font-weight: 500;
}

.history-info {
  margin-bottom: 15px;
  padding: 10px;
  background: #1e1e1e;
  border-radius: 4px;
  border: 1px solid #333;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}

.info-label {
  color: #aaa;
}

.info-value {
  color: #64ffda;
  font-weight: 500;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-stats {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #888;
}

.stat-item strong {
  color: #fff;
}

.clear-btn {
  width: 100%;
  background: #444;
  border: 1px solid #666;
  color: #ccc;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
}

.clear-btn:hover:not(:disabled) {
  background: #d32f2f;
  border-color: #f44336;
  color: white;
}

.clear-btn:disabled {
  background: #222;
  border-color: #333;
  color: #555;
  cursor: not-allowed;
}

/* 键盘快捷键提示 */
.history-btn[title]:hover::after {
  content: attr(title);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #000;
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  white-space: nowrap;
  z-index: 1000;
  margin-bottom: 5px;
}
</style>
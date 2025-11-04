<template>
  <header class="header">
    <div class="logo">
      <WrenchIcon :size="28" color="#64ffda" class="logo-icon" />
      <span class="logo-text">Kuku</span>
    </div>
    <div class="controls">
      <button class="btn" @click="emit('import-config')">导入配置</button>
      <button class="btn" @click="emit('export-config')">导出配置</button>
      <button class="btn" @click="emit('reset-scene')">重置场景</button>
      <button class="btn primary" @click="emit('export-scene')">导出场景</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import WrenchIcon from '@/assets/icons/WrenchIcon.vue'
import { useEventBus, EditorEvents } from '@/composables/useEventBus'

// 事件总线
const { emit } = useEventBus()

// 事件处理
const handleImportConfig = () => {
  emit(EditorEvents.CONFIG_IMPORT)
}

const handleExportConfig = () => {
  emit(EditorEvents.CONFIG_EXPORT)
}

const handleResetScene = () => {
  emit('scene:reset')
}

const handleExportScene = () => {
  emit('scene:export')
}
</script>

<style scoped>
.header {
  grid-column: 1 / -1;
  background: #2d2d2d;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 15px;
  border-bottom: 1px solid #444;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.5rem;
  font-weight: bold;
  color: #64ffda;
}

.logo-icon {
  flex-shrink: 0;
}

.logo-text {
  color: #64ffda;
}

.controls {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.btn {
  background: #333;
  border: 1px solid #555;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
}

.btn:hover {
  background: #404040;
  border-color: #64ffda;
}

.btn.primary {
  background: #64ffda;
  color: #1a1a1a;
  border-color: #64ffda;
}

.btn.primary:hover {
  background: #4fd3b8;
}
</style>
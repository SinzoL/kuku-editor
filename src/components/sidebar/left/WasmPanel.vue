<template>
  <section class="section">
    <div class="wasm-section">
      <div class="wasm-status">
        <span class="status-dot" :class="{ loaded: wasmStore.isLoaded }"></span>
        <span>{{ wasmStore.statusText }}</span>
      </div>
      
      <button 
        class="btn wasm-btn" 
        @click="emit('optimize-mesh')" 
        :disabled="!wasmStore.isLoaded || !hasSelectedObject"
      >
        网格优化
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useWasmStore } from '@/stores/wasm'

// 定义 Props
interface Props {
  hasSelectedObject: boolean
}

defineProps<Props>()

// 定义事件
const emit = defineEmits<{
  'optimize-mesh': []
}>()

// Store
const wasmStore = useWasmStore()
</script>

<style scoped>
.section {
  margin-bottom: 25px;
}

.wasm-section {
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 15px;
}

.wasm-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
  font-size: 13px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff4444;
  transition: background 0.3s;
}

.status-dot.loaded {
  background: #44ff44;
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

.btn:hover:not(:disabled) {
  background: #404040;
  border-color: #64ffda;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wasm-btn {
  width: 100%;
}
</style>
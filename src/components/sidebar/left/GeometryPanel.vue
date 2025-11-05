<template>
  <div class="geometry-panel">
    <div class="panel-header" @click="toggleCollapse">
      <h3>创建几何体</h3>
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
      <div class="geometry-buttons">
        <button 
          v-for="geo in geometryTypes" 
          :key="geo.type"
          class="geo-btn" 
          @click="handleCreateGeometry(geo.type)"
        >
          <component :is="geo.icon" class="geo-icon" />
          {{ geo.name }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { BoxIcon, SphereIcon, CylinderIcon, TorusIcon } from '@/assets/icons'
import { useEventBus, EditorEvents } from '@/composables/useEventBus'

// 事件总线
const { emit } = useEventBus()

// 响应式数据
const isCollapsed = ref(false)

// 几何体类型
const geometryTypes = [
  { type: 'box', name: '立方体', icon: BoxIcon },
  { type: 'sphere', name: '球体', icon: SphereIcon },
  { type: 'cylinder', name: '圆柱体', icon: CylinderIcon },
  { type: 'torus', name: '圆环', icon: TorusIcon }
]

// 通过事件总线创建几何体
const handleCreateGeometry = (type: string) => {
  console.log('🎯 GeometryPanel: 用户点击创建几何体按钮，类型:', type)
  emit(EditorEvents.CREATE_GEOMETRY, { type })
  console.log('📤 GeometryPanel: 已发送 CREATE_GEOMETRY 事件')
}

// 方法
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}
</script>

<style scoped>
.geometry-panel {
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

.geometry-buttons {
  display: grid;
  gap: 8px;
}

.geo-btn {
  background: #333;
  border: 1px solid #555;
  color: white;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.geo-btn:hover {
  background: #404040;
  border-color: #64ffda;
}

.geo-icon {
  width: 16px;
  height: 16px;
  color: #888;
}

.geo-btn:hover .geo-icon {
  color: #64ffda;
}
</style>
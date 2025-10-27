<template>
  <section class="section">
    <h3>创建几何体</h3>
    <div class="geometry-buttons">
      <button 
        v-for="geo in geometryTypes" 
        :key="geo.type"
        class="geo-btn" 
        @click="emit('add-geometry', geo.type)"
      >
        <component :is="geo.icon" class="geo-icon" />
        {{ geo.name }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { BoxIcon, SphereIcon, CylinderIcon, TorusIcon } from '@/assets/icons'

// 定义事件
const emit = defineEmits<{
  'add-geometry': [type: string]
}>()

// 几何体类型
const geometryTypes = [
  { type: 'box', name: '立方体', icon: BoxIcon },
  { type: 'sphere', name: '球体', icon: SphereIcon },
  { type: 'cylinder', name: '圆柱体', icon: CylinderIcon },
  { type: 'torus', name: '圆环', icon: TorusIcon }
]
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
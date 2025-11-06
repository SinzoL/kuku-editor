<template>
  <section class="section">
    <h3>对象属性</h3>
    
    <!-- 选中对象信息 -->
    <div v-if="props.selectedObject" class="selected-object-info">
      <div class="object-info">
        <div class="info-item">
          <span class="info-label">名称:</span>
          <div 
            v-if="!isEditingName" 
            class="object-name" 
            @dblclick="startEditName"
            title="双击编辑名称"
          >
            {{ props.selectedObject.userData?.name || '未知对象' }}
          </div>
          <input 
            v-else
            ref="nameInput"
            v-model="editingName"
            class="object-name-input"
            @blur="finishEditName"
            @keyup.enter="finishEditName"
            @keyup.escape="cancelEditName"
          >
        </div>
        <div class="info-item">
          <span class="info-label">类型:</span>
          <span class="info-value">{{ props.selectedObject.userData?.type || '未知' }}</span>
        </div>
      </div>
      
      <!-- 快速操作按钮 -->
      <div class="quick-actions">
        <button 
          @click="deleteSelected" 
          class="btn btn-danger btn-small"
          title="删除选中对象"
        >
          ✕
        </button>
        
        <button 
          @click="duplicateSelected" 
          class="btn btn-secondary btn-small"
          title="复制选中对象"
        >
          <PlusIcon class="btn-icon" />
        </button>
        
        <button 
          @click="resetTransform" 
          class="btn btn-outline btn-small"
          title="重置变换"
        >
          <ResetIcon class="btn-icon" />
        </button>
      </div>
    </div>

    <!-- 变换属性 -->
    <div v-if="props.selectedObject" class="properties">
      <div class="property-group">
        <label class="property-label">位置 X</label>
        <input 
          :value="objectPosition.x.toFixed(2)" 
          type="number" 
          class="input" 
          step="0.1"
          @input="updatePosition('x', $event)"
        >
      </div>
      <div class="property-group">
        <label class="property-label">位置 Y</label>
        <input 
          :value="objectPosition.y.toFixed(2)" 
          type="number" 
          class="input" 
          step="0.1"
          @input="updatePosition('y', $event)"
        >
      </div>
      <div class="property-group">
        <label class="property-label">位置 Z</label>
        <input 
          :value="objectPosition.z.toFixed(2)" 
          type="number" 
          class="input" 
          step="0.1"
          @input="updatePosition('z', $event)"
        >
      </div>
      <div class="property-group">
        <label class="property-label">缩放 X: {{ objectScale.x.toFixed(3) }}</label>
        <input 
          :value="objectScale.x" 
          type="range" 
          class="slider" 
          min="0.001" 
          max="5" 
          step="0.001"
          @input="updateAxisScale('x', $event)"
        >
      </div>
      <div class="property-group">
        <label class="property-label">缩放 Y: {{ objectScale.y.toFixed(3) }}</label>
        <input 
          :value="objectScale.y" 
          type="range" 
          class="slider" 
          min="0.001" 
          max="5" 
          step="0.001"
          @input="updateAxisScale('y', $event)"
        >
      </div>
      <div class="property-group">
        <label class="property-label">缩放 Z: {{ objectScale.z.toFixed(3) }}</label>
        <input 
          :value="objectScale.z" 
          type="range" 
          class="slider" 
          min="0.001" 
          max="5" 
          step="0.001"
          @input="updateAxisScale('z', $event)"
        >
      </div>
    </div>
    
    <!-- 几何体统计信息 -->
    <div v-if="props.selectedObject && geometryStats" class="geometry-stats">
      <h4 class="stats-title">几何体信息</h4>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">顶点:</span>
          <span class="stat-value">{{ geometryStats.vertices.toLocaleString() }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">三角形:</span>
          <span class="stat-value">{{ Math.floor(geometryStats.triangles).toLocaleString() }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">内存:</span>
          <span class="stat-value">{{ formatMemoryUsage(geometryStats.memoryUsage) }}</span>
        </div>
      </div>
    </div>

    <!-- 无选中对象时的提示 -->
    <div v-else class="no-selection">
      <div class="no-selection-icon">
        <BoxIcon />
      </div>
      <p class="no-selection-text">点击场景中的对象进行选择</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, watch, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useGeometryFactory } from '@/composables/useGeometryFactory'
import { useThreeEngine } from '@/composables/useThreeEngine'
import { useEventBus, EditorEvents } from '@/composables/useEventBus'
import * as THREE from 'three'

// 导入图标组件
import { 
  BoxIcon,
  PlusIcon,
  ResetIcon
} from '@/assets/icons'

// 定义 Props
interface Props {
  selectedObject: any
}

const props = defineProps<Props>()

// 事件总线和相关功能
const { emit } = useEventBus()
const { getGeometryStats } = useGeometryFactory()
const { deleteSelectedObject, addGeometry } = useThreeEngine()

// 强制更新的响应式变量
const forceUpdate = ref(0)

// 名称编辑相关
const isEditingName = ref(false)
const editingName = ref('')
const nameInput = ref<HTMLInputElement>()

// 几何体统计信息
const geometryStats = ref<any>(null)

// 更新几何体统计信息
const updateGeometryStats = () => {
  if (!props.selectedObject || !(props.selectedObject instanceof THREE.Mesh)) {
    geometryStats.value = null
    return
  }
  
  try {
    const geometry = props.selectedObject.geometry
    if (geometry) {
      geometryStats.value = getGeometryStats(geometry)
    }
  } catch (error) {
    console.error('Failed to get geometry stats:', error)
    geometryStats.value = null
  }
}

// 监听自定义事件来强制更新
const handleForceUpdate = () => {
  forceUpdate.value++
}

// 监听 selectedObject 的变化
watch(() => props.selectedObject, (newObject) => {
  forceUpdate.value++
  updateGeometryStats()
}, { immediate: true })

// 计算属性 - 真正依赖 forceUpdate
const objectPosition = computed(() => {
  // 确保依赖 forceUpdate，这样当 forceUpdate 变化时会重新计算
  const _ = forceUpdate.value
  
  if (!props.selectedObject) return { x: 0, y: 0, z: 0 }
  return {
    x: props.selectedObject.position.x,
    y: props.selectedObject.position.y,
    z: props.selectedObject.position.z
  }
})

const objectScale = computed(() => {
  // 确保依赖 forceUpdate，这样当 forceUpdate 变化时会重新计算
  const _ = forceUpdate.value
  
  if (!props.selectedObject) return { x: 1, y: 1, z: 1 }
  return {
    x: props.selectedObject.scale.x,
    y: props.selectedObject.scale.y,
    z: props.selectedObject.scale.z
  }
})

// 更新位置
const updatePosition = (axis: string, event: Event) => {
  const target = event.target as HTMLInputElement
  emit('object:update-position', { axis, value: parseFloat(target.value) })
}

// 更新单轴缩放
const updateAxisScale = (axis: string, event: Event) => {
  const target = event.target as HTMLInputElement
  emit('object:update-scale', { axis, value: parseFloat(target.value) })
}

// 名称编辑方法
const startEditName = () => {
  if (!props.selectedObject) return
  
  isEditingName.value = true
  editingName.value = props.selectedObject.userData?.name || '未知对象'
  
  nextTick(() => {
    nameInput.value?.focus()
    nameInput.value?.select()
  })
}

const finishEditName = () => {
  if (!props.selectedObject) return
  
  const newName = editingName.value.trim()
  const currentName = props.selectedObject.userData?.name || '未知对象'
  
  // 只有当名称真的发生变化时才更新
  if (newName && newName !== currentName) {
    emit('object:update-name', { name: newName })
  }
  
  // 退出编辑模式
  isEditingName.value = false
  editingName.value = ''
}

const cancelEditName = () => {
  isEditingName.value = false
  editingName.value = ''
}

// 删除选中对象
const deleteSelected = () => {
  if (props.selectedObject) {
    deleteSelectedObject()
    emit(EditorEvents.OBJECT_DELETED, {
      object: props.selectedObject
    })
  }
}

// 复制选中对象
const duplicateSelected = () => {
  if (!props.selectedObject) return
  
  const original = props.selectedObject
  const type = original.userData.type
  
  // 创建新的几何体
  const newMesh = addGeometry(type)
  if (newMesh) {
    // 复制位置（稍微偏移）
    newMesh.position.copy(original.position)
    newMesh.position.x += 1
    newMesh.position.z += 1
    
    // 复制旋转和缩放
    newMesh.rotation.copy(original.rotation)
    newMesh.scale.copy(original.scale)
    
    // 复制材质
    if (original instanceof THREE.Mesh && newMesh instanceof THREE.Mesh) {
      if (original.material instanceof THREE.MeshStandardMaterial) {
        const newMaterial = original.material.clone()
        newMesh.material = newMaterial
      }
    }
    
    emit(EditorEvents.OBJECT_ADDED, {
      type: 'duplicate',
      object: newMesh,
      original: original
    })
  }
}

// 重置变换
const resetTransform = () => {
  if (!props.selectedObject) return
  
  props.selectedObject.position.set(0, 0, 0)
  props.selectedObject.rotation.set(0, 0, 0)  
  props.selectedObject.scale.set(1, 1, 1)
  
  emit(EditorEvents.OBJECT_CHANGED, {
    type: 'transform-reset',
    object: props.selectedObject
  })
  
  // 强制更新显示
  forceUpdate.value++
}

// 格式化内存使用量
const formatMemoryUsage = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 组件挂载时监听自定义事件
onMounted(() => {
  window.addEventListener('object-properties-update', handleForceUpdate)
})

// 组件卸载时清理事件监听
onUnmounted(() => {
  window.removeEventListener('object-properties-update', handleForceUpdate)
})
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

.object-name-container{
  font-size: 13px;
  color: #ccc;
  display: flex;
  align-items: center;
  gap: 8px;
}

.object-name{
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.object-name:hover {
  background-color: rgba(100, 255, 218, 0.1);
}

.object-name-input {
  font-size: 14px;
  font-weight: 600;
  background: #333;
  border: 1px solid #64ffda;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  outline: none;
  min-width: 120px;
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

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
}

.no-selection-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.4;
  color: var(--text-muted, #666);
}

.no-selection-text {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted, #666);
  line-height: 1.4;
}

/* 选中对象信息样式 */
.selected-object-info {
  margin-bottom: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.object-info {
  margin-bottom: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}

.info-label {
  color: #ccc;
  font-weight: 500;
  min-width: 40px;
}

.info-value {
  color: #64ffda;
  font-weight: 400;
}

/* 快速操作按钮 */
.quick-actions {
  display: flex;
  gap: 8px;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  flex: 1;
}

.btn-small {
  padding: 6px 8px;
  flex: none;
  min-width: 36px;
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #b91c1c;
}

.btn-secondary {
  background: #333;
  color: #64ffda;
  border: 1px solid #555;
}

.btn-secondary:hover:not(:disabled) {
  background: #404040;
  border-color: #64ffda;
}

.btn-outline {
  background: transparent;
  color: #ccc;
  border: 1px solid #555;
}

.btn-outline:hover:not(:disabled) {
  background: rgba(100, 255, 218, 0.1);
  border-color: #64ffda;
  color: #64ffda;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  width: 14px;
  height: 14px;
}

/* 几何体统计信息 */
.geometry-stats {
  margin-top: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stats-title {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #64ffda;
  font-weight: 500;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}

.stat-label {
  color: #ccc;
}

.stat-value {
  color: #64ffda;
  font-weight: 500;
}
</style>
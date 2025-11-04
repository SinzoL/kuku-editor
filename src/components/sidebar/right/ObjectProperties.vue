<template>
  <section class="section">
    <h3>对象属性</h3>
    <div v-if="props.selectedObject" class="object-name-container">
      名称
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
    <div v-else class="no-selection">
      未选择对象
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, watch, ref, onMounted, onUnmounted, nextTick } from 'vue'

// 定义 Props
interface Props {
  selectedObject: any
}

const props = defineProps<Props>()

// 事件总线
import { useEventBus } from '@/composables/useEventBus'
const { emit } = useEventBus()

// 强制更新的响应式变量
const forceUpdate = ref(0)

// 名称编辑相关
const isEditingName = ref(false)
const editingName = ref('')
const nameInput = ref<HTMLInputElement>()

// 监听自定义事件来强制更新
const handleForceUpdate = () => {
  forceUpdate.value++
}

// 监听 selectedObject 的变化
watch(() => props.selectedObject, () => {
  forceUpdate.value++
})

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
  text-align: center;
  color: #666;
  padding: 20px;
}
</style>
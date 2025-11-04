<template>
  <div class="geometry-config-panel">
    <!-- 几何体类型选择 -->
    <div class="geometry-selector">
      <h3>几何体类型</h3>
      <div class="geometry-grid">
        <button
          v-for="geometry in basicGeometries"
          :key="geometry.type"
          :class="['geometry-btn', { active: selectedType === geometry.type }]"
          @click="selectGeometry(geometry.type)"
          :title="geometry.description"
        >
          <component :is="geometry.icon" class="geometry-icon" />
          <span>{{ geometry.name }}</span>
        </button>
      </div>
    </div>

    <!-- 参数配置 -->
    <div v-if="selectedConfig" class="geometry-params">
      <h3>参数配置</h3>
      
      <div 
        v-for="(groupParams, groupName) in paramGroups" 
        :key="groupName"
        class="param-group"
      >
        <h4 class="group-title">{{ groupName }}</h4>
        
        <div class="param-list">
          <div 
            v-for="param in groupParams" 
            :key="param.key"
            class="param-item"
          >
            <label :for="param.key" class="param-label">
              {{ param.label }}
              <span v-if="param.description" class="param-description">
                {{ param.description }}
              </span>
            </label>
            
            <!-- 数字输入 -->
            <div v-if="param.type === 'number' || param.type === 'integer'" class="param-input-group">
              <input
                :id="param.key"
                v-model.number="currentParams[param.key]"
                :type="param.type === 'integer' ? 'number' : 'number'"
                :min="param.min"
                :max="param.max"
                :step="param.step || (param.type === 'integer' ? 1 : 0.1)"
                class="param-input"
                @input="updateParam(param.key, $event.target.value)"
              />
              <div class="param-slider-container" v-if="param.min !== undefined && param.max !== undefined">
                <input
                  type="range"
                  :min="param.min"
                  :max="param.max"
                  :step="param.step || (param.type === 'integer' ? 1 : 0.01)"
                  v-model.number="currentParams[param.key]"
                  class="param-slider"
                  @input="updateParam(param.key, $event.target.value)"
                />
              </div>
            </div>
            
            <!-- 布尔值输入 -->
            <div v-else-if="param.type === 'boolean'" class="param-input-group">
              <label class="param-checkbox">
                <input
                  :id="param.key"
                  type="checkbox"
                  v-model="currentParams[param.key]"
                  @change="updateParam(param.key, $event.target.checked)"
                />
                <span class="checkmark"></span>
              </label>
            </div>
            
            <!-- 选择输入 -->
            <div v-else-if="param.type === 'select'" class="param-input-group">
              <select
                :id="param.key"
                v-model="currentParams[param.key]"
                class="param-select"
                @change="updateParam(param.key, $event.target.value)"
              >
                <option
                  v-for="option in param.options"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>
            
            <!-- 颜色输入 -->
            <div v-else-if="param.type === 'color'" class="param-input-group">
              <input
                :id="param.key"
                type="color"
                v-model="currentParams[param.key]"
                class="param-color"
                @input="updateParam(param.key, $event.target.value)"
              />
            </div>
            
            <!-- 参数验证错误 -->
            <div v-if="paramErrors[param.key]" class="param-error">
              {{ paramErrors[param.key] }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 预览和操作 -->
    <div v-if="selectedConfig" class="geometry-actions">
      <button 
        @click="createGeometry" 
        class="btn btn-primary"
        :disabled="hasErrors"
      >
        <PlusIcon class="btn-icon" />
        创建几何体
      </button>
      
      <button 
        v-if="selectedObject && selectedObject.geometry"
        @click="updateSelectedGeometry" 
        class="btn btn-secondary"
        :disabled="hasErrors"
      >
        <RefreshIcon class="btn-icon" />
        更新选中对象
      </button>
      
      <button @click="resetParams" class="btn btn-outline">
        <ResetIcon class="btn-icon" />
        重置参数
      </button>
    </div>

    <!-- 几何体统计信息 -->
    <div v-if="geometryStats" class="geometry-stats">
      <h4>几何体信息</h4>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">顶点数:</span>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useGeometryFactory, type GeometryParams } from '@/composables/useGeometryFactory'
import { useThreeEngine } from '@/composables/useThreeEngine'
import { useEventBus, EditorEvents } from '@/composables/useEventBus'

// 导入图标组件
import { 
  BoxIcon, 
  SphereIcon, 
  CylinderIcon, 
  TorusIcon,
  PlusIcon,
  RefreshIcon,
  ResetIcon
} from '@/assets/icons'

const {
  basicGeometries,
  getGeometryConfig,
  createGeometry: factoryCreateGeometry,
  getParamGroups,
  validateParamValue,
  getGeometryStats
} = useGeometryFactory()

const { addGeometry, selectedObject } = useThreeEngine()
const { emit } = useEventBus()

// 响应式状态
const selectedType = ref<string>('box')
const currentParams = ref<GeometryParams>({})
const paramErrors = ref<Record<string, string>>({})
const geometryStats = ref<any>(null)

// 计算属性
const selectedConfig = computed(() => getGeometryConfig(selectedType.value))
const paramGroups = computed(() => 
  selectedType.value ? getParamGroups(selectedType.value) : {}
)
const hasErrors = computed(() => Object.keys(paramErrors.value).length > 0)

// 选择几何体类型
const selectGeometry = (type: string) => {
  selectedType.value = type
  resetParams()
}

// 重置参数
const resetParams = () => {
  if (selectedConfig.value) {
    currentParams.value = { ...selectedConfig.value.params }
    paramErrors.value = {}
    updateGeometryStats()
  }
}

// 更新参数
const updateParam = (key: string, value: any) => {
  currentParams.value[key] = value
  validateParam(key, value)
  updateGeometryStats()
}

// 验证参数
const validateParam = (key: string, value: any) => {
  if (!selectedConfig.value) return
  
  const paramDef = selectedConfig.value.paramDefinitions.find(p => p.key === key)
  if (!paramDef) return
  
  const validation = validateParamValue(paramDef, value)
  if (validation.valid) {
    delete paramErrors.value[key]
  } else {
    paramErrors.value[key] = validation.error || '参数无效'
  }
}

// 更新几何体统计信息
const updateGeometryStats = () => {
  if (!selectedConfig.value || hasErrors.value) {
    geometryStats.value = null
    return
  }
  
  try {
    const geometry = factoryCreateGeometry(selectedType.value, currentParams.value)
    if (geometry) {
      geometryStats.value = getGeometryStats(geometry)
      geometry.dispose() // 清理临时几何体
    }
  } catch (error) {
    console.error('Failed to create preview geometry:', error)
    geometryStats.value = null
  }
}

// 创建几何体
const createGeometry = () => {
  if (hasErrors.value || !selectedConfig.value) return
  
  const mesh = addGeometry(selectedType.value)
  if (mesh) {
    emit(EditorEvents.OBJECT_ADDED, {
      type: 'geometry',
      object: mesh,
      geometryType: selectedType.value,
      params: currentParams.value
    })
  }
}

// 更新选中对象的几何体
const updateSelectedGeometry = () => {
  if (!selectedObject.value || hasErrors.value || !selectedConfig.value) return
  
  try {
    const newGeometry = factoryCreateGeometry(selectedType.value, currentParams.value)
    if (newGeometry && selectedObject.value.geometry) {
      // 保存旧几何体用于撤销
      const oldGeometry = selectedObject.value.geometry
      
      // 更新几何体
      selectedObject.value.geometry = newGeometry
      
      // 清理旧几何体
      oldGeometry.dispose()
      
      emit(EditorEvents.OBJECT_CHANGED, {
        type: 'geometry-updated',
        object: selectedObject.value,
        geometryType: selectedType.value,
        params: currentParams.value
      })
    }
  } catch (error) {
    console.error('Failed to update geometry:', error)
  }
}

// 格式化内存使用量
const formatMemoryUsage = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 监听选中对象变化
watch(selectedObject, (newObject) => {
  if (newObject && newObject.geometry && newObject.geometry.userData?.type) {
    const geometryType = newObject.geometry.userData.type
    if (getGeometryConfig(geometryType)) {
      selectedType.value = geometryType
      if (newObject.geometry.userData.params) {
        currentParams.value = { ...newObject.geometry.userData.params }
      } else {
        resetParams()
      }
    }
  }
})

// 初始化
onMounted(() => {
  resetParams()
})
</script>

<style scoped>
.geometry-config-panel {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 16px;
}

.geometry-selector h3,
.geometry-params h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.geometry-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}

.geometry-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-secondary);
  font-size: 12px;
}

.geometry-btn:hover {
  border-color: var(--primary-color);
  background: var(--bg-hover);
}

.geometry-btn.active {
  border-color: var(--primary-color);
  background: var(--primary-color-alpha);
  color: var(--primary-color);
}

.geometry-icon {
  width: 24px;
  height: 24px;
  margin-bottom: 4px;
}

.param-group {
  margin-bottom: 20px;
}

.group-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 8px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-color);
}

.param-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.param-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.param-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.param-description {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: normal;
  display: block;
  margin-top: 2px;
}

.param-input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.param-input {
  padding: 6px 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 12px;
}

.param-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.param-slider-container {
  margin-top: 4px;
}

.param-slider {
  width: 100%;
  height: 4px;
  background: var(--bg-primary);
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
}

.param-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: var(--primary-color);
  border-radius: 50%;
  cursor: pointer;
}

.param-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.param-checkbox input {
  display: none;
}

.checkmark {
  width: 16px;
  height: 16px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 3px;
  position: relative;
}

.param-checkbox input:checked + .checkmark {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.param-checkbox input:checked + .checkmark::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 10px;
  font-weight: bold;
}

.param-select {
  padding: 6px 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 12px;
}

.param-color {
  width: 40px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
}

.param-error {
  color: var(--error-color);
  font-size: 11px;
  margin-top: 2px;
}

.geometry-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
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
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-color-hover);
}

.btn-secondary {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-hover);
}

.btn-outline {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn-outline:hover:not(:disabled) {
  background: var(--bg-hover);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  width: 14px;
  height: 14px;
}

.geometry-stats {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.geometry-stats h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: var(--text-primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}

.stat-label {
  color: var(--text-secondary);
}

.stat-value {
  color: var(--text-primary);
  font-weight: 500;
}
</style>
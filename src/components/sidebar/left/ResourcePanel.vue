<template>
  <div class="resource-panel">
    <div class="panel-header" @click="toggleExpanded">
      <span class="panel-title">引入资源</span>
      <svg 
        class="expand-icon" 
        :class="{ 'expanded': isExpanded }"
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="2"
      >
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </div>
    
    <div class="panel-content" v-show="isExpanded">
      <!-- 3D模型导入 -->
      <div class="resource-section">
        <h4>3D模型</h4>
        <div class="upload-area" @click="triggerModelUpload" @dragover.prevent @drop="handleModelDrop">
          <input 
            ref="modelInput" 
            type="file" 
            accept=".glb,.gltf,.obj,.fbx" 
            @change="handleModelUpload"
            style="display: none"
          />
          <div class="upload-content">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <p>点击或拖拽导入3D模型</p>
            <small>支持 .glb, .gltf, .obj, .fbx 格式</small>
          </div>
        </div>
      </div>

      <!-- 纹理导入 -->
      <div class="resource-section">
        <h4>纹理贴图</h4>
        <div class="upload-area" @click="triggerTextureUpload" @dragover.prevent @drop="handleTextureDrop">
          <input 
            ref="textureInput" 
            type="file" 
            accept=".jpg,.jpeg,.png,.webp,.bmp" 
            @change="handleTextureUpload"
            style="display: none"
          />
          <div class="upload-content">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21,15 16,10 5,21"/>
            </svg>
            <p>点击或拖拽导入纹理</p>
            <small>支持 .jpg, .png, .webp 等格式</small>
          </div>
        </div>
      </div>

      <!-- 已导入资源列表 -->
      <div class="resource-section" v-if="importedResources.length > 0">
        <h4>已导入资源</h4>
        <div class="resource-list">
          <div 
            v-for="resource in importedResources" 
            :key="resource.id"
            class="resource-item"
            @click="selectResource(resource)"
            :class="{ 'selected': selectedResource?.id === resource.id }"
          >
            <div class="resource-icon">
              <svg v-if="resource.type === 'model'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21,15 16,10 5,21"/>
              </svg>
            </div>
            <div class="resource-info">
              <span class="resource-name">{{ resource.name }}</span>
              <small class="resource-type">{{ resource.type === 'model' ? '3D模型' : '纹理' }}</small>
            </div>
            <button 
              class="delete-resource" 
              @click.stop="deleteResource(resource.id)"
              title="删除资源"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"/>
                <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="resource-actions" v-if="selectedResource">
        <button 
          class="action-btn primary" 
          @click="addResourceToScene"
          :disabled="!selectedResource"
        >
          添加到场景
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useEventBus, EditorEvents } from '@/composables/useEventBus'

// 组件状态
const isExpanded = ref(true)
const modelInput = ref<HTMLInputElement>()
const textureInput = ref<HTMLInputElement>()

// 资源管理
interface ImportedResource {
  id: string
  name: string
  type: 'model' | 'texture'
  file: File
  url: string
}

const importedResources = reactive<ImportedResource[]>([])
const selectedResource = ref<ImportedResource | null>(null)

// 事件总线
const { emit } = useEventBus()

// 面板展开/收起
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

// 生成唯一ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// 创建资源URL
const createResourceUrl = (file: File): string => {
  return URL.createObjectURL(file)
}

// 3D模型上传
const triggerModelUpload = () => {
  modelInput.value?.click()
}

const handleModelUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    processModelFile(file)
  }
}

const handleModelDrop = (event: DragEvent) => {
  event.preventDefault()
  const file = event.dataTransfer?.files[0]
  if (file && isValidModelFile(file)) {
    processModelFile(file)
  }
}

const isValidModelFile = (file: File): boolean => {
  const validExtensions = ['.glb', '.gltf', '.obj', '.fbx']
  return validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
}

const processModelFile = (file: File) => {
  const resource: ImportedResource = {
    id: generateId(),
    name: file.name,
    type: 'model',
    file,
    url: createResourceUrl(file)
  }
  
  importedResources.push(resource)
  selectedResource.value = resource
  
  emit(EditorEvents.IMPORT_MODEL, { file, name: file.name })
}

// 纹理上传
const triggerTextureUpload = () => {
  textureInput.value?.click()
}

const handleTextureUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    processTextureFile(file)
  }
}

const handleTextureDrop = (event: DragEvent) => {
  event.preventDefault()
  const file = event.dataTransfer?.files[0]
  if (file && isValidTextureFile(file)) {
    processTextureFile(file)
  }
}

const isValidTextureFile = (file: File): boolean => {
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp']
  return validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
}

const processTextureFile = (file: File) => {
  const resource: ImportedResource = {
    id: generateId(),
    name: file.name,
    type: 'texture',
    file,
    url: createResourceUrl(file)
  }
  
  importedResources.push(resource)
  selectedResource.value = resource
  
  emit(EditorEvents.IMPORT_TEXTURE, { file, name: file.name })
}

// 资源操作
const selectResource = (resource: ImportedResource) => {
  selectedResource.value = resource
}

const deleteResource = (resourceId: string) => {
  const index = importedResources.findIndex(r => r.id === resourceId)
  if (index !== -1) {
    const resource = importedResources[index]
    URL.revokeObjectURL(resource.url) // 清理内存
    importedResources.splice(index, 1)
    
    if (selectedResource.value?.id === resourceId) {
      selectedResource.value = null
    }
  }
}

const addResourceToScene = () => {
  if (selectedResource.value) {
    emit(EditorEvents.ADD_RESOURCE_TO_SCENE, selectedResource.value)
  }
}
</script>

<style scoped>
.resource-panel {
  margin-bottom: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.panel-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.panel-title {
  font-weight: 500;
  color: white;
}

.expand-icon {
  transition: transform 0.2s;
  color: rgba(255, 255, 255, 0.7);
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.panel-content {
  padding: 0 1rem 1rem;
}

.resource-section {
  margin-bottom: 1.5rem;
}

.resource-section h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.upload-area {
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  padding: 1rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.05);
}

.upload-area:hover {
  border-color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.1);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.upload-content svg {
  color: rgba(255, 255, 255, 0.6);
}

.upload-content p {
  margin: 0;
  color: white;
  font-size: 0.9rem;
}

.upload-content small {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
}

.resource-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.resource-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.resource-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.resource-item.selected {
  background: rgba(74, 144, 226, 0.3);
  border: 1px solid rgba(74, 144, 226, 0.5);
}

.resource-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: rgba(255, 255, 255, 0.7);
}

.resource-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.resource-name {
  color: white;
  font-size: 0.85rem;
  font-weight: 500;
}

.resource-type {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
}

.delete-resource {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.delete-resource:hover {
  background: rgba(220, 53, 69, 0.2);
  color: #dc3545;
}

.resource-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.action-btn {
  flex: 1;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.primary {
  background: #4a90e2;
  color: white;
}

.action-btn.primary:hover:not(:disabled) {
  background: #357abd;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
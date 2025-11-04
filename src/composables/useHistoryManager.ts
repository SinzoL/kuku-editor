import { ref, computed } from 'vue'
import * as THREE from 'three'
import { useEventBus, EditorEvents } from './useEventBus'

// 基础命令接口
export interface ICommand {
  id: string
  name: string
  type: string
  timestamp: number
  execute(): void
  undo(): void
  canMerge?(other: ICommand): boolean
  merge?(other: ICommand): void
  toJSON(): any
  fromJSON?(data: any): void
}

// 抽象命令基类
export abstract class BaseCommand implements ICommand {
  public id: string
  public timestamp: number
  
  constructor(
    public name: string,
    public type: string
  ) {
    this.id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.timestamp = Date.now()
  }
  
  abstract execute(): void
  abstract undo(): void
  
  canMerge(other: ICommand): boolean {
    return false // 默认不支持合并
  }
  
  merge(other: ICommand): void {
    // 默认不实现合并逻辑
  }
  
  toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      timestamp: this.timestamp
    }
  }
}

// 批量命令 - 支持组合多个命令
export class BatchCommand extends BaseCommand {
  private commands: ICommand[] = []
  
  constructor(name: string, commands: ICommand[] = []) {
    super(name, 'batch')
    this.commands = [...commands]
  }
  
  addCommand(command: ICommand): void {
    this.commands.push(command)
  }
  
  execute(): void {
    this.commands.forEach(cmd => cmd.execute())
  }
  
  undo(): void {
    // 反向执行撤销
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo()
    }
  }
  
  toJSON(): any {
    return {
      ...super.toJSON(),
      commands: this.commands.map(cmd => cmd.toJSON())
    }
  }
}

// 创建对象命令
export class CreateObjectCommand extends BaseCommand {
  constructor(
    private scene: THREE.Scene,
    private objects: THREE.Object3D[],
    private object: THREE.Object3D
  ) {
    super(`创建 ${object.userData.name || object.type}`, 'create_object')
  }
  
  execute(): void {
    this.scene.add(this.object)
    this.objects.push(this.object)
  }
  
  undo(): void {
    this.scene.remove(this.object)
    const index = this.objects.indexOf(this.object)
    if (index > -1) {
      this.objects.splice(index, 1)
    }
  }
  
  toJSON(): any {
    return {
      ...super.toJSON(),
      objectData: {
        type: this.object.userData.type,
        name: this.object.userData.name,
        position: this.object.position.toArray(),
        rotation: this.object.rotation.toArray(),
        scale: this.object.scale.toArray()
      }
    }
  }
}

// 删除对象命令
export class DeleteObjectCommand extends BaseCommand {
  private index: number
  
  constructor(
    private scene: THREE.Scene,
    private objects: THREE.Object3D[],
    private object: THREE.Object3D,
    index?: number
  ) {
    super(`删除 ${object.userData.name || object.type}`, 'delete_object')
    this.index = index ?? objects.indexOf(object)
  }
  
  execute(): void {
    // 强制清理导入模型的所有子对象
    if (this.object.userData.type === 'imported-model') {
      // 递归移除所有子对象
      const removeChildren = (obj: THREE.Object3D) => {
        while (obj.children.length > 0) {
          const child = obj.children[0]
          removeChildren(child) // 递归清理子对象
          obj.remove(child) // 从父对象移除
          
          // 清理网格资源
          if (child instanceof THREE.Mesh) {
            if (child.geometry) {
              child.geometry.dispose()
            }
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => mat.dispose())
              } else {
                child.material.dispose()
              }
            }
          }
        }
      }
      
      removeChildren(this.object)
    }
    
    // 从场景中移除对象
    this.scene.remove(this.object)
    
    // 强制清理对象本身
    if (this.object instanceof THREE.Mesh) {
      if (this.object.geometry) {
        this.object.geometry.dispose()
      }
      if (this.object.material) {
        if (Array.isArray(this.object.material)) {
          this.object.material.forEach(mat => mat.dispose())
        } else {
          this.object.material.dispose()
        }
      }
    }
    
    // 从objects数组中移除对象
    const currentIndex = this.objects.indexOf(this.object)
    if (currentIndex > -1) {
      this.objects.splice(currentIndex, 1)
    }
  }
  
  undo(): void {
    this.scene.add(this.object)
    this.objects.splice(this.index, 0, this.object)
  }
}

// 变换对象命令 - 支持合并连续变换
export class TransformObjectCommand extends BaseCommand {
  constructor(
    private object: THREE.Object3D,
    private oldTransform: {
      position: THREE.Vector3
      rotation: THREE.Euler
      scale: THREE.Vector3
    },
    private newTransform: {
      position: THREE.Vector3
      rotation: THREE.Euler
      scale: THREE.Vector3
    },
    private transformType: 'translate' | 'rotate' | 'scale' = 'translate'
  ) {
    super(`${transformType} ${object.userData.name || object.type}`, `transform_${transformType}`)
  }
  
  execute(): void {
    this.object.position.copy(this.newTransform.position)
    this.object.rotation.copy(this.newTransform.rotation)
    this.object.scale.copy(this.newTransform.scale)
  }
  
  undo(): void {
    this.object.position.copy(this.oldTransform.position)
    this.object.rotation.copy(this.oldTransform.rotation)
    this.object.scale.copy(this.oldTransform.scale)
  }
  
  canMerge(other: ICommand): boolean {
    if (!(other instanceof TransformObjectCommand)) return false
    if (other.object !== this.object) return false
    if (other.transformType !== this.transformType) return false
    
    // 只合并在短时间内的连续变换
    const timeDiff = other.timestamp - this.timestamp
    return timeDiff < 1000 // 1秒内的变换可以合并
  }
  
  merge(other: ICommand): void {
    if (other instanceof TransformObjectCommand && this.canMerge(other)) {
      // 更新结束状态为最新的变换
      this.newTransform = { ...other.newTransform }
      this.timestamp = other.timestamp
    }
  }
}

// 移动对象命令
export class MoveObjectCommand extends BaseCommand {
  constructor(
    private object: THREE.Object3D,
    private oldPosition: THREE.Vector3,
    private newPosition: THREE.Vector3
  ) {
    super(`移动 ${object.userData.name || object.type}`, 'move_object')
  }
  
  execute(): void {
    this.object.position.copy(this.newPosition)
  }
  
  undo(): void {
    this.object.position.copy(this.oldPosition)
  }
  
  canMerge(other: ICommand): boolean {
    if (!(other instanceof MoveObjectCommand)) return false
    if (other.object !== this.object) return false
    
    // 只合并在短时间内的连续移动
    const timeDiff = other.timestamp - this.timestamp
    return timeDiff < 1000 // 1秒内的移动可以合并
  }
  
  merge(other: ICommand): void {
    if (other instanceof MoveObjectCommand && this.canMerge(other)) {
      this.newPosition = other.newPosition.clone()
      this.timestamp = other.timestamp
    }
  }
}

// 旋转对象命令
export class RotateObjectCommand extends BaseCommand {
  constructor(
    private object: THREE.Object3D,
    private oldRotation: THREE.Euler,
    private newRotation: THREE.Euler
  ) {
    super(`旋转 ${object.userData.name || object.type}`, 'rotate_object')
  }
  
  execute(): void {
    this.object.rotation.copy(this.newRotation)
  }
  
  undo(): void {
    this.object.rotation.copy(this.oldRotation)
  }
  
  canMerge(other: ICommand): boolean {
    if (!(other instanceof RotateObjectCommand)) return false
    if (other.object !== this.object) return false
    
    const timeDiff = other.timestamp - this.timestamp
    return timeDiff < 1000
  }
  
  merge(other: ICommand): void {
    if (other instanceof RotateObjectCommand && this.canMerge(other)) {
      this.newRotation = other.newRotation.clone()
      this.timestamp = other.timestamp
    }
  }
}

// 缩放对象命令
export class ScaleObjectCommand extends BaseCommand {
  constructor(
    private object: THREE.Object3D,
    private oldScale: THREE.Vector3,
    private newScale: THREE.Vector3
  ) {
    super(`缩放 ${object.userData.name || object.type}`, 'scale_object')
  }
  
  execute(): void {
    this.object.scale.copy(this.newScale)
  }
  
  undo(): void {
    this.object.scale.copy(this.oldScale)
  }
  
  canMerge(other: ICommand): boolean {
    if (!(other instanceof ScaleObjectCommand)) return false
    if (other.object !== this.object) return false
    
    const timeDiff = other.timestamp - this.timestamp
    return timeDiff < 1000
  }
  
  merge(other: ICommand): void {
    if (other instanceof ScaleObjectCommand && this.canMerge(other)) {
      this.newScale = other.newScale.clone()
      this.timestamp = other.timestamp
    }
  }
}

// 材质变更命令
export class MaterialChangeCommand extends BaseCommand {
  constructor(
    private object: THREE.Mesh,
    private oldMaterial: THREE.Material,
    private newMaterial: THREE.Material
  ) {
    super(`修改材质 ${object.userData.name || object.type}`, 'material_change')
  }
  
  execute(): void {
    this.object.material = this.newMaterial
  }
  
  undo(): void {
    this.object.material = this.oldMaterial
  }
}

// 复合命令（兼容原有的CompositeCommand）
export class CompositeCommand extends BaseCommand {
  constructor(
    private commands: ICommand[],
    name: string = '批量操作'
  ) {
    super(name, 'composite')
  }
  
  execute(): void {
    this.commands.forEach(cmd => cmd.execute())
  }
  
  undo(): void {
    // 反向执行撤销
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo()
    }
  }
  
  toJSON(): any {
    return {
      ...super.toJSON(),
      commands: this.commands.map(cmd => cmd.toJSON())
    }
  }
}

// 历史管理器
export function useHistoryManager() {
  const { emit } = useEventBus()
  
  const history = ref<ICommand[]>([])
  const currentIndex = ref(-1)
  const maxHistorySize = ref(100)
  const isExecuting = ref(false)
  
  // 计算属性
  const canUndo = computed(() => currentIndex.value >= 0)
  const canRedo = computed(() => currentIndex.value < history.value.length - 1)
  const historySize = computed(() => history.value.length)
  const currentCommand = computed(() => 
    currentIndex.value >= 0 ? history.value[currentIndex.value] : null
  )
  
  // 执行命令
  const executeCommand = (command: ICommand) => {
    if (isExecuting.value) return
    
    isExecuting.value = true
    
    try {
      // 尝试与最后一个命令合并
      const lastCommand = history.value[currentIndex.value]
      if (lastCommand && lastCommand.canMerge?.(command)) {
        lastCommand.merge?.(command)
        emit(EditorEvents.HISTORY_CHANGED, {
          type: 'merge',
          command: lastCommand
        })
        return
      }
      
      // 执行新命令
      command.execute()
      
      // 清除当前位置之后的历史
      if (currentIndex.value < history.value.length - 1) {
        history.value = history.value.slice(0, currentIndex.value + 1)
      }
      
      // 添加到历史
      history.value.push(command)
      currentIndex.value = history.value.length - 1
      
      // 限制历史大小
      if (history.value.length > maxHistorySize.value) {
        history.value.shift()
        currentIndex.value--
      }
      
      emit(EditorEvents.HISTORY_CHANGED, {
        type: 'execute',
        command,
        canUndo: canUndo.value,
        canRedo: canRedo.value
      })
      
    } finally {
      isExecuting.value = false
    }
  }
  
  // 撤销
  const undo = () => {
    if (!canUndo.value || isExecuting.value) return
    
    isExecuting.value = true
    
    try {
      const command = history.value[currentIndex.value]
      command.undo()
      currentIndex.value--
      
      emit(EditorEvents.HISTORY_UNDO, {
        command,
        canUndo: canUndo.value,
        canRedo: canRedo.value
      })
      
    } finally {
      isExecuting.value = false
    }
  }
  
  // 重做
  const redo = () => {
    if (!canRedo.value || isExecuting.value) return
    
    isExecuting.value = true
    
    try {
      currentIndex.value++
      const command = history.value[currentIndex.value]
      command.execute()
      
      emit(EditorEvents.HISTORY_REDO, {
        command,
        canUndo: canUndo.value,
        canRedo: canRedo.value
      })
      
    } finally {
      isExecuting.value = false
    }
  }
  
  // 清空历史
  const clearHistory = () => {
    history.value = []
    currentIndex.value = -1
    
    emit(EditorEvents.HISTORY_CHANGED, {
      type: 'clear',
      canUndo: false,
      canRedo: false
    })
  }
  
  // 获取历史信息
  const getHistoryInfo = () => ({
    totalCommands: history.value.length,
    currentIndex: currentIndex.value,
    canUndo: canUndo.value,
    canRedo: canRedo.value,
    currentCommand: currentCommand.value?.name || null,
    recentCommands: history.value.slice(-10).map(cmd => ({
      name: cmd.name,
      type: cmd.type,
      timestamp: cmd.timestamp
    }))
  })
  
  // 导出历史
  const exportHistory = () => {
    return {
      version: '1.0',
      timestamp: Date.now(),
      commands: history.value.map(cmd => cmd.toJSON())
    }
  }
  
  return {
    // 状态
    history: history.value,
    currentIndex,
    canUndo,
    canRedo,
    historySize,
    currentCommand,
    isExecuting,
    maxHistorySize,
    
    // 方法
    executeCommand,
    undo,
    redo,
    clearHistory,
    getHistoryInfo,
    exportHistory,
    
    // 命令类（保持向后兼容）
    CreateObjectCommand,
    DeleteObjectCommand,
    MoveObjectCommand,
    RotateObjectCommand,
    ScaleObjectCommand,
    MaterialChangeCommand,
    TransformObjectCommand,
    BatchCommand,
    CompositeCommand, // 兼容原有名称
    
    // 新增命令类
    BaseCommand
  }
}
import { ref } from 'vue'

// 命令接口
export interface Command {
  execute(): void
  undo(): void
  canUndo(): boolean
  description: string
}

// 基础命令类
export abstract class BaseCommand implements Command {
  abstract execute(): void
  abstract undo(): void
  canUndo(): boolean { return true }
  abstract description: string
}

// 创建对象命令
export class CreateObjectCommand extends BaseCommand {
  description = '创建对象'
  
  constructor(
    private scene: THREE.Scene,
    private objects: THREE.Mesh[],
    private object: THREE.Mesh
  ) {
    super()
  }
  
  execute(): void {
    this.scene.add(this.object)
    if (!this.objects.includes(this.object)) {
      this.objects.push(this.object)
    }
  }
  
  undo(): void {
    this.scene.remove(this.object)
    const index = this.objects.indexOf(this.object)
    if (index > -1) {
      this.objects.splice(index, 1)
    }
  }
}

// 删除对象命令
export class DeleteObjectCommand extends BaseCommand {
  description = '删除对象'
  
  constructor(
    private scene: THREE.Scene,
    private objects: THREE.Mesh[],
    private object: THREE.Mesh,
    private objectIndex: number
  ) {
    super()
  }
  
  execute(): void {
    this.scene.remove(this.object)
    const index = this.objects.indexOf(this.object)
    if (index > -1) {
      this.objects.splice(index, 1)
    }
  }
  
  undo(): void {
    this.scene.add(this.object)
    this.objects.splice(this.objectIndex, 0, this.object)
  }
}

// 移动对象命令
export class MoveObjectCommand extends BaseCommand {
  description = '移动对象'
  
  constructor(
    private object: THREE.Mesh,
    private oldPosition: THREE.Vector3,
    private newPosition: THREE.Vector3
  ) {
    super()
  }
  
  execute(): void {
    this.object.position.copy(this.newPosition)
  }
  
  undo(): void {
    this.object.position.copy(this.oldPosition)
  }
}

// 旋转对象命令
export class RotateObjectCommand extends BaseCommand {
  description = '旋转对象'
  
  constructor(
    private object: THREE.Mesh,
    private oldRotation: THREE.Euler,
    private newRotation: THREE.Euler
  ) {
    super()
  }
  
  execute(): void {
    this.object.rotation.copy(this.newRotation)
  }
  
  undo(): void {
    this.object.rotation.copy(this.oldRotation)
  }
}

// 缩放对象命令
export class ScaleObjectCommand extends BaseCommand {
  description = '缩放对象'
  
  constructor(
    private object: THREE.Mesh,
    private oldScale: THREE.Vector3,
    private newScale: THREE.Vector3
  ) {
    super()
  }
  
  execute(): void {
    this.object.scale.copy(this.newScale)
  }
  
  undo(): void {
    this.object.scale.copy(this.oldScale)
  }
}

// 复合命令（用于批量操作）
export class CompositeCommand extends BaseCommand {
  description = '批量操作'
  
  constructor(private commands: Command[]) {
    super()
  }
  
  execute(): void {
    this.commands.forEach(cmd => cmd.execute())
  }
  
  undo(): void {
    // 反向执行撤销
    [...this.commands].reverse().forEach(cmd => cmd.undo())
  }
}

// 历史管理器
export function useHistoryManager() {
  const undoStack = ref<Command[]>([])
  const redoStack = ref<Command[]>([])
  const maxHistorySize = ref(50)
  
  // 执行命令
  const executeCommand = (command: Command) => {
    command.execute()
    
    // 添加到撤销栈
    undoStack.value.push(command)
    
    // 清空重做栈（新操作会使重做失效）
    redoStack.value = []
    
    // 限制历史记录数量
    if (undoStack.value.length > maxHistorySize.value) {
      undoStack.value.shift()
    }
    
    console.log(`✅ 执行命令: ${command.description}`)
  }
  
  // 撤销
  const undo = (): boolean => {
    if (undoStack.value.length === 0) {
      console.log('❌ 没有可撤销的操作')
      return false
    }
    
    const command = undoStack.value.pop()!
    if (command.canUndo()) {
      command.undo()
      redoStack.value.push(command)
      console.log(`↶ 撤销: ${command.description}`)
      return true
    }
    
    return false
  }
  
  // 重做
  const redo = (): boolean => {
    if (redoStack.value.length === 0) {
      console.log('❌ 没有可重做的操作')
      return false
    }
    
    const command = redoStack.value.pop()!
    command.execute()
    undoStack.value.push(command)
    console.log(`↷ 重做: ${command.description}`)
    return true
  }
  
  // 清空历史
  const clearHistory = () => {
    undoStack.value = []
    redoStack.value = []
    console.log('🗑️ 历史记录已清空')
  }
  
  // 获取历史状态
  const canUndo = () => undoStack.value.length > 0
  const canRedo = () => redoStack.value.length > 0
  
  // 获取历史信息
  const getHistoryInfo = () => ({
    undoCount: undoStack.value.length,
    redoCount: redoStack.value.length,
    lastUndoCommand: undoStack.value[undoStack.value.length - 1]?.description || null,
    lastRedoCommand: redoStack.value[redoStack.value.length - 1]?.description || null
  })
  
  return {
    // 方法
    executeCommand,
    undo,
    redo,
    clearHistory,
    
    // 状态
    canUndo,
    canRedo,
    getHistoryInfo,
    
    // 配置
    maxHistorySize
  }
}
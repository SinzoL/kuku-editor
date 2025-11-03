import { ref, markRaw } from 'vue'
import * as THREE from 'three'
import { useWasmStore } from '@/stores/wasm'
import { 
  useHistoryManager, 
  CreateObjectCommand, 
  DeleteObjectCommand, 
  MoveObjectCommand,
  RotateObjectCommand,
  ScaleObjectCommand
} from './useHistoryManager'

export function useThreeEngine() {
  // Three.js 核心对象
  const scene = ref<THREE.Scene>()
  const camera = ref<THREE.PerspectiveCamera>()
  const renderer = ref<THREE.WebGLRenderer>()
  const controls = ref<any>()
  
  // 场景对象
  const objects = ref<THREE.Mesh[]>([])
  const selectedObject = ref<THREE.Mesh | null>(null)
  const transformControls = ref<any>(null)
  
  // 统计信息
  const stats = ref({
    fps: 60,
    objectCount: 0,
    renderTime: 0
  })

  // WASM Store
  const wasmStore = useWasmStore()

  // 历史管理器
  const historyManager = useHistoryManager()

  // 初始化引擎
  const initEngine = async (canvas: HTMLCanvasElement) => {
    try {
      // 创建场景 - 使用 markRaw 防止响应式代理
      scene.value = markRaw(new THREE.Scene())
      scene.value.background = new THREE.Color(0x1a1a1a)
      
      // 创建相机 - 使用 markRaw 防止响应式代理
      const container = canvas.parentElement!
      camera.value = markRaw(new THREE.PerspectiveCamera(
        75, 
        container.clientWidth / container.clientHeight, 
        0.1, 
        1000
      ))
      camera.value.position.set(20, 20, 20)
      
      // 创建渲染器 - 使用 markRaw 防止响应式代理
      renderer.value = markRaw(new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true 
      }))
      renderer.value.setSize(container.clientWidth, container.clientHeight)
      renderer.value.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // 提高像素比，减少锯齿
      renderer.value.shadowMap.enabled = true
      renderer.value.shadowMap.type = THREE.PCFSoftShadowMap
      
      // 动态导入 OrbitControls - 使用 markRaw 防止响应式代理
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
      controls.value = markRaw(new OrbitControls(camera.value, renderer.value.domElement))
      controls.value.enableDamping = true
      controls.value.dampingFactor = 0.05
      
      // 动态导入 TransformControls - 用于对象变换
      const { TransformControls } = await import('three/examples/jsm/controls/TransformControls.js')
      transformControls.value = markRaw(new TransformControls(camera.value, renderer.value.domElement))
      transformControls.value.setMode('translate') // 默认平移模式
      transformControls.value.setSize(0.8)
      scene.value.add(transformControls.value)
      
      // 添加拖拽状态跟踪和变换历史记录
      let isDragging = false
      let transformStartState: {
        position: THREE.Vector3
        rotation: THREE.Euler
        scale: THREE.Vector3
      } | null = null
      
      // TransformControls 事件处理
      transformControls.value.addEventListener('dragging-changed', (event: any) => {
        controls.value.enabled = !event.value // 拖拽时禁用轨道控制
        isDragging = event.value
        
        if (selectedObject.value) {
          if (isDragging) {
            // 开始拖拽时记录初始状态
            transformStartState = {
              position: selectedObject.value.position.clone(),
              rotation: selectedObject.value.rotation.clone(),
              scale: selectedObject.value.scale.clone()
            }
          } else {
            // 拖拽结束时创建历史记录
            if (transformStartState) {
              const currentMode = transformControls.value.getMode()
              const endState = {
                position: selectedObject.value.position.clone(),
                rotation: selectedObject.value.rotation.clone(),
                scale: selectedObject.value.scale.clone()
              }
              
              // 根据变换模式创建相应的命令
              let command = null
              if (currentMode === 'translate') {
                if (!transformStartState.position.equals(endState.position)) {
                  command = new MoveObjectCommand(
                    selectedObject.value,
                    transformStartState.position,
                    endState.position
                  )
                }
              } else if (currentMode === 'rotate') {
                if (!transformStartState.rotation.equals(endState.rotation)) {
                  command = new RotateObjectCommand(
                    selectedObject.value,
                    transformStartState.rotation,
                    endState.rotation
                  )
                }
              } else if (currentMode === 'scale') {
                if (!transformStartState.scale.equals(endState.scale)) {
                  command = new ScaleObjectCommand(
                    selectedObject.value,
                    transformStartState.scale,
                    endState.scale
                  )
                }
              }
              
              // 如果有变化，执行命令
              if (command) {
                historyManager.executeCommand(command)
              }
              
              transformStartState = null
            }
            
            // 发送自定义事件通知 Vue 组件
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('transform-drag-end'))
            }, 10)
          }
        }
      })
      
      // 监听变换事件
      transformControls.value.addEventListener('objectChange', () => {
        // 变换过程中的处理逻辑（如果需要的话）
        if(selectedObject.value) {
          window.dispatchEvent(new CustomEvent('transform-change', {
            detail: {
              objectId: selectedObject.value.userData.id,
              objectName: selectedObject.value.userData.name,
              position: {
                x: selectedObject.value.position.x,
                y: selectedObject.value.position.y,
                z: selectedObject.value.position.z
              },
              rotation: {
                x: selectedObject.value.rotation.x,
                y: selectedObject.value.rotation.y,
                z: selectedObject.value.rotation.z
              },
              scale: {
                x: selectedObject.value.scale.x,
                y: selectedObject.value.scale.y,
                z: selectedObject.value.scale.z
              }
            }
          }));
        }
      })
      
      // 暴露拖拽状态检查函数
      transformControls.value.isDragging = () => isDragging
      
      // 添加光照
      setupLighting()
      
      // 添加网格地面
      addGrid()
      
      // 处理窗口大小变化
      window.addEventListener('resize', onWindowResize)
      
      // 开始渲染循环
      animate()
      
      console.log('✅ Three.js 引擎初始化完成')
      
    } catch (error) {
      console.error('❌ Three.js 引擎初始化失败:', error)
      throw error
    }
  }

  // 设置光照
  const setupLighting = () => {
    if (!scene.value) return
    
    // 环境光 - 使用 markRaw 防止响应式代理
    const ambientLight = markRaw(new THREE.AmbientLight(0x404040, 0.4))
    scene.value.add(ambientLight)
    
    // 主光源 - 使用 markRaw 防止响应式代理
    const directionalLight = markRaw(new THREE.DirectionalLight(0xffffff, 0.8))
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    scene.value.add(directionalLight)
    
    // 补光 - 使用 markRaw 防止响应式代理
    const fillLight = markRaw(new THREE.DirectionalLight(0x64ffda, 0.3))
    fillLight.position.set(-5, 5, -5)
    scene.value.add(fillLight)
  }

  // 添加网格地面
  const addGrid = () => {
    if (!scene.value) return
    
    const gridHelper = markRaw(new THREE.GridHelper(40, 40, 0xffffff, 0x888888))
    // 设置网格材质的抗锯齿属性 - GridHelper 返回单个材质
    const material = gridHelper.material as THREE.LineBasicMaterial
    material.transparent = true
    material.opacity = 0.8
    material.fog = false // 禁用雾效，让线条更清晰
    
    scene.value.add(gridHelper)
    
    // 坐标轴
    // const axesHelper = markRaw(new THREE.AxesHelper(20))
    // scene.value.add(axesHelper)
  }

  // 添加几何体
  const addGeometry = (type: string): THREE.Mesh | null => {
    if (!scene.value) return null
    
    let geometry: THREE.BufferGeometry
    
    // 创建几何体 - 使用 markRaw 防止响应式代理
    switch (type) {
      case 'box':
        geometry = markRaw(new THREE.BoxGeometry(1, 1, 1))
        break
      case 'sphere':
        geometry = markRaw(new THREE.SphereGeometry(0.5, 32, 16))
        break
      case 'cylinder':
        geometry = markRaw(new THREE.CylinderGeometry(0.5, 0.5, 1, 32))
        break
      case 'torus':
        geometry = markRaw(new THREE.TorusGeometry(0.5, 0.2, 16, 100))
        break
      default:
        return null
    }
    
    // 创建材质 - 使用 markRaw 防止响应式代理
    const material = markRaw(new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6),
      metalness: 0.5,
      roughness: 0.4
    }))
    
    // 创建网格 - 使用 markRaw 防止响应式代理
    const mesh = markRaw(new THREE.Mesh(geometry, material))
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData = {
      type: type,
      id: Date.now(),
      name: `${type}_${objects.value.length + 1}`
    }
    
    // 移除坐标轴，只使用 TransformControls
    
    // 计算几何体的边界盒，获取高度的一半作为Y偏移
    geometry.computeBoundingBox()
    const boundingBox = geometry.boundingBox!
    const height = boundingBox.max.y - boundingBox.min.y
    const yOffset = height / 2 // 物体高度的一半，确保底部贴地
    
    // 随机位置，确保物体紧贴地面
    mesh.position.set(
      (Math.random() - 0.5) * 8,  // X: -4 到 4 (左右)
      yOffset,                    // Y: 动态计算，确保紧贴地面
      (Math.random() - 0.5) * 8   // Z: -4 到 4 (前后)
    )
    
    // 使用历史管理器执行创建命令
    const createCommand = new CreateObjectCommand(scene.value, objects.value, mesh)
    historyManager.executeCommand(createCommand)
    
    // 自动选中新创建的物体并附加 TransformControls
    if (selectedObject.value) {
      // 清除之前选中物体的高亮
      (selectedObject.value.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000)
    }
    
    selectedObject.value = mesh
    // 高亮新选中的物体
    ;(mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x444444)
    
    // 附加 TransformControls 到新创建的物体
    if (transformControls.value) {
      transformControls.value.attach(mesh)
    }
    
    // 更新统计
    stats.value.objectCount = objects.value.length
    
    console.log(`✅ 创建了 ${type}:`, mesh.userData.name)
    return mesh
  }

  // 选择对象
  const selectObject = (event: MouseEvent): THREE.Mesh | null => {
    if (!camera.value || !renderer.value) return null
    
    // 如果正在拖拽，不处理选择
    if (transformControls.value && (transformControls.value.dragging || transformControls.value.isDragging?.())) {
      return selectedObject.value
    }
    
    const rect = renderer.value.domElement.getBoundingClientRect()
    const mouse = markRaw(new THREE.Vector2())
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    
    const raycaster = markRaw(new THREE.Raycaster())
    raycaster.setFromCamera(mouse, camera.value)
    
    const intersects = raycaster.intersectObjects(objects.value)
    
    if (intersects.length > 0) {
      const object = intersects[0].object as THREE.Mesh
      // 确保选中的是网格对象，不是坐标轴
      if (object.type === 'Mesh' && object.userData.type) {
        // 如果点击的是已选中的对象，保持选中状态
        if (selectedObject.value === object) {
          return object
        }
        
        // 清除之前的选择高亮
        if (selectedObject.value) {
          (selectedObject.value.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000)
        }
        
        selectedObject.value = object
        
        // 高亮选中对象
        ;(object.material as THREE.MeshStandardMaterial).emissive.setHex(0x444444)
        
        // 将 TransformControls 附加到选中的对象
        if (transformControls.value) {
          transformControls.value.attach(object)
        }
        
        return object
      }
    }
    
    // 只有在点击真正的空白处时才取消选择
    // 清除之前的选择高亮
    if (selectedObject.value) {
      (selectedObject.value.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000)
    }
    
    // 取消选择时，分离 TransformControls
    if (transformControls.value) {
      transformControls.value.detach()
    }
    
    selectedObject.value = null
    return null
  }
  document.addEventListener('keydown', function(event) {
    // 处理对象的删除操作
      if(event.key === 'Delete' || event.key === 'Backspace') {
        // 是否选中了对象
        if(selectedObject.value) {
          deleteSelectedObject()
          event.preventDefault()
        }
      }

      if(event.key === 'Escape') {
        deselectObject()
      }
  })

  const deselectObject = () => {
    if (!selectedObject.value) return
    
    // 清除之前的选择高亮
    if (selectedObject.value) {
      (selectedObject.value.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000)
    }
    
    // 取消选择时，分离 TransformControls
    if (transformControls.value) {
      transformControls.value.detach()
    }
    
    selectedObject.value = null
  }

  const deleteSelectedObject = () => {
    if (!selectedObject.value || !scene.value) return
    
    const objectToDelete = selectedObject.value
    const objectIndex = objects.value.indexOf(objectToDelete)
    
    if (objectIndex === -1) return
    
    // 使用历史管理器执行删除命令
    const deleteCommand = new DeleteObjectCommand(
      scene.value, 
      objects.value, 
      objectToDelete, 
      objectIndex
    )
    historyManager.executeCommand(deleteCommand)
    
    // 分离 TransformControls
    if (transformControls.value) {
      transformControls.value.detach()
    }
    
    // 清除选择
    selectedObject.value = null
    
    // 更新统计
    stats.value.objectCount = objects.value.length
  }

  // 更新对象变换
  const updateObjectTransform = (object: THREE.Mesh, transform: any) => {
    if (transform.position) {
      object.position.copy(transform.position)
    }
    if (transform.rotation) {
      object.rotation.copy(transform.rotation)
    }
    if (transform.scale) {
      if (typeof transform.scale === 'number') {
        object.scale.setScalar(transform.scale)
      } else {
        object.scale.copy(transform.scale)
      }
    }
  }

  // 使用 WASM 优化网格
  const optimizeMesh = async (object: THREE.Mesh) => {
    if (!wasmStore.module || !wasmStore.isLoaded) {
      throw new Error('WebAssembly 未就绪')
    }
    
    const geometry = object.geometry
    const vertices = geometry.attributes.position.array as Float32Array
    const indices = geometry.index?.array as Uint32Array
    
    if (!indices) {
      throw new Error('所选对象不支持优化')
    }
    
    try {
      // 使用 WASM 优化网格
      const result = wasmStore.module.MeshOptimizer.optimizeMesh(vertices, indices)
      
      // 更新几何体
      geometry.setAttribute('position', new THREE.BufferAttribute(result.vertices, 3))
      geometry.setIndex(Array.from(result.indices))
      geometry.computeVertexNormals()
      
      console.log(`✅ 网格优化完成！
        原始顶点: ${result.originalVertexCount}
        优化后顶点: ${result.optimizedVertexCount}
        减少比例: ${(result.reductionRatio * 100).toFixed(1)}%
        处理时间: ${result.processingTime.toFixed(2)}ms`)
      
      return result
      
    } catch (error) {
      console.error('❌ 网格优化失败:', error)
      throw error
    }
  }



  // 重置场景
  const resetScene = () => {
    if (!scene.value) return
    
    // 移除所有对象
    objects.value.forEach(obj => {
      scene.value!.remove(obj)
      obj.geometry.dispose()
      const material = obj.material as THREE.Material
      material.dispose()
    })
    
    objects.value = []
    selectedObject.value = null
    
    // 更新统计
    stats.value.objectCount = 0


    if (transformControls.value) {
      transformControls.value.detach()
    }
    
    console.log('🔄 场景已重置')
  }

  // 导出场景
  const exportScene = () => {
    const sceneData = {
      objects: objects.value.map(obj => ({
        type: obj.userData.type,
        name: obj.userData.name,
        position: obj.position.toArray(),
        rotation: obj.rotation.toArray(),
        scale: obj.scale.toArray(),
        color: (obj.material as THREE.MeshStandardMaterial).color.getHex()
      })),
      camera: camera.value ? {
        position: camera.value.position.toArray(),
        rotation: camera.value.rotation.toArray()
      } : null,
      timestamp: new Date().toISOString()
    }
    
    const dataStr = JSON.stringify(sceneData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    
    const link = document.createElement('a')
    link.href = URL.createObjectURL(dataBlob)
    link.download = `scene_${Date.now()}.json`
    link.click()
    
    console.log('💾 场景已导出')
  }

  // 设置变换模式
  const setTransformMode = (mode: string) => {
    if (transformControls.value) {
      transformControls.value.setMode(mode)
    }
  }

  // 获取统计信息
  const getStats = () => {
    return stats.value
  }

  // 窗口大小变化处理
  const onWindowResize = () => {
    if (!camera.value || !renderer.value) return
    
    const container = renderer.value.domElement.parentElement!
    const width = container.clientWidth
    const height = container.clientHeight
    
    camera.value.aspect = width / height
    camera.value.updateProjectionMatrix()
    
    renderer.value.setSize(width, height)
  }

  // 渲染循环
  const animate = () => {
    requestAnimationFrame(animate)
    
    if (!renderer.value || !scene.value || !camera.value || !controls.value) return
    
    // 更新控制器
    controls.value.update()
    
    // 渲染场景
    const startTime = performance.now()
    renderer.value.render(scene.value, camera.value)
    const renderTime = performance.now() - startTime
    
    // 更新统计
    stats.value.renderTime = renderTime
    stats.value.fps = 1000 / (renderTime + 1)
  }

  return {
    // 状态
    scene,
    camera,
    renderer,
    objects,
    selectedObject,
    stats,
    
    // 方法
    initEngine,
    addGeometry,
    selectObject,
    updateObjectTransform,
    optimizeMesh,
    resetScene,
    exportScene,
    getStats,
    setTransformMode,
    
    // 历史管理
    undo: historyManager.undo,
    redo: historyManager.redo,
    canUndo: historyManager.canUndo,
    canRedo: historyManager.canRedo,
    clearHistory: historyManager.clearHistory,
    getHistoryInfo: historyManager.getHistoryInfo
  }
}
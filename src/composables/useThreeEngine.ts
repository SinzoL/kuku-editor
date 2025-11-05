import { ref, markRaw } from 'vue'
import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { useWasmStore } from '@/stores/wasm'
import { 
  useHistoryManager, 
  CreateObjectCommand, 
  DeleteObjectCommand, 
  MoveObjectCommand,
  RotateObjectCommand,
  ScaleObjectCommand
} from './useHistoryManager'

// 单例实例存储
let engineInstance: any = null

export function useThreeEngine() {
  // 如果已经存在实例，直接返回
  if (engineInstance) {
    return engineInstance
  }

  // 添加实例标识符用于调试
  const instanceId = Math.random().toString(36).substr(2, 9)
  
  // Three.js 核心对象
  const scene = ref<THREE.Scene>()
  const camera = ref<THREE.PerspectiveCamera>()
  const renderer = ref<THREE.WebGLRenderer>()
  const controls = ref<any>()
  
  // 场景对象
  const objects = ref<THREE.Object3D[]>([])
  const selectedObject = ref<THREE.Object3D | null>(null)
  const transformControls = ref<any>(null)
  
  // 统计信息和性能监控
  const stats = ref({
    fps: 60,
    objectCount: 0,
    renderTime: 0,
    triangleCount: 0,
    drawCalls: 0,
    memoryUsage: 0
  })

  // 性能优化配置
  const performanceConfig = ref({
    targetFPS: 60,
    enableFrustumCulling: true,
    enableLOD: true,
    maxDrawCalls: 1000,
    enableInstancing: true
  })

  // FPS 计算优化
  let frameCount = 0
  let lastTime = performance.now()
  let fpsUpdateInterval = 500 // 每500ms更新一次FPS

  // WASM Store
  const wasmStore = useWasmStore()

  // 历史管理器
  const historyManager = useHistoryManager()

  // 高亮辅助函数
  const highlightObject = (object: THREE.Object3D) => {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const material = child.material as THREE.MeshStandardMaterial
        if (material.emissive) {
          material.emissive.setHex(0x444444)
        }
      }
    })
  }

  const clearObjectHighlight = (object: THREE.Object3D) => {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const material = child.material as THREE.MeshStandardMaterial
        if (material.emissive) {
          material.emissive.setHex(0x000000)
        }
      }
    })
  }

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
      
      // 监听性能配置更新
      window.addEventListener('update-performance-config', (event: any) => {
        const config = event.detail
        Object.assign(performanceConfig.value, config)
      })

      // 监听资源清理事件
      window.addEventListener('cleanup-resources', () => {
        cleanupUnusedResources()
      })

      // 监听纹理压缩事件
      window.addEventListener('compress-textures', () => {
        compressAllTextures()
      })
      
      // 开始渲染循环
      animate()
      
    } catch (error) {
      console.error('❌ Three.js 引擎初始化失败:', error)
      throw error
    }
  }

  // 清理未使用资源
  const cleanupUnusedResources = () => {
    if (!scene.value) return
    
    let cleanedCount = 0
    
    // 清理未使用的几何体
    scene.value.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        // 检查几何体是否被多个对象使用
        const geometry = child.geometry
        if (geometry.userData.refCount === undefined) {
          geometry.userData.refCount = 1
        }
        
        // 如果引用计数为0，清理几何体
        if (geometry.userData.refCount <= 0) {
          geometry.dispose()
          cleanedCount++
        }
      }
    })
    
    // 强制垃圾回收
    if (renderer.value) {
      renderer.value.renderLists.dispose()
    }
    
    console.log(`✅ 清理完成，释放了 ${cleanedCount} 个未使用资源`)
  }

  // 压缩所有纹理
  const compressAllTextures = () => {
    if (!scene.value) return
    
    let compressedCount = 0
    
    scene.value.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        
        materials.forEach(material => {
          if (material instanceof THREE.MeshStandardMaterial) {
            if (material.map && !material.map.userData.compressed) {
              // 标记为已压缩，避免重复处理
              material.map.userData.compressed = true
              compressedCount++
            }
          }
        })
      }
    })
    
    console.log(`✅ 纹理压缩完成，处理了 ${compressedCount} 个纹理`)
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
    if (!scene.value) {
      console.error('❌ useThreeEngine: scene 未初始化，无法创建几何体')
      return null
    }
    
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
      clearObjectHighlight(selectedObject.value)
    }
    
    selectedObject.value = mesh
    // 高亮新选中的物体
    highlightObject(mesh)
    
    // 附加 TransformControls 到新创建的物体
    if (transformControls.value) {
      transformControls.value.attach(mesh)
    }
    
    // 更新统计
    stats.value.objectCount = objects.value.length
    
    return mesh
  }

  // 选择对象
  const selectObject = (event: MouseEvent): THREE.Object3D | null => {
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
    
    // 递归搜索，包括导入模型的子对象
    const intersects = raycaster.intersectObjects(objects.value, true)
    
    if (intersects.length > 0) {
      const hitObject = intersects[0].object
      
      // 找到顶级对象（在objects数组中的对象）
      let targetObject = hitObject
      while (targetObject.parent && !objects.value.includes(targetObject as any)) {
        targetObject = targetObject.parent
      }
      
      // 确保找到的是我们管理的对象
      if (objects.value.includes(targetObject as any)) {
        // 如果点击的是已选中的对象，保持选中状态
        if (selectedObject.value === targetObject) {
          return targetObject as any
        }
        
        // 清除之前的选择高亮
        if (selectedObject.value) {
          clearObjectHighlight(selectedObject.value)
        }
        
        selectedObject.value = targetObject as any
        
        // 高亮选中对象
        highlightObject(targetObject as any)
        
        // 将 TransformControls 附加到选中的对象
        if (transformControls.value) {
          transformControls.value.attach(targetObject)
        }
        
        return targetObject as any
      }
    }
    
    // 只有在点击真正的空白处时才取消选择
    // 清除之前的选择高亮
    if (selectedObject.value) {
      clearObjectHighlight(selectedObject.value)
    }
    
    // 取消选择时，分离 TransformControls
    if (transformControls.value) {
      transformControls.value.detach()
    }
    
    selectedObject.value = null
    return null
  }


  const deselectObject = () => {
    if (!selectedObject.value) return
    
    // 清除之前的选择高亮
    clearObjectHighlight(selectedObject.value)
    
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
    
    if (objectIndex === -1) {
      return
    }
    
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
    
    // 强制触发一次渲染，确保删除效果立即显示
    if (renderer.value && scene.value && camera.value) {
      renderer.value.render(scene.value, camera.value)
    }
  }

  // 更新对象变换
  const updateObjectTransform = (object: THREE.Object3D, transform: any) => {
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
  const optimizeMesh = async (object: THREE.Object3D) => {
    if (!wasmStore.module || !wasmStore.isLoaded) {
      throw new Error('WebAssembly 未就绪')
    }
    
    // 检查对象是否为Mesh类型
    if (!(object instanceof THREE.Mesh)) {
      throw new Error('所选对象不是网格对象')
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
      

      
      return result
      
    } catch (error) {
      throw error
    }
  }



  // 重置场景
  const resetScene = () => {
    if (!scene.value) return
    
    // 移除所有对象
    objects.value.forEach(obj => {
      scene.value!.remove(obj)
      
      // 递归清理对象资源
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose()
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose())
            } else {
              child.material.dispose()
            }
          }
        }
      })
    })
    
    objects.value = []
    selectedObject.value = null
    
    // 更新统计
    stats.value.objectCount = 0


    if (transformControls.value) {
      transformControls.value.detach()
    }
    

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
        color: obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial 
          ? obj.material.color.getHex() 
          : 0xffffff
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

  // 优化的渲染循环
  const animate = () => {
    requestAnimationFrame(animate)
    
    if (!renderer.value || !scene.value || !camera.value || !controls.value) return
    
    const currentTime = performance.now()
    
    // 更新控制器
    controls.value.update()
    
    // 性能优化：视锥体剔除
    if (performanceConfig.value.enableFrustumCulling) {
      updateFrustumCulling()
    }
    
    // 性能优化：LOD管理
    if (performanceConfig.value.enableLOD) {
      updateLOD()
    }
    
    // 渲染场景
    const renderStartTime = performance.now()
    renderer.value.render(scene.value, camera.value)
    const renderTime = performance.now() - renderStartTime
    
    // 优化的FPS计算 - 不每帧都计算
    frameCount++
    if (currentTime - lastTime >= fpsUpdateInterval) {
      const deltaTime = currentTime - lastTime
      stats.value.fps = Math.round((frameCount * 1000) / deltaTime)
      stats.value.renderTime = renderTime
      stats.value.objectCount = objects.value.length
      stats.value.triangleCount = calculateTriangleCount()
      stats.value.drawCalls = renderer.value.info.render.calls
      stats.value.memoryUsage = calculateMemoryUsage()
      
      frameCount = 0
      lastTime = currentTime
    }
  }

  // 视锥体剔除优化
  const updateFrustumCulling = () => {
    if (!camera.value) return
    
    const frustum = new THREE.Frustum()
    const matrix = new THREE.Matrix4().multiplyMatrices(
      camera.value.projectionMatrix,
      camera.value.matrixWorldInverse
    )
    frustum.setFromProjectionMatrix(matrix)
    
    objects.value.forEach(obj => {
      if (obj.userData.boundingBox) {
        obj.visible = frustum.intersectsBox(obj.userData.boundingBox)
      }
    })
  }

  // LOD (Level of Detail) 管理
  const updateLOD = () => {
    if (!camera.value) return
    
    const cameraPosition = camera.value.position
    
    objects.value.forEach(obj => {
      if (obj.userData.lodLevels) {
        const distance = cameraPosition.distanceTo(obj.position)
        const lodLevel = getLODLevel(distance)
        switchLOD(obj, lodLevel)
      }
    })
  }

  // 计算三角形数量
  const calculateTriangleCount = (): number => {
    let triangles = 0
    objects.value.forEach(obj => {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          const geometry = child.geometry
          if (geometry.index) {
            triangles += geometry.index.count / 3
          } else {
            triangles += geometry.attributes.position.count / 3
          }
        }
      })
    })
    return Math.round(triangles)
  }

  // 计算内存使用量 (估算)
  const calculateMemoryUsage = (): number => {
    let memory = 0
    objects.value.forEach(obj => {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) {
            memory += estimateGeometryMemory(child.geometry)
          }
          if (child.material) {
            memory += estimateMaterialMemory(child.material)
          }
        }
      })
    })
    return Math.round(memory / 1024 / 1024) // 转换为MB
  }

  // 估算几何体内存使用
  const estimateGeometryMemory = (geometry: THREE.BufferGeometry): number => {
    let size = 0
    Object.values(geometry.attributes).forEach(attribute => {
      size += attribute.array.byteLength
    })
    if (geometry.index) {
      size += geometry.index.array.byteLength
    }
    return size
  }

  // 估算材质内存使用
  const estimateMaterialMemory = (material: THREE.Material | THREE.Material[]): number => {
    let size = 0
    const materials = Array.isArray(material) ? material : [material]
    
    materials.forEach(mat => {
      if (mat instanceof THREE.MeshStandardMaterial) {
        if (mat.map) size += estimateTextureMemory(mat.map)
        if (mat.normalMap) size += estimateTextureMemory(mat.normalMap)
        if (mat.roughnessMap) size += estimateTextureMemory(mat.roughnessMap)
        if (mat.metalnessMap) size += estimateTextureMemory(mat.metalnessMap)
      }
    })
    return size
  }

  // 估算纹理内存使用
  const estimateTextureMemory = (texture: THREE.Texture): number => {
    const image = texture.image
    if (image && image.width && image.height) {
      return image.width * image.height * 4 // RGBA
    }
    return 0
  }

  // 获取LOD级别
  const getLODLevel = (distance: number): number => {
    if (distance < 10) return 0      // 高精度
    if (distance < 50) return 1      // 中精度
    if (distance < 100) return 2     // 低精度
    return 3                         // 最低精度
  }

  // 切换LOD
  const switchLOD = (object: THREE.Object3D, level: number) => {
    if (object.userData.currentLOD === level) return
    
    object.userData.currentLOD = level
    // 这里可以实现具体的LOD切换逻辑
    // 例如显示/隐藏不同精度的模型
  }

  // 优化的资源导入功能
  const importModel = async (file: File, name: string) => {
    try {
      // 动态导入GLTFLoader
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      const loader = new GLTFLoader()
      
      // 创建文件URL
      const url = URL.createObjectURL(file)
      
      return new Promise((resolve, reject) => {
        loader.load(
          url,
          async (gltf) => {
            // 清理URL
            URL.revokeObjectURL(url)
            
            // 处理加载的模型
            const model = gltf.scene
            model.userData.name = name
            model.userData.type = 'imported-model'
            
            // 性能优化：预处理模型
            await optimizeImportedModel(model)
            
            // 计算模型的包围盒，确保正确定位
            const box = new THREE.Box3().setFromObject(model)
            model.userData.boundingBox = box // 存储包围盒用于视锥体剔除
            
            // 将模型移动到地面上
            model.position.set(0, -box.min.y, 0)
            
            // 添加到场景
            if (scene.value) {
              scene.value.add(model)
              objects.value.push(model as any)
              
              // 创建历史记录
              const command = new CreateObjectCommand(scene.value, objects.value, model as any)
              historyManager.executeCommand(command)
              
              // 自动选中新导入的模型
              if (selectedObject.value) {
                clearObjectHighlight(selectedObject.value)
              }
              
              selectedObject.value = model as any
              highlightObject(model as any)
              
              // 附加 TransformControls 到新导入的模型
              if (transformControls.value) {
                transformControls.value.attach(model)
              }
              
              console.log(`✅ 模型导入成功: ${name}`)
              console.log(`📊 三角形数量: ${calculateModelTriangles(model)}`)
              console.log(`💾 估算内存: ${Math.round(calculateModelMemory(model) / 1024 / 1024)}MB`)
              
              resolve(model)
            }
          },
          (progress) => {
            // 可以在这里显示加载进度
            const percent = Math.round((progress.loaded / progress.total) * 100)
            console.log(`📥 加载进度: ${percent}%`)
          },
          (error) => {
            URL.revokeObjectURL(url)
            console.error('❌ 模型导入失败:', error)
            reject(error)
          }
        )
      })
    } catch (error) {
      throw error
    }
  }

  // 优化导入的模型
  const optimizeImportedModel = async (model: THREE.Object3D) => {
    const meshes: THREE.Mesh[] = []
    
    // 收集所有网格
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child)
      }
    })
    
    // 优化每个网格
    for (const mesh of meshes) {
      // 1. 合并顶点
      if (mesh.geometry) {
        mesh.geometry = mesh.geometry.clone()
        BufferGeometryUtils.mergeVertices(mesh.geometry)
        mesh.geometry.computeVertexNormals()
        mesh.geometry.computeBoundingBox()
        mesh.geometry.computeBoundingSphere()
      }
      
      // 2. 优化材质
      if (mesh.material) {
        optimizeMaterial(mesh.material)
      }
      
      // 3. 启用阴影（如果需要）
      mesh.castShadow = true
      mesh.receiveShadow = true
    }
    
    // 4. 生成LOD级别（简化版）
    if (meshes.length > 0) {
      generateSimpleLOD(model)
    }
  }

  // 优化材质
  const optimizeMaterial = (material: THREE.Material | THREE.Material[]) => {
    const materials = Array.isArray(material) ? material : [material]
    
    materials.forEach(mat => {
      if (mat instanceof THREE.MeshStandardMaterial) {
        // 优化纹理设置
        if (mat.map) {
          optimizeTexture(mat.map)
        }
        if (mat.normalMap) {
          optimizeTexture(mat.normalMap)
        }
        if (mat.roughnessMap) {
          optimizeTexture(mat.roughnessMap)
        }
        if (mat.metalnessMap) {
          optimizeTexture(mat.metalnessMap)
        }
        
        // 设置合理的材质参数
        mat.transparent = mat.opacity < 1.0
        mat.alphaTest = mat.transparent ? 0.1 : 0
      }
    })
  }

  // 优化纹理
  const optimizeTexture = (texture: THREE.Texture) => {
    // 设置合理的纹理参数
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    
    // 如果纹理过大，可以考虑缩放
    if (texture.image && texture.image.width > 2048) {
      console.warn(`⚠️ 纹理尺寸较大: ${texture.image.width}x${texture.image.height}，建议优化`)
    }
  }

  // 生成简单的LOD
  const generateSimpleLOD = (model: THREE.Object3D) => {
    const lodLevels = [1.0, 0.7, 0.4, 0.2] // 不同LOD级别的细节保留比例
    model.userData.lodLevels = lodLevels
    model.userData.currentLOD = 0
    
    // 这里可以实现更复杂的LOD生成逻辑
    // 例如使用网格简化算法生成不同精度的版本
  }

  // 计算模型三角形数量
  const calculateModelTriangles = (model: THREE.Object3D): number => {
    let triangles = 0
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const geometry = child.geometry
        if (geometry.index) {
          triangles += geometry.index.count / 3
        } else {
          triangles += geometry.attributes.position.count / 3
        }
      }
    })
    return Math.round(triangles)
  }

  // 计算模型内存使用
  const calculateModelMemory = (model: THREE.Object3D): number => {
    let memory = 0
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          memory += estimateGeometryMemory(child.geometry)
        }
        if (child.material) {
          memory += estimateMaterialMemory(child.material)
        }
      }
    })
    return memory
  }

  const importTexture = async (file: File, name: string) => {
    try {
      const loader = new THREE.TextureLoader()
      const url = URL.createObjectURL(file)
      
      return new Promise((resolve, reject) => {
        loader.load(
          url,
          (texture) => {
            // 清理URL
            URL.revokeObjectURL(url)
            
            // 设置纹理属性
            texture.name = name
            texture.userData = { name, type: 'imported-texture' }
            
            resolve(texture)
          },
          undefined,
          (error) => {
            URL.revokeObjectURL(url)
            reject(error)
          }
        )
      })
    } catch (error) {
      throw error
    }
  }

  const addResourceToScene = (resource: any) => {
    if (!scene.value) return
    
    try {
      if (resource.type === 'model' && resource.file) {
        // 重新加载并添加模型到场景
        importModel(resource.file, resource.name)
      } else if (resource.type === 'texture' && selectedObject.value) {
        // 将纹理应用到选中的对象
        importTexture(resource.file, resource.name).then((texture: any) => {
          if (selectedObject.value && selectedObject.value instanceof THREE.Mesh) {
            const material = selectedObject.value.material as THREE.MeshStandardMaterial
            if (material.map) {
              material.map.dispose() // 清理旧纹理
            }
            material.map = texture
            material.needsUpdate = true
          }
        })
      }
    } catch (error) {

    }
  }

  const engineAPI = {
    // 添加实例ID用于调试
    instanceId,
    
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
    deleteSelectedObject,
    deselectObject,
    
    // 资源导入
    importModel,
    importTexture,
    addResourceToScene,
    
    // 历史管理
    undo: historyManager.undo,
    redo: historyManager.redo,
    canUndo: historyManager.canUndo,
    canRedo: historyManager.canRedo,
    clearHistory: historyManager.clearHistory,
    getHistoryInfo: historyManager.getHistoryInfo,
    historyManager
  }

  // 将实例保存到单例变量
  engineInstance = engineAPI
  
  return engineAPI
}
# Kuku 3D Editor

一个基于 Vue 3 + Vite + WebAssembly + Three.js 的现代化 3D 编辑器

## 🚀 技术栈

- **Vue 3.5** - 现代响应式框架
- **Vite 6.0** - 快速构建工具
- **TypeScript** - 类型安全
- **Three.js** - 3D 渲染引擎
- **WebAssembly** - 高性能计算
- **Pinia** - 状态管理

## 🎯 核心特性

### ✅ 已实现功能
- 🎲 **几何体创建**: 立方体、球体、圆柱体、圆环
- 🎮 **交互操作**: 鼠标选择、属性编辑、实时预览
- ⚡ **WebAssembly 优化**: 网格优化、数学计算
- 📊 **性能监控**: FPS 统计、处理时间对比
- 💾 **场景管理**: 重置场景、导出 JSON

### 🔧 架构特点
- **组合式 API**: 使用 Vue 3 Composition API
- **TypeScript 全覆盖**: 类型安全的开发体验
- **模块化设计**: Pinia Store + Composables
- **响应式状态**: 实时 UI 更新

## 🛠️ 开发指南

### 启动开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

## 📁 项目结构

```
kuku-edit/
├── src/
│   ├── views/Editor.vue          # 主编辑器界面
│   ├── stores/wasm.ts            # WebAssembly 状态管理
│   ├── composables/useThreeEngine.ts  # Three.js 引擎逻辑
│   ├── router/index.ts           # 路由配置
│   ├── App.vue                   # 根组件
│   ├── main.ts                   # 应用入口
│   └── style.css                 # 全局样式
├── package.json                  # 项目配置
├── vite.config.ts               # Vite 配置
└── tsconfig.json                # TypeScript 配置
```

## 🎮 使用说明

### 基础操作
1. **创建对象**: 点击左侧几何体按钮
2. **选择对象**: 点击 3D 视口中的对象
3. **编辑属性**: 在左侧属性面板调整位置和缩放
4. **视角控制**: 鼠标拖拽旋转视角，滚轮缩放


## 📚 学习价值

这个项目展示了如何使用 Vue 3 + WebAssembly + Three.js 构建现代化的 3D 应用。
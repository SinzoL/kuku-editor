#!/bin/bash

# WebAssembly 构建脚本
# 需要先安装 Emscripten SDK

echo "🔨 开始构建 WebAssembly 模块..."



# 编译 C++ 到 WebAssembly
emcc mesh_optimizer.cpp \
    -o ../public/wasm/mesh_optimizer.js \
    -s WASM=1 \
    -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME="MeshOptimizerModule" \
    -s ENVIRONMENT='web' \
    -s EXPORT_ES6=1 \
    -s SINGLE_FILE=0 \
    --bind \
    -O3 \
    -std=c++17

if [ $? -eq 0 ]; then
    echo "✅ WebAssembly 模块构建成功！"
    echo "📁 输出文件:"
    echo "   - ../public/wasm/mesh_optimizer.js"
    echo "   - ../public/wasm/mesh_optimizer.wasm"
    
    # 显示文件大小
    echo ""
    echo "📊 文件大小:"
    ls -lh ../public/wasm/mesh_optimizer.*
else
    echo "❌ 构建失败！"
    exit 1
fi
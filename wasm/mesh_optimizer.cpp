#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <vector>
#include <unordered_map>
#include <string>
#include <cmath>
#include <chrono>
#include <algorithm>

using namespace emscripten;

struct Vertex {
    float x, y, z;
    
    Vertex(float x = 0, float y = 0, float z = 0) : x(x), y(y), z(z) {}
    
    bool operator==(const Vertex& other) const {
        const float epsilon = 0.001f;
        return std::abs(x - other.x) < epsilon && 
               std::abs(y - other.y) < epsilon && 
               std::abs(z - other.z) < epsilon;
    }
};

struct VertexHash {
    std::size_t operator()(const Vertex& v) const {
        // 简单的哈希函数，将坐标量化后组合
        int ix = static_cast<int>(v.x * 1000);
        int iy = static_cast<int>(v.y * 1000);
        int iz = static_cast<int>(v.z * 1000);
        return std::hash<int>()(ix) ^ (std::hash<int>()(iy) << 1) ^ (std::hash<int>()(iz) << 2);
    }
};

struct OptimizationResult {
    val vertices;
    val indices;
    double processingTime;
    int originalVertexCount;
    int optimizedVertexCount;
    double reductionRatio;
    
    OptimizationResult(val v, val i, double time, int orig, int opt, double ratio)
        : vertices(v), indices(i), processingTime(time), 
          originalVertexCount(orig), optimizedVertexCount(opt), reductionRatio(ratio) {}
};

class MeshOptimizer {
public:
    // 网格优化主函数
    static OptimizationResult optimizeMesh(val verticesArray, val indicesArray) {
        auto start = std::chrono::high_resolution_clock::now();
        
        // 转换 JavaScript 数组到 C++ 向量
        std::vector<float> vertices = convertJSArrayToVector<float>(verticesArray);
        std::vector<uint32_t> indices = convertJSArrayToVector<uint32_t>(indicesArray);
        
        int originalVertexCount = vertices.size() / 3;
        
        // 执行顶点去重
        auto [newVertices, newIndices] = deduplicateVertices(vertices, indices);
        
        int optimizedVertexCount = newVertices.size() / 3;
        double reductionRatio = 1.0 - (static_cast<double>(optimizedVertexCount) / originalVertexCount);
        
        // 转换回 JavaScript 数组
        val jsVertices = convertVectorToJSArray(newVertices);
        val jsIndices = convertVectorToJSArray(newIndices);
        
        auto end = std::chrono::high_resolution_clock::now();
        double processingTime = std::chrono::duration<double, std::milli>(end - start).count();
        
        return OptimizationResult(jsVertices, jsIndices, processingTime, 
                                originalVertexCount, optimizedVertexCount, reductionRatio);
    }
    
    // 计算法向量
    static val calculateNormals(val verticesArray, val indicesArray) {
        auto start = std::chrono::high_resolution_clock::now();
        
        std::vector<float> vertices = convertJSArrayToVector<float>(verticesArray);
        std::vector<uint32_t> indices = convertJSArrayToVector<uint32_t>(indicesArray);
        
        std::vector<float> normals(vertices.size(), 0.0f);
        
        // 计算面法向量并累加到顶点
        for (size_t i = 0; i < indices.size(); i += 3) {
            uint32_t a = indices[i] * 3;
            uint32_t b = indices[i + 1] * 3;
            uint32_t c = indices[i + 2] * 3;
            
            // 计算两个边向量
            float edge1[3] = {
                vertices[b] - vertices[a],
                vertices[b + 1] - vertices[a + 1],
                vertices[b + 2] - vertices[a + 2]
            };
            
            float edge2[3] = {
                vertices[c] - vertices[a],
                vertices[c + 1] - vertices[a + 1],
                vertices[c + 2] - vertices[a + 2]
            };
            
            // 叉积计算法向量
            float normal[3] = {
                edge1[1] * edge2[2] - edge1[2] * edge2[1],
                edge1[2] * edge2[0] - edge1[0] * edge2[2],
                edge1[0] * edge2[1] - edge1[1] * edge2[0]
            };
            
            // 累加到三个顶点
            for (int j = 0; j < 3; j++) {
                uint32_t vertexIndex = indices[i + j] * 3;
                normals[vertexIndex] += normal[0];
                normals[vertexIndex + 1] += normal[1];
                normals[vertexIndex + 2] += normal[2];
            }
        }
        
        // 归一化法向量
        for (size_t i = 0; i < normals.size(); i += 3) {
            float length = std::sqrt(normals[i] * normals[i] + 
                                   normals[i + 1] * normals[i + 1] + 
                                   normals[i + 2] * normals[i + 2]);
            
            if (length > 0) {
                normals[i] /= length;
                normals[i + 1] /= length;
                normals[i + 2] /= length;
            }
        }
        
        auto end = std::chrono::high_resolution_clock::now();
        double processingTime = std::chrono::duration<double, std::milli>(end - start).count();
        
        val result = val::object();
        result.set("normals", convertVectorToJSArray(normals));
        result.set("processingTime", processingTime);
        
        return result;
    }
    
    // 矩阵乘法
    static val multiplyMatrices(val matAArray, val matBArray) {
        auto start = std::chrono::high_resolution_clock::now();
        
        std::vector<float> matA = convertJSArrayToVector<float>(matAArray);
        std::vector<float> matB = convertJSArrayToVector<float>(matBArray);
        std::vector<float> result(16, 0.0f);
        
        // 4x4 矩阵乘法
        for (int i = 0; i < 4; i++) {
            for (int j = 0; j < 4; j++) {
                for (int k = 0; k < 4; k++) {
                    result[i * 4 + j] += matA[i * 4 + k] * matB[k * 4 + j];
                }
            }
        }
        
        auto end = std::chrono::high_resolution_clock::now();
        double processingTime = std::chrono::duration<double, std::milli>(end - start).count();
        
        val resultObj = val::object();
        resultObj.set("result", convertVectorToJSArray(result));
        resultObj.set("processingTime", processingTime);
        
        return resultObj;
    }

private:
    // 顶点去重算法
    static std::pair<std::vector<float>, std::vector<uint32_t>> 
    deduplicateVertices(const std::vector<float>& vertices, const std::vector<uint32_t>& indices) {
        std::unordered_map<Vertex, uint32_t, VertexHash> vertexMap;
        std::vector<float> newVertices;
        std::vector<uint32_t> newIndices;
        
        // 处理所有顶点
        for (size_t i = 0; i < vertices.size(); i += 3) {
            Vertex v(vertices[i], vertices[i + 1], vertices[i + 2]);
            
            auto it = vertexMap.find(v);
            if (it == vertexMap.end()) {
                // 新顶点
                uint32_t newIndex = newVertices.size() / 3;
                vertexMap[v] = newIndex;
                newVertices.push_back(v.x);
                newVertices.push_back(v.y);
                newVertices.push_back(v.z);
            }
        }
        
        // 重建索引
        for (size_t i = 0; i < indices.size(); i++) {
            uint32_t oldIndex = indices[i];
            Vertex v(vertices[oldIndex * 3], vertices[oldIndex * 3 + 1], vertices[oldIndex * 3 + 2]);
            
            auto it = vertexMap.find(v);
            if (it != vertexMap.end()) {
                newIndices.push_back(it->second);
            }
        }
        
        return {newVertices, newIndices};
    }
    
    // JavaScript 数组转 C++ 向量
    template<typename T>
    static std::vector<T> convertJSArrayToVector(val jsArray) {
        std::vector<T> result;
        uint32_t length = jsArray["length"].as<uint32_t>();
        result.reserve(length);
        
        for (uint32_t i = 0; i < length; i++) {
            result.push_back(jsArray[i].as<T>());
        }
        
        return result;
    }
    
    // C++ 向量转 JavaScript 数组
    template<typename T>
    static val convertVectorToJSArray(const std::vector<T>& vec) {
        val jsArray = val::global("Float32Array").new_(vec.size());
        
        for (size_t i = 0; i < vec.size(); i++) {
            jsArray.set(i, vec[i]);
        }
        
        return jsArray;
    }
};

// Emscripten 绑定
EMSCRIPTEN_BINDINGS(mesh_optimizer) {
    class_<OptimizationResult>("OptimizationResult")
        .property("vertices", &OptimizationResult::vertices)
        .property("indices", &OptimizationResult::indices)
        .property("processingTime", &OptimizationResult::processingTime)
        .property("originalVertexCount", &OptimizationResult::originalVertexCount)
        .property("optimizedVertexCount", &OptimizationResult::optimizedVertexCount)
        .property("reductionRatio", &OptimizationResult::reductionRatio);
    
    class_<MeshOptimizer>("MeshOptimizer")
        .class_function("optimizeMesh", &MeshOptimizer::optimizeMesh)
        .class_function("calculateNormals", &MeshOptimizer::calculateNormals)
        .class_function("multiplyMatrices", &MeshOptimizer::multiplyMatrices);
}
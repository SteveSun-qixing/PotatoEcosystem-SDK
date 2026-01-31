/**
 * 依赖解析器
 *
 * 负责解析插件依赖关系、检测循环依赖、确定加载顺序
 */

import { Logger } from '../core/logger';
import type { PluginManifest } from '../types';

/**
 * 依赖节点
 */
export interface DependencyNode {
  id: string;
  version: string;
  dependencies: string[];
}

/**
 * 依赖图
 */
export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: Map<string, Set<string>>; // from -> to
}

/**
 * 依赖解析结果
 */
export interface DependencyResolution {
  /** 加载顺序（拓扑排序结果） */
  loadOrder: string[];
  /** 是否存在循环依赖 */
  hasCycles: boolean;
  /** 循环依赖路径 */
  cycles: string[][];
  /** 缺失的依赖 */
  missingDependencies: string[];
}

/**
 * 版本比较结果
 */
export enum VersionComparisonResult {
  Less = -1,
  Equal = 0,
  Greater = 1,
  Incomparable = -2,
}

/**
 * 依赖解析器类
 */
export class DependencyResolver {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 解析依赖关系
   * @param manifests 插件清单映射（id -> manifest）
   * @returns 依赖解析结果
   */
  resolve(manifests: Map<string, PluginManifest>): DependencyResolution {
    // 构建依赖图
    const graph = this.buildDependencyGraph(manifests);

    // 检测循环依赖
    const cycles = this.detectCycles(graph);

    // 查找缺失的依赖
    const missingDependencies = this.findMissingDependencies(graph, manifests);

    // 计算加载顺序（拓扑排序）
    const loadOrder = cycles.length === 0 ? this.topologicalSort(graph) : [];

    return {
      loadOrder,
      hasCycles: cycles.length > 0,
      cycles,
      missingDependencies,
    };
  }

  /**
   * 检查依赖是否满足
   * @param dependencies 依赖列表
   * @param availablePlugins 可用的插件映射
   * @returns 是否满足所有依赖
   */
  checkDependencies(
    dependencies: Array<{ id: string; version: string }>,
    availablePlugins: Map<string, PluginManifest>
  ): boolean {
    for (const dep of dependencies) {
      const plugin = availablePlugins.get(dep.id);

      if (!plugin) {
        this.logger.warn(`Dependency not found: ${dep.id}`);
        return false;
      }

      if (!this.isVersionCompatible(plugin.version, dep.version)) {
        this.logger.warn(
          `Version mismatch for ${dep.id}: required ${dep.version}, found ${plugin.version}`
        );
        return false;
      }
    }

    return true;
  }

  /**
   * 比较版本号
   * @param version1 版本1
   * @param version2 版本2
   * @returns 比较结果
   */
  compareVersions(version1: string, version2: string): VersionComparisonResult {
    const v1Parts = this.parseVersion(version1);
    const v2Parts = this.parseVersion(version2);

    if (!v1Parts || !v2Parts) {
      return VersionComparisonResult.Incomparable;
    }

    for (let i = 0; i < 3; i++) {
      const v1 = v1Parts[i] ?? 0;
      const v2 = v2Parts[i] ?? 0;
      if (v1 < v2) return VersionComparisonResult.Less;
      if (v1 > v2) return VersionComparisonResult.Greater;
    }

    return VersionComparisonResult.Equal;
  }

  /**
   * 检查版本是否兼容
   * @param actualVersion 实际版本
   * @param requiredVersion 要求的版本
   * @returns 是否兼容
   */
  isVersionCompatible(actualVersion: string, requiredVersion: string): boolean {
    // 支持版本范围语法
    if (requiredVersion.startsWith('^')) {
      // ^1.2.3 表示 >=1.2.3 <2.0.0
      return this.checkCaretRange(actualVersion, requiredVersion.slice(1));
    }

    if (requiredVersion.startsWith('~')) {
      // ~1.2.3 表示 >=1.2.3 <1.3.0
      return this.checkTildeRange(actualVersion, requiredVersion.slice(1));
    }

    if (requiredVersion.includes('-')) {
      // 1.0.0-2.0.0 表示范围
      const parts = requiredVersion.split('-');
      const min = parts[0];
      const max = parts[1];
      if (!min || !max) return false;
      return this.checkRange(actualVersion, min, max);
    }

    // 精确匹配
    return actualVersion === requiredVersion;
  }

  /**
   * 构建依赖图
   * @param manifests 插件清单映射
   * @returns 依赖图
   */
  private buildDependencyGraph(
    manifests: Map<string, PluginManifest>
  ): DependencyGraph {
    const nodes = new Map<string, DependencyNode>();
    const edges = new Map<string, Set<string>>();

    // 初始化所有节点的边集合
    for (const id of manifests.keys()) {
      edges.set(id, new Set());
    }

    // 创建节点和反向边（如果A依赖B，则创建B->A的边）
    for (const [id, manifest] of manifests) {
      const dependencies =
        manifest.dependencies?.plugins?.map((dep) => dep.id) ?? [];

      nodes.set(id, {
        id,
        version: manifest.version,
        dependencies,
      });

      // 为每个依赖创建反向边（依赖 -> 当前节点）
      for (const depId of dependencies) {
        if (!edges.has(depId)) {
          edges.set(depId, new Set());
        }
        edges.get(depId)!.add(id);
      }
    }

    return { nodes, edges };
  }

  /**
   * 检测循环依赖
   * @param graph 依赖图
   * @returns 循环依赖路径列表
   */
  private detectCycles(graph: DependencyGraph): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = graph.edges.get(node) ?? new Set();

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recursionStack.has(neighbor)) {
          // 发现循环
          const cycleStart = path.indexOf(neighbor);
          const cycle = path.slice(cycleStart);
          cycle.push(neighbor);
          cycles.push(cycle);
        }
      }

      recursionStack.delete(node);
    };

    for (const node of graph.nodes.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return cycles;
  }

  /**
   * 查找缺失的依赖
   * @param graph 依赖图
   * @param manifests 插件清单映射
   * @returns 缺失的依赖ID列表
   */
  private findMissingDependencies(
    graph: DependencyGraph,
    manifests: Map<string, PluginManifest>
  ): string[] {
    const missing = new Set<string>();

    for (const [id, node] of graph.nodes) {
      for (const depId of node.dependencies) {
        if (!manifests.has(depId)) {
          missing.add(depId);
          this.logger.warn(`Plugin ${id} depends on missing plugin ${depId}`);
        }
      }
    }

    return Array.from(missing);
  }

  /**
   * 拓扑排序（Kahn算法）
   * @param graph 依赖图
   * @returns 排序后的插件ID列表
   */
  private topologicalSort(graph: DependencyGraph): string[] {
    const result: string[] = [];
    const inDegree = new Map<string, number>();
    const queue: string[] = [];

    // 计算入度
    for (const node of graph.nodes.keys()) {
      inDegree.set(node, 0);
    }

    for (const neighbors of graph.edges.values()) {
      for (const neighbor of neighbors) {
        inDegree.set(neighbor, (inDegree.get(neighbor) ?? 0) + 1);
      }
    }

    // 找到所有入度为0的节点
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    // 拓扑排序
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      const neighbors = graph.edges.get(node) ?? new Set();
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) ?? 0) - 1;
        inDegree.set(neighbor, newDegree);

        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // 如果结果长度小于节点数，说明有环（理论上不应该到达这里）
    if (result.length < graph.nodes.size) {
      this.logger.error(
        'Topological sort failed: cycle detected (this should not happen)'
      );
      return [];
    }

    return result;
  }

  /**
   * 解析版本号
   * @param version 版本字符串
   * @returns 版本号数组 [major, minor, patch]
   */
  private parseVersion(version: string): [number, number, number] | null {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match || !match[1] || !match[2] || !match[3]) return null;

    return [
      parseInt(match[1], 10),
      parseInt(match[2], 10),
      parseInt(match[3], 10),
    ];
  }

  /**
   * 检查 Caret 范围 (^1.2.3 means >=1.2.3 <2.0.0)
   */
  private checkCaretRange(actual: string, required: string): boolean {
    const actualParts = this.parseVersion(actual);
    const requiredParts = this.parseVersion(required);

    if (!actualParts || !requiredParts) return false;

    // 主版本必须相同
    if (actualParts[0] !== requiredParts[0]) return false;

    // 实际版本必须 >= 要求版本
    return this.compareVersions(actual, required) >= 0;
  }

  /**
   * 检查 Tilde 范围 (~1.2.3 means >=1.2.3 <1.3.0)
   */
  private checkTildeRange(actual: string, required: string): boolean {
    const actualParts = this.parseVersion(actual);
    const requiredParts = this.parseVersion(required);

    if (!actualParts || !requiredParts) return false;

    // 主版本和次版本必须相同
    if (
      actualParts[0] !== requiredParts[0] ||
      actualParts[1] !== requiredParts[1]
    ) {
      return false;
    }

    // 实际版本必须 >= 要求版本
    return this.compareVersions(actual, required) >= 0;
  }

  /**
   * 检查版本范围
   */
  private checkRange(actual: string, min: string, max: string): boolean {
    const cmpMin = this.compareVersions(actual, min);
    const cmpMax = this.compareVersions(actual, max);

    return cmpMin >= 0 && cmpMax <= 0;
  }
}

# ajv-standalone-bundler

一个将 Ajv 和 standalone code generator 打包在一起的包，解决在浏览器/ESM 环境下分别导入导致的模块实例问题。

## 问题背景

当你在浏览器中使用 CDN 动态导入 Ajv 和 standaloneCode 时，通常会这样写：

```js
const [{ default: Ajv }, { default: standaloneCode }] = await Promise.all([
  import('https://esm.sh/ajv@8.18.0'),
  import('https://esm.sh/ajv@8.18.0/dist/standalone'),
]);
```

### 问题根源

这种导入方式会创建**两个独立的模块实例**：

1. 第一个 `import()` 加载 `ajv.mjs` → 创建模块实例 A → 包含 `_Code` 类定义 A
2. 第二个 `import()` 加载 `standalone.mjs` → 创建模块实例 B → 包含 `_Code` 类定义 B

当调用 `ajv.compile(schema)` 返回验证函数后，这个函数内部包含 `_Code` 对象。当 `standaloneCode` 尝试处理这些对象时，它使用 `instanceof _Code` 进行类型检查：

```typescript
// ajv 内部代码 (lib/compile/codegen/code.ts)
export function addCodeArg(code: CodeItem[], arg: CodeArg | string[]): void {
  if (arg instanceof _Code) code.push(...arg._items)  // ← 这里！
  else if (arg instanceof Name) code.push(arg)
  else code.push(interpolate(arg))  // ← 当 instanceof 失败时走这里
}
```

由于 `_Code` 类来自不同的模块实例，`instanceof` 检查返回 `false`，导致代码走入了错误的分支：

```typescript
// 当 instanceof 失败时，对象被 JSON 序列化
function interpolate(x?: string | string[] | number | boolean | null): SafeExpr | string {
  return typeof x == "number" || typeof x == "boolean" || x === null
    ? x
    : safeStringify(Array.isArray(x) ? x.join(",") : x)  // ← 错误的 JSON 序列化
}
```

### 实际后果

生成的代码中会出现这样的错误输出：

```js
const validate11 = function(data, {...}) {
  // ... 验证代码 ...

  // ❌ 错误：_Code 对象被 JSON 序列化
  var _self = {"_items":["self"]};

  // ❌ 错误：_Code 对象数组被 JSON 序列化
  var validate = {"_items":["validate"]};
};
```

而不是正确的 JavaScript 代码：

```js
const validate11 = function(data, {...}) {
  // ... 正确的验证代码 ...
  var self = this;
  var validate = validate11;
};
```

## 解决方案

这个包将 Ajv 和 standaloneCode 打包在一起，确保它们共享同一个模块实例。

通过在同一个项目中一起导入并重新导出，Rollup 打包时会将所有代码合并到单个模块中，从而保证 `_Code` 类的 `instanceof` 检查能够正常工作。

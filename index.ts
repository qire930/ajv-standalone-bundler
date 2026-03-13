import Ajv, { type Options } from 'ajv';
import standaloneCode from 'ajv/dist/standalone';

export * from 'ajv';
export { default as standaloneCode } from 'ajv/dist/standalone';

export type { Options };

/**
 * 编译 JSON Schema 为独立的校验函数代码
 * @param schema - JSON Schema 对象
 * @param options - Ajv 配置选项，可选
 * @returns 返回编译后的校验函数代码字符串
 */
async function compileAjvValidator(
  schema: object,
  options?: Options,
): Promise<string> {
  const ajv = new Ajv({
    // 错误提示
    allErrors: true, // 确保验证出所有错误
    messages: false, // 要自己翻译
    verbose: true, // 在错误信息中包含当前错误值

    // 数据清洗
    removeAdditional: true, // 移除额外的属性
    useDefaults: true, // 使用默认值填充缺失的属性
    coerceTypes: true, // 尝试将数据类型转换为合适的类型

    // 代码生成
    code: {
      source: true, // standaloneCode 必需
      esm: false, // 输出为 CommonJS 格式
    },
    ...options,
  });
  return standaloneCode(ajv, ajv.compile(schema));
}

export default compileAjvValidator;

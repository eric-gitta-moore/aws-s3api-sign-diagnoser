# AWS S3 API Signature Diagnoser

A tool for diagnosing and debugging AWS S3 API signing issues that helps developers quickly locate and resolve issues related to S3 API request signing.

一个用于诊断和调试 AWS S3 API 签名问题的工具，帮助开发者快速定位和解决 S3 API 请求签名相关的问题。

![eric-gitta-moore github io_aws-s3api-sign-diagnoser_](https://github.com/user-attachments/assets/7d7ee1c2-9ffd-4830-a9c7-ca1436125532)


## AWS S3 API Signature V4 Spec.
[Signature Calculations for the Authorization Header: Transferring Payload in a Single Chunk (AWS Signature Version 4)](https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html)

## 功能特性

- 支持解析和分析 cURL 命令，自动提取 AWS S3 API 请求信息
- 提供签名计算过程的可视化展示，帮助理解 AWS 签名 V4 的工作原理
- 实时诊断签名错误，并提供详细的问题分析和解决建议
- 支持自定义 AWS 凭证和请求参数，便于测试不同场景

- Supports parsing and analyzing cURL commands to automatically extract AWS S3 API request information
- Provides a visual demonstration of the signature calculation process to help understand how AWS Signature V4 works
- Diagnose signature errors in real time, and provide detailed problem analysis and resolution suggestions
- Supports custom AWS credentials and request parameters for testing different scenarios

## 环境要求

- Node.js 20.0 或更高版本
- pnpm 包管理器

## 快速开始

### 安装

```bash
# 克隆项目
git clone https://github.com/yourusername/aws-s3api-sign-diagnoser.git

# 进入项目目录
cd aws-s3api-sign-diagnoser

# 安装依赖
pnpm install

# 生产预览
pnpm run preview
```

### 开发

```bash
# 启动开发服务器
pnpm run dev
```

### 构建

```bash
# 构建生产版本
pnpm run build
```

## 使用指南

1. 启动应用后，将您遇到问题的 S3 API 请求的 cURL 命令粘贴到输入框中
2. 点击「分析」按钮，工具将自动解析请求信息并进行签名验证
3. 查看分析结果，了解签名计算过程和可能存在的问题
4. 根据诊断建议修改请求参数或凭证信息

## 技术栈

- React 19
- TypeScript
- Vite
- Ant Design
- crypto-js
- curlconverter

## 开发指南

### 项目结构

```
src/
  ├── components/     # 组件目录
  ├── utils/          # 工具函数
  ├── hooks/          # 自定义 Hooks
  ├── types/          # TypeScript 类型定义
  ├── App.tsx         # 应用入口
  └── main.tsx        # 主渲染文件
```

### ESLint 配置

项目使用 ESLint 进行代码规范检查，如需修改配置，请参考以下步骤：

1. 配置 `parserOptions`：

```js
export default tseslint.config({
  languageOptions: {
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

2. 启用 React 插件：

```js
import react from 'eslint-plugin-react'

export default tseslint.config({
  settings: { react: { version: '19.0' } },
  plugins: {
    react,
  },
  rules: {
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```

## 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进这个项目。在提交 PR 之前，请确保：

1. 代码通过 ESLint 检查
2. 新功能包含适当的测试
3. 更新相关文档

## 许可证

本项目采用 MIT 许可证，详见 [LICENSE](./LICENSE) 文件。

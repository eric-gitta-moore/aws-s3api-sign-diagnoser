// AWS S3 API 签名相关的类型定义

/**
 * 表单值接口，用于收集用户输入的签名所需信息
 */
export interface FormValues {
  /** curl 命令字符串，包含完整的 API 请求信息 */
  curlCommand: string;
  /** AWS 访问密钥 ID */
  accessKeyId: string;
  /** AWS 秘密访问密钥 */
  secretAccessKey: string;
  /** AWS 区域，默认为 us-east-1 */
  region?: string;
  /** 自定义 S3 终端节点 URL */
  endpointUrl?: string;
  /** S3 存储桶名称 */
  bucketName?: string;
}

/**
 * 签名详情接口，包含签名计算过程中的所有中间值和最终结果
 */
export interface SignatureDetails {
  /** 规范化请求字符串，包含 HTTP 方法、URI、查询字符串和规范化头部 */
  canonicalRequest: string;
  /** 待签名字符串，包含算法、时间戳、凭证范围和规范化请求的哈希值 */
  stringToSign: string;
  /** 日期密钥，使用 AWS4 和密钥对日期进行 HMAC-SHA256 计算的结果 */
  dateKey: string;
  /** 区域密钥，使用日期密钥对区域进行 HMAC-SHA256 计算的结果 */
  dateRegionKey: string;
  /** 服务密钥，使用区域密钥对服务名进行 HMAC-SHA256 计算的结果 */
  dateRegionServiceKey: string;
  /** 签名密钥，使用服务密钥对 aws4_request 进行 HMAC-SHA256 计算的结果 */
  signingKey: string;
  /** 最终计算得到的签名值 */
  signature: string;
  /** 原始请求中的签名值，用于对比验证 */
  originalSignature: string;
  /** AWS 访问密钥 ID */
  accessKeyId: string;
  /** 请求日期，格式为 YYYYMMDD */
  dateStamp: string;
  /** AWS 区域 */
  region: string;
  /** 已签名的请求头列表，以分号分隔 */
  signedHeaders: string;
  /** 请求头键值对 */
  headers: Record<string, string>;
  /** 完整的授权头部字符串 */
  authorizationHeader: string;
}

/**
 * 解析后的 curl 命令接口，包含从 curl 命令中提取的所有必要信息
 */
export interface ParsedCurlCommand {
  /** 请求头键值对 */
  headers: Record<string, string>;
  /** HTTP 请求方法（GET、PUT、POST 等） */
  method: string;
  /** 请求路径 */
  path: string;
  /** URL 查询字符串 */
  queryString: string;
  /** S3 终端节点 URL */
  endpointUrl: string;
  /** 从授权头部提取的 AWS 访问密钥 ID */
  accessKeyId: string;
  /** 从终端节点 URL 或授权头部提取的 AWS 区域 */
  region: string;
  /** 从请求 URL 提取的存储桶名称 */
  bucketName: string;
  /** 解析后的完整 curl 命令对象 */
  parsedCommand: any;
}
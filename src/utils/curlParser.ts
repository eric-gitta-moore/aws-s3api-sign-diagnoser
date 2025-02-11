import { ParsedCurlCommand } from '../types';
import * as curlconverter from 'curlconverter';

export const parseCurlCommand = (curlCommand: string): ParsedCurlCommand => {
  try {
    const parsedCommand = curlconverter.toJsonObject(curlCommand);
    const headers: Record<string, string> = {};
    let method = 'GET';
    let path = '/';
    let queryString = '';
    let endpointUrl = '';
    let accessKeyId = '';
    let region = '';
    let bucketName = '';

    // 提取请求头
    if (parsedCommand.headers) {
      Object.entries(parsedCommand.headers as Record<string, string>).forEach(([key, value]) => {
        headers[key.toLowerCase()] = value;

        // 从 Authorization 头中提取 AccessKeyId 和 region
        if (key.toLowerCase() === 'authorization') {
          const credentialMatch = value.match(/Credential=([^/]+)/);
          if (credentialMatch) {
            accessKeyId = credentialMatch[1];
            const credentialScopeMatch = value.match(/Credential=[^/]+\/[^/]+\/([^/]+)\/s3\/aws4_request/);
            if (credentialScopeMatch) {
              region = credentialScopeMatch[1];
            }
          }
        }
      });
    }

    // 提取 HTTP 方法
    if (parsedCommand.method) {
      method = parsedCommand.method.toUpperCase();
    }

    // 提取 URL 相关信息
    if (parsedCommand.raw_url) {
      const url = new URL(parsedCommand.raw_url);
      endpointUrl = `${url.protocol}//${url.host}`;
      path = url.pathname || '/';
      queryString = url.search.replace(/^\?/, '') || '';

      // 从 endpoint 中提取 region
      const s3Match = url.host.match(/s3[.-]([^.]+).amazonaws\.com/);
      if (s3Match) {
        region = s3Match[1];
      }

      // 从路径中提取 bucket name
      const bucketMatch = path.match(/^\/([^/]+)/);
      if (bucketMatch) {
        bucketName = bucketMatch[1];
      }
    }

    return { headers, method, path, queryString, endpointUrl, accessKeyId, region, bucketName, parsedCommand };
  } catch (error) {
    console.error('解析 curl 命令时出错：', error);
    throw error;
  }
};
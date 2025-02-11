import { useState } from 'react';
import CryptoJS from 'crypto-js';
import { FormValues, SignatureDetails } from '../types';
import { parseCurlCommand } from '../utils/curlParser';

export const useSignature = () => {
  const [signatureDetails, setSignatureDetails] = useState<SignatureDetails | null>(null);
  const [loading, setLoading] = useState(false);

  const calculateSignature = (values: FormValues) => {
    try {
      const { headers, method, path, queryString, parsedCommand } = parseCurlCommand(values.curlCommand);
      const authHeader = headers['authorization'] || '';
      const originalSignature = authHeader.match(/Signature=([a-f0-9]+)/)?.[1] || '';

      // 构建规范请求头字符串
      const requiredHeaders = new Set<string>();

      // 1. 添加 host 头部
      if (!headers['host'] && parsedCommand.url) {
        const url = new URL(parsedCommand.url);
        headers['host'] = url.host;
      }
      if (headers['host']) {
        requiredHeaders.add('host');
      }

      // 2. 添加 Content-MD5 头部（如果存在）
      if (headers['content-md5']) {
        requiredHeaders.add('content-md5');
      }

      // 3. 添加所有 x-amz-* 头部
      Object.keys(headers).forEach(key => {
        if (key.toLowerCase().startsWith('x-amz-')) {
          requiredHeaders.add(key.toLowerCase());
        }
      });

      // 4. 添加原始签名中的其他头部
      const signedHeaders = authHeader.match(/SignedHeaders=([^,]+)/)?.[1] || '';
      signedHeaders.split(';').forEach(header => {
        if (header && headers[header]) {
          requiredHeaders.add(header.toLowerCase());
        }
      });

      // 添加 Range 头部（如果存在）
      if (headers['range']) {
        requiredHeaders.add('range');
      }

      // 构建规范请求头字符串
      const canonicalHeaders = Array.from(requiredHeaders)
        .sort()
        .map(header => {
          // 规范化头部值：去除前后空格，合并中间空格
          const value = headers[header]?.trim().replace(/\s+/g, ' ') || '';
          return `${header}:${value}`;
        })
        .join('\n');

      // 更新已签名的请求头列表
      const newSignedHeaders = Array.from(requiredHeaders).sort().join(';');

      // 构建 Canonical Request
      const canonicalRequest = [
        method,
        path,
        queryString,
        canonicalHeaders + '\n',
        newSignedHeaders,
        method === 'GET' ? CryptoJS.SHA256('').toString() : headers['x-amz-content-sha256']
      ].join('\n');

      // 构建 String to Sign
      const region = values.region || 'us-east-1';
      const dateStamp = headers['x-amz-date']?.substring(0, 8) || '';
      const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
      const stringToSign = `AWS4-HMAC-SHA256\n${headers['x-amz-date']}\n${credentialScope}\n${CryptoJS.SHA256(canonicalRequest).toString()}`;

      // 计算 Signing Key
      const kDate = CryptoJS.HmacSHA256(dateStamp, 'AWS4' + values.secretAccessKey);
      const kRegion = CryptoJS.HmacSHA256(region, kDate);
      const kService = CryptoJS.HmacSHA256('s3', kRegion);
      const kSigning = CryptoJS.HmacSHA256('aws4_request', kService);

      // 计算最终签名
      const signature = CryptoJS.HmacSHA256(stringToSign, kSigning).toString();

      const sig = {
        canonicalRequest,
        stringToSign,
        dateKey: kDate.toString(),
        dateRegionKey: kRegion.toString(),
        dateRegionServiceKey: kService.toString(),
        signingKey: kSigning.toString(),
        signature,
        originalSignature,
        accessKeyId: values.accessKeyId,
        dateStamp,
        region,
        signedHeaders: newSignedHeaders,
        headers,
        authorizationHeader: ''
      };

      setSignatureDetails({
        ...sig,
        authorizationHeader: [
          'AWS4-HMAC-SHA256',
          `Credential=${sig.accessKeyId}/${sig.dateStamp}/${sig.region}/s3/aws4_request,`,
          `SignedHeaders=${sig.signedHeaders},`,
          `Signature=${sig.signature}`
        ].join(' ')
      });

      return true;
    } catch (error) {
      console.error('签名计算过程中出现错误', error);
      return false;
    }
  };

  return {
    signatureDetails,
    loading,
    setLoading,
    calculateSignature
  };
};
import { useState } from 'react';
import { Form, Input, Button, Card, Steps, Typography, Space, message, Skeleton } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import CryptoJS from 'crypto-js';
import './App.css';
import * as curlconverter from 'curlconverter';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

interface FormValues {
  curlCommand: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  endpointUrl: string;
  bucketName: string;
}

interface SignatureDetails {
  canonicalRequest: string;
  stringToSign: string;
  dateKey: string;
  dateRegionKey: string;
  dateRegionServiceKey: string;
  signingKey: string;
  signature: string;
  originalSignature: string;
  // 添加新的字段
  accessKeyId: string;
  dateStamp: string;
  region: string;
  signedHeaders: string;
  headers: Record<string, string>;
  authorizationHeader: string;
}

function App() {
  const [form] = Form.useForm<FormValues>();
  const [signatureDetails, setSignatureDetails] = useState<SignatureDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualSignatureStatus, setManualSignatureStatus] = useState<'success' | 'error' | ''>('');

  const handleCurlCommandBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    const curlCommand = event.target.value;
    if (!curlCommand) return;

    try {
      const { accessKeyId, region, endpointUrl, bucketName } = parseCurlCommand(curlCommand);

      // 自动填充解析出的字段
      const fields: Partial<FormValues> = {};
      if (accessKeyId) fields.accessKeyId = accessKeyId;
      if (region) fields.region = region;
      if (endpointUrl) fields.endpointUrl = endpointUrl;
      if (bucketName) fields.bucketName = bucketName;

      form.setFieldsValue(fields);

      // 提示用户需要手动填写的字段
      const missingFields = [];
      if (!accessKeyId) missingFields.push('Access Key ID');
      if (!fields.secretAccessKey) missingFields.push('Secret Access Key');

      if (missingFields.length > 0) {
        message.info(`请手动填写以下字段：${missingFields.join('、')}`);
      }
    } catch (error) {
      console.error('解析 curl 命令时出错：', error);
      message.error('解析 curl 命令时出错，请检查命令格式是否正确');
    }
  };

  const parseCurlCommand = (curlCommand: string) => {
    try {
      const parsedCommand = curlconverter.toJsonObject(curlCommand);
      console.info(`parsedCommand:`, parsedCommand)
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
        // 添加新的字段
        accessKeyId: values.accessKeyId,
        dateStamp,
        region,
        signedHeaders: newSignedHeaders,
        headers,
        authorizationHeader: ``
      }
      setSignatureDetails({
        ...sig,
        authorizationHeader: ['AWS4-HMAC-SHA256',
          `Credential=${sig.accessKeyId}/${sig.dateStamp}/${sig.region}/s3/aws4_request,`,
          `SignedHeaders=${sig.signedHeaders},`,
          `Signature=${sig.signature}`,
        ].join(' ')
      })

    } catch (error) {
      message.error('签名计算过程中出现错误');
      console.error(error);
    }
  };

  const handleSubmit = (values: FormValues) => {
    setLoading(true);
    calculateSignature(values);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="container">
      <Title level={2}>AWS S3 API 签名诊断工具</Title>

      <p>
        详细计算文档参考: https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html
      </p>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="Curl 命令"
            name="curlCommand"
            rules={[{ required: true, message: '请输入 curl 命令' }]}
            extra={
              <Paragraph>其他格式可以使用 <a href='http://web.chacuo.net/nethttprequest2curl' target='_blank'>格式转换工具</a> 转换后粘贴过来</Paragraph>
            }
          >
            <TextArea
              rows={15}
              placeholder="请粘贴完整的 curl 命令"
              onBlur={handleCurlCommandBlur}
            />
          </Form.Item>

          <Space size="large" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            <Form.Item
              label="Access Key ID"
              name="accessKeyId"
              rules={[{ required: true, message: '请输入 Access Key ID' }]}
            >
              <Input placeholder="请输入 Access Key ID" />
            </Form.Item>

            <Form.Item
              label="Secret Access Key"
              name="secretAccessKey"
              rules={[{ required: true, message: '请输入 Secret Access Key' }]}
            >
              <Input.Password placeholder="请输入 Secret Access Key" />
            </Form.Item>

            <Form.Item
              label="Region"
              name="region"
              initialValue="us-east-1"
            >
              <Input placeholder="请输入 Region" />
            </Form.Item>

            <Form.Item
              label="Endpoint URL"
              name="endpointUrl"
              tooltip="可选，用于自定义 S3 终端节点"
            >
              <Input placeholder="请输入自定义终端节点 URL" />
            </Form.Item>

            <Form.Item
              label="Bucket Name"
              name="bucketName"
            >
              <Input placeholder="请输入 Bucket 名称" />
            </Form.Item>
          </Space>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              计算签名
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="签名计算结果" style={{ marginTop: 24 }}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 100 }} />
        ) : (signatureDetails ?
          <Steps
            direction="vertical"
            items={[
              {
                status: 'process',
                title: '第一步：Canonical Request',
                description: (
                  <>
                    <Paragraph className="canonical-format-quote">
                      <Text>
                        {`以下是Amazon S3用于计算签名的规范请求格式。要使签名匹配，您必须以以下格式创建规范请求：`}
                      </Text>
                      <pre>
                        {String.raw`
<HTTPMethod>\n
<CanonicalURI>\n
<CanonicalQueryString>\n
<CanonicalHeaders>\n
<SignedHeaders>\n
<HashedPayload>
`.trim()}
                      </pre>
                      <Text code>CanonicalHeaders</Text> <Text>列表必须包括以下内容：</Text>
                      <pre>{`
- HTTP \`host\` header.
- 如果请求中存在 \`Content-MD5\` 标头，则必须将其添加到 \`CanonicalHeaders\` 列表中。
- 您计划在请求中包含的任何 \`x-amz-*\` 标头也必须添加。例如，如果您使用临时安全凭证，则需要在请求中包含 \`x-amz-security-token\`。您必须将此标题添加到 \`CanonicalHeaders\` 列表中。
`.trim()}</pre>
                      <Paragraph>
                        <Text code>x-amz-content-sha256</Text> 标头是所有AWS Signature版本4请求所必需的。它提供请求有效载荷的哈希。如果没有有效负载，则必须提供空字符串的散列。
                      </Paragraph>
                      <Text code>HashedPayload</Text> <Text>是请求有效负载的SHA256哈希值的十六进制值。</Text>
                      <pre>{`<HashedPayload> = Hex(SHA256Hash(<payload>)`}</pre>

                    </Paragraph>
                    <Paragraph copyable>
                      <pre>{signatureDetails.canonicalRequest}</pre>
                    </Paragraph>
                  </>
                )
              },
              {
                status: 'process',
                title: '第二步：String to Sign',
                description: (
                  <>
                    <Paragraph className="canonical-format-quote">
                      <Text>
                        {`以下是Amazon S3用于计算签名的规范请求格式。要使签名匹配，您必须以以下格式创建规范请求：`}
                      </Text>
                      <pre>
                        {String.raw`
"AWS4-HMAC-SHA256" + "\n" +
timeStampISO8601Format + "\n" +
<Scope> + "\n" +
Hex(SHA256Hash(<CanonicalRequest>))
`.trim()}
                      </pre>
                      <Text>
                        {'<Scope> 将生成的签名绑定到特定日期、AWS区域和服务。因此，您生成的签名将仅在特定区域和特定服务中有效。签名在指定日期后七天内有效。'}
                      </Text>
                      <pre>
                        {`<Scope> = date.Format(<YYYYMMDD>) + "/" + <region> + "/" + <service> + "/aws4_request"`}
                      </pre>
                    </Paragraph>
                    <Paragraph copyable>
                      <pre>{signatureDetails.stringToSign}</pre>
                    </Paragraph>
                  </>
                )
              },
              {
                status: 'process',
                title: '第三步：Signing Key',
                description: (
                  <>
                    <Paragraph className='canonical-format-quote'>
                      <Text>
                        {'在AWS Signature Version 4中，您不是使用AWS访问密钥来签署请求，而是首先创建一个适用于特定区域和服务的签名密钥。 有关签名密钥的详细信息，请参阅签名请求简介。'}
                      </Text>
                      <pre>
                        {String.raw`
DateKey              = HMAC-SHA256("AWS4"+"<SecretAccessKey>", "<YYYYMMDD>")
DateRegionKey        = HMAC-SHA256(<DateKey>, "<aws-region>")
DateRegionServiceKey = HMAC-SHA256(<DateRegionKey>, "<aws-service>")
SigningKey           = HMAC-SHA256(<DateRegionServiceKey>, "aws4_request")
`.trim()}
                      </pre>
                    </Paragraph>

                    <Paragraph>
                      <Space direction="vertical">
                        <Text>
                          DateKey = <Text code copyable>{signatureDetails.dateKey}</Text>
                        </Text>
                        <Text>
                          DateRegionKey = <Text code copyable>{signatureDetails.dateRegionKey}</Text>
                        </Text>
                        <Text>
                          DateRegionServiceKey = <Text code copyable>{signatureDetails.dateRegionServiceKey}</Text>
                        </Text>
                        <Text>
                          SigningKey = <Text code copyable>{signatureDetails.signingKey}</Text>
                        </Text>
                      </Space>

                    </Paragraph>
                  </>
                )
              },
              {
                status: 'process',
                title: '第四步：Signature',
                description: (
                  <>

                    <Paragraph className='canonical-format-quote'>
                      <Text>
                        {'最终签名是要 StringToSign 的 HMAC-SHA256 散列，使用 SigningKey 作为密钥。'}
                      </Text>
                      <pre>
                        {String.raw`
HMAC-SHA256(SigningKey, StringToSign)
`.trim()}
                      </pre>
                    </Paragraph>

                    <Space direction="vertical">
                      <Text type="secondary">计算得到的签名：</Text>
                      <Text>Signature = <Text copyable strong>{signatureDetails.signature}</Text></Text>
                      <Text type="secondary">原始请求中的签名：</Text>
                      <Text>Signature = <Text copyable type={signatureDetails.signature === signatureDetails.originalSignature ? 'success' : 'danger'}>
                        {signatureDetails.originalSignature}
                      </Text></Text>
                      <Text type="secondary">手动输入的签名：</Text>
                      <Input
                        placeholder="请输入手动计算的签名进行对比"
                        onChange={(e) => {
                          const manualSignature = e.target.value;
                          const status = manualSignature
                            ? (manualSignature === signatureDetails.signature ? 'success' : 'error')
                            : '';
                          setManualSignatureStatus(status as 'success' | 'error' | '');
                        }}
                        className={manualSignatureStatus ? `signature-input-${manualSignatureStatus}` : ''}
                        style={{ width: '100%' }}
                      />
                    </Space>
                  </>
                )
              },
              {
                status: 'process',
                title: '第五步：Authorization Header',
                description: (
                  <>
                    <Paragraph className='canonical-format-quote'>
                      <Text>
                        {'最后一步是将所有计算得到的信息组合成一个完整的 Authorization 标头。这个标头包含了签名过程中使用的所有关键信息，包括签名算法、凭证范围、已签名的请求头和最终签名。'}
                      </Text>
                      <pre>
                        {String.raw`
Authorization: AWS4-HMAC-SHA256
Credential=<AccessKeyID>/<CredentialScope>,
SignedHeaders=<SignedHeaderList>,
Signature=<Signature>
`.trim()}
                      </pre>
                      <Text>
                        {'其中 <CredentialScope> 的格式为：'}
                      </Text>
                      <pre>
                        {String.raw`<YYYYMMDD>/<aws-region>/s3/aws4_request`}
                      </pre>
                      <Text>
                        {'- <YYYYMMDD>：请求日期，格式为年月日，例如 20240101'}
                      </Text>
                      <br />
                      <Text>
                        {'- <aws-region>：AWS 区域，例如 us-east-1'}
                      </Text>
                      <br />
                      <Text>
                        {'- s3：服务名称，固定为 s3'}
                      </Text>
                      <br />
                      <Text>
                        {'- aws4_request：请求类型，固定为 aws4_request'}
                      </Text>
                    </Paragraph>

                    <Text>计算得到的 Authorization 标头：</Text>
                    <Paragraph copyable>
                      <pre>
                        {(signatureDetails.authorizationHeader).replace(/Credential=|SignedHeaders=|Signature=/ig, match => `\n${match}`).trim()}
                      </pre>
                    </Paragraph>
                    <Text>原始请求中的 Authorization 标头：</Text>
                    <Paragraph copyable>
                      <pre style={{ color: signatureDetails.headers['authorization'].replace('/\s/ig', '') === signatureDetails.authorizationHeader.replace('/\s/ig', '') ? '#52c41a' : '#ff4d4f' }}>
                        {(signatureDetails.headers['authorization'] || '未提供').replace(/Credential=|SignedHeaders=|Signature=/ig, match => `\n${match}`).trim()}
                      </pre>
                    </Paragraph>
                  </>
                )
              }
            ]}
          /> : null)}
      </Card>
    </div>
  );
}

export default App;

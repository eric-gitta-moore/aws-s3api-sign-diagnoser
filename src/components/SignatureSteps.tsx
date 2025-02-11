import React from 'react';
import { Steps, Typography, Space, Input } from 'antd';
import { SignatureDetails } from '../types';

const { Text, Paragraph } = Typography;

interface SignatureStepsProps {
  signatureDetails: SignatureDetails;
  manualSignatureStatus: 'success' | 'error' | '';
  onManualSignatureChange: (value: string) => void;
}

const CanonicalRequestStep: React.FC<{ signatureDetails: SignatureDetails }> = ({ signatureDetails }) => (
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
);

const StringToSignStep: React.FC<{ signatureDetails: SignatureDetails }> = ({ signatureDetails }) => (
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
);

const SigningKeyStep: React.FC<{ signatureDetails: SignatureDetails }> = ({ signatureDetails }) => (
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
);

const SignatureStep: React.FC<{
  signatureDetails: SignatureDetails;
  manualSignatureStatus: 'success' | 'error' | '';
  onManualSignatureChange: (value: string) => void;
}> = ({ signatureDetails, manualSignatureStatus, onManualSignatureChange }) => (
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
        onChange={(e) => onManualSignatureChange(e.target.value)}
        className={manualSignatureStatus ? `signature-input-${manualSignatureStatus}` : ''}
        style={{ width: '100%' }}
      />
    </Space>
  </>
);

const AuthorizationHeaderStep: React.FC<{ signatureDetails: SignatureDetails }> = ({ signatureDetails }) => (
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
);

export const SignatureSteps: React.FC<SignatureStepsProps> = ({
  signatureDetails,
  manualSignatureStatus,
  onManualSignatureChange
}) => {
  return (
    <Steps
      direction="vertical"
      items={[
        {
          status: 'process',
          title: '第一步：Canonical Request',
          description: <CanonicalRequestStep signatureDetails={signatureDetails} />
        },
        {
          status: 'process',
          title: '第二步：String to Sign',
          description: <StringToSignStep signatureDetails={signatureDetails} />
        },
        {
          status: 'process',
          title: '第三步：Signing Key',
          description: <SigningKeyStep signatureDetails={signatureDetails} />
        },
        {
          status: 'process',
          title: '第四步：Signature',
          description: (
            <SignatureStep
              signatureDetails={signatureDetails}
              manualSignatureStatus={manualSignatureStatus}
              onManualSignatureChange={onManualSignatureChange}
            />
          )
        },
        {
          status: 'process',
          title: '第五步：Authorization Header',
          description: <AuthorizationHeaderStep signatureDetails={signatureDetails} />
        }
      ]}
    />
  );
};
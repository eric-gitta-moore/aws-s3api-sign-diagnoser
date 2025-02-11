import { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space, message, Skeleton } from 'antd';
import './App.css';
import { useSignature } from './hooks/useSignature';
import { SignatureSteps } from './components/SignatureSteps';
import { parseCurlCommand } from './utils/curlParser';
import { App as Antd } from 'antd'

const { TextArea } = Input;
const { Title, Paragraph } = Typography;

interface FormValues {
  curlCommand: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  endpointUrl: string;
  bucketName: string;
}

function App() {
  const [form] = Form.useForm<FormValues>();
  const { signatureDetails, loading, setLoading, calculateSignature } = useSignature();
  const [manualSignatureStatus, setManualSignatureStatus] = useState<'success' | 'error' | ''>('');
  const { message, notification, modal } = Antd.useApp();


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
      message.info('已自动填充部分字段')

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
          <SignatureSteps
            signatureDetails={signatureDetails}
            manualSignatureStatus={manualSignatureStatus}
            onManualSignatureChange={(value) => {
              const status = value
                ? (value === signatureDetails.signature ? 'success' : 'error')
                : '';
              setManualSignatureStatus(status);
            }}
          />
          : null)}
      </Card>
    </div>
  );
}

export default App;

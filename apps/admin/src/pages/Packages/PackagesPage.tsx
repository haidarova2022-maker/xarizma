import { useEffect, useState } from 'react';
import {
  Typography, Table, Tag, Button, Modal, Form, Input, InputNumber,
  Switch, Space, message,
} from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { getPackages, createPackage, updatePackage } from '../../api/client';

const { Title } = Typography;

export default function PackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const loadPackages = async () => {
    setLoading(true);
    try {
      const { data } = await getPackages();
      setPackages(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPackages(); }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, priceModifier: 0 });
    setShowModal(true);
  };

  const openEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      priceModifier: record.priceModifier,
      isActive: record.isActive,
      includesLights: record.includes?.lights || false,
      includesMicrophone: record.includes?.microphone || false,
      includesBalloons: record.includes?.balloons || false,
      includesConsole: record.includes?.console || false,
      includesExtendedMenu: record.includes?.extendedMenu || false,
    });
    setShowModal(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        name: values.name,
        description: values.description,
        priceModifier: values.priceModifier,
        isActive: values.isActive,
        includes: {
          lights: values.includesLights || false,
          microphone: values.includesMicrophone || false,
          balloons: values.includesBalloons || false,
          console: values.includesConsole || false,
          extendedMenu: values.includesExtendedMenu || false,
        },
      };
      if (editing) {
        await updatePackage(editing.id, payload);
        message.success('Пакет обновлён');
      } else {
        await createPackage(payload);
        message.success('Пакет создан');
      }
      setShowModal(false);
      loadPackages();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Ошибка');
    }
  };

  const INCLUDES_LABELS: Record<string, string> = {
    lights: 'Свет',
    microphone: 'Микрофон',
    balloons: 'Шары',
    console: 'Приставка',
    extendedMenu: 'Расш. меню',
  };

  const columns = [
    { title: 'Название', dataIndex: 'name', key: 'name' },
    { title: 'Описание', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Включает',
      key: 'includes',
      render: (_: any, r: any) => {
        const inc = r.includes || {};
        return Object.entries(inc)
          .filter(([, v]) => v)
          .map(([k]) => <Tag key={k} color="blue">{INCLUDES_LABELS[k] || k}</Tag>);
      },
    },
    {
      title: 'Доплата',
      dataIndex: 'priceModifier',
      key: 'priceModifier',
      render: (p: number) => `+${new Intl.NumberFormat('ru-RU').format(p)} ₽`,
    },
    {
      title: 'Статус',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (a: boolean) => <Tag color={a ? 'green' : 'red'}>{a ? 'Активен' : 'Неактивен'}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_: any, r: any) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Пакеты мероприятий</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Новый пакет
        </Button>
      </div>

      <Table columns={columns} dataSource={packages} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} />

      <Modal
        title={editing ? 'Редактировать пакет' : 'Новый пакет'}
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={null}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input placeholder="День рождения" />
          </Form.Item>

          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={2} placeholder="Световое оформление, микрофон, шары..." />
          </Form.Item>

          <Form.Item name="priceModifier" label="Доплата (₽)" rules={[{ required: true }]}>
            <InputNumber min={0} step={500} style={{ width: '100%' }} />
          </Form.Item>

          <div style={{ marginBottom: 16 }}>
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>Что входит:</Typography.Text>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Form.Item name="includesLights" valuePropName="checked" style={{ marginBottom: 4 }}>
                <Switch size="small" /> <span style={{ marginLeft: 8 }}>Световое оформление</span>
              </Form.Item>
              <Form.Item name="includesMicrophone" valuePropName="checked" style={{ marginBottom: 4 }}>
                <Switch size="small" /> <span style={{ marginLeft: 8 }}>Доп. микрофон</span>
              </Form.Item>
              <Form.Item name="includesBalloons" valuePropName="checked" style={{ marginBottom: 4 }}>
                <Switch size="small" /> <span style={{ marginLeft: 8 }}>Шары</span>
              </Form.Item>
              <Form.Item name="includesConsole" valuePropName="checked" style={{ marginBottom: 4 }}>
                <Switch size="small" /> <span style={{ marginLeft: 8 }}>Игровая приставка</span>
              </Form.Item>
              <Form.Item name="includesExtendedMenu" valuePropName="checked" style={{ marginBottom: 4 }}>
                <Switch size="small" /> <span style={{ marginLeft: 8 }}>Расширенное меню</span>
              </Form.Item>
            </div>
          </div>

          <Form.Item name="isActive" label="Активен" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setShowModal(false)}>Отмена</Button>
              <Button type="primary" htmlType="submit">
                {editing ? 'Сохранить' : 'Создать'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

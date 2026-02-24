import { useEffect, useState } from 'react';
import {
  Typography, Table, Tag, Button, Modal, Form, Input, InputNumber,
  DatePicker, Switch, Space, message, Popconfirm,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getPromoCodes, createPromoCode, updatePromoCode, deletePromoCode } from '../../api/client';

const { Title } = Typography;

export default function PromoCodesPage() {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const loadCodes = async () => {
    setLoading(true);
    try {
      const { data } = await getPromoCodes();
      setCodes(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCodes(); }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true });
    setShowModal(true);
  };

  const openEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue({
      code: record.code,
      discountType: record.discountType || 'fixed',
      discountValue: record.discountValue || record.value,
      usageLimit: record.usageLimit,
      isActive: record.isActive,
      validFrom: record.validFrom ? dayjs(record.validFrom) : null,
      validTo: record.validTo ? dayjs(record.validTo) : null,
    });
    setShowModal(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        ...values,
        validFrom: values.validFrom?.toISOString() || null,
        validTo: values.validTo?.toISOString() || null,
      };
      if (editing) {
        await updatePromoCode(editing.id, payload);
        message.success('Промокод обновлён');
      } else {
        await createPromoCode(payload);
        message.success('Промокод создан');
      }
      setShowModal(false);
      loadCodes();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Ошибка');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deletePromoCode(id);
      message.success('Промокод удалён');
      loadCodes();
    } catch {
      message.error('Ошибка удаления');
    }
  };

  const columns = [
    { title: 'Код', dataIndex: 'code', key: 'code', render: (c: string) => <Tag>{c}</Tag> },
    {
      title: 'Скидка',
      key: 'discount',
      render: (_: any, r: any) => {
        const type = r.discountType || r.type;
        const value = r.discountValue || r.value;
        if (type === 'percentage') return `${value}%`;
        return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
      },
    },
    {
      title: 'Использований',
      key: 'usage',
      render: (_: any, r: any) => `${r.usageCount || 0}${r.usageLimit ? ` / ${r.usageLimit}` : ''}`,
    },
    {
      title: 'Срок',
      key: 'validity',
      render: (_: any, r: any) => {
        if (!r.validFrom && !r.validTo) return 'Бессрочный';
        const from = r.validFrom ? dayjs(r.validFrom).format('DD.MM.YY') : '...';
        const to = r.validTo ? dayjs(r.validTo).format('DD.MM.YY') : '...';
        return `${from} — ${to}`;
      },
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
      width: 100,
      render: (_: any, r: any) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Удалить промокод?" onConfirm={() => handleDelete(r.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Промокоды и акции</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Новый промокод
        </Button>
      </div>

      <Table columns={columns} dataSource={codes} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} />

      <Modal
        title={editing ? 'Редактировать промокод' : 'Новый промокод'}
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={null}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="code" label="Код" rules={[{ required: true }]}>
            <Input placeholder="SUMMER2025" style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="discountType" label="Тип скидки" rules={[{ required: true }]}>
              <select className="ant-input" style={{ width: '100%', padding: '4px 11px', height: 32 }}>
                <option value="fixed">Фиксированная (₽)</option>
                <option value="percentage">Процент (%)</option>
              </select>
            </Form.Item>
            <Form.Item name="discountValue" label="Значение" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item name="usageLimit" label="Лимит использований">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Без лимита" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="validFrom" label="Действует с">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="validTo" label="Действует до">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
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

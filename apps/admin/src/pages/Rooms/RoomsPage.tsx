import { useEffect, useState } from 'react';
import { Typography, Table, Button, Modal, Form, Input, InputNumber, Select, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useBranchStore } from '../../stores/branch-store';
import { getRooms, createRoom, updateRoom } from '../../api/client';

const { Title } = Typography;

const CATEGORY_LABELS: Record<string, string> = {
  bratski: 'По-братски',
  vibe: 'Вайб',
  flex: 'Флекс',
  full_gas: 'Полный газ',
};

const CATEGORY_COLORS: Record<string, string> = {
  bratski: 'blue',
  vibe: 'green',
  flex: 'orange',
  full_gas: 'red',
};

export default function RoomsPage() {
  const { selectedBranchId } = useBranchStore();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const load = async () => {
    if (!selectedBranchId) return;
    setLoading(true);
    try {
      const { data } = await getRooms(selectedBranchId);
      setRooms(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedBranchId]);

  const openEdit = (room: any) => {
    setEditing(room);
    form.setFieldsValue(room);
    setShowModal(true);
  };

  const onFinish = async (values: any) => {
    try {
      if (editing) {
        await updateRoom(editing.id, values);
        message.success('Зал обновлён');
      } else {
        await createRoom({ ...values, branchId: selectedBranchId });
        message.success('Зал создан');
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Ошибка');
    }
  };

  const columns = [
    { title: '№', dataIndex: 'number', key: 'number', width: 60 },
    { title: 'Название', dataIndex: 'name', key: 'name' },
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
      render: (c: string) => <Tag color={CATEGORY_COLORS[c]}>{CATEGORY_LABELS[c]}</Tag>,
    },
    { title: 'Площадь, м²', dataIndex: 'areaSqm', key: 'areaSqm' },
    {
      title: 'Вместимость',
      key: 'capacity',
      render: (_: any, r: any) => `${r.capacityStandard}–${r.capacityMax}`,
    },
    {
      title: 'Бар',
      dataIndex: 'hasBar',
      key: 'hasBar',
      render: (v: boolean) => v ? <Tag color="green">Да</Tag> : <Tag>Нет</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_: any, r: any) => <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(r)} />,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Залы</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setShowModal(true); }}>
          Добавить
        </Button>
      </div>

      <Table columns={columns} dataSource={rooms} rowKey="id" loading={loading} pagination={false} />

      <Modal
        title={editing ? 'Редактировать зал' : 'Новый зал'}
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="name" label="Название" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="number" label="Номер" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="category" label="Категория" rules={[{ required: true }]}>
              <Select options={Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            </Form.Item>
            <Form.Item name="areaSqm" label="Площадь, м²" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="capacityStandard" label="Стандарт. вместимость" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="capacityMax" label="Макс. вместимость" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

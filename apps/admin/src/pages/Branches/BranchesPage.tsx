import { useEffect, useState } from 'react';
import { Typography, Table, Button, Modal, Form, Input, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { getBranches, createBranch, updateBranch, getRooms } from '../../api/client';

const { Title } = Typography;

export default function BranchesPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [roomCounts, setRoomCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [branchRes, roomsRes] = await Promise.all([getBranches(), getRooms()]);
      setBranches(branchRes.data);
      const counts: Record<number, number> = {};
      for (const r of roomsRes.data) {
        counts[r.branchId] = (counts[r.branchId] || 0) + 1;
      }
      setRoomCounts(counts);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (branch: any) => {
    setEditing(branch);
    form.setFieldsValue(branch);
    setShowModal(true);
  };

  const onFinish = async (values: any) => {
    try {
      if (editing) {
        await updateBranch(editing.id, values);
        message.success('Филиал обновлён');
      } else {
        if (!values.workingHours) {
          values.workingHours = {
            monday: { open: '14:00', close: '06:00', is24h: false },
            tuesday: { open: '14:00', close: '06:00', is24h: false },
            wednesday: { open: '14:00', close: '06:00', is24h: false },
            thursday: { open: '14:00', close: '06:00', is24h: false },
            friday: { open: '00:00', close: '23:59', is24h: true },
            saturday: { open: '00:00', close: '23:59', is24h: true },
            sunday: { open: '00:00', close: '23:59', is24h: true },
          };
        }
        await createBranch(values);
        message.success('Филиал создан');
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Ошибка');
    }
  };

  const columns = [
    { title: 'Название', dataIndex: 'name', key: 'name' },
    { title: 'Адрес', dataIndex: 'address', key: 'address' },
    { title: 'Метро', dataIndex: 'metro', key: 'metro' },
    { title: 'Телефон', dataIndex: 'phone', key: 'phone' },
    {
      title: 'График',
      dataIndex: 'scheduleLabel',
      key: 'schedule',
      width: 280,
      render: (s: string) => <span style={{ fontSize: 12 }}>{s || '—'}</span>,
    },
    {
      title: 'Залов',
      key: 'rooms',
      width: 70,
      render: (_: any, r: any) => roomCounts[r.id] || 0,
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_: any, r: any) => <Tag color={r.isActive ? 'green' : 'red'}>{r.isActive ? 'Активен' : 'Неактивен'}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_: any, r: any) => (
        <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(r)} />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Филиалы</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setShowModal(true); }}>
          Добавить
        </Button>
      </div>

      <Table columns={columns} dataSource={branches} rowKey="id" loading={loading} pagination={false} />

      <Modal
        title={editing ? 'Редактировать филиал' : 'Новый филиал'}
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Адрес" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="metro" label="Метро" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Телефон" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

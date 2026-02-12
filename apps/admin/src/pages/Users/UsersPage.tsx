import { useEffect, useState } from 'react';
import { Typography, Table, Button, Modal, Form, Input, Select, Tag, message, Switch } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { getUsers, createUser, updateUser, getBranches } from '../../api/client';

const { Title } = Typography;

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  rop: 'РОП',
  senior_manager: 'Старший менеджер',
  shift_manager: 'Менеджер смены',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'red',
  rop: 'orange',
  senior_manager: 'blue',
  shift_manager: 'green',
};

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [usersRes, branchesRes] = await Promise.all([getUsers(), getBranches()]);
      setUsers(usersRes.data);
      setBranches(branchesRes.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (user: any) => {
    setEditing(user);
    form.setFieldsValue({ ...user, password: undefined });
    setShowModal(true);
  };

  const onFinish = async (values: any) => {
    try {
      if (editing) {
        const updateData: any = { ...values };
        if (!updateData.password) delete updateData.password;
        await updateUser(editing.id, updateData);
        message.success('Пользователь обновлён');
      } else {
        await createUser(values);
        message.success('Пользователь создан');
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Ошибка');
    }
  };

  const columns = [
    { title: 'Имя', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      render: (r: string) => <Tag color={ROLE_COLORS[r]}>{ROLE_LABELS[r]}</Tag>,
    },
    {
      title: 'Филиал',
      dataIndex: 'branchId',
      key: 'branchId',
      render: (id: number) => {
        const branch = branches.find((b: any) => b.id === id);
        return branch?.name || '—';
      },
    },
    {
      title: 'Активен',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Да' : 'Нет'}</Tag>,
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
        <Title level={3} style={{ margin: 0 }}>Пользователи</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setShowModal(true); }}>
          Добавить
        </Button>
      </div>

      <Table columns={columns} dataSource={users} rowKey="id" loading={loading} pagination={false} />

      <Modal
        title={editing ? 'Редактировать пользователя' : 'Новый пользователь'}
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label="Имя" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label="Пароль"
            rules={editing ? [] : [{ required: true, min: 8 }]}
          >
            <Input.Password placeholder={editing ? 'Оставьте пустым, чтобы не менять' : ''} />
          </Form.Item>
          <Form.Item name="role" label="Роль" rules={[{ required: true }]}>
            <Select options={Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          </Form.Item>
          <Form.Item name="branchId" label="Филиал">
            <Select
              allowClear
              placeholder="Все филиалы"
              options={branches.map((b: any) => ({ value: b.id, label: b.name }))}
            />
          </Form.Item>
          {editing && (
            <Form.Item name="isActive" label="Активен" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}

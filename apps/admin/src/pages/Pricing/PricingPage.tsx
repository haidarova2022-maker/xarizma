import { useEffect, useState } from 'react';
import { Typography, Table, Button, Modal, Form, InputNumber, Select, message, Tag } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { getPricing, updatePriceRule } from '../../api/client';

const { Title } = Typography;

const CATEGORY_LABELS: Record<string, string> = {
  bratski: 'По-братски',
  vibe: 'Вайб',
  flex: 'Флекс',
  full_gas: 'Полный газ',
};

const DAY_TYPE_LABELS: Record<string, string> = {
  weekday_day: 'Пн-Чт (день)',
  weekday_evening: 'Пн-Чт (вечер)',
  friday_day: 'Пт (день)',
  friday_evening: 'Пт (вечер)',
  saturday: 'Суббота',
  sunday: 'Воскресенье',
};

export default function PricingPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getPricing();
      setRules(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (rule: any) => {
    setEditing(rule);
    form.setFieldsValue(rule);
    setShowModal(true);
  };

  const onFinish = async (values: any) => {
    try {
      await updatePriceRule(editing.id, { pricePerHour: values.pricePerHour });
      message.success('Цена обновлена');
      setShowModal(false);
      load();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Ошибка');
    }
  };

  // Group by category for matrix view
  const categories = ['bratski', 'vibe', 'flex', 'full_gas'];
  const dayTypes = ['weekday_day', 'weekday_evening', 'friday_day', 'friday_evening', 'saturday', 'sunday'];

  const getPrice = (cat: string, dt: string) => {
    const rule = rules.find((r: any) => r.category === cat && r.dayType === dt);
    return rule?.pricePerHour || 0;
  };

  const getRule = (cat: string, dt: string) => {
    return rules.find((r: any) => r.category === cat && r.dayType === dt);
  };

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>Ценовая матрица</Title>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8 }}>
          <thead>
            <tr>
              <th style={{ padding: '12px 16px', borderBottom: '2px solid #e8e8e8', textAlign: 'left' }}>Категория</th>
              {dayTypes.map(dt => (
                <th key={dt} style={{ padding: '12px 16px', borderBottom: '2px solid #e8e8e8', textAlign: 'center' }}>
                  {DAY_TYPE_LABELS[dt]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat}>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontWeight: 600 }}>
                  <Tag color={cat === 'bratski' ? 'blue' : cat === 'vibe' ? 'green' : cat === 'flex' ? 'orange' : 'red'}>
                    {CATEGORY_LABELS[cat]}
                  </Tag>
                </td>
                {dayTypes.map(dt => {
                  const price = getPrice(cat, dt);
                  const rule = getRule(cat, dt);
                  return (
                    <td
                      key={dt}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f0f0f0',
                        textAlign: 'center',
                        cursor: 'pointer',
                      }}
                      onClick={() => rule && openEdit(rule)}
                    >
                      <span style={{ fontWeight: 500 }}>
                        {new Intl.NumberFormat('ru-RU').format(price)} ₽
                      </span>
                      {rule && <EditOutlined style={{ marginLeft: 8, color: '#999', fontSize: 12 }} />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        title="Редактировать цену"
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item label="Категория">
            <Tag>{editing && CATEGORY_LABELS[editing.category]}</Tag>
          </Form.Item>
          <Form.Item label="Период">
            <Tag>{editing && DAY_TYPE_LABELS[editing.dayType]}</Tag>
          </Form.Item>
          <Form.Item name="pricePerHour" label="Цена за час (₽)" rules={[{ required: true }]}>
            <InputNumber min={0} step={100} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Typography, Table, Button, Modal, Form, InputNumber, Select, message, Tag, Card, Row, Col, Divider } from 'antd';
import { EditOutlined, ClockCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { getPricing, updatePriceRule, getSlotConfig, updateSlotConfig } from '../../api/client';

const { Title, Text } = Typography;

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

interface SlotConfig {
  startHour: number;
  slotDuration: number;
  gapHours: number;
}

function generatePreview(cfg: SlotConfig): string[] {
  const result: string[] = [];
  const step = cfg.slotDuration + cfg.gapHours;
  for (let i = 0; i < 8; i++) {
    const from = cfg.startHour + i * step;
    const to = from + cfg.slotDuration;
    if (from >= 33) break; // 9+24 upper limit
    const fH = from % 24;
    const tH = to % 24;
    result.push(`${String(fH).padStart(2, '0')}:00 – ${String(tH).padStart(2, '0')}:00`);
  }
  return result;
}

export default function PricingPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const [slotCfg, setSlotCfg] = useState<SlotConfig>({ startHour: 9, slotDuration: 3, gapHours: 1 });
  const [slotSaving, setSlotSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [priceRes, cfgRes] = await Promise.all([getPricing(), getSlotConfig()]);
      setRules(priceRes.data);
      setSlotCfg(cfgRes.data);
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

  const saveSlotConfig = async () => {
    setSlotSaving(true);
    try {
      await updateSlotConfig(slotCfg);
      message.success('Настройки слотов сохранены');
    } catch {
      message.error('Ошибка сохранения');
    } finally {
      setSlotSaving(false);
    }
  };

  const categories = ['bratski', 'vibe', 'flex', 'full_gas'];
  const dayTypes = ['weekday_day', 'weekday_evening', 'friday_day', 'friday_evening', 'saturday', 'sunday'];

  const getPrice = (cat: string, dt: string) => {
    const rule = rules.find((r: any) => r.category === cat && r.dayType === dt);
    return rule?.pricePerHour || 0;
  };

  const getRule = (cat: string, dt: string) => {
    return rules.find((r: any) => r.category === cat && r.dayType === dt);
  };

  const preview = generatePreview(slotCfg);

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>Цены и слоты</Title>

      {/* Slot config */}
      <Card
        title={<><SettingOutlined /> Настройки слотов</>}
        style={{ marginBottom: 24 }}
        extra={<Button type="primary" size="small" loading={slotSaving} onClick={saveSlotConfig}>Сохранить</Button>}
      >
        <Row gutter={24}>
          <Col xs={24} sm={8}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>Начало слотов</Text>
            </div>
            <InputNumber
              min={0}
              max={23}
              value={slotCfg.startHour}
              onChange={v => v !== null && setSlotCfg(c => ({ ...c, startHour: v }))}
              style={{ width: '100%' }}
              addonAfter=":00"
              formatter={v => String(v).padStart(2, '0')}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>Час начала первого слота</Text>
          </Col>
          <Col xs={24} sm={8}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>Длительность слота</Text>
            </div>
            <InputNumber
              min={1}
              max={8}
              value={slotCfg.slotDuration}
              onChange={v => v !== null && setSlotCfg(c => ({ ...c, slotDuration: v }))}
              style={{ width: '100%' }}
              addonAfter="ч"
            />
            <Text type="secondary" style={{ fontSize: 12 }}>Часов в одном слоте</Text>
          </Col>
          <Col xs={24} sm={8}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>Пересменка</Text>
            </div>
            <InputNumber
              min={0}
              max={3}
              step={0.5}
              value={slotCfg.gapHours}
              onChange={v => v !== null && setSlotCfg(c => ({ ...c, gapHours: v }))}
              style={{ width: '100%' }}
              addonAfter="ч"
            />
            <Text type="secondary" style={{ fontSize: 12 }}>Зазор между слотами</Text>
          </Col>
        </Row>

        <Divider style={{ margin: '16px 0' }} />

        <div>
          <Text strong style={{ marginBottom: 8, display: 'block' }}>
            <ClockCircleOutlined /> Предпросмотр слотов:
          </Text>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {preview.map((s, i) => (
              <Tag key={i} color="purple" style={{ fontSize: 13, padding: '4px 12px' }}>{s}</Tag>
            ))}
          </div>
          {slotCfg.gapHours > 0 && (
            <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
              Между слотами {slotCfg.gapHours} ч на пересменку
            </Text>
          )}
        </div>
      </Card>

      {/* Price matrix */}
      <Card title="Ценовая матрица">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                      <td key={dt} style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', textAlign: 'center', cursor: 'pointer' }}
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
      </Card>

      <Modal title="Редактировать цену" open={showModal} onCancel={() => setShowModal(false)} onOk={() => form.submit()}>
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

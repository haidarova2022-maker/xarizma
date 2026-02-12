import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Typography } from 'antd';
import {
  CalendarOutlined,
  TeamOutlined,
  DollarOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useBranchStore } from '../../stores/branch-store';
import { getBookings } from '../../api/client';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function DashboardPage() {
  const { selectedBranchId, branches } = useBranchStore();
  const [stats, setStats] = useState({ today: 0, upcoming: 0, revenue: 0, guests: 0 });

  useEffect(() => {
    if (!selectedBranchId) return;

    const today = dayjs().startOf('day').toISOString();
    const tomorrow = dayjs().endOf('day').toISOString();

    getBookings({ branchId: selectedBranchId, dateFrom: today, dateTo: tomorrow })
      .then(({ data }) => {
        const active = data.filter((b: any) => b.status !== 'cancelled');
        setStats({
          today: active.length,
          upcoming: active.filter((b: any) => new Date(b.startTime) > new Date()).length,
          revenue: active.reduce((s: number, b: any) => s + b.totalPrice, 0),
          guests: active.reduce((s: number, b: any) => s + b.guestCount, 0),
        });
      })
      .catch(() => {});
  }, [selectedBranchId]);

  const branch = branches.find((b: any) => b.id === selectedBranchId);

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>
        Дашборд {branch ? `— ${branch.name}` : ''}
      </Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Бронирований сегодня"
              value={stats.today}
              prefix={<CalendarOutlined style={{ color: '#6C5CE7' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Предстоящие"
              value={stats.upcoming}
              prefix={<ClockCircleOutlined style={{ color: '#00B894' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Выручка сегодня"
              value={stats.revenue}
              prefix={<DollarOutlined style={{ color: '#FDCB6E' }} />}
              suffix="₽"
              formatter={(v) => new Intl.NumberFormat('ru-RU').format(v as number)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Гостей сегодня"
              value={stats.guests}
              prefix={<TeamOutlined style={{ color: '#A29BFE' }} />}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

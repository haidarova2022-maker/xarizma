import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Select, Avatar, Dropdown, Typography } from 'antd';
import {
  DashboardOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  BankOutlined,
  HomeOutlined,
  DollarOutlined,
  UserOutlined,
  LogoutOutlined,
  TagOutlined,
  GiftOutlined,
  ClockCircleOutlined,
  BellOutlined,
  WarningOutlined,
  BarChartOutlined,
  FundOutlined,
  TeamOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/auth-store';
import { useBranchStore } from '../../stores/branch-store';

const { Sider, Content, Header } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'Дашборд' },
  { key: '/calendar', icon: <CalendarOutlined />, label: 'Календарь (слоты)' },
  { key: '/calendar-simple', icon: <CalendarOutlined />, label: 'Календарь (простой)' },
  { key: '/bookings', icon: <UnorderedListOutlined />, label: 'Бронирования' },
  { key: '/empty-slots', icon: <WarningOutlined />, label: 'Пустые окна' },
  { key: '/waitlist', icon: <ClockCircleOutlined />, label: 'Лист ожидания' },
  { key: '/branches', icon: <BankOutlined />, label: 'Филиалы' },
  { key: '/rooms', icon: <HomeOutlined />, label: 'Залы' },
  { key: '/pricing', icon: <DollarOutlined />, label: 'Цены' },
  { key: '/packages', icon: <GiftOutlined />, label: 'Пакеты' },
  { key: '/promo-codes', icon: <TagOutlined />, label: 'Промокоды и акции' },
  {
    key: 'analytics',
    icon: <BarChartOutlined />,
    label: 'Аналитика',
    children: [
      { key: '/analytics/sources', icon: <FundOutlined />, label: 'По источникам' },
      { key: '/analytics/managers', icon: <TeamOutlined />, label: 'По менеджерам' },
      { key: '/analytics/rooms', icon: <HomeOutlined />, label: 'По залам' },
      { key: '/analytics/cancellations', icon: <CloseCircleOutlined />, label: 'Отмены' },
    ],
  },
  { key: '/notifications', icon: <BellOutlined />, label: 'Уведомления' },
  { key: '/users', icon: <UserOutlined />, label: 'Пользователи' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { branches, selectedBranchId, fetchBranches, selectBranch } = useBranchStore();

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const userMenu = {
    items: [
      { key: 'logout', icon: <LogoutOutlined />, label: 'Выйти', onClick: () => { logout(); navigate('/login'); } },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        style={{ borderRight: '1px solid #f0f0f0' }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <Text strong style={{ fontSize: collapsed ? 16 : 20, color: '#E36FA8' }}>
            {collapsed ? 'X' : 'Харизма'}
          </Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={location.pathname.startsWith('/analytics') ? ['analytics'] : []}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <Select
            value={selectedBranchId}
            onChange={selectBranch}
            style={{ width: 240 }}
            placeholder="Выберите филиал"
            options={branches.map((b: any) => ({ value: b.id, label: b.name }))}
          />
          <Dropdown menu={userMenu} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#E36FA8' }} />
              <Text>{user?.name}</Text>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, minHeight: 280 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

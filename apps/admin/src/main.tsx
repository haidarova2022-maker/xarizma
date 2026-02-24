import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import App from './App';
import './index.css';

dayjs.locale('ru');

async function bootstrap() {
  if (import.meta.env.VITE_MOCK_API === 'true') {
    await import('./mock');
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ConfigProvider
        locale={ruRU}
        theme={{
          token: {
            colorPrimary: '#E36FA8',
            borderRadius: 8,
          },
          algorithm: theme.defaultAlgorithm,
        }}
      >
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConfigProvider>
    </React.StrictMode>,
  );
}

bootstrap();

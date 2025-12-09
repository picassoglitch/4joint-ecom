import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => ({
  messages: (await import(`./messages/es-MX.json`)).default
}));


import 'dotenv/config';
import { createApp } from './app.ts';

const app = createApp({ normalizeApiPrefix: true });

export default app;

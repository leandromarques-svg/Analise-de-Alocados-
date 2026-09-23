import 'dotenv/config';
import { createApp } from '../src/server/app.ts';

const app = createApp({ normalizeApiPrefix: true });

export default app;

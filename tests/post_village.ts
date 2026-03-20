import request from 'supertest';
import { createApp } from '../server/app';
import { registerRoutes } from '../server/routes';
import { truncateAll, seedAdmin, closeCleanupPool } from './helpers/cleanup';
import { Pool } from 'pg';

async function run() {
  await truncateAll();
  await seedAdmin();
  const created = createApp();
  const app = created.app;
  await registerRoutes(app);

  const adminAgent = request.agent(app);
  const adminLogin = await adminAgent
      .post('/api/auth/login')
      .send({ userId: process.env.TEST_ADMIN_USER, password: process.env.TEST_ADMIN_PASSWORD });
      
  const adminCsrf = adminLogin.body.csrfToken;
  console.log("Logged in:", adminLogin.status);

  const vRes = await adminAgent
      .post('/api/villages')
      .set('x-csrf-token', adminCsrf)
      .send({ villageName: 'VDel Village', managerName: 'VDel Mgr', paymentsEnabled: true, managerPhone: '8888888888' });
      
  console.log("Village creation status:", vRes.status);
  console.log("Village creation body:", vRes.body);

  await closeCleanupPool();
}

run().catch(console.error);

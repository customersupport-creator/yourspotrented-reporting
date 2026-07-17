import 'dotenv/config';
import { createApp } from './app.js';
import { startWeeklyEmailJob } from './jobs/weeklyEmailJob.js';

const PORT = Number(process.env.PORT || 4000);
const app = createApp();

startWeeklyEmailJob();

app.listen(PORT, () => {
  console.log(`[server] YourSpotRented reporting API listening on http://localhost:${PORT}`);
  console.log(`[server] Persistence: ${process.env.PERSIST === 'true' ? 'enabled' : 'disabled (stateless v1)'}`);
});

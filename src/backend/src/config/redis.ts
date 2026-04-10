import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => {
  console.error('❌ Erro Redis:', err.message);
});

redisClient.on('connect', () => {
  console.log('✅ Redis conectado com sucesso');
});

// Redis é obrigatório — lockout, sessões e TOTP dependem dele.
// Falha no arranque = processo termina (fail-fast).
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('❌ Falha crítica ao conectar ao Redis — o servidor não pode arrancar:', err);
    process.exit(1);
  }
})();

export { redisClient };

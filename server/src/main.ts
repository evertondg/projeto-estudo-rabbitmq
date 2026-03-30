import express from 'express';
import cors from 'cors';
import { PostgresVendaRepository } from './infra/database/PostgresVendaRepository';
import { ProcessarVenda } from './core/use-cases/ProcessarVenda';
import { startConsumer } from './infra/messaging/RabbitMQConsumer';
import amqp from 'amqplib';

const app = express();
app.use(cors());
app.use(express.json());

const vendaRepository = new PostgresVendaRepository();
const processarVendaUseCase = new ProcessarVenda(vendaRepository);

app.post('/venda', async (req, res) => {
  try {
    const conn = await amqp.connect('amqp://admin:admin@localhost:5672');
    const channel = await conn.createChannel();

    channel.publish(
      'venda_realizada_exchange',
      '',
      Buffer.from(JSON.stringify(req.body))
    );

    res.status(202).json({ message: "Venda enviada para processamento assíncrono" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao comunicar com o Broker" });
  }
});

async function bootstrap() {
  console.log("🛠️  Iniciando Consumidores...");
  await startConsumer();

  const PORT = 3001;
  app.listen(PORT, () => {
    console.log(`🚀 API Gateway rodando em http://localhost:${PORT}`);
    console.log("✅ Sistema de Leilão pronto para receber lances!");
  });
}

bootstrap().catch(console.error);
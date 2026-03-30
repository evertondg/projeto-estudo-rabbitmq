import amqp from 'amqplib';
import { ProcessarVenda } from '../../core/use-cases/ProcessarVenda.js';
import { PostgresVendaRepository } from '../database/PostgresVendaRepository.js';

export async function startConsumer() {
  const conn = await amqp.connect('amqp://admin:admin@localhost:5672');
  const channel = await conn.createChannel();

  const repository = new PostgresVendaRepository();
  const useCase = new ProcessarVenda(repository);

  await channel.assertQueue('fila_estoque_vendas', { durable: true });

  channel.consume('fila_estoque_vendas', async (msg) => {
    if (msg) {
      const dados = JSON.parse(msg.content.toString());
      try {
        await useCase.executar(dados);
        channel.ack(msg);
        console.log("✅ [Clean Arch] Venda processada via Use Case!");
      } catch (err) {
        console.error("❌ Erro no Use Case:", err);
      }
    }
  });
}
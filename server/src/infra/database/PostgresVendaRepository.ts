import { Pool } from 'pg';
import type { Venda } from '../../core/entities/Venda.js';
import type { IVendaRepository } from '../../core/use-cases/ProcessarVenda.js';

export class PostgresVendaRepository implements IVendaRepository {
  private pool = new Pool({
    connectionString: 'postgresql://admin:admin@localhost:5432/sistema_leilao'
  });

  async salvar(venda: Venda): Promise<void> {
    const query = 'INSERT INTO vendas (item, valor, payload) VALUES ($1, $2, $3)';
    await this.pool.query(query, [venda.item, venda.valor, JSON.stringify(venda)]);
  }
}
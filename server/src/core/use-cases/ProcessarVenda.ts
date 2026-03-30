import type { Venda } from '../entities/Venda.js';

export interface IVendaRepository {
  salvar(venda: Venda): Promise<void>;
}

export class ProcessarVenda {
  constructor(private vendaRepository: IVendaRepository) {}

  async executar(dados: Venda): Promise<void> {
    console.log(`[UC] Validando venda #${dados.id}...`);
    
    if (dados.valor <= 0) throw new Error("Valor inválido");

    await this.vendaRepository.salvar(dados);
  }
}
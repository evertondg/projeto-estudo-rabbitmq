# Sistema de Vendas com RabbitMQ

Projeto de estudo que demonstra uma arquitetura orientada a mensagens (event-driven) usando RabbitMQ como broker, Node.js/Express no backend e React no frontend. O sistema simula o fluxo de uma venda: o frontend registra um pedido, o backend o publica em uma fila e um consumidor processa a mensagem de forma assíncrona, persistindo os dados no PostgreSQL.

---

## Arquitetura

```
┌─────────────────────────────────────────┐
│         Frontend (React)                │
│   Formulário de venda (item + valor)    │
└──────────────┬──────────────────────────┘
               │ HTTP POST /venda
               ▼
┌─────────────────────────────────────────┐
│        Express Server (porta 3001)      │
│   Recebe o pedido e publica na fila     │
└──────────────┬──────────────────────────┘
               │ AMQP publish
               ▼
┌─────────────────────────────────────────┐
│             RabbitMQ                    │
│  Exchange: venda_realizada_exchange     │
│  Queue:    fila_estoque_vendas          │
└──────────────┬──────────────────────────┘
               │ consume (async)
               ▼
┌─────────────────────────────────────────┐
│        RabbitMQConsumer                 │
│   Chama o Use Case ProcessarVenda       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│        ProcessarVenda (Use Case)        │
│   Valida e delega ao repositório        │
└──────────────┬──────────────────────────┘
               │ INSERT SQL
               ▼
┌─────────────────────────────────────────┐
│        PostgreSQL                       │
│   Tabela: vendas                        │
└─────────────────────────────────────────┘
```

O servidor Express age como **produtor** (publica mensagens) e o `RabbitMQConsumer` age como **consumidor** (lê mensagens), ambos rodando no mesmo processo. O ponto central é que a rota `/venda` retorna imediatamente com `202 Accepted` — o processamento real acontece de forma assíncrona no consumidor.

---

## Estrutura do Projeto

```
projeto-rabbitmq/
├── docker-compose.yml          # RabbitMQ + PostgreSQL
├── .env                        # Credenciais dos serviços
├── server/
│   └── src/
│       ├── main.ts                              # Entry point: Express + bootstrap
│       ├── core/
│       │   ├── entities/
│       │   │   └── Venda.ts                     # Interface da entidade de domínio
│       │   └── use-cases/
│       │       └── ProcessarVenda.ts            # Use Case + interface IVendaRepository
│       └── infra/
│           ├── database/
│           │   └── PostgresVendaRepository.ts   # Implementação do repositório (pg)
│           └── messaging/
│               └── RabbitMQConsumer.ts          # Consumidor da fila RabbitMQ
└── frontend/
    └── src/
        ├── App.tsx             # Formulário de venda
        └── index.tsx           # Entry point React
```

### Camadas (Clean Architecture)

| Camada | Arquivos | Responsabilidade |
|--------|----------|-----------------|
| **Domínio** | `Venda.ts`, `ProcessarVenda.ts` | Entidades e regras de negócio |
| **Infraestrutura** | `PostgresVendaRepository.ts`, `RabbitMQConsumer.ts` | Banco de dados e mensageria |
| **Aplicação** | `main.ts` | Composição das dependências e servidor HTTP |
| **Apresentação** | `App.tsx` | Interface do usuário |

---

## Fluxo Detalhado

1. Usuário preenche o formulário no React (item e valor) e clica em **Finalizar Compra**.
2. O frontend faz `POST /venda` com `{ id, item, valor }`.
3. O Express conecta ao RabbitMQ e publica a mensagem no exchange `venda_realizada_exchange`.
4. O servidor responde `202 Accepted` imediatamente — sem esperar o processamento.
5. O `RabbitMQConsumer` (já em execução em background) recebe a mensagem da fila `fila_estoque_vendas`.
6. O consumidor desserializa o JSON e chama `ProcessarVenda.executar(dados)`.
7. O Use Case valida que `valor > 0` e chama `PostgresVendaRepository.salvar(venda)`.
8. O repositório executa `INSERT INTO vendas (item, valor, payload)` no PostgreSQL.
9. O consumidor faz `channel.ack(msg)` confirmando o processamento bem-sucedido.

---

## Mensageria: Exchange e Queue

| Configuração | Valor |
|-------------|-------|
| Exchange | `venda_realizada_exchange` |
| Queue | `fila_estoque_vendas` |
| Durable | `true` (fila sobrevive a restart do broker) |
| Routing Key | `""` (vazia — fanout-like publish) |
| Formato | JSON |

A durabilidade garante que mensagens na fila não sejam perdidas caso o RabbitMQ reinicie antes do consumidor processá-las.

---

## Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Backend | Node.js + TypeScript | TS 6.0 |
| HTTP Server | Express | 5.2 |
| Message Broker | RabbitMQ | 3-management |
| AMQP Client | amqplib | 1.0 |
| Banco de Dados | PostgreSQL | latest |
| DB Driver | pg | 8.20 |
| Frontend | React + TypeScript | React 19 / TS 4.9 |
| Infraestrutura | Docker Compose | — |

---

## Pré-requisitos

- [Docker](https://www.docker.com/) e Docker Compose
- [Node.js](https://nodejs.org/) 18+

---

## Como executar

### 1. Subir a infraestrutura

```bash
docker-compose up -d
```

Isso inicia:
- **RabbitMQ** em `localhost:5672` (AMQP) e `localhost:15672` (Management UI)
- **PostgreSQL** em `localhost:5432`, banco `sistema_leilao`

### 2. Criar a tabela no banco

Conecte no PostgreSQL e execute:

```sql
CREATE TABLE vendas (
  id        SERIAL PRIMARY KEY,
  item      VARCHAR      NOT NULL,
  valor     NUMERIC      NOT NULL,
  payload   JSONB,
  criado_em TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Iniciar o backend

```bash
cd server
npm install
npm run dev
```

O servidor sobe em `http://localhost:3001` e o consumidor começa a ouvir a fila.

### 4. Iniciar o frontend

```bash
cd frontend
npm install
npm start
```

O React abre em `http://localhost:3000`.

### 5. Testar manualmente via curl

```bash
curl -X POST http://localhost:3001/venda \
  -H "Content-Type: application/json" \
  -d '{"id": 1, "item": "Guitarra", "valor": 1500}'
```

---

## Variáveis de Ambiente

O arquivo `.env` na raiz configura os serviços Docker:

```env
RABBITMQ_USER=admin
RABBITMQ_PASS=admin
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin
POSTGRES_DB=sistema_leilao
```

> As strings de conexão no código do servidor ainda estão hardcoded — os valores do `.env` são usados apenas pelo Docker Compose.

---

## API

### `POST /venda`

Publica uma venda na fila de processamento.

**Request body:**
```json
{
  "id": 42,
  "item": "Teclado Mecânico",
  "valor": 350.00
}
```

**Response `202 Accepted`:**
```json
{
  "message": "Venda enviada para processamento assíncrono"
}
```

**Response `500`:**
```json
{
  "error": "Erro ao comunicar com o Broker"
}
```

---

## Management UI do RabbitMQ

Acesse `http://localhost:15672` com as credenciais `admin / admin` para visualizar:
- Filas e mensagens pendentes
- Exchange e bindings
- Taxa de publicação e consumo em tempo real

---

## Padrões Utilizados

- **Clean Architecture** — separação entre domínio, casos de uso e infraestrutura
- **Repository Pattern** — `IVendaRepository` abstrai o acesso ao banco; o Use Case não conhece o PostgreSQL
- **Dependency Injection** — repositório injetado no construtor de `ProcessarVenda`
- **Publisher/Subscriber** — Express publica, consumidor assina; desacoplados via broker
- **Use Case** — lógica de negócio isolada em `ProcessarVenda.executar()`

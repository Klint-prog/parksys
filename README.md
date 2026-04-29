# 🚗 Park System — Sistema de Gestão de Estacionamento

Sistema completo de administração de estacionamento com frontend React moderno, backend Node.js e banco de dados PostgreSQL, totalmente containerizado com Docker Compose.

---

## 🏗️ Arquitetura

```
parking-system/
├── docker-compose.yml          # Orquestração dos containers
├── db/
│   └── init.sql               # Schema + seed data PostgreSQL
├── backend/                   # API Node.js + Express
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js           # Entry point
│       ├── db/index.js        # Pool de conexão PostgreSQL
│       ├── middleware/
│       │   ├── auth.js        # JWT authentication
│       │   └── logger.js      # Winston logger
│       └── routes/
│           ├── auth.js        # Login / Logout / Me
│           ├── dashboard.js   # KPIs e mapa de ocupação
│           ├── sessions.js    # Entradas e saídas
│           ├── spots.js       # Vagas
│           ├── payments.js    # Pagamentos + recibo PDF
│           ├── reports.js     # Relatórios + exportação PDF
│           ├── vehicles.js    # Cadastro de veículos
│           ├── users.js       # Gestão de usuários
│           ├── plans.js       # Planos de cobrança
│           └── cardMachine.js # API de maquininha de cartão
└── frontend/                  # React + Vite
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── DashboardPage.jsx
        │   ├── SessionsPage.jsx
        │   ├── SpotsPage.jsx
        │   ├── VehiclesPage.jsx
        │   ├── ReportsPage.jsx
        │   └── AdminPage.jsx
        ├── components/
        │   └── Layout.jsx
        ├── hooks/
        │   └── useAuth.jsx
        └── utils/
            └── api.js
```

---

## 🚀 Como Rodar

### Pré-requisitos
- [Docker](https://docs.docker.com/get-docker/) 24+
- [Docker Compose](https://docs.docker.com/compose/) v2+

### 1. Clonar e subir tudo com um comando

```bash
git clone <repo>
cd parking-system
docker compose up --build
```

> Na primeira vez, aguarde ~60s para o banco inicializar e o backend conectar.

### 2. Acessar o sistema

| Serviço    | URL                      |
|------------|--------------------------|
| Frontend   | http://localhost:3000    |
| Backend API| http://localhost:3001    |
| PostgreSQL | localhost:5432           |

### 3. Credenciais de acesso

| Usuário       | Email                          | Senha       | Perfil      |
|---------------|--------------------------------|-------------|-------------|
| Administrador | admin@parkingsystem.com        | Admin@2024  | admin       |
| Operador      | joao@parkingsystem.com         | Oper@2024   | operator    |
| Visualizador  | ana@parkingsystem.com          | View@2024   | viewer      |

---

## 📋 Funcionalidades

### Tela de Login
- Autenticação com JWT (válido por 8h)
- Controle de perfis: admin, operator, viewer

### Dashboard
- KPIs em tempo real: vagas, sessões ativas, receita diária/mensal
- Gráfico de receita por hora (hoje)
- Gráfico de receita semanal
- Distribuição de formas de pagamento (pizza)
- Lista de sessões ativas com tempo e valor estimado
- Auto-atualização a cada 30 segundos

### Entradas & Saídas
- Registrar entrada: placa, vaga, plano de cobrança
- Calcular tempo e valor automaticamente (com carência configurável)
- Modal de saída com:
  - Cálculo automático do valor
  - Desconto em %
  - Integração com maquininha de cartão (simulada)
  - Pagamento em dinheiro com cálculo de troco
  - Registro PIX / Mensalista
- Impressão automática do recibo PDF 80mm ao finalizar
- Busca por placa ou código de sessão

### Mapa de Vagas
- Visualização gráfica de todos os andares
- Cores por status: livre, ocupado, reservado, manutenção
- Ícones por tipo: padrão, deficiente, elétrico, VIP, reservado
- Clique em vaga ocupada para ver detalhes
- Auto-atualização a cada 15 segundos

### Veículos
- Cadastro com placa, marca, modelo, cor, tipo
- Dados do proprietário (nome, telefone, email)
- Histórico completo de visitas e gastos
- Busca por placa, nome ou telefone

### Relatórios
- Filtro por período (data inicial e final)
- Agrupamento diário ou mensal
- Gráfico de receita por período (barras)
- Distribuição por forma de pagamento (pizza)
- Tabela de sessões no período
- Relatório de ocupação por andar e por tipo de vaga
- **Exportação em PDF** com layout profissional

### Administração (admin only)
- CRUD de usuários (nome, email, senha, perfil)
- CRUD de planos de cobrança (valor/hora, máximo diário, mensalidade, carência)
- Informações de integração e arquitetura do sistema

---

## 💳 API de Maquininha de Cartão

### Endpoint de cobrança
```http
POST /api/card-machine/charge
Authorization: Bearer <token>

{
  "amount": 25.50,
  "payment_type": "credit",
  "installments": 1,
  "session_id": "uuid-da-sessao",
  "terminal_id": "TERM-001"
}
```

**Resposta (aprovado):**
```json
{
  "status": "approved",
  "transaction_id": "TXN1703123456789",
  "authorization_code": "849271",
  "card_brand": "Visa",
  "card_last_digits": "4832",
  "amount": 25.50,
  "nsu": "NSU1703123456789",
  "message": "Pagamento aprovado com sucesso"
}
```

### Integração com terminais reais
Para integrar com terminais físicos (Stone, Cielo, Rede, PagSeguro), substitua a lógica em `backend/src/routes/cardMachine.js` pela SDK do seu provedor:

```javascript
// Exemplo Stone
const { StoneSDK } = require('stone-sdk');
const terminal = new StoneSDK({ stoneCode: 'SEU_CODIGO' });
const result = await terminal.charge({ amount, type: payment_type });
```

---

## 🖨️ Impressão de Recibo

O recibo é gerado em PDF no formato bobina 80mm (226px) e aberto automaticamente no navegador após cada pagamento.

```http
GET /api/payments/:id/receipt
Authorization: Bearer <token>
```

Para impressão direta em impressora térmica, configure o navegador para imprimir sem margens, tamanho personalizado 80mm.

---

## 🗄️ Banco de Dados

### Tabelas principais
| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários do sistema |
| `parking_spots` | Vagas (90 vagas em 3 andares) |
| `vehicles` | Veículos cadastrados |
| `pricing_plans` | Planos de cobrança |
| `parking_sessions` | Sessões de entrada/saída |
| `payments` | Pagamentos realizados |
| `card_machine_transactions` | Transações de cartão |
| `monthly_plans` | Planos mensalistas |
| `audit_logs` | Log de auditoria |

### Acessar o banco
```bash
docker exec -it parking_db psql -U parking_user -d parking_system
```

### Backup
```bash
docker exec parking_db pg_dump -U parking_user parking_system > backup.sql
```

---

## 🔌 Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Usuário atual |
| GET | `/api/dashboard/summary` | Dados do dashboard |
| GET | `/api/dashboard/occupancy` | Mapa de ocupação |
| GET | `/api/sessions` | Listar sessões |
| POST | `/api/sessions/entry` | Registrar entrada |
| GET | `/api/sessions/:id/calculate` | Calcular valor |
| POST | `/api/sessions/:id/exit` | Registrar saída |
| POST | `/api/payments` | Registrar pagamento |
| GET | `/api/payments/:id/receipt` | Recibo PDF |
| GET | `/api/reports/revenue` | Relatório de receita |
| GET | `/api/reports/pdf` | Exportar PDF |
| GET | `/api/vehicles` | Listar veículos |
| POST | `/api/vehicles` | Cadastrar veículo |
| GET | `/api/users` | Listar usuários (admin) |
| POST | `/api/users` | Criar usuário (admin) |
| GET | `/api/plans` | Listar planos |
| POST | `/api/card-machine/charge` | Cobrar no cartão |

---

## ⚙️ Variáveis de Ambiente

### Backend (`docker-compose.yml`)
```env
NODE_ENV=production
PORT=3001
DB_HOST=db
DB_PORT=5432
DB_USER=parking_user
DB_PASSWORD=parking_secure_pass_2024
DB_NAME=parking_system
JWT_SECRET=super_secret_jwt_key_parking_2024
CORS_ORIGIN=http://localhost:3000
```

### Frontend (build arg)
```env
VITE_API_URL=http://localhost:3001
```

---

## 🛠️ Desenvolvimento Local (sem Docker)

```bash
# Backend
cd backend
npm install
cp .env.example .env   # configure o banco local
npm run dev            # porta 3001

# Frontend
cd frontend
npm install
npm run dev            # porta 3000
```

---

## 📦 Comandos úteis

```bash
# Subir em background
docker compose up -d --build

# Ver logs em tempo real
docker compose logs -f

# Reiniciar apenas o backend
docker compose restart backend

# Parar e remover tudo (mantém dados)
docker compose down

# Parar e APAGAR dados do banco
docker compose down -v

# Ver status dos containers
docker compose ps
```

---

## 🔐 Segurança

- Autenticação JWT com expiração de 8 horas
- Senhas com bcrypt (salt rounds: 12)
- Rate limiting: 500 req/15min por IP
- CORS configurado por origem
- Helmet.js para headers de segurança
- Controle de acesso por perfil (RBAC)
- Queries parametrizadas (prevenção de SQL injection)

---

## 📄 Licença

MIT — Sinta-se livre para usar e adaptar.

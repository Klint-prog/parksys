import React, { useState, useEffect } from 'react';
import { Users, Plus, Pencil, Trash2, X, Settings, CheckCircle, DollarSign, Shield } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const fmt = v => `R$ ${parseFloat(v||0).toFixed(2).replace('.',',')}`;
const ROLES = { admin:'Administrador', operator:'Operador', viewer:'Visualizador' };
const ROLE_COLORS = { admin:'badge-red', operator:'badge-blue', viewer:'badge-gray' };

function UserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState(user || { name:'', email:'', password:'', role:'operator' });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (user) await api.put(`/users/${user.id}`, form);
      else await api.post('/users', form);
      toast.success(user ? 'Usuário atualizado!' : 'Usuário criado!');
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Erro'); }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{fontSize:16}}>{user?'Editar Usuário':'Novo Usuário'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{padding:6}}><X size={16}/></button>
        </div>
        <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="form-group"><label className="form-label">Nome *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Nome completo"/></div>
          <div className="form-group"><label className="form-label">Email *</label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@exemplo.com"/></div>
          {!user && <div className="form-group"><label className="form-label">Senha *</label><input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Mínimo 6 caracteres"/></div>}
          <div className="form-group">
            <label className="form-label">Perfil *</label>
            <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
              <option value="operator">Operador</option>
              <option value="admin">Administrador</option>
              <option value="viewer">Visualizador</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading?<div className="loader" style={{width:14,height:14,borderWidth:2}}/>:<CheckCircle size={14}/>} Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanModal({ plan, onClose, onSave }) {
  const [form, setForm] = useState(plan || { name:'', plan_type:'hourly', vehicle_type:'car', price_per_hour:'', max_daily_price:'', monthly_price:'', grace_period_minutes:15 });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (plan) await api.put(`/plans/${plan.id}`, form);
      else await api.post('/plans', form);
      toast.success('Plano salvo!'); onSave();
    } catch (err) { toast.error(err.response?.data?.error||'Erro'); }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{fontSize:16}}>{plan?'Editar Plano':'Novo Plano'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{padding:6}}><X size={16}/></button>
        </div>
        <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="form-group"><label className="form-label">Nome *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Carro - Padrão"/></div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select value={form.plan_type} onChange={e=>setForm(f=>({...f,plan_type:e.target.value}))}>
                <option value="hourly">Por Hora</option>
                <option value="daily">Diário</option>
                <option value="monthly">Mensalista</option>
                <option value="event">Evento</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Veículo</label>
              <select value={form.vehicle_type} onChange={e=>setForm(f=>({...f,vehicle_type:e.target.value}))}>
                <option value="car">Carro</option>
                <option value="motorcycle">Moto</option>
                <option value="truck">Caminhão</option>
                <option value="van">Van</option>
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Valor/Hora (R$)</label><input type="number" step="0.01" value={form.price_per_hour} onChange={e=>setForm(f=>({...f,price_per_hour:e.target.value}))} placeholder="8.00"/></div>
            <div className="form-group"><label className="form-label">Máximo Diário (R$)</label><input type="number" step="0.01" value={form.max_daily_price} onChange={e=>setForm(f=>({...f,max_daily_price:e.target.value}))} placeholder="60.00"/></div>
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Valor Mensalista (R$)</label><input type="number" step="0.01" value={form.monthly_price} onChange={e=>setForm(f=>({...f,monthly_price:e.target.value}))} placeholder="350.00"/></div>
            <div className="form-group"><label className="form-label">Carência (min)</label><input type="number" value={form.grace_period_minutes} onChange={e=>setForm(f=>({...f,grace_period_minutes:parseInt(e.target.value)||0}))} placeholder="15"/></div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading?<div className="loader" style={{width:14,height:14,borderWidth:2}}/>:<CheckCircle size={14}/>} Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [userModal, setUserModal] = useState(null);
  const [planModal, setPlanModal] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => { const r = await api.get('/users'); setUsers(r.data.users); };
  const loadPlans = async () => { const r = await api.get('/plans'); setPlans(r.data.plans); };

  useEffect(() => {
    Promise.all([loadUsers(), loadPlans()]).finally(() => setLoading(false));
  }, []);

  const deleteUser = async id => {
    if (!confirm('Desativar este usuário?')) return;
    await api.delete(`/users/${id}`); toast.success('Usuário desativado'); loadUsers();
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div>
        <h1 style={{ fontSize:24, fontWeight:700 }}>Administração</h1>
        <p style={{ color:'var(--text-muted)', fontSize:14 }}>Gerenciar usuários, planos e configurações</p>
      </div>

      <div style={{ display:'flex', gap:4, borderBottom:'1px solid var(--border)' }}>
        {[['users','Usuários',<Users size={14}/>],['plans','Planos de Cobrança',<DollarSign size={14}/>],['system','Sistema',<Settings size={14}/>]].map(([k,l,icon])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 18px', fontSize:14, fontWeight:tab===k?600:400, color:tab===k?'var(--primary-light)':'var(--text-muted)', background:'none', borderBottom:tab===k?'2px solid var(--primary)':'2px solid transparent', marginBottom:-1, transition:'all 0.15s', cursor:'pointer' }}>
            {icon}{l}
          </button>
        ))}
      </div>

      {loading ? <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200}}><div className="loader loader-lg"/></div>

      : tab === 'users' ? (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button className="btn btn-primary" onClick={()=>setUserModal({})}><Plus size={14}/>Novo Usuário</button>
          </div>
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <table>
              <thead><tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Último Acesso</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{fontWeight:600}}>{u.name}</td>
                    <td style={{color:'var(--text-muted)',fontSize:13}}>{u.email}</td>
                    <td><span className={`badge ${ROLE_COLORS[u.role]}`}><Shield size={10}/> {ROLES[u.role]}</span></td>
                    <td style={{fontSize:13,color:'var(--text-muted)'}}>{u.last_login?new Date(u.last_login).toLocaleString('pt-BR'):'-'}</td>
                    <td><span className={`badge ${u.is_active?'badge-green':'badge-gray'}`}>{u.is_active?'Ativo':'Inativo'}</span></td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <button className="btn btn-ghost btn-sm" onClick={()=>setUserModal(u)}><Pencil size={13}/></button>
                        <button className="btn btn-ghost btn-sm" onClick={()=>deleteUser(u.id)} style={{color:'var(--danger)'}}><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      ) : tab === 'plans' ? (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button className="btn btn-primary" onClick={()=>setPlanModal({})}><Plus size={14}/>Novo Plano</button>
          </div>
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <table>
              <thead><tr><th>Nome</th><th>Tipo</th><th>Veículo</th><th>Valor/h</th><th>Máx. Diário</th><th>Mensalidade</th><th>Carência</th><th>Ações</th></tr></thead>
              <tbody>
                {plans.map(p => (
                  <tr key={p.id}>
                    <td style={{fontWeight:600}}>{p.name}</td>
                    <td><span className="badge badge-blue" style={{textTransform:'capitalize'}}>{p.plan_type}</span></td>
                    <td style={{textTransform:'capitalize',fontSize:13}}>{p.vehicle_type}</td>
                    <td style={{color:'var(--accent-warm)',fontWeight:600}}>{p.price_per_hour?fmt(p.price_per_hour):'-'}</td>
                    <td style={{fontSize:13}}>{p.max_daily_price?fmt(p.max_daily_price):'-'}</td>
                    <td style={{fontSize:13}}>{p.monthly_price?fmt(p.monthly_price):'-'}</td>
                    <td style={{fontSize:13}}>{p.grace_period_minutes}min</td>
                    <td><button className="btn btn-ghost btn-sm" onClick={()=>setPlanModal(p)}><Pencil size={13}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          {[
            { title:'API de Maquininha de Cartão', desc:'A API REST disponibiliza o endpoint POST /api/card-machine/charge para integração com terminais físicos (Stone, Cielo, Rede, PagSeguro). O sistema registra todas as transações com NSU, código de autorização, bandeira e últimos dígitos do cartão.', icon:'💳', badge:'Integração disponível' },
            { title:'Impressão de Recibo', desc:'Cada pagamento gera automaticamente um recibo em PDF via GET /api/payments/:id/receipt. O PDF é formatado no padrão bobina 80mm para impressoras térmicas. A via do cliente é aberta automaticamente ao finalizar o pagamento.', icon:'🖨️', badge:'PDF 80mm' },
            { title:'Banco de Dados PostgreSQL', desc:'Todos os dados são armazenados em PostgreSQL 16 com UUID como chave primária, triggers automáticos para cálculo de preços, views para dashboard e índices otimizados para consultas de alta performance.', icon:'🗄️', badge:'PostgreSQL 16' },
            { title:'Docker Compose', desc:'Frontend (React + Nginx), Backend (Node.js Express) e Banco de dados (PostgreSQL) rodam em containers isolados com rede interna, volumes persistentes e health checks automáticos.', icon:'🐳', badge:'3 containers' },
          ].map(item => (
            <div key={item.title} className="card" style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:24 }}>{item.icon}</span>
                <div>
                  <div style={{ fontWeight:600, fontSize:15 }}>{item.title}</div>
                  <span className="badge badge-green" style={{ fontSize:10, padding:'1px 8px' }}>{item.badge}</span>
                </div>
              </div>
              <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      )}

      {userModal !== null && <UserModal user={userModal.id?userModal:null} onClose={()=>setUserModal(null)} onSave={()=>{setUserModal(null);loadUsers();}}/>}
      {planModal !== null && <PlanModal plan={planModal.id?planModal:null} onClose={()=>setPlanModal(null)} onSave={()=>{setPlanModal(null);loadPlans();}}/>}
    </div>
  );
}

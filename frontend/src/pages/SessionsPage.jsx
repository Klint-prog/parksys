import React, { useState, useEffect, useCallback } from 'react';
import { Car, Plus, Search, LogIn, LogOut, CreditCard, Printer, X, CheckCircle, Clock, Hash } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const fmt = v => `R$ ${parseFloat(v||0).toFixed(2).replace('.',',')}`;

const PAYMENT_METHODS = [
  { id:'cash', label:'Dinheiro', icon:'💵' },
  { id:'debit_card', label:'Cartão Débito', icon:'💳' },
  { id:'credit_card', label:'Cartão Crédito', icon:'💳' },
  { id:'pix', label:'PIX', icon:'📱' },
  { id:'monthly_plan', label:'Mensalista', icon:'📋' },
];

function EntryModal({ spots, plans, onClose, onSuccess }) {
  const [form, setForm] = useState({ plate:'', spot_id:'', pricing_plan_id:'', notes:'' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/sessions/entry', { ...form, plate: form.plate.toUpperCase() });
      toast.success('Entrada registrada!'); onSuccess();
    } catch (err) { toast.error(err.response?.data?.error || 'Erro ao registrar entrada'); }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'rgba(99,102,241,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}><LogIn size={17} color="var(--primary-light)"/></div>
            <div><h3 style={{ fontSize:16, fontWeight:600 }}>Registrar Entrada</h3><p style={{ fontSize:12, color:'var(--text-muted)' }}>Novo veículo no estacionamento</p></div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding:6 }}><X size={16}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="form-group">
              <label className="form-label">Placa do Veículo *</label>
              <input value={form.plate} onChange={e=>setForm(f=>({...f,plate:e.target.value.toUpperCase()}))} placeholder="ABC-1234" required maxLength={8} style={{ textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:600, fontSize:16 }} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Vaga Disponível *</label>
                <select value={form.spot_id} onChange={e=>setForm(f=>({...f,spot_id:e.target.value}))} required>
                  <option value="">Selecionar vaga...</option>
                  {spots.map(s => <option key={s.id} value={s.id}>{s.floor}{s.spot_number} — {s.spot_type}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Plano de Cobrança *</label>
                <select value={form.pricing_plan_id} onChange={e=>setForm(f=>({...f,pricing_plan_id:e.target.value}))} required>
                  <option value="">Selecionar plano...</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name} — {p.price_per_hour ? fmt(p.price_per_hour)+'/h' : fmt(p.monthly_price)+'/mês'}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Observações</label>
              <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Opcional..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="loader" style={{width:15,height:15,borderWidth:2}}/> : <LogIn size={15}/>} Registrar Entrada
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ExitModal({ session, onClose, onSuccess }) {
  const [calc, setCalc] = useState(null);
  const [payMethod, setPayMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [discount, setDiscount] = useState(0);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardResult, setCardResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/sessions/${session.id}/calculate`).then(r => setCalc(r.data)).catch(()=>{});
  }, [session.id, discount]);

  const handleCardCharge = async () => {
    setCardLoading(true);
    try {
      const r = await api.post('/card-machine/charge', {
        amount: parseFloat(calc?.final_price||0), payment_type: payMethod,
        installments: 1, session_id: session.id
      });
      setCardResult(r.data);
      toast.success('Cartão aprovado!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Pagamento negado');
    }
    setCardLoading(false);
  };

  const handleFinalize = async () => {
    setLoading(true);
    try {
      // Close session
      await api.post(`/sessions/${session.id}/exit`, { discount_percent: discount });
      // Register payment
      const payData = {
        session_id: session.id, payment_method: payMethod,
        amount: parseFloat(calc?.final_price||0),
        change_amount: payMethod === 'cash' && cashReceived ? Math.max(0, parseFloat(cashReceived) - parseFloat(calc?.final_price||0)) : 0,
        ...(cardResult && { card_brand: cardResult.card_brand, card_last_digits: cardResult.card_last_digits, authorization_code: cardResult.authorization_code, transaction_id: cardResult.transaction_id })
      };
      const payRes = await api.post('/payments', payData);
      toast.success('Saída e pagamento registrados!');
      // Print receipt
      window.open(`${import.meta.env.VITE_API_URL || ''}/api/payments/${payRes.data.payment.id}/receipt`, '_blank');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao finalizar');
    }
    setLoading(false);
  };

  const elapsed = calc ? `${Math.floor(calc.elapsed_minutes/60)}h ${Math.floor(calc.elapsed_minutes%60)}m` : '...';
  const finalPrice = calc?.final_price || 0;
  const change = payMethod === 'cash' && cashReceived ? Math.max(0, parseFloat(cashReceived||0) - parseFloat(finalPrice)) : 0;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 'min(620px, 95vw)' }}>
        <div className="modal-header">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'rgba(245,158,11,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}><LogOut size={17} color="var(--accent-warm)"/></div>
            <div>
              <h3 style={{ fontSize:16, fontWeight:600 }}>Registrar Saída</h3>
              <p style={{ fontSize:12, color:'var(--text-muted)' }}>Placa: <strong>{session.plate}</strong> · Vaga: {session.floor}{session.spot_number}</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding:6 }}><X size={16}/></button>
        </div>

        <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* Summary */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            {[
              { label:'Tempo', value: elapsed, icon:<Clock size={14}/> },
              { label:'Valor Calculado', value: fmt(calc?.calculated_price||0), icon:<CreditCard size={14}/> },
              { label:'Total a Pagar', value: fmt(finalPrice), icon:<CheckCircle size={14}/> },
            ].map((item,i) => (
              <div key={i} style={{ padding:'12px 14px', background:'var(--bg-elevated)', borderRadius:'var(--radius-sm)', textAlign:'center' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5, color:'var(--text-muted)', fontSize:12, marginBottom:4 }}>{item.icon}{item.label}</div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:i===2?18:15, color: i===2?'var(--accent-warm)':'var(--text)' }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Discount */}
          <div className="form-group">
            <label className="form-label">Desconto (%)</label>
            <input type="number" min="0" max="100" value={discount} onChange={e=>setDiscount(parseFloat(e.target.value)||0)} placeholder="0" />
          </div>

          {/* Payment method */}
          <div>
            <label className="form-label" style={{ marginBottom:10, display:'block' }}>Forma de Pagamento</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {PAYMENT_METHODS.map(m => (
                <button key={m.id} type="button" onClick={() => { setPayMethod(m.id); setCardResult(null); }}
                  style={{ padding:'10px 8px', borderRadius:'var(--radius-sm)', background: payMethod===m.id ? 'rgba(99,102,241,0.15)':'var(--bg-elevated)', border: `1px solid ${payMethod===m.id ? 'var(--primary)':'var(--border)'}`, color: payMethod===m.id ? 'var(--primary-light)':'var(--text-muted)', fontSize:12, fontWeight:500, cursor:'pointer', transition:'all 0.15s' }}>
                  <div style={{ fontSize:18, marginBottom:4 }}>{m.icon}</div>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Card machine */}
          {(payMethod === 'credit_card' || payMethod === 'debit_card') && (
            <div style={{ padding:'14px', background:'rgba(99,102,241,0.06)', border:'1px solid var(--border-accent)', borderRadius:'var(--radius-sm)' }}>
              {cardResult ? (
                <div style={{ display:'flex', alignItems:'center', gap:10, color:'var(--success)' }}>
                  <CheckCircle size={18} />
                  <div>
                    <div style={{ fontWeight:600 }}>Pagamento Aprovado</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)' }}>{cardResult.card_brand} •••• {cardResult.card_last_digits} · Auth: {cardResult.authorization_code}</div>
                  </div>
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ fontSize:13, color:'var(--text-muted)' }}>Enviar cobrança para a maquininha</div>
                  <button className="btn btn-primary btn-sm" onClick={handleCardCharge} disabled={cardLoading}>
                    {cardLoading ? <div className="loader" style={{width:13,height:13,borderWidth:2}}/> : <CreditCard size={13}/>} Cobrar {fmt(finalPrice)}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Cash change */}
          {payMethod === 'cash' && (
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Dinheiro Recebido</label>
                <input type="number" min="0" step="0.01" value={cashReceived} onChange={e=>setCashReceived(e.target.value)} placeholder="0,00" />
              </div>
              <div className="form-group">
                <label className="form-label">Troco</label>
                <input value={fmt(change)} readOnly style={{ color:'var(--success)', fontWeight:700 }} />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-success" onClick={handleFinalize} disabled={loading || ((payMethod==='credit_card'||payMethod==='debit_card') && !cardResult && parseFloat(finalPrice)>0)}>
            {loading ? <div className="loader" style={{width:15,height:15,borderWidth:2}}/> : <><Printer size={15}/></>} Finalizar e Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showEntry, setShowEntry] = useState(false);
  const [exitSession, setExitSession] = useState(null);
  const [spots, setSpots] = useState([]);
  const [plans, setPlans] = useState([]);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/sessions', { params: { status: statusFilter, search, page, limit:20 } });
      setSessions(res.data.sessions); setTotal(res.data.total);
    } catch {}
    setLoading(false);
  }, [statusFilter, search, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get('/spots/available').then(r => setSpots(r.data.spots));
    api.get('/plans').then(r => setPlans(r.data.plans));
  }, [showEntry]);

  const statusBadge = s => {
    if (s === 'active') return <span className="badge badge-green"><span className="dot dot-green"/>Ativo</span>;
    if (s === 'completed') return <span className="badge badge-gray">Concluído</span>;
    return <span className="badge badge-red">Cancelado</span>;
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:700 }}>Entradas & Saídas</h1>
          <p style={{ color:'var(--text-muted)', fontSize:14 }}>{total} sessões encontradas</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowEntry(true)}>
          <Plus size={16}/> Nova Entrada
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:12, alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, maxWidth:320 }}>
          <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-subtle)' }}/>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Buscar por placa ou código..." style={{ paddingLeft:34 }}/>
        </div>
        {['active','completed','cancelled'].map(s => (
          <button key={s} className={`btn ${statusFilter===s?'btn-primary':'btn-ghost'} btn-sm`} onClick={()=>{setStatusFilter(s);setPage(1);}}>
            {s==='active'?'Ativos':s==='completed'?'Concluídos':'Cancelados'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Código</th><th>Placa</th><th>Vaga</th><th>Entrada</th>
                <th>Tempo</th><th>Valor</th><th>Status</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array(5).fill(0).map((_,i) => (
                <tr key={i}><td colSpan={8}><div className="skeleton" style={{height:16, borderRadius:4}}/></td></tr>
              )) : sessions.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign:'center', padding:'40px', color:'var(--text-subtle)' }}>
                  <Car size={32} style={{ opacity:0.3, marginBottom:8, display:'block', margin:'0 auto 8px' }}/>
                  Nenhuma sessão encontrada
                </td></tr>
              ) : sessions.map(sess => {
                const elapsed = sess.elapsed_minutes;
                const elapsedStr = elapsed ? `${Math.floor(elapsed/60)}h ${Math.floor(elapsed%60)}m` : '-';
                return (
                  <tr key={sess.id}>
                    <td><code style={{ fontSize:12, color:'var(--text-muted)', background:'var(--bg-elevated)', padding:'2px 6px', borderRadius:4 }}>{sess.session_code}</code></td>
                    <td><strong style={{ letterSpacing:'0.05em' }}>{sess.plate}</strong></td>
                    <td>{sess.floor && sess.spot_number ? `${sess.floor}${sess.spot_number}` : '-'}</td>
                    <td style={{ fontSize:13, color:'var(--text-muted)' }}>{format(new Date(sess.entry_time),'dd/MM HH:mm', {locale:ptBR})}</td>
                    <td style={{ fontFamily:'monospace' }}>{sess.status==='active' ? elapsedStr : `${sess.duration_minutes||0}min`}</td>
                    <td style={{ fontWeight:600, color:'var(--accent-warm)' }}>
                      {sess.status==='active' ? (sess.estimated_price ? fmt(sess.estimated_price) : '-') : (sess.final_price ? fmt(sess.final_price) : '-')}
                    </td>
                    <td>{statusBadge(sess.status)}</td>
                    <td>
                      {sess.status === 'active' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setExitSession(sess)}>
                          <LogOut size={13}/> Saída
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {total > 20 && (
          <div style={{ padding:'14px 20px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:13, color:'var(--text-muted)' }}>Página {page} de {Math.ceil(total/20)}</span>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-ghost btn-sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Anterior</button>
              <button className="btn btn-ghost btn-sm" disabled={page>=Math.ceil(total/20)} onClick={()=>setPage(p=>p+1)}>Próxima</button>
            </div>
          </div>
        )}
      </div>

      {showEntry && <EntryModal spots={spots} plans={plans} onClose={()=>setShowEntry(false)} onSuccess={()=>{setShowEntry(false);load();}} />}
      {exitSession && <ExitModal session={exitSession} onClose={()=>setExitSession(null)} onSuccess={()=>{setExitSession(null);load();}} />}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Car, CircleDollarSign, Clock, MapPin, TrendingUp, Users, RefreshCw, ArrowUpRight } from 'lucide-react';
import api from '../utils/api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const fmt = v => `R$ ${parseFloat(v||0).toFixed(2).replace('.',',')}`;

const StatCard = ({ icon: Icon, label, value, sub, color = 'var(--primary)', trend }) => (
  <div className="card animate-fade" style={{ display:'flex', flexDirection:'column', gap:12, position:'relative', overflow:'hidden' }}>
    <div style={{ position:'absolute', top:0, right:0, width:80, height:80, borderRadius:'50%', background:`radial-gradient(circle, ${color}18 0%, transparent 70%)`, transform:'translate(20px,-20px)' }} />
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <div style={{ width:40, height:40, borderRadius:10, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={19} color={color} />
      </div>
      {trend !== undefined && (
        <div style={{ display:'flex', alignItems:'center', gap:3, fontSize:12, color:'var(--success)', fontWeight:600 }}>
          <ArrowUpRight size={13} /> {trend}%
        </div>
      )}
    </div>
    <div>
      <div style={{ fontSize:26, fontFamily:'var(--font-display)', fontWeight:700, lineHeight:1.1 }}>{value}</div>
      <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>{label}</div>
      {sub && <div style={{ fontSize:12, color:'var(--text-subtle)', marginTop:2 }}>{sub}</div>}
    </div>
  </div>
);

const COLORS = ['#6366f1','#06d6a0','#f59e0b','#ef4444','#8b5cf6'];
const METHOD_LABELS = { cash:'Dinheiro', credit_card:'Crédito', debit_card:'Débito', pix:'PIX', monthly_plan:'Mensalista' };

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = async () => {
    try {
      const res = await api.get('/dashboard/summary');
      setData(res.data);
      setLastRefresh(new Date());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div className="loader loader-lg" />
    </div>
  );

  const s = data?.summary || {};
  const occRate = s.total_spots ? Math.round((s.occupied_spots / s.total_spots) * 100) : 0;

  const pieData = (data?.paymentMethods || []).map(m => ({ name: METHOD_LABELS[m.payment_method] || m.payment_method, value: parseFloat(m.total) }));

  // Build 24h hourly chart with zeros for missing hours
  const hourlyMap = {};
  (data?.hourlyRevenue || []).forEach(h => { hourlyMap[parseInt(h.hour)] = h; });
  const hourlyChart = Array.from({length:24},(_,i) => ({
    hour: `${String(i).padStart(2,'0')}h`,
    receita: parseFloat(hourlyMap[i]?.revenue || 0),
    transacoes: parseInt(hourlyMap[i]?.transactions || 0)
  }));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:700, marginBottom:4 }}>Dashboard</h1>
          <p style={{ color:'var(--text-muted)', fontSize:14 }}>Visão geral em tempo real do estacionamento</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>
          <RefreshCw size={14} /> Atualizar
          <span style={{ fontSize:11, color:'var(--text-subtle)' }}>
            {formatDistanceToNow(lastRefresh, { locale: ptBR, addSuffix: true })}
          </span>
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid-4">
        <StatCard icon={MapPin} label="Vagas Ocupadas" value={`${s.occupied_spots || 0}/${s.total_spots || 0}`} sub={`${occRate}% de ocupação`} color="var(--primary)" />
        <StatCard icon={Car} label="Sessões Ativas" value={s.active_sessions || 0} sub="veículos no momento" color="var(--accent)" />
        <StatCard icon={CircleDollarSign} label="Receita Hoje" value={fmt(s.revenue_today)} sub="pagamentos aprovados" color="var(--accent-warm)" />
        <StatCard icon={TrendingUp} label="Receita Mensal" value={fmt(s.revenue_month)} sub="mês corrente" color="var(--success)" />
      </div>

      {/* Charts row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:24 }}>
        {/* Hourly revenue chart */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div>
              <h3 style={{ fontSize:16, fontWeight:600 }}>Receita por Hora (Hoje)</h3>
              <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>Movimentação financeira nas últimas 24h</p>
            </div>
            <div className="badge badge-blue"><Clock size={11}/> Ao vivo</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={hourlyChart}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3}/>
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fill:'var(--text-subtle)', fontSize:11 }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fill:'var(--text-subtle)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
              <Tooltip contentStyle={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)' }} formatter={v => [fmt(v), 'Receita']} />
              <Area type="monotone" dataKey="receita" stroke="var(--primary)" strokeWidth={2} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Payment methods pie */}
        <div className="card">
          <h3 style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>Formas de Pagamento</h3>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>Distribuição de hoje</p>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)' }} formatter={v => [fmt(v)]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:8 }}>
                {pieData.map((d, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:13 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:8, height:8, borderRadius:2, background:COLORS[i%COLORS.length] }} />
                      <span style={{ color:'var(--text-muted)' }}>{d.name}</span>
                    </div>
                    <span style={{ fontWeight:600 }}>{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign:'center', padding:'30px 0', color:'var(--text-subtle)', fontSize:14 }}>Sem dados hoje</div>
          )}
        </div>
      </div>

      {/* Weekly chart + Active sessions */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        {/* Weekly revenue */}
        <div className="card">
          <h3 style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>Receita Semanal</h3>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>Últimos 7 dias</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data?.weeklyRevenue || []} barCategoryGap="35%">
              <XAxis dataKey="day" tick={{ fill:'var(--text-subtle)', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'var(--text-subtle)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
              <Tooltip contentStyle={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)' }} formatter={v => [fmt(v), 'Receita']} />
              <Bar dataKey="revenue" fill="var(--primary)" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Active sessions list */}
        <div className="card" style={{ display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <h3 style={{ fontSize:16, fontWeight:600 }}>Sessões Ativas</h3>
            <span className="badge badge-green"><span className="dot dot-green" /> {s.active_sessions || 0} ativos</span>
          </div>
          <div style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column', gap:8 }}>
            {(data?.activeSessions || []).slice(0,6).map(sess => (
              <div key={sess.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:'var(--bg-elevated)', borderRadius:'var(--radius-sm)', fontSize:13 }}>
                <div style={{ width:36, height:36, borderRadius:8, background:'rgba(99,102,241,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Car size={16} color="var(--primary-light)" />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, letterSpacing:'0.04em' }}>{sess.plate}</div>
                  <div style={{ color:'var(--text-subtle)', fontSize:12 }}>Vaga {sess.floor}{sess.spot_number}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontWeight:600, color:'var(--accent-warm)' }}>
                    {sess.estimated_price ? fmt(sess.estimated_price) : 'R$ 0,00'}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-subtle)' }}>
                    {Math.floor((sess.elapsed_minutes||0)/60)}h {Math.floor((sess.elapsed_minutes||0)%60)}m
                  </div>
                </div>
              </div>
            ))}
            {(data?.activeSessions||[]).length === 0 && (
              <div style={{ textAlign:'center', padding:'20px', color:'var(--text-subtle)', fontSize:14 }}>
                Nenhum veículo no momento
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

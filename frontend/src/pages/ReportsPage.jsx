import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { FileDown, TrendingUp, Calendar, Filter, Download } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const fmt = v => `R$ ${parseFloat(v||0).toFixed(2).replace('.',',')}`;
const COLORS = ['#6366f1','#06d6a0','#f59e0b','#ef4444','#8b5cf6'];
const METHOD_LABELS = { cash:'Dinheiro', credit_card:'Crédito', debit_card:'Débito', pix:'PIX', monthly_plan:'Mensalista' };

export default function ReportsPage() {
  const [revenue, setRevenue] = useState([]);
  const [totals, setTotals] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [occupancy, setOccupancy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('revenue');

  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    groupBy: 'day'
  });

  const load = async () => {
    setLoading(true);
    try {
      const [revRes, sessRes, occRes] = await Promise.all([
        api.get('/reports/revenue', { params: filters }),
        api.get('/reports/sessions', { params: { startDate: filters.startDate, endDate: filters.endDate, limit: 30 } }),
        api.get('/reports/occupancy', { params: { startDate: filters.startDate, endDate: filters.endDate } }),
      ]);
      setRevenue(revRes.data.data);
      setTotals(revRes.data.totals);
      setSessions(sessRes.data.sessions);
      setOccupancy(occRes.data);
    } catch (err) { toast.error('Erro ao carregar relatório'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filters.startDate, filters.endDate, filters.groupBy]);

  const downloadPdf = async () => {
    setPdfLoading(true);
    try {
      const url = `${import.meta.env.VITE_API_URL||''}/api/reports/pdf?startDate=${filters.startDate}&endDate=${filters.endDate}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `relatorio-${filters.startDate}-${filters.endDate}.pdf`;
      a.click();
      toast.success('Relatório PDF gerado!');
    } catch { toast.error('Erro ao gerar PDF'); }
    setPdfLoading(false);
  };

  // Aggregate revenue by period (merge payment methods)
  const revenueByPeriod = Object.values(
    revenue.reduce((acc, row) => {
      const key = row.period;
      if (!acc[key]) acc[key] = { period: new Date(key).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}), revenue: 0, transactions: 0 };
      acc[key].revenue += parseFloat(row.revenue||0);
      acc[key].transactions += parseInt(row.transactions||0);
      return acc;
    }, {})
  );

  const totalRevenue = totals.reduce((s,t)=>s+parseFloat(t.total||0),0);
  const totalTransactions = totals.reduce((s,t)=>s+parseInt(t.method_count||0),0);
  const avgTicket = totalTransactions ? totalRevenue/totalTransactions : 0;

  const pieData = totals.map(t => ({ name: METHOD_LABELS[t.payment_method]||t.payment_method, value: parseFloat(t.total||0) }));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:700 }}>Relatórios</h1>
          <p style={{ color:'var(--text-muted)', fontSize:14 }}>Análise financeira e de ocupação</p>
        </div>
        <button className="btn btn-primary" onClick={downloadPdf} disabled={pdfLoading}>
          {pdfLoading ? <div className="loader" style={{width:15,height:15,borderWidth:2}}/> : <FileDown size={15}/>}
          Exportar PDF
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding:'16px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
          <Filter size={15} style={{ color:'var(--text-muted)' }}/>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:13, color:'var(--text-muted)' }}>De:</span>
            <input type="date" value={filters.startDate} onChange={e=>setFilters(f=>({...f,startDate:e.target.value}))} style={{ width:'auto', padding:'7px 10px' }}/>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:13, color:'var(--text-muted)' }}>Até:</span>
            <input type="date" value={filters.endDate} onChange={e=>setFilters(f=>({...f,endDate:e.target.value}))} style={{ width:'auto', padding:'7px 10px' }}/>
          </div>
          <div style={{ display:'flex', gap:6, marginLeft:'auto' }}>
            {[['day','Diário'],['month','Mensal']].map(([v,l]) => (
              <button key={v} className={`btn btn-sm ${filters.groupBy===v?'btn-primary':'btn-ghost'}`} onClick={()=>setFilters(f=>({...f,groupBy:v}))}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI summary */}
      <div className="grid-3">
        {[
          { label:'Receita Total', value:fmt(totalRevenue), icon:'💰', color:'var(--accent-warm)' },
          { label:'Transações', value:totalTransactions, icon:'🧾', color:'var(--primary-light)' },
          { label:'Ticket Médio', value:fmt(avgTicket), icon:'📊', color:'var(--accent)' },
        ].map(k => (
          <div key={k.label} className="card" style={{ textAlign:'center' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>{k.icon}</div>
            <div style={{ fontSize:24, fontFamily:'var(--font-display)', fontWeight:700, color:k.color }}>{k.value}</div>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, borderBottom:'1px solid var(--border)', paddingBottom:1 }}>
        {[['revenue','Receita'],['sessions','Sessões'],['occupancy','Ocupação']].map(([k,l]) => (
          <button key={k} onClick={()=>setActiveTab(k)}
            style={{ padding:'10px 18px', fontSize:14, fontWeight: activeTab===k?600:400, color: activeTab===k?'var(--primary-light)':'var(--text-muted)', background:'none', borderBottom: activeTab===k?'2px solid var(--primary)':'2px solid transparent', marginBottom:-1, transition:'all 0.15s' }}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}><div className="loader loader-lg"/></div>
      ) : activeTab === 'revenue' ? (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20 }}>
            <div className="card">
              <h3 style={{ fontSize:16, fontWeight:600, marginBottom:16 }}>Receita no Período</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={revenueByPeriod} barCategoryGap="30%">
                  <XAxis dataKey="period" tick={{fill:'var(--text-subtle)',fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'var(--text-subtle)',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`R$${v}`}/>
                  <Tooltip contentStyle={{background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)'}} formatter={v=>[fmt(v),'Receita']}/>
                  <Bar dataKey="revenue" fill="var(--primary)" radius={[6,6,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 style={{ fontSize:16, fontWeight:600, marginBottom:16 }}>Por Forma de Pgto.</h3>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={36} outerRadius={58} paddingAngle={3} dataKey="value">
                    {pieData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={{background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)'}} formatter={v=>[fmt(v)]}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
                {totals.map((t,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ width:8, height:8, borderRadius:2, background:COLORS[i%COLORS.length] }}/>
                      <span style={{ color:'var(--text-muted)' }}>{METHOD_LABELS[t.payment_method]||t.payment_method}</span>
                    </div>
                    <span style={{ fontWeight:600 }}>{fmt(t.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'sessions' ? (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)' }}>
            <h3 style={{ fontSize:15, fontWeight:600 }}>Histórico de Sessões</h3>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table>
              <thead><tr><th>Placa</th><th>Entrada</th><th>Saída</th><th>Duração</th><th>Vaga</th><th>Plano</th><th>Valor Pago</th></tr></thead>
              <tbody>
                {sessions.length===0 ? (
                  <tr><td colSpan={7} style={{textAlign:'center',padding:'30px',color:'var(--text-subtle)'}}>Nenhuma sessão no período</td></tr>
                ) : sessions.map(s => (
                  <tr key={s.id}>
                    <td><strong style={{letterSpacing:'0.05em'}}>{s.plate}</strong></td>
                    <td style={{fontSize:13,color:'var(--text-muted)'}}>{s.entry_time?new Date(s.entry_time).toLocaleString('pt-BR'):'-'}</td>
                    <td style={{fontSize:13,color:'var(--text-muted)'}}>{s.exit_time?new Date(s.exit_time).toLocaleString('pt-BR'):'-'}</td>
                    <td>{s.duration_minutes?`${s.duration_minutes}min`:'-'}</td>
                    <td>{s.spot_number||'-'}</td>
                    <td style={{fontSize:12,color:'var(--text-muted)'}}>{s.plan_name||'-'}</td>
                    <td style={{fontWeight:600,color:'var(--accent-warm)'}}>{s.paid_amount?fmt(s.paid_amount):'-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div className="card">
            <h3 style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>Por Andar</h3>
            {(occupancy?.byFloor||[]).map(f => (
              <div key={f.floor} style={{ marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
                  <span style={{ fontWeight:600 }}>Andar {f.floor}</span>
                  <span style={{ color:'var(--text-muted)' }}>{f.completed_sessions||0} sessões · {fmt(f.total_revenue)}</span>
                </div>
                <div style={{ height:8, background:'var(--bg-elevated)', borderRadius:99, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${Math.min(100,(f.completed_sessions||0)/Math.max(1,...(occupancy?.byFloor||[]).map(x=>x.completed_sessions||0))*100)}%`, background:'var(--primary)', borderRadius:99 }}/>
                </div>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>Por Tipo de Vaga</h3>
            {(occupancy?.byType||[]).map((t,i) => (
              <div key={t.spot_type} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:COLORS[i%COLORS.length] }}/>
                  <span style={{ fontSize:13, textTransform:'capitalize' }}>{t.spot_type}</span>
                </div>
                <div style={{ textAlign:'right', fontSize:13 }}>
                  <div style={{ fontWeight:600 }}>{t.total_spots} vagas</div>
                  <div style={{ color:'var(--text-muted)' }}>{t.total_sessions||0} sessões</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Car, RefreshCw, MapPin, Clock, Zap, Accessibility } from 'lucide-react';
import api from '../utils/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SPOT_COLORS = {
  available: { bg:'rgba(34,197,94,0.12)', border:'rgba(34,197,94,0.3)', dot:'var(--success)', label:'Livre' },
  occupied:  { bg:'rgba(99,102,241,0.12)', border:'rgba(99,102,241,0.4)', dot:'var(--primary-light)', label:'Ocupado' },
  reserved:  { bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.3)', dot:'var(--warning)', label:'Reservado' },
  maintenance:{ bg:'rgba(239,68,68,0.1)', border:'rgba(239,68,68,0.2)', dot:'var(--danger)', label:'Manutenção' },
};

const TYPE_ICONS = { disabled:<Accessibility size={12}/>, electric:<Zap size={12}/>, vip:'⭐', standard:<Car size={12}/>, reserved:'🔒' };

function SpotCard({ spot, onClick }) {
  const colors = SPOT_COLORS[spot.status] || SPOT_COLORS.available;
  const elapsed = spot.entry_time ? Math.floor((Date.now() - new Date(spot.entry_time)) / 60000) : 0;

  return (
    <div onClick={() => spot.status !== 'available' && onClick(spot)}
      style={{
        padding:'10px 8px', borderRadius:8,
        background: colors.bg, border: `1px solid ${colors.border}`,
        cursor: spot.status !== 'available' ? 'pointer' : 'default',
        transition:'all 0.15s', textAlign:'center', minWidth:72, position:'relative',
      }}
      onMouseEnter={e=>e.currentTarget.style.transform='scale(1.05)'}
      onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
    >
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, fontSize:11, color:colors.dot, fontWeight:600, marginBottom:3 }}>
        {TYPE_ICONS[spot.spot_type]} {spot.spot_number}
      </div>
      {spot.plate ? (
        <>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.04em', color:'var(--text)' }}>{spot.plate}</div>
          <div style={{ fontSize:9, color:'var(--text-subtle)', marginTop:1 }}>
            {Math.floor(elapsed/60)}h{Math.floor(elapsed%60)}m
          </div>
        </>
      ) : (
        <div style={{ fontSize:10, color:colors.dot }}>{colors.label}</div>
      )}
    </div>
  );
}

function SpotDetail({ spot, onClose }) {
  const elapsed = spot.entry_time ? Math.floor((Date.now() - new Date(spot.entry_time)) / 60000) : 0;
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ width:'min(400px,95vw)' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize:16 }}>Vaga {spot.floor}{spot.spot_number}</h3>
            <p style={{ fontSize:12, color:'var(--text-muted)' }}>Detalhes da ocupação</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{padding:6}}>✕</button>
        </div>
        <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {[
            ['Placa', spot.plate],
            ['Código', spot.session_code],
            ['Entrada', spot.entry_time ? format(new Date(spot.entry_time), "dd/MM/yyyy 'às' HH:mm", {locale:ptBR}) : '-'],
            ['Tempo', `${Math.floor(elapsed/60)}h ${Math.floor(elapsed%60)}min`],
            ['Tipo de Vaga', spot.spot_type],
            ['Seção', spot.section || '-'],
          ].map(([k,v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontSize:13, color:'var(--text-muted)' }}>{k}</span>
              <span style={{ fontSize:13, fontWeight:600 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SpotsPage() {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [floorFilter, setFloorFilter] = useState('all');

  const load = async () => {
    const res = await api.get('/dashboard/occupancy');
    setSpots(res.data.spots);
    setLoading(false);
  };

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  const floors = [...new Set(spots.map(s => s.floor))].sort();
  const filtered = floorFilter === 'all' ? spots : spots.filter(s => s.floor === floorFilter);
  const byFloor = floors.reduce((acc, f) => {
    acc[f] = filtered.filter(s => s.floor === f);
    return acc;
  }, {});

  const total = spots.length;
  const occupied = spots.filter(s=>s.status==='occupied').length;
  const available = spots.filter(s=>s.status==='available').length;
  const occupancyRate = total ? Math.round(occupied/total*100) : 0;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:700 }}>Mapa de Vagas</h1>
          <p style={{ color:'var(--text-muted)', fontSize:14 }}>Visão em tempo real · atualiza a cada 15s</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/>Atualizar</button>
      </div>

      {/* Summary bar */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { label:'Total', value:total, color:'var(--text-muted)', bg:'var(--bg-elevated)' },
          { label:'Livres', value:available, color:'var(--success)', bg:'rgba(34,197,94,0.08)' },
          { label:'Ocupadas', value:occupied, color:'var(--primary-light)', bg:'rgba(99,102,241,0.08)' },
          { label:'Ocupação', value:`${occupancyRate}%`, color:'var(--accent-warm)', bg:'rgba(245,158,11,0.08)' },
        ].map(item => (
          <div key={item.label} style={{ padding:'14px 16px', background:item.bg, border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', textAlign:'center' }}>
            <div style={{ fontSize:24, fontFamily:'var(--font-display)', fontWeight:700, color:item.color }}>{item.value}</div>
            <div style={{ fontSize:12, color:'var(--text-subtle)' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
        <span style={{ fontSize:13, color:'var(--text-subtle)', fontWeight:600 }}>Legenda:</span>
        {Object.entries(SPOT_COLORS).map(([k,v]) => (
          <div key={k} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
            <div style={{ width:12, height:12, borderRadius:3, background:v.bg, border:`1px solid ${v.border}` }}/>
            <span style={{ color:'var(--text-muted)' }}>{v.label}</span>
          </div>
        ))}
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <button className={`btn btn-sm ${floorFilter==='all'?'btn-primary':'btn-ghost'}`} onClick={()=>setFloorFilter('all')}>Todos</button>
          {floors.map(f => <button key={f} className={`btn btn-sm ${floorFilter===f?'btn-primary':'btn-ghost'}`} onClick={()=>setFloorFilter(f)}>Andar {f}</button>)}
        </div>
      </div>

      {/* Floor maps */}
      {loading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}><div className="loader loader-lg"/></div>
      ) : (
        floors.map(floor => (
          <div key={floor} className="card">
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <div style={{ width:32, height:32, borderRadius:8, background:'rgba(99,102,241,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <MapPin size={15} color="var(--primary-light)"/>
              </div>
              <div>
                <h3 style={{ fontSize:15, fontWeight:600 }}>Andar {floor}</h3>
                <p style={{ fontSize:12, color:'var(--text-muted)' }}>
                  {(byFloor[floor]||[]).filter(s=>s.status==='available').length} vagas livres de {(byFloor[floor]||[]).length}
                </p>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(76px,1fr))', gap:8 }}>
              {(byFloor[floor]||[]).map(spot => (
                <SpotCard key={spot.id} spot={spot} onClick={setSelectedSpot}/>
              ))}
            </div>
          </div>
        ))
      )}
      {selectedSpot && <SpotDetail spot={selectedSpot} onClose={()=>setSelectedSpot(null)}/>}
    </div>
  );
}

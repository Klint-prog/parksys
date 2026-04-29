import React, { useState, useEffect, useCallback } from 'react';
import { Truck, Plus, Search, X, CheckCircle, Clock, DollarSign, ChevronRight, Pencil } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const fmt = v => `R$ ${parseFloat(v || 0).toFixed(2).replace('.', ',')}`;
const TYPE_LABELS = { car: 'Carro', motorcycle: 'Moto', truck: 'Caminhão', van: 'Van' };
const TYPE_ICONS = { car: '🚗', motorcycle: '🏍️', truck: '🚛', van: '🚐' };

function VehicleModal({ vehicle, onClose, onSave }) {
  const [form, setForm] = useState(vehicle || {
    plate: '', brand: '', model: '', color: '', vehicle_type: 'car',
    owner_name: '', owner_phone: '', owner_email: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!form.plate) return toast.error('Placa obrigatória');
    setLoading(true);
    try {
      await api.post('/vehicles', { ...form, plate: form.plate.toUpperCase() });
      toast.success(vehicle ? 'Veículo atualizado!' : 'Veículo cadastrado!');
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Erro ao salvar'); }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={17} color="var(--primary-light)" />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>{vehicle ? 'Editar Veículo' : 'Cadastrar Veículo'}</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Informações do veículo e proprietário</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 6 }}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Placa *</label>
              <input value={form.plate} onChange={e => setForm(f => ({ ...f, plate: e.target.value.toUpperCase() }))}
                placeholder="ABC-1234" maxLength={8}
                style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, fontSize: 16 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de Veículo</label>
              <select value={form.vehicle_type} onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value }))}>
                <option value="car">🚗 Carro</option>
                <option value="motorcycle">🏍️ Moto</option>
                <option value="truck">🚛 Caminhão</option>
                <option value="van">🚐 Van</option>
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Marca</label>
              <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Ex: Toyota" />
            </div>
            <div className="form-group">
              <label className="form-label">Modelo</label>
              <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="Ex: Corolla" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Cor</label>
            <input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="Ex: Prata" />
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Proprietário (opcional)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} placeholder="Nome do proprietário" />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input value={form.owner_phone} onChange={e => setForm(f => ({ ...f, owner_phone: e.target.value }))} placeholder="(11) 99999-0000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" value={form.owner_email} onChange={e => setForm(f => ({ ...f, owner_email: e.target.value }))} placeholder="email@exemplo.com" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? <div className="loader" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <CheckCircle size={14} />}
            Salvar Veículo
          </button>
        </div>
      </div>
    </div>
  );
}

function VehicleDetail({ plate, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/vehicles/${plate}`).then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [plate]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 'min(620px, 95vw)' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Detalhes do Veículo</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Histórico completo</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 6 }}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}><div className="loader" /></div>
          ) : data ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Vehicle info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: 40 }}>{TYPE_ICONS[data.vehicle?.vehicle_type] || '🚗'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.05em' }}>{data.vehicle?.plate}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 2 }}>
                    {[data.vehicle?.brand, data.vehicle?.model, data.vehicle?.color].filter(Boolean).join(' · ') || 'Sem informações'}
                  </div>
                  {data.vehicle?.owner_name && (
                    <div style={{ fontSize: 13, color: 'var(--text-subtle)', marginTop: 4 }}>
                      👤 {data.vehicle.owner_name} {data.vehicle.owner_phone && `· ${data.vehicle.owner_phone}`}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid-3">
                {[
                  { label: 'Total de Visitas', value: data.sessions?.length || 0, icon: <Clock size={14} /> },
                  { label: 'Total Gasto', value: fmt(data.sessions?.reduce((s, x) => s + parseFloat(x.amount || 0), 0)), icon: <DollarSign size={14} /> },
                  { label: 'Tipo', value: TYPE_LABELS[data.vehicle?.vehicle_type] || '-', icon: <Truck size={14} /> },
                ].map(item => (
                  <div key={item.label} style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>{item.icon}{item.label}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Session history */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)' }}>HISTÓRICO DE SESSÕES</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                  {(data.sessions || []).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-subtle)', fontSize: 13 }}>Nenhuma visita registrada</div>
                  ) : data.sessions.map(sess => (
                    <div key={sess.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: sess.status === 'active' ? 'var(--success)' : 'var(--text-subtle)', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ color: 'var(--text-muted)' }}>{sess.entry_time ? new Date(sess.entry_time).toLocaleString('pt-BR') : '-'}</div>
                        {sess.spot_number && <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Vaga {sess.spot_number}</div>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {sess.duration_minutes && <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{sess.duration_minutes}min</div>}
                        {sess.amount && <div style={{ fontWeight: 600, color: 'var(--accent-warm)' }}>{fmt(sess.amount)}</div>}
                      </div>
                      <span className={`badge ${sess.status === 'active' ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                        {sess.status === 'active' ? 'Ativo' : 'Concluído'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-subtle)' }}>Veículo não encontrado</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [detailPlate, setDetailPlate] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/vehicles', { params: { search, page, limit: 20 } });
      setVehicles(res.data.vehicles);
      setTotal(res.data.total);
    } catch {}
    setLoading(false);
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Veículos</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{total} veículos cadastrados</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> Cadastrar Veículo
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 400 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por placa, nome ou telefone..."
          style={{ paddingLeft: 34 }} />
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Placa</th><th>Tipo</th><th>Veículo</th>
                <th>Proprietário</th><th>Telefone</th><th>Cadastrado em</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array(6).fill(0).map((_, i) => (
                <tr key={i}>
                  {Array(7).fill(0).map((__, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4, width: j === 6 ? 60 : '80%' }} /></td>
                  ))}
                </tr>
              )) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-subtle)' }}>
                    <Truck size={36} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
                    Nenhum veículo encontrado
                  </td>
                </tr>
              ) : vehicles.map(v => (
                <tr key={v.id} style={{ cursor: 'pointer' }} onClick={() => setDetailPlate(v.plate)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{TYPE_ICONS[v.vehicle_type] || '🚗'}</span>
                      <strong style={{ letterSpacing: '0.05em', fontFamily: 'monospace', fontSize: 15 }}>{v.plate}</strong>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-blue" style={{ fontSize: 11 }}>{TYPE_LABELS[v.vehicle_type] || v.vehicle_type}</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {[v.brand, v.model, v.color].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td style={{ fontSize: 13 }}>{v.owner_name || <span style={{ color: 'var(--text-subtle)' }}>—</span>}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{v.owner_phone || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{new Date(v.created_at).toLocaleDateString('pt-BR')}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingVehicle(v);
                          setShowModal(true);
                        }}
                        title="Adicionar/alterar informações"
                      >
                        <Pencil size={14} />
                      </button>
                      <ChevronRight size={15} style={{ color: 'var(--text-subtle)' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Página {page} de {Math.ceil(total / 20)}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
              <button className="btn btn-ghost btn-sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Próxima</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <VehicleModal
          vehicle={editingVehicle}
          onClose={() => { setShowModal(false); setEditingVehicle(null); }}
          onSave={() => { setShowModal(false); setEditingVehicle(null); load(); }}
        />
      )}
      {detailPlate && (
        <VehicleDetail plate={detailPlate} onClose={() => setDetailPlate(null)} />
      )}
    </div>
  );
}

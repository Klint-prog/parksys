import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Car, Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'admin@parkingsystem.com', password: 'Admin@2024' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Bem-vindo ao Park System!');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', position: 'relative', overflow: 'hidden', padding: '20px'
    }}>
      {/* Background effects */}
      <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
        <div style={{ position:'absolute', top:'-20%', left:'-10%', width:'60vw', height:'60vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', filter:'blur(40px)' }} />
        <div style={{ position:'absolute', bottom:'-20%', right:'-10%', width:'50vw', height:'50vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(6,214,160,0.06) 0%, transparent 70%)', filter:'blur(40px)' }} />
        {/* Grid pattern */}
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.03 }}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="animate-fade" style={{ width: '100%', maxWidth: 400, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(99,102,241,0.4)'
          }}>
            <Car size={30} color="#fff" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>
            Park<span style={{ color: 'var(--primary-light)' }}>System</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>
            Sistema de Gestão de Estacionamento
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 6 }}>Acesso ao Sistema</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Entre com suas credenciais</p>

          {error && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'var(--radius-sm)', marginBottom:16, color:'var(--danger)', fontSize:14 }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-subtle)' }} />
                <input
                  type="email" value={form.email} required
                  onChange={e => setForm(f => ({...f, email: e.target.value}))}
                  style={{ paddingLeft: 36 }}
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Senha</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-subtle)' }} />
                <input
                  type={showPass ? 'text' : 'password'} value={form.password} required
                  onChange={e => setForm(f => ({...f, password: e.target.value}))}
                  style={{ paddingLeft: 36, paddingRight: 40 }}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', color:'var(--text-subtle)', padding:4 }}>
                  {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:15, marginTop:4 }}>
              {loading ? <><div className="loader" style={{ width:16, height:16, borderWidth:2 }} /> Entrando...</> : 'Entrar no Sistema'}
            </button>
          </form>
        </div>

        {/* Demo credentials hint */}
        <div style={{ marginTop:16, padding:'12px 16px', background:'rgba(6,214,160,0.06)', border:'1px solid rgba(6,214,160,0.15)', borderRadius:'var(--radius-sm)' }}>
          <p style={{ fontSize:12, color:'var(--accent)', fontWeight:600, marginBottom:4 }}>Credenciais de demonstração:</p>
          <p style={{ fontSize:12, color:'var(--text-muted)' }}>Admin: admin@parkingsystem.com / Admin@2024</p>
          <p style={{ fontSize:12, color:'var(--text-muted)' }}>Operador: joao@parkingsystem.com / Oper@2024</p>
        </div>
      </div>
    </div>
  );
}

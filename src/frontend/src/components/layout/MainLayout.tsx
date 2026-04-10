import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function MainLayout() {
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #f0f0ff 0%, #e8e8f8 50%, #f5f0ff 100%)',
      }}
    >
      {/* Blobs de fundo decorativos */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl opacity-30"
             style={{ background: 'radial-gradient(circle, #493ee5 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full blur-3xl opacity-20"
             style={{ background: 'radial-gradient(circle, #635bff 0%, transparent 70%)' }} />
      </div>

      <Sidebar />

      <main className="flex-1 overflow-y-auto relative">
        <Outlet />
      </main>
    </div>
  );
}

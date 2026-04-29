import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar as CalendarIcon, History as HistoryIcon, Settings, Bell, Menu, X, CheckSquare, AlertCircle, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useEffect, useState } from 'react';
import { useInvoices } from '../store/InvoiceContext';
import { useAuth } from '../store/AuthContext';
import { DateRangePicker } from './DateRangePicker';
import { api, type AppNotification, type Promotion } from '../services/api';
import PromoSlot from './PromoSlot';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function Layout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { globalDateRange, setGlobalDateRange, invoices, dryRun } = useInvoices();
  const { user, signOut } = useAuth();
  const userInitial = (user?.displayName || user?.email || 'U').charAt(0).toUpperCase();
  const userLabel = user?.displayName || user?.email || 'Usuário';
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Calendário', href: '/calendario', icon: CalendarIcon },
    { name: 'Histórico', href: '/historico', icon: HistoryIcon },
    { name: 'Configuração', href: '/configuracao', icon: Settings },
  ];

  const pendingCount = invoices.filter(i => i.status === 'pendente').length;
  const recentErrors = invoices.filter(i => i.status === 'erro').length;
  const unreadAppCount = appNotifications.filter(n => !n.read).length;
  const mobileAlertCount = Math.min(99, pendingCount + recentErrors + unreadAppCount);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setAppNotifications(data.notifications || []);
    } catch {
      setAppNotifications([]);
    }
  };

  useEffect(() => {
    loadNotifications();
    api.getPromotions('notifications')
      .then(data => setPromotions(data.promotions || []))
      .catch(() => setPromotions([]));
  }, []);

  useEffect(() => {
    if (notificationsOpen) loadNotifications();
  }, [notificationsOpen]);

  const markRead = async (notification: AppNotification) => {
    if (notification.read) return;
    setAppNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
    try { await api.markNotificationRead(notification.id); } catch {}
  };

  return (
    <div className="flex h-screen bg-[#F3F4F6] flex-col md:flex-row overflow-hidden font-sans text-slate-900">
      {/* Banner DRY_RUN — proteção visual contra emissão acidental */}
      {dryRun && (
        <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-center py-1 text-[10px] font-bold uppercase tracking-widest z-[999999] border-b-2 border-red-800 shadow-md">
          ⚠ Modo Simulação ativo — aprovar/negar não emite CT-e real
        </div>
      )}
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-20 bg-[#1F2937] items-center py-6 border-r border-slate-200 z-10 shrink-0">
        <Link to="/" className="w-14 h-14 bg-white rounded-xl flex items-center justify-center mb-10 shadow-lg shrink-0 hover:opacity-90 transition-opacity p-1.5">
          <img src="/logo.png" alt="Rota 31" className="w-full h-full object-contain" />
        </Link>
        <nav className="flex flex-col gap-6 flex-1 w-full px-4 mt-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "p-3 rounded-xl transition-colors flex items-center justify-center relative group",
                  isActive ? "bg-slate-700/50 text-white" : "text-slate-400 hover:text-white"
                )}
                title={item.name}
              >
                <item.icon className="w-6 h-6" />
              </Link>
            )
          })}
          <button
            onClick={() => setNotificationsOpen(true)}
            className="p-3 text-slate-400 hover:text-white rounded-xl transition-colors flex items-center justify-center relative group mt-auto"
            title="Alertas"
          >
            <Bell className="w-6 h-6" />
            {(pendingCount > 0 || recentErrors > 0 || unreadAppCount > 0) && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#1F2937]"></span>
            )}
          </button>
        </nav>
        
        {/* Banner Thor4Tech (rotativo) */}
        <div className="mt-4 px-2 w-full shrink-0">
          <PromoSlot placement="sidebar" variant="sidebar" />
        </div>

        <div className="mt-4 shrink-0 relative">
          <button
            onClick={() => setProfileMenuOpen(o => !o)}
            className="w-10 h-10 rounded-full bg-slate-600 border-2 border-slate-300 flex items-center justify-center text-xs font-bold text-white shadow-sm hover:bg-slate-500 transition-colors"
            title={userLabel}
          >
            {userInitial}
          </button>
          {profileMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
              <div className="absolute left-full bottom-0 ml-2 bg-white rounded-xl shadow-2xl border border-slate-200 w-64 z-50 overflow-hidden">
                <div className="p-3 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conectado como</p>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">{userLabel}</p>
                  {user?.email && user?.email !== userLabel && (
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  )}
                </div>
                <button
                  onClick={async () => { await signOut(); setProfileMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Header Mobile & Top Bar */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-8 z-[99999] relative shrink-0 shadow-sm isolate">
           <div className="flex items-center gap-4">
              <div className="flex items-center md:hidden">
                <img src="/logo.png" alt="Rota 31" className="w-9 h-9 mr-2 object-contain" />
              </div>
              <h1 className="text-xl font-bold text-[#1F2937]">Rota 31 Express</h1>
              <div className="hidden sm:flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-green-700">Sistema Online</span>
              </div>
           </div>
           
           <div className="hidden md:block z-50">
             <DateRangePicker value={globalDateRange} onChange={setGlobalDateRange} />
           </div>

           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                 <span className="bg-orange-100 text-[#F26522] px-2 py-0.5 rounded text-[10px] font-bold uppercase hidden sm:inline-block">Beta v2.4</span>
              </div>
              <button
                onClick={async () => { if (confirm('Deseja sair?')) await signOut(); }}
                className="md:hidden h-8 w-8 rounded-full bg-slate-600 border-2 border-white shadow-sm flex items-center justify-center text-white font-bold text-xs hover:bg-slate-500 transition-colors"
                title={`${userLabel} (toque para sair)`}
              >
                 {userInitial}
              </button>
           </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto w-full p-4 sm:p-6 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Bottom Nav - Mobile */}
      <div className="md:hidden bg-white border-t border-slate-200 fixed bottom-0 left-0 right-0 z-50 px-2 pb-4 sm:pb-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around py-2">
           {navigation.map((item) => {
             const isActive = location.pathname === item.href;
             return (
               <Link
                 key={item.name}
                 to={item.href}
                 className={cn(
                   "flex flex-col items-center p-2 rounded-xl min-w-[60px] transition-colors",
                   isActive ? "text-[#F26522]" : "text-slate-400 hover:text-slate-600"
                 )}
               >
                 <item.icon className={cn("w-6 h-6 mb-1", isActive ? "text-[#F26522]" : "text-slate-400")} />
                 <span className="text-[10px] font-bold leading-none">{item.name}</span>
               </Link>
             )
           })}
           <button onClick={() => setNotificationsOpen(true)} className="flex flex-col items-center p-2 rounded-xl min-w-[60px] text-slate-400 relative hover:text-slate-600 transition-colors">
              <Bell className="w-6 h-6 mb-1 text-slate-400" />
              <span className="text-[10px] font-bold leading-none">Alertas</span>
              {mobileAlertCount > 0 && (
                <span className="absolute top-1 right-3 bg-red-500 text-white w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-black border border-white">
                  {mobileAlertCount}
                </span>
              )}
           </button>
        </div>
      </div>

      {/* Notifications Slide-Over */}
      {notificationsOpen && (
        <div className="fixed inset-0 z-[999999] overflow-hidden">
           <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm transition-opacity" onClick={() => setNotificationsOpen(false)} />
           <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
              <div className="w-screen max-w-md transform transition-transform animate-in slide-in-from-right duration-300">
                 <div className="flex h-full flex-col bg-white shadow-2xl pb-4">
                    <div className="bg-slate-50 px-4 py-6 sm:px-6 border-b border-gray-200 shrink-0 flex items-center justify-between">
                       <h2 className="text-lg font-bold text-gray-900 flex items-center">
                          <Bell className="w-5 h-5 mr-2 text-[#F26522]" />
                          Central de Notificações
                       </h2>
                       <button 
                         type="button" 
                         className="text-gray-400 hover:text-gray-500 p-2 rounded-full hover:bg-gray-200 transition-colors"
                         onClick={() => setNotificationsOpen(false)}
                       >
                         <X className="w-6 h-6" />
                       </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-4">
                      {appNotifications.map(notification => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => markRead(notification)}
                          className={cn(
                            "w-full text-left border rounded-xl p-4 flex gap-3 transition-colors",
                            notification.read ? "bg-white border-slate-100" : "bg-blue-50 border-blue-100"
                          )}
                        >
                          <Bell className={cn(
                            "w-5 h-5 shrink-0 mt-0.5",
                            notification.level === 'error' ? "text-red-600" :
                            notification.level === 'warning' ? "text-amber-600" :
                            notification.level === 'success' ? "text-emerald-600" : "text-blue-600"
                          )} />
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">{notification.title}</h3>
                            <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                            <p className="text-xs text-slate-400 mt-2 font-medium">{notification.source}</p>
                          </div>
                        </button>
                      ))}

                      {recentErrors > 0 && (
                         <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            <div>
                               <h3 className="text-sm font-bold text-red-800">Atenção Necessária</h3>
                               <p className="text-sm text-red-600 mt-1">Existem {recentErrors} notas fiscais com erro de emissão na fila. Verifique a integração com o ERP.</p>
                               <p className="text-xs text-red-400 mt-2 font-medium">Agora mesmo</p>
                            </div>
                         </div>
                      )}
                      {pendingCount > 0 && (
                         <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex gap-3">
                            <CheckSquare className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                            <div>
                               <h3 className="text-sm font-bold text-orange-800">Aprovações Pendentes</h3>
                               <p className="text-sm text-orange-600 mt-1">Você tem {pendingCount} faturas aguardando sua aprovação para liberação de frete FOB.</p>
                               <p className="text-xs text-orange-400 mt-2 font-medium">Há 15 minutos</p>
                            </div>
                         </div>
                      )}
                      
                      {pendingCount === 0 && recentErrors === 0 && appNotifications.length === 0 && (
                         <div className="text-center py-10 flex flex-col items-center justify-center h-full">
                            <Bell className="w-12 h-12 text-slate-200 mb-3" />
                            <p className="text-slate-500 font-medium">Você não tem notificações novas.</p>
                         </div>
                      )}

                      {promotions[0] && (
                        <div className="mt-6 border-t border-slate-100 pt-4">
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Thor4Tech</p>
                            <h3 className="text-sm font-bold text-slate-800 mt-1">{promotions[0].title}</h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{promotions[0].body}</p>
                            {promotions[0].ctaUrl && (
                              <a
                                href={promotions[0].ctaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex mt-2 text-xs font-bold text-[#F26522] hover:underline"
                              >
                                {promotions[0].ctaLabel || 'Saiba mais'}
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}

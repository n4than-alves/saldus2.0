import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart,
  Target,
  Loader2 // Importar o Loader2 para o spinner
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSubscription } from '@/hooks/use-subscription';
import { Skeleton } from '@/components/ui/skeleton'; // Importar Skeleton para placeholders

// Modificado para aceitar isLoading como prop para exibir um spinner ou skeleton
const NavItem = ({
  to,
  icon: Icon,
  label,
  active,
  onClick,
  disabled = false,
  isLoading = false, // NOVO: Prop para indicar carregamento
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean; // NOVO: Tipo da prop
}) => {
  if (isLoading) {
    // Renderiza um Skeleton ou um spinner enquanto carrega
    return (
      <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-400">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-4 w-20" />
      </div>
    );
  }

  if (disabled) {
    return (
      <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-400 cursor-not-allowed">
        <Icon className="h-5 w-5" />
        <span>{label}</span>
        <span className="ml-auto text-xs bg-gray-200 px-2 py-1 rounded">Pro</span>
      </div>
    );
  }

  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active ? 'bg-saldus-500 text-white' : 'hover:bg-gray-100 text-gray-700'
      )}
      onClick={onClick}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
};

const Sidebar = () => {
  const { user, signOut } = useAuth();
  // NOVO: Acessar o 'loading' do useSubscription
  const { planType, loading: subscriptionLoading } = useSubscription(); 
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(!isMobile);

  useEffect(() => {
    setIsOpen(!isMobile);
  }, [isMobile]);

  const navigation = [
    { name: 'Painel', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Transações', href: '/transactions', icon: CreditCard },
    { name: 'Clientes', href: '/clients', icon: Users },
    { name: 'Relatórios', href: '/reports', icon: BarChart },
    { 
      name: 'Metas', 
      href: '/goals', 
      icon: Target, 
      proOnly: true 
    },
  ];

  const currentPath = location.pathname;

  if (isMobile && !isOpen) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-40 md:hidden"
        onClick={() => setIsOpen(true)}
      >
        <Menu className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out md:relative md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-saldus-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="font-bold text-gray-800">Saldus</span>
            </div>
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => {
              // NOVO: Determinar se o item está carregando o status PRO
              const isLoadingProStatus = item.proOnly && subscriptionLoading;

              return (
                <NavItem
                  key={item.name}
                  to={item.href}
                  icon={item.icon}
                  label={item.name}
                  active={currentPath === item.href}
                  onClick={isMobile ? () => setIsOpen(false) : undefined}
                  // Se isLoadingProStatus for true, não desabilite ainda
                  disabled={!isLoadingProStatus && item.proOnly && planType !== 'pro'}
                  isLoading={isLoadingProStatus} // Passa o status de carregamento
                />
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t p-4">
            <div className="mb-4">
              <NavItem
                to="/settings"
                icon={Settings}
                label="Configurações"
                active={currentPath === '/settings'}
                onClick={isMobile ? () => setIsOpen(false) : undefined}
              />
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={signOut}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sair
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
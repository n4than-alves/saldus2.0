<<<<<<< HEAD

=======
>>>>>>> 53213e8 (Primeiro commit da nova versão do projeto)
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from './use-toast';

export type SubscriptionStatus = {
  subscribed: boolean;
  planType: 'free' | 'pro';
  planExpiryDate: string | null;
  isLoading: boolean;
  error: string | null;
};

export const useSubscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
<<<<<<< HEAD
=======

>>>>>>> 53213e8 (Primeiro commit da nova versão do projeto)
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    planType: 'free',
    planExpiryDate: null,
    isLoading: true,
<<<<<<< HEAD
    error: null
=======
    error: null,
>>>>>>> 53213e8 (Primeiro commit da nova versão do projeto)
  });

  const checkSubscription = async () => {
    if (!user) {
<<<<<<< HEAD
      setStatus(prev => ({ ...prev, isLoading: false }));
=======
      setStatus({
        subscribed: false,
        planType: 'free',
        planExpiryDate: null,
        isLoading: false,
        error: null,
      });
>>>>>>> 53213e8 (Primeiro commit da nova versão do projeto)
      return;
    }

    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));
<<<<<<< HEAD
      
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        throw new Error(error.message);
      }
      
      console.log('Subscription data received:', data);
      
=======

      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) throw new Error(error.message);

>>>>>>> 53213e8 (Primeiro commit da nova versão do projeto)
      setStatus({
        subscribed: data.subscribed,
        planType: data.planType,
        planExpiryDate: data.planExpiryDate,
        isLoading: false,
<<<<<<< HEAD
        error: null
      });
    } catch (err) {
      console.error('Erro ao verificar assinatura:', err);
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Erro desconhecido ao verificar assinatura'
      }));
=======
        error: null,
      });
    } catch (err) {
      console.error('Erro ao verificar assinatura:', err);
      setStatus({
        subscribed: user.planType === 'pro',
        planType: user.planType || 'free',
        planExpiryDate: null,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Erro desconhecido ao verificar assinatura',
      });
>>>>>>> 53213e8 (Primeiro commit da nova versão do projeto)
    }
  };

  const createCheckoutSession = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
<<<<<<< HEAD
      
      if (error) {
        throw new Error(error.message);
      }
      
=======
      if (error) throw new Error(error.message);

>>>>>>> 53213e8 (Primeiro commit da nova versão do projeto)
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (err) {
      console.error('Erro ao criar sessão de checkout:', err);
      toast({
        title: 'Erro ao iniciar checkout',
        description: err instanceof Error ? err.message : 'Não foi possível iniciar o processo de pagamento',
<<<<<<< HEAD
        variant: 'destructive'
=======
        variant: 'destructive',
>>>>>>> 53213e8 (Primeiro commit da nova versão do projeto)
      });
    }
  };

  const openCustomerPortal = async () => {
    try {
<<<<<<< HEAD
      console.log('Abrindo portal do cliente...');
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      console.log('Resposta do portal:', { data, error });
      
      if (error) {
        throw new Error(`Erro na função: ${error.message}`);
      }
      
      if (data?.error) {
        throw new Error(`Erro do Stripe: ${data.error}`);
      }
      
      if (data?.url) {
        console.log('Redirecionando para:', data.url);
        window.location.href = data.url;
      } else {
        throw new Error('URL do portal não retornada na resposta');
      }
    } catch (err) {
      console.error('Erro completo ao abrir portal do cliente:', err);
      toast({
        title: 'Erro ao abrir portal de gerenciamento',
        description: err instanceof Error ? err.message : 'Não foi possível abrir o portal de gerenciamento. Verifique se a chave do Stripe está configurada.',
        variant: 'destructive'
=======
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw new Error(`Erro na função: ${error.message}`);
      if (data?.error) throw new Error(`Erro do Stripe: ${data.error}`);
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL do portal não retornada');
      }
    } catch (err) {
      console.error('Erro ao abrir portal do cliente:', err);
      toast({
        title: 'Erro ao abrir portal de gerenciamento',
        description: err instanceof Error ? err.message : 'Não foi possível abrir o portal de gerenciamento.',
        variant: 'destructive',
>>>>>>> 53213e8 (Primeiro commit da nova versão do projeto)
      });
    }
  };

<<<<<<< HEAD
  // Check subscription status on mount and when user changes
  useEffect(() => {
    const checkAndUpdateStatus = async () => {
      await checkSubscription();
    };
    
    // Check immediately on mount
    if (user) {
      checkAndUpdateStatus();
    } else {
      setStatus({
        subscribed: false,
        planType: 'free',
        planExpiryDate: null,
        isLoading: false,
        error: null
      });
    }
    
    // Set up polling every 5 minutes instead of 30 seconds
    const intervalId = setInterval(() => {
      if (user && !status.isLoading) {
        checkAndUpdateStatus();
      }
    }, 300000); // 5 minutes
    
    return () => clearInterval(intervalId);
  }, [user?.id]); // Só reexecuta quando o ID do usuário muda

  // Verificar parâmetros na URL após retorno do checkout
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const checkoutStatus = queryParams.get('checkout');
    
=======
  // ✅ Sempre que o usuário mudar, recarrega a assinatura
  useEffect(() => {
    checkSubscription();
  }, [user?.id]);

  // ♻️ Atualiza assinatura a cada 5 minutos
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (user && !status.isLoading) {
        checkSubscription();
      }
    }, 300000); // 5 minutos

    return () => clearInterval(intervalId);
  }, [user, status.isLoading]);

  // ✅ Revalida após checkout
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const checkoutStatus = queryParams.get('checkout');

>>>>>>> 53213e8 (Primeiro commit da nova versão do projeto)
    if (checkoutStatus === 'success') {
      toast({
        title: 'Pagamento processado com sucesso!',
        description: 'Sua assinatura está sendo ativada. Aguarde alguns instantes.',
      });
<<<<<<< HEAD
      
      // Remover query param da URL sem recarregar a página
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Verificar status da assinatura após um curto delay
=======

      window.history.replaceState({}, document.title, window.location.pathname);

>>>>>>> 53213e8 (Primeiro commit da nova versão do projeto)
      setTimeout(() => {
        checkSubscription();
      }, 2000);
    } else if (checkoutStatus === 'cancelled') {
      toast({
        title: 'Checkout cancelado',
        description: 'Você cancelou o processo de checkout.',
      });
<<<<<<< HEAD
      
      // Remover query param da URL sem recarregar a página
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
=======

      window.history.replaceState({}, document.title, window.location.pathname);
>>>>>>> 53213e8 (Primeiro commit da nova versão do projeto)
    }
  }, []);

  return {
    ...status,
    checkSubscription,
    createCheckoutSession,
    openCustomerPortal,
  };
};

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

  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    planType: 'free',
    planExpiryDate: null,
    isLoading: true,
    error: null,
  });

  const checkSubscription = async () => {
    if (!user) {
      setStatus({
        subscribed: false,
        planType: 'free',
        planExpiryDate: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) throw new Error(error.message);

      setStatus({
        subscribed: data.subscribed,
        planType: data.planType,
        planExpiryDate: data.planExpiryDate,
        isLoading: false,
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
    }
  };

  const createCheckoutSession = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      if (error) throw new Error(error.message);

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
        variant: 'destructive',
      });
    }
  };

  const openCustomerPortal = async () => {
    try {
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
      });
    }
  };

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

    if (checkoutStatus === 'success') {
      toast({
        title: 'Pagamento processado com sucesso!',
        description: 'Sua assinatura está sendo ativada. Aguarde alguns instantes.',
      });

      window.history.replaceState({}, document.title, window.location.pathname);

      setTimeout(() => {
        checkSubscription();
      }, 2000);
    } else if (checkoutStatus === 'cancelled') {
      toast({
        title: 'Checkout cancelado',
        description: 'Você cancelou o processo de checkout.',
      });

      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return {
    ...status,
    checkSubscription,
    createCheckoutSession,
    openCustomerPortal,
  };
};

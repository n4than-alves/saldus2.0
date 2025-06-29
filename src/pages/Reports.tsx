import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import AppLayout from '@/components/layouts/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { RefreshCw, Lock, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/use-subscription';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react'; // Importar o ícone de loader

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

interface CategoryData {
  name: string;
  value: number;
}

interface TopMonth {
  month: string;
  profit: number;
  income: number;
  expense: number;
}

const Reports = () => {
  const { user } = useAuth();
  const { planType, loading: subscriptionLoading } = useSubscription();

  const [loading, setLoading] = useState(true); // Para o carregamento dos dados dos relatórios
  const [refreshing, setRefreshing] = useState(false); // Para atualizações subsequentes
  const [authAndSubscriptionLoaded, setAuthAndSubscriptionLoaded] = useState(false);
  const [initialLoadSpinner, setInitialLoadSpinner] = useState(true); // NOVO: Estado para o spinner inicial de 2 segundos

  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [monthlyDataPro, setMonthlyDataPro] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [topMonths, setTopMonths] = useState<TopMonth[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];

  const formatTooltipValue = (value: number) => {
    return formatCurrency(value);
  };

  // useEffect para gerenciar o carregamento inicial de autenticação/assinatura
  useEffect(() => {
    if (user !== undefined && !subscriptionLoading) {
      setAuthAndSubscriptionLoaded(true);
    } else if (user === null && !subscriptionLoading) {
      setAuthAndSubscriptionLoaded(true);
    }
  }, [user, subscriptionLoading]);

  // NOVO useEffect para controlar o spinner inicial de 2 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoadSpinner(false);
    }, 1000); // Exibe o spinner por 2 segundos

    // Limpa o timer se o componente for desmontado antes dos 2 segundos
    return () => clearTimeout(timer);
  }, []); // Executa apenas uma vez na montagem do componente

  const fetchReportsData = useCallback(async (isRefresh = false) => {
    // Só tenta buscar dados se a autenticação e assinatura já foram carregadas E o spinner inicial terminou
    if (!authAndSubscriptionLoaded || initialLoadSpinner) {
      return;
    }

    if (!user) {
      setMonthlyData([]);
      setMonthlyDataPro([]);
      setCategoryData([]);
      setTopMonths([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      if (monthlyData.length === 0 && monthlyDataPro.length === 0 && categoryData.length === 0 && topMonths.length === 0) {
        setLoading(true);
      }
    }

    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;

      const today = new Date();
      const isProUser = user?.planType === 'pro' || planType === 'pro';

      const tempMonthlyDataMap = new Map<string, { income: number; expense: number }>();
      const tempMonthlyDataMapPro = new Map<string, { income: number; expense: number }>();

      for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthYear = date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
        tempMonthlyDataMap.set(monthYear, { income: 0, expense: 0 });
      }

      if (isProUser) {
        for (let i = 11; i >= 0; i--) {
          const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const monthYear = date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
          tempMonthlyDataMapPro.set(monthYear, { income: 0, expense: 0 });
        }
      }

      transactions?.forEach(transaction => {
        const dateParts = transaction.date.split('-');
        const transactionDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
        const monthYear = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), 1)
          .toLocaleString('pt-BR', { month: 'short', year: '2-digit' });

        const currentMonthData = tempMonthlyDataMap.get(monthYear);
        if (currentMonthData) {
          if (transaction.type === 'income') currentMonthData.income += transaction.amount;
          if (transaction.type === 'expense') currentMonthData.expense += transaction.amount;
          tempMonthlyDataMap.set(monthYear, currentMonthData);
        }

        if (isProUser) {
          const currentMonthDataPro = tempMonthlyDataMapPro.get(monthYear);
          if (currentMonthDataPro) {
            if (transaction.type === 'income') currentMonthDataPro.income += transaction.amount;
            if (transaction.type === 'expense') currentMonthDataPro.expense += transaction.amount;
            tempMonthlyDataMapPro.set(monthYear, currentMonthDataPro);
          }
        }
      });

      const tempCategoryDataMap = new Map<string, number>();
      transactions?.forEach(transaction => {
        const dateParts = transaction.date.split('-');
        const transactionDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));

        if (
          transaction.type === 'expense' &&
          transactionDate.getMonth() === today.getMonth() &&
          transactionDate.getFullYear() === today.getFullYear()
        ) {
          const category = transaction.category || 'Outro';
          const currentAmount = tempCategoryDataMap.get(category) || 0;
          tempCategoryDataMap.set(category, currentAmount + transaction.amount);
        }
      });

      // MODIFIED: Ensure month name is included in the MonthlyData objects
      setMonthlyData(Array.from(tempMonthlyDataMap.entries()).map(([month, data]) => ({ month, ...data })));
      setCategoryData(Array.from(tempCategoryDataMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6));

      if (isProUser) {
        // MODIFIED: Ensure month name is included in the MonthlyData objects for Pro data
        const monthlyDataArrayPro: MonthlyData[] = Array.from(tempMonthlyDataMapPro.entries()).map(([month, data]) => ({ month, ...data }));
        setMonthlyDataPro(monthlyDataArrayPro);

        const topMonthsData: TopMonth[] = monthlyDataArrayPro
          .map(data => ({
            month: data.month, // This will now correctly have the month string
            profit: data.income - data.expense,
            income: data.income,
            expense: data.expense
          }))
          .sort((a, b) => b.profit - a.profit)
          .slice(0, 3);
        setTopMonths(topMonthsData);
      } else {
        setMonthlyDataPro([]);
        setTopMonths([]);
      }

    } catch (error) {
      console.error('Erro ao buscar dados dos relatórios:', error);
      toast({
        title: 'Erro ao carregar relatórios',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, planType, monthlyData, monthlyDataPro, categoryData, topMonths, authAndSubscriptionLoaded, initialLoadSpinner]);

  const handleRefresh = () => fetchReportsData(true);

  // Efeito para a carga inicial dos dados dos relatórios, APÓS a autenticação e assinatura serem resolvidas
  useEffect(() => {
    if (authAndSubscriptionLoaded && !initialLoadSpinner) { // NOVO: Só busca dados se o spinner inicial terminou
      fetchReportsData();
    }
  }, [authAndSubscriptionLoaded, initialLoadSpinner, fetchReportsData]);

  // Efeito para atualizações em tempo real do Supabase
  useEffect(() => {
    if (!user || !authAndSubscriptionLoaded || initialLoadSpinner) return; // NOVO: Não ativa se o spinner inicial está ativo

    const channel = supabase
      .channel('reports-transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          if (!loading && !refreshing) {
            fetchReportsData(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loading, refreshing, authAndSubscriptionLoaded, initialLoadSpinner, fetchReportsData]);

  // Efeito para atualização ao focar na janela
  useEffect(() => {
    const handleFocus = () => {
      if (document.visibilityState === 'visible' && user && !loading && !refreshing && authAndSubscriptionLoaded && !initialLoadSpinner) {
        fetchReportsData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loading, refreshing, user, authAndSubscriptionLoaded, initialLoadSpinner, fetchReportsData]);

  // Renderização condicional: Mostra o spinner inicial ou o conteúdo
  if (initialLoadSpinner) {
    return (
      <AppLayout>
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-saldus-600" />
        </div>
      </AppLayout>
    );
  }

  // Se o authAndSubscriptionLoaded ainda não terminou, mostra esqueletos gerais
  if (!authAndSubscriptionLoaded) {
    return (
      <AppLayout>
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-6 w-64" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <Skeleton className="h-40 w-full mb-6" />
        <div className="grid gap-6">
          <Skeleton className="h-80 w-full" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </AppLayout>
    );
  }

  // Renderização normal dos relatórios
  return (
    <AppLayout>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>
          <p className="text-gray-500">
            Visualize dados financeiros e análises dos seus gastos
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </div>

      {/* CTA para upgrade - Free Plan */}
      {user && (user.planType !== 'pro' && planType !== 'pro') && (
        <Card className="mb-6 border-2 border-saldus-600/20 bg-gradient-to-r from-saldus-50 to-blue-50">
          <CardContent className="flex flex-col md:flex-row items-center justify-between p-6 space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <Crown className="h-8 w-8 text-saldus-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Desbloqueie Relatórios Avançados</h3>
                <p className="text-sm text-gray-600">
                  Compare 12 meses, veja os melhores meses e muito mais!
                </p>
              </div>
            </div>
            <Button
              className="bg-saldus-600 hover:bg-saldus-700"
              onClick={() => navigate('/settings')}
            >
              Upgrade para Pro - R$80/mês
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {/* Gráfico de Comparação Mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 Comparação Mensal
              {user && (user.planType !== 'pro' && planType !== 'pro') && (
                <Badge variant="outline" className="ml-2">
                  <Lock className="mr-1 h-3 w-3" />
                  Últimos 6 meses
                </Badge>
              )}
              {user && (user.planType === 'pro' || planType === 'pro') && (
                <Badge variant="default" className="ml-2 bg-saldus-600">
                  <Crown className="mr-1 h-3 w-3" />
                  Últimos 12 meses
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Receitas vs Despesas {(user?.planType === 'pro' || planType === 'pro') ? 'nos últimos 12 meses' : 'nos últimos 6 meses'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-80 w-full" />
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(user?.planType === 'pro' || planType === 'pro') ? monthlyDataPro : monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      fontSize={12}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                      fontSize={12}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value: number) => formatTooltipValue(value)}
                      labelStyle={{ fontSize: '12px' }}
                      contentStyle={{ fontSize: '12px' }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                    <Bar dataKey="income" fill="#10b981" name="Receitas" />
                    <Bar dataKey="expense" fill="#ef4444" name="Despesas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Gráfico de Pizza - Categorias */}
          <Card>
            <CardHeader>
              <CardTitle>🥧 Despesas por Categoria</CardTitle>
              <CardDescription>Gastos do mês atual</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : categoryData.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-gray-500">
                  Nenhum dado disponível para o mês atual
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={60}
                        fill={COLORS[0]}
                        dataKey="value"
                        fontSize={10}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatTooltipValue(value)}
                        contentStyle={{ fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top 3 Meses - Apenas Pro */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🏆 Top 3 Melhores Meses
                {user && (user.planType !== 'pro' && planType !== 'pro') ? (
                  <Badge variant="outline">
                    <Lock className="mr-1 h-3 w-3" />
                    Pro
                  </Badge>
                ) : (
                  <Badge className="bg-saldus-600">
                    <Crown className="mr-1 h-3 w-3" />
                    Pro
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Meses com maior lucro</CardDescription>
            </CardHeader>
            <CardContent>
              {user && (user.planType !== 'pro' && planType !== 'pro') ? (
                <div className="flex h-64 flex-col items-center justify-center text-center text-gray-500">
                  <Lock className="mb-4 h-12 w-12" />
                  <p className="mb-2 font-medium">Funcionalidade Premium</p>
                  <p className="text-sm">
                    Upgrade para ver os melhores meses e análises avançadas
                  </p>
                  <Button
                    size="sm"
                    className="mt-4 bg-saldus-600 hover:bg-saldus-700"
                    onClick={() => navigate('/settings')}
                  >
                    Fazer Upgrade
                  </Button>
                </div>
              ) : loading ? (
                <Skeleton className="h-64 w-full" />
              ) : topMonths.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-gray-500">
                  Dados insuficientes para análise
                </div>
              ) : (
                <div className="space-y-3">
                  {topMonths.map((month, index) => (
                    <div key={month.month} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${
                            index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-600'
                          }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{month.month}</p> {/* This will now correctly display the month name */}
                          <p className="text-sm text-gray-500">
                            Receitas: {formatCurrency(month.income)} - Despesas: {formatCurrency(month.expense)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${month.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(month.profit)}
                        </p>
                        <p className="text-xs text-gray-500">lucro</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Reports;
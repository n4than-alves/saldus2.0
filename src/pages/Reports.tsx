import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import AppLayout from '@/components/layouts/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  ChartLegend, 
  ChartLegendContent 
} from '@/components/ui/chart';

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

interface CategoryData {
  name: string;
  value: number;
}

const Reports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const { toast } = useToast();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];

  const formatTooltipValue = (value: number) => {
    return formatCurrency(value);
  };

  const fetchReportsData = async (isRefresh = false) => {
    if (!user) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Buscar todas as transações do usuário (remover filtro de data)
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;

      console.log('Transações carregadas:', transactions);

      const monthlyDataMap = new Map<string, { income: number; expense: number }>();
      const categoryDataMap = new Map<string, number>();

      // Inicializar os últimos 6 meses com zero
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(today.getMonth() - i);
        const monthYear = date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
        monthlyDataMap.set(monthYear, { income: 0, expense: 0 });
      }

      // Processar transações
      transactions?.forEach(transaction => {
        const date = new Date(transaction.date);
        const monthYear = date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });

        // Só incluir nos gráficos mensais se estiver nos últimos 6 meses
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 5);
        
        if (date >= sixMonthsAgo) {
          const currentMonthData = monthlyDataMap.get(monthYear) || { income: 0, expense: 0 };

          if (transaction.type === 'income') {
            currentMonthData.income += transaction.amount;
          } else if (transaction.type === 'expense') {
            currentMonthData.expense += transaction.amount;
          }

          monthlyDataMap.set(monthYear, currentMonthData);
        }

        // Para o gráfico de categorias, incluir todas as despesas
        if (transaction.type === 'expense') {
          const category = transaction.category || 'Outro';
          const currentAmount = categoryDataMap.get(category) || 0;
          categoryDataMap.set(category, currentAmount + transaction.amount);
        }
      });

      console.log('Dados mensais processados:', Array.from(monthlyDataMap));
      console.log('Dados de categoria processados:', Array.from(categoryDataMap));

      const monthlyDataArray: MonthlyData[] = Array.from(monthlyDataMap).map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense
      }));

      const categoryDataArray: CategoryData[] = Array.from(categoryDataMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6); // Aumentar para 6 categorias

      setMonthlyData(monthlyDataArray);
      setCategoryData(categoryDataArray);

    } catch (error) {
      console.error('Erro ao buscar dados dos relatórios:', error);
        toast({
          title: 'Erro ao carregar relatórios',
          description: 'Tente novamente mais tarde.',
          variant: 'destructive',
        });
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    fetchReportsData(true);
  };

  useEffect(() => {
    fetchReportsData();
  }, [user, toast]);

  // Escutar mudanças em tempo real nas transações
  useEffect(() => {
    if (!user) return;

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
        (payload) => {
          console.log('Mudança detectada nas transações:', payload);
          // Recarregar dados quando houver mudanças
          fetchReportsData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Recarregar dados quando a página for focada (usuário voltar de outra aba/página)
  useEffect(() => {
    const handleFocus = () => {
      if (!loading && !refreshing) {
        fetchReportsData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loading, refreshing, user, toast]);

  return (
    <AppLayout>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>
          <p className="text-gray-500">
            Visualize os dados financeiros da sua conta
          </p>
        </div>
        <Button 
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2 bg-saldus-600 hover:bg-saldus-700"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Gráfico de Barras - Receitas x Despesas por Mês */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Receitas x Despesas por Mês</CardTitle>
            <CardDescription>
              Comparativo dos últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 30,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value)} 
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      formatCurrency(value as number), 
                      name === 'income' ? 'Receitas' : name === 'expense' ? 'Despesas' : name
                    ]}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Receitas" fill="#4CAF50" />
                  <Bar dataKey="expense" name="Despesas" fill="#F44336" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Pizza - Distribuição de Despesas por Categoria */}
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
            <CardDescription>
              Distribuição das suas despesas
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[500px] flex items-center justify-center p-6">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={160}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-500">
                Nenhuma despesa registrada para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Reports;

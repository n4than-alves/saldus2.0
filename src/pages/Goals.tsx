import { useEffect, useState, useCallback } from 'react'; // Adicionado useCallback
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import AppLayout from '@/components/layouts/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';
import { 
Target, 
Plus, 
TrendingUp, 
TrendingDown, 
DollarSign, 
AlertTriangle, 
CheckCircle, 
XCircle,
Lightbulb,
Loader2 // Importar o ícone de loader
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/use-subscription';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton'; // Importar Skeleton para o loading de auth/subscription

interface Goal {
id?: string;
user_id: string;
type: 'income' | 'expense' | 'profit';
category?: string;
target_amount: number;
current_amount: number;
period: 'monthly' | 'yearly';
description: string;
created_at?: string;
}

interface MonthlyStats {
totalIncome: number;
totalExpense: number;
totalProfit: number;
expensesByCategory: Record<string, number>;
}

const Goals = () => {
const { user } = useAuth();
const { toast } = useToast();
const navigate = useNavigate();
const { planType, loading: subscriptionLoading } = useSubscription(); // Renomeado para 'loading' para evitar conflito

const [goals, setGoals] = useState<Goal[]>([]);
const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
totalIncome: 0,
totalExpense: 0,
totalProfit: 0,
expensesByCategory: {}
});
const [availableCategories, setAvailableCategories] = useState<string[]>([]);
const [loading, setLoading] = useState(true); // Para o carregamento dos dados das metas
const [isDialogOpen, setIsDialogOpen] = useState(false);
const [newGoal, setNewGoal] = useState<Partial<Goal>>({
type: 'income',
period: 'monthly',
target_amount: 0,
description: ''
});

const [initialLoadSpinner, setInitialLoadSpinner] = useState(true); // NOVO: Estado para o spinner inicial de 2 segundos
const [authAndSubscriptionLoaded, setAuthAndSubscriptionLoaded] = useState(false); // NOVO: Estado para controle de autenticação e assinatura

// NOVO useEffect para controlar o spinner inicial de 2 segundos
useEffect(() => {
const timer = setTimeout(() => {
setInitialLoadSpinner(false);
}, 1500); // Exibe o spinner por 1 segundos

// Limpa o timer se o componente for desmontado antes dos 2 segundos
return () => clearTimeout(timer);
}, []); // Executa apenas uma vez na montagem do componente

// NOVO useEffect para gerenciar o carregamento inicial de autenticação/assinatura
useEffect(() => {
if (user !== undefined && !subscriptionLoading) {
setAuthAndSubscriptionLoaded(true);
} else if (user === null && !subscriptionLoading) {
setAuthAndSubscriptionLoaded(true);
}
}, [user, subscriptionLoading]);


const fetchGoals = useCallback(async () => { // Adicionado useCallback
if (!user || !authAndSubscriptionLoaded || initialLoadSpinner) return; // Nova condição

try {
const { data, error } = await supabase
.from('goals')
.select('*')
.eq('user_id', user.id)
.order('created_at', { ascending: false });

if (error) throw error;
setGoals(data || []);
} catch (error) {
console.error('Erro ao buscar metas:', error);
toast({
title: 'Erro ao carregar metas',
description: 'Tente novamente mais tarde.',
variant: 'destructive',
});
}
}, [user, authAndSubscriptionLoaded, initialLoadSpinner, toast]); // Dependências do useCallback

const fetchAvailableCategories = useCallback(async () => { // Adicionado useCallback
if (!user || !authAndSubscriptionLoaded || initialLoadSpinner) return; // Nova condição

try {
const { data: transactions, error } = await supabase
.from('transactions')
.select('category')
.eq('user_id', user.id)
.eq('type', 'expense')
.not('category', 'is', null);

if (error) throw error;

const categories = [...new Set(transactions?.map(t => t.category).filter(Boolean))] as string[];
setAvailableCategories(categories.sort());
} catch (error) {
console.error('Erro ao buscar categorias:', error);
}
}, [user, authAndSubscriptionLoaded, initialLoadSpinner]); // Dependências do useCallback

const fetchMonthlyStats = useCallback(async () => { // Adicionado useCallback
if (!user || !authAndSubscriptionLoaded || initialLoadSpinner) return; // Nova condição

try {
const currentMonth = new Date().getMonth() + 1;
const currentYear = new Date().getFullYear();
const startDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
const endDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`;

const { data: transactions, error } = await supabase
.from('transactions')
.select('*')
.eq('user_id', user.id)
.gte('date', startDate)
.lte('date', endDate);

if (error) throw error;

let totalIncome = 0;
let totalExpense = 0;
const expensesByCategory: Record<string, number> = {};

transactions?.forEach(transaction => {
if (transaction.type === 'income') {
totalIncome += transaction.amount;
} else if (transaction.type === 'expense') {
totalExpense += transaction.amount;
const category = transaction.category || 'Outros';
expensesByCategory[category] = (expensesByCategory[category] || 0) + transaction.amount;
}
});

const stats = {
totalIncome,
totalExpense,
totalProfit: totalIncome - totalExpense,
expensesByCategory
};
setMonthlyStats(stats);
} catch (error) {
console.error('Erro ao buscar estatísticas:', error);
}
}, [user, authAndSubscriptionLoaded, initialLoadSpinner]); // Dependências do useCallback

const createGoal = async () => {
// A validação de usuário e isProUser já acontece no nível de renderização
if (!newGoal.type || !newGoal.target_amount) {
toast({
title: 'Campos obrigatórios',
description: 'Preencha o tipo e valor da meta.',
variant: 'destructive',
});
return;
}

try {
const { error } = await supabase
.from('goals')
.insert([{
user_id: user!.id, // user já garantido por `isProUser` e `authAndSubscriptionLoaded`
type: newGoal.type,
category: newGoal.category === 'all' ? null : newGoal.category,
target_amount: newGoal.target_amount,
current_amount: 0,
period: newGoal.period,
description: newGoal.description || `Meta de ${newGoal.type === 'income' ? 'receita' : newGoal.type === 'expense' ? 'despesa' : 'lucro'}`
}]);

if (error) throw error;

toast({
title: 'Meta criada com sucesso!',
description: 'Sua nova meta foi adicionada.',
});

setIsDialogOpen(false);
setNewGoal({
type: 'income',
period: 'monthly',
target_amount: 0,
description: ''
});
fetchGoals(); // Chamar fetchGoals para atualizar a lista
} catch (error) {
console.error('Erro ao criar meta:', error);
toast({
title: 'Erro ao criar meta',
description: 'Tente novamente mais tarde.',
variant: 'destructive',
});
}
};

const deleteGoal = async (goalId: string) => {
try {
const { error } = await supabase
.from('goals')
.delete()
.eq('id', goalId);

if (error) throw error;

toast({
title: 'Meta excluída',
description: 'Meta removida com sucesso.',
});

fetchGoals(); // Chamar fetchGoals para atualizar a lista
} catch (error) {
console.error('Erro ao excluir meta:', error);
toast({
title: 'Erro ao excluir meta',
description: 'Tente novamente mais tarde.',
variant: 'destructive',
});
}
};

const calculateProgress = (goal: Goal) => {
let current = 0;

switch (goal.type) {
case 'income':
current = monthlyStats.totalIncome;
break;
case 'expense':
if (goal.category) {
current = monthlyStats.expensesByCategory[goal.category] || 0;
} else {
current = monthlyStats.totalExpense;
}
break;
case 'profit':
current = monthlyStats.totalProfit;
break;
}

const percentage = goal.target_amount > 0 ? (current / goal.target_amount) * 100 : 0;
return { current, percentage: Math.min(percentage, 100) };
};

const getProgressColor = (percentage: number, type: 'income' | 'expense' | 'profit') => {
if (type === 'expense') {
if (percentage <= 50) return 'bg-green-500';
if (percentage <= 85) return 'bg-yellow-500';
return 'bg-red-500';
} else {
if (percentage <= 50) return 'bg-red-500';
if (percentage <= 85) return 'bg-yellow-500';
return 'bg-green-500';
}
};

const getRecommendations = () => {
const recommendations = [];
const currentMonthName = new Date().toLocaleString('pt-BR', { month: 'long' });

// 1. Análise de Despesas por Categoria
const categoryExpenses = Object.entries(monthlyStats.expensesByCategory)
.sort(([,a], [,b]) => b - a);

if (monthlyStats.totalExpense > 0 && categoryExpenses.length > 0) {
const [topCategory, topAmount] = categoryExpenses[0];
const topCategoryPercentage = (topAmount / monthlyStats.totalExpense) * 100;

if (topCategoryPercentage >= 40) {
recommendations.push(`🚨 Atenção: "${topCategory}" representa **${topCategoryPercentage.toFixed(0)}%** (${formatCurrency(topAmount)}) de suas despesas este mês. Que tal explorar alternativas para economizar nesta categoria?`);
} else if (topCategoryPercentage >= 25) {
recommendations.push(`💡 Dica: A categoria "${topCategory}" é sua maior despesa este mês (${topCategoryPercentage.toFixed(0)}%). Um pequeno corte aqui pode gerar grande impacto!`);
}
}

// 2. Análise de Lucro/Prejuízo Mensal
if (monthlyStats.totalProfit < 0) {
recommendations.push(`🔴 Cuidado: Suas despesas estão **${formatCurrency(Math.abs(monthlyStats.totalProfit))}** acima das receitas este mês. Priorize pagar dívidas e reveja seus gastos urgentes. `);
} else if (monthlyStats.totalProfit < monthlyStats.totalIncome * 0.1) {
recommendations.push(`📉 Melhore seu Lucro: Seu lucro de **${formatCurrency(monthlyStats.totalProfit)}** representa apenas **${((monthlyStats.totalProfit / monthlyStats.totalIncome) * 100).toFixed(0)}%** da sua receita. Tente aumentar suas receitas ou reduzir despesas desnecessárias.`);
} else if (monthlyStats.totalProfit >= monthlyStats.totalIncome * 0.25) {
recommendations.push(`✅ Excelente Lucro! Você teve um lucro de **${formatCurrency(monthlyStats.totalProfit)}** este mês. Considere direcionar parte desse valor para investimentos ou sua reserva de emergência.`);
}


// 3. Recomendações baseadas nas Metas
goals.forEach(goal => {
const { current, percentage } = calculateProgress(goal);
const remaining = goal.target_amount - current;

if (goal.type === 'expense') {
if (percentage >= 100) {
recommendations.push(`🛑 Meta "${goal.description}" atingida! Você gastou ${formatCurrency(current)} de uma meta de ${formatCurrency(goal.target_amount)}. Considere reavaliar seus hábitos nesta área.`);
} else if (percentage >= 85) {
recommendations.push(`⚠️ Quase lá! Você já usou **${percentage.toFixed(0)}%** do orçamento da meta "${goal.description}". Restam apenas ${formatCurrency(remaining)}. Mantenha o foco para não estourar!`);
} else if (percentage < 50 && current > 0) {
recommendations.push(`👍 Bom ritmo: Você utilizou **${percentage.toFixed(0)}%** do orçamento da meta "${goal.description}". Continue monitorando para manter os gastos sob controle.`);
} else if (current === 0 && new Date(goal.created_at || '').getMonth() === new Date().getMonth()) {
recommendations.push(`🤔 Meta "${goal.description}": Você ainda não registrou gastos nesta categoria/meta. Comece a registrar para acompanhar seu progresso!`);
}
} else if (goal.type === 'income') {
if (percentage >= 100) {
recommendations.push(`🎉 Parabéns! Você atingiu sua meta de receita "${goal.description}" e gerou ${formatCurrency(current)}! Que tal aumentar a meta para o próximo mês?`);
} else if (percentage >= 75) {
recommendations.push(`🚀 Foco final! Você já alcançou **${percentage.toFixed(0)}%** da meta de receita "${goal.description}". Faltam só ${formatCurrency(remaining)}. Continue assim!`);
} else if (percentage < 50) {
recommendations.push(`💡 Acelere a receita: Para a meta "${goal.description}", você atingiu apenas **${percentage.toFixed(0)}%**. Que tal buscar novas fontes de renda ou revisar seu planejamento?`);
}
} else if (goal.type === 'profit') {
if (percentage >= 100) {
recommendations.push(`🌟 Incrível! Você superou sua meta de lucro "${goal.description}" com **${formatCurrency(current)}**! Sua gestão financeira está no caminho certo.`);
} else if (percentage >= 80) {
recommendations.push(`💪 Quase lá! Sua meta de lucro "${goal.description}" está em **${percentage.toFixed(0)}%**. Mantenha o equilíbrio entre receitas e despesas para chegar ao seu objetivo.`);
} else if (percentage < 50) {
recommendations.push(`📊 Otimize seu lucro: Para a meta "${goal.description}", você atingiu **${percentage.toFixed(0)}%**. Analise onde pode reduzir despesas ou aumentar receitas.`);
}
}
});

    // 4. Dica Geral (Exibe apenas se houver menos de 3 recomendações específicas, para não sobrecarregar)
    if (recommendations.length < 3) {
      recommendations.push(`✨ **Dica Rápida:** Lembre-se de registrar todas as suas transações para ter um panorama completo e preciso das suas finanças neste mês de ${currentMonthName}!`);
    }

return recommendations;
};

// Efeito principal para carregar os dados
useEffect(() => {
const loadAllData = async () => {
// Inicia o loading dos dados da página (metas, stats, categorias)
setLoading(true); 
await Promise.all([fetchGoals(), fetchMonthlyStats(), fetchAvailableCategories()]);
setLoading(false);
};

// Só tenta carregar dados se a autenticação e assinatura estiverem carregadas
// E o spinner inicial já tiver terminado.
if (authAndSubscriptionLoaded && !initialLoadSpinner) {
// Verifica se o usuário é Pro *depois* que os dados de auth/subscription estão carregados
const isProUser = user?.planType === 'pro' || planType === 'pro';
if (user && isProUser) {
loadAllData();
} else if (user && !isProUser) {
// Se não for Pro, limpa os dados e desativa o loading
setGoals([]);
setMonthlyStats({ totalIncome: 0, totalExpense: 0, totalProfit: 0, expensesByCategory: {} });
setAvailableCategories([]);
setLoading(false);
}
}
}, [user, planType, authAndSubscriptionLoaded, initialLoadSpinner, fetchGoals, fetchMonthlyStats, fetchAvailableCategories]);


const recommendations = getRecommendations();

// Ordem de renderização:
// 1. Spinner de 2 segundos (initialLoadSpinner)
// 2. Esqueletos/Loading de Autenticação/Assinatura (authAndSubscriptionLoaded)
// 3. Conteúdo da página (Pro ou Free)

// 1. Renderiza o spinner de carregamento inicial por 2 segundos
if (initialLoadSpinner) {
return (
<AppLayout>
<div className="flex h-full w-full items-center justify-center">
<Loader2 className="h-8 w-8 animate-spin text-saldus-600" /> {/* Spinner menor */}
</div>
</AppLayout>
);
}

// 2. Enquanto o status de autenticação/assinatura não estiver claro, mostra esqueletos gerais
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
<div className="grid gap-6">
<div className="grid gap-4 md:grid-cols-3">
<Skeleton className="h-[120px] w-full" />
<Skeleton className="h-[120px] w-full" />
<Skeleton className="h-[120px] w-full" />
</div>
<Skeleton className="h-80 w-full" />
<Skeleton className="h-60 w-full" />
</div>
</AppLayout>
);
}

// Verificar se é cliente Pro depois que authAndSubscriptionLoaded é true
const isProUser = user?.planType === 'pro' || planType === 'pro';

// 3. Se não for usuário Pro, exibe a mensagem de upgrade
if (!isProUser) {
return (
<AppLayout>
<div className="flex items-center justify-center min-h-[60vh]">
<Card className="w-full max-w-md text-center">
<CardHeader>
<CardTitle className="flex items-center justify-center gap-2">
<Target className="h-8 w-8 text-gray-400" />
Funcionalidade Pro
</CardTitle>
<CardDescription>
As metas financeiras estão disponíveis apenas para clientes Pro
</CardDescription>
</CardHeader>
<CardContent className="space-y-4">
<div className="text-gray-500">
<p>Upgrade para o plano Pro para acessar:</p>
<ul className="mt-2 text-sm space-y-1">
<li>• Metas financeiras personalizadas</li>
<li>• Acompanhamento de progresso</li>
<li>• Recomendações inteligentes</li>
<li>• Análises avançadas</li>
</ul>
</div>
<Button 
className="w-full bg-saldus-600 hover:bg-saldus-700"
onClick={() => navigate('/settings')}
>
Fazer Upgrade para Pro
</Button>
</CardContent>
</Card>
</div>
</AppLayout>
);
}

// 4. Se for usuário Pro e tudo carregou, renderiza o conteúdo normal da página
return (
<AppLayout>
<div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
<div>
<h1 className="text-2xl font-bold text-gray-800">Metas Financeiras</h1>
<p className="text-gray-500">
Defina e acompanhe suas metas financeiras mensais
</p>
</div>
<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
<DialogTrigger asChild>
<Button className="gap-2 bg-saldus-600 hover:bg-saldus-700">
<Plus className="h-4 w-4" />
Nova Meta
</Button>
</DialogTrigger>
<DialogContent>
<DialogHeader>
<DialogTitle>Criar Nova Meta</DialogTitle>
<DialogDescription>
Defina uma meta financeira para acompanhar seu progresso.
</DialogDescription>
</DialogHeader>
<div className="space-y-4">
<div className="space-y-2">
<Label htmlFor="description">Descrição da Meta (Opcional)</Label>
<Input
id="description"
placeholder="Ex: Economizar para viagem"
value={newGoal.description || ''}
onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
/>
</div>

<div className="space-y-2">
<Label>Tipo de Meta</Label>
<Select 
value={newGoal.type} 
onValueChange={(value: 'income' | 'expense' | 'profit') => 
setNewGoal({ ...newGoal, type: value })
}
>
<SelectTrigger>
<SelectValue />
</SelectTrigger>
<SelectContent>
<SelectItem value="income">Meta de Receita</SelectItem>
<SelectItem value="expense">Meta de Despesa</SelectItem> {/* Adicionei a opção de despesa aqui */}
<SelectItem value="profit">Meta de Lucro</SelectItem>
</SelectContent>
</Select>
</div>

{newGoal.type === 'expense' && ( // Campo de categoria apenas para meta de despesa
<div className="space-y-2">
<Label>Categoria (Opcional)</Label>
<Select 
value={newGoal.category || 'all'} 
onValueChange={(value) => setNewGoal({ ...newGoal, category: value === 'all' ? undefined : value })}
>
<SelectTrigger>
<SelectValue placeholder="Todas as Categorias" />
</SelectTrigger>
<SelectContent>
<SelectItem value="all">Todas as Categorias</SelectItem>
{availableCategories.map(cat => (
<SelectItem key={cat} value={cat}>{cat}</SelectItem>
))}
</SelectContent>
</Select>
</div>
)}


<div className="space-y-2">
<Label htmlFor="target">Valor da Meta</Label>
<Input
id="target"
type="number"
placeholder="0,00"
value={newGoal.target_amount}
onChange={(e) => setNewGoal({ ...newGoal, target_amount: Number(e.target.value) })}
/>
</div>

<div className="space-y-2">
<Label>Período</Label>
<Select 
value={newGoal.period} 
onValueChange={(value: 'monthly' | 'yearly') => 
setNewGoal({ ...newGoal, period: value })
}
>
<SelectTrigger>
<SelectValue />
</SelectTrigger>
<SelectContent>
<SelectItem value="monthly">Mensal</SelectItem>
<SelectItem value="yearly">Anual</SelectItem>
</SelectContent>
</Select>
</div>

<Button onClick={createGoal} className="w-full">
Criar Meta
</Button>
</div>
</DialogContent>
</Dialog>
</div>

<div className="grid gap-6">
{/* Resumo do Mês */}
<div className="grid gap-4 md:grid-cols-3">
{loading ? ( // Adicionado Skeleton para o resumo do mês
<>
<Skeleton className="h-[120px] w-full" />
<Skeleton className="h-[120px] w-full" />
<Skeleton className="h-[120px] w-full" />
</>
) : (
<>
<Card>
<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
<CardTitle className="text-sm font-medium">Receitas do Mês</CardTitle>
<TrendingUp className="h-4 w-4 text-green-600" />
</CardHeader>
<CardContent>
<div className="text-2xl font-bold text-green-600">
{formatCurrency(monthlyStats.totalIncome)}
</div>
</CardContent>
</Card>

<Card>
<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
<CardTitle className="text-sm font-medium">Despesas do Mês</CardTitle>
<TrendingDown className="h-4 w-4 text-red-600" />
</CardHeader>
<CardContent>
<div className="text-2xl font-bold text-red-600">
{formatCurrency(monthlyStats.totalExpense)}
</div>
</CardContent>
</Card>

<Card>
<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
<CardTitle className="text-sm font-medium">Lucro do Mês</CardTitle>
<DollarSign className="h-4 w-4 text-blue-600" />
</CardHeader>
<CardContent>
<div className={`text-2xl font-bold ${monthlyStats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
{formatCurrency(monthlyStats.totalProfit)}
</div>
</CardContent>
</Card>
</>
)}
</div>

{/* Suas Metas */}
<Card>
<CardHeader>
<CardTitle className="flex items-center gap-2">
<Target className="h-5 w-5" />
Suas Metas
</CardTitle>
<CardDescription>
Acompanhe o progresso das suas metas financeiras
</CardDescription>
</CardHeader>
<CardContent>
{loading ? (
<Skeleton className="h-40 w-full" /> // Esqueleto para a lista de metas
) : goals.length === 0 ? (
<div className="text-center py-8 text-gray-500">
<Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
<p>Nenhuma meta criada ainda</p>
<p className="text-sm">Clique em "Nova Meta" para começar</p>
</div>
) : (
<div className="space-y-4">
{goals.map(goal => {
const { current, percentage } = calculateProgress(goal);
const progressColor = getProgressColor(percentage, goal.type);

return (
<div key={goal.id} className="p-4 border rounded-lg">
<div className="flex items-center justify-between mb-2">
<div className="flex items-center gap-2">
<h3 className="font-semibold">{goal.description}</h3>
<Badge variant="outline">
{goal.type === 'income' ? 'Receita' : 
goal.type === 'expense' ? 'Despesa' : 'Lucro'}
</Badge>
{goal.category && (
<Badge variant="secondary">{goal.category}</Badge>
)}
</div>
<Button
variant="ghost"
size="sm"
onClick={() => goal.id && deleteGoal(goal.id)}
>
<XCircle className="h-4 w-4" />
</Button>
</div>

<div className="space-y-2">
<div className="flex justify-between text-sm">
<span>Progresso: {formatCurrency(current)} / {formatCurrency(goal.target_amount)}</span>
<span>{percentage.toFixed(0)}%</span>
</div>
<div className="w-full bg-gray-200 rounded-full h-2">
<div className={`h-2 rounded-full ${progressColor}`} style={{ width: `${percentage}%` }} />
</div>
</div>

<div className="mt-2 flex items-center gap-2">
{goal.type === 'expense' ? (
percentage <= 85 ? (
<CheckCircle className="h-4 w-4 text-green-500" />
) : (
<AlertTriangle className="h-4 w-4 text-red-500" />
)
) : (
percentage >= 100 ? (
<CheckCircle className="h-4 w-4 text-green-500" />
) : percentage >= 50 ? (
<AlertTriangle className="h-4 w-4 text-yellow-500" />
) : (
<XCircle className="h-4 w-4 text-red-500" />
)
)}
<span className="text-sm text-gray-600">
{goal.type === 'expense' 
? percentage <= 85 
? 'Dentro do orçamento' 
: percentage >= 100 
? 'Orçamento estourado!' 
: 'Atenção ao limite'
: percentage >= 100 
? 'Meta atingida! 🎉' 
: percentage >= 50 
? 'Você está no caminho certo' 
: 'Precisa acelerar o passo'
}
</span>
</div>
</div>
);
})}
</div>
)}
</CardContent>
</Card>

{/* Recomendações Inteligentes */}
{recommendations.length > 0 && (
<Card>
<CardHeader>
<CardTitle className="flex items-center gap-2">
<Lightbulb className="h-5 w-5 text-yellow-500" />
Recomendações Inteligentes
</CardTitle>
<CardDescription>
Insights baseados nos seus dados financeiros
</CardDescription>
</CardHeader>
<CardContent>
{loading ? ( // Esqueleto para as recomendações
<Skeleton className="h-32 w-full" />
) : (
<div className="space-y-3">
{recommendations.map((recommendation, index) => (
<Alert key={index}>
<AlertTriangle className="h-4 w-4" />
<AlertDescription>
{recommendation}
</AlertDescription>
</Alert>
))}
</div>
)}
</CardContent>
</Card>
)}
</div>
</AppLayout>
);
};

export default Goals;
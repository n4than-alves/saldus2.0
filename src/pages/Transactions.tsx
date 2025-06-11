import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Client, Transaction, TransactionWithClient, WeeklyTransactionsLimit } from '@/types';
import AppLayout from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/use-subscription';
import { Plus, Pencil, Trash2, Search, Calendar, ArrowUp, ArrowDown, Loader2, FileText, Crown } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

const transactionSchema = z.object({
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Valor deve ser um número positivo',
  }),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1, 'Categoria é obrigatória'),
  description: z.string().optional(),
  date: z.string(),
  client_id: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

const incomeCategories = [
  'Vendas',
  'Serviços',
  'Assinaturas',
  'Outros',
];

const expenseCategories = [
  'Aluguel',
  'Fornecedores',
  'Salários',
  'Impostos',
  'Marketing',
  'Equipamentos',
  'Manutenção',
  'Outros',
];

const Transactions = () => {
  // ✅ Desestruturando isLoading do useAuth
  const { user, isLoading: isLoadingAuth } = useAuth(); 
  const { toast } = useToast();
  const navigate = useNavigate();
  // ✅ Desestruturando isLoading do useSubscription
  const { planType, isLoading: isLoadingSubscription } = useSubscription();

  const [transactions, setTransactions] = useState<TransactionWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  // ✅ Renomeado para isLoadingData para ser mais específico do carregamento de dados da página
  const [isLoadingData, setIsLoadingData] = useState(true); 
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithClient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weeklyLimit, setWeeklyLimit] = useState<WeeklyTransactionsLimit>({
    count: 0,
    limit: 5,
    canCreate: true,
  });

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: '',
      type: 'income',
      category: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      client_id: 'none',
    },
  });

  const watchType = form.watch('type');

  const loadTransactions = async (userId: string) => { // Aceita userId como argumento
    try {
      let query = supabase
        .from('transactions')
        .select('*, clients(id, name)')
        .eq('user_id', userId) // Usa o userId do argumento
        .order('date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      const transformedData = (data || []).map(transaction => {
        const client = transaction.clients ? {
          id: transaction.clients.id,
          name: transaction.clients.name,
          user_id: userId, // Usa o userId do argumento
          created_at: transaction.created_at || new Date().toISOString(),
          email: undefined,
          phone: undefined
        } : undefined;

        return {
          id: transaction.id,
          user_id: transaction.user_id,
          client_id: transaction.client_id,
          amount: transaction.amount,
          type: transaction.type as 'income' | 'expense',
          category: transaction.category,
          description: transaction.description,
          date: transaction.date,
          created_at: transaction.created_at || new Date().toISOString(),
          client: client
        };
      });

      setTransactions(transformedData as TransactionWithClient[] || []);
    } catch (error: any) {
      console.error('Error loading transactions:', error);
      toast({
        title: 'Erro ao carregar movimentações',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const loadClients = async (userId: string) => { // Aceita userId como argumento
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId) // Usa o userId do argumento
        .order('name');

      if (error) throw error;

      setClients(data || []);
    } catch (error: any) {
      console.error('Error loading clients:', error);
    }
  };

  const checkWeeklyTransactionLimit = async (userId: string, currentPlanType: 'free' | 'pro') => { // Aceita userId e planType
    try {
      if (currentPlanType === 'pro') { // Usa o planType do argumento
        setWeeklyLimit({
          count: 0,
          limit: Infinity,
          canCreate: true
        });
        return;
      }

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId) // Usa o userId do argumento
        .gte('created_at', oneWeekAgo.toISOString());

      if (error) throw error;

      const weeklyLimitValue = 5; // Limite para usuários free
      const canCreate = (count as number) < weeklyLimitValue;

      setWeeklyLimit({
        count: count as number,
        limit: weeklyLimitValue,
        canCreate
      });
    } catch (error) {
      console.error('Error checking weekly limit:', error);
      if (currentPlanType === 'pro') { // Usa o planType do argumento
        setWeeklyLimit({
          count: 0,
          limit: Infinity,
          canCreate: true
        });
      }
    }
  };

  // ✅ useEffect principal para orquestrar o carregamento inicial de TUDO
  useEffect(() => {
    // Só inicia o carregamento dos dados se o usuário e a assinatura
    // terminaram de carregar e o usuário está disponível.
    if (!isLoadingAuth && !isLoadingSubscription) {
      // Se não há usuário, define imediatamente como não carregando e free
      if (!user) {
        setIsLoadingData(false);
        setWeeklyLimit({
          count: 0,
          limit: 5, // Limite free padrão
          canCreate: true // Pode criar até o limite padrão, ou redirecionar para login
        });
        setTransactions([]); // Limpa transações se não há usuário logado
        setClients([]); // Limpa clientes se não há usuário logado
        return;
      }

      // Se há usuário e tudo foi carregado, inicia a busca de dados do componente
      const fetchData = async () => {
        setIsLoadingData(true);
        // Passa o user.id para as funções
        await loadClients(user.id);
        await loadTransactions(user.id);
        await checkWeeklyTransactionLimit(user.id, planType); // Passa user.id e planType
        setIsLoadingData(false);
      };
      fetchData();
    }
  }, [user, isLoadingAuth, planType, isLoadingSubscription]); // Dependências cruciais para re-disparar

  const handleOpenDialog = (transaction?: TransactionWithClient) => {
    // ✅ A validação de limite agora usa o weeklyLimit que já foi atualizado pelo useEffect
    if (planType === 'free' && !weeklyLimit.canCreate && !transaction) {
      toast({
        title: 'Limite de movimentações atingido',
        description: 'Você atingiu o limite de 5 movimentações semanais no plano gratuito. Atualize para o Plano Pro para ter movimentações ilimitadas.',
        variant: 'destructive',
      });
      return;
    }

    if (transaction) {
      setEditingTransaction(transaction);
      form.reset({
        amount: transaction.amount.toString(),
        type: transaction.type as 'income' | 'expense',
        category: transaction.category,
        description: transaction.description,
        date: new Date(transaction.date).toISOString().split('T')[0],
        client_id: transaction.client_id || 'none',
      });
    } else {
      setEditingTransaction(null);
      form.reset({
        amount: '',
        type: 'income',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        client_id: 'none',
      });
    }
    setOpenDialog(true);
  };

  const handleSubmit = async (data: TransactionFormValues) => {
    if (!user) return;

    // Check limit if creating new transaction and user is on free plan
    if (!editingTransaction && planType === 'free' && !weeklyLimit.canCreate) {
      toast({
        title: 'Limite de movimentações atingido',
        description: 'Você atingiu o limite de 5 movimentações semanais no plano gratuito. Atualize para o Plano Pro para ter movimentações ilimitadas.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const transactionData = {
        user_id: user.id,
        amount: parseFloat(data.amount),
        type: data.type,
        category: data.category,
        description: data.description,
        date: data.date, 
        client_id: data.client_id === 'none' ? null : data.client_id,
      };

      if (editingTransaction) {
        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', editingTransaction.id);

        if (error) throw error;

        toast({
          title: 'Movimentação atualizada',
          description: 'A movimentação foi atualizada com sucesso.',
        });
      } else {
        const { error } = await supabase.from('transactions').insert(transactionData);

        if (error) throw error;

        toast({
          title: 'Movimentação adicionada',
          description: 'A movimentação foi adicionada com sucesso.',
        });
      }

      setOpenDialog(false);
      // ✅ Recarrega transações e limite após sucesso na criação/edição
      await loadTransactions(user.id);
      await checkWeeklyTransactionLimit(user.id, planType);
    } catch (error: any) {
      console.error('Error saving transaction:', error);
      toast({
        title: 'Erro ao salvar movimentação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Movimentação removida',
        description: 'A movimentação foi removida com sucesso.',
      });

      // ✅ Recarrega transações e limite após sucesso na exclusão
      await loadTransactions(user.id);
      await checkWeeklyTransactionLimit(user.id, planType);
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      toast({
        title: 'Erro ao remover movimentação',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredTransactions = transactions.filter((transaction) =>
    transaction.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.client?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Enhanced function to export transactions to CSV with proper formatting
  const exportToCSV = () => {
    if (transactions.length === 0) {
      toast({
        title: 'Sem dados para exportar',
        description: 'Não há movimentações para exportar.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // BOM for UTF-8 encoding (helps Excel recognize Portuguese characters)
      const BOM = '\uFEFF';

      // Create CSV header with separator for better Excel compatibility
      let csvContent = BOM + 'sep=;\n'; // Excel separator hint
      csvContent += 'Data;Descricao;Categoria;Cliente;Tipo;Valor (R$);Status\n';

      // Calculate totals for summary
      let totalReceitas = 0;
      let totalDespesas = 0;

      // Add data rows with proper formatting
      filteredTransactions.forEach(transaction => {
        const date = new Date(transaction.date + 'T00:00:00').toLocaleDateString('pt-BR'); // Add T00:00:00 for correct date parsing
        // Remove special characters and properly escape quotes
        const description = `"${transaction.description?.replace(/"/g, '""').normalize("NFD").replace(/[\u0300-\u036f]/g, '')}"`;
        const category = transaction.category.normalize("NFD").replace(/[\u0300-\u036f]/g, '');
        const client = (transaction.client?.name || 'Nao informado').normalize("NFD").replace(/[\u0300-\u036f]/g, '');
        const type = transaction.type === 'income' ? 'RECEITA' : 'DESPESA';
        const amount = transaction.amount.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).replace(',', '.');
        const status = transaction.type === 'income' ? 'ENTRADA' : 'SAIDA';

        // Update totals
        if (transaction.type === 'income') {
          totalReceitas += transaction.amount;
        } else {
          totalDespesas += transaction.amount;
        }

        csvContent += `${date};${description};${category};${client};${type};${amount};${status}\n`;
      });

      // Add summary rows with spacing
      csvContent += '\n'; // Empty line for spacing
      csvContent += ';;;;RESUMO;;\n';
      csvContent += ';;;;Total de Receitas;' + totalReceitas.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).replace(',', '.') + ';\n';
      csvContent += ';;;;Total de Despesas;' + totalDespesas.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).replace(',', '.') + ';\n';
      csvContent += ';;;;Saldo Liquido;' + (totalReceitas - totalDespesas).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).replace(',', '.') + ';\n';
      csvContent += '\n'; // Empty line for spacing
      csvContent += `;;;;Relatorio gerado em;${new Date().toLocaleString('pt-BR')};\n`;

      // Create blob with proper encoding
      const blob = new Blob([csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileName = `Relatorio_Movimentacoes_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Exportação concluída',
        description: `Relatório exportado como "${fileName}". Abra no Excel para visualizar com cores e formatação completa.`,
      });
    } catch (error) {
      console.error('Error exporting transactions:', error);
      toast({
        title: 'Erro na exportação',
        description: 'Ocorreu um erro ao exportar as movimentações.',
        variant: 'destructive',
      });
    }
  };

  // ✅ O estado global de carregamento agora inclui todos os hooks de dados importantes
  const showGlobalLoading = isLoadingAuth || isLoadingSubscription || isLoadingData;

  return (
    <AppLayout>
      {/* CTA para upgrade - Free Plan */}
      {/* ✅ Só mostra o Card se TUDO carregou E o planType não é 'pro' */}
      {!showGlobalLoading && planType !== 'pro' && (
        <Card className="mb-6 border-2 border-saldus-600/20 bg-gradient-to-r from-saldus-50 to-blue-50">
          <CardContent className="flex flex-col md:flex-row items-center justify-between p-6 space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <Crown className="h-8 w-8 text-saldus-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Transações Ilimitadas</h3>
                <p className="text-sm text-gray-600">
                  Remova o limite de 5 transações por semana e adicione quantas quiser!
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

      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Movimentações</h1>
          <p className="text-gray-500">Gerencie suas receitas e despesas</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar movimentações..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button 
            className="gap-1 bg-saldus-600 hover:bg-saldus-700" 
            onClick={exportToCSV}
            // ✅ Desabilita o botão enquanto estiver carregando
            disabled={showGlobalLoading} 
          >
            <FileText className="h-4 w-4" /> Exportar
          </Button>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button 
                className="gap-1 bg-saldus-600 hover:bg-saldus-700" 
                onClick={() => handleOpenDialog()}
                // ✅ Desabilita o botão enquanto estiver carregando ou se o limite for atingido
                disabled={showGlobalLoading || (planType === 'free' && !weeklyLimit.canCreate)}
              >
                <Plus className="h-4 w-4" /> Nova
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingTransaction ? 'Editar Movimentação' : 'Nova Movimentação'}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados da movimentação financeira abaixo.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="income">Receita</SelectItem>
                              <SelectItem value="expense">Despesa</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0,00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {watchType === 'income'
                                ? incomeCategories.map((category) => (
                                    <SelectItem key={category} value={category}>
                                      {category}
                                    </SelectItem>
                                  ))
                                : expenseCategories.map((category) => (
                                    <SelectItem key={category} value={category}>
                                      {category}
                                    </SelectItem>
                                  ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição (opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Descreva a movimentação (opcional)"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="client_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente (opcional)</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um cliente (opcional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setOpenDialog(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : editingTransaction ? (
                        'Atualizar'
                      ) : (
                        'Adicionar'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ✅ Mostra o spinner de carregamento global */}
      {showGlobalLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-saldus-600" />
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {searchQuery
                      ? 'Nenhuma movimentação encontrada para esta busca.'
                      : 'Nenhuma movimentação cadastrada. Adicione sua primeira movimentação!'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="max-w-[200px]">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'rounded-full p-1',
                            transaction.type === 'income'
                              ? 'bg-green-100 text-green-600'
                              : 'bg-red-100 text-red-600'
                          )}
                        >
                          {transaction.type === 'income' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                        <span className="truncate font-medium">
                          {transaction.description}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{transaction.category}</TableCell>
                    <TableCell>
                      {new Date(transaction.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {transaction.client?.name || '-'}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-medium',
                        transaction.type === 'income'
                          ? 'text-green-600'
                          : 'text-red-600'
                      )}
                    >
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(transaction)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Confirmar exclusão
                              </AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogDescription>
                                Tem certeza que deseja excluir esta movimentação?
                                Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-500 hover:bg-red-600"
                                onClick={() => handleDelete(transaction.id)}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </AppLayout>
  );
};

export default Transactions;
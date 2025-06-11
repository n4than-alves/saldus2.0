import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Client } from '@/types';
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
import { useSubscription } from '@/hooks/use-subscription'; // Seu hook de assinatura
import { Plus, Pencil, Trash2, Search, Loader2, Crown } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';

const clientSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email({ message: 'E-mail inválido' }).optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface WeeklyLimit {
  count: number;
  limit: number;
  canCreate: boolean;
}

const Clients = () => {
  const { user, isLoading: isLoadingAuth } = useAuth(); // Status de carregamento da autenticação
  const { toast } = useToast();
  const navigate = useNavigate();
  // ✅ Agora estamos desestruturando 'isLoading' diretamente do useSubscription
  const { planType, isLoading: isLoadingSubscription } = useSubscription(); 

  const [clients, setClients] = useState<Client[]>([]);
  // ✅ Renomeei para ser mais específico: 'isLoadingData' indica que estamos esperando clientes E limite
  const [isLoadingData, setIsLoadingData] = useState(true); 
  const [openDialog, setOpenDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weeklyLimit, setWeeklyLimit] = useState<WeeklyLimit>({
    count: 0,
    limit: 5,
    canCreate: true,
  });

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
    },
  });

  const loadClients = async () => {
    // Não precisamos de user check aqui, pois o useEffect pai já fará isso
    // e o estado isLoadingData já cobrirá esse período.
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user!.id) // user será não-nulo aqui devido à condição do useEffect
        .order('name');

      if (error) throw error;

      setClients(data || []);
    } catch (error: any) {
      console.error('Error loading clients:', error);
      toast({
        title: 'Erro ao carregar clientes',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const checkWeeklyClientLimit = async () => {
    // Não precisamos de user check aqui, pois o useEffect pai já fará isso.
    // ✅ É crucial que checkWeeklyClientLimit só seja chamado após planType ser conhecido
    // Este `if` foi movido para o useEffect principal.
    if (planType === 'pro') {
      setWeeklyLimit({
        count: 0,
        limit: Infinity,
        canCreate: true
      });
      return;
    }

    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { count, error } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id) // user será não-nulo aqui
        .gte('created_at', oneWeekAgo.toISOString());

      if (error) throw error;

      const currentWeeklyLimit = 5; // Limite para usuários free
      const canCreate = (count as number) < currentWeeklyLimit;

      setWeeklyLimit({
        count: count as number,
        limit: currentWeeklyLimit,
        canCreate
      });
    } catch (error) {
      console.error('Error checking weekly limit:', error);
      // ✅ Garante que em caso de erro na checagem, usuários Pro ainda podem criar
      if (planType === 'pro') { 
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
    // Só inicia o carregamento dos clientes/limites se o usuário e a assinatura
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
        setClients([]); // Limpa clientes se não há usuário logado
        return;
      }

      // Se há usuário e tudo foi carregado, inicia a busca de dados do componente
      const fetchData = async () => {
        setIsLoadingData(true);
        await loadClients();
        await checkWeeklyClientLimit(); // Depende de planType estar atualizado
        setIsLoadingData(false);
      };
      fetchData();
    }
  }, [user, isLoadingAuth, planType, isLoadingSubscription]); // Dependências cruciais para re-disparar

  const handleOpenDialog = (client?: Client) => {
    // ✅ A validação de limite agora usa o weeklyLimit que já foi atualizado pelo useEffect
    if (planType === 'free' && !weeklyLimit.canCreate && !client) {
      toast({
        title: 'Limite de clientes atingido',
        description: 'Você atingiu o limite de 5 clientes semanais no plano gratuito. Atualize para o Plano Pro para ter clientes ilimitados.',
        variant: 'destructive',
      });
      return;
    }

    if (client) {
      setEditingClient(client);
      form.reset({
        name: client.name,
        email: client.email || '',
        phone: client.phone || '',
      });
    } else {
      setEditingClient(null);
      form.reset({
        name: '',
        email: '',
        phone: '',
      });
    }
    setOpenDialog(true);
  };

  const handleSubmit = async (data: ClientFormValues) => {
    if (!user) return;

    // Check limit if creating new client and user is on free plan
    if (!editingClient && planType === 'free' && !weeklyLimit.canCreate) {
      toast({
        title: 'Limite de clientes atingido',
        description: 'Você atingiu o limite de 5 clientes semanais no plano gratuito. Atualize para o Plano Pro para ter clientes ilimitados.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const clientData = {
        user_id: user.id,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
      };

      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id);

        if (error) throw error;

        toast({
          title: 'Cliente atualizado',
          description: 'O cliente foi atualizado com sucesso.',
        });
      } else {
        const { error } = await supabase.from('clients').insert(clientData);

        if (error) throw error;

        toast({
          title: 'Cliente adicionado',
          description: 'O cliente foi adicionado com sucesso.',
        });
      }

      setOpenDialog(false);
      // ✅ Recarrega clientes e limite após sucesso na criação/edição
      await loadClients(); 
      await checkWeeklyClientLimit(); 
    } catch (error: any) {
      console.error('Error saving client:', error);
      toast({
        title: 'Erro ao salvar cliente',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Cliente removido',
        description: 'O cliente foi removido com sucesso.',
      });

      // ✅ Recarrega clientes e limite após sucesso na exclusão
      await loadClients(); 
      await checkWeeklyClientLimit(); 
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast({
        title: 'Erro ao remover cliente',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.email?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (client.phone?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
                <h3 className="font-semibold text-gray-900">Fazer UpGrade</h3>
                <p className="text-sm text-gray-600">
                  Assine o Plano Pro para Obter Todas as Funcionalidades!
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
          <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
          <p className="text-gray-500">Gerencie seus clientes</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar clientes..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              {/* ✅ Desabilita o botão enquanto estiver carregando ou se o limite for atingido */}
              <Button
                className="gap-1 bg-saldus-600 hover:bg-saldus-700"
                disabled={showGlobalLoading || (planType === 'free' && !weeklyLimit.canCreate)}
                onClick={() => handleOpenDialog()}
              >
                <Plus className="h-4 w-4" /> Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados do cliente abaixo.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do cliente" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(99) 99999-9999" {...field} />
                        </FormControl>
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
                      ) : editingClient ? (
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
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    {searchQuery
                      ? 'Nenhum cliente encontrado para esta busca.'
                      : 'Nenhum cliente cadastrado. Adicione seu primeiro cliente!'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>{client.name}</TableCell>
                    <TableCell>{client.email || '-'}</TableCell>
                    <TableCell>{client.phone || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(client)}
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
                                Tem certeza que deseja excluir este cliente?
                                Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-500 hover:bg-red-600"
                                onClick={() => handleDelete(client.id)}
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

export default Clients;
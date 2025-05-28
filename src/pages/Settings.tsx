// settings.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { SubscriptionCard } from '@/components/subscription/SubscriptionCard';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const profileSchema = z.object({
  fullName: z.string().min(3),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  commercialPhone: z.string().optional(),
  address: z.string().optional(),
});

const securitySchema = z.object({
  securityQuestion: z.string().min(1),
  securityAnswer: z.string().min(1),
  fakeAnswer1: z.string().min(1),
  fakeAnswer2: z.string().min(1),
  fakeAnswer3: z.string().min(1),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type SecurityFormValues = z.infer<typeof securitySchema>;

interface SupabaseProfile {
  id: string;
  email: string | null;
  fullname: string | null;
  phone: string | null;
  companyname: string | null;
  commercialphone: string | null;
  address: string | null;
  theme: string | null;
  planexpirydate: string | null;
  planstartdate: string | null;
  plantype: string | null;
  securityquestion: string | null;
  securityanswer: string | null;
}

const SECURITY_QUESTIONS = [
  'Qual foi o nome do seu primeiro animal de estimação?',
  'Qual é o nome da cidade onde você nasceu?',
  'Qual é o nome de solteiro da sua mãe?',
  'Qual foi o seu primeiro emprego?',
  'Qual é o nome da última escola onde você estudou?',
];

const Settings = () => {
  const { user, updateProfile, deleteAccount } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [profileData, setProfileData] = useState<SupabaseProfile | null>(null);
  const [activeTab, setActiveTab] = useState('personal');

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      companyName: '',
      commercialPhone: '',
      address: '',
    },
  });

  const securityForm = useForm<SecurityFormValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      securityQuestion: '',
      securityAnswer: '',
      fakeAnswer1: '',
      fakeAnswer2: '',
      fakeAnswer3: '',
    },
  });

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      setIsLoading(true);
      setSecurityLoading(true);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        const { data: fakeAnswersData, error: fakeError } = await supabase
          .from('fake_answers')
          .select('fake_answer')
          .eq('profile_id', user.id);

        if (fakeError) throw fakeError;

        const fakeAnswers = fakeAnswersData.map((item) => item.fake_answer);

        setProfileData(profileData);

        securityForm.reset({
          securityQuestion: profileData.securityquestion ?? '',
          securityAnswer: profileData.securityanswer ?? '',
          fakeAnswer1: fakeAnswers[0] || '',
          fakeAnswer2: fakeAnswers[1] || '',
          fakeAnswer3: fakeAnswers[2] || '',
        });

        form.reset({
          fullName: profileData.fullname ?? '',
          phone: profileData.phone ?? '',
          companyName: profileData.companyname ?? '',
          commercialPhone: profileData.commercialphone ?? '',
          address: profileData.address ?? '',
        });

      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
      } finally {
        setIsLoading(false);
        setSecurityLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    setIsLoading(true);
    try {
      await updateProfile({ fullName: data.fullName, phone: data.phone || null });
      await supabase
        .from('profiles')
        .update({
          fullname: data.fullName,
          phone: data.phone || null,
          companyname: data.companyName || null,
          commercialphone: data.commercialPhone || null,
          address: data.address || null,
        })
        .eq('id', user.id);

      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso.',
      });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Erro ao atualizar perfil',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitSecurity = async (data: SecurityFormValues) => {
    if (!user) return;
    setSecurityLoading(true);

    try {
      await supabase
        .from('profiles')
        .update({
          securityquestion: data.securityQuestion,
          securityanswer: data.securityAnswer.trim().toLowerCase(),
        })
        .eq('id', user.id);

      await supabase.from('fake_answers').delete().eq('profile_id', user.id);

      const fakeAnswers = [data.fakeAnswer1, data.fakeAnswer2, data.fakeAnswer3].map((ans) => ({
        profile_id: user.id,
        fake_answer: ans.trim().toLowerCase(),
      }));

      await supabase.from('fake_answers').insert(fakeAnswers);

      toast({
        title: 'Segurança atualizada',
        description: 'Pergunta e respostas falsas salvas com sucesso.',
      });
    } catch (err) {
      console.error('Erro:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações de segurança.',
        variant: 'destructive',
      });
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeletingAccount(true);
    try {
      await deleteAccount();
    } catch (err) {
      console.error(err);
      toast({
        title: 'Erro ao excluir conta',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Configurações</h1>
        <p className="text-gray-500">Gerencie suas informações pessoais e segurança.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="personal">Informações Pessoais</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="subscription">Assinatura</TabsTrigger>
          <TabsTrigger value="dangerzone">Perigo</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Editar Perfil</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {[
                    { name: 'fullName', label: 'Nome Completo' },
                    { name: 'phone', label: 'Telefone Pessoal' },
                    { name: 'companyName', label: 'Nome da Empresa' },
                    { name: 'commercialPhone', label: 'Telefone Comercial' },
                    { name: 'address', label: 'Endereço' }
                  ].map((fieldConfig) => (
                    <FormField
                      key={fieldConfig.name}
                      control={form.control}
                      name={fieldConfig.name as keyof ProfileFormValues}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{fieldConfig.label}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Segurança</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...securityForm}>
                <form onSubmit={securityForm.handleSubmit(onSubmitSecurity)} className="space-y-4">
                  <FormField
                    control={securityForm.control}
                    name="securityQuestion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pergunta de Segurança</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SECURITY_QUESTIONS.map((q) => (
                              <SelectItem key={q} value={q}>
                                {q}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Campos com nomes de exibição personalizados */}
                  <FormField
                    control={securityForm.control}
                    name="securityAnswer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Resposta Verdadeira</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={securityForm.control}
                    name="fakeAnswer1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Resposta Falsa 1</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={securityForm.control}
                    name="fakeAnswer2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Resposta Falsa 2</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={securityForm.control}
                    name="fakeAnswer3"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Resposta Falsa 3</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={securityLoading}>
                    {securityLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Configurações
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription">
          <SubscriptionCard />
        </TabsContent>

        <TabsContent value="dangerzone">
          <Card>
            <CardHeader>
              <CardTitle>Excluir Conta</CardTitle>
              <CardDescription>Esta ação é irreversível.</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Excluir Conta</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso removerá permanentemente sua conta e dados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAccount} disabled={deletingAccount}>
                      {deletingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Excluir Conta
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Settings;

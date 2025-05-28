
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowRight, 
  BarChart3, 
  DollarSign, 
  FileText, 
  Lock, 
  Mail, 
  Phone, 
  Shield, 
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-saldus-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-saldus-800">Saldus</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login">
                <Button variant="ghost" className="text-saldus-700 hover:text-saldus-800">
                  Entrar
                </Button>
              </Link>
              <Link to="/register">
                <Button className="bg-saldus-600 hover:bg-saldus-700">
                  Começar Agora
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Controle Financeiro
            <span className="text-saldus-600 block">Simples e Eficiente</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Gerencie suas receitas, despesas e clientes em um só lugar. 
            O Saldus oferece tudo que você precisa para manter suas finanças organizadas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-saldus-600 hover:bg-saldus-700 text-lg px-8 py-4">
                Comece Gratuitamente
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="text-lg px-8 py-4 border-saldus-600 text-saldus-600 hover:bg-saldus-50">
                Já tenho conta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Por que escolher o Saldus?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Desenvolvido especialmente para pequenos negócios e profissionais autônomos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-saldus-100 rounded-lg flex items-center justify-center mb-4">
                  <DollarSign className="h-6 w-6 text-saldus-600" />
                </div>
                <CardTitle>Controle de Receitas e Despesas</CardTitle>
                <CardDescription>
                  Registre e acompanhe todas as suas movimentações financeiras de forma simples e intuitiva.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-saldus-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-saldus-600" />
                </div>
                <CardTitle>Gestão de Clientes</CardTitle>
                <CardDescription>
                  Mantenha um cadastro completo dos seus clientes e vincule todas as transações a eles.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-saldus-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-saldus-600" />
                </div>
                <CardTitle>Relatórios Detalhados</CardTitle>
                <CardDescription>
                  Visualize gráficos e relatórios que te ajudam a entender melhor sua situação financeira.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-saldus-100 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-saldus-600" />
                </div>
                <CardTitle>Exportação de Dados</CardTitle>
                <CardDescription>
                  Exporte seus relatórios em formato CSV para usar em planilhas ou apresentações.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-saldus-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-saldus-600" />
                </div>
                <CardTitle>Segurança Garantida</CardTitle>
                <CardDescription>
                  Seus dados estão protegidos com criptografia de ponta e backups automáticos.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-saldus-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-saldus-600" />
                </div>
                <CardTitle>Interface Intuitiva</CardTitle>
                <CardDescription>
                  Design limpo e moderno que torna o gerenciamento financeiro uma tarefa simples.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-saldus-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Transforme a gestão do seu negócio
              </h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-saldus-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Aumente sua produtividade</h3>
                    <p className="text-gray-600">Automatize tarefas repetitivas e foque no que realmente importa para o seu negócio.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-saldus-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <BarChart3 className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Tome decisões baseadas em dados</h3>
                    <p className="text-gray-600">Tenha insights claros sobre sua situação financeira com relatórios visuais.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-saldus-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Lock className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Mantenha tudo organizado</h3>
                    <p className="text-gray-600">Nunca mais perca uma informação importante com nosso sistema de organização inteligente.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:text-center">
              <div className="bg-white rounded-lg shadow-xl p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Comece hoje mesmo!</h3>
                <p className="text-gray-600 mb-6">
                  Junte-se a centenas de profissionais que já transformaram sua gestão financeira.
                </p>
                <Link to="/register">
                  <Button size="lg" className="w-full bg-saldus-600 hover:bg-saldus-700">
                    Criar Conta Gratuita
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <p className="text-sm text-gray-500 mt-4">
                  Sem compromisso • Cancele quando quiser
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Precisa de ajuda?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Entre em contato conosco para tirar dúvidas, sugestões ou suporte técnico.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <a 
              href="mailto:n4talves@gmail.com"
              className="flex items-center space-x-3 bg-saldus-50 hover:bg-saldus-100 px-6 py-4 rounded-lg transition-colors"
            >
              <Mail className="h-6 w-6 text-saldus-600" />
              <div className="text-left">
                <p className="font-semibold text-gray-900">Email</p>
                <p className="text-saldus-600">n4talves@gmail.com</p>
              </div>
            </a>
            
            <div className="text-gray-400">ou</div>
            
            <Link to="/register">
              <Button size="lg" className="bg-saldus-600 hover:bg-saldus-700">
                Comece Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-2xl font-bold text-saldus-400">Saldus</h3>
              <p className="text-gray-400">Controle financeiro simples e eficiente</p>
            </div>
            <div className="flex space-x-6">
              <Link to="/login" className="text-gray-400 hover:text-white transition-colors">
                Entrar
              </Link>
              <Link to="/register" className="text-gray-400 hover:text-white transition-colors">
                Cadastrar
              </Link>
              <a 
                href="mailto:n4talves@gmail.com" 
                className="text-gray-400 hover:text-white transition-colors"
              >
                Contato
              </a>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Saldus. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

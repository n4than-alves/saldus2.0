'use client'

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  email: z.string().email("Insira um e-mail válido"),
});

type FormValues = z.infer<typeof formSchema>;

const ONE_HOUR = 10 * 1000; // 1 hora em milissegundos

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState<string | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [showQuestion, setShowQuestion] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");

  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const shuffleArray = (array: string[]) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const checkRecentFailedAttempt = async (profile_id: string) => {
    const { data, error } = await supabase
      .from("security_attempts")
      .select("attempt_time")
      .eq("profile_id", profile_id)
      .eq("successful", false)
      .order("attempt_time", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    const lastAttemptTime = new Date(data.attempt_time).getTime();
    const now = Date.now();

    if (now - lastAttemptTime < ONE_HOUR) {
      return new Date(lastAttemptTime + ONE_HOUR);
    }

    return null;
  };

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setEmail(data.email.trim().toLowerCase());

    const { data: user, error } = await supabase
      .from("profiles")
      .select("id, securityquestion, securityanswer")
      .eq("email", data.email.trim().toLowerCase())
      .single();

    if (error || !user) {
      toast({
        title: "Usuário não encontrado",
        description: "Nenhum usuário foi encontrado com este e-mail",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const blockedUntil = await checkRecentFailedAttempt(user.id);
    if (blockedUntil) {
      toast({
        title: "Bloqueio temporário",
        description: `Você errou recentemente. Aguarde até ${blockedUntil.toLocaleTimeString()} para tentar novamente.`,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const SECURITY_QUESTIONS = [
      'Qual foi o nome do seu primeiro animal de estimação?',
      'Qual é o nome da cidade onde você nasceu?',
      'Qual é o nome de solteiro da sua mãe?',
      'Qual foi o seu primeiro emprego?',
      'Qual é o nome da última escola onde você estudou?'
    ];

    if (!SECURITY_QUESTIONS.includes(user.securityquestion)) {
      toast({
        title: "Erro de segurança",
        description: "Pergunta de segurança inválida registrada para este usuário.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const { data: fakeAnswers, error: fakeError } = await supabase
      .from("fake_answers")
      .select("fake_answer")
      .eq("profile_id", user.id)
      .limit(3);

    if (fakeError || !fakeAnswers || fakeAnswers.length < 3) {
      toast({
        title: "Erro ao buscar respostas falsas",
        description: "Não foi possível carregar as opções de resposta.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const correctAnswerNormalized = user.securityanswer.toLowerCase().trim();
    const falseOptions = fakeAnswers.map(f => f.fake_answer);
    const allAnswers = shuffleArray([user.securityanswer, ...falseOptions]);

    setProfileId(user.id);
    setSecurityQuestion(user.securityquestion);
    setCorrectAnswer(correctAnswerNormalized);
    setOptions(allAnswers);
    setShowQuestion(true);
    setIsLoading(false);
  };

  const handleAnswer = async (answer: string) => {
    if (!profileId) return;

    if (answer.toLowerCase().trim() === correctAnswer) {
      await supabase.from("security_attempts").insert({
        profile_id: profileId,
        successful: true,
      });

      // ✅ Envia o e-mail de redefinição de senha
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        toast({
          title: "Erro ao enviar e-mail",
          description: "Houve um problema ao enviar o link de redefinição.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Resposta correta",
        description: "Um link de redefinição de senha foi enviado ao seu e-mail.",
      });

      setShowQuestion(false);
    } else {
      await supabase.from("security_attempts").insert({
        profile_id: profileId,
        successful: false,
      });

      toast({
        title: "Resposta incorreta",
        description: "Tente novamente em 1 hora.",
        variant: "destructive",
      });

      setShowQuestion(false);
      setSecurityQuestion(null);
      setCorrectAnswer(null);
      setOptions([]);
      setProfileId(null);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Recuperar Senha</CardTitle>
        </CardHeader>
        <CardContent>
          {!showQuestion ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" {...register("email")} disabled={isLoading} />
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Verificando..." : "Avançar"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-lg font-medium">{securityQuestion}</p>
              {options.map((option, index) => (
                <Button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  className="w-full"
                >
                  {option}
                </Button>
              
              ))}
            </div>
          )}
          
        </CardContent>
      </Card>
    </div>
  );
}

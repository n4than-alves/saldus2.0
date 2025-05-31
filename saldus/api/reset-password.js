
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Lidar com requisições OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Aceitar apenas requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ error: "Email e nova senha são obrigatórios." });
  }

  // Criar cliente Supabase com SERVICE_ROLE_KEY
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Busca o usuário pelo email
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    // Atualiza a senha com service_role
    const { error: updateError } = await supabase.auth.admin.updateUserByEmail(email, {
      password: newPassword,
    });

    if (updateError) {
      return res.status(500).json({ error: "Erro ao redefinir a senha." });
    }

    return res.json({ success: true, message: "Senha redefinida com sucesso." });
  } catch (error) {
    console.error('Erro interno:', error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
}

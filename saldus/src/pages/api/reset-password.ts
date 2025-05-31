import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });
  }

  // 1. Validar token
  const { data: tokenData, error: tokenError } = await supabase
    .from('password_resets')
    .select('profile_id, expires_at')
    .eq('reset_token', token)
    .single();

  if (tokenError || !tokenData) {
    return res.status(400).json({ error: 'Token inválido ou expirado.' });
  }

  const now = new Date();
  const expiresAt = new Date(tokenData.expires_at);
  if (expiresAt < now) {
    return res.status(400).json({ error: 'Token expirado.' });
  }

  // 2. Atualizar senha
  const { error: updateError } = await supabase.auth.admin.updateUserById(tokenData.profile_id, {
    password: newPassword,
  });

  if (updateError) {
    return res.status(500).json({ error: 'Erro ao atualizar senha: ' + updateError.message });
  }

  // 3. Deletar token
  await supabase.from('password_resets').delete().eq('reset_token', token);

  return res.status(200).json({ message: 'Senha atualizada com sucesso.' });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

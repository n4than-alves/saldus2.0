import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // SERVICE ROLE (nunca a publique)
);

app.post('/generate-token', async (req, res) => {
  const { profileId } = req.body;

  if (!profileId) {
    return res.status(400).json({ error: 'profileId obrigatório' });
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora depois

  const { error } = await supabase.from('password_resets').insert({
    profile_id: profileId,
    reset_token: token,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return res.status(500).json({ error: 'Erro ao salvar token' });
  }

  return res.status(200).json({ token });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// server.js
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post("/api/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ error: "Email e nova senha são obrigatórios." });
  }

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
});

// Roda o servidor na porta 3000 ou a que o Replit usar
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireSupabaseSession } from '../middlewares/authenticate';

export const authRouter = Router();

/**
 * O login e o cadastro de credenciais são realizados pelo frontend
 * diretamente contra o Supabase Auth. À API cabe apenas registrar o perfil
 * da aplicação para uma conta já autenticada.
 */
authRouter.post('/register', requireSupabaseSession, authController.registerProfile);

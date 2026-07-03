import express from 'express';
import { register, login, getMe, logout } from '../controllers/authController.js';
import { registerValidator, loginValidator } from '../middleware/validation.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', registerValidator, register);
router.post('/login', loginValidator, login);
router.post('/logout', logout);
router.get('/me', protect, getMe);

export default router;

import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto'
import querystring from 'querystring';
import axios from 'axios';
import jwkToPem from 'jwk-to-pem';
dotenv.config();

const router = express.Router();
//URL TEMPORAL DEL NGROK, LAS DEL MOODLE SON IGUAL 
//Configuracion URL del Moodle: https://drive.google.com/file/d/1MmKNij-B93nGPIUd7Ci_AqVAviPUVtJG/view
router.post('/launch', async (req, res) => {
    const target_link_uri = 'https://42c3-81-184-197-163.ngrok-free.app/lti/login'; 
    const login_hint = req.body.login_hint
    const lti_message_hint = req.body.lti_message_hint
    const client_id = req.body.client_id
    const authEndpoint = 'http://localhost/moodle/mod/lti/auth.php';
    const state = crypto.randomBytes(8).toString('hex');
    const nonce = crypto.randomBytes(16).toString('hex');
    const params = {
      client_id,
      response_type: 'id_token',
      scope: 'openid',
      redirect_uri: target_link_uri,
      login_hint,
      lti_message_hint,
      state: state,
      nonce: nonce,
      response_mode: 'form_post'
    }
    const redirectUrl = `${authEndpoint}?${querystring.stringify(params)}`;
    res.redirect(redirectUrl);
  });
  
router.post('/login', async (req, res) => {
    const { id_token } = req.body;
    if (!id_token) {
        return res.status(400).send('ID Token no recibido.');
    }
    try {
        const jwksUrl = 'http://localhost/moodle/mod/lti/certs.php';
        const { data } = await axios.get(jwksUrl);

        const { header } = jwt.decode(id_token, { complete: true });

        const publicKey = data.keys.find(key => key.kid === header.kid);
        if (!publicKey) {
            throw new Error('Clave pública no encontrada.');
        }

        const pem = jwkToPem(publicKey);

        const decoded = jwt.verify(id_token, pem, {
            algorithms: ['RS256'],
            audience: 'SRiEZ3Drnhs2j7Y',
            issuer: 'http://localhost/moodle',
        });

        console.log('Token válido:', decoded);
        res.send('Lanzamiento exitoso.');
    } catch (err) {
        console.error('Error al validar el token:', err.message);
        res.status(400).send('Token inválido.');
    }
});

export default router;

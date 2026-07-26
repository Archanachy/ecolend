import client from './client';

export async function getCaptchaConfig() {
  const response = await client.get('/captcha/config');
  return response.data;
}
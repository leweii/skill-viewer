// api/create-qrcode.js
import { verifyToken } from '../lib/supabase.js';
import { createAlipayQrCode } from '../lib/alipay.js';
import { createWechatQrCode } from '../lib/wechat.js';

function generateOutTradeNo() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8);
  return `SV${timestamp}${random}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { paymentMethod } = req.body;
    if (!paymentMethod || !['alipay', 'wechat'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    const outTradeNo = generateOutTradeNo();
    const amount = parseFloat(process.env.PAYMENT_AMOUNT) || 39.9;

    let qrCodeUrl;
    if (paymentMethod === 'alipay') {
      qrCodeUrl = await createAlipayQrCode(outTradeNo, amount, user.id);
    } else {
      qrCodeUrl = await createWechatQrCode(outTradeNo, amount, user.id);
    }

    return res.status(200).json({ qrCodeUrl, outTradeNo });
  } catch (error) {
    console.error('Create QR code error:', error);
    return res.status(500).json({ error: error.message });
  }
}

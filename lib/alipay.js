// lib/alipay.js
import AlipaySdk from 'alipay-sdk';

let alipayClient = null;

export function getAlipay() {
  if (!alipayClient) {
    alipayClient = new AlipaySdk({
      appId: process.env.ALIPAY_APP_ID,
      privateKey: process.env.ALIPAY_PRIVATE_KEY,
      alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY,
      signType: 'RSA2'
    });
  }
  return alipayClient;
}

export async function createAlipayQrCode(outTradeNo, amount, userId, subject = 'Skill Viewer Pro') {
  const alipay = getAlipay();

  const result = await alipay.exec('alipay.trade.precreate', {
    bizContent: {
      out_trade_no: outTradeNo,
      total_amount: amount.toFixed(2),
      subject: subject,
      passback_params: encodeURIComponent(JSON.stringify({ user_id: userId }))
    }
  });

  if (result.code !== '10000') {
    throw new Error(result.subMsg || result.msg || 'Alipay error');
  }

  return result.qrCode;
}

export function verifyAlipaySignature(params) {
  const alipay = getAlipay();
  return alipay.checkNotifySign(params);
}

// lib/wechat.js
import crypto from 'crypto';

function generateNonceStr() {
  return crypto.randomBytes(16).toString('hex');
}

function generateSign(params, apiKey) {
  const sortedKeys = Object.keys(params).sort();
  const stringA = sortedKeys
    .filter(k => params[k] !== '' && params[k] !== undefined && k !== 'sign')
    .map(k => `${k}=${params[k]}`)
    .join('&');
  const stringSignTemp = `${stringA}&key=${apiKey}`;
  return crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase();
}

export function toXml(obj) {
  let xml = '<xml>';
  for (const [key, value] of Object.entries(obj)) {
    xml += `<${key}><![CDATA[${value}]]></${key}>`;
  }
  xml += '</xml>';
  return xml;
}

export function parseXml(xml) {
  const result = {};
  const regex = /<(\w+)>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/\1>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    result[match[1]] = match[2];
  }
  return result;
}

export async function createWechatQrCode(outTradeNo, amount, userId, body = 'Skill Viewer Pro') {
  const params = {
    appid: process.env.WECHAT_APP_ID,
    mch_id: process.env.WECHAT_MCH_ID,
    nonce_str: generateNonceStr(),
    body: body,
    out_trade_no: outTradeNo,
    total_fee: Math.round(amount * 100), // 微信以分为单位
    spbill_create_ip: '127.0.0.1',
    notify_url: process.env.WECHAT_NOTIFY_URL || 'https://skill-viewer.vercel.app/api/webhook/wechat',
    trade_type: 'NATIVE',
    attach: JSON.stringify({ user_id: userId })
  };

  params.sign = generateSign(params, process.env.WECHAT_API_KEY);

  const response = await fetch('https://api.mch.weixin.qq.com/pay/unifiedorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body: toXml(params)
  });

  const xml = await response.text();
  const result = parseXml(xml);

  if (result.return_code !== 'SUCCESS' || result.result_code !== 'SUCCESS') {
    throw new Error(result.return_msg || result.err_code_des || 'WeChat error');
  }

  return result.code_url;
}

export function verifyWechatSignature(params, apiKey) {
  const sign = params.sign;
  const calculatedSign = generateSign(params, apiKey);
  return sign === calculatedSign;
}

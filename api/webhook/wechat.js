// api/webhook/wechat.js
import { getSupabase } from '../../lib/supabase.js';
import { verifyWechatSignature, parseXml, toXml } from '../../lib/wechat.js';

export const config = {
  api: {
    bodyParser: false
  }
};

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/xml');
    return res.status(405).send(toXml({ return_code: 'FAIL', return_msg: 'Method not allowed' }));
  }

  try {
    const xml = await getRawBody(req);
    const params = parseXml(xml);

    // 验证签名
    if (!verifyWechatSignature(params, process.env.WECHAT_API_KEY)) {
      console.error('WeChat signature verification failed');
      res.setHeader('Content-Type', 'application/xml');
      return res.status(401).send(toXml({ return_code: 'FAIL', return_msg: 'Invalid signature' }));
    }

    // 检查支付结果
    if (params.return_code !== 'SUCCESS' || params.result_code !== 'SUCCESS') {
      res.setHeader('Content-Type', 'application/xml');
      return res.status(200).send(toXml({ return_code: 'SUCCESS', return_msg: 'OK' }));
    }

    // 解析 user_id
    let userId;
    try {
      const attach = JSON.parse(params.attach || '{}');
      userId = attach.user_id;
    } catch (e) {
      console.error('Failed to parse attach:', e);
      res.setHeader('Content-Type', 'application/xml');
      return res.status(400).send(toXml({ return_code: 'FAIL', return_msg: 'Invalid attach' }));
    }

    if (!userId) {
      console.error('No user_id in attach');
      res.setHeader('Content-Type', 'application/xml');
      return res.status(400).send(toXml({ return_code: 'FAIL', return_msg: 'No user_id' }));
    }

    // 更新用户状态
    const supabase = getSupabase();
    const { error } = await supabase
      .from('users')
      .update({
        is_paid: true,
        paid_at: new Date().toISOString(),
        license_key: params.transaction_id || 'wechat_pro'
      })
      .eq('id', userId);

    if (error) {
      console.error('Failed to update user:', error);
      res.setHeader('Content-Type', 'application/xml');
      return res.status(500).send(toXml({ return_code: 'FAIL', return_msg: 'DB error' }));
    }

    console.log('User upgraded via WeChat:', userId);
    res.setHeader('Content-Type', 'application/xml');
    return res.status(200).send(toXml({ return_code: 'SUCCESS', return_msg: 'OK' }));
  } catch (error) {
    console.error('WeChat webhook error:', error);
    res.setHeader('Content-Type', 'application/xml');
    return res.status(500).send(toXml({ return_code: 'FAIL', return_msg: error.message }));
  }
}

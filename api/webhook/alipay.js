// api/webhook/alipay.js
import { getSupabase } from '../../lib/supabase.js';
import { verifyAlipaySignature } from '../../lib/alipay.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  try {
    const params = req.body;

    // 验证签名
    if (!verifyAlipaySignature(params)) {
      console.error('Alipay signature verification failed');
      return res.status(401).send('fail');
    }

    // 检查交易状态
    if (params.trade_status !== 'TRADE_SUCCESS' && params.trade_status !== 'TRADE_FINISHED') {
      return res.status(200).send('success');
    }

    // 解析 user_id
    let userId;
    try {
      const passbackParams = JSON.parse(decodeURIComponent(params.passback_params || '{}'));
      userId = passbackParams.user_id;
    } catch (e) {
      console.error('Failed to parse passback_params:', e);
      return res.status(400).send('fail');
    }

    if (!userId) {
      console.error('No user_id in passback_params');
      return res.status(400).send('fail');
    }

    // 更新用户状态
    const supabase = getSupabase();
    const { error } = await supabase
      .from('users')
      .update({
        is_paid: true,
        paid_at: new Date().toISOString(),
        license_key: params.trade_no || 'alipay_pro'
      })
      .eq('id', userId);

    if (error) {
      console.error('Failed to update user:', error);
      return res.status(500).send('fail');
    }

    console.log('User upgraded via Alipay:', userId);
    return res.status(200).send('success');
  } catch (error) {
    console.error('Alipay webhook error:', error);
    return res.status(500).send('fail');
  }
}

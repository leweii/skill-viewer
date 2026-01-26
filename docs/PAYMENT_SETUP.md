# 支付配置指南 (Payment Setup Guide)

本文档介绍如何获取支付宝和微信支付的 API 密钥。

## 支付宝 (Alipay)

### 1. 注册开发者账号

1. 访问 [open.alipay.com](https://open.alipay.com)
2. 使用支付宝账号登录
3. 完成开发者认证（企业或个人）

### 2. 创建应用

1. 进入控制台 → 我的应用 → 创建应用
2. 选择「网页/移动应用」
3. 填写应用名称、图标等信息
4. 提交审核（1-3 个工作日）

### 3. 配置接口加签方式

1. 应用详情 → 开发设置 → 接口加签方式
2. 选择 **RSA2（SHA256）** 加签方式（推荐）
3. 生成密钥对：

**方式一：使用支付宝密钥生成器**
- 下载地址：https://opendocs.alipay.com/common/02kipl
- 运行工具，选择 RSA2，点击生成

**方式二：使用 OpenSSL 命令行**
```bash
# 生成 2048 位 RSA 私钥
openssl genrsa -out alipay_private_key.pem 2048

# 从私钥中提取公钥
openssl rsa -in alipay_private_key.pem -pubout -out alipay_public_key.pem

# 转换私钥为 PKCS8 格式（Java/Node.js 需要）
openssl pkcs8 -topk8 -inform PEM -in alipay_private_key.pem -outform PEM -nocrypt -out alipay_private_key_pkcs8.pem
```

4. 将**你的公钥**上传到支付宝
5. 支付宝会返回**支付宝公钥**，保存下来

### 4. 获取环境变量

| 环境变量 | 说明 | 获取位置 |
|---------|------|---------|
| `ALIPAY_APP_ID` | 应用的 APPID | 应用详情页顶部 |
| `ALIPAY_PRIVATE_KEY` | 你的私钥 | 你生成的私钥文件（去掉头尾和换行） |
| `ALIPAY_PUBLIC_KEY` | 支付宝公钥 | 上传公钥后支付宝返回的公钥 |

**私钥格式处理**：
```bash
# 去掉 -----BEGIN/END----- 和换行符
cat alipay_private_key_pkcs8.pem | grep -v '\-\-\-' | tr -d '\n'
```

### 5. 配置回调地址

1. 应用详情 → 开发设置 → 应用网关/授权回调地址
2. 设置支付结果通知地址：
   ```
   https://your-domain.vercel.app/api/webhook/alipay
   ```

### 6. 沙箱环境（测试用）

1. 访问 [沙箱环境](https://open.alipay.com/develop/sandbox/app)
2. 使用沙箱 APPID 和密钥进行测试
3. 下载「沙箱版支付宝」App 进行支付测试

---

## 微信支付 (WeChat Pay)

### 1. 注册商户号

1. 访问 [pay.weixin.qq.com](https://pay.weixin.qq.com)
2. 点击「成为商家」
3. 准备以下材料：
   - 营业执照照片
   - 法人身份证正反面
   - 对公银行账户信息
   - 联系人信息
4. 提交审核（3-7 个工作日）
5. 审核通过后获得**商户号 (MCH_ID)**

### 2. 关联公众号或小程序

1. 登录 [微信公众平台](https://mp.weixin.qq.com)
2. 设置 → 微信支付 → 关联商户号
3. 或在商户平台发起关联申请

### 3. 设置 API 密钥

1. 登录 [微信商户平台](https://pay.weixin.qq.com)
2. 账户中心 → API安全 → 设置 API 密钥
3. 自行设置一个 **32 位字符串**作为 API 密钥
4. 妥善保存，密钥只显示一次

### 4. 获取环境变量

| 环境变量 | 说明 | 获取位置 |
|---------|------|---------|
| `WECHAT_APP_ID` | 公众号/小程序的 AppID | 微信公众平台 → 开发 → 基本配置 |
| `WECHAT_MCH_ID` | 商户号 | 商户平台登录后右上角可见 |
| `WECHAT_API_KEY` | API 密钥 | 你自己设置的 32 位密钥 |

### 5. 配置支付目录和回调

**支付授权目录**（商户平台）：
1. 产品中心 → 开发配置
2. 添加支付授权目录：
   ```
   https://your-domain.vercel.app/
   ```

**支付结果通知地址**（代码中配置）：
```
https://your-domain.vercel.app/api/webhook/wechat
```

### 6. API 证书（可选）

部分接口需要 API 证书：
1. 账户中心 → API安全 → API证书
2. 申请并下载证书
3. 包含三个文件：
   - `apiclient_cert.pem` - 商户证书
   - `apiclient_key.pem` - 商户私钥
   - `apiclient_cert.p12` - 包含证书和私钥的文件

---

## 对比总结

| 项目 | 支付宝 | 微信支付 |
|------|--------|---------|
| 申请主体 | 个人/企业 | 仅企业 |
| 审核时间 | 1-3 天 | 3-7 天 |
| 费率 | 0.6% | 0.6% |
| 沙箱环境 | 有 | 无公开沙箱 |
| 域名要求 | 需 ICP 备案 | 需 ICP 备案 |
| 证书要求 | 可选 | 部分接口需要 |

---

## 常见问题

### Q: Vercel 域名可以用吗？
A: 不可以。国内支付接口要求使用已完成 ICP 备案的域名。`*.vercel.app` 域名无法备案。

**解决方案**：
1. 购买域名并完成 ICP 备案
2. 在 Vercel 中绑定自定义域名
3. 使用备案后的域名作为回调地址

### Q: 个人开发者可以接入吗？
A:
- 支付宝：可以，但有功能限制
- 微信支付：不可以，必须企业资质

### Q: 如何测试支付？
A:
- 支付宝：使用沙箱环境 + 沙箱版支付宝 App
- 微信支付：只能用真实商户号，建议先设置小金额（如 0.01 元）测试

### Q: 密钥泄露怎么办？
A:
1. 立即到对应平台重置密钥
2. 更新 Vercel 环境变量
3. 检查是否有异常交易

---

## 环境变量示例

```env
# .env.local

# 支付宝配置
ALIPAY_APP_ID=2021000000000000
ALIPAY_PRIVATE_KEY=MIIEvgIBADANBgkqhkiG9w0BAQEFA...（你的私钥，一行）
ALIPAY_PUBLIC_KEY=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...（支付宝公钥，一行）

# 微信支付配置
WECHAT_APP_ID=wx1234567890abcdef
WECHAT_MCH_ID=1600000000
WECHAT_API_KEY=abcdefghijklmnopqrstuvwxyz123456

# 支付金额（人民币）
PAYMENT_AMOUNT=39.9
```

---

## 相关链接

### 支付宝
- 开放平台：https://open.alipay.com
- 开发文档：https://opendocs.alipay.com
- 沙箱环境：https://open.alipay.com/develop/sandbox/app
- 密钥工具：https://opendocs.alipay.com/common/02kipl

### 微信支付
- 商户平台：https://pay.weixin.qq.com
- 开发文档：https://pay.weixin.qq.com/wiki/doc/api/index.html
- 微信公众平台：https://mp.weixin.qq.com

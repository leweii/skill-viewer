import express from 'express'
import indexHandler from './api/index.js'
import summarizeHandler from './api/summarize.js'
import checkOrderHandler from './api/check-order.js'
import createQrcodeHandler from './api/create-qrcode.js'
import collectHandler from './api/collect.js'
import usageHandler from './api/usage.js'
import devUpgradeHandler from './api/dev-upgrade.js'
import alipayWebhookHandler from './api/webhook/alipay.js'
import wechatWebhookHandler from './api/webhook/wechat.js'

const app = express()

// WeChat webhook needs raw body for XML signature verification.
// Apply raw body parser ONLY to that route before global JSON parser.
app.use('/api/webhook/wechat', express.raw({ type: '*/*' }))

// Global JSON + form body parser for all other routes
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.all('/', indexHandler)
app.all('/api/summarize', summarizeHandler)
app.all('/api/check-order', checkOrderHandler)
app.all('/api/create-qrcode', createQrcodeHandler)
app.all('/api/collect', collectHandler)
app.all('/api/usage', usageHandler)
app.all('/api/dev-upgrade', devUpgradeHandler)
app.all('/api/webhook/alipay', alipayWebhookHandler)
app.all('/api/webhook/wechat', wechatWebhookHandler)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Skill Viewer API running on port ${PORT}`)
})

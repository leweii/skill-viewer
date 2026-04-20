import express from 'express'
import indexHandler from './api/index.js'
import summarizeHandler from './api/summarize.js'
import collectHandler from './api/collect.js'

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.all('/', indexHandler)
app.all('/api/summarize', summarizeHandler)
app.all('/api/collect', collectHandler)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Skill Viewer API running on port ${PORT}`)
})

import load from './app'

const PORT = process.env.PORT || 3010
const app = load()

app.listen(PORT, () => {
    console.log(`service is listen on ${PORT} port`)
})
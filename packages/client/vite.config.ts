import { baseConfig } from "../../vite.base.config"

export default baseConfig({
  name: 'client',
  baseDir: __dirname,
}, {
  build: {
    ssr: undefined
  }
})
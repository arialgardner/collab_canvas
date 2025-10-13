import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router/index'
import './firebase/config' // Initialize Firebase

const app = createApp(App)

app.use(router)
app.mount('#app')
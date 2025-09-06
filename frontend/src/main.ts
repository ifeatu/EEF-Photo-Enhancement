import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import urql from '@urql/vue'

import App from './App.vue'
import router from './router'
import { graphqlClient } from './services/graphql'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(urql, graphqlClient)

app.mount('#app')

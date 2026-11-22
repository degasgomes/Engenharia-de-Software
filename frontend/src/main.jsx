import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { SessaoProvider } from './sessao.jsx'
import { aplicarTema, lerTema } from './tema.js'
import './estilos.css'

// Antes de desenhar o ecrã, para não piscar com o tema errado.
aplicarTema(lerTema())

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SessaoProvider>
        <App />
      </SessaoProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

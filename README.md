# APIMETEO

Aplicação estática para consultar condições meteorológicas atuais e previsões por cidade ou localização do usuário.

## Tecnologias e serviços

- HTML, CSS e JavaScript no navegador.
- Open-Meteo para previsão e busca de cidades.
- BigDataCloud para identificar a cidade aproximada da localização atual.
- Tailwind CSS compilado para produção.
- Chart.js, Font Awesome e Google Fonts carregados por CDN.

Não há backend, banco de dados ou chaves privadas. **Supabase e Render não são necessários** para esta versão.

## Desenvolvimento e build

Instale as dependências e gere os arquivos estáticos:

```sh
npm ci
npm run build
```

O site pronto para publicação será criado em `dist/`.

## Publicar na Vercel

Importe este repositório na Vercel e use a raiz do projeto. O arquivo `vercel.json` configura o build e a pasta de saída; não são necessárias variáveis de ambiente.

As APIs e bibliotecas externas precisam estar acessíveis no navegador. A localização do usuário requer permissão e uma conexão HTTPS.

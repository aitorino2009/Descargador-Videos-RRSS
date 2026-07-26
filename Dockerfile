FROM node:18-alpine

# Instalar python3, ffmpeg y curl para yt-dlp
RUN apk add --no-cache python3 ffmpeg curl bash

# Crear directorio de trabajo
WORKDIR /app

# Copiar manifiesto de dependencias
COPY package*.json ./

# Instalar dependencias Node
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Descargar yt-dlp más reciente
RUN mkdir -p /tmp/clipprofit_engine && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /tmp/clipprofit_engine/yt-dlp && \
    chmod +x /tmp/clipprofit_engine/yt-dlp

# Exponer el puerto de la aplicación
EXPOSE 7432

# Definir variables de entorno por defecto
ENV HOSTED=true
ENV PORT=7432
ENV NODE_ENV=production

# Comando de inicio
CMD ["node", "server.js"]

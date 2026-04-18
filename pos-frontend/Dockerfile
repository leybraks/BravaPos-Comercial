# Etapa 1: Construcción (Solo se usa para compilar)
FROM node:22-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Etapa 2: Producción (Esta es la cajita final, súper ligera)
FROM nginx:alpine
# Copiamos lo compilado a la carpeta pública de Nginx
COPY --from=build /app/dist /usr/share/nginx/html 
# Nota: Si usaste Create React App, cambia "/app/dist" por "/app/build"

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
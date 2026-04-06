FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG FRONTEND_API_URL=/api
RUN sed -i "s|https://localhost:7219/api|${FRONTEND_API_URL}|g" src/app/Component/environment.ts \
	&& sed -i 's/"maximumWarning": "500kB"/"maximumWarning": "1.2MB"/g' angular.json \
	&& sed -i 's/"maximumError": "1.1MB"/"maximumError": "1.4MB"/g' angular.json \
	&& sed -i 's/"maximumWarning": "10kB"/"maximumWarning": "36kB"/g' angular.json \
	&& sed -i 's/"maximumError": "16kB"/"maximumError": "44kB"/g' angular.json
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/webApp/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

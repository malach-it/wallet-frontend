FROM node:22-trixie AS builder-base

WORKDIR /home/node/app
# Install dependencies first so rebuild of these layers is only needed when dependencies change
RUN yarn config set cache-folder /root/.yarn
# Copy is required at this stage since we have bundled libs (lib/jose for example) - but not in the refactoring!
# - so for the refactoring we just copy package.json + yarn.lock
COPY package.json yarn.lock ./
RUN --mount=type=cache,target=/root/.yarn yarn install --frozen-lockfile

FROM builder-base AS builder

WORKDIR /home/node/app

COPY . .

RUN mount=type=secret,id=wallet_frontend_envfile,dst=/home/node/app/.env,required=false NODE_OPTIONS=--max-old-space-size=2048 yarn build

###
FROM nginx:alpine AS deploy
WORKDIR /usr/share/nginx/html

COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /home/node/app/dist/ .

EXPOSE 80

CMD nginx -g "daemon off;"

FROM node:10
WORKDIR /cyp
RUN ["mkdir", "_youtube"]
COPY package.json .
RUN npm i
COPY index.js .
COPY app ./app
EXPOSE 8080
CMD ["node", "."]

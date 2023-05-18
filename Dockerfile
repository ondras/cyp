FROM node:16
RUN apt update && apt install -y jq && apt clean
RUN curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl \
	&& chmod a+rx /usr/local/bin/youtube-dl
WORKDIR /cyp
COPY package.json .
RUN npm i
COPY index.js .
COPY app ./app
EXPOSE 8080
ENTRYPOINT ["node", "."]

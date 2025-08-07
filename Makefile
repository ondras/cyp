LESS := npm exec -- lessc
ESBUILD := npm exec -- esbuild
APP := app
CSS := $(APP)/cyp.css
JS := $(APP)/cyp.js
ICONS := $(APP)/js/icons.ts
SYSD_USER := ~/.config/systemd/user
SERVICE := cyp.service

all: $(CSS) $(JS)

icons: $(ICONS)

$(ICONS): $(APP)/icons/*
	$(APP)/svg2js.sh $(APP)/icons > $@

$(JS): $(APP)/js/* $(APP)/js/elements/*
	$(ESBUILD) --bundle --target=es2017 $(APP)/js/cyp.ts --outfile=$@

$(CSS): $(APP)/css/* $(APP)/css/elements/*
	$(LESS) -x $(APP)/css/cyp.less > $@

service: $(SERVICE)
	systemctl --user enable $(PWD)/$(SERVICE)

$(SERVICE): misc/cyp.service.template
	cat $^ | envsubst > $@

watch: all
	while inotifywait -e MODIFY -r $(APP)/css $(APP)/js ; do make $^ ; done

clean:
	rm -f $(SERVICE) $(CSS) $(JS)

docker-image:
	docker build -t cyp .

docker-run:
	docker run --network=host -v "$$(pwd)"/_youtube:/cyp/_youtube cyp

.PHONY: all watch icons service clean

.DELETE_ON_ERROR:

LESS := $(shell npm bin)/lessc
APP := app
CSS := $(APP)/cyp.css
ICONS := $(APP)/js/lib/icons.js
SYSD_USER := ~/.config/systemd/user
SERVICE := cyp.service

all: $(CSS)

icons: $(ICONS)

$(ICONS): $(APP)/icons/*
	$(APP)/svg2js.sh $(APP)/icons > $@

$(CSS): $(APP)/css/* $(APP)/css/elements/*
	$(LESS) $(APP)/css/cyp.less > $@

service: $(SERVICE)
	systemctl --user enable $(PWD)/$(SERVICE)

$(SERVICE): misc/cyp.service.template
	cat $^ | envsubst > $@

watch: all
	while inotifywait -e MODIFY -r $(APP)/css $(APP)/js ; do make $^ ; done

clean:
	rm -f $(SERVICE) $(CSS)

docker-image:
	docker build -t cyp .

docker-run:
	docker run --network=host -v "$$(pwd)"/_youtube:/cyp/_youtube cyp

.PHONY: all watch icons service clean
